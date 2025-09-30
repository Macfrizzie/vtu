

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

export type Service = {
    id: string;
    name: string;
    provider: string; // e.g., 'mtn', 'dstv', 'ikedc'
    status: 'Active' | 'Inactive';
    fees: {
        Customer: number;
        Vendor: number;
        Admin: number;
    };
    apiProviderId?: string; // ID of the ApiProvider that handles this service
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
