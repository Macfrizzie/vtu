
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase/client-app';
import { getUserData } from '@/lib/firebase/firestore';
import type { UserData } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

type UserContextType = {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  forceRefetch: () => void;
};

const UserContext = createContext<UserContextType | undefined>(undefined);
const auth = getAuth(app);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  const forceRefetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      setLoading(true);
      if (authUser) {
        setUser(authUser);
        try {
          const data = await getUserData(authUser.uid);
          setUserData(data);
          
          const isAdminPath = pathname.startsWith('/admin') || pathname.startsWith('/super-admin');
          const userIsAdmin = data?.role === 'Admin' || data?.role === 'Super Admin';

          if (isAdminPath && !userIsAdmin) {
            router.push('/dashboard');
          }

        } catch (error) {
          console.error("Failed to fetch user data:", error);
          setUserData(null);
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setUserData(null);
        const isProtectedRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/super-admin');
        if (isProtectedRoute) {
           router.push('/login');
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, pathname, refetchTrigger]);

  const value = { user, userData, loading, forceRefetch };

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/forgot-password') || pathname === '/';
  if (loading && !isAuthPage) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
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
