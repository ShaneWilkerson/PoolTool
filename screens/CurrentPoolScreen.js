import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPoolVisitsForDate, markPoolVisitCompleted, getCustomersForAccount } from '../src/firestoreLogic';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const CurrentPoolScreen = () => {
  const [poolVisits, setPoolVisits] = useState([]);
  const [customers, setCustomers] = useState([]);
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

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Unknown Customer';
  };

  const handleCompletePoolVisit = async (poolVisit) => {
    Alert.alert(
      'Complete Pool Visit',
      `Are you sure you completed this pool visit for ${getCustomerName(poolVisit.customerId)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Complete',
          style: 'default',
          onPress: async () => {
            try {
              await markPoolVisitCompleted(poolVisit.id);
              setPoolVisits(prev => prev.filter(visit => visit.id !== poolVisit.id));
              Alert.alert('Success', 'Pool visit marked as completed');
            } catch (error) {
              console.error('Error completing pool visit:', error);
              Alert.alert('Error', 'Failed to complete pool visit');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading pool visits...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // After fetching poolVisits, only show the first one by order
  const sortedVisits = [...poolVisits].sort((a, b) => (a.order || 0) - (b.order || 0));
  const firstVisit = sortedVisits[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Current Pool</Text>
        {(!firstVisit) ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="water-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No pool visits scheduled for today</Text>
            <Text style={styles.emptySubtext}>Create pool visits to see your tasks</Text>
          </View>
        ) : (
          <View style={styles.visitsContainer}>
            <View key={firstVisit.id} style={styles.visitCard}>
              <View style={styles.visitHeader}>
                <View style={styles.visitInfo}>
                  <Text style={styles.visitNumber}>#1</Text>
                  <Text style={styles.customerName}>{getCustomerName(firstVisit.customerId)}</Text>
                  <Text style={styles.visitTime}>
                    {new Date(firstVisit.scheduledDate).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.markCompleteButton}
                  onPress={() => handleCompletePoolVisit(firstVisit)}
                >
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                  <Text style={styles.markCompleteButtonText}>Mark Complete</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.tasksContainer}>
                <Text style={styles.tasksTitle}>Tasks:</Text>
                {firstVisit.tasks.map((task, taskIndex) => (
                  <View key={taskIndex} style={styles.taskItem}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
                    <Text style={styles.taskText}>{task}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
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
  visitsContainer: {
    gap: 16,
  },
  visitCard: {
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
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  visitInfo: {
    flex: 1,
  },
  visitNumber: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  visitTime: {
    fontSize: 14,
    color: '#666',
  },
  markCompleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00BFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  markCompleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  tasksContainer: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  tasksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
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
});

export default CurrentPoolScreen; 