import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { addCustomer } from '../src/firestoreLogic';
import { MaterialIcons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

const GOOGLE_PLACES_API_KEY = 'AIzaSyC7qnlKrxqcMSZSdHv6NPQBJxuM2fCbhYU'; // My own key

const AddCustomerScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [fullAddress, setFullAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);

  const handleAddCustomer = async () => {
    if (!name || !email || !phone || !fullAddress || latitude == null || longitude == null) {
      Alert.alert('Error', 'Please fill in all fields and select an address');
      return;
    }
    setLoading(true);
    try {
      await addCustomer({
        name, street, city, state, zip, email, phone,
        latitude,
        longitude
      });
      setLoading(false);
      Alert.alert('Success', 'Customer added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', `Failed to add customer: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <KeyboardAwareScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Add Customer</Text>
          {/* Section 1: Basic Info */}
          <TextInput style={styles.input} placeholder="Name" value={name} onChangeText={setName} autoCapitalize="words" />
          <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          {/* Section 2: Address */}
          <Text style={styles.sectionHeader}>Address</Text>
          <TouchableOpacity style={styles.input} onPress={() => setModalVisible(true)}>
            <Text style={{ color: fullAddress ? '#222' : '#aaa' }}>{fullAddress ? fullAddress : 'Search Address'}</Text>
          </TouchableOpacity>
          <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
            <SafeAreaView style={{ flex: 1, backgroundColor: '#fff', padding: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 12, color: '#00BFFF' }}>Search Address</Text>
              <GooglePlacesAutocomplete
                placeholder="Type address..."
                minLength={3}
                fetchDetails={true}
                onPress={(data, details = null) => {
                  const address = details?.address_components || [];
                  const streetNumber = address.find(c => c.types.includes('street_number'))?.long_name || '';
                  const route = address.find(c => c.types.includes('route'))?.long_name || '';
                  setStreet((streetNumber + ' ' + route).trim());
                  setCity(address.find(c => c.types.includes('locality'))?.long_name || '');
                  setState(address.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '');
                  setZip(address.find(c => c.types.includes('postal_code'))?.long_name || '');
                  setFullAddress(details?.formatted_address || '');
                  setLatitude(details?.geometry?.location?.lat || null);
                  setLongitude(details?.geometry?.location?.lng || null);
                  setModalVisible(false);
                }}
                onFail={error => { console.log('Places Autocomplete Error:', error); }}
                query={{
                  key: GOOGLE_PLACES_API_KEY,
                  language: 'en',
                  types: 'address',
                }}
                styles={{
                  textInput: styles.input,
                  listView: { backgroundColor: 'white', borderRadius: 12, marginHorizontal: 0 },
                  row: { padding: 12 },
                }}
                enablePoweredByContainer={false}
                debounce={200}
              />
              <TouchableOpacity style={[styles.button, { marginTop: 24 }]} onPress={() => setModalVisible(false)}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </Modal>
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleAddCustomer} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Adding...' : 'Add Customer'}</Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
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
  suggestionItem: { padding: 12 },
  customerName: { fontSize: 16, fontWeight: 'bold' },
  customerEmail: { fontSize: 14, color: '#666' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 24, marginBottom: 8, color: '#00BFFF' },
});

export default AddCustomerScreen; 