import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import EditPoolVisitModal from '../src/EditPoolVisitModal';
import EditTodoModal from '../src/EditTodoModal';

const CustomerHistoryScreen = ({ navigation, route }) => {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState(null);
  const [poolVisits, setPoolVisits] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditPoolVisitModal, setShowEditPoolVisitModal] = useState(false);
  const [showEditTodoModal, setShowEditTodoModal] = useState(false);
  const [selectedPoolVisit, setSelectedPoolVisit] = useState(null);
  const [selectedTodo, setSelectedTodo] = useState(null);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch customer details
        const customerDoc = await getDoc(doc(db, 'customers', customerId));
        if (customerDoc.exists()) {
          setCustomer({ id: customerDoc.id, ...customerDoc.data() });
        } else {
          Alert.alert('Error', 'Customer not found');
          navigation.goBack();
          return;
        }

        // Fetch all pool visits (including recurring and upcoming)
        let poolVisits = [];
        try {
          const poolVisitsQuery = query(
            collection(db, 'poolVisits'),
            where('customerId', '==', customerId)
          );
          const poolVisitsSnapshot = await getDocs(poolVisitsQuery);
          poolVisits = poolVisitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Debug: Log a few pool visits to see their structure
          if (poolVisits.length > 0) {
            console.log('Sample pool visit data:', {
              id: poolVisits[0].id,
              date: poolVisits[0].date,
              completed: poolVisits[0].completed,
              completedAt: poolVisits[0].completedAt,
              isRecurring: poolVisits[0].isRecurring
            });
          }
        } catch (error) {
          console.warn('Error fetching pool visits:', error);
          // Fallback: try without any filters
          try {
            const allPoolVisitsSnapshot = await getDocs(collection(db, 'poolVisits'));
            poolVisits = allPoolVisitsSnapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() }))
              .filter(visit => visit.customerId === customerId);
          } catch (fallbackError) {
            console.error('Fallback query also failed:', fallbackError);
          }
        }
        setPoolVisits(poolVisits);

        // Fetch all todos (including pending ones)
        let todos = [];
        try {
          const todosQuery = query(
            collection(db, 'todos'),
            where('customerId', '==', customerId)
          );
          const todosSnapshot = await getDocs(todosQuery);
          todos = todosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Debug: Log a few todos to see their structure
          if (todos.length > 0) {
            console.log('Sample todo data:', {
              id: todos[0].id,
              dueDate: todos[0].dueDate,
              status: todos[0].status,
              completedAt: todos[0].completedAt
            });
          }
        } catch (error) {
          console.warn('Error fetching todos:', error);
          // Fallback: try without any filters
          try {
            const allTodosSnapshot = await getDocs(collection(db, 'todos'));
            todos = allTodosSnapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() }))
              .filter(todo => todo.customerId === customerId);
          } catch (fallbackError) {
            console.error('Fallback query also failed:', fallbackError);
          }
        }
        setTodos(todos);

      } catch (error) {
        console.error('Error fetching customer history:', error);
        Alert.alert('Error', 'Failed to load customer history');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [customerId, navigation]);

  const formatDate = (date) => {
    if (!date) return 'No date set';
    
    try {
      let dateObj;
      if (date.toDate) {
        // Firestore timestamp
        dateObj = date.toDate();
      } else if (date instanceof Date) {
        // Already a Date object
        dateObj = date;
      } else if (typeof date === 'string' || typeof date === 'number') {
        // String or timestamp number
        dateObj = new Date(date);
      } else {
        console.warn('Unknown date format:', date, typeof date);
        return 'Invalid date';
      }
      
      // Check if the date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date value:', date);
        return 'Invalid date';
      }
      
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      console.error('Error formatting date:', error, 'Date value:', date);
      return 'Date error';
    }
  };

  const handleEditPoolVisit = (visit) => {
    setSelectedPoolVisit(visit);
    setShowEditPoolVisitModal(true);
  };

  const handleEditTodo = (todo) => {
    setSelectedTodo(todo);
    setShowEditTodoModal(true);
  };

  const handleSavePoolVisit = async () => {
    // Refresh the data after saving
    try {
      // Fetch all pool visits (including recurring and upcoming)
      let poolVisits = [];
      try {
        const poolVisitsQuery = query(
          collection(db, 'poolVisits'),
          where('customerId', '==', customerId)
        );
        const poolVisitsSnapshot = await getDocs(poolVisitsQuery);
        poolVisits = poolVisitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.warn('Error refreshing pool visits:', error);
        // Fallback: try without any filters
        try {
          const allPoolVisitsSnapshot = await getDocs(collection(db, 'poolVisits'));
          poolVisits = allPoolVisitsSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(visit => visit.customerId === customerId);
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
        }
      }
      setPoolVisits(poolVisits);
    } catch (error) {
      console.error('Error refreshing pool visits:', error);
    }
  };

  const handleSaveTodo = async () => {
    // Refresh the data after saving
    try {
      // Fetch all todos (including pending ones)
      let todos = [];
      try {
        const todosQuery = query(
          collection(db, 'todos'),
          where('customerId', '==', customerId)
        );
        const todosSnapshot = await getDocs(todosQuery);
        todos = todosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.warn('Error refreshing todos:', error);
        // Fallback: try without any filters
        try {
          const allTodosSnapshot = await getDocs(collection(db, 'todos'));
          todos = allTodosSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(todo => todo.customerId === customerId);
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
        }
      }
      setTodos(todos);
    } catch (error) {
      console.error('Error refreshing todos:', error);
    }
  };

  const renderPoolVisit = (visit) => (
    <View key={visit.id} style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <View style={styles.titleSection}>
          <Ionicons name="water" size={20} color="#2196F3" />
          <Text style={styles.historyTitle}>Pool Visit</Text>
        </View>
        <View style={styles.dateSection}>
          <Text style={styles.historyDate}>
            {visit.completed && visit.completedAt 
              ? formatDate(visit.completedAt) 
              : formatDate(visit.date)
            }
          </Text>
          {visit.completed ? (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Completed</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusBadgeUpcoming]}>
              <Text style={[styles.statusText, styles.statusTextUpcoming]}>Upcoming</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => handleEditPoolVisit(visit)}
      >
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>
      {/* Show recurring indicator if it's a recurring visit */}
      {visit.isRecurring && (
        <View style={styles.recurringIndicator}>
          <Ionicons name="repeat" size={16} color="#FF6B35" />
          <Text style={styles.recurringText}>
            {visit.recurrenceFrequency === 'Once a week' ? 'Every week' : 
             visit.recurrenceFrequency === 'Every 2 weeks' ? 'Every 2 weeks' : 
             visit.recurrenceFrequency === 'Every month' ? 'Every month' : 'Recurring'}
          </Text>
        </View>
      )}
      <View style={styles.tasksContainer}>
        {visit.tasks && visit.tasks.map((task, index) => (
          <View key={index} style={styles.taskItem}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={styles.taskText}>{task}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderTodo = (todo) => (
    <View key={todo.id} style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <View style={styles.titleSection}>
          <Ionicons name="list" size={20} color="#FFA500" />
          <Text style={styles.historyTitle}>To-Do Item</Text>
        </View>
        <View style={styles.dateSection}>
          <Text style={styles.historyDate}>
            {todo.status === 'completed' && todo.completedAt 
              ? formatDate(todo.completedAt) 
              : formatDate(todo.dueDate)
            }
          </Text>
          {todo.status === 'completed' ? (
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Completed</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, styles.statusBadgeUpcoming]}>
              <Text style={styles.statusTextUpcoming}>Pending</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => handleEditTodo(todo)}
      >
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>
      <View style={styles.todoContainer}>
        <Text style={styles.todoText}>{todo.description}</Text>
        {todo.items && todo.items.length > 0 && (
          <View style={styles.todoItemsContainer}>
            {todo.items.map((item, index) => (
              <View key={index} style={styles.todoItem}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                <Text style={styles.todoItemText}>{item}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading customer history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const allHistory = [...poolVisits, ...todos].sort((a, b) => {
    // For pool visits, prioritize completedAt if completed, otherwise use date
    // For todos, use dueDate field
    let dateA, dateB;
    
    if (a.tasks) {
      // This is a pool visit
      if (a.completed && a.completedAt) {
        // Use completedAt for completed visits
        dateA = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0);
      } else {
        // Use scheduled date for upcoming visits
        dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
      }
    } else {
      // This is a todo
      if (a.status === 'completed' && a.completedAt) {
        // Use completedAt for completed todos
        dateA = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0);
      } else {
        // Use dueDate for pending todos
        dateA = a.dueDate?.toDate ? a.dueDate.toDate() : new Date(a.dueDate || 0);
      }
    }
    
    if (b.tasks) {
      // This is a pool visit
      if (b.completed && b.completedAt) {
        // Use completedAt for completed visits
        dateB = b.completedAt?.toDate ? b.completedAt.toDate() : new Date(b.completedAt || 0);
      } else {
        // Use scheduled date for upcoming visits
        dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
      }
    } else {
      // This is a todo
      if (b.status === 'completed' && b.completedAt) {
        // Use completedAt for completed todos
        dateB = b.completedAt?.toDate ? b.completedAt.toDate() : new Date(b.completedAt || 0);
      } else {
        // Use dueDate for pending todos
        dateB = b.dueDate?.toDate ? b.dueDate.toDate() : new Date(b.dueDate || 0);
      }
    }
    
    // Sort by most recent first
    return dateB - dateA;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#00BFFF" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Customer History & Schedule</Text>
        {customer && (
          <Text style={styles.customerName}>{customer.name}</Text>
        )}
        <Text style={styles.subtitle}>Showing all pool visits and to-do items</Text>

        {allHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>Pool visits and to-do items will appear here once created</Text>
          </View>
        ) : (
          <View style={styles.historyContainer}>
            {allHistory.map((item) => {
              if (item.tasks) {
                return renderPoolVisit(item);
              } else {
                return renderTodo(item);
              }
            })}
          </View>
        )}
      </ScrollView>

      {/* Edit Modals */}
      <EditPoolVisitModal
        visible={showEditPoolVisitModal}
        poolVisit={selectedPoolVisit}
        onClose={() => {
          setShowEditPoolVisitModal(false);
          setSelectedPoolVisit(null);
        }}
        onSave={handleSavePoolVisit}
      />

      <EditTodoModal
        visible={showEditTodoModal}
        todo={selectedTodo}
        onClose={() => {
          setShowEditTodoModal(false);
          setSelectedTodo(null);
        }}
        onSave={handleSaveTodo}
      />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButtonText: {
    fontSize: 18,
    color: '#00BFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#999',
    marginTop: 8,
    fontSize: 14,
  },
  historyContainer: {
    gap: 16,
  },
  historyItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  historyHeader: {
    flexDirection: 'column',
    marginBottom: 12,
    gap: 8,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  statusBadge: {
    backgroundColor: '#e0f2f7',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00BFFF',
  },
  statusBadgeUpcoming: {
    backgroundColor: '#fdf6e6',
  },
  statusTextUpcoming: {
    color: '#FFA500',
  },
  tasksContainer: {
    gap: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginLeft: 8,
  },
  todoContainer: {
    gap: 8,
  },
  todoText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  todoItemsContainer: {
    marginLeft: 8,
    gap: 4,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todoItemText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  editButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 12,
  },
  editButtonText: {
    color: '#00BFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  recurringIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  recurringText: {
    fontSize: 14,
    color: '#FF6B35',
    marginLeft: 6,
  },
});

export default CustomerHistoryScreen; 