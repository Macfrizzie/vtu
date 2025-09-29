
'use client';

import type { ReactNode } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { UserProvider } from '@/context/user-context';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChangedHelper } from '@/lib/firebase/auth';

const protectedRoutes = ['/dashboard', '/dashboard/services', '/dashboard/history', '/dashboard/profile', '/dashboard/wallet'];


export default function DashboardLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChangedHelper(user => {
            if (!user && protectedRoutes.find(route => pathname.startsWith(route))) {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [pathname, router]);


  return (
    <UserProvider>
      <div className="min-h-screen bg-background">
        <main className="p-4 pb-24">{children}</main>
        <BottomNav />
      </div>
    </UserProvider>
  );
}
