import type { User, Transaction, Service } from './types';

export const mockUsers: User[] = [
  { id: 'USR001', uid: 'USR001', name: 'Tunde Adebayo', email: 'tunde@example.com', role: 'Customer', status: 'Active', lastLogin: new Date('2024-07-30T10:00:00Z'), walletBalance: 5000, createdAt: new Date('2024-01-15') },
  { id: 'USR002', uid: 'USR002', name: 'Aisha Ibrahim', email: 'aisha@example.com', role: 'Vendor', status: 'Active', lastLogin: new Date('2024-07-30T11:30:00Z'), walletBalance: 15000, createdAt: new Date('2024-02-20') },
  { id: 'USR003', uid: 'USR003', name: 'Emeka Nwosu', email: 'emeka@example.com', role: 'Customer', status: 'Pending', lastLogin: new Date('2024-07-29T14:00:00Z'), walletBalance: 2000, createdAt: new Date('2024-03-10') },
  { id: 'USR004', uid: 'USR004', name: 'Fatima Bello', email: 'fatima@example.com', role: 'Admin', status: 'Active', lastLogin: new Date('2024-07-30T12:00:00Z'), walletBalance: 0, createdAt: new Date('2024-01-01') },
  { id: 'USR005', uid: 'USR005', name: 'Yusuf Aliyu', email: 'yusuf@example.com', role: 'Vendor', status: 'Blocked', lastLogin: new Date('2024-07-28T09:00:00Z'), walletBalance: 500, createdAt: new Date('2024-04-05') },
];

export const mockTransactions: Transaction[] = [
  { id: 'TRN001', userId: 'USR001', date: new Date('2024-07-30'), description: 'MTN Airtime Purchase', amount: -500, type: 'Debit', status: 'Successful' },
  { id: 'TRN002', userId: 'USR001', date: new Date('2024-07-30'), description: 'Wallet Funding', amount: 10000, type: 'Credit', status: 'Successful' },
  { id: 'TRN003', userId: 'USR002', date: new Date('2024-07-29'), description: 'DSTV Subscription', amount: -7500, type: 'Debit', status: 'Successful' },
  { id: 'TRN004', userId: 'USR002', date: new Date('2024-07-29'), description: 'Airtel Data 2GB', amount: -1200, type: 'Debit', status: 'Pending' },
  { id: 'TRN005', userId: 'USR003', date: new Date('2024-07-28'), description: 'Wallet Funding', amount: 5000, type: 'Credit', status: 'Failed' },
  { id: 'TRN006', userId: 'USR001', date: new Date('2024-07-28'), description: 'Ikeja Electric Bill', amount: -3500, type: 'Debit', status: 'Successful' },
];

export const mockServices: Service[] = [
    { id: 'SRV001', name: 'MTN Airtime', category: 'Airtime', status: 'Active' },
    { id: 'SRV002', name: 'Airtel Data', category: 'Data', status: 'Active' },
    { id: 'SRV003', name: 'Ikeja Electric', category: 'Electricity', status: 'Active' },
    { id: 'SRV004', name: 'DSTV Subscription', category: 'Cable', status: 'Inactive' },
    { id: 'SRV005', name: 'Education Pins', category: 'Education', status: 'Active' },
];


export const adminStats = {
    totalUsers: 1480,
    totalTransactions: 25987,
    totalRevenue: 450678.55,
    pendingIssues: 5,
};
