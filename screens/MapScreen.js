import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { getCustomersForAccount } from '../src/firestoreLogic';
import { auth } from '../firebase';

const MapScreen = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getCustomersForAccount(auth.currentUser.uid);
        setCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  // Mock data for Leslie's Pool Supply locations - teal pins
  const lesliesLocations = [
    {
      id: 'leslies1',
      name: "Leslie's Pool Supply",
      coordinate: { latitude: 37.7749, longitude: -122.4094 },
      address: '100 Pool St, San Francisco, CA',
    },
    {
      id: 'leslies2',
      name: "Leslie's Pool Supply",
      coordinate: { latitude: 37.7849, longitude: -122.4194 },
      address: '200 Water Ave, San Francisco, CA',
    },
    {
      id: 'leslies3',
      name: "Leslie's Pool Supply",
      coordinate: { latitude: 37.7649, longitude: -122.3994 },
      address: '300 Chemical Blvd, San Francisco, CA',
    },
  ];

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

  const getFilteredLeslies = () => {
    if (selectedFilter === 'all' || selectedFilter === 'leslies') {
      return lesliesLocations;
    }
    return [];
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
        <MapView style={styles.map} initialRegion={initialRegion}>
          {/* Customer Pools */}
          {getFilteredPools().map((pool) => (
            <Marker
              key={pool.id}
              coordinate={{ latitude: 37.7749, longitude: -122.4194 }} // Default coordinates
              title={pool.name}
              description={pool.address}
              pinColor={getPinColor(pool.status || 'all')}
            />
          ))}

          {/* Leslie's Locations */}
          {getFilteredLeslies().map((location) => (
            <Marker
              key={location.id}
              coordinate={location.coordinate}
              title={location.name}
              description={location.address}
              pinColor={getPinColor('leslies')}
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
});

export default MapScreen; 