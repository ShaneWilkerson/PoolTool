import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { addCustomer } from '../src/firestoreLogic';

const AddCustomerScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddCustomer = async () => {
    if (!name || !address || !email || !phone) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      await addCustomer({ name, address, email, phone });
      setLoading(false);
      
      Alert.alert(
        'Success', 
        'Customer added successfully!', 
        [
          {
            text: 'Add Another Customer',
            onPress: () => {
              setName('');
              setAddress('');
              setEmail('');
              setPhone('');
            }
          },
          {
            text: 'Go Home',
            onPress: () => navigation.navigate('MainTabs')
          }
        ]
      );
    } catch (error) {
      setLoading(false);
      console.error('Error adding customer:', error);
      Alert.alert('Error', `Failed to add customer: ${error.message || 'Unknown error occurred'}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.title}>Add Customer</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Name" 
            value={name} 
            onChangeText={setName}
            autoCapitalize="words"
          />
          <TextInput 
            style={styles.input} 
            placeholder="Address" 
            value={address} 
            onChangeText={setAddress}
            autoCapitalize="words"
          />
          <TextInput 
            style={styles.input} 
            placeholder="Email" 
            value={email} 
            onChangeText={setEmail} 
            keyboardType="email-address" 
            autoCapitalize="none" 
          />
          <TextInput 
            style={styles.input} 
            placeholder="Phone" 
            value={phone} 
            onChangeText={setPhone} 
            keyboardType="phone-pad" 
          />
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleAddCustomer} 
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Adding...' : 'Add Customer'}</Text>
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
  input: { backgroundColor: 'white', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#e1e5e9', marginBottom: 16 },
  button: { backgroundColor: '#00BFFF', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});

export default AddCustomerScreen; 