export type User = {
  id: string;
  name: string;
  email: string;
  role: 'Customer' | 'Vendor' | 'Admin';
  status: 'Active' | 'Pending' | 'Blocked';
  lastLogin: string;
};

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'Credit' | 'Debit';
  status: 'Successful' | 'Pending' | 'Failed';
};

export type Service = {
    id: string;
    name: string;
    provider: string;
    status: 'Active' | 'Inactive';
    fee: number;
};
