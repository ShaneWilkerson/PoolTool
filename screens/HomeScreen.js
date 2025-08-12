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
import { getPoolVisitsForDate, getCustomersForAccount, markTodoCompleted, markPoolVisitCompleted, updatePoolVisitOrder, checkAndGenerateRecurringVisits } from '../src/firestoreLogic';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import EditPoolVisitModal from '../src/EditPoolVisitModal';
import EditTodoModal from '../src/EditTodoModal';

const HomeScreen = ({ navigation }) => {
  const [poolVisits, setPoolVisits] = useState([]);
  const [todos, setTodos] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedToday, setCompletedToday] = useState(0);
  const [todosThisWeek, setTodosThisWeek] = useState(0);
  const [showEditPoolVisitModal, setShowEditPoolVisitModal] = useState(false);
  const [showEditTodoModal, setShowEditTodoModal] = useState(false);
  const [selectedPoolVisit, setSelectedPoolVisit] = useState(null);
  const [selectedTodo, setSelectedTodo] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        if (!auth || !auth.currentUser) {
          console.warn('User not authenticated');
          setLoading(false);
          return;
        }
        const customersData = await getCustomersForAccount(auth.currentUser.uid);
        setCustomers(customersData);
      } catch (error) {
        console.error('Error fetching customers:', error);
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  // Fetch pool visits for today (including recurring ones)
  useEffect(() => {
    if (!auth || !auth.currentUser || !db) {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Fetch all pool visits for today (both regular and recurring)
    const q = query(
      collection(db, 'poolVisits'),
      where('accountId', '==', auth.currentUser.uid),
      where('completed', '==', false),
      where('scheduledDate', '>=', today),
      where('scheduledDate', '<', tomorrow)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allVisits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPoolVisits(allVisits);
      setLoading(false);
      
      // Check and generate recurring visits when the app starts
      checkAndGenerateRecurringVisits();
    }, (error) => {
      console.error('Error fetching pool visits:', error);
      setLoading(false);
    });
    
    return unsubscribe;
  }, [auth, db]);

  useEffect(() => {
    if (!auth || !auth.currentUser || !db) {
      console.warn('Firebase not available or user not authenticated');
      return;
    }

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'todos'),
        where('accountId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      ),
      (snapshot) => {
        setTodos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        console.error('Error fetching todos:', error);
      }
    );
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!auth || !auth.currentUser || !db) {
      console.warn('Firebase not available or user not authenticated');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const q = query(
      collection(db, 'poolVisits'),
      where('accountId', '==', auth.currentUser.uid),
      where('scheduledDate', '>=', today),
      where('scheduledDate', '<', tomorrow),
      where('completed', '==', true)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCompletedToday(snapshot.size);
    }, (error) => {
      console.error('Error fetching completed visits:', error);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!auth || !auth.currentUser || !db) {
      console.warn('Firebase not available or user not authenticated');
      return;
    }

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);
    const q = query(
      collection(db, 'todos'),
      where('accountId', '==', auth.currentUser.uid),
      where('dueDate', '>=', startOfWeek),
      where('dueDate', '<', endOfWeek),
      where('status', '==', 'pending')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTodosThisWeek(snapshot.size);
    }, (error) => {
      console.error('Error fetching weekly todos:', error);
    });
    return unsubscribe;
  }, []);

  const getCustomerName = (visit) => {
    // If the visit has the customer name stored, use it
    if (visit.customerName) {
      return visit.customerName;
    }
    // Fall back to looking up the customer by ID
    const customer = customers.find(c => c.id === visit.customerId);
    return customer ? customer.name : 'Unknown Customer';
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      const q = query(
        collection(db, 'poolVisits'),
        where('accountId', '==', auth.currentUser.uid),
        where('scheduledDate', '>=', today),
        where('scheduledDate', '<', tomorrow),
        where('completed', '==', false)
      );
      const snapshot = await getDocs(q);
      const allVisits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPoolVisits(allVisits);
    } catch (error) {
      console.error('Error refreshing pool visits:', error);
    }
  };

  const handleSaveTodo = async () => {
    // Refresh the data after saving
    try {
      const q = query(
        collection(db, 'todos'),
        where('accountId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);
      setTodos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error refreshing todos:', error);
    }
  };

  // Get today's date
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.profileAvatarIcon}>
            <Ionicons name="person" size={20} color="#00BFFF" />
          </View>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={{ marginTop: 32, marginBottom: 24 }}>
          {/* Create Pool Visit (wide) */}
          <TouchableOpacity style={[styles.menuButton, styles.menuButtonWide]} onPress={() => navigation.navigate('CreatePoolVisit')}>
            <View style={styles.menuButtonContent}>
              <Ionicons name="water" size={22} color="#00BFFF" style={{ marginRight: 8 }} />
              <Text style={styles.menuButtonText}>Create Pool Visit</Text>
            </View>
          </TouchableOpacity>
          {/* Row: Add to To-do List & View Customers */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
            <TouchableOpacity style={[styles.menuButton, { flex: 1, marginRight: 8 }]} onPress={() => navigation.navigate('AddToDo')}>
              <View style={styles.menuButtonContent}>
                <Ionicons name="add-circle" size={22} color="#00BFFF" style={{ marginRight: 8 }} />
                <Text style={styles.menuButtonText}>Add to To-do List</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuButton, { flex: 1, marginLeft: 8 }]} onPress={() => navigation.navigate('CustomerList')}>
              <View style={styles.menuButtonContent}>
                <Ionicons name="people" size={22} color="#00BFFF" style={{ marginRight: 8 }} />
                <Text style={styles.menuButtonText}>View Customers</Text>
              </View>
            </TouchableOpacity>
          </View>
          {/* Row: Add Supply Store & Add Customer */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity style={[styles.menuButton, { flex: 1, marginRight: 8 }]} onPress={() => navigation.navigate('AddSupplyStore')}>
              <View style={styles.menuButtonContent}>
                <Ionicons name="storefront" size={22} color="#00BFFF" style={{ marginRight: 8 }} />
                <Text style={styles.menuButtonText}>Add Supply Store</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuButton, { flex: 1, marginLeft: 8 }]} onPress={() => navigation.navigate('AddCustomer')}>
              <View style={styles.menuButtonContent}>
                <Ionicons name="person-add" size={22} color="#00BFFF" style={{ marginRight: 8 }} />
                <Text style={styles.menuButtonText}>Add Customer</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Header with today's date */}
        <View style={styles.header}>
          <Text style={styles.dateText}>{dateString}</Text>
          {/* Remove the logo/image from the Home screen. Only show the welcome text. */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Text style={styles.welcomeText}>Welcome to ThePoolTool!</Text>
          </View>
        </View>

        {/* Today's Tasks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          {poolVisits.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="water-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No tasks scheduled for today</Text>
              <Text style={styles.emptySubtext}>Create pool visits to see your tasks</Text>
            </View>
          ) : (
            <View style={styles.tasksContainer}>
              {poolVisits
                .slice()
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((visit, index, arr) => (
                  <View key={visit.id} style={styles.taskCard}>
                    <View style={styles.taskHeader}>
                      <Text style={styles.taskNumber}>#{index + 1}</Text>
                      <Text style={styles.customerName}>{getCustomerName(visit)}</Text>
                      <View style={{ flex: 1 }} />
                      {/* Up Arrow */}
                      <TouchableOpacity
                        style={styles.arrowButton}
                        disabled={index === 0}
                        onPress={async () => {
                          if (index === 0) return;
                          const newArr = arr.slice();
                          [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
                          // Update order for all pool visits
                          setPoolVisits(newArr.map((v, idx) => ({ ...v, order: idx + 1 })));
                          await Promise.all(
                            newArr.map((v, idx) => updatePoolVisitOrder(v.id, idx + 1))
                          );
                        }}
                      >
                        <Ionicons name="arrow-up" size={20} color={index === 0 ? '#ccc' : '#00BFFF'} />
                      </TouchableOpacity>
                      {/* Down Arrow */}
                      <TouchableOpacity
                        style={styles.arrowButton}
                        disabled={index === arr.length - 1}
                        onPress={async () => {
                          if (index === arr.length - 1) return;
                          const newArr = arr.slice();
                          [newArr[index], newArr[index + 1]] = [newArr[index + 1], newArr[index]];
                          // Update order for all pool visits
                          setPoolVisits(newArr.map((v, idx) => ({ ...v, order: idx + 1 })));
                          await Promise.all(
                            newArr.map((v, idx) => updatePoolVisitOrder(v.id, idx + 1))
                          );
                        }}
                      >
                        <Ionicons name="arrow-down" size={20} color={index === arr.length - 1 ? '#ccc' : '#00BFFF'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEditPoolVisit(visit)}
                      >
                        <Ionicons name="create" size={16} color="#00BFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => navigation.navigate('CustomerDetail', { customerId: visit.customerId })}
                      >
                        <Ionicons name="eye" size={16} color="#00BFFF" />
                        <Text style={styles.viewButtonText}>View</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.taskList}>
                      {visit.tasks.map((task, taskIndex) => (
                        <View key={taskIndex} style={styles.taskItem}>
                          <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
                          <Text style={styles.taskText}>{task}</Text>
                        </View>
                      ))}
                    </View>
                    {/* Recurring indicator - only show for recurring visits */}
                    {visit.isRecurring && (
                      <View style={styles.recurringIndicator}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="repeat" size={16} color="#00BFFF" />
                          <Text style={styles.recurringText}>
                            {visit.recurrenceFrequency === 'weekly' ? 'Every week' : 
                             visit.recurrenceFrequency === 'biweekly' ? 'Every 2 weeks' : 
                             'Every month'}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
            </View>
          )}
        </View>



        {/* To-do List Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>To-do List</Text>
          {todos.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="time-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No to-do items</Text>
              <Text style={styles.emptySubtext}>Add to-do items to see them here</Text>
            </View>
          ) : (
            <View style={styles.tasksContainer}>
              {todos
                .slice()
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((todo, index, arr) => (
                  <View key={todo.id} style={styles.taskCard}>
                    <View style={styles.taskHeader}>
                      <Text style={styles.taskNumber}>#{index + 1}</Text>
                      <Text style={styles.customerName}>{getCustomerName(todo)}</Text>
                      <View style={{ flex: 1 }} />
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => handleEditTodo(todo)}
                        >
                          <Ionicons name="create" size={16} color="#00BFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.viewButton}
                          onPress={() => navigation.navigate('CustomerDetail', { customerId: todo.customerId })}
                        >
                          <Ionicons name="eye" size={20} color="#00BFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.viewButton, { backgroundColor: '#e6f9f0', marginLeft: 8 }]}
                          onPress={async () => {
                            Alert.alert(
                              'Mark Complete',
                              'Are you sure you want to mark this item as complete?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Yes', style: 'default', onPress: async () => { await markTodoCompleted(todo.id); } }
                              ]
                            );
                          }}
                        >
                          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.taskList}>
                      {todo.items && todo.items.map((item, itemIndex) => (
                        <View key={itemIndex} style={styles.taskItem}>
                          <Ionicons name="alert-circle-outline" size={16} color="#FFA500" />
                          <Text style={styles.taskText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="water" size={32} color="#00BFFF" />
            <Text style={styles.statNumber}>{customers.length}</Text>
            <Text style={styles.statLabel}>Total Pools</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
            <Text style={styles.statNumber}>{completedToday}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={32} color="#FFA500" />
            <Text style={styles.statNumber}>{todos.length}</Text>
            <Text style={styles.statLabel}>To-Do</Text>
          </View>
        </View>
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
  customerActions: {
    flexDirection: 'column',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
  },
  actionButtonText: {
    color: '#00BFFF',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
  },
  header: {
    marginBottom: 24,
  },
  dateText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 16,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
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
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  profileButton: {
    marginRight: 16,
  },
  profileAvatarIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e3f2fd',
  },
  tasksContainer: {
    flexDirection: 'column',
  },
  taskCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginRight: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flexShrink: 1,
    maxWidth: '50%',
  },
  taskTime: {
    fontSize: 14,
    color: '#666',
  },
  taskList: {
    flexDirection: 'column',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  viewButtonText: {
    color: '#00BFFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
  arrowButton: {
    marginHorizontal: 2,
    padding: 4,
  },
  menuButton: { backgroundColor: '#e3f6ff', borderRadius: 12, borderWidth: 2, borderColor: '#00BFFF', paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  menuButtonWide: { width: '100%', marginBottom: 16 },
  menuButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  menuButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00BFFF',
  },
  editButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  recurringIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  recurringText: {
    fontSize: 12,
    color: '#00BFFF',
    marginLeft: 4,
    fontWeight: '500',
  },
});

export default HomeScreen; 