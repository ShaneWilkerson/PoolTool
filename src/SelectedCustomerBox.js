import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const SelectedCustomerBox = ({ customer, onChange }) => (
  <View style={styles.selectedCustomer}>
    <Text style={styles.selectedLabel}>Selected: <Text style={styles.selectedCustomerText}>{customer.name}</Text></Text>
    <TouchableOpacity style={styles.changeCustomerButton} onPress={onChange}>
      <Text style={styles.changeCustomerText}>Change</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  selectedCustomer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  selectedLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  selectedCustomerText: {
    color: '#00BFFF',
    fontWeight: '600',
  },
  changeCustomerButton: {
    backgroundColor: '#00BFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  changeCustomerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default SelectedCustomerBox; 