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
import { updateTodo } from './firestoreLogic';

const EditTodoModal = ({ visible, todo, onClose, onSave }) => {
  const [items, setItems] = useState(['']);
  const [loading, setLoading] = useState(false);

  // Update form data when todo changes
  React.useEffect(() => {
    if (todo) {
      setItems(todo.items || ['']);
    } else {
      setItems(['']);
    }
  }, [todo]);

  const addItem = () => {
    setItems([...items, '']);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const updateItem = (index, value) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
  };

  const handleSave = async () => {
    const filteredItems = items.filter(item => item.trim() !== '');
    
    if (filteredItems.length === 0) {
      Alert.alert('Error', 'At least one item is required');
      return;
    }

    setLoading(true);
    try {
      await updateTodo(todo.id, {
        items: filteredItems,
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating todo:', error);
      Alert.alert('Error', 'Failed to update todo');
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
          <Text style={styles.modalTitle}>Edit To-Do Item</Text>
          
          <ScrollView style={styles.scrollView}>
            <Text style={styles.sectionTitle}>Items</Text>
            {items.map((item, index) => (
              <View key={index} style={styles.itemContainer}>
                <TextInput
                  style={styles.itemInput}
                  placeholder="Enter item description"
                  value={item}
                  onChangeText={(value) => updateItem(index, value)}
                  multiline
                />
                {items.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeItem(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            
            <TouchableOpacity
              style={styles.addButton}
              onPress={addItem}
            >
              <Ionicons name="add-circle-outline" size={24} color="#00BFFF" />
              <Text style={styles.addButtonText}>Add Item</Text>
            </TouchableOpacity>
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
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInput: {
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
});

export default EditTodoModal; 