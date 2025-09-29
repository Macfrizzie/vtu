import type { User, Transaction, Service } from './types';

export const mockUsers: User[] = [
  { id: 'USR001', name: 'Tunde Adebayo', email: 'tunde@example.com', role: 'Customer', status: 'Active', lastLogin: '2024-07-30T10:00:00Z' },
  { id: 'USR002', name: 'Aisha Ibrahim', email: 'aisha@example.com', role: 'Vendor', status: 'Active', lastLogin: '2024-07-30T11:30:00Z' },
  { id: 'USR003', name: 'Emeka Nwosu', email: 'emeka@example.com', role: 'Customer', status: 'Pending', lastLogin: '2024-07-29T14:00:00Z' },
  { id: 'USR004', name: 'Fatima Bello', email: 'fatima@example.com', role: 'Admin', status: 'Active', lastLogin: '2024-07-30T12:00:00Z' },
  { id: 'USR005', name: 'Yusuf Aliyu', email: 'yusuf@example.com', role: 'Vendor', status: 'Blocked', lastLogin: '2024-07-28T09:00:00Z' },
];

export const mockTransactions: Transaction[] = [
  { id: 'TRN001', date: '2024-07-30', description: 'MTN Airtime Purchase', amount: -500, type: 'Debit', status: 'Successful' },
  { id: 'TRN002', date: '2024-07-30', description: 'Wallet Funding', amount: 10000, type: 'Credit', status: 'Successful' },
  { id: 'TRN003', date: '2024-07-29', description: 'DSTV Subscription', amount: -7500, type: 'Debit', status: 'Successful' },
  { id: 'TRN004', date: '2024-07-29', description: 'Airtel Data 2GB', amount: -1200, type: 'Debit', status: 'Pending' },
  { id: 'TRN005', date: '2024-07-28', description: 'Wallet Funding', amount: 5000, type: 'Credit', status: 'Failed' },
  { id: 'TRN006', date: '2024-07-28', description: 'Ikeja Electric Bill', amount: -3500, type: 'Debit', status: 'Successful' },
];

export const mockServices: Service[] = [
    { id: 'SRV001', name: 'MTN Airtime', provider: 'MTN NG', status: 'Active', fee: 0 },
    { id: 'SRV002', name: 'Airtel Data', provider: 'Airtel NG', status: 'Active', fee: 1.5 },
    { id: 'SRV003', name: 'Ikeja Electric', provider: 'IKEDC', status: 'Active', fee: 100 },
    { id: 'SRV004', name: 'DSTV Subscription', provider: 'MultiChoice', status: 'Inactive', fee: 50 },
    { id: 'SRV005', name: 'Bulk SMS', provider: 'BulkSMS NG', status: 'Active', fee: 0.1 },
];


export const adminStats = {
    totalUsers: 1480,
    totalTransactions: 25987,
    totalRevenue: 450678.55,
    pendingIssues: 5,
};
