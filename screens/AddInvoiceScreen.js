import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { addInvoice, getCustomersForAccount } from '../src/firestoreLogic';
import { auth } from '../firebase';

const AddInvoiceScreen = ({ navigation }) => {
  const [customerId, setCustomerId] = useState('');
  const [services, setServices] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getCustomersForAccount(auth.currentUser.uid);
        setCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
        Alert.alert('Error', 'Failed to load customers');
      }
    };
    fetchCustomers();
  }, []);

  const handleAddInvoice = async () => {
    if (!customerId || !services || !amount || !dueDate) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await addInvoice({
        customerId,
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
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>New Invoice</Text>
          <Text style={styles.label}>Customer</Text>
          <View style={styles.dropdown}>
            <TextInput
              style={styles.input}
              placeholder="Customer ID"
              value={customerId}
              onChangeText={setCustomerId}
              list="customer-list"
            />
            {/* Optionally, you can use a Picker or dropdown here */}
            {/* For now, just show a list below */}
            {customers.map(c => (
              <TouchableOpacity key={c.id} onPress={() => setCustomerId(c.id)}>
                <Text style={styles.customerOption}>{c.name} ({c.email})</Text>
              </TouchableOpacity>
            ))}
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
});

export default AddInvoiceScreen; 