import type { ReactNode } from 'react';
import { DashboardShell, type NavItem } from '@/components/dashboard-shell';
import { LayoutDashboard, Users, Zap, History, Cog } from 'lucide-react';

const navItems: NavItem[] = [
    { href: '/admin/dashboard', title: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/admin/users', title: 'Users', icon: <Users className="h-4 w-4" /> },
    { href: '/admin/services', title: 'Services', icon: <Zap className="h-4 w-4" /> },
    { href: '/admin/transactions', title: 'Transactions', icon: <History className="h-4 w-4" /> },
    { href: '/admin/api-connector', title: 'API Connector', icon: <Cog className="h-4 w-4" /> },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell navItems={navItems} userRole="Admin">
        {children}
    </DashboardShell>
  );
}
