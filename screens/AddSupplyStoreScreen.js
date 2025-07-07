import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Ionicons } from '@expo/vector-icons';
import { addSupplyStore } from '../src/firestoreLogic';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { auth } from '../firebase';

const GOOGLE_PLACES_API_KEY = 'AIzaSyC7qnlKrxqcMSZSdHv6NPQBJxuM2fCbhYU';

const AddSupplyStoreScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [fullAddress, setFullAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAddStore = async () => {
    if (!name || !fullAddress || latitude == null || longitude == null) {
      alert('Please fill in all fields and select an address');
      return;
    }
    setLoading(true);
    try {
      await addSupplyStore({
        name,
        address: fullAddress,
        latitude,
        longitude,
        accountId: auth.currentUser.uid,
      });
      setLoading(false);
      alert('Supply store added!');
      navigation.goBack();
    } catch (e) {
      setLoading(false);
      alert('Failed to add supply store: ' + e.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <KeyboardAwareScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Add Supply Store</Text>
          <TextInput style={styles.input} placeholder="Store Name" value={name} onChangeText={setName} />
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
          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleAddStore} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Adding...' : 'Add Supply Store'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#FFA500', marginTop: 32 }]} onPress={() => navigation.navigate('ViewSupplyStores')}>
            <Text style={styles.buttonText}>View Supply Stores</Text>
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
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 24, marginBottom: 8, color: '#00BFFF' },
});

export default AddSupplyStoreScreen; 