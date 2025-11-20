
'use client';

import type { ReactNode } from 'react';
import { DashboardShell, type NavItem } from '@/components/dashboard-shell';
import { LayoutDashboard, Users, Zap, History, Cog, Plug, DollarSign, Database, GanttChartSquare, HeartPulse, Shield } from 'lucide-react';
import { UserProvider, useUser } from '@/context/user-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { onAuthStateChangedHelper } from '@/lib/firebase/auth';
import { AdminBottomNav } from '@/components/admin-bottom-nav';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

const defaultNavItems: NavItem[] = [
    { href: '/admin/dashboard', title: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/admin/users', title: 'Users', icon: <Users className="h-4 w-4" /> },
    { href: '/admin/services', title: 'Services', icon: <Zap className="h-4 w-4" /> },
    { href: '/admin/pricing', title: 'Pricing', icon: <DollarSign className="h-4 w-4" /> },
    { href: '/admin/transactions', title: 'Transactions', icon: <History className="h-4 w-4" /> },
    { href: '/admin/api-providers', title: 'API Providers', icon: <Plug className="h-4 w-4" /> },
    { href: '/admin/system-health', title: 'System Health', icon: <HeartPulse className="h-4 w-4" /> },
];

const superAdminNavItem: NavItem = { href: '/super-admin', title: 'Super Admin', icon: <Shield className="h-4 w-4" /> };


const protectedAdminRoutes = ['/admin', '/super-admin'];

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { userData, loading } = useUser();

  useEffect(() => {
    const unsubscribe = onAuthStateChangedHelper(user => {
      if (!user && protectedAdminRoutes.some(route => pathname.startsWith(route))) {
        router.push('/login');
      }
    });

    if (!loading && userData && !['Admin', 'Super Admin'].includes(userData.role)) {
      router.push('/dashboard');
    }
    
    return () => unsubscribe();
  }, [pathname, router, userData, loading]);

  const navItems = useMemo(() => {
    if (userData?.role === 'Super Admin') {
      return [...defaultNavItems, superAdminNavItem];
    }
    return defaultNavItems;
  }, [userData?.role]);


  return (
      <DashboardShell navItems={navItems} userRole={(userData?.role || 'Admin') as any}>
          {children}
      </DashboardShell>
  );
}


export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <FirebaseErrorListener />
      <AdminLayoutContent>{children}</AdminLayoutContent>
      <AdminBottomNav />
    </UserProvider>
  );
}
