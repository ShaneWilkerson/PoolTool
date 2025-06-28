import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCustomersForAccount, getInvoicesForAccount, getReceiptsForAccount, getExpensesForAccount } from '../src/firestoreLogic';
import { auth } from '../firebase';

const BillingScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('accounts');
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersData, invoicesData, receiptsData, expensesData] = await Promise.all([
          getCustomersForAccount(auth.currentUser.uid),
          getInvoicesForAccount(auth.currentUser.uid),
          getReceiptsForAccount(auth.currentUser.uid),
          getExpensesForAccount(auth.currentUser.uid),
        ]);
        setCustomers(customersData);
        setInvoices(invoicesData);
        setReceipts(receiptsData);
        setExpenses(expensesData);
      } catch (error) {
        console.error('Error fetching billing data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const calculateOutstanding = () => {
    return invoices.reduce((total, invoice) => {
      if (invoice.status !== 'paid') {
        return total + invoice.amount;
      }
      return total;
    }, 0);
  };

  const renderAccountsTab = () => (
    <View>
      {/* New Invoice Button */}
      <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('AddInvoice')}>
        <Ionicons name="document-text" size={20} color="#00BFFF" />
        <Text style={styles.headerButtonText}>New Invoice</Text>
      </TouchableOpacity>
      
      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Ionicons name="cash" size={24} color="#4CAF50" />
          <Text style={styles.summaryAmount}>${calculateTotalRevenue().toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Revenue</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="alert-circle" size={24} color="#F44336" />
          <Text style={styles.summaryAmount}>${calculateOutstanding().toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Outstanding</Text>
        </View>
        <View style={styles.summaryCard}>
          <Ionicons name="trending-up" size={24} color="#00BFFF" />
          <Text style={styles.summaryAmount}>${(calculateTotalRevenue() - calculateTotalExpenses()).toFixed(2)}</Text>
          <Text style={styles.summaryLabel}>Profit</Text>
        </View>
      </View>

      {/* Accounts List */}
      {customers.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="card-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No accounts to display</Text>
          <Text style={styles.emptySubtext}>Add customers to see their billing information</Text>
        </View>
      ) : (
        customers.map((customer) => (
          <View key={customer.id} style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{customer.name}</Text>
                <Text style={styles.accountAddress}>{customer.address}</Text>
              </View>
              <View style={styles.accountStatus}>
                <Ionicons
                  name={getStatusIcon(customer.billingStatus || 'unpaid').name}
                  size={20}
                  color={getStatusIcon(customer.billingStatus || 'unpaid').color}
                />
                <Text style={styles.statusText}>
                  {getStatusText(customer.billingStatus || 'unpaid')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.markPaidButton}
              onPress={() => {
                if (customer.billingStatus !== 'paid') {
                  Alert.alert(
                    'Mark as Paid',
                    `Are you sure you want to mark invoice for ${customer.name} as paid?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Mark as Paid', style: 'destructive', onPress: () => navigation.navigate('MarkInvoicePaid', { customerId: customer.id, amount: 0 }) },
                    ]
                  );
                }
              }}
              disabled={customer.billingStatus === 'paid'}
            >
              <Ionicons name="checkmark-done" size={18} color={customer.billingStatus === 'paid' ? '#ccc' : '#4CAF50'} />
              <Text style={[styles.markPaidButtonText, customer.billingStatus === 'paid' && { color: '#ccc' }]}>Mark as Paid</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  const renderReceiptsTab = () => (
    <View>
      {receipts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No receipts to display</Text>
          <Text style={styles.emptySubtext}>Receipts will appear here when invoices are marked as paid</Text>
        </View>
      ) : (
        receipts.map((receipt) => (
          <View key={receipt.id} style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptAmount}>${receipt.amountPaid.toFixed(2)}</Text>
              <Text style={styles.receiptDate}>{formatDate(receipt.timestamp)}</Text>
            </View>
            <Text style={styles.receiptInvoice}>Invoice: {receipt.invoiceId}</Text>
          </View>
        ))
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
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Expenses</Text>
        {expenses.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No expenses to display</Text>
            <Text style={styles.emptySubtext}>Add expenses to track your business costs</Text>
          </View>
        ) : (
          expenses.map((expense) => (
            <View key={expense.id} style={styles.expenseCard}>
              <View style={styles.expenseHeader}>
                <Text style={styles.expenseTitle}>{expense.title}</Text>
                <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
              </View>
              <Text style={styles.expenseDetails}>{expense.details}</Text>
              <Text style={styles.expenseStore}>{expense.supplyStore}</Text>
            </View>
          ))
        )}
      </View>
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