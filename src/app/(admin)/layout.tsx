
'use client';

import type { ReactNode } from 'react';
import { DashboardShell, type NavItem } from '@/components/dashboard-shell';
import { LayoutDashboard, Users, Zap, History, Cog } from 'lucide-react';
import { UserProvider } from '@/context/user-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { onAuthStateChangedHelper } from '@/lib/firebase/auth';

const navItems: NavItem[] = [
    { href: '/admin/dashboard', title: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/admin/users', title: 'Users', icon: <Users className="h-4 w-4" /> },
    { href: '/admin/services', title: 'Services', icon: <Zap className="h-4 w-4" /> },
    { href: '/admin/transactions', title: 'Transactions', icon: <History className="h-4 w-4" /> },
    { href: '/admin/api-connector', title: 'API Connector', icon: <Cog className="h-4 w-4" /> },
];

const protectedAdminRoutes = ['/admin/dashboard', '/admin/users', '/admin/services', '/admin/transactions', '/admin/api-connector'];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChangedHelper(user => {
      if (!user && protectedAdminRoutes.includes(pathname)) {
        router.push('/login');
      }
      // In a real app, you'd also check for admin role here.
    });
    return () => unsubscribe();
  }, [pathname, router]);

  return (
    <UserProvider>
      <DashboardShell navItems={navItems} userRole="Admin">
          {children}
      </DashboardShell>
    </UserProvider>
  );
}
