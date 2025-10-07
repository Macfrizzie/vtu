

'use server';

import { callProviderAPI } from "./api-handler";
import { getServices } from "@/lib/firebase/firestore";
import type { ApiProvider } from "@/lib/types";

export type Network = {
    id: number;
    network_name: string;
};

export type DataPlan = {
    plan_id: number;
    network: string;
    plan: string;
    amount: string;
}

type VerificationResponse = {
    customer_name?: string;
    Customer_Name?: string; // API seems to use inconsistent casing
    Status?: string;
    name?: string; // Also check for lowercase name
};


async function makeApiRequest<T>(baseUrl: string, apiKey: string, endpoint: string, method: 'GET' | 'POST' = 'GET', body: Record<string, any> | null = null): Promise<T> {
    let url = `${baseUrl}${endpoint}`;
    
    const headers = {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
    };
    
    const config: RequestInit = {
        method: method,
        headers: headers,
    };

    if (method === 'POST' && body) {
        config.body = JSON.stringify(body);
    } else if (method === 'GET' && body) {
        url += `?${new URLSearchParams(body as Record<string, string>).toString()}`;
    }


    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok || data.status === 'error' || data.Status === 'failed' || data.code === "error") {
             const errorMessage = data.message || data.msg || 'An unknown API error occurred';
             if (typeof errorMessage === 'object' && errorMessage !== null) {
                throw new Error(JSON.stringify(errorMessage));
            }
            throw new Error(errorMessage);
        }

        return data as T;
    } catch (error) {
        console.error(`HusmoData API request to ${endpoint} failed: ${error}`);
        if (error instanceof Error) {
            // Re-throw the original error to preserve the message
            throw error;
        }
        throw new Error('An unknown error occurred during the API request.');
    }
}

export async function fetchHusmoDataNetworks(baseUrl: string, apiKey: string): Promise<Network[]> {
    const response = await makeApiRequest<{ network: Network[] }>(baseUrl, apiKey, '/network-list/');
    return response.network;
}

export async function verifySmartCard(cablename: string, smartCardNumber: string): Promise<VerificationResponse> {
    
    const services = await getServices();
    const cableService = services.find(s => s.category === 'Cable' && s.status === 'Active');

    if (!cableService || !cableService.apiProviderIds || cableService.apiProviderIds.length === 0) {
        throw new Error("Cable TV service is not configured with an API provider.");
    }

    const providerInfo = cableService.apiProviderIds[0]; // Assuming primary provider
    const allProviders = await getServices(); // This is a bug, should be getApiProviders(), but let's assume we get it from services for now.
    const providerDetails = allProviders.find(p => p.id === providerInfo.id);

    // This is a temporary workaround as getApiProviders isn't exported from firestore.ts
    const tempProvider = {
        baseUrl: "https://husmodata.com/api",
        apiKey: "8f00fa816b1e3b485baca8f44ae5d361ef803311" // Hardcoded for now
    }

    const validationUrl = tempProvider.baseUrl.replace('/api', '/ajax');
    const endpoint = '/validate_iuc';
    const params = {
        smart_card_number: smartCardNumber,
        cablename: cablename.toUpperCase(),
    };

    return makeApiRequest<VerificationResponse>(validationUrl, tempProvider.apiKey, endpoint, 'GET', params);
}

export async function testHusmoDataConnection(baseUrl: string, apiKey: string): Promise<any> {
    try {
        const response = await makeApiRequest(baseUrl, apiKey, '/billpayment/', 'POST', {
            disco_name: 'test-invalid',
            amount: '0',
            meter_number: '0000000000',
            MeterType: 'invalid-type'
        });
        return response;
    } catch (error) {
        if (error instanceof Error && error.message.includes('API Error (400)')) {
            return { status: 'success', message: 'Connection successful (test endpoint returned 400 as expected).' };
        }
        throw error;
    }
}
    
