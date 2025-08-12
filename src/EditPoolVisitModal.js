import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { updatePoolVisit, stopRecurringVisits, updateRecurringVisits } from './firestoreLogic';

const EditPoolVisitModal = ({ visible, poolVisit, onClose, onSave }) => {
  const [tasks, setTasks] = useState(['']);
  const [loading, setLoading] = useState(false);
  const [stopRecurring, setStopRecurring] = useState(false);

  // Update tasks when poolVisit changes
  React.useEffect(() => {
    if (poolVisit?.tasks) {
      setTasks(poolVisit.tasks);
    } else {
      setTasks(['']);
    }
    // Reset stop recurring option when modal opens
    setStopRecurring(false);
  }, [poolVisit]);

  const addTask = () => {
    setTasks([...tasks, '']);
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

  const handleSave = async () => {
    const filteredTasks = tasks.filter(task => task.trim() !== '');
    
    if (filteredTasks.length === 0) {
      Alert.alert('Error', 'At least one task is required');
      return;
    }

    // If stopping recurring, show confirmation first
    if (stopRecurring && poolVisit?.isRecurring) {
      Alert.alert(
        'Stop Recurring Visits',
        'This will remove all future scheduled pool visits for this recurring pattern. Are you sure you want to continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Stop Recurring',
            style: 'destructive',
            onPress: async () => {
              await performSave(filteredTasks, true);
            }
          }
        ]
      );
      return;
    }

    await performSave(filteredTasks, false);
  };

  const performSave = async (filteredTasks, isStoppingRecurring) => {
    setLoading(true);
    try {
      // If stopping recurring, do that first
      if (isStoppingRecurring) {
        await stopRecurringVisits(poolVisit.id);
      } else if (poolVisit?.isRecurring) {
        // If it's still recurring, update all future visits with the new tasks
        await updateRecurringVisits(poolVisit.id, {
          tasks: filteredTasks,
        });
      }
      
      // Update the pool visit
      await updatePoolVisit(poolVisit.id, {
        tasks: filteredTasks,
      });
      
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating pool visit:', error);
      Alert.alert('Error', 'Failed to update pool visit');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Changes',
      'Are you sure you want to continue without saving?',
      [
        {
          text: 'Keep Editing',
          style: 'cancel',
        },
        {
          text: 'Discard Changes',
          style: 'destructive',
          onPress: onClose,
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Pool Visit</Text>
          
          <ScrollView style={styles.scrollView}>
            <Text style={styles.sectionTitle}>Tasks</Text>
            {tasks.map((task, index) => (
              <View key={index} style={styles.taskContainer}>
                <TextInput
                  style={styles.taskInput}
                  placeholder="Enter task description"
                  value={task}
                  onChangeText={(value) => updateTask(index, value)}
                  multiline
                />
                {tasks.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeTask(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            
            <TouchableOpacity
              style={styles.addButton}
              onPress={addTask}
            >
              <Ionicons name="add-circle-outline" size={24} color="#00BFFF" />
              <Text style={styles.addButtonText}>Add Task</Text>
            </TouchableOpacity>

            {/* Recurring Options - only show for recurring visits */}
            {poolVisit?.isRecurring && (
              <View style={styles.recurringSection}>
                <Text style={styles.sectionTitle}>Recurring Options</Text>
                <View style={styles.recurringInfo}>
                  <Ionicons name="repeat" size={16} color="#00BFFF" />
                  <Text style={styles.recurringText}>
                    {poolVisit.recurrenceFrequency === 'weekly' ? 'Every week' : 
                     poolVisit.recurrenceFrequency === 'biweekly' ? 'Every 2 weeks' : 
                     'Every month'} on {poolVisit.recurrenceDayOfWeek}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.stopRecurringContainer}
                  onPress={() => setStopRecurring(!stopRecurring)}
                >
                  <View style={[styles.checkbox, stopRecurring && styles.checkboxChecked]}>
                    {stopRecurring && <Ionicons name="checkmark" size={16} color="white" />}
                  </View>
                  <Text style={styles.stopRecurringText}>Stop recurring</Text>
                </TouchableOpacity>
                
                {stopRecurring && (
                  <Text style={styles.stopRecurringWarning}>
                    This will remove all future scheduled pool visits for this recurring pattern.
                  </Text>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCancel}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={() => {
                Alert.alert(
                  'Save Changes',
                  'Are you sure you want to save these changes?',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Save',
                      onPress: handleSave,
                    },
                  ]
                );
              }}
              disabled={loading}
            >
              <Text style={styles.modalButtonTextPrimary}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  scrollView: {
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  taskContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskInput: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
    marginRight: 8,
    minHeight: 50,
  },
  removeButton: {
    padding: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  addButtonText: {
    color: '#00BFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#00BFFF',
  },
  modalButtonText: {
    fontSize: 16,
    color: '#666',
  },
  modalButtonTextPrimary: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  recurringSection: {
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  recurringInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  recurringText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 8,
  },
  stopRecurringContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#00BFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#00BFFF',
    borderColor: '#00BFFF',
  },
  stopRecurringText: {
    fontSize: 14,
    color: '#00BFFF',
    fontWeight: '600',
  },
  stopRecurringWarning: {
    fontSize: 12,
    color: '#FF3B30',
    marginTop: 5,
  },
});

export default EditPoolVisitModal; 