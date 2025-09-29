
'use server';

import { getFirestore, doc, getDoc, updateDoc, increment, setDoc } from 'firebase/firestore';
import { app } from './client-app';

const db = getFirestore(app);

export type UserData = {
    uid: string;
    email: string;
    fullName: string;
    role: string;
    createdAt: Date;
    walletBalance: number;
};

export async function getUserData(uid: string): Promise<UserData | null> {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        return {
            ...data,
            createdAt: data.createdAt.toDate(),
        } as UserData;
    } else {
        return null;
    }
}

export async function fundWallet(uid: string, amount: number, email?: string | null, fullName?: string | null) {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        // If the user document doesn't exist, create it.
        await setDoc(userRef, {
            uid,
            email: email || 'No Email',
            fullName: fullName || 'No Name',
            role: 'User',
            createdAt: new Date(),
            walletBalance: amount // Start with the funding amount
        });
    } else {
        // If it exists, just increment the balance.
        await updateDoc(userRef, {
            walletBalance: increment(amount)
        });
    }
}

export async function purchaseService(uid: string, amount: number) {
    const userRef = doc(db, 'users', uid);
    
    // We assume the document exists since this is a protected action.
    // A check for insufficient balance should happen on the client.
    return updateDoc(userRef, {
        walletBalance: increment(-amount)
    });
}
