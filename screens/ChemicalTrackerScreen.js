import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ChemicalTrackerScreen = () => {
  const [chemicalEntries, setChemicalEntries] = useState([
    {
      id: 1,
      chemical: 'Chlorine',
      amount: '2 lbs',
      date: '2024-01-20',
      time: '9:30 AM',
      pool: 'Smith Family Pool',
    },
    {
      id: 2,
      chemical: 'pH Minus',
      amount: '1 lb',
      date: '2024-01-19',
      time: '2:15 PM',
      pool: 'Johnson Resort Pool',
    },
    {
      id: 3,
      chemical: 'Algaecide',
      amount: '16 oz',
      date: '2024-01-18',
      time: '11:00 AM',
      pool: 'Williams Community Pool',
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    chemical: '',
    amount: '',
    pool: '',
    volume: '',
    strength: '',
  });

  const chemicalTypes = [
    'Chlorine',
    'pH Plus',
    'pH Minus',
    'Algaecide',
    'Shock',
    'Stabilizer',
    'Clarifier',
    'Other',
  ];

  const handleAddChemical = () => {
    if (!newEntry.chemical || !newEntry.amount || !newEntry.pool) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    const entry = {
      id: Date.now(),
      chemical: newEntry.chemical,
      amount: newEntry.amount,
      pool: newEntry.pool,
      volume: newEntry.volume,
      strength: newEntry.strength,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setChemicalEntries([entry, ...chemicalEntries]);
    setNewEntry({
      chemical: '',
      amount: '',
      pool: '',
      volume: '',
      strength: '',
    });
    setShowAddModal(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Pool Volume and Chemical Strength Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pool Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Pool Volume:</Text>
              <Text style={styles.infoValue}>15,000 gallons</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Chemical Strength:</Text>
              <Text style={styles.infoValue}>Standard</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Test:</Text>
              <Text style={styles.infoValue}>2024-01-20</Text>
            </View>
          </View>
        </View>

        {/* Add Chemical Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add-circle" size={24} color="white" />
            <Text style={styles.addButtonText}>Add Chemical Entry</Text>
          </TouchableOpacity>
        </View>

        {/* Chemical Entries List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Chemical Entries</Text>
          {chemicalEntries.map((entry) => (
            <View key={entry.id} style={styles.entryCard}>
              <View style={styles.entryHeader}>
                <Text style={styles.chemicalName}>{entry.chemical}</Text>
                <Text style={styles.entryTime}>{entry.time}</Text>
              </View>
              <View style={styles.entryDetails}>
                <Text style={styles.entryText}>Amount: {entry.amount}</Text>
                <Text style={styles.entryText}>Pool: {entry.pool}</Text>
                <Text style={styles.entryDate}>{formatDate(entry.date)}</Text>
              </View>
              {entry.volume && (
                <Text style={styles.entryNote}>Volume: {entry.volume}</Text>
              )}
              {entry.strength && (
                <Text style={styles.entryNote}>Strength: {entry.strength}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Chart Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chemical Usage Trends</Text>
          <View style={styles.chartPlaceholder}>
            <Ionicons name="analytics-outline" size={48} color="#ccc" />
            <Text style={styles.chartTitle}>WIP – Automation coming soon</Text>
            <Text style={styles.chartText}>
              Future feature: Interactive charts showing chemical usage over time,
              automated recommendations, and trend analysis.
            </Text>
            <View style={styles.chartFeatures}>
              <Text style={styles.featureText}>• Usage tracking over time</Text>
              <Text style={styles.featureText}>• Cost analysis</Text>
              <Text style={styles.featureText}>• Automated suggestions</Text>
              <Text style={styles.featureText}>• Inventory management</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>This Month</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="flask" size={24} color="#00BFFF" />
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Entries</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="water" size={24} color="#00BFFF" />
              <Text style={styles.statNumber}>8</Text>
              <Text style={styles.statLabel}>Pools</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="cash" size={24} color="#00BFFF" />
              <Text style={styles.statNumber}>$245</Text>
              <Text style={styles.statLabel}>Spent</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Chemical Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Chemical Entry</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Chemical Type *</Text>
              <View style={styles.chemicalPicker}>
                {chemicalTypes.map((chemical) => (
                  <TouchableOpacity
                    key={chemical}
                    style={[
                      styles.chemicalOption,
                      newEntry.chemical === chemical && styles.selectedOption,
                    ]}
                    onPress={() => setNewEntry({ ...newEntry, chemical })}
                  >
                    <Text
                      style={[
                        styles.chemicalOptionText,
                        newEntry.chemical === chemical && styles.selectedOptionText,
                      ]}
                    >
                      {chemical}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Amount *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., 2 lbs, 16 oz"
                value={newEntry.amount}
                onChangeText={(text) => setNewEntry({ ...newEntry, amount: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Pool Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter pool name"
                value={newEntry.pool}
                onChangeText={(text) => setNewEntry({ ...newEntry, pool: text })}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Pool Volume</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 15,000 gal"
                  value={newEntry.volume}
                  onChangeText={(text) => setNewEntry({ ...newEntry, volume: text })}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Chemical Strength</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g., 65%"
                  value={newEntry.strength}
                  onChangeText={(text) => setNewEntry({ ...newEntry, strength: text })}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleAddChemical}>
              <Text style={styles.saveButtonText}>Save Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#00BFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  entryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chemicalName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  entryTime: {
    fontSize: 14,
    color: '#666',
  },
  entryDetails: {
    marginBottom: 8,
  },
  entryText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  entryDate: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  entryNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
  },
  chartPlaceholder: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  chartText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  chartFeatures: {
    alignSelf: 'stretch',
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statsSection: {
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chemicalPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chemicalOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedOption: {
    backgroundColor: '#00BFFF',
    borderColor: '#00BFFF',
  },
  chemicalOptionText: {
    fontSize: 14,
    color: '#666',
  },
  selectedOptionText: {
    color: 'white',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#00BFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChemicalTrackerScreen; 