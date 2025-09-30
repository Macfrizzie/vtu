

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'Customer' | 'Vendor' | 'Admin';
  status: 'Active' | 'Pending' | 'Blocked';
  lastLogin: Date;
  walletBalance: number;
  createdAt: Date;
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
    provider: string;
    status: 'Active' | 'Inactive';
    fee: number;
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
};
