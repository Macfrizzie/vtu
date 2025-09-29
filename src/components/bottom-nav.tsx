
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutGrid, Receipt, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', title: 'Home', icon: <Home /> },
  { href: '/dashboard/services', title: 'Pay', icon: <LayoutGrid /> },
  { href: '/dashboard/history', title: 'Transaction', icon: <Receipt /> },
  { href: '/dashboard/profile', title: 'Profile', icon: <User /> },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full border-t bg-background/95 backdrop-blur-sm">
      <div className="grid h-16 grid-cols-4">
        {navItems.map(item => {
          const isActive =
            (pathname.startsWith(item.href) && item.href !== '/dashboard') ||
            pathname === item.href;
          return (
            <Link
              href={item.href}
              key={item.title}
              className={cn(
                'group flex flex-col items-center justify-center gap-1 text-sm font-medium text-muted-foreground',
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
                {item.icon}
                <span className="text-xs">{item.title}</span>
                {isActive && (
                  <div className="h-1 w-6 rounded-full bg-primary" />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
