
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChangedHelper } from '@/lib/firebase/auth';
import { getUserData, type UserData } from '@/lib/firebase/firestore';
import { Loader2 } from 'lucide-react';

type UserContextType = {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  forceRefetch: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const forceRefetch = useCallback(() => {
    setRefetchTrigger(c => c + 1);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedHelper(async (userAuth) => {
      setLoading(true);
      if (userAuth) {
        setUser(userAuth);
        const fetchedUserData = await getUserData(userAuth.uid);
        setUserData(fetchedUserData);
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [refetchTrigger]);

  const value = { user, userData, loading, forceRefetch };

  if (loading) {
      return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
