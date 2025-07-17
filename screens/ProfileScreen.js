import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  signOut, 
  updateEmail, 
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser
} from 'firebase/auth';
import { doc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        // Fetch user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
    });

    return unsubscribe;
  }, []);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter a new email address');
      return;
    }

    setLoading(true);
    try {
      await updateEmail(user, newEmail);
      
      // Update email in Firestore
      await updateDoc(doc(db, 'users', user.uid), {
        email: newEmail,
      });

      Alert.alert('Success', 'Email updated successfully');
      setShowEmailModal(false);
      setNewEmail('');
    } catch (error) {
      Alert.alert('Error', 'Failed to update email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      Alert.alert('Success', 'Password updated successfully');
      setShowPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Current password is incorrect');
      } else {
        Alert.alert('Error', 'Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      Alert.alert('Error', 'Please enter your password to confirm account deletion');
      return;
    }

    setLoading(true);
    try {
      // Re-authenticate user before deleting account
      const credential = EmailAuthProvider.credential(user.email, deletePassword);
      await reauthenticateWithCredential(user, credential);

      // Delete all user data from Firestore
      const userId = user.uid;
      
      // Delete user document
      await deleteDoc(doc(db, 'users', userId));
      
      // Delete all customers associated with this user
      const customersQuery = query(collection(db, 'customers'), where('userId', '==', userId));
      const customersSnapshot = await getDocs(customersQuery);
      const customerDeletions = customersSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(customerDeletions);
      
      // Delete all pool visits associated with this user
      const visitsQuery = query(collection(db, 'poolVisits'), where('userId', '==', userId));
      const visitsSnapshot = await getDocs(visitsQuery);
      const visitDeletions = visitsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(visitDeletions);
      
      // Delete all expenses associated with this user
      const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', userId));
      const expensesSnapshot = await getDocs(expensesQuery);
      const expenseDeletions = expensesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(expenseDeletions);
      
      // Delete all invoices associated with this user
      const invoicesQuery = query(collection(db, 'invoices'), where('userId', '==', userId));
      const invoicesSnapshot = await getDocs(invoicesQuery);
      const invoiceDeletions = invoicesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(invoiceDeletions);
      
      // Delete all to-dos associated with this user
      const todosQuery = query(collection(db, 'todos'), where('userId', '==', userId));
      const todosSnapshot = await getDocs(todosQuery);
      const todoDeletions = todosSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(todoDeletions);
      
      // Delete all supply stores associated with this user
      const storesQuery = query(collection(db, 'supplyStores'), where('userId', '==', userId));
      const storesSnapshot = await getDocs(storesQuery);
      const storeDeletions = storesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(storeDeletions);
      
      // Finally, delete the Firebase Auth account
      await deleteUser(user);
      
      Alert.alert('Account Deleted', 'Your account and all associated data have been permanently deleted.');
    } catch (error) {
      if (error.code === 'auth/wrong-password') {
        Alert.alert('Error', 'Password is incorrect');
      } else {
        Alert.alert('Error', 'Failed to delete account. Please try again.');
        console.error('Delete account error:', error);
      }
    } finally {
      setLoading(false);
      setShowDeleteAccountModal(false);
      setDeletePassword('');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Removed the floating back arrow button */}
      <ScrollView style={styles.scrollView}>
        {/* Profile Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {getInitials(userData?.companyName || user.displayName || user.email)}
            </Text>
          </View>
        </View>

        {/* User Info */}
        <View style={styles.infoContainer}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Company Name</Text>
            <Text style={styles.infoValue}>
              {userData?.companyName || user.displayName || 'Not set'}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setShowEmailModal(true)}
            >
              <Text style={styles.editButtonText}>Update Email</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Password</Text>
            <Text style={styles.infoValue}>••••••••</Text>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setShowPasswordModal(true)}
            >
              <Text style={styles.editButtonText}>Update Password</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity 
          style={styles.deleteAccountButton} 
          onPress={() => {
            Alert.alert(
              'Delete Account',
              'Are you sure you want to delete your account? This action cannot be undone and will permanently delete all your data including customers, pool visits, expenses, invoices, and todos.',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Delete Account',
                  style: 'destructive',
                  onPress: () => setShowDeleteAccountModal(true),
                },
              ]
            );
          }}
        >
          <Ionicons name="trash-outline" size={24} color="white" />
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Email Update Modal */}
      <Modal
        visible={showEmailModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Email</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="New email address"
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowEmailModal(false);
                  setNewEmail('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleUpdateEmail}
                disabled={loading}
              >
                <Text style={styles.modalButtonTextPrimary}>
                  {loading ? 'Updating...' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Update Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
            <TextInput
              style={styles.modalInput}
              placeholder="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword('');
                  setNewPassword('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleUpdatePassword}
                disabled={loading}
              >
                <Text style={styles.modalButtonTextPrimary}>
                  {loading ? 'Updating...' : 'Update'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteAccountModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalWarning}>
              This action cannot be undone. All your data including customers, pool visits, expenses, invoices, and todos will be permanently deleted.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter your password to confirm"
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setShowDeleteAccountModal(false);
                  setDeletePassword('');
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonDanger]}
                onPress={handleDeleteAccount}
                disabled={loading}
              >
                <Text style={styles.modalButtonTextDanger}>
                  {loading ? 'Deleting...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#00BFFF',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  avatarContainer: {
    alignItems: 'center',
    padding: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#00BFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
  },
  infoContainer: {
    padding: 16,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  editButton: {
    alignSelf: 'flex-start',
  },
  editButtonText: {
    color: '#00BFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  signOutText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B0000',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
  },
  deleteAccountText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
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
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalWarning: {
    fontSize: 14,
    color: '#8B0000',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  modalButtonDanger: {
    backgroundColor: '#8B0000',
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
  modalButtonTextDanger: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});

export default ProfileScreen; 