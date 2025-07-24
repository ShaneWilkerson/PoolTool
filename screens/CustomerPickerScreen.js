import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCustomersForAccount } from '../src/firestoreLogic';
import { auth } from '../firebase';

const CustomerPickerScreen = ({ navigation, route }) => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const data = await getCustomersForAccount(auth.currentUser.uid);
        setCustomers(data);
        setFilteredCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
        Alert.alert('Error', 'Failed to load customers');
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
    const unsubscribe = navigation.addListener('focus', fetchCustomers);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [searchQuery, customers]);

  const renderCustomerItem = ({ item }) => (
    <View style={styles.customerCard}>
      <View style={styles.customerHeader}>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.name}</Text>
          <Text style={styles.customerId}>ID: {item.simpleId ? item.simpleId : item.id}</Text>
          <Text style={{ color: '#666', fontSize: 13, marginTop: 2 }}>
            {item.street || item.address || ''}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.selectButton}
          onPress={() => {
            navigation.navigate({
              name: route.params?.onSelectScreen || 'AddExpense',
              params: { selectedCustomer: item },
              merge: true,
            });
          }}
        >
          <Ionicons name="checkmark-circle" size={16} color="#00BFFF" />
          <Text style={styles.selectButtonText}>Select</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00BFFF" />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search customers by name or email..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>
      {/* Customer List */}
      <FlatList
        data={filteredCustomers}
        keyExtractor={item => item.id}
        renderItem={renderCustomerItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {searchQuery.length > 0 
                ? 'No customers found matching your search'
                : 'Please add your first customer'
              }
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  list: {
    padding: 16,
  },
  customerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
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
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  customerId: {
    fontSize: 12,
    color: '#666',
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  selectButtonText: {
    color: '#00BFFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
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
});

export default CustomerPickerScreen; 