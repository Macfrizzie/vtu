
'use server';

import type { ApiProvider } from "@/lib/types";
import { getApiProviders } from "@/lib/firebase/firestore";

type PaylonyCreateAccountResponse = {
    account_number: string;
    account_name: string;
    bank_name: string;
};

async function getPaylonyProvider(): Promise<ApiProvider> {
    const providers = await getApiProviders();
    const paylonyProvider = providers.find(p => p.auth_type === 'Paylony' && p.status === 'Active');
    if (!paylonyProvider) {
        throw new Error("Active Paylony provider not configured in API Providers.");
    }
    return paylonyProvider;
}

export async function createPaylonyVirtualAccount(customer: {
    firstname: string;
    lastname: string;
    email: string;
    phone: string;
    dob: string;
    address: string;
    gender: string;
    provider?: string;
}): Promise<PaylonyCreateAccountResponse> {
    const provider = await getPaylonyProvider();

    if (!provider.paylony_secretKey) {
        throw new Error("Paylony Secret Key is missing in the provider configuration.");
    }

    const url = 'https://api.paylony.com/api/v1/create_account';

    const body = {
        firstname: customer.firstname,
        lastname: customer.lastname,
        address: customer.address,
        gender: customer.gender,
        email: customer.email,
        phone: customer.phone,
        dob: customer.dob,
        provider: customer.provider || 'netbank',
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${provider.paylony_secretKey}`,
        },
        body: JSON.stringify(body),
    });
    
    const responseData = await response.json();

    if (!response.ok || responseData.status !== '00') {
        console.error('Paylony account creation failed:', responseData);
        const errorMessage = responseData.statusMessage || responseData.message || 'Failed to create Paylony virtual account.';
        throw new Error(errorMessage);
    }
    
    const accountDetails = responseData.data;
    
    if (!accountDetails || !accountDetails.account_number) {
        console.error('Paylony response missing account details:', responseData);
        throw new Error('Paylony account creation response did not contain the expected account details.');
    }

    return {
        account_number: accountDetails.account_number,
        account_name: accountDetails.account_name,
        bank_name: accountDetails.bank_name,
    };
}
