
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChangedHelper } from '@/lib/firebase/auth';
import { getUserData } from '@/lib/firebase/firestore';
import type { UserData } from '@/lib/types';
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

  const fetchAndSetData = useCallback(async (userAuth: User | null) => {
    if (userAuth) {
      console.log(`[UserProvider] Auth state changed: Logged in as ${userAuth.uid}. Fetching data...`);
      setLoading(true);
      const fetchedUserData = await getUserData(userAuth.uid);
      setUserData(fetchedUserData);
      setUser(userAuth);
      setLoading(false);
      console.log(`[UserProvider] Data fetch complete.`);
    } else {
      console.log(`[UserProvider] Auth state changed: Logged out.`);
      setUser(null);
      setUserData(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // onAuthStateChanged returns an unsubscribe function
    const unsubscribe = onAuthStateChangedHelper((userAuth) => {
      fetchAndSetData(userAuth);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [fetchAndSetData]);

  const forceRefetch = useCallback(() => {
    if (user) {
      console.log(`[UserProvider] forceRefetch triggered for user: ${user.uid}`);
      fetchAndSetData(user);
    } else {
      console.log(`[UserProvider] forceRefetch called but no user is logged in.`);
    }
  }, [user, fetchAndSetData]);


  const value = { user, userData, loading, forceRefetch };

  if (loading && !user && !userData) { // Only show global loader on initial, hard-page load
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
