
'use server';

import type { ApiProvider } from "@/lib/types";
import { getApiProviders } from "@/lib/firebase/firestore";

type VPayLoginResponse = {
  "b-access-token": string;
};

type VPayCreateCustomerResponse = {
    accountNumber: string;
    accountName: string;
    bankName: string;
    vpayReference: string;
    // other fields as needed
};

async function getVPayProvider(): Promise<ApiProvider> {
    const providers = await getApiProviders();
    const vpayProvider = providers.find(p => p.auth_type === 'VPay' && p.status === 'Active');
    if (!vpayProvider) {
        throw new Error("Active VPay provider not configured in API Providers.");
    }
    return vpayProvider;
}

async function getVPayAccessToken(provider: Awaited<ReturnType<typeof getVPayProvider>>): Promise<string> {
    if (!provider.vpay_username || !provider.vpay_privateKey || !provider.vpay_publicKey) {
        throw new Error("VPay username, private key, or public key is missing in configuration.");
    }

    // Correct the URL to remove the duplicate /api
    const loginUrl = provider.baseUrl.endsWith('/api')
        ? `${provider.baseUrl}/service/v1/query/merchant/login`
        : `${provider.baseUrl}/api/service/v1/query/merchant/login`;

    const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'publicKey': provider.vpay_publicKey
        },
        body: JSON.stringify({
            username: provider.vpay_username,
            password: provider.vpay_privateKey,
        }),
    });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error("VPay Login API Error Response:", errorText);
        throw new Error(`VPay login failed with status: ${response.status}.`);
    }

    const data: VPayLoginResponse = await response.json();
    
    if (!data['b-access-token']) {
        console.error("VPay Login Response did not contain access token:", data);
        throw new Error('VPay login failed. Could not retrieve access token from response.');
    }
    
    return data['b-access-token'];
}

export async function createVPayVirtualAccount(customer: {
    email: string;
    phone: string;
    contactfirstname: string;
    contactlastname: string;
}): Promise<VPayCreateCustomerResponse> {
    const provider = await getVPayProvider();
    const accessToken = await getVPayAccessToken(provider);

    // Correct the URL to remove the duplicate /api
    const createCustomerUrl = provider.baseUrl.endsWith('/api')
        ? `${provider.baseUrl}/service/v1/query/customer/add`
        : `${provider.baseUrl}/api/service/v1/query/customer/add`;

    const response = await fetch(createCustomerUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'publicKey': provider.vpay_publicKey || '',
            'b-access-token': accessToken,
        },
        body: JSON.stringify(customer),
    });
    
    const responseText = await response.text();
    let data;
    try {
        data = JSON.parse(responseText);
    } catch (e) {
        console.error('VPay account creation response was not valid JSON:', responseText);
        throw new Error(`Failed to create VPay virtual account: Server returned invalid data.`);
    }

    if (!response.ok || (data.status && data.status !== 'success')) {
        console.error('VPay account creation failed:', data);
        throw new Error(data.message || 'Failed to create VPay virtual account.');
    }
    
    const accountDetails = data.data; // The actual data is nested here
    
    if (!accountDetails || !accountDetails.accountNumber) {
        console.error('VPay response missing account details:', data);
        throw new Error('VPay account creation response did not contain the expected account details.');
    }

    return {
        accountNumber: accountDetails.accountNumber,
        accountName: accountDetails.accountName,
        bankName: accountDetails.bankName,
        vpayReference: accountDetails.vpayReference,
    };
}
