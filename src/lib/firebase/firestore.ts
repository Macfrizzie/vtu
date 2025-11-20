
'use server';

import { getFirestore, doc, getDoc, updateDoc, increment, setDoc, collection, addDoc, query, where, getDocs, orderBy, writeBatch, deleteDoc } from 'firebase/firestore';
import { app } from './client-app';
import type { Transaction, Service, User, UserData, DataPlan, CablePlan, Disco, ApiProvider, RechargeCardDenomination, EducationPinType, SystemHealth, ServiceVariation } from '../types';
import { getAuth } from 'firebase-admin/auth';
import { callProviderAPI } from '@/services/api-handler';
import { createPaylonyVirtualAccount } from '@/services/paylony';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';

const db = getFirestore(app);

// Helper function to handle getDocs with contextual errors
async function getDocsWithContext<T>(q: any, operation: 'list' = 'list'): Promise<T[]> {
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
  } catch (serverError: any) {
    if (serverError.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: q.path,
            operation: operation,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    // Re-throw the original error to be handled by the caller
    throw serverError;
  }
}


// --- Helper function to build request body based on service category ---
function buildRequestBody(service: Service, variationId: string, inputs: Record<string, any>, userData: UserData): Record<string, any> {
    switch (service.category) {
        case 'Airtime':
            const network = service.variations?.find(v => v.id === variationId);
            if (!network) throw new Error(`Configuration Error: Network with ID '${variationId}' not found.`);
            return {
                network: variationId, 
                amount: Number(inputs.amount),
                mobile_number: inputs.mobile_number,
                Ported_number: true,
                airtime_type: "VTU"
            };
        case 'Data':
            const networkVariation = service.variations?.find(v => v.id === inputs.networkId);
            const selectedPlan = networkVariation?.plans?.find(p => p.planId === variationId);
            if (!selectedPlan) throw new Error("Could not find the selected data plan.");
            return {
                network: inputs.networkId,
                mobile_number: inputs.mobile_number,
                plan: variationId,
                Ported_number: true
            };
        case 'Cable':
            const selectedPackage = service.variations?.find(v => v.id === variationId);
            if (!selectedPackage) throw new Error("Could not find the selected cable package.");
            return {
                cablename: selectedPackage.providerName,
                cableplan: selectedPackage.id,
                smart_card_number: inputs.smart_card_number,
            };
        case 'Electricity':
            const selectedDisco = service.variations?.find(d => d.id === variationId);
            if (!selectedDisco) throw new Error("Could not find the selected Disco.");
            return {
                disco_name: selectedDisco.id,
                MeterType: inputs.meterType === 'prepaid' ? '01' : '02',
                meter_number: inputs.meterNumber,
                amount: inputs.amount,
            };
        case 'Education':
             const selectedEpinVariation = service.variations?.find(v => v.id === inputs.examBody);
             const selectedPin = selectedEpinVariation?.plans?.find(p => p.id === variationId);
             if(!selectedPin || !selectedEpinVariation) throw new Error("Could not find the selected E-Pin type.");
            return {
                exam_name: selectedEpinVariation.id,
                variation_code: selectedPin.planId,
                quantity: inputs.quantity || 1,
            };
        case 'Recharge Card':
            const rcNetworkVar = service.variations?.find(v => v.id === inputs.networkId);
            const selectedDenom = rcNetworkVar?.variations?.find(p => p.id === variationId);
            if (!selectedDenom || !rcNetworkVar) throw new Error("Could not find the selected recharge card denomination.");
            return {
                variation_code: selectedDenom.planId,
                ...inputs,
                network: rcNetworkVar.name
            };
        default:
            return { ...inputs };
    }
}


