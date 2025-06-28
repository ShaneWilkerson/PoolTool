import { auth, db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  try {
    console.log('Testing Firebase connection...');
    
    // Test Firestore connection
    console.log('Testing Firestore...');
    // NOTE: This test will fail with 'insufficient permissions' if your Firestore rules do not allow public or test access.
    // Make sure the collection being tested is accessible by the current user, or skip this test in production.
    const querySnapshot = await getDocs(collection(db, 'users'));
    console.log('Firestore connection successful');
    console.log('Number of users in database:', querySnapshot.size);
    
    // Test Auth connection
    console.log('Testing Auth...');
    console.log('Auth object:', auth);
    console.log('Current user:', auth.currentUser);
    
    return true;
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
}; 