
'use server';

import { getFirestore, doc, getDoc, updateDoc, increment } from 'firebase/firestore';
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
        return userSnap.data() as UserData;
    } else {
        return null;
    }
}

export async function fundWallet(uid: string, amount: number) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        walletBalance: increment(amount)
    });
}
