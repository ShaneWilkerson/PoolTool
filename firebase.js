import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage } from 'firebase/storage';

// Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDiEzrpfPekEL3ulD70tiVLs6EN6lA4DUI",
  authDomain: "pooltracker-87e13.firebaseapp.com",
  projectId: "pooltracker-87e13",
  storageBucket: "pooltracker-87e13.firebasestorage.app",
  messagingSenderId: "385220361172",
  appId: "1:385220361172:web:0257b388bdcddfca44f441"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore and Auth for use in the rest of the app
export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const storage = getStorage(app);