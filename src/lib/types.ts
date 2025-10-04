

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
  apiProvider?: string;
};

export type ServiceVariation = {
  id: string; // variation_code, plan_id, or network_id
  name: string;
  price: number;
  planId?: string; // Add this to carry the API plan_id for data plans
  planType?: string; // Added to support categorization
  fees?: { [key in UserData['role']]: number };
  validity?: string;
  plans?: ServiceVariation[];
  providerName?: string; // For distinguishing cable plans
  status?: 'Active' | 'Inactive'; // For data plans
};

export type Service = {
  id: string; 
  name: string;
  category: string;
  provider?: string;
  status: 'Active' | 'Inactive';
  apiProviderIds?: { id: string, priority: 'Primary' | 'Fallback' }[]; // Links to ApiProviders
  markupType?: 'percentage' | 'fixed' | 'none'; // Global markup for this service
  markupValue?: number; // The actual percentage or fixed amount
  variations?: ServiceVariation[];
  endpoint?: string;
};

export type ApiProvider = {
  id: string;
  name:string;
  description?: string;
  baseUrl: string;
  auth_type: 'None' | 'Token' | 'API Key';
  apiKey?: string; 
  apiSecret?: string;
  requestHeaders?: string; // JSON string
  status: 'Active' | 'Inactive';
  priority: 'Primary' | 'Fallback';
  transactionCharge?: number;
};

export type DataPlan = {
    id: string; // This is the firestore doc id
    planId: string; // The manual Data ID from admin, e.g., "101"
    networkName: string; // "MTN", "GLO", etc.
    planType: string; // "SME", "Corporate", "Gifting"
    name: string; // "500MB", "1GB"
    price: number; // The base amount set by admin
    validity: string; // "30 days", "1 day"
    fees?: { [key in UserData['role']]: number };
    status?: 'Active' | 'Inactive';
};

export type CablePlan = {
    id: string; // Firestore doc id
    providerId: string; // "1" for GOTV, "2" for DSTV
    providerName: string;
    planId: string; // The manual plan ID from admin
    planName: string;
    basePrice: number;
};

export type Disco = {
    id: string;
    discoId: string;
    discoName: string;
};
    
