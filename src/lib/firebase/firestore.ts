

'use server';

import { getFirestore, doc, getDoc, updateDoc, increment, setDoc, collection, addDoc, query, where, getDocs, orderBy, writeBatch, deleteDoc } from 'firebase/firestore';
import { app } from './client-app';
import type { Transaction, Service, User, UserData, DataPlan, CablePlan, Disco, ApiProvider } from '../types';
import { getAuth } from 'firebase-admin/auth';
import { callProviderAPI } from '@/services/api-handler';


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

export async function fundWallet(uid: string, amount: number, email?: string | null, fullName?: string | null) {
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

export async function purchaseService(uid: string, serviceId: string, variationId: string, inputs: Record<string, any>, userEmail: string) {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error("User not found.");
    const userData = userSnap.data() as UserData;

    const serviceRef = doc(db, 'services', serviceId);
    const serviceSnap = await getDoc(serviceRef);
    if (!serviceSnap.exists()) throw new Error("Service not found.");
    const service = { id: serviceSnap.id, ...serviceSnap.data() } as Service;

    if (!service.apiProviderIds || service.apiProviderIds.length === 0) {
        throw new Error("This service is not linked to any API provider.");
    }
    
    const allProviders = await getApiProviders();
    const serviceProviders = service.apiProviderIds
        .map(link => {
            const provider = allProviders.find(p => p.id === link.id && p.status === 'Active');
            return provider ? { ...provider, priority: link.priority } : null;
        })
        .filter((p): p is ApiProvider & { priority: 'Primary' | 'Fallback' } => p !== null)
        .sort((a, b) => a.priority === 'Primary' ? -1 : b.priority === 'Primary' ? 1 : 0);


    if (serviceProviders.length === 0) {
        throw new Error("No active API provider found for this service.");
    }
    
    let totalCost = 0;
    let description = `${service.name} Purchase`;
    let apiResponse: any;
    let successfulProvider: ApiProvider | null = null;
    let lastError: Error | null = new Error("No API providers were attempted.");

    for (const provider of serviceProviders) {
        try {
            let requestBody: Record<string, any> = {};
            const endpoint: string = service.endpoint || '';
            const method: 'GET' | 'POST' = 'POST'; // Assuming POST for most purchases

            if (!endpoint) {
                throw new Error(`Configuration Error: No endpoint URL is defined for the '${service.name}' service.`);
            }

            // --- Service-specific logic ---
            if (service.category === 'Airtime') {
                const baseAmount = Number(inputs.amount);
                if (isNaN(baseAmount) || baseAmount <= 0) {
                    throw new Error("Invalid airtime amount provided.");
                }

                let markup = 0;
                // Markup is treated as a discount for airtime
                if (service.markupType === 'percentage' && service.markupValue) {
                    markup = (baseAmount * service.markupValue) / 100;
                } else if (service.markupType === 'fixed' && service.markupValue) {
                    markup = service.markupValue;
                }
                totalCost = baseAmount - markup;
                
                const network = service.variations?.find(v => v.id === variationId);
                if (!network) {
                     throw new Error(`Configuration Error: Network with ID '${variationId}' not found in service variations.`);
                }
                description = `${network.name} Airtime for ${inputs.mobile_number}`;

                 requestBody = {
                    network: variationId, // The variationId is the network ID for airtime (e.g. '1' for MTN)
                    amount: baseAmount,
                    mobile_number: inputs.mobile_number,
                    Ported_number: true,
                    airtime_type: "VTU"
                };
            } else if (service.category === 'Data') {
                 const selectedVariation = service.variations?.find(v => v.id === variationId);
                if (!selectedVariation) {
                    throw new Error("Could not find the selected data plan.");
                }

                totalCost = selectedVariation.price + (selectedVariation.fees?.[userData.role] || 0);
                description = `${service.name} ${selectedVariation.name} for ${inputs.mobile_number}`;
                
                const networkName = service.name.split(' ')[0]; // E.g., "MTN" from "MTN Data"

                requestBody = {
                    network: networkName, 
                    plan: inputs.plan,
                    mobile_number: inputs.mobile_number,
                };
            } else {
                 const selectedVariation = service.variations?.find(v => v.id === variationId);
                if (!selectedVariation) {
                    throw new Error("Could not find the selected service variation.");
                }

                totalCost = selectedVariation.price + (selectedVariation.fees?.[userData.role] || 0);

                // Generic handler for other services
                requestBody = { ...inputs };
            }

            if (userData.walletBalance < totalCost) {
                throw new Error(`Insufficient balance. You need ₦${totalCost.toLocaleString()}, but have ₦${userData.walletBalance.toLocaleString()}.`);
            }
           
            apiResponse = await callProviderAPI(provider, endpoint, method, requestBody);
            
            if (apiResponse.status === 'error' || apiResponse.Status === 'failed') {
                 throw new Error(apiResponse.message || apiResponse.msg || `API Error from ${provider.name}`);
            }
            
            successfulProvider = provider;
            break; 

        } catch (error: any) {
            console.error(`Attempt with provider ${provider.name} failed:`, error.message);
            lastError = error;
            continue;
        }
    }

    if (!successfulProvider) {
        throw lastError || new Error("All API providers failed or were unavailable for this service.");
    }
    
    await updateDoc(userRef, { walletBalance: increment(-totalCost) });
    
    await addDoc(collection(db, 'transactions'), {
        userId: uid,
        userEmail,
        description,
        amount: -totalCost,
        type: 'Debit',
        status: 'Successful',
        date: new Date(),
        apiResponse: JSON.stringify(apiResponse),
        apiProvider: successfulProvider.name,
    });

    return apiResponse;
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
    
    // Sort by date in descending order (newest first)
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
    const servicesCol = collection(db, "services");
    const snapshot = await getDocs(query(servicesCol, orderBy("name")));
    let services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));

    const hasIncorrectDataService = services.some(s => s.name === 'Data Bundles');
    if (hasIncorrectDataService) {
        const batch = writeBatch(db);
        const incorrectServiceDoc = snapshot.docs.find(d => d.data().name === 'Data Bundles');
        if (incorrectServiceDoc) {
            batch.delete(incorrectServiceDoc.ref);
        }
        await batch.commit();
        // Refetch services after deletion
        const newSnapshot = await getDocs(query(servicesCol, orderBy("name")));
        services = newSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
    }


    const coreServices = [
        { name: "Airtime", category: 'Airtime', endpoint: '/topup/' },
        { name: "MTN Data", category: 'Data', endpoint: '/data/', provider: 'MTN' },
        { name: "Glo Data", category: 'Data', endpoint: '/data/', provider: 'Glo' },
        { name: "Airtel Data", category: 'Data', endpoint: '/data/', provider: 'Airtel' },
        { name: "9mobile Data", category: 'Data', endpoint: '/data/', provider: '9mobile' },
        { name: "Electricity Bill", category: 'Electricity', endpoint: '/billpayment/'},
        { name: "Cable TV", category: 'Cable', endpoint: '/billpayment/'},
        { name: "E-pins", category: 'Education', endpoint: '/epin/'},
        { name: "Recharge Card", category: 'Recharge Card', endpoint: '/recharge-card/'},
    ];

    const existingServiceNames = new Set(services.map(s => s.name));
    const missingServices = coreServices.filter(cs => !existingServiceNames.has(cs.name));

    if (missingServices.length > 0) {
        const batch = writeBatch(db);
        missingServices.forEach((service) => {
            const docRef = doc(collection(db, 'services'));
            batch.set(docRef, {
                name: service.name,
                category: service.category,
                endpoint: service.endpoint,
                provider: service.provider || '',
                status: "Active",
                markupType: "none",
                markupValue: 0,
                apiProviderIds: [],
                variations: [],
            });
        });
        await batch.commit();

        // Refetch all services to return a complete and correct list
        const finalSnapshot = await getDocs(query(servicesCol, orderBy("name")));
        return finalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
    }

    return services;
}