export async function getSystemHealth(): Promise<SystemHealth> {
    const health: SystemHealth = {
        database: {
            connected: false,
            collections: {
                services: { count: 0, issues: [] },
                users: { count: 0, issues: [] },
                transactions: { count: 0, issues: [] },
                apiProviders: { count: 0, issues: [] },
                cablePlans: { count: 0, issues: [] },
                dataPlans: { count: 0, issues: [] },
                discos: { count: 0, issues: [] },
                rechargeCardDenominations: { count: 0, issues: [] },
                educationPinTypes: { count: 0, issues: [] },
            },
        },
        services: {},
        apiProviders: {},
    };

    try {
        // --- 1. Database Connection & Collection Counts ---
        const collectionsToCount = Object.keys(health.database.collections);
        const counts = await Promise.all(collectionsToCount.map(async (name) => {
            const snapshot = await getDocs(collection(db, name));
            return { name, count: snapshot.size };
        }));
        counts.forEach(c => {
             if (health.database.collections[c.name as keyof typeof health.database.collections]) {
                health.database.collections[c.name as keyof typeof health.database.collections].count = c.count;
             }
        });
        health.database.connected = true;

    } catch (e) {
        health.database.connected = false;
        health.database.collections.services.issues.push(`Failed to connect to Firestore: ${(e as Error).message}`);
        return health; // Stop here if DB is not connected
    }
    
    // --- 2. Services Analysis ---
    const allServices = await getServices(); // This function now populates variations
    const expectedCategories = ['Airtime', 'Data', 'Cable', 'Electricity', 'Recharge Card', 'Education'];

    for (const category of expectedCategories) {
        const service = allServices.find(s => s.category === category);
        const serviceHealth = {
            exists: !!service,
            status: service?.status || 'Missing',
            hasVariations: (service?.variations?.length || 0) > 0,
            variationCount: service?.variations?.length || 0,
            hasApiProvider: (service?.apiProviderIds?.length || 0) > 0,
            hasEndpoint: !!service?.endpoint,
            issues: [] as string[],
        };

        if (!service) {
            serviceHealth.issues.push(`Service document for category '${category}' is missing.`);
        } else {
            if (service.status !== 'Active') {
                serviceHealth.issues.push('Service is not marked as Active.');
            }
            if (!serviceHealth.hasVariations) {
                serviceHealth.issues.push('Service has no pricing variations (plans, packages, etc).');
            }
            if (!serviceHealth.hasApiProvider) {
                serviceHealth.issues.push('Service is not linked to any API provider.');
            }
            if (!serviceHealth.hasEndpoint) {
                 serviceHealth.issues.push('Service has no API endpoint configured.');
            }
        }
        health.services[category] = serviceHealth;
    }

    // --- 3. API Providers Analysis ---
    const providers = await getApiProviders();
    if (providers.length === 0) {
         health.database.collections.apiProviders.issues.push('No API providers configured.');
    }
    providers.forEach(provider => {
        health.apiProviders[provider.name] = {
            status: provider.status,
            reachable: false, // This will be updated by a client-side test
            lastTested: null,
            responseTime: null,
            issues: [],
        };
        if(provider.status !== 'Active') {
            health.apiProviders[provider.name].issues.push('Provider is not active.');
        }
    });

    return health;
}


