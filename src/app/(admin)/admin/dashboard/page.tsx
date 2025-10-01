
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
  DollarSign,
  AlertTriangle,
  Loader2,
  AlertCircle,
  ArrowRight,
  Zap,
  Plug,
} from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import type { Transaction, User, Service } from '@/lib/types';
import {
  getTransactions,
  getAllUsers,
  getServices,
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { OverviewChart } from './overview-chart';

export default function AdminDashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [allTransactions, allUsers, allServices] = await Promise.all([
          getTransactions(),
          getAllUsers(),
          getServices(),
        ]);
        setTransactions(allTransactions);
        setUsers(allUsers as User[]);
        setServices(allServices);
      } catch (error) {
        console.error('Failed to fetch admin data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const { totalRevenue, pendingTransactions, recentTransactions } = useMemo(() => {
    const totalRevenue = transactions
      .filter(tx => tx.type === 'Debit')
      .reduce((total, tx) => total + Math.abs(tx.amount), 0);

    const pendingTransactions = transactions.filter(
      tx => tx.status === 'Pending'
    ).length;

    const recentTransactions = transactions.slice(0, 5);

    return { totalRevenue, pendingTransactions, recentTransactions };
  }, [transactions]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground">
          A summary of your platform's activity.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={loading ? '...' : users.length.toLocaleString()}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          href="/admin/users"
        />
        <StatCard
          title="Total Transactions"
          value={loading ? '...' : transactions.length.toLocaleString()}
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
          href="/admin/transactions"
        />
        <StatCard
          title="Total Revenue (Debits)"
          value={loading ? '...' : `₦${totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          href="/admin/transactions"
        />
        <StatCard
          title="Pending Transactions"
          value={loading ? '...' : pendingTransactions.toString()}
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
          variant={pendingTransactions > 0 ? 'destructive' : 'default'}
          href="/admin/transactions"
        />
      </div>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="grid gap-8 lg:grid-cols-2">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Platform Activity</CardTitle>
                    <CardDescription>Revenue and transaction volume over the last 7 days.</CardDescription>
                </CardHeader>
                <CardContent>
                    <OverviewChart transactions={transactions} />
                </CardContent>
            </Card>

          <Card>
            <CardHeader>
              <CardTitle>Real-time Transaction Monitoring</CardTitle>
              <CardDescription>
                The 5 most recent transactions on the platform.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
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
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <ActionCard 
                    title="Manage Users"
                    description="View, edit, and manage all users."
                    icon={<Users className="h-6 w-6 text-primary" />}
                    href="/admin/users"
                />
                 <ActionCard 
                    title="Manage Services"
                    description="Configure all available platform services."
                    icon={<Zap className="h-6 w-6 text-primary" />}
                    href="/admin/services"
                />
                 <ActionCard 
                    title="Manage API Providers"
                    description="Configure third-party API providers."
                    icon={<Plug className="h-6 w-6 text-primary" />}
                    href="/admin/api-providers"
                />
            </div>
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
  variant = 'default',
  href
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  variant?: 'default' | 'destructive';
  href: string;
}) {
  return (
    <Link href={href}>
        <Card
        className={cn(
            'hover:bg-muted/50 transition-colors',
            variant === 'destructive' &&
            'bg-destructive/10 border-destructive text-destructive-foreground hover:bg-destructive/20'
        )}
        >
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
