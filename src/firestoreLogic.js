import { db, auth } from '../firebase';
import { collection, addDoc, updateDoc, doc, getDocs, query, where, onSnapshot } from 'firebase/firestore';

// ACCOUNTS
export const addAccount = async (accountData) => {
  return await addDoc(collection(db, 'accounts'), {
    ...accountData,
    createdAt: new Date(),
  });
};

// CUSTOMERS
export const addCustomer = async (customerData) => {
  return await addDoc(collection(db, 'customers'), {
    ...customerData,
    accountId: auth.currentUser.uid,
    billingStatus: 'unpaid',
    dueDate: null,
    invoiceId: null,
    isActive: true,
  });
};
export const softDeleteCustomer = async (customerId) => {
  await updateDoc(doc(db, 'customers', customerId), {
    isActive: false,
    deletedAt: new Date(),
  });
};
export const getCustomersForAccount = async (accountId) => {
  const q = query(
    collection(db, 'customers'),
    where('accountId', '==', accountId),
    where('isActive', 'in', [true, null]) // null for legacy docs
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
export const addInvoice = async (invoiceData) => {
  const docRef = await addDoc(collection(db, 'invoices'), {
    ...invoiceData,
    accountId: auth.currentUser.uid,
    status: 'unpaid',
  });
  // Update customer with new invoiceId
  await updateDoc(doc(db, 'customers', invoiceData.customerId), {
    invoiceId: docRef.id,
    billingStatus: 'unpaid',
    dueDate: invoiceData.dueDate,
  });
  return docRef;
};
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
  return await addDoc(collection(db, 'expenses'), {
    ...expenseData,
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