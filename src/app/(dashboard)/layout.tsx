
'use client';

import type { ReactNode } from 'react';
import { BottomNav } from '@/components/bottom-nav';
import { UserProvider } from '@/context/user-context';


export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      <div className="min-h-screen bg-background">
        <main className="p-4 sm:p-6 pb-24">{children}</main>
        <BottomNav />
      </div>
    </UserProvider>
  );
}
