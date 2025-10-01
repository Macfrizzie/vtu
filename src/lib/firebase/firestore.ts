

'use server';

import { getFirestore, doc, getDoc, updateDoc, increment, setDoc, collection, addDoc, query, where, getDocs, orderBy, writeBatch, deleteDoc } from 'firebase/firestore';
import { app } from './client-app';
import type { Transaction, Service, User, ApiProvider, UserData, AirtimePrice, ServiceVariation } from '../types';
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

// Helper to check if initial services have been created
async function checkAndSeedServices() {
    const servicesRef = collection(db, 'services');
    const snapshot = await getDocs(query(servicesRef));
    
    if (snapshot.empty) {
        const initialServices: Omit<Service, 'id'>[] = [
            { name: 'MTN Airtime', provider: '1', category: 'Airtime', status: 'Active', apiProviderId: 'husmodata', variations: [] },
            { name: 'Airtel Data', provider: '2', category: 'Data', status: 'Active', apiProviderId: 'husmodata', variations: [] },
            { name: 'DSTV Subscription', provider: 'dstv', category: 'Cable', status: 'Inactive', apiProviderId: 'husmodata', variations: [] },
            { name: 'Ikeja Electric', provider: 'ikeja-electric', category: 'Electricity', status: 'Active', apiProviderId: 'husmodata', variations: [] },
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

export async function purchaseService(uid: string, serviceId: string, variationId: string, inputs: Record<string, any>, userEmail: string) {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error("User not found.");
    const userData = userSnap.data() as UserData;

    const serviceRef = doc(db, 'services', serviceId);
    const serviceSnap = await getDoc(serviceRef);
    if (!serviceSnap.exists()) throw new Error("Service not found.");
    const service = { id: serviceSnap.id, ...serviceSnap.data() } as Service;

    if (!service.apiProviderId) {
        throw new Error("This service is not linked to an API provider.");
    }
    
    // Fetch all providers and filter by the one linked to the service, then sort by priority
    const allProviders = await getApiProviders();
    const serviceProviders = allProviders
        .filter(p => p.id === service.apiProviderId && p.status === 'Active')
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
        // --- Calculate Cost and Prepare API Request ---
        try {
            let requestBody: Record<string, any> = {};
            let endpoint: string = '';
            let method: 'GET' | 'POST' = 'POST';

            switch (service.category) {
                case 'Airtime': {
                    const priceRuleQuery = query(collection(db, 'airtimePrices'), 
                        where('networkId', '==', service.provider),
                        where('apiProviderId', '==', provider.id)
                    );
                    const priceRuleSnap = await getDocs(priceRuleQuery);
                    if (priceRuleSnap.empty) throw new Error(`No pricing rule found for this network with provider ${provider.name}.`);
                    const priceRule = priceRuleSnap.docs[0].data() as AirtimePrice;

                    const amount = inputs.amount;
                    const discount = (amount * priceRule.discountPercent) / 100;
                    totalCost = amount - discount;
                    description = `${service.name} (₦${amount}) for ${inputs.mobile_number}`;
                    
                    endpoint = '/topup/';
                    requestBody = {
                        network: service.provider,
                        amount: inputs.amount,
                        mobile_number: inputs.mobile_number,
                        Ported_number: true,
                        airtime_type: "VTU"
                    };
                    break;
                }
                case 'Data': {
                    const variation = service.variations.find(v => v.id === variationId);
                    if (!variation) throw new Error("Selected data plan not found for this service.");
                    
                    const fee = variation.fees?.[userData.role] || 0;
                    totalCost = variation.price + fee;
                    description = `${variation.name} for ${inputs.mobile_number}`;

                    endpoint = '/data/';
                    requestBody = {
                        network: inputs.network,
                        mobile_number: inputs.mobile_number,
                        plan: inputs.plan,
                        Ported_number: true
                    };
                    break;
                }
                case 'Electricity': {
                    const variation = service.variations.find(v => v.id === variationId);
                    if (!variation) throw new Error("Internal configuration error: Service variation not found for electricity.");

                    const fee = variation.fees?.[userData.role] || 0;
                    totalCost = inputs.amount + fee;
                    description = `Electricity payment for ${inputs.meterNumber}`;

                    endpoint = '/billpayment/';
                    requestBody = {
                        disco_name: service.provider,
                        amount: inputs.amount,
                        meter_number: inputs.meterNumber,
                        MeterType: inputs.meterType === 'prepaid' ? '1' : '2'
                    };
                    break;
                }
                 case 'Cable': {
                    const variation = service.variations.find(v => v.id === variationId);
                    if (!variation) throw new Error("Selected package not found for this service.");

                    const fee = variation.fees?.[userData.role] || 0;
                    totalCost = variation.price + fee;
                    description = `${variation.name} for ${inputs.smart_card_number}`;

                    endpoint = '/billpayment/';
                    requestBody = {
                        disco_name: service.provider, // `dstv`, `gotv`, etc.
                        amount: inputs.amount,
                        meter_number: inputs.smart_card_number,
                        variation_code: inputs.variation_code,
                        customer_name: inputs.customer_name,
                        customer_number: '0',
                        customer_reference: '0',
                        customer_address: '0'
                    };
                    break;
                }
                case 'Education': {
                    const variation = service.variations.find(v => v.id === variationId);
                    if (!variation) throw new Error("Selected E-Pin type not found.");

                    const fee = variation.fees?.[userData.role] || 0;
                    totalCost = variation.price + fee;
                    description = `${variation.name} E-Pin Purchase`;
                    
                    endpoint = '/epin/';
                    requestBody = {
                        exam_name: service.provider,
                        quantity: 1,
                    };
                    break;
                }
                case 'Recharge Card': {
                    const variation = service.variations.find(v => v.id === variationId);
                    if (!variation) throw new Error("Selected denomination not found.");

                    const fee = variation.fees?.[userData.role] || 0;
                    totalCost = (variation.price + fee) * inputs.quantity;
                    description = `${inputs.quantity} x ₦${variation.price} ${service.name} E-Pin(s)`;

                    endpoint = '/rechargepin/';
                    requestBody = {
                        network: inputs.network,
                        network_amount: inputs.network_amount,
                        quantity: inputs.quantity,
                        name_on_card: inputs.name_on_card,
                    };
                    break;
                }
                default:
                    throw new Error(`Service category "${service.category}" is not supported for purchases yet.`);
            }

            // --- Validate Balance ---
            if (userData.walletBalance < totalCost) {
                throw new Error(`Insufficient balance. You need ₦${totalCost.toLocaleString()}, but have ₦${userData.walletBalance.toLocaleString()}.`);
            }

            // --- Execute API Call ---
            if (!endpoint) {
                throw new Error("Service configuration error: missing endpoint.");
            }
           
            apiResponse = await callProviderAPI(provider, endpoint, method, requestBody);
            
            if (apiResponse.status === 'error' || apiResponse.Status === 'failed') {
                 throw new Error(apiResponse.message || apiResponse.msg || `API Error from ${provider.name}`);
            }
            
            successfulProvider = provider;
            break; // Exit loop on success

        } catch (error: any) {
            console.error(`Attempt with provider ${provider.name} failed:`, error.message);
            lastError = error;
            continue; // Try next provider
        }
    }

    if (!successfulProvider) {
        throw lastError || new Error("All API providers failed or were unavailable for this service.");
    }
    
    // --- Deduct from wallet and log transaction on success ---
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
    const q = query(transactionsCol, where('userId', '==', uid), orderBy('date', 'desc'));
    const transactionSnapshot = await getDocs(q);
    let transactionList = transactionSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            date: data.date.toDate(),
        } as Transaction;
    });
    
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
        const initialProviders: Omit<ApiProvider, 'id'>[] = [
            { name: 'HusmoData', description: 'Primary provider for VTU services.', baseUrl: 'https://husmodataapi.com/api', status: 'Active', priority: 'Primary', auth_type: 'Token', apiKey: '66f2e5c39ac8640f13cd888f161385b12f7e5e92', apiSecret: '', requestHeaders: '{}', transactionCharge: 0 },
        ];
        const batch = writeBatch(db);
        initialProviders.forEach(provider => {
            batch.set(doc(providersCol, 'husmodata'), provider); // Use a predictable ID
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

// --- Pricing Functions ---

export async function addAirtimePrice(price: Omit<AirtimePrice, 'id'>) {
    const pricesRef = collection(db, 'airtimePrices');
    await addDoc(pricesRef, price);
}

export async function getAirtimePrices(): Promise<AirtimePrice[]> {
    const pricesCol = collection(db, 'airtimePrices');
    const snapshot = await getDocs(query(pricesCol));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AirtimePrice));
}

export async function deleteAirtimePrice(id: string) {
    const priceRef = doc(db, 'airtimePrices', id);
    await deleteDoc(priceRef);
}