export async function initializeServices(): Promise<string[]> {
    console.log('🚀 INITIALIZING SERVICES...');
    const report: string[] = [];
    const batch = writeBatch(db);
    let hasWrites = false;
    const servicesCollection = collection(db, 'services');
    
    try {
        // 1. Get an active API provider to link to services
        const apiProvidersCollection = collection(db, 'apiProviders');
        const activeProvidersQuery = query(apiProvidersCollection, where('status', '==', 'Active'));
        const providerSnapshot = await getDocs(activeProvidersQuery);
        let primaryProviderId: string | null = null;

        if (!providerSnapshot.empty) {
            primaryProviderId = providerSnapshot.docs[0].id;
            report.push(`[OK] Found active API Provider: ${providerSnapshot.docs[0].data().name} (ID: ${primaryProviderId})`);
        } else {
            report.push(`[ERROR] No active API Provider found. Cannot link services. Please add an active provider first.`);
            return report;
        }

        // --- Core Service Definitions ---
        const coreServices = [
            { name: "Cable TV", category: "Cable", endpoint: "/cablesub", markupType: 'fixed', markupValue: 0 },
            { name: "Electricity Bill", category: "Electricity", endpoint: "/billpayment", markupType: 'fixed', markupValue: 100 },
            { name: "Airtime", category: "Airtime", endpoint: "/topup", markupType: 'percentage', markupValue: 2, variations: [
                { id: '1', name: 'MTN'}, { id: '2', name: 'GLO'}, { id: '3', name: 'AIRTEL'}, { id: '4', name: '9MOBILE'},
            ] },
            { name: "Data", category: "Data", endpoint: "/data", markupType: 'none', markupValue: 0 },
            { name: "Recharge Card", category: "Recharge Card", endpoint: "/recharge-card", markupType: 'none', markupValue: 0 },
            { name: "Education", category: "Education", endpoint: "/epin", markupType: 'none', markupValue: 0 },
        ];
        
        for (const serviceDef of coreServices) {
            const serviceQuery = query(servicesCollection, where('category', '==', serviceDef.category));
            const serviceSnapshot = await getDocs(serviceQuery);
            if (serviceSnapshot.empty) {
                const serviceDocRef = doc(servicesCollection);
                batch.set(serviceDocRef, {
                    ...serviceDef,
                    status: 'Active',
                    apiProviderIds: [{ id: primaryProviderId, priority: "Primary" }]
                });
                hasWrites = true;
                report.push(`[CREATED] '${serviceDef.name}' service document created.`);
            } else {
                 report.push(`[EXISTS] '${serviceDef.name}' service document already exists.`);
            }
        }
        
        // --- Collections Seeding ---
        const cablePlansCollection = collection(db, 'cablePlans');
        const cablePlanSnapshot = await getDocs(cablePlansCollection);
        if (cablePlanSnapshot.empty) {
            const plans = [
                { planId: 'dstv-padi', planName: 'Padi', providerName: 'DSTV', basePrice: 3950, status: 'Active' },
                { planId: 'gotv-jolli', planName: 'Jolli', providerName: 'GOTV', basePrice: 3950, status: 'Active' },
                { planId: 'nova', planName: 'Nova', providerName: 'STARTIMES', basePrice: 1500, status: 'Active' },
            ];
            plans.forEach(plan => {
                const planDocRef = doc(cablePlansCollection);
                batch.set(planDocRef, plan);
            });
            hasWrites = true;
            report.push(`[CREATED] Seeded 'cablePlans' collection with ${plans.length} plans.`);
        } else {
            report.push(`[EXISTS] 'cablePlans' collection already has ${cablePlanSnapshot.size} documents.`);
        }

        const discosCollection = collection(db, 'discos');
        const discoSnapshot = await getDocs(discosCollection);
        if (discoSnapshot.empty) {
            const discos = [
                { discoId: 'ikeja-electric', discoName: 'Ikeja Electric (IKEDC)', status: 'Active' },
                { discoId: 'eko-electric', discoName: 'Eko Electric (EKEDC)', status: 'Active' },
            ];
            discos.forEach(disco => {
                const discoDocRef = doc(discosCollection);
                batch.set(discoDocRef, disco);
            });
            hasWrites = true;
            report.push(`[CREATED] Seeded 'discos' collection with ${discos.length} distributors.`);
        } else {
            report.push(`[EXISTS] 'discos' collection already has ${discoSnapshot.size} documents.`);
        }

        // --- Recharge Card Denominations Seeding ---
        const rechargeCardDenominationsCollection = collection(db, 'rechargeCardDenominations');
        const rechargeCardSnapshot = await getDocs(rechargeCardDenominationsCollection);
        if (rechargeCardSnapshot.empty) {
            const denominations = [
                // MTN
                { networkName: 'MTN', denominationId: 'mtn-100', name: '₦100 Pin', price: 100, fees: { Customer: 5, Vendor: 2, Admin: 0 }, status: 'Active' },
                { networkName: 'MTN', denominationId: 'mtn-200', name: '₦200 Pin', price: 200, fees: { Customer: 5, Vendor: 2, Admin: 0 }, status: 'Active' },
                { networkName: 'MTN', denominationId: 'mtn-500', name: '₦500 Pin', price: 500, fees: { Customer: 10, Vendor: 5, Admin: 0 }, status: 'Active' },
                { networkName: 'MTN', denominationId: 'mtn-1000', name: '₦1000 Pin', price: 1000, fees: { Customer: 10, Vendor: 5, Admin: 0 }, status: 'Active' },
                // GLO
                { networkName: 'GLO', denominationId: 'glo-100', name: '₦100 Pin', price: 100, fees: { Customer: 5, Vendor: 2, Admin: 0 }, status: 'Active' },
                { networkName: 'GLO', denominationId: 'glo-200', name: '₦200 Pin', price: 200, fees: { Customer: 5, Vendor: 2, Admin: 0 }, status: 'Active' },
                { networkName: 'GLO', denominationId: 'glo-500', name: '₦500 Pin', price: 500, fees: { Customer: 10, Vendor: 5, Admin: 0 }, status: 'Active' },
                { networkName: 'GLO', denominationId: 'glo-1000', name: '₦1000 Pin', price: 1000, fees: { Customer: 10, Vendor: 5, Admin: 0 }, status: 'Active' },
                // AIRTEL
                { networkName: 'AIRTEL', denominationId: 'airtel-100', name: '₦100 Pin', price: 100, fees: { Customer: 5, Vendor: 2, Admin: 0 }, status: 'Active' },
                { networkName: 'AIRTEL', denominationId: 'airtel-200', name: '₦200 Pin', price: 200, fees: { Customer: 5, Vendor: 2, Admin: 0 }, status: 'Active' },
                { networkName: 'AIRTEL', denominationId: 'airtel-500', name: '₦500 Pin', price: 500, fees: { Customer: 10, Vendor: 5, Admin: 0 }, status: 'Active' },
                { networkName: 'AIRTEL', denominationId: 'airtel-1000', name: '₦1000 Pin', price: 1000, fees: { Customer: 10, Vendor: 5, Admin: 0 }, status: 'Active' },
                 // 9MOBILE
                { networkName: '9MOBILE', denominationId: '9mobile-100', name: '₦100 Pin', price: 100, fees: { Customer: 5, Vendor: 2, Admin: 0 }, status: 'Active' },
                { networkName: '9MOBILE', denominationId: '9mobile-200', name: '₦200 Pin', price: 200, fees: { Customer: 5, Vendor: 2, Admin: 0 }, status: 'Active' },
                { networkName: '9MOBILE', denominationId: '9mobile-500', name: '₦500 Pin', price: 500, fees: { Customer: 10, Vendor: 5, Admin: 0 }, status: 'Active' },
                { networkName: '9MOBILE', denominationId: '9mobile-1000', name: '₦1000 Pin', price: 1000, fees: { Customer: 10, Vendor: 5, Admin: 0 }, status: 'Active' },
            ];
            denominations.forEach(denom => {
                const denomDocRef = doc(rechargeCardDenominationsCollection);
                batch.set(denomDocRef, denom);
            });
            hasWrites = true;
            report.push(`[CREATED] Seeded 'rechargeCardDenominations' collection with ${denominations.length} denominations.`);
        } else {
             report.push(`[EXISTS] 'rechargeCardDenominations' collection already has ${rechargeCardSnapshot.size} documents.`);
        }

        // --- Education Pin Types Seeding ---
        const educationPinTypesCollection = collection(db, 'educationPinTypes');
        const educationPinSnapshot = await getDocs(educationPinTypesCollection);
        if (educationPinSnapshot.empty) {
            const pins = [
                { examBody: 'WAEC', pinTypeId: 'waec-result', name: 'WAEC Result Pin', price: 3500, fees: { Customer: 100, Vendor: 50, Admin: 0 }, status: 'Active' },
                { examBody: 'NECO', pinTypeId: 'neco-result', name: 'NECO Result Token', price: 1000, fees: { Customer: 100, Vendor: 50, Admin: 0 }, status: 'Active' },
                { examBody: 'JAMB', pinTypeId: 'jamb-utme', name: 'JAMB UTME/DE Pin', price: 4700, fees: { Customer: 100, Vendor: 50, Admin: 0 }, status: 'Active' },
            ];
            pins.forEach(pin => {
                const pinDocRef = doc(educationPinTypesCollection);
                batch.set(pinDocRef, pin);
            });
            hasWrites = true;
            report.push(`[CREATED] Seeded 'educationPinTypes' collection with ${pins.length} pin types.`);
        } else {
            report.push(`[EXISTS] 'educationPinTypes' collection already has ${educationPinSnapshot.size} documents.`);
        }


        if (hasWrites) {
            await batch.commit();
            report.push("\n[SUCCESS] Database initialization complete. All writes have been committed.");
        } else {
            report.push("\n[INFO] No changes needed. All required data already exists in the database.");
        }

    } catch (error) {
        console.error("Error during service initialization:", error);
        report.push(`[FATAL ERROR] An error occurred during initialization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return report;
}

export async function getUserData(uid: string): Promise<UserData | null> {
    console.log(`[UserProvider] Fetching user data for UID: ${uid}`);
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data();
        // Convert Firestore Timestamp to JavaScript Date object
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
        const lastLogin = data.lastLogin?.toDate ? data.lastLogin.toDate() : createdAt;
        
        const userData = {
            ...data,
            uid: userSnap.id,
            createdAt: createdAt.toISOString(),
            lastLogin: lastLogin.toISOString()
        } as UserData;
        console.log(`[UserProvider] Data fetch complete for ${uid}`);
        return userData;
    } else {
        console.log(`[UserProvider] No user data found for UID: ${uid}`);
        return null;
    }
}

export async function updateUserData(uid: string, data: { fullName: string; phone: string; }) {
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
    addDoc(collection(db, 'transactions'), {
        userId: uid,
        userEmail: userEmail,
        description: 'Wallet Funding',
        amount: amount,
        type: 'Credit',
        status: 'Successful',
        date: new Date(),
    }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'transactions',
            operation: 'create',
            requestResourceData: { amount, type: 'Credit' }
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}


export async function manualFundWallet(uid: string, amount: number, adminId: string) {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        throw new Error("User not found");
    }
    
    const userData = { walletBalance: increment(amount) };
    updateDoc(userRef, userData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: userData
        });
        errorEmitter.emit('permission-error', permissionError);
        throw serverError; // rethrow to be caught by the UI
    });

    const transactionData = {
        userId: uid,
        userEmail: userSnap.data().email,
        description: `Manual Wallet Fund by Admin (${adminId})`,
        amount: amount,
        type: 'Credit',
        status: 'Successful',
        date: new Date(),
    };
    addDoc(collection(db, 'transactions'), transactionData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'transactions',
            operation: 'create',
            requestResourceData: transactionData
        });
        errorEmitter.emit('permission-error', permissionError);
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
    
    const userData = { walletBalance: increment(-amount) };
    updateDoc(userRef, userData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: userData
        });
        errorEmitter.emit('permission-error', permissionError);
        throw serverError;
    });

    const transactionData = {
        userId: uid,
        userEmail: userSnap.data().email,
        description: `Manual Wallet Deduction by Admin (${adminId})`,
        amount: -amount,
        type: 'Debit',
        status: 'Successful',
        date: new Date(),
    };
    addDoc(collection(db, 'transactions'), transactionData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'transactions',
            operation: 'create',
            requestResourceData: transactionData
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function purchaseService(uid: string, serviceId: string, variationId: string, inputs: Record<string, any>, userEmail: string) {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error("User not found.");
    const userData = userSnap.data() as UserData;

    // We need to refetch the service with variations populated
    const servicesWithData = await getServices();
    const service = servicesWithData.find(s => s.id === serviceId);

    if (!service) throw new Error("Could not retrieve populated service.");

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
            let requestBody = buildRequestBody(service, variationId, inputs, userData);
            let endpoint: string = service.endpoint || '';
            let method: 'GET' | 'POST' = 'POST'; // Assuming POST for most purchases

            if (!endpoint) {
                throw new Error(`Configuration Error: No endpoint URL is defined for the '${service.name}' service.`);
            }
            
            // --- Calculate totalCost based on service category ---
            if (service.category === 'Airtime') {
                const baseAmount = Number(inputs.amount);
                let markup = 0;
                if (service.markupType === 'percentage' && service.markupValue) {
                    markup = (baseAmount * service.markupValue) / 100;
                } else if (service.markupType === 'fixed' && service.markupValue) {
                    markup = service.markupValue;
                }
                totalCost = baseAmount - markup;
                description = `${requestBody.network_name || 'Airtime'} for ${inputs.mobile_number}`;
            } else {
                 const feeBearingVariation = service.variations?.flatMap(v => v.plans || v.variations || [v]).find(p => p.id === variationId || p.planId === variationId);
                 if (feeBearingVariation) {
                     const basePrice = feeBearingVariation.price || inputs.amount || 0;
                     const fee = feeBearingVariation.fees?.[userData.role] || 0;
                     const markup = (service.markupType === 'fixed' ? service.markupValue : (basePrice * (service.markupValue || 0) / 100)) || 0;
                     totalCost = (basePrice * (inputs.quantity || 1)) + fee + markup;
                 } else {
                     throw new Error("Could not determine pricing for the selected variation.");
                 }
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
    
    updateDoc(userRef, { walletBalance: increment(-totalCost) }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: { walletBalance: increment(-totalCost) }
        });
        errorEmitter.emit('permission-error', permissionError);
    });
    
    const transactionData = {
        userId: uid,
        userEmail,
        description,
        amount: -totalCost,
        type: 'Debit',
        status: 'Successful',
        date: new Date(),
        apiResponse: JSON.stringify(apiResponse),
        apiProvider: successfulProvider.name,
    };
    addDoc(collection(db, 'transactions'), transactionData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'transactions',
            operation: 'create',
            requestResourceData: transactionData
        });
        errorEmitter.emit('permission-error', permissionError);
    });

    return apiResponse;
}


export async function getTransactions(): Promise<Transaction[]> {
    const transactionsCol = collection(db, 'transactions');
    const q = query(transactionsCol, orderBy('date', 'desc'));
    const transactionList = await getDocsWithContext<Transaction>(q);
    return transactionList.map(tx => ({ ...tx, date: new Date(tx.date)}));
}

export async function getTransactionById(id: string): Promise<Transaction | null> {
    const transactionRef = doc(db, 'transactions', id);
    try {
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
    } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: transactionRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}

export async function updateTransactionStatus(id: string, status: 'Successful' | 'Failed') {
    const transactionRef = doc(db, 'transactions', id);
    const updateData = { status: status };
    updateDoc(transactionRef, updateData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: transactionRef.path,
            operation: 'update',
            requestResourceData: updateData
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function getUserTransactions(uid: string): Promise<Transaction[]> {
    const transactionsCol = collection(db, 'transactions');
    const q = query(transactionsCol, where('userId', '==', uid));
    const transactionList = await getDocsWithContext<Transaction>(q);
    transactionList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return transactionList.map(tx => ({ ...tx, date: new Date(tx.date)}));
}

export async function getAllUsers(roles?: ('Admin' | 'Super Admin')[]): Promise<User[]> {
    const usersCol = collection(db, 'users');
    let q = query(usersCol, orderBy('createdAt', 'desc'));

    if (roles && roles.length > 0) {
        q = query(usersCol, where('role', 'in', roles), orderBy('createdAt', 'desc'));
    }
    const userList = await getDocsWithContext<any>(q);
    return userList.map(doc => {
        const lastLoginDate = doc.lastLogin?.toDate ? doc.lastLogin.toDate() : (doc.createdAt?.toDate ? doc.createdAt.toDate() : new Date());
        const createdAt = doc.createdAt?.toDate ? doc.createdAt.toDate() : new Date();
        return {
            id: doc.id,
            uid: doc.uid,
            name: doc.fullName,
            email: doc.email,
            role: doc.role,
            status: doc.status,
            lastLogin: lastLoginDate,
            walletBalance: doc.walletBalance,
            createdAt: createdAt,
            phone: doc.phone,
        } as User;
    });
}


export async function updateUser(uid: string, data: { role: 'Customer' | 'Vendor' | 'Admin' | 'Super Admin'; status: 'Active' | 'Pending' | 'Blocked' }) {
    const userRef = doc(db, 'users', uid);
    updateDoc(userRef, data).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'update',
            requestResourceData: data
        });
        errorEmitter.emit('permission-error', permissionError);
        throw serverError;
    });
}

export async function getServices(): Promise<Service[]> {
    const servicesCol = collection(db, "services");
    const serviceSnapshot = await getDocsWithContext<any>(query(servicesCol));
    
    const baseServices = serviceSnapshot.map(doc => {
        return { id: doc.id, ...doc, apiProviderIds: doc.apiProviderIds || [] } as Service;
    });
    
    const [allDataPlans, allCablePlans, allDiscos, allRechargeDenominations, allEducationPinTypes] = await Promise.all([
        getDataPlans(),
        getCablePlans(),
        getDiscos(),
        getRechargeCardDenominations(),
        getEducationPinTypes(),
    ]);

    const finalServices: Service[] = [];
    
    for (const service of baseServices) {
        
        switch(service.category) {
            case 'Data':
                const networks = [...new Set(allDataPlans.map(p => p.networkName))];
                service.variations = networks.map(networkName => ({
                    id: networkName,
                    name: networkName,
                    price: 0,
                    plans: allDataPlans.filter(p => p.networkName === networkName && p.status === 'Active'),
                }));
                break;
            case 'Cable':
                service.variations = allCablePlans.map(p => ({
                    id: p.planId,
                    name: p.planName,
                    price: p.basePrice,
                    providerName: p.providerName,
                    status: p.status || 'Active',
                }));
                break;
            case 'Electricity':
                service.variations = allDiscos.map(d => ({
                    id: d.discoId,
                    name: d.discoName,
                    price: 0,
                    fees: { Customer: 100, Vendor: 100, Admin: 0, "Super Admin": 0 },
                    status: d.status || 'Active',
                }));
                break;
            case 'Recharge Card':
                 const rcNetworks = [...new Set(allRechargeDenominations.map(p => p.networkName))];
                 service.variations = rcNetworks.map(networkName => ({
                     id: networkName,
                     name: networkName,
                     price: 0, 
                     variations: allRechargeDenominations.filter(p => p.networkName === networkName && p.status === 'Active').map(d => ({
                         id: d.id, 
                         planId: d.denominationId,
                         name: d.name,
                         price: d.price,
                         fees: d.fees
                     })),
                 }));
                break;
            case 'Education':
                const examBodies = [...new Set(allEducationPinTypes.map(p => p.examBody))];
                service.variations = examBodies.map(examBody => ({
                    id: examBody,
                    name: examBody,
                    price: 0,
                    plans: allEducationPinTypes
                        .filter(p => p.examBody === examBody && p.status === 'Active')
                        .map(p => ({
                            id: p.id,
                            planId: p.pinTypeId,
                            name: p.name,
                            price: p.price,
                            fees: p.fees,
                        })),
                }));
                break;
            case 'Airtime':
                if (!service.variations) {
                  service.variations = [];
                }
                break;
            default:
                if (!service.variations) {
                    service.variations = [];
                }
                break;
        }

        finalServices.push(service);
    }

    return finalServices;
}


export async function addService(data: { name: string; category: string }) {
    const servicesCol = collection(db, 'services');
    const serviceData = {
        ...data,
        status: 'Active',
        markupType: 'none',
        markupValue: 0,
        apiProviderIds: [],
        endpoint: '',
    };
    addDoc(servicesCol, serviceData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'services',
            operation: 'create',
            requestResourceData: serviceData
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}


export async function updateService(id: string, data: Partial<Service>) {
    const serviceRef = doc(db, 'services', id);
    updateDoc(serviceRef, data).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: serviceRef.path,
            operation: 'update',
            requestResourceData: data
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function deleteService(id: string) {
    const serviceRef = doc(db, 'services', id);
    deleteDoc(serviceRef).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: serviceRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function generateVirtualAccountForUser(userId: string): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        throw new Error('User not found.');
    }

    const userData = userSnap.data() as UserData;
    if (userData.reservedAccount) {
        throw new Error('User already has a virtual account.');
    }

    if (!userData.email || !userData.fullName || !userData.phone) {
        throw new Error('User email, full name, or phone number is missing, cannot generate account.');
    }

    const [firstname, ...lastnameParts] = userData.fullName.split(' ');
    const lastname = lastnameParts.join(' ') || firstname;
    
    try {
        const paylonyAccount = await createPaylonyVirtualAccount({
            firstname: firstname,
            lastname: lastname,
            email: userData.email,
            phone: userData.phone,
            dob: '1990-01-01', // Placeholder
            address: '123 VTU Boss Street', // Placeholder
            gender: 'Male', // Placeholder
        });

        const updateData = {
            reservedAccount: {
                provider: 'Paylony',
                accountNumber: paylonyAccount.account_number,
                accountName: paylonyAccount.account_name,
                bankName: paylonyAccount.bank_name,
            },
        };
        updateDoc(userRef, updateData).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: userRef.path,
                operation: 'update',
                requestResourceData: updateData
            });
            errorEmitter.emit('permission-error', permissionError);
            throw new Error(`Failed to create Paylony virtual account: ${error instanceof Error ? error.message : 'Unknown error'}`);
        });
    } catch (error) {
        console.error(`[generateVirtualAccount] Failed for user ${userId}:`, error);
        throw new Error(`Failed to create Paylony virtual account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}


export async function getApiProvidersForSelect(): Promise<Pick<ApiProvider, 'id' | 'name'>[]> {
    const providersCol = collection(db, 'apiProviders');
    const q = query(providersCol, where('status', '==', 'Active'));
    return await getDocsWithContext<Pick<ApiProvider, 'id' | 'name'>>(q);
}


// --- API Provider Functions ---

export async function getApiProviders(): Promise<ApiProvider[]> {
    const providersCol = collection(db, 'apiProviders');
    const snapshot = await getDocsWithContext<ApiProvider>(query(providersCol));
    
    if (snapshot.length === 0) {
        const initialProvider: Omit<ApiProvider, 'id'> = { 
            name: 'HusmoData', 
            providerType: 'Service API',
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
        
        await addApiProvider(initialProvider);
        
        const newSnapshot = await getDocsWithContext<ApiProvider>(query(providersCol));
        return newSnapshot;
    }
    
    return snapshot;
}

export async function addApiProvider(provider: Omit<ApiProvider, 'id'>) {
    const providersCol = collection(db, 'apiProviders');
    addDoc(providersCol, provider).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'apiProviders',
            operation: 'create',
            requestResourceData: provider
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function updateApiProvider(id: string, data: Partial<Omit<ApiProvider, 'id'>>) {
    const providerRef = doc(db, 'apiProviders', id);
    updateDoc(providerRef, data).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: providerRef.path,
            operation: 'update',
            requestResourceData: data
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function deleteApiProvider(id: string) {
    const providerRef = doc(db, 'apiProviders', id);
    deleteDoc(providerRef).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: providerRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

// --- Data Plan Pricing Functions ---
export async function bulkAddDataPlans(plans: Omit<DataPlan, 'id'>[]) {
    const batch = writeBatch(db);
    const plansCollection = collection(db, 'dataPlans');
    
    plans.forEach(plan => {
        const docRef = doc(plansCollection);
        batch.set(docRef, { ...plan, status: 'Active' });
    });

    batch.commit().catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'dataPlans',
            operation: 'create',
            requestResourceData: { note: `${plans.length} plans in a batch write` }
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function addDataPlan(plan: Omit<DataPlan, 'id'>) {
    addDoc(collection(db, 'dataPlans'), plan).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'dataPlans',
            operation: 'create',
            requestResourceData: plan
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function getDataPlans(): Promise<DataPlan[]> {
    const snapshot = await getDocsWithContext<DataPlan>(query(collection(db, 'dataPlans')));
    return snapshot;
}

export async function updateDataPlanStatus(id: string, status: 'Active' | 'Inactive') {
    const planRef = doc(db, 'dataPlans', id);
    updateDoc(planRef, { status }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: planRef.path,
            operation: 'update',
            requestResourceData: { status }
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function updateDataPlansStatusByType(networkName: string, planType: string, status: 'Active' | 'Inactive') {
    const plansQuery = query(
        collection(db, 'dataPlans'),
        where('networkName', '==', networkName),
        where('planType', '==', planType)
    );
    const snapshot = await getDocs(plansQuery);
    
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { status: status });
    });

    batch.commit().catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: `dataPlans (query: ${networkName}/${planType})`,
            operation: 'update',
            requestResourceData: { status }
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function deleteDataPlan(id: string) {
    const planRef = doc(db, 'dataPlans', id);
    deleteDoc(planRef).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: planRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

// --- Cable Plan Pricing Functions ---
export async function addCablePlan(plan: Omit<CablePlan, 'id'>) {
    const planData = {...plan, status: 'Active'};
    addDoc(collection(db, 'cablePlans'), planData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'cablePlans',
            operation: 'create',
            requestResourceData: planData
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function getCablePlans(): Promise<CablePlan[]> {
    return await getDocsWithContext<CablePlan>(query(collection(db, 'cablePlans')));
}

export async function updateCablePlanStatus(id: string, status: 'Active' | 'Inactive') {
    const planRef = doc(db, 'cablePlans', id);
    updateDoc(planRef, { status }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: planRef.path,
            operation: 'update',
            requestResourceData: { status }
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}


export async function deleteCablePlan(id: string) {
    const planRef = doc(db, 'cablePlans', id);
    deleteDoc(planRef).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: planRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

// --- Disco Pricing Functions ---
export async function addDisco(disco: Omit<Disco, 'id'>) {
    const discoData = {...disco, status: 'Active'};
    addDoc(collection(db, 'discos'), discoData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'discos',
            operation: 'create',
            requestResourceData: discoData
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function getDiscos(): Promise<Disco[]> {
    return await getDocsWithContext<Disco>(query(collection(db, 'discos')));
}

export async function updateDiscoStatus(id: string, status: 'Active' | 'Inactive') {
    const discoRef = doc(db, 'discos', id);
    updateDoc(discoRef, { status }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: discoRef.path,
            operation: 'update',
            requestResourceData: { status }
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}


export async function deleteDisco(id: string) {
    const discoRef = doc(db, 'discos', id);
    deleteDoc(discoRef).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: discoRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

// --- Recharge Card Denomination Functions ---
export async function addRechargeCardDenomination(denomination: Omit<RechargeCardDenomination, 'id'>) {
    const denomData = { ...denomination, status: 'Active' };
    addDoc(collection(db, 'rechargeCardDenominations'), denomData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'rechargeCardDenominations',
            operation: 'create',
            requestResourceData: denomData
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function getRechargeCardDenominations(): Promise<RechargeCardDenomination[]> {
    return await getDocsWithContext<RechargeCardDenomination>(query(collection(db, 'rechargeCardDenominations')));
}

export async function updateRechargeCardDenominationStatus(id: string, status: 'Active' | 'Inactive') {
    const denominationRef = doc(db, 'rechargeCardDenominations', id);
    updateDoc(denominationRef, { status }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: denominationRef.path,
            operation: 'update',
            requestResourceData: { status }
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function deleteRechargeCardDenomination(id: string) {
    const denomRef = doc(db, 'rechargeCardDenominations', id);
    deleteDoc(denomRef).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: denomRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

// --- Education Pin Type Functions ---
export async function addEducationPinType(pinType: Omit<EducationPinType, 'id'>) {
    const pinData = { ...pinType, status: 'Active' };
    addDoc(collection(db, 'educationPinTypes'), pinData).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: 'educationPinTypes',
            operation: 'create',
            requestResourceData: pinData
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function getEducationPinTypes(examBody?: string): Promise<EducationPinType[]> {
    let q = query(collection(db, 'educationPinTypes'));
    if (examBody) {
        q = query(q, where('examBody', '==', examBody));
    }
    return await getDocsWithContext<EducationPinType>(q);
}

export async function updateEducationPinTypeStatus(id: string, status: 'Active' | 'Inactive') {
    const pinTypeRef = doc(db, 'educationPinTypes', id);
    updateDoc(pinTypeRef, { status }).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: pinTypeRef.path,
            operation: 'update',
            requestResourceData: { status }
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}

export async function deleteEducationPinType(id: string) {
    const pinTypeRef = doc(db, 'educationPinTypes', id);
    deleteDoc(pinTypeRef).catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
            path: pinTypeRef.path,
            operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
    });
}


export async function verifyDatabaseSetup() {
    console.log('🔍 VERIFYING DATABASE SETUP...\n');

    const collectionsToVerify = [
        { name: 'services', log: (doc: any) => `${doc.name} (${doc.category}): ${doc.status}${doc.variations ? ` - ${doc.variations.length} variations` : ''}` },
        { name: 'cablePlans', log: (doc: any) => `${doc.providerName} - ${doc.planName}: ${doc.status}` },
        { name: 'discos', log: (doc: any) => `${doc.discoName}: ${doc.status}` },
        { name: 'apiProviders', log: (doc: any) => `${doc.name}: ${doc.status}` },
        { name: 'dataPlans', log: (doc: any) => `${doc.networkName} ${doc.name}: ${doc.status}` },
        { name: 'rechargeCardDenominations', log: (doc: any) => `${doc.networkName} - ${doc.name}` },
        { name: 'educationPinTypes', log: (doc: any) => `${doc.examBody} - ${doc.name}` },
    ];

    const results: Record<string, number> = {};

    for (const { name, log } of collectionsToVerify) {
        try {
            const snapshot = await getDocs(collection(db, name));
            results[name] = snapshot.size;
            console.log(`\n📁 ${name} Collection:`);
            console.log(`   Total documents: ${snapshot.size}`);
            if (snapshot.size > 0 && log) {
                 snapshot.docs.slice(0, 5).forEach(doc => { // Log first 5 samples
                    console.log(`   - ${log(doc.data())}`);
                });
            } else if(snapshot.size === 0) {
                console.log('   - Collection is empty.');
            }
        } catch(e) {
            console.error(`   - Failed to read collection ${name}:`, e);
        }
    }
    
    // Specific check for Recharge Card and Education variations within the services collection
    const servicesSnapshot = await getDocs(collection(db, "services"));
    const rechargeCardService = servicesSnapshot.docs.find(doc => doc.data().category === 'Recharge Card');
    const educationService = servicesSnapshot.docs.find(doc => doc.data().category === 'Education');

    console.log('\n📁 Recharge Card Service (Embedded Variations Check):');
    if (rechargeCardService) {
        const variations = rechargeCardService.data().variations || [];
        console.log(`   - Found 'Recharge Card' service with ${variations.length} embedded variations.`);
        results['rechargeCardVariations_embedded'] = variations.length;
    } else {
        console.log("   - 'Recharge Card' service document not found.");
        results['rechargeCardVariations_embedded'] = 0;
    }
    
    console.log('\n📁 Education Service (Embedded Variations Check):');
    if (educationService) {
        const variations = educationService.data().variations || [];
        console.log(`   - Found 'Education' service with ${variations.length} embedded variations.`);
        results['educationVariations_embedded'] = variations.length;
    } else {
        console.log("   - 'Education' service document not found.");
        results['educationVariations_embedded'] = 0;
    }


    console.log('\n✅ VERIFICATION COMPLETE\n');
    
    return results;
}
