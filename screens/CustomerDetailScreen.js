import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { softDeleteCustomer } from '../src/firestoreLogic';
import BillingStatus from '../src/BillingStatus';

const CustomerDetailScreen = ({ navigation, route }) => {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

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
    
    // Add focus listener to refresh customer data when screen comes into focus
    const unsubscribe = navigation.addListener('focus', fetchCustomer);
    return unsubscribe;
  }, [customerId, navigation]);

  useEffect(() => {
    if (customer) {
      setEditEmail(customer.email || '');
      setEditPhone(customer.phone || '');
    }
  }, [customer]);

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
          <Text style={styles.customerId}>ID: {customer.simpleId || customer.id}</Text>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            {/* Edit button at top right */}
            {!editing && (
              <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }} onPress={() => setEditing(true)}>
                <Ionicons name="create-outline" size={22} color="#00BFFF" />
              </TouchableOpacity>
            )}
            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color="#666" />
              <Text style={styles.infoLabel}>Email:</Text>
              {editing ? (
                <TextInput
                  style={[styles.infoValue, { borderBottomWidth: 1, borderColor: '#e1e5e9', flex: 1 }]}
                  value={editEmail}
                  onChangeText={setEditEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              ) : (
                <Text style={styles.infoValue}>{customer.email}</Text>
              )}
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call" size={20} color="#666" />
              <Text style={styles.infoLabel}>Phone:</Text>
              {editing ? (
                <TextInput
                  style={[styles.infoValue, { borderBottomWidth: 1, borderColor: '#e1e5e9', flex: 1 }]}
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.infoValue}>{customer.phone}</Text>
              )}
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

        {/* Pool Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pool Details</Text>
          <View style={styles.infoCard}>
            {!customer.poolDetails || customer.poolDetails.length === 0 ? (
              <TouchableOpacity
                style={styles.addPoolDetailsButton}
                onPress={() => navigation.navigate('PoolDetails', { customerId: customer.id })}
              >
                <Ionicons name="add-circle-outline" size={24} color="#00BFFF" />
                <Text style={styles.addPoolDetailsText}>Add Pool Details</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <TouchableOpacity 
                  style={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}
                  onPress={() => navigation.navigate('PoolDetails', { customerId: customer.id })}
                >
                  <Ionicons name="create-outline" size={22} color="#00BFFF" />
                </TouchableOpacity>
                <View style={styles.poolDetailsList}>
                  {customer.poolDetails.map((detail, index) => (
                    <View key={index} style={styles.poolDetailItem}>
                      <Text style={styles.bulletPoint}>•</Text>
                      <Text style={styles.poolDetailText}>{detail}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Customer History */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => navigation.navigate('CustomerHistory', { customerId: customer.id })}
          >
            <Ionicons name="time" size={24} color="#00BFFF" />
            <Text style={styles.historyButtonText}>View Customer History</Text>
            <Ionicons name="chevron-forward" size={20} color="#00BFFF" />
          </TouchableOpacity>
        </View>

        {/* Billing Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing Status</Text>
          <BillingStatus customerId={customer.id} />
        </View>
      </ScrollView>
      {/* Save Changes button at bottom if editing */}
      {editing && (
        <TouchableOpacity
          style={{
            backgroundColor: '#00BFFF',
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            marginTop: 24,
            marginBottom: 24,
          }}
          onPress={async () => {
            try {
              await updateDoc(doc(db, 'customers', customer.id), {
                email: editEmail,
                phone: editPhone,
              });
              setCustomer({ ...customer, email: editEmail, phone: editPhone });
              setEditing(false);
              Alert.alert('Success', 'Customer info updated.');
            } catch (error) {
              Alert.alert('Error', 'Failed to update customer info.');
            }
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Save Changes</Text>
        </TouchableOpacity>
      )}
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
  addPoolDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    marginTop: 12,
  },
  addPoolDetailsText: {
    fontSize: 16,
    color: '#00BFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  poolDetailsList: {
    marginTop: 12,
  },
  poolDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 18,
    color: '#00BFFF',
    marginRight: 8,
  },
  poolDetailText: {
    fontSize: 14,
    color: '#1a1a1a',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
  },
  historyButtonText: {
    fontSize: 16,
    color: '#00BFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default CustomerDetailScreen; 