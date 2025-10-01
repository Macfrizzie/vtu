
'use server';

import { getFirestore, doc, getDoc, updateDoc, increment, setDoc, collection, addDoc, query, where, getDocs, orderBy, writeBatch, deleteDoc, runTransaction } from 'firebase/firestore';
import { app } from './client-app';
import type { Transaction, Service, User, ApiProvider, UserData, ServiceVariation } from '../types';
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
             { 
                name: 'MTN Data', 
                provider: 'mtn-data', 
                category: 'Data',
                status: 'Active', 
                variations: [
                    { id: 'mtn-1gb-sme', name: '1GB SME', price: 250, fees: { Customer: 50, Vendor: 25, Admin: 0 } },
                    { id: 'mtn-2gb-sme', name: '2GB SME', price: 500, fees: { Customer: 50, Vendor: 25, Admin: 0 } },
                ]
            },
            { 
                name: 'Airtel Data', 
                provider: 'airtel-data', 
                category: 'Data',
                status: 'Active', 
                variations: [
                    { id: 'airtel-1gb', name: '1GB', price: 300, fees: { Customer: 50, Vendor: 25, Admin: 0 } },
                ]
            },
            { 
                name: 'DSTV Subscription', 
                provider: 'dstv', 
                category: 'Cable',
                status: 'Active',
                variations: [
                    { id: 'dstv-padi', name: 'DStv Padi', price: 3950, fees: { Customer: 100, Vendor: 50, Admin: 0 } },
                ]
            },
             { 
                name: 'MTN Airtime', 
                provider: 'mtn-airtime', 
                category: 'Airtime',
                status: 'Active', 
                variations: [
                    { id: 'mtn-vtu', name: 'MTN VTU', price: 0, fees: { Customer: 0, Vendor: 0, Admin: 0 } },
                ]
            },
             { 
                name: 'WAEC Result Pin', 
                provider: 'waec', 
                category: 'Education',
                status: 'Active', 
                variations: [
                    { id: 'waec-pin-1', name: 'WAEC Result Checker PIN', price: 3500, fees: { Customer: 200, Vendor: 100, Admin: 0 } },
                ]
            },
             { 
                name: 'Eko Electricity (EKEDC)', 
                provider: 'ekedc', 
                category: 'Electricity',
                status: 'Active', 
                variations: [
                    { id: 'ekedc-postpaid', name: 'EKEDC Bill Payment', price: 0, fees: { Customer: 100, Vendor: 50, Admin: 0 } },
                ]
            },
        ];

        const batch = writeBatch(db);
        initialServices.forEach(service => {
            const docRef = doc(collection(db, 'services'));
            batch.set(docRef, service);
        });
        await batch.commit();
        console.log(`Seeded ${initialServices.length} new services.`);
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


