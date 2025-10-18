
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Zap, History, Plug, DollarSign, GanttChartSquare, HeartPulse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from './ui/scroll-area';

const navItems = [
    { href: '/admin/dashboard', title: 'Overview', icon: <LayoutDashboard /> },
    { href: '/admin/users', title: 'Users', icon: <Users /> },
    { href: '/admin/services', title: 'Services', icon: <Zap /> },
    { href: '/admin/pricing', title: 'Pricing', icon: <DollarSign /> },
    { href: '/admin/transactions', title: 'Transactions', icon: <History /> },
    { href: '/admin/system-health', title: 'Health', icon: <HeartPulse /> },
];

export function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full border-t bg-background/95 backdrop-blur-sm sm:hidden">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex h-16 w-max justify-center">
            {navItems.map(item => {
            const isActive =
                (pathname.startsWith(item.href) && item.href !== '/admin/dashboard') ||
                pathname === item.href;
            return (
                <Link
                href={item.href}
                key={item.title}
                className={cn(
                    'group flex flex-col items-center justify-center gap-1 p-2 text-sm font-medium text-muted-foreground w-20',
                    {
                    'text-primary': isActive,
                    }
                )}
                >
                <div
                    className={cn(
                    'flex flex-col items-center justify-center gap-1',
                    { 'text-primary': isActive }
                    )}
                >
                    <div className="h-6 w-6">{item.icon}</div>
                    <span className="text-xs">{item.title}</span>
                    {isActive && (
                    <div className="h-1 w-6 rounded-full bg-primary" />
                    )}
                </div>
                </Link>
            );
            })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
