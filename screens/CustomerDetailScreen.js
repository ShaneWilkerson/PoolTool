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
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { softDeleteCustomer } from '../src/firestoreLogic';

const CustomerDetailScreen = ({ navigation, route }) => {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false, // Hide the default header to avoid duplicate back buttons
    });
  }, [navigation]);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const customerDoc = await getDoc(doc(db, 'customers', customerId));
        if (customerDoc.exists()) {
          setCustomer({ id: customerDoc.id, ...customerDoc.data() });
        } else {
          Alert.alert('Error', 'Customer not found');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error fetching customer:', error);
        Alert.alert('Error', 'Failed to load customer details');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [customerId, navigation]);

  const handleDeleteCustomer = async () => {
    Alert.alert(
      'Delete Customer',
      'Are you sure you want to delete this customer? This will archive the customer but keep all invoices and receipts.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await softDeleteCustomer(customer.id);
              Alert.alert('Customer deleted (archived)');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete customer');
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
          <Text style={styles.loadingText}>Loading customer details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!customer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Customer not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Fallback Back Button */}
      <TouchableOpacity
        style={styles.fallbackBackButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#00BFFF" />
        <Text style={styles.fallbackBackText}>Back</Text>
      </TouchableOpacity>
      
      <ScrollView style={styles.scrollView}>
        {/* Customer Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#00BFFF" />
          </View>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerId}>ID: {customer.id}</Text>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color="#666" />
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{customer.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color="#666" />
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{customer.phone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={20} color="#666" />
              <Text style={styles.infoLabel}>Address:</Text>
              <Text style={styles.infoValue}>
                {customer.fullAddress || customer.address || [customer.street, customer.city, customer.state, customer.zip].filter(Boolean).join(', ')}
              </Text>
            </View>
          </View>
        </View>

        {/* Billing Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing Status</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="card" size={20} color="#666" />
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={[styles.infoValue, { color: customer.billingStatus === 'paid' ? '#4CAF50' : '#FFA500' }]}>
                {customer.billingStatus || 'unpaid'}
              </Text>
            </View>
            {customer.dueDate && (
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={20} color="#666" />
                <Text style={styles.infoLabel}>Due Date:</Text>
                <Text style={styles.infoValue}>{new Date(customer.dueDate).toLocaleDateString()}</Text>
              </View>
            )}
            {customer.invoiceId && (
              <View style={styles.infoRow}>
                <Ionicons name="document-text" size={20} color="#666" />
                <Text style={styles.infoLabel}>Invoice ID:</Text>
                <Text style={styles.infoValue}>{customer.invoiceId}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="document-text" size={24} color="#00BFFF" />
              <Text style={styles.actionText}>Create Invoice</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="call" size={24} color="#00BFFF" />
              <Text style={styles.actionText}>Call Customer</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="mail" size={24} color="#00BFFF" />
              <Text style={styles.actionText}>Send Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="navigate" size={24} color="#00BFFF" />
              <Text style={styles.actionText}>Navigate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <TouchableOpacity
        style={{
          backgroundColor: '#FF3B30',
          borderRadius: 12,
          padding: 16,
          alignItems: 'center',
          marginTop: 24,
          marginBottom: 24,
        }}
        onPress={handleDeleteCustomer}
      >
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Delete Customer</Text>
      </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#F44336',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  customerId: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  infoCard: {
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
    marginRight: 8,
    minWidth: 60,
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
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
  actionText: {
    fontSize: 12,
    color: '#00BFFF',
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  backButton: {
    marginLeft: 16,
    padding: 8,
  },
  fallbackBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  fallbackBackText: {
    fontSize: 18,
    color: '#00BFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default CustomerDetailScreen; 