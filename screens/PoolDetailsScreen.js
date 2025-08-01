import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const PoolDetailsScreen = ({ navigation, route }) => {
  const { customerId } = route.params;
  const [customer, setCustomer] = useState(null);
  const [poolDetails, setPoolDetails] = useState(['']);
  const [loading, setLoading] = useState(true);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const customerDoc = await getDoc(doc(db, 'customers', customerId));
        if (customerDoc.exists()) {
          const customerData = { id: customerDoc.id, ...customerDoc.data() };
          setCustomer(customerData);
          if (customerData.poolDetails && customerData.poolDetails.length > 0) {
            setPoolDetails(customerData.poolDetails);
          }
        } else {
          Alert.alert('Error', 'Customer not found');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error fetching customer:', error);
        Alert.alert('Error', 'Failed to load customer details');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [customerId, navigation]);

  const addStep = () => {
    setPoolDetails([...poolDetails, '']);
  };

  const updateStep = (index, value) => {
    const newSteps = [...poolDetails];
    newSteps[index] = value;
    setPoolDetails(newSteps);
  };

  const removeStep = (index) => {
    if (poolDetails.length > 1) {
      const newSteps = poolDetails.filter((_, i) => i !== index);
      setPoolDetails(newSteps);
    }
  };

  const handleSave = async () => {
    const validSteps = poolDetails.filter(step => step.trim() !== '');
    if (validSteps.length === 0) {
      Alert.alert('Error', 'Please add at least one pool detail step');
      return;
    }

    try {
      await updateDoc(doc(db, 'customers', customerId), {
        poolDetails: validSteps,
      });
      Alert.alert('Success', 'Pool details saved successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error saving pool details:', error);
      Alert.alert('Error', 'Failed to save pool details');
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel',
      'Are you sure you want to cancel without saving?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', style: 'destructive', onPress: () => navigation.goBack() }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading pool details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#00BFFF" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <KeyboardAwareScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Pool Details</Text>
        {customer && (
          <Text style={styles.customerName}>{customer.name}</Text>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pool Maintenance Steps</Text>
          <View style={styles.stepsContainer}>
            {poolDetails.map((step, index) => (
              <View key={index} style={styles.stepContainer}>
                <View style={styles.stepHeader}>
                  <Text style={styles.stepNumber}>Step {index + 1}</Text>
                  {poolDetails.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeStep(index)}
                    >
                      <Ionicons name="close-circle" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={styles.stepInput}
                  value={step}
                  onChangeText={(value) => updateStep(index, value)}
                  placeholder={`Add step ${index + 1} (e.g., "Add 12oz chlorine")`}
                  multiline
                  numberOfLines={2}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  onEndEditing={Keyboard.dismiss}
                />
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={addStep}
          >
            <Ionicons name="add-circle" size={20} color="#00BFFF" />
            <Text style={styles.addButtonText}>Add Step</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAwareScrollView>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButtonText: {
    fontSize: 18,
    color: '#00BFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  stepsContainer: {
    marginBottom: 16,
  },
  stepContainer: {
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
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00BFFF',
  },
  removeButton: {
    padding: 4,
  },
  stepInput: {
    fontSize: 14,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#00BFFF',
    borderStyle: 'dashed',
  },
  addButtonText: {
    fontSize: 16,
    color: '#00BFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  bottomButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#00BFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginLeft: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default PoolDetailsScreen; 