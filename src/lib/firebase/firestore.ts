
'use server';

import { getFirestore, doc, getDoc, updateDoc, increment, setDoc, collection, addDoc, query, where, getDocs, orderBy, writeBatch, deleteDoc } from 'firebase/firestore';
import { app } from './client-app';
import type { Transaction, Service, User, ApiProvider, UserData } from '../types';
import { getAuth } from 'firebase-admin/auth';


const db = getFirestore(app);

export async function getUserData(uid: string): Promise<UserData | null> {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        // Convert Firestore Timestamp to JavaScript Date object
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        const lastLogin = data.lastLogin?.toDate ? data.lastLogin.toDate() : createdAt;

        return {
            ...data,
            uid: userSnap.id,
            createdAt: createdAt,
            lastLogin: lastLogin
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
    
    if (snapshot.empty) {
        const initialServices: Omit<Service, 'id'>[] = [
            { name: 'MTN Data', provider: 'MTN NG', status: 'Active', fee: 1.5 },
            { name: 'Airtel Airtime', provider: 'Airtel NG', status: 'Active', fee: 0 },
            { name: 'DSTV Subscription', provider: 'MultiChoice', status: 'Inactive', fee: 50 },
            { name: 'Ikeja Electric', provider: 'IKEDC', status: 'Active', fee: 100 },
        ];

        const batch = writeBatch(db);
        initialServices.forEach(service => {
            const docRef = doc(collection(db, 'services'));
            batch.set(docRef, service);
        });
        await batch.commit();
    }
}

export async function fundWallet(uid: string, amount: number, email?: string | null, fullName?: string | null) {
    // Seed services if they don't exist
    await checkAndSeedServices();
    
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    let userEmail = email;
    let userFullName = fullName;

    if (!userSnap.exists()) {
        if (!email || !fullName) {
             const authUser = await getAuth(app).getUser(uid);
             userEmail = authUser.email;
             userFullName = authUser.displayName;
        }

        await setDoc(userRef, {
            uid,
            email: userEmail,
            fullName: userFullName,
            role: 'Customer',
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


export async function manualFundWallet(uid: string, amount: number, adminId: string) {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        throw new Error("User not found");
    }

    await updateDoc(userRef, { walletBalance: increment(amount) });

    await addDoc(collection(db, 'transactions'), {
        userId: uid,
        userEmail: userSnap.data().email,
        description: `Manual Wallet Fund by Admin (${adminId})`,
        amount: amount,
        type: 'Credit',
        status: 'Successful',
        date: new Date(),
    });
}

export async function manualDeductFromWallet(uid: string, amount: number, adminId: string) {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        throw new Error("User not found");
    }

     if (userSnap.data().walletBalance < amount) {
        throw new Error("Insufficient funds for deduction.");
    }

    await updateDoc(userRef, { walletBalance: increment(-amount) });

    await addDoc(collection(db, 'transactions'), {
        userId: uid,
        userEmail: userSnap.data().email,
        description: `Manual Wallet Deduction by Admin (${adminId})`,
        amount: -amount,
        type: 'Debit',
        status: 'Successful',
        date: new Date(),
    });
}


export async function purchaseService(uid: string, service: Service, amount: number, inputs: Record<string, any>, userEmail: string) {
    await checkAndSeedServices();
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        throw new Error("User not found.");
    }

    const userData = userSnap.data() as UserData;
    const totalAmount = amount + service.fee;
    
    if (userData.walletBalance < totalAmount) {
        throw new Error(`Insufficient balance. You need ₦${totalAmount}, but have ₦${userData.walletBalance}.`);
    }

    // In a real app, here you would make the API call to the service provider.
    // For now, we simulate a successful transaction.
    // Example:
    // const apiResponse = await fetch('https://provider-api.com/purchase', { ... });
    // if (!apiResponse.ok) throw new Error("Failed to process transaction with provider.");
    const apiResponse = { status: 'success', message: 'Simulated purchase successful' };


    // If API call is successful, deduct from wallet and log transaction
    await updateDoc(userRef, {
        walletBalance: increment(-totalAmount)
    });
    
    const description = service.name === 'Airtime' ? `${service.provider} Airtime for ${inputs.phone}` : `${service.name} for ${inputs.smartCardNumber || inputs.meterNumber || inputs.phone || ''}`;

    await addDoc(collection(db, 'transactions'), {
        userId: uid,
        userEmail: userEmail,
        description: `${description} (Fee: ₦${service.fee})`,
        amount: -totalAmount,
        type: 'Debit',
        status: 'Successful',
        date: new Date(),
        apiResponse: JSON.stringify(apiResponse),
    });

    return { success: true, message: 'Purchase successful!' };
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

export async function getTransactionById(id: string): Promise<Transaction | null> {
    const transactionRef = doc(db, 'transactions', id);
    const transactionSnap = await getDoc(transactionRef);

    if (transactionSnap.exists()) {
        const data = transactionSnap.data();
        return {
            id: transactionSnap.id,
            ...data,
            date: data.date.toDate(),
        } as Transaction;
    } else {
        return null;
    }
}

export async function updateTransactionStatus(id: string, status: 'Successful' | 'Failed') {
    const transactionRef = doc(db, 'transactions', id);
    await updateDoc(transactionRef, { status: status });
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
    
    // Sort in code to avoid composite index requirement
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
            uid: data.uid,
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

export async function updateUser(uid: string, data: { role: 'Customer' | 'Vendor' | 'Admin'; status: 'Active' | 'Pending' | 'Blocked' }) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
}

export async function getServices(): Promise<Service[]> {
    await checkAndSeedServices();
    const servicesCol = collection(db, 'services');
    const serviceSnapshot = await getDocs(query(servicesCol, orderBy('name')));
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

export async function updateService(id: string, data: Partial<Service>) {
    const serviceRef = doc(db, 'services', id);
    await updateDoc(serviceRef, data);
}

export async function updateServiceStatus(id: string, status: 'Active' | 'Inactive') {
    const serviceRef = doc(db, 'services', id);
    await updateDoc(serviceRef, { status });
}

export async function addUser(user: Omit<User, 'id' | 'uid' | 'lastLogin' | 'walletBalance' | 'createdAt'>) {
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

// --- API Provider Functions ---

export async function getApiProviders(): Promise<ApiProvider[]> {
    const providersCol = collection(db, 'apiProviders');
    const snapshot = await getDocs(query(providersCol));
    
    if (snapshot.empty) {
        const initialProviders: Omit<ApiProvider, 'id'>[] = [
            { name: 'VTPass', description: 'Primary provider for VTU services.', baseUrl: 'https://api-service.vtpass.com/api', status: 'Active', priority: 'Primary', apiKey: '', apiSecret: '', requestHeaders: '{}', transactionCharge: 10 },
            { name: 'Shago', description: 'Fallback for bill payments.', baseUrl: 'https://shago.com/api', status: 'Inactive', priority: 'Fallback', apiKey: '', apiSecret: '', requestHeaders: '{}', transactionCharge: 15 },
        ];
        const batch = writeBatch(db);
        initialProviders.forEach(provider => {
            const docRef = doc(collection(db, 'apiProviders'));
            batch.set(docRef, provider);
        });
        await batch.commit();
        
        const newSnapshot = await getDocs(providersCol);
        return newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApiProvider));
    }
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApiProvider));
}

export async function addApiProvider(provider: Omit<ApiProvider, 'id'>) {
    const providersCol = collection(db, 'apiProviders');
    await addDoc(providersCol, provider);
}

export async function updateApiProvider(id: string, data: Partial<Omit<ApiProvider, 'id'>>) {
    const providerRef = doc(db, 'apiProviders', id);
    await updateDoc(providerRef, data);
}

export async function deleteApiProvider(id: string) {
    const providerRef = doc(db, 'apiProviders', id);
    await deleteDoc(providerRef);
}

    