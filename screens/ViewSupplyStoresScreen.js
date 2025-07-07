import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';

const ViewSupplyStoresScreen = ({ navigation }) => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'supplyStores'),
      where('accountId', '==', auth.currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleDelete = async (id) => {
    Alert.alert('Delete Store', 'Are you sure you want to delete this supply store?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteDoc(doc(db, 'supplyStores', id));
          } catch (e) {
            alert('Failed to delete: ' + e.message);
          }
        }
      }
    ]);
  };

  const renderItem = ({ item }) => (
    <View style={styles.storeCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.storeName}>{item.name}</Text>
        <Text style={styles.storeAddress}>{item.address}</Text>
      </View>
      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
        <Ionicons name="trash" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#00BFFF" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Supply Stores</Text>
      <FlatList
        data={stores}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>No supply stores found.</Text>}
        refreshing={loading}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 24, textAlign: 'center', color: '#00BFFF' },
  list: { padding: 16 },
  storeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5 },
  storeName: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  storeAddress: { fontSize: 14, color: '#666', marginTop: 4 },
  deleteButton: { backgroundColor: '#FF3B30', borderRadius: 8, padding: 8, marginLeft: 12 },
  backButton: { flexDirection: 'row', alignItems: 'center', margin: 16 },
  backButtonText: { color: '#00BFFF', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
});

export default ViewSupplyStoresScreen; 