
import type { ReactNode } from 'react';
import { BottomNav } from '@/components/bottom-nav';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <main className="p-4 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
