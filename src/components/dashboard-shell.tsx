
'use client'

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { VtuBossLogo } from '@/components/icons';
import { UserNav } from '@/components/user-nav';
import { LanguageSwitcher } from '@/components/language-switcher';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  PanelLeft
} from "lucide-react"

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
     <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r bg-background sm:flex">
        <nav className="flex flex-col gap-6 text-lg font-medium p-4">
          <Link
            href="#"
            className="group flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-12 md:w-12 md:text-base"
          >
            <VtuBossLogo className="h-6 w-6 transition-all group-hover:scale-110" />
            <span className="sr-only">VTU Boss</span>
          </Link>
          {navItems.map((item) => (
             <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-2.5 ${pathname === item.href ? 'text-foreground' : 'text-muted-foreground'} hover:text-foreground`}
            >
              {item.icon}
              {item.title}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-col sm:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="sm:hidden">
                <PanelLeft className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-xs">
              <SheetHeader>
                <SheetTitle className="sr-only">Admin Menu</SheetTitle>
              </SheetHeader>
              <nav className="grid gap-6 text-lg font-medium">
                <Link
                  href="#"
                  className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                >
                  <VtuBossLogo className="h-5 w-5 transition-all group-hover:scale-110" />
                  <span className="sr-only">VTU Boss</span>
                </Link>
                 {navItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-4 px-2.5 ${pathname === item.href ? 'text-foreground' : 'text-muted-foreground'} hover:text-foreground`}
                    >
                      {item.icon}
                      {item.title}
                    </Link>
                  ))}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="relative ml-auto flex-1 md:grow-0">
             <div className="font-semibold">{userRole} Dashboard</div>
          </div>
           <div className="flex flex-1 items-center justify-end space-x-4">
              <nav className="flex items-center space-x-2">
                <LanguageSwitcher />
                <UserNav />
              </nav>
            </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
