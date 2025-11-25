

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
import { getFirestore, doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { app } from './client-app';
import { createPaylonyVirtualAccount } from '@/services/paylony';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';

const auth = getAuth(app);
const db = getFirestore(app);

async function setAdminClaim(uid: string): Promise<{ success: boolean; message: string }> {
    console.log(`[Auth] Requesting custom admin claim for ${uid}...`);
    try {
        const response = await fetch('/api/set-admin-claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || `Failed to set admin claim via API route. Status: ${response.status}`);
        }

        console.log(`[Auth] Custom admin claim API call successful for ${uid}.`);
        return { success: true, message: result.message };
    } catch (error) {
        console.error('[Auth] Error in setAdminClaim:', error);
        return { success: false, message: error instanceof Error ? error.message : 'An unknown error occurred.' };
    }
}


async function createUserDocument(user: User, fullName: string, phone: string) {
  if (!user.email) {
    throw new Error('User email is missing.');
  }

  const userRef = doc(db, 'users', user.uid);
  const [firstname, ...lastnameParts] = fullName.split(' ');
  const lastname = lastnameParts.join(' ') || firstname;
  
  const isSuperAdmin = user.email === 'horlarworyeh200@gmail.com';
  const userRole = isSuperAdmin ? 'Super Admin' : 'Customer';

  const initialData = {
    uid: user.uid,
    email: user.email,
    fullName: fullName,
    phone: phone,
    role: userRole,
    createdAt: new Date(),
    walletBalance: 0,
    status: 'Active',
    lastLogin: new Date(),
    reservedAccount: null,
  };
  
  try {
    // This setDoc creates the user document upon signup.
    // The security rules MUST allow this operation.
    await setDoc(userRef, initialData);
    console.log(`[Auth] User document created for ${user.uid} with role: ${userRole}.`);
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'create',
            requestResourceData: initialData,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    // Re-throw the original error to be caught by the signup form's try/catch
    throw serverError;
  }


  if (isSuperAdmin) {
      const claimResult = await setAdminClaim(user.uid);
      if (claimResult.success) {
        // Force refresh the token on the client to get the new custom claim
        await user.getIdToken(true);
        console.log(`[Auth] Token refreshed for ${user.uid} after claim set.`);
      } else {
         console.error(`[Auth] FATAL: Failed to set custom admin claim for ${user.uid}:`, claimResult.message);
         // Do not throw here, as the user was created. Log the error for debugging.
      }
  }

  // Attempt to create a virtual account. This is non-critical for signup success.
  // If it fails, the user can still log in.
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
    
    const accountData = {
      reservedAccount: {
        provider: 'Paylony',
        accountNumber: paylonyAccount.account_number,
        accountName: paylonyAccount.account_name,
        bankName: paylonyAccount.bank_name,
      },
    };
    await updateDoc(userRef, accountData);
    console.log(`[Auth] Paylony virtual account created and saved for ${user.uid}.`);

  } catch (error) {
    console.error(`[Auth] Failed to create Paylony virtual account for ${user.uid}:`, error);
  }
}

export async function signUpWithEmailAndPassword(email: string, password: string, fullName: string, phone: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = userCredential;
  await updateProfile(user, { displayName: fullName });
  await createUserDocument(user, fullName, phone);
  return userCredential;
}

export async function signInWithEmailAndPassword(email: string, password: string) {
    const userCredential = await firebaseSignIn(auth, email, password);
    const { user } = userCredential;

    // After successful sign-in, update lastLogin
    const userRef = doc(db, 'users', user.uid);
    const updateData = { lastLogin: new Date() };
    updateDoc(userRef, updateData).catch(async (serverError) => {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
        }
    });

    // Check if the user is the designated super admin and set the claim if needed.
    if (user.email === 'horlarworyeh200@gmail.com') {
        console.log(`[Auth] Admin user ${user.email} logged in. Verifying/setting custom claim.`);
        const claimResult = await setAdminClaim(user.uid);
        if (claimResult.success) {
            // Force refresh of the token to get the new claims immediately
            await user.getIdToken(true);
            console.log(`[Auth] Token refreshed for admin user ${user.uid}.`);
        } else {
             console.error(`[Auth] Failed to set custom admin claim on login for ${user.uid}:`, claimResult.message);
            // We don't throw here, as login itself was successful. The user might just not have admin powers.
        }
    }
    
    return userCredential;
}


export function onAuthStateChangedHelper(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
        await user.getIdToken(true);
    }
    callback(user);
  });
}

export function sendPasswordResetEmail(email: string) {
  return firebaseSendPasswordResetEmail(auth, email);
}
