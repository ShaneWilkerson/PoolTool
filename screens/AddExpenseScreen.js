import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { addExpense, getCustomersForAccount } from '../src/firestoreLogic';
import { auth } from '../firebase';
import SelectedCustomerBox from '../src/SelectedCustomerBox';

const AddExpenseScreen = ({ navigation }) => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const inputRef = useRef(null);
  const [items, setItems] = useState(['']);
  const [amount, setAmount] = useState('');
  const [supplyStore, setSupplyStore] = useState('');
  const [loading, setLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [rootLayout, setRootLayout] = useState({ x: 0, y: 0 });

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

  useEffect(() => {
    if (filteredCustomers.length > 0 && !selectedCustomer && customerSearch.trim() !== '') {
      setDropdownVisible(true);
    } else {
      setDropdownVisible(false);
    }
  }, [filteredCustomers, selectedCustomer, customerSearch]);

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

  const showDropdown = () => {
    if (inputRef.current) {
      inputRef.current.measureInWindow((x, y, width, height) => {
        setDropdownPosition({ top: y + height, left: x, width });
      });
    }
  };

  useEffect(() => {
    if (dropdownVisible) {
      setTimeout(showDropdown, 0);
    }
  }, [dropdownVisible]);

  return (
    <SafeAreaView style={styles.container} onLayout={e => setRootLayout(e.nativeEvent.layout)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Add Expense</Text>
          <Text style={styles.label}>Customer</Text>
          <View style={{ position: 'relative' }}>
            {!selectedCustomer && (
              <TextInput
                ref={inputRef}
                style={styles.input}
                placeholder="Search for customer..."
                value={customerSearch}
                onChangeText={text => {
                  setCustomerSearch(text);
                  setSelectedCustomer(null);
                }}
                onFocus={showDropdown}
                autoCapitalize="none"
              />
            )}
            {selectedCustomer && (
              <SelectedCustomerBox
                customer={selectedCustomer}
                onChange={() => {
                  setSelectedCustomer(null);
                  setCustomerSearch('');
                }}
              />
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
      {/* Dropdown Overlay (not Modal, not portal) */}
      {dropdownVisible && (
        <View style={{ position: 'absolute', top: dropdownPosition.top, left: dropdownPosition.left, width: dropdownPosition.width, zIndex: 9999 }} pointerEvents="box-none">
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setDropdownVisible(false)}
            pointerEvents="auto"
          />
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e1e5e9',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 3.84,
              elevation: 100,
              maxHeight: 200,
            }}
            pointerEvents="auto"
          >
            {filteredCustomers.map((customer) => (
              <TouchableOpacity
                key={customer.id}
                style={styles.suggestionItem}
                onPress={() => {
                  setSelectedCustomer(customer);
                  setCustomerSearch(`${customer.name} (${customer.email})`);
                  setDropdownVisible(false);
                }}
              >
                <Text style={styles.customerName}>{customer.name}</Text>
                <Text style={styles.customerEmail}>{customer.email}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
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
  changeCustomerButton: { padding: 12, alignItems: 'center' },
  changeCustomerText: { color: '#00BFFF', fontWeight: 'bold' },
});

export default AddExpenseScreen; 