'use client'

import * as React from 'react';
import Link, { type LinkProps } from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { VtuBossLogo } from '@/components/icons';
import { UserNav } from '@/components/user-nav';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NavItem {
  href: string;
  title: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

interface DashboardShellProps {
  navItems: NavItem[];
  children: React.ReactNode;
  userRole: 'User' | 'Admin';
}

export function DashboardShell({ navItems, children, userRole }: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <VtuBossLogo className="h-8 w-8 text-primary" />
            <span className="text-lg font-bold">VTU Boss</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  className="w-full justify-start"
                >
                  <Link href={item.href}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="w-full justify-start" asChild>
                <Link href="/login">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-40 w-full border-b bg-background">
          <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
            <div className="flex gap-2 items-center">
                 <SidebarTrigger className="md:hidden"/>
                 <div className="font-semibold">{userRole} Dashboard</div>
            </div>
            <div className="flex flex-1 items-center justify-end space-x-4">
              <nav className="flex items-center space-x-2">
                <LanguageSwitcher />
                <UserNav />
              </nav>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
