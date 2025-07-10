import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCustomersForAccount, getInvoicesForAccount, getReceiptsForAccount, getExpensesForAccount, markInvoicePaid } from '../src/firestoreLogic';
import { auth } from '../firebase';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { updateDoc, doc } from 'firebase/firestore';

const BillingScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('accounts');
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [expandedExpense, setExpandedExpense] = useState(null);
  const [fullImage, setFullImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedReceiptMonth, setSelectedReceiptMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showReceiptMonthDropdown, setShowReceiptMonthDropdown] = useState(false);
  const [expandedReceipt, setExpandedReceipt] = useState(null);

  useEffect(() => {
    // Real-time listener for customers
    const customersQuery = query(
      collection(db, 'customers'),
      where('accountId', '==', auth.currentUser.uid),
      where('isActive', 'in', [true, null])
    );
    const unsubCustomers = onSnapshot(customersQuery, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    // Real-time listener for invoices
    const invoicesQuery = query(
      collection(db, 'invoices'),
      where('accountId', '==', auth.currentUser.uid)
    );
    const unsubInvoices = onSnapshot(invoicesQuery, (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    // Real-time listener for expenses
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('accountId', '==', auth.currentUser.uid)
    );
    const unsubExpenses = onSnapshot(expensesQuery, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    // Real-time listener for receipts
    const receiptsQuery = query(
      collection(db, 'expenses'),
      where('accountId', '==', auth.currentUser.uid),
      where('receiptUrl', '!=', null)
    );
    const unsubReceipts = onSnapshot(receiptsQuery, (snapshot) => {
      setReceipts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => {
      unsubCustomers();
      unsubInvoices();
      unsubExpenses();
      unsubReceipts();
    };
  }, []);

  // Helper: get unpaid amount for a customer
  const getAmountOwed = (customerId) => {
    return invoices
      .filter(inv => inv.customerId === customerId && inv.status !== 'paid')
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  };

  // Helper: is customer owing?
  const isOwing = (customerId) => getAmountOwed(customerId) > 0;

  // Outstanding sum (only for active customers)
  const calculateOutstanding = () => {
    const activeCustomerIds = customers.filter(c => c.isActive !== false).map(c => c.id);
    return invoices.filter(inv => inv.status !== 'paid' && activeCustomerIds.includes(inv.customerId)).reduce((total, inv) => total + (inv.amount || 0), 0);
  };

  // Sort customers: owing first
  const sortedCustomers = [...customers].sort((a, b) => {
    const aOwes = isOwing(a.id);
    const bOwes = isOwing(b.id);
    if (aOwes === bOwes) return a.name.localeCompare(b.name);
    return bOwes - aOwes;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return { name: 'checkmark-circle', color: '#4CAF50' };
      case 'unpaid':
        return { name: 'time', color: '#FFA500' };
      case 'overdue':
        return { name: 'close-circle', color: '#F44336' };
      default:
        return { name: 'help-circle', color: '#666' };
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'unpaid':
        return 'Unpaid';
      case 'overdue':
        return 'Overdue';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const calculateTotalRevenue = () => {
    return receipts.reduce((total, receipt) => total + receipt.amountPaid, 0);
  };

  const calculateTotalExpenses = () => {
    return expenses.reduce((total, expense) => total + expense.amount, 0);
  };

  // Helper: get last 12 months
  const getLast12Months = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: format(d, 'MMMM yyyy'),
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      });
    }
    return months;
  };

  // Sort all expenses by date, newest first
  const sortedExpenses = [...expenses].filter(exp => exp.date).sort((a, b) => {
    const da = new Date(a.date?.seconds ? a.date.seconds * 1000 : a.date);
    const db = new Date(b.date?.seconds ? b.date.seconds * 1000 : b.date);
    return db - da;
  });

  // Helper: get customer name by id
  const getCustomerName = (customerId) => {
    const c = customers.find(c => c.id === customerId);
    return c ? c.name : 'Unknown';
  };

  const handleAddReceipt = async (expense) => {
    try {
      setUploading(true);
      // Ask for permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo access to attach receipts.');
        setUploading(false);
        return;
      }
      // Pick or take a photo
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
      if (result.cancelled || !result.assets || !result.assets[0]) {
        setUploading(false);
        return;
      }
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const filename = asset.fileName || `receipt_${Date.now()}.jpg`;
      const storageRef = ref(storage, `receipts/${expense.id}/${filename}`);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      // Update expense with receiptUrl
      await updateDoc(doc(db, 'expenses', expense.id), { receiptUrl: downloadUrl });
      Alert.alert('Success', 'Receipt uploaded!');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to upload receipt.');
    } finally {
      setUploading(false);
    }
  };

  const renderAccountsTab = () => (
    <View>
      {/* New Invoice Button */}
      <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('AddInvoice')}>
        <Ionicons name="document-text" size={20} color="#00BFFF" />
        <Text style={styles.headerButtonText}>New Invoice</Text>
      </TouchableOpacity>
      {/* Outstanding Summary Box Only */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Ionicons name="alert-circle" size={24} color="#F44336" />
          <Text style={styles.summaryAmount}>${calculateOutstanding().toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Outstanding</Text>
        </View>
      </View>
      {/* Accounts List */}
      {sortedCustomers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="card-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No accounts to display</Text>
          <Text style={styles.emptySubtext}>Add customers to see their billing information</Text>
        </View>
      ) : (
        sortedCustomers.map((customer) => {
          const owes = isOwing(customer.id);
          const amountOwed = getAmountOwed(customer.id);
          return (
            <View key={customer.id} style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{customer.name}</Text>
                  <Text style={styles.accountAddress}>{customer.address}</Text>
                </View>
                <View style={styles.accountStatus}>
                  <Ionicons
                    name={owes ? 'close-circle' : 'checkmark-circle'}
                    size={20}
                    color={owes ? '#F44336' : '#4CAF50'}
                  />
                  <Text style={styles.statusText}>{owes ? 'Owes' : 'Paid'}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={{ backgroundColor: '#e3f2fd', borderRadius: 8, padding: 8, marginBottom: 8, alignSelf: 'flex-start' }}
                onPress={() => navigation.navigate('AccountBilling', { customerId: customer.id })}
              >
                <Text style={{ color: '#00BFFF', fontWeight: 'bold' }}>View Billing</Text>
              </TouchableOpacity>
              {owes && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{
                      color: '#F44336',
                      fontWeight: '600',
                      fontSize: 13,
                      backgroundColor: '#fdecea',
                      borderRadius: 8,
                      paddingVertical: 2,
                      paddingHorizontal: 8,
                      marginRight: 8,
                      overflow: 'hidden',
                    }}>
                      Owes: ${amountOwed.toFixed(2)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#e3f2fd',
                      borderRadius: 8,
                      paddingVertical: 4,
                      paddingHorizontal: 10,
                      marginLeft: 8,
                    }}
                    onPress={() => {
                      Alert.alert(
                        'Mark as Paid',
                        'Are you sure this customer paid?',
                        [
                          { text: 'No', style: 'cancel' },
                          { text: 'Yes', style: 'destructive', onPress: async () => {
                            // Mark all unpaid invoices for this customer as paid
                            const unpaid = invoices.filter(inv => inv.customerId === customer.id && inv.status !== 'paid');
                            for (const inv of unpaid) {
                              await markInvoicePaid(inv.id, customer.id, inv.amount || 0);
                            }
                          }},
                        ]
                      );
                    }}
                  >
                    <Ionicons name="checkmark-done" size={16} color="#4CAF50" />
                    <Text style={{ color: '#4CAF50', fontWeight: 'bold', marginLeft: 4, fontSize: 13 }}>Mark Paid</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  const filteredReceipts = receipts.filter(exp => {
    if (!exp.date) return false;
    const d = new Date(exp.date.seconds ? exp.date.seconds * 1000 : exp.date);
    const expMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return expMonth === selectedReceiptMonth;
  });
  const sortedReceipts = [...filteredReceipts].filter(exp => exp.date).sort((a, b) => {
    const da = new Date(a.date?.seconds ? a.date.seconds * 1000 : a.date);
    const db = new Date(b.date?.seconds ? b.date.seconds * 1000 : b.date);
    return db - da;
  });

  const renderReceiptsTab = () => (
    <View>
      {/* Filter by Month Dropdown */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Filter by Month</Text>
        <TouchableOpacity
          style={{
            backgroundColor: 'white',
            borderRadius: 8,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: '#e1e5e9',
          }}
          onPress={() => setShowReceiptMonthDropdown(!showReceiptMonthDropdown)}
        >
          <Text>{getLast12Months().find(m => m.value === selectedReceiptMonth)?.label || ''}</Text>
          <Ionicons name={showReceiptMonthDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#00BFFF" />
        </TouchableOpacity>
        {showReceiptMonthDropdown && (
          <View style={{ backgroundColor: 'white', borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: '#e1e5e9', zIndex: 10 }}>
            {getLast12Months().map(month => (
              <TouchableOpacity
                key={month.value}
                style={{ padding: 12 }}
                onPress={() => {
                  setSelectedReceiptMonth(month.value);
                  setShowReceiptMonthDropdown(false);
                }}
              >
                <Text>{month.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      {/* Receipts List */}
      <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Receipts</Text>
      {sortedReceipts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="card-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No receipts to display for this month</Text>
        </View>
      ) : (
        sortedReceipts.map(expense => {
          const d = new Date(expense.date?.seconds ? expense.date.seconds * 1000 : expense.date);
          return (
            <View key={expense.id} style={styles.expenseCard}>
              <TouchableOpacity
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                onPress={() => setExpandedReceipt(expandedReceipt === expense.id ? null : expense.id)}
              >
                <View>
                  <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{getCustomerName(expense.customerId)}</Text>
                  <Text style={{ color: '#666', fontSize: 14 }}>{d.toString() !== 'Invalid Date' ? format(d, 'MMM d, yyyy') : 'No date'}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, marginRight: 8 }}>${expense.amount?.toFixed(2)}</Text>
                  <Ionicons name={expandedReceipt === expense.id ? 'chevron-up' : 'chevron-down'} size={20} color="#00BFFF" />
                </View>
              </TouchableOpacity>
              {expandedReceipt === expense.id && (
                <View style={{ marginTop: 8, backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12 }}>
                  <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Items:</Text>
                  {expense.items && expense.items.map((item, idx) => (
                    <Text key={idx} style={{ marginLeft: 8, marginBottom: 2 }}>• {item}</Text>
                  ))}
                  {/* Show thumbnail if receipt exists */}
                  {expense.receiptUrl && (
                    <TouchableOpacity style={{ marginTop: 8 }} onPress={() => setFullImage(expense.receiptUrl)}>
                      <Image source={{ uri: expense.receiptUrl }} style={{ width: 80, height: 80, borderRadius: 8 }} resizeMode="cover" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  const renderExpensesTab = () => (
    <View>
      {/* Add Expense Button */}
      <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('AddExpense')}>
        <Ionicons name="add-circle" size={20} color="#00BFFF" />
        <Text style={styles.headerButtonText}>Add Expense</Text>
      </TouchableOpacity>
      {/* Filter by Month Dropdown */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Filter by Month</Text>
        <TouchableOpacity
          style={{
            backgroundColor: 'white',
            borderRadius: 8,
            padding: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: '#e1e5e9',
          }}
          onPress={() => setShowMonthDropdown(!showMonthDropdown)}
        >
          <Text>{getLast12Months().find(m => m.value === selectedMonth)?.label || ''}</Text>
          <Ionicons name={showMonthDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#00BFFF" />
        </TouchableOpacity>
        {showMonthDropdown && (
          <View style={{ backgroundColor: 'white', borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: '#e1e5e9', zIndex: 10 }}>
            {getLast12Months().map(month => (
              <TouchableOpacity
                key={month.value}
                style={{ padding: 12 }}
                onPress={() => {
                  setSelectedMonth(month.value);
                  setShowMonthDropdown(false);
                }}
              >
                <Text>{month.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      {/* Recent Expenses List */}
      <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Recent Expenses</Text>
      {expenses.some(exp => !exp.date) && (
        <Text style={{ color: 'red', marginBottom: 8 }}>Some expenses are missing a date and will not be shown. Please re-add them.</Text>
      )}
      {sortedExpenses.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="card-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No expenses to display for this month</Text>
        </View>
      ) : (
        sortedExpenses.map(expense => {
          const d = new Date(expense.date?.seconds ? expense.date.seconds * 1000 : expense.date);
          return (
            <View key={expense.id} style={styles.expenseCard}>
              <TouchableOpacity
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                onPress={() => setExpandedExpense(expandedExpense === expense.id ? null : expense.id)}
              >
                <View>
                  <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{expense.customerName || getCustomerName(expense.customerId)}</Text>
                  <Text style={{ color: '#666', fontSize: 14 }}>{d.toString() !== 'Invalid Date' ? format(d, 'MMM d, yyyy') : 'No date'}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, marginRight: 8 }}>${expense.amount?.toFixed(2)}</Text>
                  <Ionicons name={expandedExpense === expense.id ? 'chevron-up' : 'chevron-down'} size={20} color="#00BFFF" />
                </View>
              </TouchableOpacity>
              {expandedExpense === expense.id && (
                <View style={{ marginTop: 8, backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12 }}>
                  <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Items:</Text>
                  {expense.items && expense.items.map((item, idx) => (
                    <Text key={idx} style={{ marginLeft: 8, marginBottom: 2 }}>• {item}</Text>
                  ))}
                  {/* Add Receipt Button */}
                  <TouchableOpacity style={{ marginTop: 12, backgroundColor: '#e3f2fd', borderRadius: 8, padding: 8, alignSelf: 'flex-start' }} onPress={() => handleAddReceipt(expense)}>
                    <Ionicons name="image" size={18} color="#00BFFF" />
                    <Text style={{ color: '#00BFFF', fontWeight: 'bold', marginLeft: 6 }}>Add Receipt</Text>
                  </TouchableOpacity>
                  {/* Show thumbnail if receipt exists */}
                  {expense.receiptUrl && (
                    <TouchableOpacity style={{ marginTop: 8 }} onPress={() => setFullImage(expense.receiptUrl)}>
                      <Image source={{ uri: expense.receiptUrl }} style={{ width: 80, height: 80, borderRadius: 8 }} resizeMode="cover" />
                    </TouchableOpacity>
                  )}
                  {/* Show uploading indicator if uploading */}
                  {uploading && <Text style={{ color: '#00BFFF', marginBottom: 8 }}>Uploading receipt...</Text>}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'accounts' && styles.activeTab]}
            onPress={() => setActiveTab('accounts')}
          >
            <Ionicons
              name="card"
              size={20}
              color={activeTab === 'accounts' ? '#00BFFF' : '#666'}
            />
            <Text
              style={[styles.tabText, activeTab === 'accounts' && styles.activeTabText]}
            >
              Accounts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'expenses' && styles.activeTab]}
            onPress={() => setActiveTab('expenses')}
          >
            <Ionicons
              name="card-outline"
              size={20}
              color={activeTab === 'expenses' ? '#00BFFF' : '#666'}
            />
            <Text
              style={[styles.tabText, activeTab === 'expenses' && styles.activeTabText]}
            >
              Expenses
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'receipts' && styles.activeTab]}
            onPress={() => setActiveTab('receipts')}
          >
            <Ionicons
              name="receipt"
              size={20}
              color={activeTab === 'receipts' ? '#00BFFF' : '#666'}
            />
            <Text
              style={[styles.tabText, activeTab === 'receipts' && styles.activeTabText]}
            >
              Receipts
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'accounts' && renderAccountsTab()}
        {activeTab === 'receipts' && renderReceiptsTab()}
        {activeTab === 'expenses' && renderExpensesTab()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#e3f2fd',
  },
  tabText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#00BFFF',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 8,
    padding: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  headerButtonText: {
    color: '#00BFFF',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 14,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  accountCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  accountAddress: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  accountStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 6,
    alignSelf: 'flex-start',
  },
  markPaidButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 14,
  },
  receiptCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  receiptDate: {
    fontSize: 14,
    color: '#666',
  },
  receiptInvoice: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  expenseCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
  },
  expenseDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  expenseStore: {
    fontSize: 14,
    color: '#00BFFF',
    fontWeight: '600',
  },
});

export default BillingScreen; 