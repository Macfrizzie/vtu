

'use client';

import type { ReactNode } from 'react';
import { DashboardShell, type NavItem } from '@/components/dashboard-shell';
import { LayoutDashboard, Users, Shield } from 'lucide-react';
import { UserProvider, useUser } from '@/context/user-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { onAuthStateChangedHelper } from '@/lib/firebase/auth';
import { AdminBottomNav } from '@/components/admin-bottom-nav';

const navItems: NavItem[] = [
    { href: '/super-admin', title: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/super-admin/admins', title: 'Admins', icon: <Users className="h-4 w-4" /> },
    { href: '/admin/dashboard', title: 'Back to Admin', icon: <Shield className="h-4 w-4" /> },
];


const protectedRoutes = ['/super-admin'];

function SuperAdminLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userData, loading } = useUser();

  useEffect(() => {
    const unsubscribe = onAuthStateChangedHelper(user => {
      if (!user && protectedRoutes.some(route => pathname.startsWith(route))) {
        router.push('/login');
      }
    });

    if (!loading && userData && userData.role !== 'Super Admin') {
        router.push('/admin/dashboard');
    }

    return () => unsubscribe();
  }, [pathname, router, userData, loading]);

  if (loading || !userData) {
      return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }


  return (
      <DashboardShell navItems={navItems} userRole="Super Admin">
          {children}
      </DashboardShell>
  );
}


export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <SuperAdminLayoutContent>{children}</SuperAdminLayoutContent>
    </UserProvider>
  );
}

    