
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { User } from 'firebase/auth';
import type { UserData } from '@/lib/types';
import { Loader2 } from 'lucide-react';

type UserContextType = {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  forceRefetch: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const mockUser = {
  uid: 'mock-user-id',
  email: 'user@example.com',
  displayName: 'Mock User',
};

const mockUserData: UserData = {
  uid: 'mock-user-id',
  email: 'user@example.com',
  fullName: 'Mock User',
  phone: '08012345678',
  role: 'Super Admin',
  createdAt: new Date(),
  walletBalance: 100000,
  status: 'Active',
  lastLogin: new Date(),
  reservedAccount: {
    provider: 'Paylony',
    bankName: 'Wema Bank',
    accountNumber: '1234567890',
    accountName: 'Mock User',
  },
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(mockUser as User);
  const [userData, setUserData] = useState<UserData | null>(mockUserData);
  const [loading, setLoading] = useState(false);

  const forceRefetch = useCallback(() => {
    // No-op in mock mode
  }, []);

  const value = { user, userData, loading, forceRefetch };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
