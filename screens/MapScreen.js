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
import { auth, db } from '../firebase';
import * as Location from 'expo-location';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

// Custom marker component for grouped items
const GroupedMarker = ({ coordinate, items, onPress }) => {
  const hasPoolVisit = items.some(item => item.type === 'poolVisit');
  const hasTodo = items.some(item => item.type === 'todo');
  
  return (
    <Marker coordinate={coordinate} onPress={onPress}>
      <View style={styles.groupedMarkerContainer}>
        {hasPoolVisit && (
          <View style={styles.markerWrapper}>
            <View style={[styles.markerPin, { backgroundColor: '#00BFFF' }]}>
              <Ionicons name="water" size={12} color="white" />
            </View>
            <View style={[styles.markerPoint, { borderTopColor: '#00BFFF' }]} />
          </View>
        )}
        {hasTodo && (
          <View style={styles.markerWrapper}>
            <View style={[styles.markerPin, { backgroundColor: '#FF0000' }]}>
              <Ionicons name="alert-circle" size={12} color="white" />
            </View>
            <View style={[styles.markerPoint, { borderTopColor: '#FF0000' }]} />
          </View>
        )}
      </View>
    </Marker>
  );
};

const MapScreen = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [region, setRegion] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [zoom, setZoom] = useState(12);
  const [showAllPools, setShowAllPools] = useState(false);
  const [stores, setStores] = useState([]);
  const [todos, setTodos] = useState([]);
  const [poolVisitsToday, setPoolVisitsToday] = useState([]);
  const [todosThisWeek, setTodosThisWeek] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, 'customers'),
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

  useEffect(() => {
    const unsubscribeStores = onSnapshot(
      query(collection(db, 'supplyStores'), where('accountId', '==', auth.currentUser.uid)),
      (snapshot) => {
        setStores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );
    return () => {
      unsubscribeStores();
    };
  }, []);

  useEffect(() => {
    const unsubscribeTodos = onSnapshot(
      query(collection(db, 'todos'), where('accountId', '==', auth.currentUser.uid), where('status', '==', 'pending')),
      (snapshot) => {
        setTodos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    );
    return () => {
      unsubscribeTodos();
    };
  }, []);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const q = query(
      collection(db, 'poolVisits'),
      where('accountId', '==', auth.currentUser.uid),
      where('scheduledDate', '>=', today),
      where('scheduledDate', '<', tomorrow),
      where('completed', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPoolVisitsToday(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    endOfWeek.setHours(23, 59, 59, 999);
    const q = query(
      collection(db, 'todos'),
      where('accountId', '==', auth.currentUser.uid),
      where('dueDate', '>=', startOfWeek),
      where('dueDate', '<', endOfWeek),
      where('status', '==', 'pending')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTodosThisWeek(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
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

  // Group items by location to handle overlapping markers
  const getGroupedMarkers = () => {
    const locationGroups = new Map();

    // Add pool visits today
    poolVisitsToday.forEach(visit => {
      const customer = customers.find(c => c.id === visit.customerId);
      if (!customer || !customer.latitude || !customer.longitude) return;
      
      const key = `${customer.latitude},${customer.longitude}`;
      if (!locationGroups.has(key)) {
        locationGroups.set(key, {
          coordinate: { latitude: customer.latitude, longitude: customer.longitude },
          items: []
        });
      }
      locationGroups.get(key).items.push({
        type: 'poolVisit',
        data: visit,
        customer: customer
      });
    });

    // Add todos this week
    todosThisWeek.forEach(todo => {
      const customer = customers.find(c => c.id === todo.customerId);
      if (!customer || !customer.latitude || !customer.longitude) return;
      
      const key = `${customer.latitude},${customer.longitude}`;
      if (!locationGroups.has(key)) {
        locationGroups.set(key, {
          coordinate: { latitude: customer.latitude, longitude: customer.longitude },
          items: []
        });
      }
      locationGroups.get(key).items.push({
        type: 'todo',
        data: todo,
        customer: customer
      });
    });

    return Array.from(locationGroups.values());
  };

  const initialRegion = {
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Single All Pools Toggle Button */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, showAllPools && styles.activeFilterButton]}
          onPress={() => setShowAllPools(v => !v)}
        >
          <Ionicons name="location" size={16} color={showAllPools ? 'white' : '#666'} />
          <Text style={[styles.filterText, showAllPools && styles.activeFilterText]}>
            All Pools
          </Text>
        </TouchableOpacity>
      </View>
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
          {/* Grouped markers for pool visits and todos */}
          {getGroupedMarkers().map((group, index) => (
            <GroupedMarker
              key={`group_${index}`}
              coordinate={group.coordinate}
              items={group.items}
              onPress={() => {
                const customer = group.items[0].customer;
                Alert.alert(
                  customer.name,
                  `${group.items.length} item${group.items.length > 1 ? 's' : ''} at this location:\n` +
                  group.items.map(item => 
                    item.type === 'poolVisit' ? '• Pool Visit' : '• To-Do Item'
                  ).join('\n')
                );
              }}
              />
          ))}
          {/* All pools (dark blue) */}
          {showAllPools && customers.filter(c => c.latitude && c.longitude && c.archived !== true && c.deleted !== true && c.isActive !== false).map(pool => (
            <Marker
              key={pool.id + '_all'}
              coordinate={{ latitude: pool.latitude, longitude: pool.longitude }}
              pinColor="#0057B8"
              title={pool.name}
              description={pool.address || `${pool.street}, ${pool.city}, ${pool.state} ${pool.zip}`}
            />
          ))}
          {/* Supply store markers (orange) */}
          {stores.map(store => (
            <Marker
              key={store.id}
              coordinate={{ latitude: store.latitude, longitude: store.longitude }}
              pinColor="#FFA500"
              title={store.name}
              description={store.address}
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
  groupedMarkerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  markerWrapper: {
    alignItems: 'center',
    marginHorizontal: 2,
  },
  markerPin: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerPoint: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});

export default MapScreen; 