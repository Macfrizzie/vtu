

'use client';

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword as firebaseSignIn,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { app } from './client-app';
import { createStrowalletVirtualAccount } from '@/services/strowallet';

const auth = getAuth(app);
const db = getFirestore(app);

async function createUserDocument(user: User) {
  if (!user.email || !user.displayName) {
    throw new Error('User email or display name is missing.');
  }

  const userRef = doc(db, 'users', user.uid);
  
  // Create a placeholder document first
  const initialData = {
    uid: user.uid,
    email: user.email,
    fullName: user.displayName,
    role: 'Customer',
    createdAt: new Date(),
    walletBalance: 0,
    status: 'Active',
    lastLogin: new Date(),
    reservedAccount: null, // Placeholder
  };
  await setDoc(userRef, initialData);
  console.log(`[Auth] User document created for ${user.uid}. Now creating virtual account.`);

  // Now, create the virtual account
  try {
    const strowalletAccount = await createStrowalletVirtualAccount({
      email: user.email,
      phone: user.phoneNumber || '', 
      account_name: user.displayName,
    });
    
    // Update the user document with the new account details
    await setDoc(userRef, {
      reservedAccount: {
        provider: 'Strowallet',
        accountNumber: strowalletAccount.account_number,
        accountName: strowalletAccount.account_name,
        bankName: strowalletAccount.bank,
      },
    }, { merge: true });
     console.log(`[Auth] Strowallet virtual account created and saved for ${user.uid}.`);

  } catch (error) {
    console.error(`[Auth] Failed to create Strowallet virtual account for ${user.uid}:`, error);
    // Continue even if it fails, so user creation doesn't completely fail.
  }
}

export async function signUpWithEmailAndPassword(email: string, password: string, fullName: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = userCredential;
  await updateProfile(user, { displayName: fullName });
  await createUserDocument(user);
  return userCredential;
}

export function signInWithEmailAndPassword(email: string, password: string) {
  return firebaseSignIn(auth, email, password);
}

export function onAuthStateChangedHelper(callback: (user: any) => void) {
  return onAuthStateChanged(auth, callback);
}

export function sendPasswordResetEmail(email: string) {
  return firebaseSendPasswordResetEmail(auth, email);
}

    