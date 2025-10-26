
'use server';

import type { ApiProvider } from "@/lib/types";
import { getApiProviders } from "@/lib/firebase/firestore";

type StrowalletCreateAccountResponse = {
    account_number: string;
    account_name: string;
    bank: string;
};

async function getStrowalletProvider(): Promise<ApiProvider> {
    const providers = await getApiProviders();
    const strowalletProvider = providers.find(p => p.auth_type === 'Strowallet' && p.status === 'Active');
    if (!strowalletProvider) {
        throw new Error("Active Strowallet provider not configured in API Providers.");
    }
    return strowalletProvider;
}

export async function createStrowalletVirtualAccount(customer: {
    email: string;
    phone: string;
    account_name: string;
}): Promise<StrowalletCreateAccountResponse> {
    const provider = await getStrowalletProvider();

    if (!provider.strowallet_publicKey) {
        throw new Error("Strowallet Public Key is missing in the provider configuration.");
    }

    // Construct the full URL
    const url = `${provider.baseUrl}/virtual-bank/new-customer/`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            public_key: provider.strowallet_publicKey,
            email: customer.email,
            account_name: customer.account_name,
            phone: customer.phone,
            webhook_url: 'https://vtuboss.com/webhook', // A placeholder webhook URL
            mode: 'sandbox',
        }),
    });
    
    const responseData = await response.json();

    if (!response.ok || responseData.success === false) {
        console.error('Strowallet account creation failed:', responseData);
        let errorMessage = responseData.message || 'Failed to create Strowallet virtual account.';
        if (typeof errorMessage === 'object') {
            errorMessage = JSON.stringify(errorMessage);
        }
        throw new Error(errorMessage);
    }
    
    const accountDetails = responseData.data;
    
    if (!accountDetails || !accountDetails.account_number) {
        console.error('Strowallet response missing account details:', responseData);
        throw new Error('Strowallet account creation response did not contain the expected account details.');
    }

    return {
        account_number: accountDetails.account_number,
        account_name: accountDetails.account_name,
        bank: accountDetails.bank,
    };
}
