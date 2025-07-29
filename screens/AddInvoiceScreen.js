import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Modal, Pressable, Keyboard } from 'react-native';
import { addInvoice, getCustomersForAccount } from '../src/firestoreLogic';
import { auth } from '../firebase';
import SelectedCustomerBox from '../src/SelectedCustomerBox';
import DateSelector from '../src/DateSelector';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AddInvoiceScreen = ({ navigation, route }) => {
  const [customerId, setCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(route.params?.selectedCustomer || null);
  useEffect(() => {
    if (route.params?.selectedCustomer) {
      setSelectedCustomer(route.params.selectedCustomer);
    }
  }, [route.params?.selectedCustomer]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [services, setServices] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const inputRef = useRef(null);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const [dropdownWidth, setDropdownWidth] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [rootLayout, setRootLayout] = useState({ x: 0, y: 0 });
  const getStartOfThisWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return start;
  };
  const initialWeekStart = getStartOfThisWeek();
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const [selectedWeekStart, setSelectedWeekStart] = useState(initialWeekStart);
  const [selectedDay, setSelectedDay] = useState(() => {
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(initialWeekStart);
      d.setDate(initialWeekStart.getDate() + i);
      return d;
    });
    const found = weekDays.find(d => d.toDateString() === todayDate.toDateString());
    return found ? todayDate : null;
  });

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
    
    // Add focus listener to refresh customers when screen comes into focus
    const unsubscribe = navigation.addListener('focus', fetchCustomers);
    return unsubscribe;
  }, [navigation]);

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

  const handleAddInvoice = async () => {
    if (!selectedCustomer || !services || !amount || !selectedDay) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await addInvoice({
        customerId: selectedCustomer.id,
        services: services.split(',').map(s => s.trim()),
        amount: parseFloat(amount),
        dueDate: selectedDay,
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
    <SafeAreaView style={styles.container} onLayout={e => setRootLayout(e.nativeEvent.layout)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <KeyboardAwareScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>New Invoice</Text>
          <Text style={styles.label}>Customer</Text>
          <View style={{ position: 'relative' }}>
            {!selectedCustomer ? (
              <TouchableOpacity onPress={() => navigation.navigate('CustomerPicker', { onSelectScreen: 'AddInvoice' })}>
                <View style={[styles.input, { justifyContent: 'center', minHeight: 48 }]}>
                  <Text style={{ color: '#aaa' }}>Tap to select customer...</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={{ marginBottom: 16 }}>
                <SelectedCustomerBox
                  customer={selectedCustomer}
                  onChange={() => {
                    setSelectedCustomer(null);
                    navigation.navigate('CustomerPicker', { onSelectScreen: 'AddInvoice' });
                  }}
                />
              </View>
            )}
          </View>
          <TextInput style={styles.input} placeholder="Services (comma separated)" value={services} onChangeText={setServices} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
          <TextInput style={styles.input} placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
          <Text style={styles.label}>Due Date</Text>
          <DateSelector
            selectedWeekStart={selectedWeekStart}
            setSelectedWeekStart={setSelectedWeekStart}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
          />
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleAddInvoice} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Adding...' : 'Add Invoice'}</Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
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
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  changeCustomerButton: {
    position: 'absolute',
    top: 56,
    right: 16,
    padding: 8,
    backgroundColor: '#00BFFF',
    borderRadius: 8,
  },
  changeCustomerText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AddInvoiceScreen; 