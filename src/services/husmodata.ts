
'use server';

export type Network = {
    id: number;
    network_name: string;
};

// In a real app, the API key would not be hardcoded.
// It would come from the API Provider configuration in Firestore.
const API_KEY = '66f2e5c39ac8640f13cd888f161385b12f7e5e92';
const BASE_URL = 'https://husmodataapi.com/api';

async function makeApiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    
    const headers = {
        'Authorization': `Token ${API_KEY}`,
        'Content-Type': 'application/json',
        ...options.headers,
    };

    try {
        const response = await fetch(url, { ...options, headers });
        
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API Error (${response.status}): ${errorBody}`);
        }
        
        // HusmoData often returns 200 OK with an error message in the body
        const data = await response.json();
        if (data.status === 'error' || data.Status === 'failed') {
            throw new Error(data.msg || data.message || 'An unknown API error occurred');
        }

        return data as T;
    } catch (error) {
        console.error(`HusmoData API request failed: ${error}`);
        throw error;
    }
}

export async function getNetworks(): Promise<Network[]> {
    // The documentation mentions GET /api/get/network/, let's assume it returns an object with a 'network' key
    const response = await makeApiRequest<{ network: Network[] }>('/get/network/');
    return response.network;
}
