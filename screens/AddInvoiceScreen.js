import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Modal, Pressable } from 'react-native';
import { addInvoice, getCustomersForAccount } from '../src/firestoreLogic';
import { auth } from '../firebase';

const AddInvoiceScreen = ({ navigation }) => {
  const [customerId, setCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [services, setServices] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const inputRef = useRef(null);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const [dropdownWidth, setDropdownWidth] = useState(0);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getCustomersForAccount(auth.currentUser.uid);
        setCustomers(data);
        setFilteredCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
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

  const handleAddInvoice = async () => {
    if (!selectedCustomer || !services || !amount || !dueDate) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await addInvoice({
        customerId: selectedCustomer.id,
        services: services.split(',').map(s => s.trim()),
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
      });
      Alert.alert('Success', 'Invoice added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error adding invoice:', error);
      Alert.alert('Error', `Failed to add invoice: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>New Invoice</Text>
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
              onFocus={() => {
                setShowDropdown(true);
                setTimeout(() => {
                  inputRef.current?.measure((x, y, width, height, pageX, pageY) => {
                    setDropdownTop(y + height);
                    setDropdownLeft(x);
                    setDropdownWidth(width);
                  });
                }, 100);
              }}
              autoCapitalize="none"
            />
            {showDropdown && filteredCustomers.length > 0 && !selectedCustomer && (
              <View
                style={{
                  position: 'absolute',
                  top: 56, // height of input + margin
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
          <TextInput style={styles.input} placeholder="Services (comma separated)" value={services} onChangeText={setServices} />
          <TextInput style={styles.input} placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <TextInput style={styles.input} placeholder="Due Date (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} />
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleAddInvoice} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Adding...' : 'Add Invoice'}</Text>
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
  dropdown: { marginBottom: 16 },
  input: { backgroundColor: 'white', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#e1e5e9', marginBottom: 16 },
  button: { backgroundColor: '#00BFFF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  customerOption: { padding: 8, backgroundColor: '#e3f2fd', borderRadius: 8, marginBottom: 4 },
  suggestionDropdown: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    zIndex: 1000,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 10,
  },
  suggestionItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  customerName: { fontSize: 16, fontWeight: '600' },
  customerEmail: { fontSize: 14, color: '#666' },
});

export default AddInvoiceScreen; 