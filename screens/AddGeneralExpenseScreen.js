import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, Keyboard } from 'react-native';
import { addExpense } from '../src/firestoreLogic';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const AddGeneralExpenseScreen = ({ navigation }) => {
  const [items, setItems] = useState(['']);
  const [amount, setAmount] = useState('');
  const [supplyStore, setSupplyStore] = useState('');
  const [loading, setLoading] = useState(false);

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
    if (items.filter(i => i.trim()).length === 0 || !amount || !supplyStore) {
      Alert.alert('Error', 'Please fill in all fields and add at least one item');
      return;
    }
    setLoading(true);
    try {
      await addExpense({
        customerId: null, // No customer for general expenses
        customerName: 'General Expense', // This will show as "General Expense" in the list
        customerEmail: null,
        items: items.filter(i => i.trim()),
        amount: parseFloat(amount),
        supplyStore,
        date: new Date(),
      });
      Alert.alert('Success', 'General expense added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      Alert.alert('Error', `Failed to add general expense: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add General Expense</Text>
        
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
            onEndEditing={Keyboard.dismiss}
          />
        ))}
        <TouchableOpacity style={styles.addItemButton} onPress={handleAddItem}>
          <Text style={styles.addItemButtonText}>+ Add item</Text>
        </TouchableOpacity>
        
        <Text style={styles.label}>Amount</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Total Amount" 
          value={amount} 
          onChangeText={setAmount} 
          keyboardType="numeric" 
          returnKeyType="done" 
          onSubmitEditing={Keyboard.dismiss} 
        />
        
        <Text style={styles.label}>Supply Store</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Supply Store" 
          value={supplyStore} 
          onChangeText={setSupplyStore} 
          returnKeyType="done" 
          onSubmitEditing={Keyboard.dismiss} 
        />
        
        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleAddExpense} 
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Adding...' : 'Add General Expense'}</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  scrollContainer: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    padding: 20 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 24, 
    textAlign: 'center', 
    color: '#00BFFF' 
  },
  label: { 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 8 
  },
  input: { 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16, 
    borderWidth: 1, 
    borderColor: '#e1e5e9', 
    marginBottom: 16 
  },
  button: { 
    backgroundColor: '#00BFFF', 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center', 
    marginTop: 12 
  },
  buttonDisabled: { 
    backgroundColor: '#ccc' 
  },
  buttonText: { 
    color: 'white', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  addItemButton: { 
    backgroundColor: '#e3f2fd', 
    borderRadius: 8, 
    padding: 12, 
    alignItems: 'center', 
    marginBottom: 16 
  },
  addItemButtonText: { 
    color: '#00BFFF', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
});

export default AddGeneralExpenseScreen; 