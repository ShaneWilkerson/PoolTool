import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCustomersForAccount, updatePoolVisitOrder, updateTodoOrder, markTodoCompleted } from '../src/firestoreLogic';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const HomeScreen = ({ navigation }) => {
  const [customers, setCustomers] = useState([]);
  const [poolVisits, setPoolVisits] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPoolVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'todos'),
        where('accountId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      ),
      (snapshot) => {
        setTodos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );
    return unsubscribe;
  }, []);

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown Customer';
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
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>User</Text>
          </View>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Customer Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 16 }}>
          <TouchableOpacity style={[styles.actionButton, { flex: 1 }]} onPress={() => navigation.navigate('AddCustomer')}>
            <Ionicons name="person-add" size={20} color="#00BFFF" />
            <Text style={styles.actionButtonText}>Add Customer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { flex: 1 }]} onPress={() => navigation.navigate('CustomerList')}>
            <Ionicons name="people" size={20} color="#00BFFF" />
            <Text style={styles.actionButtonText}>View Customers</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 8 }}>
          <TouchableOpacity style={[styles.actionButton, { flex: 1 }]} onPress={() => navigation.navigate('CreatePoolVisit')}>
            <Ionicons name="water" size={20} color="#00BFFF" />
            <Text style={styles.actionButtonText}>Create Pool Visit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { flex: 1 }]} onPress={() => navigation.navigate('AddToDo')}>
            <Ionicons name="add-circle" size={20} color="#00BFFF" />
            <Text style={styles.actionButtonText}>Add to To-do List</Text>
          </TouchableOpacity>
        </View>

        {/* Header with today's date */}
        <View style={styles.header}>
          <Text style={styles.dateText}>{dateString}</Text>
          <Text style={styles.welcomeText}>Welcome to PoolTracker!</Text>
        </View>

        {/* Today's Tasks Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          {poolVisits.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="water-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No pool visits scheduled for today</Text>
              <Text style={styles.emptySubtext}>Create pool visits to see your tasks</Text>
            </View>
          ) : (
            <View style={styles.tasksContainer}>
              {poolVisits
                .slice() // copy
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((visit, index, arr) => (
                  <View key={visit.id} style={styles.taskCard}>
                    <View style={styles.taskHeader}>
                      <Text style={styles.taskNumber}>#{index + 1}</Text>
                      <Text style={styles.customerName}>{getCustomerName(visit.customerId)}</Text>
                      <View style={{ flex: 1 }} />
                      {/* Up Arrow */}
                      <TouchableOpacity
                        style={styles.arrowButton}
                        disabled={index === 0}
                        onPress={async () => {
                          if (index === 0) return;
                          const newArr = arr.slice();
                          [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
                          setPoolVisits(newArr);
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
                          setPoolVisits(newArr);
                          await Promise.all(
                            newArr.map((v, idx) => updatePoolVisitOrder(v.id, idx + 1))
                          );
                        }}
                      >
                        <Ionicons name="arrow-down" size={20} color={index === arr.length - 1 ? '#ccc' : '#00BFFF'} />
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
                      <Text style={styles.customerName}>{getCustomerName(todo.customerId)}</Text>
                      <View style={{ flex: 1 }} />
                      {/* Up Arrow */}
                      <TouchableOpacity
                        style={styles.arrowButton}
                        disabled={index === 0}
                        onPress={async () => {
                          if (index === 0) return;
                          const newArr = arr.slice();
                          [newArr[index - 1], newArr[index]] = [newArr[index], newArr[index - 1]];
                          setTodos(newArr);
                          await Promise.all(
                            newArr.map((v, idx) => updateTodoOrder(v.id, idx + 1))
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
                          setTodos(newArr);
                          await Promise.all(
                            newArr.map((v, idx) => updateTodoOrder(v.id, idx + 1))
                          );
                        }}
                      >
                        <Ionicons name="arrow-down" size={20} color={index === arr.length - 1 ? '#ccc' : '#00BFFF'} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => navigation.navigate('CustomerDetail', { customerId: todo.customerId })}
                      >
                        <Ionicons name="eye" size={16} color="#00BFFF" />
                        <Text style={styles.viewButtonText}>View</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={async () => {
                          await markTodoCompleted(todo.id);
                        }}
                      >
                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                        <Text style={[styles.viewButtonText, { color: '#4CAF50' }]}>Mark Complete</Text>
                      </TouchableOpacity>
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
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="time" size={32} color="#FFA500" />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>To-Do</Text>
          </View>
        </View>
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
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00BFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 10,
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
});

export default HomeScreen; 