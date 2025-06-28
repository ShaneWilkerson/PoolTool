import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { markInvoicePaid, getInvoicesForAccount } from '../src/firestoreLogic';
import { auth } from '../firebase';

const MarkInvoicePaidScreen = ({ navigation }) => {
  const [invoiceId, setInvoiceId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const data = await getInvoicesForAccount(auth.currentUser.uid);
        setInvoices(data);
      } catch (error) {
        console.error('Error fetching invoices:', error);
        Alert.alert('Error', 'Failed to load invoices');
      }
    };
    fetchInvoices();
  }, []);

  const handleMarkPaid = async () => {
    if (!invoiceId || !customerId || !amount) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await markInvoicePaid(invoiceId, customerId, parseFloat(amount));
      Alert.alert('Success', 'Invoice marked as paid and receipt created', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      Alert.alert('Error', `Failed to mark invoice as paid: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Mark Invoice as Paid</Text>
          <Text style={styles.label}>Invoice</Text>
          <View style={styles.dropdown}>
            <TextInput
              style={styles.input}
              placeholder="Invoice ID"
              value={invoiceId}
              onChangeText={setInvoiceId}
              list="invoice-list"
            />
            {invoices.map(inv => (
              <TouchableOpacity key={inv.id} onPress={() => { setInvoiceId(inv.id); setCustomerId(inv.customerId); }}>
                <Text style={styles.invoiceOption}>{inv.id} - {inv.customerId} - ${inv.amount} ({inv.status})</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} placeholder="Customer ID" value={customerId} onChangeText={setCustomerId} />
          <TextInput style={styles.input} placeholder="Amount" value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleMarkPaid} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Processing...' : 'Mark as Paid'}</Text>
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
  invoiceOption: { padding: 8, backgroundColor: '#e3f2fd', borderRadius: 8, marginBottom: 4 },
});

export default MarkInvoicePaidScreen; 