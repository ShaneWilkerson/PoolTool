// This script can be run to create the demo user account
// Run this in your Firebase console or use Firebase Admin SDK

import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

const createDemoUser = async () => {
  try {
    // Create the demo user
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      'johnapple@gmail.com', 
      'poollover'
    );
    
    const user = userCredential.user;

    // Update profile with company name
    await updateProfile(user, {
      displayName: 'John Apple'
    });

    // Save user data to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      companyName: 'John Apple',
      email: 'johnapple@gmail.com',
      createdAt: new Date(),
    });

    console.log('Demo user created successfully!');
    console.log('Email: johnapple@gmail.com');
    console.log('Password: poollover');
    
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('Demo user already exists!');
    } else {
      console.error('Error creating demo user:', error);
    }
  }
};

// Uncomment the line below to run this script
// createDemoUser();

// Run this script once to clean up all customers for the current user
async function cleanupCustomers() {
  const q = query(
    collection(db, 'customers'),
    where('accountId', '==', auth.currentUser.uid)
  );
  const snapshot = await getDocs(q);
  for (const d of snapshot.docs) {
    await updateDoc(doc(db, 'customers', d.id), {
      isActive: true,
      deleted: false,
    });
  }
  console.log('All customers set to isActive: true, deleted: false');
}

cleanupCustomers(); 