
'use server';

import type { ApiProvider } from '@/lib/types';
import { Buffer } from 'buffer';


/**
 * Universal API Caller for VTU providers.
 * @param {ApiProvider} provider - The provider configuration object from the database.
 * @param {string} endpoint - The API endpoint path (e.g., /billpayment/).
 * @param {'GET' | 'POST'} method - The HTTP method.
 * @param {Record<string, any>} data - The payload for POST requests or query parameters for GET requests.
 * @returns {Promise<any>} - The JSON response from the provider's API.
 */
export async function callProviderAPI(
  provider: ApiProvider,
  endpoint: string,
  method: 'GET' | 'POST',
  data: Record<string, any> = {}
): Promise<any> {
  let url = `${provider.baseUrl}${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(provider.requestHeaders ? JSON.parse(provider.requestHeaders) : {})
  };

  // Add Authorization based on provider's auth_type
  if (provider.auth_type === 'Token' && provider.apiKey) {
    headers['Authorization'] = `Token ${provider.apiKey}`;
  } else if (provider.auth_type === 'API Key' && provider.apiKey) {
    headers['Authorization'] = provider.apiKey;
  } else if (provider.auth_type === 'Monnify' && provider.apiKey && provider.apiSecret) {
    const authString = Buffer.from(`${provider.apiKey}:${provider.apiSecret}`).toString('base64');
    headers['Authorization'] = `Basic ${authString}`;
  }
  // 'None' auth_type requires no special header.

  const config: RequestInit = {
    method: method,
    headers: headers,
  };

  if (method === 'GET') {
    const params = new URLSearchParams(data as Record<string, string>);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
  } else if (method === 'POST') {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, config);
    const responseData = await response.json();

    if (!response.ok) {
        throw new Error(responseData.message || responseData.msg || `API Error (${response.status}) from ${provider.name}`);
    }

    return responseData;
  } catch (err) {
    console.error(`Provider ${provider.name} request to ${url} failed:`, err);
    if (err instanceof Error) {
        throw err; // Re-throw the original error to be caught by the purchaseService loop
    }
    throw new Error('An unknown network error occurred.');
  }
}
