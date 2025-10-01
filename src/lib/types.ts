
export type User = {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: 'Customer' | 'Vendor' | 'Admin';
  status: 'Active' | 'Pending' | 'Blocked';
  lastLogin: Date;
  walletBalance: number;
  createdAt: Date;
};

export type UserData = {
    uid: string;
    email: string;
    fullName: string;
    role: 'Customer' | 'Vendor' | 'Admin';
    createdAt: Date;
    walletBalance: number;
    status: 'Active' | 'Pending' | 'Blocked';
    lastLogin: Date;
};


export type Transaction = {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'Credit' | 'Debit';
  status: 'Successful' | 'Pending' | 'Failed';
  userId: string;
  userEmail?: string;
  apiResponse?: string;
};

export type Service = {
  id: string;
  name: string;
  provider: string; // This can be a service code like '1' (for MTN), 'dstv' etc.
  category: 'Airtime' | 'Data' | 'Cable' | 'Electricity' | 'Education' | 'Other';
  status: 'Active' | 'Inactive';
  apiProviderId: string; // Link to an ApiProvider
};


export type ApiProvider = {
  id: string;
  name:string;
  description?: string;
  baseUrl: string;
  apiKey: string; // Will store the API Token
  apiSecret?: string;
  requestHeaders?: string; // JSON string
  status: 'Active' | 'Inactive';
  priority: 'Primary' | 'Fallback';
  transactionCharge?: number;
  services?: string[]; // Array of service IDs this provider handles
};

export type AirtimePrice = {
    id: string;
    serviceId: string;
    apiProviderId: string;
    networkId: string;
    networkName: string;
    discountPercent: number;
};

export type DataPlan = {
    id: string;
    serviceId: string;
    apiProviderId: string;
    networkId: string;
    networkName: string;
    planId: string;
    planName: string;
    price: number;
};
