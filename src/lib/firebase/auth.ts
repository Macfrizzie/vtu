'use client';

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { app } from './client-app';

const auth = getAuth(app);
const db = getFirestore(app);

async function createUserDocument(uid: string, email: string, fullName: string) {
  const userRef = doc(db, 'users', uid);
  const data = {
    uid,
    email,
    fullName,
    role: 'User',
    createdAt: new Date(),
    walletBalance: 0,
  };
  await setDoc(userRef, data);
}

export async function signUpWithEmailAndPassword(email: string, password: string, fullName: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = userCredential;
  await createUserDocument(user.uid, user.email!, fullName);
  return userCredential;
}

export function signInWithEmailAndPassword(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function onAuthStateChangedHelper(callback: (user: any) => void) {
  return onAuthStateChanged(auth, callback);
}
