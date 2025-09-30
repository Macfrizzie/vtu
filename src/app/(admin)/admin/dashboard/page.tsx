
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
        />
        <StatCard
          title="Total Transactions"
          value={loading ? '...' : transactions.length.toLocaleString()}
          icon={<CreditCard className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Total Revenue (Debits)"
          value={loading ? '...' : `₦${totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <StatCard
          title="Pending Transactions"
          value={loading ? '...' : pendingTransactions.toString()}
          icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />}
          variant={pendingTransactions > 0 ? 'destructive' : 'default'}
        />
      </div>

      {loading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="grid gap-8 md:grid-cols-2">
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
                      <TableRow key={tx.id}>
                        <TableCell>
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
          <Card>
            <CardHeader>
              <CardTitle>Alerts & Warnings</CardTitle>
              <CardDescription>
                Important system notifications will appear here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Low API Balance</AlertTitle>
                <AlertDescription>
                  Your balance with provider 'Some-API-Provider' is low.
                </AlertDescription>
              </Alert>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>System Nominal</AlertTitle>
                <AlertDescription>
                  All systems are running smoothly. No other warnings.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
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
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  variant?: 'default' | 'destructive';
}) {
  return (
    <Card
      className={cn(
        variant === 'destructive' &&
          'bg-destructive/10 border-destructive text-destructive-foreground'
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
  );
}
