
'use client';

import type { ReactNode } from 'react';
import { DashboardShell, type NavItem } from '@/components/dashboard-shell';
import { LayoutDashboard, Users, Zap, History, Cog, Plug, DollarSign, Database, GanttChartSquare, HeartPulse } from 'lucide-react';
import { UserProvider } from '@/context/user-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { onAuthStateChangedHelper } from '@/lib/firebase/auth';
import { AdminBottomNav } from '@/components/admin-bottom-nav';

const navItems: NavItem[] = [
    { href: '/admin/dashboard', title: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/admin/users', title: 'Users', icon: <Users className="h-4 w-4" /> },
    { href: '/admin/services', title: 'Services', icon: <Zap className="h-4 w-4" /> },
    { href: '/admin/pricing', title: 'Pricing', icon: <DollarSign className="h-4 w-4" /> },
    { href: '/admin/transactions', title: 'Transactions', icon: <History className="h-4 w-4" /> },
    { href: '/admin/api-providers', title: 'API Providers', icon: <Plug className="h-4 w-4" /> },
    { href: '/admin/system-health', title: 'System Health', icon: <HeartPulse className="h-4 w-4" /> },
];

const protectedAdminRoutes = ['/admin/dashboard', '/admin/users', '/admin/services', '/admin/transactions', '/admin/api-providers', '/admin/pricing', '/admin/system-health'];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChangedHelper(user => {
      if (!user && protectedAdminRoutes.some(route => pathname.startsWith(route))) {
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
      <AdminBottomNav />
    </UserProvider>
  );
}
