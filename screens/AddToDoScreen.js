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
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCustomersForAccount, addTodo } from '../src/firestoreLogic';
import { auth } from '../firebase';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import SelectedCustomerBox from '../src/SelectedCustomerBox';

const getWeekDays = (weekStart) => {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    days.push(d);
  }
  return days;
};

const AddToDoScreen = ({ navigation, route }) => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(route.params?.selectedCustomer || null);
  useEffect(() => {
    if (route.params?.selectedCustomer) {
      setSelectedCustomer(route.params.selectedCustomer);
    }
  }, [route.params?.selectedCustomer]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    return start;
  });
  const [selectedDay, setSelectedDay] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekDays = getWeekDays(selectedWeekStart);
    const found = weekDays.find(d => d.toDateString() === today.toDateString());
    return found ? today : null;
  });
  const [todoItems, setTodoItems] = useState(['']);
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
    
    // Add focus listener to refresh customers when screen comes into focus
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

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setSearchQuery(customer.name);
    setFilteredCustomers([]);
  };

  const addTodoItem = () => {
    if (todoItems.length < 10) {
      setTodoItems([...todoItems, '']);
    }
  };

  const removeTodoItem = (index) => {
    if (todoItems.length > 1) {
      const newItems = todoItems.filter((_, i) => i !== index);
      setTodoItems(newItems);
    }
  };

  const updateTodoItem = (index, value) => {
    const newItems = [...todoItems];
    newItems[index] = value;
    setTodoItems(newItems);
  };

  const changeWeek = (direction) => {
    const newStart = new Date(selectedWeekStart);
    newStart.setDate(newStart.getDate() + direction * 7);
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
    if (newStart <= sixMonthsFromNow) {
      setSelectedWeekStart(newStart);
      setSelectedDay(null);
    }
  };

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const showDropdown = () => {
    if (inputRef.current) {
      inputRef.current.measureInWindow((x, y, width, height) => {
        setDropdownPosition({ top: y + height, left: x, width });
      });
    }
  };

  useEffect(() => {
    if (dropdownVisible) {
      setTimeout(showDropdown, 0);
    }
  }, [dropdownVisible]);

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }
    const validItems = todoItems.filter(item => item.trim() !== '');
    if (validItems.length === 0) {
      Alert.alert('Error', 'Please add at least one to-do item');
      return;
    }
    if (!selectedDay) {
      Alert.alert('Error', 'Please select a date');
      return;
    }
    setLoading(true);
    try {
      await addTodo({
        customerId: selectedCustomer.id,
        date: selectedDay,
        dueDate: selectedDay,
        items: validItems,
        latitude: selectedCustomer.latitude,
        longitude: selectedCustomer.longitude,
        address: selectedCustomer.address || '',
      });
      Alert.alert('Success', 'To-do item(s) added successfully', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error adding to-do:', error);
      Alert.alert('Error', 'Failed to add to-do');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} onLayout={e => setRootLayout(e.nativeEvent.layout)}>
      <KeyboardAwareScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add To-do Item</Text>
        {/* Customer Search */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Customer</Text>
          {!selectedCustomer ? (
            <TouchableOpacity onPress={() => navigation.navigate('CustomerPicker', { onSelectScreen: 'AddToDo' })}>
              <View style={[styles.searchInput, { justifyContent: 'center', minHeight: 48 }]}>
                <Text style={{ color: '#aaa' }}>Tap to select customer...</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <SelectedCustomerBox
              customer={selectedCustomer}
              onChange={() => {
                setSelectedCustomer(null);
                navigation.navigate('CustomerPicker', { onSelectScreen: 'AddToDo' });
              }}
            />
          )}
        </View>
        {/* Date Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
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
          <View style={styles.weekDaysRow}>
            {getWeekDays(selectedWeekStart).map((day, idx) => {
              const isSelected = selectedDay && day.toDateString() === selectedDay.toDateString();
              const isToday = !isSelected && day.toDateString() === todayDate.toDateString();
              const sixMonthsFromNow = new Date();
              sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);
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
        {/* To-do Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>To-do Item(s)</Text>
          {todoItems.map((item, index) => (
            <View key={index} style={styles.taskRow}>
              <TextInput
                style={styles.taskInput}
                placeholder={`To-do Item ${index + 1}`}
                value={item}
                onChangeText={(value) => updateTodoItem(index, value)}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              {todoItems.length > 1 && (
                <TouchableOpacity
                  style={styles.removeTaskButton}
                  onPress={() => removeTodoItem(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
          ))}
          {todoItems.length < 10 && (
            <TouchableOpacity
              style={styles.addTaskButton}
              onPress={addTodoItem}
            >
              <Ionicons name="add-circle" size={20} color="#00BFFF" />
              <Text style={styles.addTaskText}>Add To-do Item</Text>
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
            {loading ? 'Adding...' : 'Add to To-do List'}
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
      {/* Dropdown Overlay (not Modal, not portal) */}
      {dropdownVisible && (
        <View style={{ position: 'absolute', top: dropdownPosition.top, left: dropdownPosition.left, width: dropdownPosition.width, zIndex: 9999 }} pointerEvents="box-none">
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setDropdownVisible(false)}
            pointerEvents="auto"
          />
          <View
            style={{
              backgroundColor: 'white',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#e1e5e9',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 3.84,
              elevation: 100,
              maxHeight: 200,
            }}
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
  suggestionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
});

export default AddToDoScreen; 