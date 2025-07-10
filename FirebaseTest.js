import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export const testFirebaseConnection = async () => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('Not signed in');
    // Try to read the user's own document (should exist if user is registered)
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    return userDoc.exists();
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return false;
  }
}; 