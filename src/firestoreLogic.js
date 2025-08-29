import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, onSnapshot, runTransaction, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';

// ACCOUNTS
export const addAccount = async (accountData) => {
  return await addDoc(collection(db, 'accounts'), {
    ...accountData,
    createdAt: new Date(),
  });
};

// CUSTOMERS
export const addCustomer = async (customerData) => {
  try {
    if (!db || !auth || !auth.currentUser) {
      console.warn('Firebase not available or user not authenticated');
      throw new Error('Firebase not available or user not authenticated');
    }
    
    // Get all customers to find the max simpleId
    const customersRef = collection(db, 'customers');
    const snapshot = await getDocs(customersRef);
    let maxId = 999;
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.simpleId && !isNaN(Number(data.simpleId))) {
        maxId = Math.max(maxId, Number(data.simpleId));
      }
    });
    const newSimpleId = (maxId + 1).toString();
    const docRef = await addDoc(customersRef, {
      ...customerData,
      accountId: auth.currentUser.uid,
      billingStatus: 'unpaid',
      dueDate: null,
      invoiceId: null,
      isActive: true,
      simpleId: newSimpleId,
    });
    const newDoc = await getDocs(query(customersRef, where('simpleId', '==', newSimpleId)));
    return newDoc.docs.length > 0 ? { id: newDoc.docs[0].id, ...newDoc.docs[0].data() } : null;
  } catch (error) {
    console.error('Error adding customer:', error);
    throw error;
  }
};
export const softDeleteCustomer = async (customerId) => {
  await updateDoc(doc(db, 'customers', customerId), {
    isActive: false,
    deletedAt: new Date(),
  });
};
export const getCustomersForAccount = async (accountId) => {
  try {
    if (!db) {
      console.warn('Firestore not available');
      return [];
    }
    const q = query(
      collection(db, 'customers'),
      where('accountId', '==', accountId),
      where('isActive', 'in', [true, null]) // null for legacy docs
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching customers:', error);
    return [];
  }
};

// TASKS
export const addTask = async (taskData) => {
  return await addDoc(collection(db, 'tasks'), {
    ...taskData,
    accountId: auth.currentUser.uid,
  });
};
export const getTasksForCustomer = async (customerId) => {
  const q = query(collection(db, 'tasks'), where('customerId', '==', customerId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// INVOICES
export async function addInvoice({ customerId, services, amount, dueDate }) {
  // Convert dueDate to Firestore Timestamp if it's a Date object
  let dueDateToSave = dueDate;
  if (dueDate instanceof Date && !isNaN(dueDate)) {
    // Use Firestore Timestamp from modular SDK
    dueDateToSave = dueDate;
  }
  const docRef = await addDoc(collection(db, 'invoices'), {
    customerId,
    services,
    amount,
    dueDate: dueDateToSave,
    status: 'unpaid',
    createdAt: serverTimestamp(),
    accountId: auth.currentUser.uid,
  });
  // Update customer with new invoiceId
  await updateDoc(doc(db, 'customers', customerId), {
    invoiceId: docRef.id,
    billingStatus: 'unpaid',
    dueDate: dueDateToSave,
  });
  return docRef;
}
export const getInvoicesForAccount = async (accountId) => {
  const q = query(collection(db, 'invoices'), where('accountId', '==', accountId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// RECEIPTS
export const addReceipt = async (receiptData) => {
  return await addDoc(collection(db, 'receipts'), {
    ...receiptData,
    accountId: auth.currentUser.uid,
    timestamp: new Date(),
  });
};
export const getReceiptsForAccount = async (accountId) => {
  const q = query(collection(db, 'receipts'), where('accountId', '==', accountId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// EXPENSES
export const addExpense = async (expenseData) => {
  // Look up customer name/email if not provided
  let customerName = expenseData.customerName;
  let customerEmail = expenseData.customerEmail;
  if ((!customerName || !customerEmail) && expenseData.customerId) {
    // Try to fetch customer from Firestore
    const customerDoc = await getDocs(query(collection(db, 'customers'), where('id', '==', expenseData.customerId)));
    if (!customerName && !customerDoc.empty) {
      const data = customerDoc.docs[0].data();
      customerName = data.name;
      customerEmail = data.email;
    }
  }
  // Ensure no undefined values
  if (customerName === undefined || customerName === null) customerName = '';
  if (customerEmail === undefined || customerEmail === null) customerEmail = '';
  return await addDoc(collection(db, 'expenses'), {
    ...expenseData,
    customerName,
    customerEmail,
    accountId: auth.currentUser.uid,
    date: new Date(),
  });
};
export const getExpensesForAccount = async (accountId) => {
  const q = query(collection(db, 'expenses'), where('accountId', '==', accountId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// MARK INVOICE AS PAID (auto-create receipt)
export const markInvoicePaid = async (invoiceId, customerId, amount) => {
  await updateDoc(doc(db, 'invoices', invoiceId), {
    status: 'paid',
  });
  await addReceipt({
    invoiceId,
    customerId,
    amountPaid: amount,
  });
  await updateDoc(doc(db, 'customers', customerId), {
    billingStatus: 'paid',
  });
};

// POOL VISITS
export const addPoolVisit = async (poolVisitData) => {
  try {
    if (!db || !auth || !auth.currentUser) {
      console.warn('Firebase not available or user not authenticated');
      throw new Error('Firebase not available or user not authenticated');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const scheduledDate = poolVisitData?.scheduledDate instanceof Date
      ? poolVisitData.scheduledDate
      : new Date(poolVisitData?.scheduledDate);

    const isTodayUncompleted =
      scheduledDate && scheduledDate >= today && scheduledDate < tomorrow && !poolVisitData?.completed;

    let nextOrder = null;
    if (isTodayUncompleted) {
      const q = query(
        collection(db, 'poolVisits'),
        where('accountId', '==', auth.currentUser.uid),
        where('scheduledDate', '>=', today),
        where('scheduledDate', '<', tomorrow),
        where('completed', '==', false)
      );
      const snapshot = await getDocs(q);
      nextOrder = snapshot.size + 1;
    }

    const data = {
      ...poolVisitData,
      accountId: auth.currentUser.uid,
      createdAt: new Date(),
      completed: poolVisitData?.completed === true ? true : false,
      ...(isTodayUncompleted ? { order: nextOrder } : {}),
      ...(poolVisitData?.completed
        ? { completedAt: poolVisitData.completedAt || scheduledDate || new Date() }
        : {}),
    };

    console.log('Adding pool visit with data:', data);
    console.log('Current user ID:', auth.currentUser.uid);

    const docRef = await addDoc(collection(db, 'poolVisits'), data);

    // If this is a recurring visit, generate future visits
    if (poolVisitData.isRecurring) {
      await generateFutureRecurringVisits(data, docRef.id);
    }

    return docRef;
  } catch (error) {
    console.error('Error adding pool visit:', error);
    throw error;
  }
};

// Generate future recurring pool visits (only 2-3 ahead)
const generateFutureRecurringVisits = async (recurringVisitData, originalVisitId) => {
  try {
    const { scheduledDate, recurrenceFrequency, recurrenceDayOfWeek, customerId, customerName, customerEmail, tasks, accountId } = recurringVisitData;
    
    // Only generate 2 future visits initially
    const futureVisits = [];
    const startDate = new Date(scheduledDate);
    startDate.setDate(startDate.getDate() + 7); // Start from next week
    
    for (let week = 1; week <= 2; week++) {
      let visitDate;
      
      if (recurrenceFrequency === 'weekly') {
        visitDate = new Date(startDate);
        visitDate.setDate(startDate.getDate() + (week - 1) * 7);
      } else if (recurrenceFrequency === 'biweekly') {
        visitDate = new Date(startDate);
        visitDate.setDate(startDate.getDate() + (week - 1) * 14);
      } else if (recurrenceFrequency === 'monthly') {
        visitDate = new Date(startDate);
        visitDate.setMonth(startDate.getMonth() + (week - 1));
      }
      
      // Ensure the date falls on the correct day of week
      const targetDayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(recurrenceDayOfWeek);
      const currentDayIndex = visitDate.getDay();
      const daysToAdd = (targetDayIndex - currentDayIndex + 7) % 7;
      visitDate.setDate(visitDate.getDate() + daysToAdd);
      
      futureVisits.push({
        accountId,
        customerId,
        customerName,
        customerEmail,
        scheduledDate: visitDate,
        tasks,
        completed: false,
        createdAt: new Date(),
        isRecurring: true,
        recurrenceFrequency,
        recurrenceDayOfWeek,
        originalRecurringVisitId: originalVisitId, // Link to the original recurring visit
        cancelled: false, // Ensure new visits are not cancelled
      });
    }
    
    // Add the 2 future visits
    const addPromises = futureVisits.map(visitData => 
      addDoc(collection(db, 'poolVisits'), visitData)
    );
    
    await Promise.all(addPromises);
    
  } catch (error) {
    console.error('Error generating future recurring visits:', error);
    throw error;
  }
};

// Automatically check and generate new recurring visits based on current date
export const checkAndGenerateRecurringVisits = async () => {
  try {
    if (!db || !auth || !auth.currentUser) {
      console.warn('Firebase not available or user not authenticated');
      return;
    }

    // Find all original recurring visits (not the generated ones)
    const q = query(
      collection(db, 'poolVisits'),
      where('accountId', '==', auth.currentUser.uid),
      where('isRecurring', '==', true),
      where('originalRecurringVisitId', '==', null), // Only original recurring visits
      where('cancelled', '==', false) // Only non-cancelled recurring visits
    );
    
    const snapshot = await getDocs(q);
    
    for (const docSnapshot of snapshot.docs) {
      const originalVisit = { id: docSnapshot.id, ...docSnapshot.data() };
      await ensureFutureRecurringVisits(originalVisit.id);
    }
    
  } catch (error) {
    console.error('Error checking and generating recurring visits:', error);
  }
};

// Check if we need to generate more future visits and generate them
export const ensureFutureRecurringVisits = async (originalVisitId) => {
  try {
    if (!db || !auth || !auth.currentUser) {
      console.warn('Firebase not available or user not authenticated');
      return;
    }

    // Get the original recurring visit to understand the pattern
    const originalVisitDoc = await getDocs(query(collection(db, 'poolVisits'), where('__name__', '==', originalVisitId)));
    
    if (originalVisitDoc.empty) return;
    
    const originalVisit = originalVisitDoc.docs[0].data();
    
    // Find all future recurring visits for this pattern
    const q = query(
      collection(db, 'poolVisits'),
      where('accountId', '==', auth.currentUser.uid),
      where('originalRecurringVisitId', '==', originalVisitId),
      where('completed', '==', false),
      where('scheduledDate', '>', new Date())
    );
    
    const snapshot = await getDocs(q);
    const futureVisits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // If we have less than 2 future visits, generate more
    if (futureVisits.length < 2) {
      await generateMoreFutureVisits(originalVisit, futureVisits);
    }
    
  } catch (error) {
    console.error('Error ensuring future recurring visits:', error);
  }
};

// Generate additional future visits when needed
const generateMoreFutureVisits = async (originalVisit, existingFutureVisits) => {
  try {
    const { recurrenceFrequency, recurrenceDayOfWeek, customerId, customerName, customerEmail, tasks, accountId } = originalVisit;
    
    // Find the latest scheduled date from existing future visits
    let latestDate = new Date(originalVisit.scheduledDate);
    if (existingFutureVisits.length > 0) {
      const latestVisit = existingFutureVisits.reduce((latest, visit) => {
        const visitDate = new Date(visit.scheduledDate);
        const latestDate = new Date(latest.scheduledDate);
        return visitDate > latestDate ? visit : latest;
      });
      latestDate = new Date(latestVisit.scheduledDate);
    }
    
    // Generate 2 more visits starting from the week after the latest
    const newVisits = [];
    for (let i = 1; i <= 2; i++) {
      let visitDate = new Date(latestDate);
      
      try {
        if (recurrenceFrequency === 'weekly') {
          visitDate.setDate(latestDate.getDate() + (i * 7));
        } else if (recurrenceFrequency === 'biweekly') {
          visitDate.setDate(latestDate.getDate() + (i * 14));
        } else if (recurrenceFrequency === 'monthly') {
          visitDate.setMonth(latestDate.getMonth() + i);
        }
        
        // Ensure the date falls on the correct day of week
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const targetDayIndex = dayNames.indexOf(recurrenceDayOfWeek);
        const currentDayIndex = visitDate.getDay();
        const daysToAdd = (targetDayIndex - currentDayIndex + 7) % 7;
        visitDate.setDate(visitDate.getDate() + daysToAdd);
        
        // Validate the date is reasonable (not too far in the future)
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 2); // Max 2 years in the future
        
        if (visitDate > maxDate) {
          console.warn('Generated date too far in future, skipping:', visitDate);
          continue;
        }
        
        newVisits.push({
          accountId,
          customerId,
          customerName,
          customerEmail,
          scheduledDate: visitDate,
          tasks,
          completed: false,
          createdAt: new Date(),
          isRecurring: true,
          recurrenceFrequency,
          recurrenceDayOfWeek,
          originalRecurringVisitId: originalVisit.id,
        });
      } catch (dateError) {
        console.error('Error calculating date for visit:', dateError);
        continue;
      }
    }
    
    // Add the new visits
    if (newVisits.length > 0) {
      const addPromises = newVisits.map(visitData => 
        addDoc(collection(db, 'poolVisits'), visitData)
      );
      
      await Promise.all(addPromises);
    }
    
  } catch (error) {
    console.error('Error generating more future visits:', error);
  }
};

// Update all future recurring visits when the original is edited
export const updateRecurringVisits = async (originalVisitId, updateData) => {
  try {
    if (!db || !auth || !auth.currentUser) {
      console.warn('Firebase not available or user not authenticated');
      throw new Error('Firebase not available or user not authenticated');
    }

    // Find all future recurring visits linked to this original visit
    const q = query(
      collection(db, 'poolVisits'),
      where('accountId', '==', auth.currentUser.uid),
      where('originalRecurringVisitId', '==', originalVisitId),
      where('completed', '==', false),
      where('scheduledDate', '>', new Date())
    );
    
    const snapshot = await getDocs(q);
    
    // Update all future visits with the new data
    const updatePromises = snapshot.docs.map(docSnapshot => {
      const docRef = doc(db, 'poolVisits', docSnapshot.id);
      return updateDoc(docRef, updateData);
    });
    
    await Promise.all(updatePromises);
    
  } catch (error) {
    console.error('Error updating recurring visits:', error);
    throw error;
  }
};

// Stop recurring visits and remove all future scheduled visits
export const stopRecurringVisits = async (originalVisitId) => {
  try {
    if (!db || !auth || !auth.currentUser) {
      console.warn('Firebase not available or user not authenticated');
      throw new Error('Firebase not available or user not authenticated');
    }

    // Find all future recurring visits linked to this original visit
    const q = query(
      collection(db, 'poolVisits'),
      where('accountId', '==', auth.currentUser.uid),
      where('originalRecurringVisitId', '==', originalVisitId),
      where('completed', '==', false),
      where('scheduledDate', '>', new Date())
    );
    
    const snapshot = await getDocs(q);
    
    // Mark all future visits as completed (effectively removing them from schedule)
    const batch = [];
    for (const docSnapshot of snapshot.docs) {
      const docRef = doc(db, 'poolVisits', docSnapshot.id);
      batch.push(updateDoc(docRef, {
        completed: true,
        completedAt: new Date(),
        recurringStopped: true
      }));
    }
    
    // Also mark the original visit as no longer recurring
    const originalVisitRef = doc(db, 'poolVisits', originalVisitId);
    batch.push(updateDoc(originalVisitRef, {
      isRecurring: false,
      recurrenceFrequency: null,
      recurrenceDayOfWeek: null
    }));
    
    // Execute all updates
    await Promise.all(batch);
    
  } catch (error) {
    console.error('Error stopping recurring visits:', error);
    throw error;
  }
};

export const getPoolVisitsForAccount = async (accountId) => {
  const q = query(
    collection(db, 'poolVisits'),
    where('accountId', '==', accountId),
    where('completed', '==', false)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getPoolVisitsForDate = async (accountId, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  const q = query(
    collection(db, 'poolVisits'),
    where('accountId', '==', accountId),
    where('scheduledDate', '>=', startOfDay),
    where('scheduledDate', '<=', endOfDay),
    where('completed', '==', false)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.order - b.order);
};

export const markPoolVisitCompleted = async (poolVisitId) => {
  try {
    // Mark the visit as completed
    await updateDoc(doc(db, 'poolVisits', poolVisitId), {
      completed: true,
      completedAt: new Date(),
    });
  } catch (error) {
    console.error('Error marking pool visit completed:', error);
    throw error;
  }
};

export const updatePoolVisitOrder = async (poolVisitId, newOrder) => {
  await updateDoc(doc(db, 'poolVisits', poolVisitId), {
    order: newOrder,
  });
};

// TODOS
export const getTodosForAccount = async (accountId) => {
  const q = query(
    collection(db, 'todos'),
    where('accountId', '==', accountId),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const addTodo = async (todoData) => {
  // Get the current highest order for todos
  const q = query(
    collection(db, 'todos'),
    where('accountId', '==', auth.currentUser.uid),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  const nextOrder = snapshot.size + 1;

  const todoDataToSave = {
    ...todoData,
    accountId: auth.currentUser.uid,
    status: 'pending',
    order: nextOrder,
    createdAt: new Date(),
  };

  console.log('Adding todo with data:', todoDataToSave);
  console.log('Current user ID:', auth.currentUser.uid);

  return await addDoc(collection(db, 'todos'), todoDataToSave);
};

export const updateTodoOrder = async (todoId, newOrder) => {
  await updateDoc(doc(db, 'todos', todoId), {
    order: newOrder,
  });
};

export const markTodoCompleted = async (todoId) => {
  await updateDoc(doc(db, 'todos', todoId), {
    status: 'completed',
    completedAt: new Date(),
  });
};

export const updatePoolVisit = async (poolVisitId, updateData) => {
  await updateDoc(doc(db, 'poolVisits', poolVisitId), {
    ...updateData,
    updatedAt: new Date(),
  });
};

export const updateTodo = async (todoId, updateData) => {
  await updateDoc(doc(db, 'todos', todoId), {
    ...updateData,
    updatedAt: new Date(),
  });
};

export const getTodosForDate = async (accountId, date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  const q = query(
    collection(db, 'todos'),
    where('accountId', '==', accountId),
    where('status', '==', 'pending'),
    where('date', '>=', startOfDay),
    where('date', '<=', endOfDay)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => (a.order || 0) - (b.order || 0));
};

export const addSupplyStore = async (store) => {
  return await addDoc(collection(db, 'supplyStores'), {
    ...store,
    accountId: auth.currentUser.uid,
    createdAt: new Date(),
  });
};

// RECURRING VISITS MANAGEMENT
export const getRecurringVisitsForCustomer = async (customerId) => {
  try {
    if (!db || !auth || !auth.currentUser) {
      console.warn('Firebase not available or user not authenticated');
      return [];
    }

    const q = query(
      collection(db, 'poolVisits'),
      where('accountId', '==', auth.currentUser.uid),
      where('customerId', '==', customerId),
      where('isRecurring', '==', true),
      where('cancelled', '!=', true) // Only get active recurring visits
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching recurring visits:', error);
    return [];
  }
};

export const cancelRecurringVisit = async (visitId) => {
  try {
    if (!db || !auth || !auth.currentUser) {
      throw new Error('Firebase not available or user not authenticated');
    }

    // Mark the recurring visit as cancelled
    await updateDoc(doc(db, 'poolVisits', visitId), {
      cancelled: true,
      cancelledAt: new Date(),
      updatedAt: new Date()
    });

    // Also mark any future generated visits as cancelled
    const visitDoc = await getDoc(doc(db, 'poolVisits', visitId));
    if (visitDoc.exists()) {
      const visitData = visitDoc.data();
      const q = query(
        collection(db, 'poolVisits'),
        where('accountId', '==', auth.currentUser.uid),
        where('customerId', '==', visitData.customerId),
        where('isRecurring', '==', true),
        where('scheduledDate', '>', new Date()),
        where('cancelled', '!=', true)
      );
      
      const futureVisits = await getDocs(q);
      const batch = writeBatch(db);
      futureVisits.docs.forEach(doc => {
        batch.update(doc.ref, {
          cancelled: true,
          cancelledAt: new Date(),
          updatedAt: new Date()
        });
      });
      await batch.commit();
    }

    return true;
  } catch (error) {
    console.error('Error cancelling recurring visit:', error);
    throw error;
  }
};

export const updateRecurringVisit = async (visitId, updateData) => {
  try {
    if (!db || !auth || !auth.currentUser) {
      throw new Error('Firebase not available or user not authenticated');
    }

    // Update the main recurring visit
    await updateDoc(doc(db, 'poolVisits', visitId), {
      ...updateData,
      updatedAt: new Date()
    });

    // If frequency or day of week changed, regenerate future visits
    if (updateData.recurrenceFrequency || updateData.recurrenceDayOfWeek) {
      const visitDoc = await getDoc(doc(db, 'poolVisits', visitId));
      if (visitDoc.exists()) {
        const visitData = visitDoc.data();
        
        // Cancel existing future visits
        const q = query(
          collection(db, 'poolVisits'),
          where('accountId', '==', auth.currentUser.uid),
          where('customerId', '==', visitData.customerId),
          where('isRecurring', '==', true),
          where('scheduledDate', '>', new Date()),
          where('cancelled', '!=', true)
        );
        
        const futureVisits = await getDocs(q);
        const batch = writeBatch(db);
        futureVisits.docs.forEach(doc => {
          batch.update(doc.ref, {
            cancelled: true,
            cancelledAt: new Date(),
            updatedAt: new Date()
          });
        });
        await batch.commit();

        // Generate new future visits with updated settings
        await generateFutureRecurringVisits(visitData, visitId);
      }
    }

    return true;
  } catch (error) {
    console.error('Error updating recurring visit:', error);
    throw error;
  }
}; 