export async function purchaseService(
    uid: string,
    serviceId: string,
    variationId: string,
    inputs: Record<string, any>,
    userEmail: string
) {
    await checkAndSeedServices();
    return await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', uid);
        const serviceRef = doc(db, 'services', serviceId);
        
        const [userSnap, serviceSnap] = await Promise.all([
            transaction.get(userRef),
            transaction.get(serviceRef)
        ]);

        if (!userSnap.exists()) throw new Error("User not found.");
        if (!serviceSnap.exists()) throw new Error("Service not found.");

        const userData = userSnap.data() as UserData;
        const service = serviceSnap.data() as Service;
        
        const variation = service.variations.find(v => v.id === variationId);
        if (!variation) throw new Error("Service variation not found.");

        let apiProvider: ApiProvider | null = null;
        if (service.apiProviderId) {
            const apiProviderRef = doc(db, 'apiProviders', service.apiProviderId);
            const apiProviderSnap = await transaction.get(apiProviderRef);
            if (apiProviderSnap.exists()) {
                apiProvider = apiProviderSnap.data() as ApiProvider;
            }
        }
        
        // Calculate total cost
        const purchaseAmount = (service.category === 'Airtime' || service.category === 'Electricity') && inputs.amount ? inputs.amount : variation.price;
        const serviceFee = variation.fees?.[userData.role] || 0;
        const totalAmount = purchaseAmount + serviceFee;
        
        if (userData.walletBalance < totalAmount) {
            throw new Error(`Insufficient balance. You need ₦${totalAmount.toLocaleString()}, but have ₦${userData.walletBalance.toLocaleString()}.`);
        }
        
        let apiResponse;
        if (apiProvider) {
            let requestBody: any = {};
            let endpoint = '';

            switch(service.category) {
                case 'Electricity':
                    endpoint = 'billpayment/';
                    requestBody = {
                        "disco_name": service.provider, 
                        "amount": inputs.amount,
                        "meter_number": inputs.meterNumber,
                        "MeterType": inputs.meterType === 'prepaid' ? 1 : 2
                    };
                    break;
                case 'Education':
                    endpoint = 'epin/';
                    requestBody = {
                        "exam_name": service.provider,
                        "quantity": inputs.quantity || 1,
                    };
                    break;
                case 'Cable':
                     console.log(`Simulating Cable purchase for ${service.name}. No specific API logic implemented.`);
                     // In a real scenario, you'd construct the API call for cable TV here.
                     apiResponse = { status: 'success', message: 'Simulated Cable TV purchase successful' };
                     break;
                default:
                    console.log(`Simulating purchase for ${service.category}. No specific API logic implemented.`);
                    break;
            }

            if (endpoint) {
                const response = await fetch(`${apiProvider.baseUrl}${endpoint}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Token ${apiProvider.apiKey}`,
                        'Content-Type': 'application/json',
                        ...(apiProvider.requestHeaders ? JSON.parse(apiProvider.requestHeaders) : {})
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorBody = await response.text();
                    throw new Error(`API provider error: ${response.statusText}. Details: ${errorBody}`);
                }
                apiResponse = await response.json();
            } else if (!apiResponse) {
                 apiResponse = { status: 'success', message: 'Simulated purchase successful' };
            }

        } else {
            console.log("Simulating purchase as no API provider is configured.");
            apiResponse = { status: 'success', message: 'Simulated purchase successful' };
        }
        
        // If API call is successful, deduct from wallet and log transaction
        transaction.update(userRef, { walletBalance: increment(-totalAmount) });
        
        const description = service.category === 'Airtime' ? `${service.name} for ${inputs.phone}` : `${variation.name} for ${inputs.smartCardNumber || inputs.meterNumber || inputs.phone || service.name}`;

        const newTransactionRef = doc(collection(db, 'transactions'));
        transaction.set(newTransactionRef, {
            userId: uid,
            userEmail: userEmail,
            description: `${description} (Fee: ₦${serviceFee})`,
            amount: totalAmount > 0 ? -totalAmount : totalAmount,
            type: 'Debit',
            status: 'Successful',
            date: new Date(),
            apiResponse: JSON.stringify(apiResponse),
        });

        return apiResponse || newTransactionRef.id;
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
    if (!service.variations || service.variations.length === 0) {
        throw new Error("A service must have at least one variation.");
    }
    const servicesRef = collection(db, 'services');
    await addDoc(servicesRef, service);
}

export async function updateService(id: string, data: Partial<Omit<Service, 'id'>>) {
    if (data.variations && data.variations.length === 0) {
        throw new Error("A service must have at least one variation.");
    }
    const serviceRef = doc(db, 'services', id);
    await updateDoc(serviceRef, data);
}

export async function updateServiceStatus(id: string, status: 'Active' | 'Inactive') {
    const serviceRef = doc(db, 'services', id);
    await updateDoc(serviceRef, { status });
}

export async function bulkUpdateFees(updateType: 'increase_percentage' | 'increase_fixed' | 'decrease_percentage' | 'decrease_fixed', value: number) {
    const servicesRef = collection(db, "services");
    
    await runTransaction(db, async (transaction) => {
        const serviceSnapshot = await getDocs(servicesRef);
        serviceSnapshot.forEach(serviceDoc => {
            const service = serviceDoc.data() as Service;
            if (!service.variations) return;

            const updatedVariations = service.variations.map(variation => {
                const currentFees = variation.fees || { Customer: 0, Vendor: 0, Admin: 0 };
                const newFees = { ...currentFees };

                for (const role in newFees) {
                    if (Object.prototype.hasOwnProperty.call(newFees, role)) {
                        const currentFee = newFees[role as keyof typeof newFees];
                        let newFee = currentFee;

                        switch(updateType) {
                            case 'increase_percentage':
                                newFee = currentFee * (1 + value / 100);
                                break;
                            case 'increase_fixed':
                                newFee = currentFee + value;
                                break;
                            case 'decrease_percentage':
                                newFee = currentFee * (1 - value / 100);
                                break;
                            case 'decrease_fixed':
                                newFee = currentFee - value;
                                break;
                        }
                        newFees[role as keyof typeof newFees] = Math.max(0, Math.round(newFee * 100) / 100); // Ensure fee is not negative and round to 2 decimal places
                    }
                }
                return { ...variation, fees: newFees };
            });

            transaction.update(serviceDoc.ref, { variations: updatedVariations });
        });
    });
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


export async function getApiProvidersForSelect(): Promise<Pick<ApiProvider, 'id' | 'name'>[]> {
    const providersCol = collection(db, 'apiProviders');
    const snapshot = await getDocs(query(providersCol));
    return snapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
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
