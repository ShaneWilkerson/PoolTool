import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { getCustomersForAccount } from '../src/firestoreLogic';
import { auth } from '../firebase';
import * as Location from 'expo-location';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

const MapScreen = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [zoom, setZoom] = useState(12);
  const [showAllPools, setShowAllPools] = useState(false);

  useEffect(() => {
    const q = query(
      collection(auth, 'customers'),
      where('accountId', '==', auth.currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to show your position on the map.');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude });
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      });
    })();
  }, []);

  const getPinColor = (status) => {
    switch (status) {
      case 'today':
        return '#00BFFF'; // Blue for today's pools
      case 'todo':
        return '#FFA500'; // Orange for to-do tasks
      case 'leslies':
        return '#008080'; // Teal for Leslie's locations
      default:
        return '#808080'; // Gray for all other pools
    }
  };

  const getFilteredPools = () => {
    if (selectedFilter === 'all') {
      return customers;
    }
    return customers.filter(pool => pool.status === selectedFilter);
  };

  const initialRegion = {
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'all' && styles.activeFilterButton,
            ]}
            onPress={() => setSelectedFilter('all')}
          >
            <Ionicons
              name="location"
              size={16}
              color={selectedFilter === 'all' ? 'white' : '#666'}
            />
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'all' && styles.activeFilterText,
              ]}
            >
              All Pools ({customers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'today' && styles.activeFilterButton,
            ]}
            onPress={() => setSelectedFilter('today')}
          >
            <Ionicons
              name="today"
              size={16}
              color={selectedFilter === 'today' ? 'white' : '#00BFFF'}
            />
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'today' && styles.activeFilterText,
              ]}
            >
              Today's Pools (0)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'todo' && styles.activeFilterButton,
            ]}
            onPress={() => setSelectedFilter('todo')}
          >
            <Ionicons
              name="alert-circle"
              size={16}
              color={selectedFilter === 'todo' ? 'white' : '#FFA500'}
            />
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'todo' && styles.activeFilterText,
              ]}
            >
              To-Do Tasks (0)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              selectedFilter === 'leslies' && styles.activeFilterButton,
            ]}
            onPress={() => setSelectedFilter('leslies')}
          >
            <Ionicons
              name="storefront"
              size={16}
              color={selectedFilter === 'leslies' ? 'white' : '#008080'}
            />
            <Text
              style={[
                styles.filterText,
                selectedFilter === 'leslies' && styles.activeFilterText,
              ]}
            >
              Stores (3)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          style={{ flex: 1 }}
          region={region}
          onRegionChangeComplete={setRegion}
        >
          {/* User location marker */}
          {userLocation && (
            <Marker coordinate={userLocation} pinColor="#00BFFF" title="You are here" />
          )}
          {/* Today's pool visits (turquoise) */}
          {getFilteredPools().map((pool) => (
            <Marker
              key={pool.id}
              coordinate={{ latitude: 37.7749, longitude: -122.4194 }} // Default coordinates
              pinColor={getPinColor(pool.status || 'all')}
              title={pool.name}
              description={pool.address}
            />
          ))}
          {/* This week's to-dos (orange) */}
          {/* weeksTodos.map(todo => (
            <Marker
              key={todo.id}
              coordinate={{ latitude: todo.latitude, longitude: todo.longitude }}
              pinColor="#ff9100"
              title={todo.customerName}
              description="To-Do This Week"
            />
          )) */}
          {/* All pools (optional, toggle) */}
          {showAllPools && customers.filter(c => c.latitude && c.longitude).map(pool => (
            <Marker
              key={pool.id}
              coordinate={{ latitude: pool.latitude, longitude: pool.longitude }}
              pinColor="#00BFFF"
              title={pool.name}
              description={`${pool.street}, ${pool.city}, ${pool.state} ${pool.zip}`}
            />
          ))}
        </MapView>

        {/* Empty State Overlay */}
        {customers.length === 0 && (
          <View style={styles.emptyOverlay}>
            <View style={styles.emptyCard}>
              <Ionicons name="map-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No pools to display</Text>
              <Text style={styles.emptySubtext}>Add customers to see their pools on the map</Text>
            </View>
          </View>
        )}

        {/* Zoom in/out buttons */}
        <View style={{ position: 'absolute', bottom: 24, right: 16, flexDirection: 'column' }}>
          <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 24, padding: 8, marginBottom: 8, elevation: 4 }} onPress={() => setZoom(z => Math.min(z + 1, 20))}>
            <Ionicons name="add" size={24} color="#00BFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 24, padding: 8, elevation: 4 }} onPress={() => setZoom(z => Math.max(z - 1, 2))}>
            <Ionicons name="remove" size={24} color="#00BFFF" />
          </TouchableOpacity>
        </View>

        {/* Toggle for all pools */}
        <View style={{ position: 'absolute', top: 24, right: 16 }}>
          <TouchableOpacity style={{ backgroundColor: showAllPools ? '#00BFFF' : '#fff', borderRadius: 8, padding: 8, elevation: 4 }} onPress={() => setShowAllPools(v => !v)}>
            <Text style={{ color: showAllPools ? '#fff' : '#00BFFF', fontWeight: 'bold' }}>All Pools</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  activeFilterButton: {
    backgroundColor: '#00BFFF',
  },
  filterText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  activeFilterText: {
    color: 'white',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  emptyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 249, 250, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    margin: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MapScreen; 