export async function addService(data: { name: string; category: string }) {
    const servicesCol = collection(db, 'services');
    await addDoc(servicesCol, {
        ...data,
        status: 'Active',
        markupType: 'none',
        markupValue: 0,
        apiProviderIds: [],
        endpoint: '',
    });
}


export async function updateService(id: string, data: Partial<Service>) {
    const serviceRef = doc(db, 'services', id);
    await updateDoc(serviceRef, data);
}

export async function deleteService(id: string) {
    const serviceRef = doc(db, 'services', id);
await deleteDoc(serviceRef);
}


export async function addUser(data: Omit<UserData, 'uid' | 'createdAt' | 'lastLogin' | 'walletBalance'>) {
    const usersRef = collection(db, 'users');
    
    // This is a simplified version. In a real app, you'd create a user in Firebase Auth first.
    // For now, we'll just add to Firestore.
    const newUser = {
        ...data,
        walletBalance: 0,
        createdAt: new Date(),
        lastLogin: new Date(),
    };
    
    await addDoc(usersRef, newUser);
}


export async function getApiProvidersForSelect(): Promise<Pick<ApiProvider, 'id' | 'name'>[]> {
    const providersCol = collection(db, 'apiProviders');
    const snapshot = await getDocs(query(providersCol, where('status', '==', 'Active')));
    return snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name as string,
    }));
}


// --- API Provider Functions ---

export async function getApiProviders(): Promise<ApiProvider[]> {
    const providersCol = collection(db, 'apiProviders');
    const snapshot = await getDocs(query(providersCol));
    
    if (snapshot.empty) {
        const initialProvider: Omit<ApiProvider, 'id'> = { 
            name: 'HusmoData', 
            description: 'Primary provider for VTU services.', 
            baseUrl: 'https://husmodata.com/api', 
            status: 'Active', 
            priority: 'Primary', 
            auth_type: 'Token', 
            apiKey: '8f00fa816b1e3b485baca8f44ae5d361ef803311', 
            apiSecret: '', 
            requestHeaders: '{}', 
            transactionCharge: 0 
        };
        
        const docRef = await addDoc(providersCol, initialProvider);
        
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

// --- Data Plan Pricing Functions ---
export async function addDataPlan(plan: Omit<DataPlan, 'id'>) {
    await addDoc(collection(db, 'dataPlans'), plan);
}

export async function getDataPlans(): Promise<DataPlan[]> {
    const snapshot = await getDocs(query(collection(db, 'dataPlans')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DataPlan));
}

export async function deleteDataPlan(id: string) {
    await deleteDoc(doc(db, 'dataPlans', id));
}

// --- Cable Plan Pricing Functions ---
export async function addCablePlan(plan: Omit<CablePlan, 'id'>) {
    await addDoc(collection(db, 'cablePlans'), plan);
}

export async function getCablePlans(): Promise<CablePlan[]> {
    const snapshot = await getDocs(query(collection(db, 'cablePlans')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CablePlan));
}

export async function deleteCablePlan(id: string) {
    await deleteDoc(doc(db, 'cablePlans', id));
}

// --- Disco Pricing Functions ---
export async function addDisco(disco: Omit<Disco, 'id'>) {
    await addDoc(collection(db, 'discos'), disco);
}

export async function getDiscos(): Promise<Disco[]> {
    const snapshot = await getDocs(query(collection(db, 'discos')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Disco));
}

export async function deleteDisco(id: string) {
    await deleteDoc(doc(db, 'discos', id));
}
    

    

    
