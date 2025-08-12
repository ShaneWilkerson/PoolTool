import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCustomersForAccount } from '../src/firestoreLogic';
import { auth } from '../firebase';
import SelectedCustomerBox from '../src/SelectedCustomerBox';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const RecurringVisitScreen = ({ navigation, route }) => {
  const { editMode, recurringVisit } = route?.params || {};
  
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(editMode ? recurringVisit : null);
  const [searchQuery, setSearchQuery] = useState(editMode ? recurringVisit?.customerName || '' : '');
  const [tasks, setTasks] = useState(editMode ? recurringVisit?.tasks || [''] : ['']);
  const [frequency, setFrequency] = useState(editMode ? recurringVisit?.frequency || 'weekly' : 'weekly');
  const [dayOfWeek, setDayOfWeek] = useState(editMode ? recurringVisit?.dayOfWeek || 0 : (() => {
    const today = new Date();
    return today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  })());
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [rootLayout, setRootLayout] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await getCustomersForAccount(auth.currentUser.uid);
        setCustomers(data);
        setFilteredCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
        Alert.alert('Error', 'Failed to load customers');
      }
    };
    fetchCustomers();
    
    const unsubscribe = navigation.addListener('focus', fetchCustomers);
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCustomers(filtered.slice(0, 5));
    }
  }, [searchQuery, customers]);

  useEffect(() => {
    if (filteredCustomers.length > 0 && !selectedCustomer && searchQuery.trim() !== '') {
      setDropdownVisible(true);
    } else {
      setDropdownVisible(false);
    }
  }, [filteredCustomers, selectedCustomer, searchQuery]);

  const showDropdown = () => {
    if (inputRef.current) {
      inputRef.current.measureInWindow((x, y, width, height) => {
        setDropdownPosition({ top: y - rootLayout.y + height, left: x - rootLayout.x, width });
      });
    }
  };

  useEffect(() => {
    if (dropdownVisible) {
      setTimeout(showDropdown, 0);
    }
  }, [dropdownVisible]);

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSearchQuery(customer.name);
    setFilteredCustomers([]);
  };

  const addTask = () => {
    if (tasks.length < 10) {
      setTasks([...tasks, '']);
    }
  };

  const removeTask = (index) => {
    if (tasks.length > 1) {
      const newTasks = tasks.filter((_, i) => i !== index);
      setTasks(newTasks);
    }
  };

  const updateTask = (index, value) => {
    const newTasks = [...tasks];
    newTasks[index] = value;
    setTasks(newTasks);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getDayName = (dayIndex) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }

    const validTasks = tasks.filter(task => task.trim() !== '');
    if (validTasks.length === 0) {
      Alert.alert('Error', 'Please add at least one task');
      return;
    }

    if (!frequency) {
      Alert.alert('Error', 'Please select a frequency');
      return;
    }

    setLoading(true);
    try {
      const { db } = await import('../firebase');
      const { collection, addDoc, updateDoc, doc, serverTimestamp } = await import('firebase/firestore');
      const { auth } = await import('../firebase');

      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      if (editMode && recurringVisit) {
        // Update existing recurring visit
        const recurringVisitRef = doc(db, 'recurringVisits', recurringVisit.id);
        await updateDoc(recurringVisitRef, {
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          tasks: validTasks,
          frequency: frequency,
          dayOfWeek: dayOfWeek,
        });

        Alert.alert('Success', 'Recurring visit updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Create new recurring visit
        const recurringVisitData = {
          accountId: auth.currentUser.uid,
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.name,
          tasks: validTasks,
          frequency: frequency,
          dayOfWeek: dayOfWeek,
          createdAt: serverTimestamp(),
          active: true,
        };

        await addDoc(collection(db, 'recurringVisits'), recurringVisitData);

        Alert.alert('Success', 'Recurring visit template created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error saving recurring visit:', error);
      Alert.alert('Error', editMode ? 'Failed to update recurring visit' : 'Failed to create recurring visit');
    } finally {
      setLoading(false);
    }
  };

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container} onLayout={e => setRootLayout(e.nativeEvent.layout)}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#00BFFF" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <KeyboardAwareScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{editMode ? 'Edit Recurring Visit' : 'Create Recurring Visit'}</Text>

        {/* Customer Search */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Customer</Text>
          {!selectedCustomer && (
            <TextInput
              ref={inputRef}
              style={styles.searchInput}
              placeholder="Search for customer..."
              value={searchQuery}
              onChangeText={text => {
                setSearchQuery(text);
                setSelectedCustomer(null);
              }}
              onFocus={showDropdown}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
          )}
          {selectedCustomer && (
            <SelectedCustomerBox
              customer={selectedCustomer}
              onChange={() => {
                setSelectedCustomer(null);
                setSearchQuery('');
              }}
            />
          )}
        </View>

        {/* Recurrence Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recurrence</Text>
          
          {/* Day of Week (for weekly/bi-weekly) */}
          {(frequency === 'weekly' || frequency === 'biweekly') && (
            <>
              <Text style={styles.subsectionTitle}>Day of Week</Text>
              <View style={styles.dayOfWeekContainer}>
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayOfWeekButton,
                      dayOfWeek === index && styles.dayOfWeekButtonSelected
                    ]}
                    onPress={() => setDayOfWeek(index)}
                  >
                    <Text style={[
                      styles.dayOfWeekButtonText,
                      dayOfWeek === index && styles.dayOfWeekButtonTextSelected
                    ]}>
                      {day.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Frequency */}
          <Text style={styles.subsectionTitle}>Frequency</Text>
          <View style={styles.frequencyContainer}>
            {[
              { key: 'weekly', label: 'Every week' },
              { key: 'biweekly', label: 'Every 2 weeks' },
              { key: 'monthly', label: 'Every month' }
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.frequencyButton,
                  frequency === option.key && styles.frequencyButtonSelected
                ]}
                onPress={() => setFrequency(option.key)}
              >
                <Text style={[
                  styles.frequencyButtonText,
                  frequency === option.key && styles.frequencyButtonTextSelected
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          {tasks.map((task, index) => (
            <View key={index} style={styles.taskRow}>
              <TextInput
                style={styles.taskInput}
                placeholder={`Task ${index + 1}`}
                value={task}
                onChangeText={(value) => updateTask(index, value)}
                returnKeyType={index === tasks.length - 1 ? "done" : "next"}
                onSubmitEditing={() => {
                  if (index === tasks.length - 1) {
                    Keyboard.dismiss();
                  } else {
                    // Focus next input or add new task
                    if (index === tasks.length - 2 && tasks[tasks.length - 1].trim() === '') {
                      // If this is the second-to-last task and the last task is empty, focus the last task
                      // This will be handled by the next input
                    } else if (tasks.length < 10) {
                      addTask();
                    }
                  }
                }}
                blurOnSubmit={index === tasks.length - 1}
              />
              {tasks.length > 1 && (
                <TouchableOpacity
                  style={styles.removeTaskButton}
                  onPress={() => removeTask(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          
          {tasks.length < 10 && (
            <TouchableOpacity
              style={styles.addTaskButton}
              onPress={addTask}
            >
              <Ionicons name="add-circle" size={20} color="#00BFFF" />
              <Text style={styles.addTaskText}>Add Task</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Button */}
                    <TouchableOpacity
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? (editMode ? 'Updating...' : 'Creating...') : (editMode ? 'Update Recurring Visit' : 'Create Recurring Visit')}
              </Text>
            </TouchableOpacity>
      </KeyboardAwareScrollView>



      {/* Dropdown Overlay */}
      {dropdownVisible && (
        <View style={[styles.dropdownOverlay, { pointerEvents: 'box-none' }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setDropdownVisible(false)}
            pointerEvents="auto"
          />
          <View
            style={[
              styles.suggestionDropdown,
              {
                position: 'absolute',
                top: dropdownPosition.top,
                left: dropdownPosition.left,
                width: dropdownPosition.width,
                zIndex: 9999,
                backgroundColor: '#fff',
              },
            ]}
            pointerEvents="auto"
          >
            {filteredCustomers.map((customer) => (
              <TouchableOpacity
                key={customer.id}
                style={styles.suggestionItem}
                onPress={() => {
                  setSelectedCustomer(customer);
                  setSearchQuery(customer.name);
                  setFilteredCustomers([]);
                  setDropdownVisible(false);
                }}
              >
                <Text style={styles.customerName}>{customer.name}</Text>
                <Text style={styles.customerEmail}>{customer.email}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#00BFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 16,
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },

  frequencyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  frequencyButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  frequencyButtonSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#00BFFF',
  },
  frequencyButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  frequencyButtonTextSelected: {
    color: '#00BFFF',
    fontWeight: '600',
  },
  dayOfWeekContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayOfWeekButton: {
    width: '13%',
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e1e5e9',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayOfWeekButtonSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#00BFFF',
  },
  dayOfWeekButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  dayOfWeekButtonTextSelected: {
    color: '#00BFFF',
    fontWeight: '600',
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskInput: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    marginRight: 8,
  },
  removeTaskButton: {
    padding: 8,
  },
  addTaskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addTaskText: {
    color: '#00BFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: '#00BFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },

  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  suggestionDropdown: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 100,
    zIndex: 9999,
    maxHeight: 200,
    backgroundColor: '#fff',
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  customerEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});

export default RecurringVisitScreen; 