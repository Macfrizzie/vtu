

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

export type ServiceVariation = {
  id: string;
  name: string;
  price: number;
  fees: {
    Customer: number;
    Vendor: number;
    Admin: number;
  };
};

export type Service = {
  id: string;
  name: string;
  provider: string; // This can be a service code like 'mtn', 'dstv'
  category: 'Airtime' | 'Data' | 'Cable' | 'Electricity' | 'Education' | 'Other';
  status: 'Active' | 'Inactive';
  apiProviderId?: string; // Link to an ApiProvider
  variations: ServiceVariation[];
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

    
