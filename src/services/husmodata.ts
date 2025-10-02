
'use server';

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
};


async function makeApiRequest<T>(baseUrl: string, apiKey: string, endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${baseUrl}${endpoint}`;
    
    const headers = {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
    };

    try {
        const response = await fetch(url, { ...options, headers });
        
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API Error (${response.status}): ${errorBody}`);
        }
        
        // HusmoData can return 200 OK with an error message in the body
        const data = await response.json();
        if (data.status === 'error' || data.Status === 'failed') {
            // Some error messages are in 'msg', some in 'message'
            const errorMessage = data.msg || data.message || 'An unknown API error occurred';
            // Sometimes the error is nested, e.g., in data responses
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

export async function verifySmartCard(baseUrl: string, apiKey: string, serviceId: string, smartCardNumber: string): Promise<VerificationResponse> {
    const endpoint = '/verify-meter/';
    const body = {
        meter_number: smartCardNumber,
        disco_name: serviceId, // For cable, serviceId is 'dstv', 'gotv' etc.
    };

    return makeApiRequest<VerificationResponse>(baseUrl, apiKey, endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function fetchHusmoDataPlans(baseUrl: string, apiKey: string, networkId: string): Promise<DataPlan[]> {
    const endpoint = `/get/data/?network_id=${networkId}`;
    const response = await makeApiRequest<{ DATAPLANS: DataPlan[] }>(baseUrl, apiKey, endpoint);
    return response.DATAPLANS;
}

    