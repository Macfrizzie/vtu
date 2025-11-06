
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
import { createPaylonyVirtualAccount } from '@/services/paylony';

const auth = getAuth(app);
const db = getFirestore(app);

async function createUserDocument(user: User, phone: string) {
  if (!user.email || !user.displayName) {
    throw new Error('User email or display name is missing.');
  }

  const userRef = doc(db, 'users', user.uid);
  const [firstname, ...lastnameParts] = user.displayName.split(' ');
  const lastname = lastnameParts.join(' ') || firstname;
  
  const isSuperAdmin = user.email === 'horlarworyeh200@gmail.com';
  const userRole = isSuperAdmin ? 'Super Admin' : 'Customer';

  const initialData = {
    uid: user.uid,
    email: user.email,
    fullName: user.displayName,
    phone: phone,
    role: userRole,
    createdAt: new Date(),
    walletBalance: 0,
    status: 'Active',
    lastLogin: new Date(),
    reservedAccount: null,
  };
  await setDoc(userRef, initialData);
  console.log(`[Auth] User document created for ${user.uid} with role: ${userRole}.`);

  if (isSuperAdmin) {
      try {
        console.log(`[Auth] User ${user.uid} is Super Admin. Setting custom claim via API...`);
        const response = await fetch('/api/set-admin-claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: user.uid }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to set admin claim via API route.');
        }
        // Force refresh the token on the client to get the new custom claim
        await user.getIdToken(true);
        console.log(`[Auth] Custom admin claim successfully set for ${user.uid} and token refreshed.`);
      } catch (error) {
        console.error(`[Auth] FATAL: Failed to set custom admin claim for ${user.uid}:`, error);
      }
  }

  try {
    const paylonyAccount = await createPaylonyVirtualAccount({
      firstname: firstname,
      lastname: lastname,
      email: user.email,
      phone: phone, 
      dob: '1990-01-01', // Placeholder
      address: '123 VTU Boss Street', // Placeholder
      gender: 'Male', // Placeholder
    });
    
    await setDoc(userRef, {
      reservedAccount: {
        provider: 'Paylony',
        accountNumber: paylonyAccount.account_number,
        accountName: paylonyAccount.account_name,
        bankName: paylonyAccount.bank_name,
      },
    }, { merge: true });
     console.log(`[Auth] Paylony virtual account created and saved for ${user.uid}.`);

  } catch (error) {
    console.error(`[Auth] Failed to create Paylony virtual account for ${user.uid}:`, error);
  }
}

export async function signUpWithEmailAndPassword(email: string, password: string, fullName: string, phone: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = userCredential;
  await updateProfile(user, { displayName: fullName });
  await createUserDocument(user, phone);
  return userCredential;
}

export function signInWithEmailAndPassword(email: string, password: string) {
  return firebaseSignIn(auth, email, password);
}

export function onAuthStateChangedHelper(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function sendPasswordResetEmail(email: string) {
  return firebaseSendPasswordResetEmail(auth, email);
}
