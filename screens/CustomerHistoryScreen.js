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
  const [completedPoolVisits, setCompletedPoolVisits] = useState([]);
  const [completedTodos, setCompletedTodos] = useState([]);
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

        // Fetch completed pool visits
        const poolVisitsQuery = query(
          collection(db, 'poolVisits'),
          where('customerId', '==', customerId),
          where('completed', '==', true),
          orderBy('completedAt', 'desc')
        );
        const poolVisitsSnapshot = await getDocs(poolVisitsQuery);
        const poolVisits = poolVisitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCompletedPoolVisits(poolVisits);

        // Fetch completed todos
        const todosQuery = query(
          collection(db, 'todos'),
          where('customerId', '==', customerId),
          where('status', '==', 'completed'),
          orderBy('completedAt', 'desc')
        );
        const todosSnapshot = await getDocs(todosQuery);
        const todos = todosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCompletedTodos(todos);

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
    if (!date) return 'Unknown date';
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
      // Fetch completed pool visits
      const poolVisitsQuery = query(
        collection(db, 'poolVisits'),
        where('customerId', '==', customerId),
        where('completed', '==', true),
        orderBy('completedAt', 'desc')
      );
      const poolVisitsSnapshot = await getDocs(poolVisitsQuery);
      const poolVisits = poolVisitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCompletedPoolVisits(poolVisits);
    } catch (error) {
      console.error('Error refreshing pool visits:', error);
    }
  };

  const handleSaveTodo = async () => {
    // Refresh the data after saving
    try {
      // Fetch completed todos
      const todosQuery = query(
        collection(db, 'todos'),
        where('customerId', '==', customerId),
        where('status', '==', 'completed'),
        orderBy('completedAt', 'desc')
      );
      const todosSnapshot = await getDocs(todosQuery);
      const todos = todosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCompletedTodos(todos);
    } catch (error) {
      console.error('Error refreshing todos:', error);
    }
  };

  const renderPoolVisit = (visit) => (
    <View key={visit.id} style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <Ionicons name="water" size={20} color="#00BFFF" />
        <Text style={styles.historyTitle}>Pool Visit</Text>
        <Text style={styles.historyDate}>{formatDate(visit.completedAt)}</Text>
      </View>
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => handleEditPoolVisit(visit)}
      >
        <Text style={styles.editButtonText}>Edit</Text>
      </TouchableOpacity>
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
        <Ionicons name="list" size={20} color="#FFA500" />
        <Text style={styles.historyTitle}>To-Do Item</Text>
        <Text style={styles.historyDate}>{formatDate(todo.completedAt)}</Text>
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

  const allHistory = [...completedPoolVisits, ...completedTodos].sort((a, b) => {
    const dateA = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt);
    const dateB = b.completedAt?.toDate ? b.completedAt.toDate() : new Date(b.completedAt);
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
        <Text style={styles.title}>Customer History</Text>
        {customer && (
          <Text style={styles.customerName}>{customer.name}</Text>
        )}

        {allHistory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="time-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No completed tasks yet</Text>
            <Text style={styles.emptySubtext}>Completed pool visits and to-do items will appear here</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginLeft: 8,
    flex: 1,
  },
  historyDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
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
});

export default CustomerHistoryScreen; 