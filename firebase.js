import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';

// Firebase project configuration
const firebaseConfig = Constants.expoConfig.extra.firebase;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore and Auth for use in the rest of the app
export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const storage = getStorage(app);