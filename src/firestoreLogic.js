import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';

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
  // Get the current highest order for today's visits
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const q = query(
    collection(db, 'poolVisits'),
    where('accountId', '==', auth.currentUser.uid),
    where('scheduledDate', '>=', today),
    where('scheduledDate', '<', tomorrow),
    where('completed', '==', false)
  );
  
  const snapshot = await getDocs(q);
  const nextOrder = snapshot.size + 1;

  return await addDoc(collection(db, 'poolVisits'), {
    ...poolVisitData,
    accountId: auth.currentUser.uid,
    createdAt: new Date(),
    completed: false,
    order: nextOrder,
  });
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
  await updateDoc(doc(db, 'poolVisits', poolVisitId), {
    completed: true,
    completedAt: new Date(),
  });
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

  return await addDoc(collection(db, 'todos'), {
    ...todoData,
    accountId: auth.currentUser.uid,
    status: 'pending',
    order: nextOrder,
    createdAt: new Date(),
  });
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