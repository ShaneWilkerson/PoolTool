import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCustomersForAccount, getExpensesForAccount } from '../src/firestoreLogic';
import { auth } from '../firebase';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

const AccountBillingScreen = ({ navigation, route }) => {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [expandedExpense, setExpandedExpense] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [fullImage, setFullImage] = useState(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      const customers = await getCustomersForAccount(auth.currentUser.uid);
      setCustomer(customers.find(c => c.id === customerId));
    };
    fetchCustomer();
  }, [customerId]);

  useEffect(() => {
    const fetchExpenses = async () => {
      const allExpenses = await getExpensesForAccount(auth.currentUser.uid);
      setExpenses(allExpenses.filter(e => e.customerId === customerId));
    };
    fetchExpenses();
  }, [customerId]);

  const getLast12Months = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: format(d, 'MMMM yyyy'),
        value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      });
    }
    return months;
  };

  const filteredExpenses = expenses.filter(exp => {
    if (!exp.date) return false;
    const d = new Date(exp.date.seconds ? exp.date.seconds * 1000 : exp.date);
    const expMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return expMonth === selectedMonth;
  });

  // Sort expenses by date, newest first
  const sortedExpenses = [...filteredExpenses].filter(exp => exp.date).sort((a, b) => {
    const da = new Date(a.date?.seconds ? a.date.seconds * 1000 : a.date);
    const db = new Date(b.date?.seconds ? b.date.seconds * 1000 : b.date);
    return db - da;
  });

  const handleAddReceipt = async (expense) => {
    try {
      setUploading(true);
      // Ask for permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please allow photo access to attach receipts.');
        setUploading(false);
        return;
      }
      // Pick or take a photo
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.7 });
      if (result.cancelled || !result.assets || !result.assets[0]) {
        setUploading(false);
        return;
      }
      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const filename = asset.fileName || `receipt_${Date.now()}.jpg`;
      const storageRef = ref(storage, `receipts/${expense.id}/${filename}`);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      // Update expense with receiptUrl
      await updateDoc(doc(db, 'expenses', expense.id), { receiptUrl: downloadUrl });
      Alert.alert('Success', 'Receipt uploaded!');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to upload receipt.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#00BFFF', marginBottom: 16 }}>
          {customer ? customer.name : 'Account Billing'}
        </Text>
        {/* Add Expense Button */}
        <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#e3f2fd', borderRadius: 8, padding: 12, marginBottom: 16 }}
          onPress={() => navigation.navigate('AddExpense', { preselectCustomer: customer })}>
          <Ionicons name="add-circle" size={20} color="#00BFFF" />
          <Text style={{ color: '#00BFFF', fontWeight: 'bold', marginLeft: 8 }}>Add Expense</Text>
        </TouchableOpacity>
        {/* Filter by Month Dropdown */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Filter by Month</Text>
          <TouchableOpacity
            style={{
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderWidth: 1,
              borderColor: '#e1e5e9',
            }}
            onPress={() => setShowMonthDropdown(!showMonthDropdown)}
          >
            <Text>{getLast12Months().find(m => m.value === selectedMonth)?.label || ''}</Text>
            <Ionicons name={showMonthDropdown ? 'chevron-up' : 'chevron-down'} size={20} color="#00BFFF" />
          </TouchableOpacity>
          {showMonthDropdown && (
            <View style={{ backgroundColor: 'white', borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: '#e1e5e9', zIndex: 10 }}>
              {getLast12Months().map(month => (
                <TouchableOpacity
                  key={month.value}
                  style={{ padding: 12 }}
                  onPress={() => {
                    setSelectedMonth(month.value);
                    setShowMonthDropdown(false);
                  }}
                >
                  <Text>{month.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        {/* Recent Expenses List */}
        <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 12 }}>Recent Expenses</Text>
        {expenses.some(exp => !exp.date) && (
          <Text style={{ color: 'red', marginBottom: 8 }}>Some expenses are missing a date and will not be shown. Please re-add them.</Text>
        )}
        {sortedExpenses.length === 0 ? (
          <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 32, alignItems: 'center', marginTop: 16 }}>
            <Ionicons name="card-outline" size={64} color="#ccc" />
            <Text style={{ color: '#666', marginTop: 12, textAlign: 'center' }}>No expenses to display for this month</Text>
          </View>
        ) : (
          sortedExpenses.map(expense => {
            const d = new Date(expense.date?.seconds ? expense.date.seconds * 1000 : expense.date);
            return (
              <View key={expense.id} style={{ backgroundColor: 'white', borderRadius: 12, marginBottom: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5 }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                  onPress={() => setExpandedExpense(expandedExpense === expense.id ? null : expense.id)}
                >
                  <View>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{customer ? customer.name : ''}</Text>
                    <Text style={{ color: '#666', fontSize: 14 }}>{d.toString() !== 'Invalid Date' ? format(d, 'MMM d, yyyy') : 'No date'}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 'bold', fontSize: 16, marginRight: 8 }}>${expense.amount?.toFixed(2)}</Text>
                    <Ionicons name={expandedExpense === expense.id ? 'chevron-up' : 'chevron-down'} size={20} color="#00BFFF" />
                  </View>
                </TouchableOpacity>
                {expandedExpense === expense.id && (
                  <View style={{ marginTop: 8, backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12 }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Items:</Text>
                    {expense.items && expense.items.map((item, idx) => (
                      <Text key={idx} style={{ marginLeft: 8, marginBottom: 2 }}>• {item}</Text>
                    ))}
                    {/* Add Receipt Button */}
                    <TouchableOpacity style={{ marginTop: 12, backgroundColor: '#e3f2fd', borderRadius: 8, padding: 8, alignSelf: 'flex-start' }} onPress={() => handleAddReceipt(expense)}>
                      <Ionicons name="image" size={18} color="#00BFFF" />
                      <Text style={{ color: '#00BFFF', fontWeight: 'bold', marginLeft: 6 }}>Add Receipt</Text>
                    </TouchableOpacity>
                    {/* Show thumbnail if receipt exists */}
                    {expense.receiptUrl && (
                      <TouchableOpacity style={{ marginTop: 8 }} onPress={() => setFullImage(expense.receiptUrl)}>
                        <Image source={{ uri: expense.receiptUrl }} style={{ width: 80, height: 80, borderRadius: 8 }} resizeMode="cover" />
                      </TouchableOpacity>
                    )}
                    {/* Show uploading indicator if uploading */}
                    {uploading && <Text style={{ color: '#00BFFF', marginBottom: 8 }}>Uploading receipt...</Text>}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AccountBillingScreen; 