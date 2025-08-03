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
import { getPoolVisitsForDate, getCustomersForAccount, markTodoCompleted, markPoolVisitCompleted } from '../src/firestoreLogic';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import EditPoolVisitModal from '../src/EditPoolVisitModal';
import EditTodoModal from '../src/EditTodoModal';

const ScheduleScreen = ({ navigation }) => {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [poolVisits, setPoolVisits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [todos, setTodos] = useState([]);
  const [expandedVisits, setExpandedVisits] = useState({});
  const [expandedTodos, setExpandedTodos] = useState({});
  const [showEditPoolVisitModal, setShowEditPoolVisitModal] = useState(false);
  const [showEditTodoModal, setShowEditTodoModal] = useState(false);
  const [selectedPoolVisit, setSelectedPoolVisit] = useState(null);
  const [selectedTodo, setSelectedTodo] = useState(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const customersData = await getCustomersForAccount(auth.currentUser.uid);
        setCustomers(customersData);
      } catch (error) {
        console.error('Error fetching customers:', error);
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Listen for pool visits for the current week
    const weekDates = getWeekDates(selectedWeek);
    const start = new Date(weekDates[0]);
    start.setHours(0, 0, 0, 0);
    const end = new Date(weekDates[6]);
    end.setHours(23, 59, 59, 999);
    const q = query(
      collection(db, 'poolVisits'),
      where('accountId', '==', auth.currentUser.uid),
      where('scheduledDate', '>=', start),
      where('scheduledDate', '<=', end)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allVisits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPoolVisits(allVisits);
      setLoading(false);
    });
    return unsubscribe;
  }, [selectedWeek]);

  useEffect(() => {
    // Listen for todos for the current week
    const weekDates = getWeekDates(selectedWeek);
    const start = new Date(weekDates[0]);
    start.setHours(0, 0, 0, 0);
    const end = new Date(weekDates[6]);
    end.setHours(23, 59, 59, 999);
    const q = query(
      collection(db, 'todos'),
      where('accountId', '==', auth.currentUser.uid),
      where('date', '>=', start),
      where('date', '<=', end)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTodos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [selectedWeek]);

  const getCurrentWeek = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    return startOfWeek;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getWeekDates = (weekOffset) => {
    const startDate = getCurrentWeek();
    startDate.setDate(startDate.getDate() + (weekOffset * 7));
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      weekDates.push(date);
    }
    return weekDates;
  };

  const currentWeekDates = getWeekDates(selectedWeek);

  const navigateWeek = (direction) => {
    setSelectedWeek(selectedWeek + direction);
  };

  const isToday = (dateString) => {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  };

  const getCustomerName = (visit) => {
    // If the visit has the customer name stored, use it
    if (visit.customerName) {
      return visit.customerName;
    }
    // Fall back to looking up the customer by ID
    const customer = customers.find(c => c.id === visit.customerId);
    return customer ? customer.name : 'Unknown Customer';
  };

  const getVisitsForDate = (date) => {
    return poolVisits.filter(visit => {
      let visitDate;
      if (visit.scheduledDate && typeof visit.scheduledDate.toDate === 'function') {
        visitDate = visit.scheduledDate.toDate();
      } else {
        visitDate = new Date(visit.scheduledDate);
      }
      return visitDate.toDateString() === date.toDateString();
    });
  };

  const getTodosForDay = (date) => {
    return todos.filter(todo => {
      let todoDate;
      if (todo.date && typeof todo.date.toDate === 'function') {
        todoDate = todo.date.toDate();
      } else {
        todoDate = new Date(todo.date);
      }
      return todoDate.toDateString() === date.toDateString();
    });
  };

  const toggleExpandVisit = (id) => {
    setExpandedVisits(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpandTodo = (id) => {
    setExpandedTodos(prev => ({ ...prev, [id]: !prev[id] }));
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
      const weekDates = getWeekDates(selectedWeek);
      const start = new Date(weekDates[0]);
      start.setHours(0, 0, 0, 0);
      const end = new Date(weekDates[6]);
      end.setHours(23, 59, 59, 999);
      const q = query(
        collection(db, 'poolVisits'),
        where('accountId', '==', auth.currentUser.uid),
        where('scheduledDate', '>=', start),
        where('scheduledDate', '<=', end)
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
      const weekDates = getWeekDates(selectedWeek);
      const start = new Date(weekDates[0]);
      start.setHours(0, 0, 0, 0);
      const end = new Date(weekDates[6]);
      end.setHours(23, 59, 59, 999);
      const q = query(
        collection(db, 'todos'),
        where('accountId', '==', auth.currentUser.uid),
        where('date', '>=', start),
        where('date', '<=', end)
      );
      const snapshot = await getDocs(q);
      setTodos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error refreshing todos:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Schedule</Text>

        {/* Week Navigation */}
        <View style={styles.weekNavigation}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateWeek(-1)}
          >
            <Ionicons name="chevron-back" size={24} color="#00BFFF" />
          </TouchableOpacity>
          
          <Text style={styles.weekTitle}>
            Week of {formatDate(currentWeekDates[0])}
          </Text>
          
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigateWeek(1)}
          >
            <Ionicons name="chevron-forward" size={24} color="#00BFFF" />
          </TouchableOpacity>
        </View>

        {/* Weekly Schedule */}
        <View style={styles.scheduleContainer}>
          {currentWeekDates.map((date, index) => {
            const dayVisits = getVisitsForDate(date);
            const dayTodos = getTodosForDay(date);
            const isTodayDate = isToday(date.toISOString().split('T')[0]);
            
            return (
              <View key={index} style={[styles.dayCard, isTodayDate && styles.todayCard]}>
                <View style={styles.dayHeader}>
                  <Text style={[styles.dayName, isTodayDate && styles.todayText]}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.dayDate, isTodayDate && styles.todayText]}>
                    {date.getDate()}
                  </Text>
                </View>
                
                <View style={styles.visitsContainer}>
                  {dayVisits.length === 0 && dayTodos.length === 0 ? (
                    <Text style={styles.noVisitsText}>No visits</Text>
                  ) : (
                    <>
                      {dayVisits.map((visit, visitIndex) => (
                        <View key={visit.id} style={{ flexDirection: 'column', width: '100%' }}>
                          <View style={[styles.visitItem, visit.completed && styles.completedItem]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons 
                                name="water" 
                                size={18} 
                                color="#00BFFF" 
                                style={{ marginRight: 8 }} 
                              />
                              <TouchableOpacity onPress={() => toggleExpandVisit(visit.id)}>
                                <Ionicons name={expandedVisits[visit.id] ? 'chevron-up' : 'chevron-down'} size={18} color="#666" style={{ marginRight: 8 }} />
                              </TouchableOpacity>
                              <Text style={[styles.customerName, { flex: 1 }]}>
                                {getCustomerName(visit)}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.taskCount}>
                                  {visit.tasks.length} task{visit.tasks.length !== 1 ? 's' : ''}
                                </Text>
                                {!visit.completed && (
                                  <TouchableOpacity
                                    style={{ marginLeft: 8 }}
                                    onPress={() => {
                                      Alert.alert(
                                        'Mark Complete',
                                        'Are you sure you want to mark this pool visit as complete?',
                                        [
                                          { text: 'Cancel', style: 'cancel' },
                                          { text: 'Yes', style: 'default', onPress: async () => { await markPoolVisitCompleted(visit.id); } }
                                        ]
                                      );
                                    }}
                                  >
                                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                                  </TouchableOpacity>
                                )}
                                {visit.completed && (
                                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" style={{ marginLeft: 8 }} />
                                )}
                              </View>
                            </View>
                          </View>
                          {expandedVisits[visit.id] && (
                            <View style={{ alignSelf: 'stretch', paddingLeft: 34, paddingRight: 16, paddingTop: 4 }}>
                              {visit.tasks.map((task, idx) => (
                                <Text key={idx} style={styles.taskText}>{task}</Text>
                              ))}
                              <View style={styles.buttonRow}>
                                <TouchableOpacity
                                  style={styles.editButton}
                                  onPress={() => handleEditPoolVisit(visit)}
                                >
                                  <Ionicons name="create" size={16} color="#00BFFF" />
                                  <Text style={styles.editButtonText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.historyButton}
                                  onPress={() => navigation.navigate('CustomerHistory', { customerId: visit.customerId })}
                                >
                                  <Ionicons name="time" size={16} color="#00BFFF" />
                                  <Text style={styles.historyButtonText}>Pool History</Text>
                                  <Ionicons name="chevron-forward" size={14} color="#00BFFF" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      ))}
                      {dayTodos.map((todo, todoIndex) => (
                        <View key={todo.id} style={{ flexDirection: 'column', width: '100%' }}>
                          <View style={[styles.visitItem, todo.status === 'completed' && styles.completedItem]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Ionicons 
                                name="alert-circle-outline" 
                                size={18} 
                                color="#FFA500" 
                                style={{ marginRight: 8 }} 
                              />
                              <TouchableOpacity onPress={() => toggleExpandTodo(todo.id)}>
                                <Ionicons name={expandedTodos[todo.id] ? 'chevron-up' : 'chevron-down'} size={18} color="#666" style={{ marginRight: 8 }} />
                              </TouchableOpacity>
                              <Text style={[styles.customerName, { flex: 1 }]}>
                                {getCustomerName(todo)}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.taskCount}>
                                  {todo.items && todo.items.length} to do item{todo.items && todo.items.length !== 1 ? 's' : ''}
                                </Text>
                                {todo.status !== 'completed' && (
                                  <TouchableOpacity
                                    style={{ marginLeft: 8 }}
                                    onPress={() => {
                                      Alert.alert(
                                        'Mark Complete',
                                        'Are you sure you want to mark this to-do item as complete?',
                                        [
                                          { text: 'Cancel', style: 'cancel' },
                                          { text: 'Yes', style: 'default', onPress: async () => { await markTodoCompleted(todo.id); } }
                                        ]
                                      );
                                    }}
                                  >
                                    <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                                  </TouchableOpacity>
                                )}
                                {todo.status === 'completed' && (
                                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" style={{ marginLeft: 8 }} />
                                )}
                              </View>
                            </View>
                          </View>
                          {expandedTodos[todo.id] && todo.items && (
                            <View style={{ alignSelf: 'stretch', paddingLeft: 34, paddingRight: 16, paddingTop: 4 }}>
                              {todo.items.map((item, idx) => (
                                <Text key={idx} style={styles.taskText}>{item}</Text>
                              ))}
                              <View style={styles.buttonRow}>
                                <TouchableOpacity
                                  style={styles.editButton}
                                  onPress={() => handleEditTodo(todo)}
                                >
                                  <Ionicons name="create" size={16} color="#00BFFF" />
                                  <Text style={styles.editButtonText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={styles.historyButton}
                                  onPress={() => navigation.navigate('CustomerHistory', { customerId: todo.customerId })}
                                >
                                  <Ionicons name="time" size={16} color="#00BFFF" />
                                  <Text style={styles.historyButtonText}>Pool History</Text>
                                  <Ionicons name="chevron-forward" size={14} color="#00BFFF" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}
                        </View>
                      ))}
                    </>
                  )}
                </View>
              </View>
            );
          })}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#00BFFF',
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
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
  navButton: {
    padding: 8,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  scheduleContainer: {
    gap: 12,
  },
  dayCard: {
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
  todayCard: {
    borderColor: '#00BFFF',
    borderWidth: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dayName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  dayDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  todayText: {
    color: '#00BFFF',
  },
  visitsContainer: {
    gap: 8,
  },
  noVisitsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  visitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  visitTime: {
    marginRight: 12,
  },
  timeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00BFFF',
  },
  visitInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  taskCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  taskText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 4,
  },
  completedItem: {
    opacity: 0.7,
    backgroundColor: '#e8f5e9', // Light green background for completed items
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#e0f7fa', // Light blue background
    borderRadius: 8,
    flex: 1,
    height: 40,
  },
  historyButtonText: {
    fontSize: 14,
    color: '#00BFFF',
    marginLeft: 8,
    marginRight: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#e0f7fa',
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    height: 40,
  },
  editButtonText: {
    fontSize: 14,
    color: '#00BFFF',
    marginLeft: 4,
  },
});

export default ScheduleScreen; 