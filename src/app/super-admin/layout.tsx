

'use client';

import type { ReactNode } from 'react';
import { DashboardShell, type NavItem } from '../(admin)/dashboard-shell';
import { LayoutDashboard, Users, Shield, Loader2 } from 'lucide-react';
import { UserProvider, useUser } from '@/context/user-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

const navItems: NavItem[] = [
    { href: '/super-admin', title: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/super-admin/admins', title: 'Admins', icon: <Users className="h-4 w-4" /> },
    { href: '/admin/dashboard', title: 'Back to Admin', icon: <Shield className="h-4 w-4" /> },
];


function SuperAdminLayoutContent({ children }: { children: ReactNode }) {
  const { userData, loading } = useUser();

  if (loading || !userData) {
      return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin"/></div>
  }

  return (
      <DashboardShell navItems={navItems} userRole={"Super Admin" as any}>
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
