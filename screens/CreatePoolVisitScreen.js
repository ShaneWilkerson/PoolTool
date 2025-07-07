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
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCustomersForAccount, addPoolVisit } from '../src/firestoreLogic';
import { auth } from '../firebase';

// Helper to get days in the selected week
const getWeekDays = (weekStart) => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push(d);
  }
  return days;
};

const CreatePoolVisitScreen = ({ navigation }) => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Start of week (Sunday)
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return start;
  });
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Only select today if it's in the initial week
    const weekDays = getWeekDays(selectedWeekStart);
    const found = weekDays.find(d => d.toDateString() === today.toDateString());
    return found ? today : null;
  });
  const [tasks, setTasks] = useState(['']);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef();
  const [dropdownTop, setDropdownTop] = useState(0);

  // Helper to get start of this week
  const getStartOfThisWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return start;
  };
  const initialWeekStart = getStartOfThisWeek();
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

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
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCustomers(filtered.slice(0, 5)); // Limit to 5 results
    }
  }, [searchQuery, customers]);

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

  // Week navigation
  const changeWeek = (direction) => {
    const newStart = new Date(selectedWeekStart);
    newStart.setDate(newStart.getDate() + direction * 7);
    // Limit to 6 months in advance, but allow going back to the initial week
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    if (newStart <= sixMonthsFromNow && newStart >= initialWeekStart) {
      setSelectedWeekStart(newStart);
      setSelectedDay(null); // Do not auto-select any day when changing weeks
    }
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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

    setLoading(true);
    try {
      await addPoolVisit({
        customerId: selectedCustomer.id,
        scheduledDate: selectedDay,
        tasks: validTasks,
      });
      
      Alert.alert('Success', 'Pool visit created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error creating pool visit:', error);
      Alert.alert('Error', 'Failed to create pool visit');
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
    <SafeAreaView style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#00BFFF" />
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>

      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Create Pool Visit</Text>

        {/* Customer Search */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Customer</Text>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Search for customer..."
            value={searchQuery}
            onChangeText={text => {
              setSearchQuery(text);
              setSelectedCustomer(null);
            }}
            autoCapitalize="words"
          />
          {filteredCustomers.length > 0 && !selectedCustomer && searchQuery.trim() !== '' && (
            <View style={[styles.suggestionDropdown, { marginTop: 4 }]}>
              {filteredCustomers.map((customer) => (
                <TouchableOpacity
                  key={customer.id}
                  style={styles.suggestionItem}
                  onPress={() => selectCustomer(customer)}
                >
                  <Text style={styles.customerName}>{customer.name}</Text>
                  <Text style={styles.customerEmail}>{customer.email}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {selectedCustomer && (
            <View style={styles.selectedCustomer}>
              <Text style={styles.selectedCustomerText}>
                Selected: {selectedCustomer.name}
              </Text>
              <TouchableOpacity
                style={styles.changeCustomerButton}
                onPress={() => {
                  setSelectedCustomer(null);
                  setSearchQuery('');
                }}
              >
                <Text style={styles.changeCustomerText}>Change</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Date Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          {/* Week Navigation */}
          <View style={styles.dateSelector}>
            <TouchableOpacity
              style={styles.dateArrow}
              onPress={() => changeWeek(-1)}
            >
              <Ionicons name="chevron-back" size={24} color="#00BFFF" />
            </TouchableOpacity>
            <View style={styles.dateDisplay}>
              <Text style={styles.dateText}>
                Week of {selectedWeekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.dateArrow}
              onPress={() => changeWeek(1)}
            >
              <Ionicons name="chevron-forward" size={24} color="#00BFFF" />
            </TouchableOpacity>
          </View>
          {/* Days of the week */}
          <View style={styles.weekDaysRow}>
            {getWeekDays(selectedWeekStart).map((day, idx) => {
              const isSelected = selectedDay && day.toDateString() === selectedDay.toDateString();
              // Only apply today style if not selected
              const isToday = !isSelected && day.toDateString() === todayDate.toDateString();
              // Limit to 6 months in advance
              const sixMonthsFromNow = new Date();
              sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
              // Only allow selecting today or future days
              const isDisabled = day < todayDate || day > sixMonthsFromNow;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.dayButton, isSelected ? styles.selectedDayButton : isToday ? styles.todayButton : null, isDisabled && styles.disabledDayButton]}
                  onPress={() => {
                    if (isDisabled) return;
                    setSelectedDay(day);
                  }}
                  disabled={isDisabled}
                >
                  <Text style={[styles.dayButtonText, isSelected ? styles.selectedDayButtonText : isToday ? styles.todayButtonText : null, isDisabled && styles.disabledDayButtonText]}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.dayButtonText, isSelected ? styles.selectedDayButtonText : isToday ? styles.todayButtonText : null, isDisabled && styles.disabledDayButtonText]}>
                    {day.getDate()}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedDay && (
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <Text style={{ fontSize: 16, color: '#00BFFF', fontWeight: 'bold' }}>
                Selected: {selectedDay.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            </View>
          )}
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
            {loading ? 'Creating...' : 'Create Pool Visit'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  customerList: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
  },
  customerItem: {
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
  selectedCustomer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  selectedCustomerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00BFFF',
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  dateArrow: {
    padding: 8,
  },
  dateDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dayButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  selectedDayButton: {
    backgroundColor: '#e3f2fd',
  },
  selectedDayButtonText: {
    fontWeight: 'bold',
    color: '#00BFFF',
  },
  todayButton: {
    backgroundColor: '#e3f2fd',
  },
  todayButtonText: {
    fontWeight: 'bold',
    color: '#00BFFF',
  },
  disabledDayButton: {
    backgroundColor: '#f0f0f0',
  },
  disabledDayButtonText: {
    color: '#ccc',
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
  suggestionDropdown: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
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
  },
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
});

export default CreatePoolVisitScreen; 