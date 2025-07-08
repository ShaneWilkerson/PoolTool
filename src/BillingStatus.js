import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Ionicons } from '@expo/vector-icons';

const BillingStatus = ({ customerId }) => {
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    const q = query(
      collection(db, 'invoices'),
      where('customerId', '==', customerId),
      orderBy('dueDate', 'desc'),
      limit(1)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setInvoice({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setInvoice(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [customerId]);

  function formatDueDate(dueDate) {
    if (!dueDate) return '';
    let dateObj;
    if (dueDate.toDate) {
      // Firestore Timestamp
      dateObj = dueDate.toDate();
    } else if (typeof dueDate === 'string' || dueDate instanceof String) {
      dateObj = new Date(dueDate);
    } else if (dueDate instanceof Date) {
      dateObj = dueDate;
    }
    if (!dateObj || isNaN(dateObj)) return '';
    return dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  if (loading) {
    return (
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="card" size={20} color="#666" />
          <Text style={styles.infoLabel}>Status:</Text>
          <Text style={styles.infoValue}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="card" size={20} color="#666" />
          <Text style={styles.infoLabel}>Status:</Text>
          <Text style={[styles.infoValue, { color: '#4CAF50' }]}>Paid</Text>
        </View>
      </View>
    );
  }

  if (invoice.status === 'paid') {
    return (
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="card" size={20} color="#666" />
          <Text style={styles.infoLabel}>Status:</Text>
          <Text style={[styles.infoValue, { color: '#4CAF50' }]}>Paid</Text>
        </View>
      </View>
    );
  }

  // If unpaid
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoRow}>
        <Ionicons name="card" size={20} color="#666" />
        <Text style={styles.infoLabel}>Status:</Text>
        <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>
          {invoice.status === 'unpaid' ? `Owes $${invoice.amount?.toFixed(2) || '0.00'} by ${formatDueDate(invoice.dueDate)}` : 'Paid'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: 'bold',
    marginLeft: 8,
    marginRight: 4,
    color: '#222',
  },
  infoValue: {
    fontSize: 16,
    marginLeft: 4,
  },
});

export default BillingStatus; 