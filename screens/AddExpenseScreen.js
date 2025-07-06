import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { addExpense, getCustomersForAccount } from '../src/firestoreLogic';
import { auth } from '../firebase';

const AddExpenseScreen = ({ navigation }) => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const [items, setItems] = useState(['']);
  const [amount, setAmount] = useState('');
  const [supplyStore, setSupplyStore] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getCustomersForAccount(auth.currentUser.uid);
        setCustomers(data);
        setFilteredCustomers(data);
      } catch (error) {
        Alert.alert('Error', 'Failed to load customers');
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (customerSearch.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.email.toLowerCase().includes(customerSearch.toLowerCase())
      );
      setFilteredCustomers(filtered.slice(0, 5));
    }
  }, [customerSearch, customers]);

  const handleAddItem = () => {
    if (items[items.length - 1].trim() !== '') {
      setItems([...items, '']);
    }
  };

  const handleItemChange = (text, idx) => {
    const newItems = [...items];
    newItems[idx] = text;
    setItems(newItems);
  };

  const handleAddExpense = async () => {
    if (!selectedCustomer || items.filter(i => i.trim()).length === 0 || !amount || !supplyStore) {
      Alert.alert('Error', 'Please fill in all fields and add at least one item');
      return;
    }
    setLoading(true);
    try {
      await addExpense({
        customerId: selectedCustomer.id,
        items: items.filter(i => i.trim()),
        amount: parseFloat(amount),
        supplyStore,
        date: new Date(),
      });
      Alert.alert('Success', 'Expense added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', `Failed to add expense: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Add Expense</Text>
          <Text style={styles.label}>Customer</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Search for customer..."
              value={selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.email})` : customerSearch}
              onChangeText={text => {
                setCustomerSearch(text);
                setSelectedCustomer(null);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              autoCapitalize="none"
            />
            {showDropdown && filteredCustomers.length > 0 && !selectedCustomer && (
              <View
                style={{
                  position: 'absolute',
                  top: 56,
                  left: 0,
                  width: '100%',
                  backgroundColor: 'white',
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                  elevation: 10,
                  zIndex: 9999,
                  paddingVertical: 4,
                }}
              >
                {filteredCustomers.map((customer) => (
                  <TouchableOpacity
                    key={customer.id}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setSelectedCustomer(customer);
                      setCustomerSearch(`${customer.name} (${customer.email})`);
                      setShowDropdown(false);
                    }}
                  >
                    <Text style={styles.customerName}>{customer.name}</Text>
                    <Text style={styles.customerEmail}>{customer.email}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <Text style={styles.label}>Items</Text>
          {items.map((item, idx) => (
            <TextInput
              key={idx}
              style={styles.input}
              placeholder={`Item ${idx + 1}`}
              value={item}
              onChangeText={text => handleItemChange(text, idx)}
              onSubmitEditing={handleAddItem}
              returnKeyType="done"
            />
          ))}
          <TouchableOpacity style={styles.addItemButton} onPress={handleAddItem}>
            <Text style={styles.addItemButtonText}>+ Add item</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Amount</Text>
          <TextInput style={styles.input} placeholder="Total Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <Text style={styles.label}>Supply Store</Text>
          <TextInput style={styles.input} placeholder="Supply Store" value={supplyStore} onChangeText={setSupplyStore} />
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleAddExpense} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Adding...' : 'Add Expense'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  keyboardView: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', color: '#00BFFF' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: 'white', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#e1e5e9', marginBottom: 16 },
  button: { backgroundColor: '#00BFFF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  addItemButton: { backgroundColor: '#e3f2fd', borderRadius: 8, padding: 12, alignItems: 'center', marginBottom: 16 },
  addItemButtonText: { color: '#00BFFF', fontWeight: 'bold', fontSize: 16 },
  suggestionItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#e1e5e9' },
  customerName: { fontSize: 16, fontWeight: '600' },
  customerEmail: { fontSize: 14, color: '#666' },
});

export default AddExpenseScreen; 