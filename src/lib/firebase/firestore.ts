
'use server';

import { getFirestore, doc, getDoc, updateDoc, increment, setDoc, collection, addDoc, query, where, getDocs, orderBy, writeBatch, deleteDoc } from 'firebase/firestore';
import { app } from './client-app';
import type { Transaction, Service, User, UserData, DataPlan, CablePlan, Disco, ApiProvider, RechargeCardDenomination, EducationPinType, SystemHealth } from '../types';
import { getAuth } from 'firebase-admin/auth';
import { callProviderAPI } from '@/services/api-handler';


const db = getFirestore(app);

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
            { name: "Airtime", category: "Airtime", endpoint: "/topup", markupType: 'percentage', markupValue: 2 },
            { name: "Data", category: "Data", endpoint: "/data", markupType: 'none', markupValue: 0 },
        ];
        
        for (const serviceDef of coreServices) {
            const serviceQuery = query(servicesCollection, where('name', '==', serviceDef.name));
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
        
        // --- Recharge Card Service ---
        console.log('🔍 Checking Recharge Card service...');
        const rechargeCardServiceQuery = query(servicesCollection, where('category', '==', 'Recharge Card'));
        const rechargeCardSnapshot = await getDocs(rechargeCardServiceQuery);
        if (rechargeCardSnapshot.empty) {
            const variations = [
                { id: 'mtn-100', name: 'MTN ₦100', price: 100, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
                { id: 'mtn-200', name: 'MTN ₦200', price: 200, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
                { id: 'mtn-500', name: 'MTN ₦500', price: 500, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
                { id: 'mtn-1000', name: 'MTN ₦1000', price: 1000, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
                { id: 'airtel-100', name: 'Airtel ₦100', price: 100, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
                { id: 'airtel-200', name: 'Airtel ₦200', price: 200, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
                { id: 'airtel-500', name: 'Airtel ₦500', price: 500, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
                { id: 'airtel-1000', name: 'Airtel ₦1000', price: 1000, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
                { id: 'glo-100', name: 'Glo ₦100', price: 100, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
                { id: 'glo-200', name: 'Glo ₦200', price: 200, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
                { id: 'glo-500', name: 'Glo ₦500', price: 500, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
                { id: 'glo-1000', name: 'Glo ₦1000', price: 1000, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
                { id: '9mobile-100', name: '9mobile ₦100', price: 100, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
                { id: '9mobile-200', name: '9mobile ₦200', price: 200, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
                { id: '9mobile-500', name: '9mobile ₦500', price: 500, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
                { id: '9mobile-1000', name: '9mobile ₦1000', price: 1000, fees: { Customer: 5, Vendor: 2, Admin: 0 } },
            ];
            const serviceDocRef = doc(servicesCollection);
            batch.set(serviceDocRef, {
                name: "Recharge Card",
                category: "Recharge Card",
                endpoint: "/recharge-card",
                status: "Active",
                apiProviderIds: [{ id: primaryProviderId, priority: "Primary" }],
                markupType: 'none',
                markupValue: 0,
                variations: variations
            });
            hasWrites = true;
            console.log(`✨ Created Recharge Card service with ${variations.length} variations`);
            report.push(`[CREATED] 'Recharge Card' service document created with ${variations.length} variations.`);
        } else {
            console.log('✅ Recharge Card service already exists');
            report.push(`[EXISTS] 'Recharge Card' service document already exists.`);
        }

        // --- Education Pin Service ---
        console.log('🔍 Checking Education service...');
        const educationServiceQuery = query(servicesCollection, where('category', '==', 'Education'));
        const educationSnapshot = await getDocs(educationServiceQuery);
        if (educationSnapshot.empty) {
             const variations = [
                { id: 'waec-result', name: 'WAEC Result Checker Pin', price: 3500, fees: { Customer: 100, Vendor: 50, Admin: 0 } },
                { id: 'waec-reg', name: 'WAEC Registration Pin', price: 25000, fees: { Customer: 200, Vendor: 100, Admin: 0 } },
                { id: 'neco-result', name: 'NECO Result Token', price: 1000, fees: { Customer: 100, Vendor: 50, Admin: 0 } },
                { id: 'neco-gce', name: 'NECO GCE Registration Pin', price: 18000, fees: { Customer: 200, Vendor: 100, Admin: 0 } },
                { id: 'jamb-utme', name: 'JAMB UTME/DE Pin', price: 4700, fees: { Customer: 100, Vendor: 50, Admin: 0 } },
                { id: 'jamb-mock', name: 'JAMB Mock Exam Pin', price: 1000, fees: { Customer: 50, Vendor: 25, Admin: 0 } },
                { id: 'nabteb-result', name: 'NABTEB Result Checker', price: 900, fees: { Customer: 100, Vendor: 50, Admin: 0 } },
                { id: 'nabteb-reg', name: 'NABTEB Registration Pin', price: 12500, fees: { Customer: 200, Vendor: 100, Admin: 0 } },
            ];
             const serviceDocRef = doc(servicesCollection);
             batch.set(serviceDocRef, {
                name: "Education",
                category: "Education",
                endpoint: "/epin",
                status: "Active",
                apiProviderIds: [{ id: primaryProviderId, priority: "Primary" }],
                markupType: 'none',
                markupValue: 0,
                variations: variations
            });
            hasWrites = true;
            console.log(`✨ Created Education service with ${variations.length} variations`);
            report.push(`[CREATED] 'Education' service document created with ${variations.length} variations.`);
        } else {
             console.log('✅ Education service already exists');
             report.push(`[EXISTS] 'Education' service document already exists.`);
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
            createdAt: createdAt,
            lastLogin: lastLogin
        } as UserData;
        console.log(`[UserProvider] Data fetch complete for ${uid}`);
        return userData;
    } else {
        console.log(`[UserProvider] No user data found for UID: ${uid}`);
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
            let requestBody: Record<string, any> = {};
            let endpoint: string = service.endpoint || '';
            let method: 'GET' | 'POST' = 'POST'; // Assuming POST for most purchases

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
                    network: variationId, 
                    amount: baseAmount,
                    mobile_number: inputs.mobile_number,
                    Ported_number: true,
                    airtime_type: "VTU"
                };
            } else if (service.category === 'Data') {
                 const networkVariation = service.variations?.find(v => v.id === inputs.networkId);
                 const selectedPlan = networkVariation?.plans?.find(p => p.planId === variationId);
                
                if (!selectedPlan) {
                    throw new Error("Could not find the selected data plan.");
                }

                totalCost = selectedPlan.price + (selectedPlan.fees?.[userData.role] || 0);
                description = `${networkVariation?.name} ${selectedPlan.name} for ${inputs.mobile_number}`;
                
                requestBody = {
                    network: inputs.networkId,
                    mobile_number: inputs.mobile_number,
                    plan: variationId, // This is the plan_id like '241'
                    Ported_number: true
                };

            } else if (service.category === 'Cable') {
                const selectedVariation = service.variations?.find(v => v.id === variationId);

                if (!selectedVariation) {
                    throw new Error("Could not find the selected cable package.");
                }
                totalCost = selectedVariation.price + (service.markupValue || 0);
                description = `${selectedVariation.name} for ${inputs.smart_card_number}`;
                
                requestBody = {
                    cablename: selectedVariation.providerName, // Use the providerName from the selected variation
                    cableplan: selectedVariation.id, // This is the planId like 'dstv-padi'
                    smart_card_number: inputs.smart_card_number,
                };
            } else if (service.category === 'Electricity') {
                 const selectedVariation = service.variations?.find(d => d.id === variationId);
                 if (!selectedVariation) {
                    throw new Error("Could not find the selected Disco.");
                 }
                 totalCost = inputs.amount + (selectedVariation.fees?.[userData.role] || 0);
                 description = `${selectedVariation.name} payment for ${inputs.meterNumber}`;
                 
                 requestBody = {
                     disco_name: selectedVariation.id,
                     MeterType: inputs.meterType === 'prepaid' ? '01' : '02',
                     meter_number: inputs.meterNumber,
                     amount: inputs.amount,
                 };
            } else if (service.category === 'Education') {
                 const selectedVariation = service.variations?.find(v => v.id === variationId);
                if (!selectedVariation) {
                    throw new Error("Could not find the selected E-Pin type.");
                }
                totalCost = selectedVariation.price + (selectedVariation.fees?.[userData.role] || 0);
                description = `${selectedVariation.name} Purchase`;
                
                const examBody = service.name; // e.g., 'WAEC', 'NECO'
                if (!examBody) {
                    throw new Error("Could not determine exam body from the service.");
                }

                requestBody = {
                    exam_name: examBody,
                    variation_code: variationId,
                    quantity: inputs.quantity || 1, // Default to 1 if not provided
                };
                
            } else if (service.category === 'Recharge Card') {
                 const selectedVariation = service.variations?.find(v => v.id === variationId);
                 if (!selectedVariation) {
                    throw new Error("Could not find the selected recharge card denomination.");
                 }
                 totalCost = (selectedVariation.price + (selectedVariation.fees?.[userData.role] || 0)) * inputs.quantity;
                 description = `${inputs.quantity} x ₦${selectedVariation.price} ${service.name} Purchase`;
                 requestBody = {
                    variation_code: selectedVariation.id,
                    ...inputs
                 };
            } else {
                 const selectedVariation = service.variations?.find(v => v.id === variationId);
                if (!selectedVariation) {
                    throw new Error("Could not find the selected service variation.");
                }
                totalCost = selectedVariation.price + (selectedVariation.fees?.[userData.role] || 0);
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
    console.log('========== GET SERVICES DEBUG START ==========');
    const servicesCol = collection(db, "services");
    const serviceSnapshot = await getDocs(query(servicesCol));
    
    console.log('📊 Total service documents found:', serviceSnapshot.size);
    const baseServices = serviceSnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📄 Service Document:', {
            id: doc.id,
            name: data.name,
            category: data.category,
            status: data.status,
            hasApiProviderIds: !!data.apiProviderIds,
            apiProviderCount: data.apiProviderIds?.length || 0,
            hasEmbeddedVariations: !!data.variations && data.variations.length > 0,
        });
        return { id: doc.id, ...doc.data(), apiProviderIds: data.apiProviderIds || [] } as Service;
    });
    
    const [allDataPlans, allCablePlans, allDiscos, allRechargeCardDenominations, allEducationPinTypes] = await Promise.all([
        getDataPlans(),
        getCablePlans(),
        getDiscos(),
        getRechargeCardDenominations(),
        getEducationPinTypes()
    ]);
    
    console.log('📦 Fetched from separate collections:', {
        dataPlans: allDataPlans.length,
        cablePlans: allCablePlans.length,
        discos: allDiscos.length,
        rechargeCardDenominations: allRechargeCardDenominations.length,
        educationPinTypes: allEducationPinTypes.length
    });
    
    const populatedServices = baseServices.map(service => {
        // If variations are already embedded in the service document, use them directly.
        if (service.variations && service.variations.length > 0) {
            console.log(`✅ Using ${service.variations.length} embedded variations for '${service.name}'.`);
            return service;
        }

        // Otherwise, populate from separate collections based on category.
        switch(service.category) {
            case 'Data':
                const networks = [...new Set(allDataPlans.map(p => p.networkName))];
                service.variations = networks.map(networkName => ({
                    id: networkName,
                    name: networkName,
                    price: 0,
                    plans: allDataPlans.filter(p => p.networkName === networkName),
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
                    fees: { Customer: 100, Vendor: 100, Admin: 0 },
                    status: d.status || 'Active',
                }));
                break;
             case 'Recharge Card':
                service.variations = allRechargeCardDenominations.map(d => ({
                    id: d.denominationId,
                    name: d.name,
                    price: d.price,
                    networkName: d.networkName,
                    fees: d.fees,
                    status: d.status || 'Active',
                }));
                break;
            case 'Education':
                 service.variations = allEducationPinTypes.map(e => ({
                    id: e.pinTypeId,
                    name: e.name,
                    price: e.price,
                    examBody: e.examBody,
                    fees: e.fees,
                    status: e.status || 'Active',
                }));
                break;
            default:
                if (!service.variations) {
                    service.variations = [];
                }
                break;
        }
        console.log(`🔄 Populated ${service.variations.length} variations for '${service.name}' from collection.`);
        return service;
    });

    console.log('========== GET SERVICES DEBUG END ==========');
    
    return populatedServices;
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

export async function updateDataPlanStatus(id: string, status: 'Active' | 'Inactive') {
    const planRef = doc(db, 'dataPlans', id);
await updateDoc(planRef, { status });
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

    await batch.commit();
}

export async function deleteDataPlan(id: string) {
    await deleteDoc(doc(db, 'dataPlans', id));
}

// --- Cable Plan Pricing Functions ---
export async function addCablePlan(plan: Omit<CablePlan, 'id'>) {
    await addDoc(collection(db, 'cablePlans'), {...plan, status: 'Active'});
}

export async function getCablePlans(): Promise<CablePlan[]> {
    const snapshot = await getDocs(query(collection(db, 'cablePlans')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CablePlan));
}

export async function updateCablePlanStatus(id: string, status: 'Active' | 'Inactive') {
    const planRef = doc(db, 'cablePlans', id);
    await updateDoc(planRef, { status });
}


export async function deleteCablePlan(id: string) {
    await deleteDoc(doc(db, 'cablePlans', id));
}

// --- Disco Pricing Functions ---
export async function addDisco(disco: Omit<Disco, 'id'>) {
    await addDoc(collection(db, 'discos'), {...disco, status: 'Active'});
}

export async function getDiscos(): Promise<Disco[]> {
    const snapshot = await getDocs(query(collection(db, 'discos')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Disco));
}

export async function updateDiscoStatus(id: string, status: 'Active' | 'Inactive') {
    const discoRef = doc(db, 'discos', id);
    await updateDoc(discoRef, { status });
}


export async function deleteDisco(id: string) {
    await deleteDoc(doc(db, 'discos', id));
}

// --- Recharge Card Denomination Functions ---
export async function addRechargeCardDenomination(denomination: Omit<RechargeCardDenomination, 'id'>) {
    await addDoc(collection(db, 'rechargeCardDenominations'), { ...denomination, status: 'Active' });
}

export async function getRechargeCardDenominations(): Promise<RechargeCardDenomination[]> {
    const snapshot = await getDocs(query(collection(db, 'rechargeCardDenominations')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RechargeCardDenomination));
}

export async function updateRechargeCardDenominationStatus(id: string, status: 'Active' | 'Inactive') {
    const denominationRef = doc(db, 'rechargeCardDenominations', id);
    await updateDoc(denominationRef, { status });
}

export async function deleteRechargeCardDenomination(id: string) {
    await deleteDoc(doc(db, 'rechargeCardDenominations', id));
}

// --- Education Pin Type Functions ---
export async function addEducationPinType(pinType: Omit<EducationPinType, 'id'>) {
    await addDoc(collection(db, 'educationPinTypes'), { ...pinType, status: 'Active' });
}

export async function getEducationPinTypes(): Promise<EducationPinType[]> {
    const snapshot = await getDocs(query(collection(db, 'educationPinTypes')));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EducationPinType));
}

export async function updateEducationPinTypeStatus(id: string, status: 'Active' | 'Inactive') {
    const pinTypeRef = doc(db, 'educationPinTypes', id);
    await updateDoc(pinTypeRef, { status });
}

export async function deleteEducationPinType(id: string) {
    await deleteDoc(doc(db, 'educationPinTypes', id));
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
