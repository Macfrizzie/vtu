
'use server';

import { getApiProviders } from "@/lib/firebase/firestore";

type VPayLoginResponse = {
  'b-access-token': string;
};

type VPayCreateCustomerResponse = {
    accountNumber: string;
    accountName: string;
    bankName: string;
    vpayReference: string;
    // other fields as needed
};

async function getVPayProvider() {
    const providers = await getApiProviders();
    const vpayProvider = providers.find(p => p.auth_type === 'VPay' && p.status === 'Active');
    if (!vpayProvider) {
        throw new Error("Active VPay provider not configured in API Providers.");
    }
    return vpayProvider;
}

async function getVPayAccessToken(provider: Awaited<ReturnType<typeof getVPayProvider>>) {
    if (!provider.vpay_username || !provider.vpay_privateKey) {
        throw new Error("VPay username or private key is missing in configuration.");
    }
    
    const response = await fetch(`${provider.baseUrl}/api/service/v1/query/merchant/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'publicKey': provider.vpay_publicKey || ''
        },
        body: JSON.stringify({
            username: provider.vpay_username,
            password: provider.vpay_privateKey,
        }),
    });
    
    const data = await response.json();
    
    if (!response.ok || !data['b-access-token']) {
        throw new Error('VPay login failed. Could not retrieve access token.');
    }
    
    return data['b-access-token'] as string;
}

export async function createVPayVirtualAccount(customer: {
    email: string;
    phone: string;
    contactfirstname: string;
    contactlastname: string;
}): Promise<VPayCreateCustomerResponse> {
    const provider = await getVPayProvider();
    const accessToken = await getVPayAccessToken(provider);

    const response = await fetch(`${provider.baseUrl}/api/service/v1/query/customer/add`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'publicKey': provider.vpay_publicKey || '',
            'b-access-token': accessToken,
        },
        body: JSON.stringify(customer),
    });

    const data = await response.json();
    
    if (!response.ok || (data.status && data.status !== 'success')) {
        console.error('VPay account creation failed:', data);
        throw new Error(data.message || 'Failed to create VPay virtual account.');
    }
    
    const accountDetails = data.data; // The actual data is nested here
    
    return {
        accountNumber: accountDetails.accountNumber,
        accountName: accountDetails.accountName,
        bankName: accountDetails.bankName,
        vpayReference: accountDetails.vpayReference,
    };
}
