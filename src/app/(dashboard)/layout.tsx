import type { ReactNode } from 'react';
import { DashboardShell, type NavItem } from '@/components/dashboard-shell';
import { LayoutDashboard, Wallet, Smartphone, Zap, History, CreditCard } from 'lucide-react';

const navItems: NavItem[] = [
    { href: '/dashboard', title: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { href: '/dashboard/wallet', title: 'Wallet', icon: <Wallet className="h-4 w-4" /> },
    { href: '/dashboard/history', title: 'Transactions', icon: <History className="h-4 w-4" /> },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell navItems={navItems} userRole="User">
        {children}
    </DashboardShell>
  );
}
