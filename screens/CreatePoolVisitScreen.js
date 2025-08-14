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
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCustomersForAccount, addPoolVisit } from '../src/firestoreLogic';
import { auth } from '../firebase';
import SelectedCustomerBox from '../src/SelectedCustomerBox';
import DateSelector from '../src/DateSelector';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

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
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('weekly');
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState(null);
  const inputRef = useRef();
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const [rootLayout, setRootLayout] = useState({ x: 0, y: 0 });
  const taskInputRefs = useRef({});
  const scrollViewRef = useRef(null);

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
    
    // Add focus listener to refresh customers when screen comes into focus
    const unsubscribe = navigation.addListener('focus', fetchCustomers);
    return unsubscribe;
  }, [navigation]);

  // Handle recurring section changes smoothly
  useEffect(() => {
    if (isRecurring && selectedDay) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      setRecurrenceDayOfWeek(dayNames[selectedDay.getDay()]);
    }
  }, [isRecurring, selectedDay]);

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

  // Show dropdown when typing
  useEffect(() => {
    if (filteredCustomers.length > 0 && !selectedCustomer && searchQuery.trim() !== '') {
      setDropdownVisible(true);
    } else {
      setDropdownVisible(false);
    }
  }, [filteredCustomers, selectedCustomer, searchQuery]);

  // Measure input position for dropdown
  const showDropdown = () => {
    if (inputRef.current) {
      inputRef.current.measureInWindow((x, y, width, height) => {
        setDropdownPosition({ top: y - rootLayout.y + height, left: x - rootLayout.x, width });
      });
    }
  };

  useEffect(() => {
    if (dropdownVisible) {
      setTimeout(showDropdown, 0); // Wait for layout
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

  const handleRecurringToggle = () => {
    setIsRecurring(!isRecurring);
    if (!isRecurring) {
      // When enabling recurring, set the day of week based on selected date
      if (selectedDay) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        setRecurrenceDayOfWeek(dayNames[selectedDay.getDay()]);
      }
    } else {
      // When disabling recurring, clear the recurrence settings
      setRecurrenceFrequency('weekly');
      setRecurrenceDayOfWeek(null);
    }
  };

  const handleTaskSubmit = (index) => {
    if (index < tasks.length - 1) {
      // Focus next input
      if (taskInputRefs.current[index + 1]) {
        taskInputRefs.current[index + 1].focus();
      }
    } else {
      // Last input, add new task and focus it
      addTask();
      setTimeout(() => {
        if (taskInputRefs.current[tasks.length]) {
          taskInputRefs.current[tasks.length].focus();
        }
      }, 100);
    }
  };

  const scrollToInput = (inputRef) => {
    if (inputRef && scrollViewRef.current) {
      inputRef.measureLayout(
        scrollViewRef.current,
        (x, y) => {
          // Smooth scroll to the input position
          scrollViewRef.current?.scrollTo({
            y: y - 100, // Offset to show some context above
            animated: true
          });
        },
        () => {}
      );
    }
  };

  // Week navigation
  const changeWeek = (direction) => {
    const newStart = new Date(selectedWeekStart);
    newStart.setDate(newStart.getDate() + direction * 7);
    // Allow navigating up to 6 months back and 6 months forward
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    sixMonthsAgo.setHours(0, 0, 0, 0);
    if (newStart <= sixMonthsFromNow && newStart >= sixMonthsAgo) {
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

    if (isRecurring && !recurrenceDayOfWeek) {
      Alert.alert('Error', 'Please select a day of week for recurring visits');
      return;
    }

    setLoading(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(selectedDay);
      selected.setHours(0, 0, 0, 0);
      const isPast = selected < today;

      // Create as a regular pool visit with recurring properties
      await addPoolVisit({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerEmail: selectedCustomer.email,
        scheduledDate: selectedDay,
        tasks: validTasks,
        isRecurring: isRecurring,
        recurrenceFrequency: isRecurring ? recurrenceFrequency : null,
        recurrenceDayOfWeek: isRecurring ? recurrenceDayOfWeek : null,
        ...(isPast ? { completed: true, completedAt: selected } : {}),
      });
      
      Alert.alert('Success', 'Pool visit created successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error creating visit:', error);
      Alert.alert('Error', 'Failed to create visit');
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

      <KeyboardAwareScrollView 
        ref={scrollViewRef}
        style={styles.scrollView} 
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        enableAutomaticScroll={true}
        extraScrollHeight={100}
        extraHeight={150}
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 150 }}
        scrollEnabled={true}
        bounces={false}
        alwaysBounceVertical={false}
      >
        <Text style={styles.title}>Create Pool Visit</Text>

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

        {/* Date Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <DateSelector
            selectedWeekStart={selectedWeekStart}
            setSelectedWeekStart={setSelectedWeekStart}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
          />
        </View>

        {/* Recurring Checkbox */}
        <View style={styles.section}>
          <View style={styles.recurringRow}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={handleRecurringToggle}
            >
              <View style={[styles.checkbox, isRecurring && styles.checkboxChecked]}>
                {isRecurring && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text style={styles.recurringLabel}>Make this a recurring visit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recurrence Options (only show when recurring is enabled) */}
        {isRecurring && (
          <View style={styles.section}>
            <View style={styles.recurrenceCard}>
              <Text style={styles.recurrenceTitle}>Recurrence</Text>
              
              {/* Frequency Selection */}
              <View style={styles.frequencySection}>
                <Text style={styles.optionLabel}>Frequency</Text>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      recurrenceFrequency === 'weekly' && styles.segmentButtonActive
                    ]}
                    onPress={() => setRecurrenceFrequency('weekly')}
                  >
                    <Text style={[
                      styles.segmentButtonText,
                      recurrenceFrequency === 'weekly' && styles.segmentButtonTextActive
                    ]}>
                      Once a week
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      recurrenceFrequency === 'biweekly' && styles.segmentButtonActive
                    ]}
                    onPress={() => setRecurrenceFrequency('biweekly')}
                  >
                    <Text style={[
                      styles.segmentButtonText,
                      recurrenceFrequency === 'biweekly' && styles.segmentButtonTextActive
                    ]}>
                      Every 2 weeks
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentButton,
                      recurrenceFrequency === 'monthly' && styles.segmentButtonActive
                    ]}
                    onPress={() => setRecurrenceFrequency('monthly')}
                  >
                    <Text style={[
                      styles.segmentButtonText,
                      recurrenceFrequency === 'monthly' && styles.segmentButtonTextActive
                    ]}>
                      Every month
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Day of Week Selection */}
              <View style={styles.dayOfWeekSection}>
                <Text style={styles.optionLabel}>Day of week</Text>
                <View style={styles.selectedDayDisplay}>
                  <Text style={styles.selectedDayText}>
                    {recurrenceDayOfWeek || 'Select a date above'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Tasks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          {tasks.map((task, index) => (
            <View key={index} style={styles.taskRow}>
              <TextInput
                ref={el => taskInputRefs.current[index] = el}
                style={styles.taskInput}
                placeholder={`Task ${index + 1}`}
                value={task}
                onChangeText={(value) => updateTask(index, value)}
                onSubmitEditing={() => handleTaskSubmit(index)}
                returnKeyType="next"
                blurOnSubmit={false}
                multiline={false}
                autoCapitalize="sentences"
                onFocus={() => {
                  // Smooth scroll to input to prevent jumping
                  setTimeout(() => scrollToInput(taskInputRefs.current[index]), 50);
                }}
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
            {loading ? 'Creating...' : (isRecurring ? 'Create Recurring Visit' : 'Create Pool Visit')}
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      {/* Dropdown Overlay (not Modal) */}
      {dropdownVisible && (
        <View style={[styles.dropdownOverlay, { pointerEvents: 'box-none' }]}> 
          {/* Tap outside to close */}
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
  recurringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#00BFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: '#00BFFF',
    borderColor: '#00BFFF',
  },
  recurringLabel: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  recurrenceCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    marginTop: 8,
    minHeight: 200, // Prevent layout shifts
  },
  recurrenceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  frequencySection: {
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentButtonActive: {
    backgroundColor: '#00BFFF',
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  segmentButtonTextActive: {
    color: 'white',
  },
  dayOfWeekSection: {
    marginTop: 16,
  },
  selectedDayDisplay: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
});

export default CreatePoolVisitScreen; 