

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
};

export type ServiceFee = {
    Customer: number;
    Vendor: number;
    Admin: number;
};

export type ServiceVariation = {
    id: string; // e.g., mtn-1gb-30
    name: string; // e.g., 1GB - 30 Days
    price: number; // The base cost from the API provider
    fees: ServiceFee; // The commission you add for each user tier
};

export type Service = {
    id: string;
    name: string;
    provider: string; // e.g., 'mtn-data', 'dstv'
    category: 'Airtime' | 'Data' | 'Cable' | 'Electricity' | 'Education' | 'Other';
    status: 'Active' | 'Inactive';
    apiProviderId?: string;
    variations: ServiceVariation[]; // Array of plans or packages
};

export type ApiProvider = {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  requestHeaders: string; // JSON string
  status: 'Active' | 'Inactive';
  priority: 'Primary' | 'Fallback';
  transactionCharge: number;
  services?: string[]; // Array of service IDs this provider handles
};
