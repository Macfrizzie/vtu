

'use server';

import { getFirestore, doc, getDoc, updateDoc, increment, setDoc, collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';
import { app } from './client-app';
import type { Transaction } from '../types';


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
    let userEmail = email;

    if (!userSnap.exists()) {
        if (!email || !fullName) {
             // In a real app, you might want to fetch this from auth or handle it differently
            const authUser = await getAuth(app).getUser(uid);
            userEmail = authUser.email;
            fullName = authUser.displayName;
        }

        await setDoc(userRef, {
            uid,
            email: userEmail,
            fullName: fullName,
            role: 'User',
            createdAt: new Date(),
            walletBalance: 0,
        });
        await updateDoc(userRef, {
            walletBalance: increment(amount)
        });
    } else {
        userEmail = userSnap.data().email;
        await updateDoc(userRef, {
            walletBalance: increment(amount)
        });
    }
    
    // Log the transaction
    await addDoc(collection(db, 'transactions'), {
        userId: uid,
        userEmail: userEmail,
        description: 'Wallet Funding',
        amount: amount,
        type: 'Credit',
        status: 'Successful',
        date: new Date(),
    });
}

export async function purchaseService(uid: string, amount: number, description: string, userEmail: string) {
    const userRef = doc(db, 'users', uid);
    
    await updateDoc(userRef, {
        walletBalance: increment(-amount)
    });

    // Log the transaction
    await addDoc(collection(db, 'transactions'), {
        userId: uid,
        userEmail: userEmail,
        description: description,
        amount: -amount,
        type: 'Debit',
        status: 'Successful',
        date: new Date(),
    });
}


export async function getTransactions(): Promise<Transaction[]> {
    const transactionsCol = collection(db, 'transactions');
    const q = query(transactionsCol, orderBy('date', 'desc'));
    const transactionSnapshot = await getDocs(q);
    const transactionList = transactionSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: data.date.toDate(),
        } as Transaction;
    });
    return transactionList;
}

export async function getUserTransactions(uid: string): Promise<Transaction[]> {
    const transactionsCol = collection(db, 'transactions');
    const q = query(transactionsCol, where('userId', '==', uid));
    const transactionSnapshot = await getDocs(q);
    const transactionList = transactionSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: data.date.toDate(),
        } as Transaction;
    });
    // Sort by date in descending order in the code
    return transactionList.sort((a, b) => b.date.getTime() - a.date.getTime());
}
