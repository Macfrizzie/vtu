

'use server';

import { getFirestore, doc, getDoc, updateDoc, increment, setDoc, collection, addDoc, query, where, getDocs, orderBy, writeBatch } from 'firebase/firestore';
import { app } from './client-app';
import type { Transaction, Service, User } from '../types';
import { getAuth } from 'firebase-admin/auth';


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
        // Convert Firestore Timestamp to JavaScript Date object
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        return {
            ...data,
            uid: userSnap.id,
            createdAt: createdAt,
        } as UserData;
    } else {
        return null;
    }
}

export async function updateUserData(uid: string, data: { fullName: string }) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
}

// Helper to check if initial services have been created
async function checkAndSeedServices() {
    const servicesRef = collection(db, 'services');
    const snapshot = await getDocs(query(servicesRef));
    
    const existingServices = snapshot.docs.map(doc => doc.data().name);

    const initialServices: Omit<Service, 'id'>[] = [
        { name: 'Airtime Top-up', provider: 'MTN NG', status: 'Active', fee: 0 },
        { name: 'Data Bundles', provider: 'Airtel NG', status: 'Active', fee: 1.5 },
        { name: 'Electricity Bill', provider: 'IKEDC', status: 'Active', fee: 100 },
        { name: 'Cable TV', provider: 'DSTV', status: 'Inactive', fee: 50 },
        { name: 'E-pins', provider: 'WAEC', status: 'Inactive', fee: 10 },
        { name: 'Data Card Sales', provider: 'Various', status: 'Inactive', fee: 2 },
        { name: 'Rechargecard sales', provider: 'Various', status: 'Inactive', fee: 2 },
        { name: 'Betting', provider: 'Bet9ja', status: 'Inactive', fee: 25 },
    ];

    const missingServices = initialServices.filter(service => !existingServices.includes(service.name));

    if (missingServices.length > 0) {
        const batch = writeBatch(db);
        missingServices.forEach(service => {
            const docRef = doc(collection(db, 'services'));
            batch.set(docRef, service);
        });
        await batch.commit();
        console.log(`Seeded ${missingServices.length} new services.`);
    }
}

export async function fundWallet(uid: string, amount: number, email?: string | null, fullName?: string | null) {
    // Seed services if they don't exist
    await checkAndSeedServices();
    
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    let userEmail = email;

    if (!userSnap.exists()) {
        if (!email || !fullName) {
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
            lastLogin: new Date(),
            status: 'Active',
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
    await checkAndSeedServices();
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
    let transactionList = transactionSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: data.date.toDate(),
        } as Transaction;
    });
    
    // Sort transactions by date descending on the server-side
    transactionList.sort((a, b) => b.date.getTime() - a.date.getTime());

    return transactionList;
}

export async function getAllUsers(): Promise<User[]> {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, orderBy('createdAt', 'desc'));
    const userSnapshot = await getDocs(q);
    return userSnapshot.docs.map(doc => {
        const data = doc.data();
        const lastLoginDate = data.lastLogin?.toDate ? data.lastLogin.toDate() : (data.createdAt?.toDate ? data.createdAt.toDate() : new Date());
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        return {
            id: doc.id,
            name: data.fullName,
            email: data.email,
            role: data.role,
            status: data.status,
            lastLogin: lastLoginDate,
            walletBalance: data.walletBalance,
            createdAt: createdAt
        } as User;
    });
}

export async function getServices(): Promise<Service[]> {
    await checkAndSeedServices();
    const servicesCol = collection(db, 'services');
    const serviceSnapshot = await getDocs(servicesCol);
    const serviceList = serviceSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
        } as Service;
    });
    return serviceList;
}

export async function addService(service: Omit<Service, 'id'>) {
    const servicesRef = collection(db, 'services');
    await addDoc(servicesRef, service);
}

export async function addUser(user: Omit<User, 'id' | 'lastLogin' | 'walletBalance' | 'createdAt'>) {
  const usersRef = collection(db, 'users');
  // In a real app, this would be more complex, likely involving Firebase Auth
  // For now, we just add to the collection.
  await addDoc(usersRef, {
    fullName: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    walletBalance: 0,
    createdAt: new Date(),
    lastLogin: new Date(),
  });
}
