

'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Users,
  CreditCard,
  Loader2,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { Transaction, User } from '@/lib/types';
import {
  getTransactions,
  getAllUsers,
} from '@/lib/firebase/firestore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function SuperAdminDashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [allTransactions, allUsers] = await Promise.all([
          getTransactions(),
          getAllUsers(),
        ]);
        setTransactions(allTransactions);
        setUsers(allUsers as User[]);
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const { totalAdmins, recentTransactions } = useMemo(() => {
    const totalAdmins = users.filter(
      u => u.role === 'Admin' || u.role === 'Super Admin'
    ).length;

    const recentTransactions = transactions.slice(0, 5);

    return { totalAdmins, recentTransactions };
  }, [transactions, users]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Top-level overview of the entire platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
            <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </>
        ) : (
            <>
                <StatCard
                  title="Total Users"
                  value={users.length.toLocaleString()}
                  icon={<Users className="h-4 w-4 text-muted-foreground" />}
                  href="/admin/users"
                />
                <StatCard
                  title="Total Transactions"
                  value={transactions.length.toLocaleString()}
                  icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
                  href="/admin/transactions"
                />
                <StatCard
                  title="Administrators"
                  value={totalAdmins.toString()}
                  icon={<Shield className="h-4 w-4 text-muted-foreground" />}
                  href="/super-admin/admins"
                />
            </>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Recent Platform Transactions</CardTitle>
                    <CardDescription>The 5 most recent transactions across the platform.</CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map(tx => (
                      <TableRow key={tx.id} className="relative cursor-pointer hover:bg-muted">
                         <TableCell>
                          <Link href={`/admin/transactions/${tx.id}`} className="absolute inset-0 z-10" />
                          <div className="font-medium">
                            {tx.userEmail?.split('@')[0] || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(tx.date).toLocaleTimeString()}
                          </div>
                        </TableCell>
                        <TableCell>{tx.description}</TableCell>
                        <TableCell
                          className={cn(
                            'text-right font-semibold',
                            tx.type === 'Credit'
                              ? 'text-green-600'
                              : 'text-red-600'
                          )}
                        >
                          {tx.type === 'Credit' ? '+' : '-'}₦
                          {Math.abs(tx.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              tx.status === 'Successful'
                                ? 'default'
                                : tx.status === 'Pending'
                                ? 'secondary'
                                : 'destructive'
                            }
                            className={cn(
                              tx.status === 'Successful' &&
                                'bg-green-500 hover:bg-green-600'
                            )}
                          >
                            {tx.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </CardContent>
            </Card>
          
            <div className="space-y-4">
                <ActionCard 
                    title="Manage Admins"
                    description="View, promote, or demote administrators."
                    icon={<Shield className="h-6 w-6 text-primary" />}
                    href="/super-admin/admins"
                />
                 <ActionCard 
                    title="View All Users"
                    description="Access the main user management page."
                    icon={<Users className="h-6 w-6 text-primary" />}
                    href="/admin/users"
                />
            </div>

        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  href
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link href={href}>
        <Card className={'hover:bg-muted/50 transition-colors'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    </Link>
  );
}

function StatCardSkeleton() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded-md" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded-full" />
            </CardHeader>
            <CardContent>
                 <div className="h-7 w-20 bg-muted animate-pulse rounded-md" />
            </CardContent>
        </Card>
    )
}

function ActionCard({ title, description, icon, href }: { title: string, description: string, icon: React.ReactNode, href: string }) {
    return (
        <Link href={href} className="group">
            <Card className="hover:bg-muted/50 transition-colors h-full">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                           {icon}
                            <CardTitle className="text-lg">{title}</CardTitle>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </CardContent>
            </Card>
        </Link>
    )
}

    