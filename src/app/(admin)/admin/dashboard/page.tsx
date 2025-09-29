
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, CreditCard, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import { adminStats } from '@/lib/placeholder-data';
import { useEffect, useState, useMemo } from 'react';
import type { Transaction, User, Service } from '@/lib/types';
import { getTransactions, getAllUsers, getServices } from '@/lib/firebase/firestore';

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
                console.error("Failed to fetch admin data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const totalRevenue = useMemo(() => {
        if (transactions.length === 0) {
            return 0;
        }
        return transactions.reduce((total, tx) => {
            if (tx.type === 'Debit') {
                return total + Math.abs(tx.amount);
            }
            return total;
        }, 0);
    }, [transactions]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Overview</h1>
        <p className="text-muted-foreground">A summary of your platform's activity.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={loading ? '...' : users.length.toLocaleString()} icon={<Users className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Total Transactions" value={loading ? '...' : transactions.length.toLocaleString()} icon={<CreditCard className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Total Revenue (Debits)" value={loading ? '...' : `₦${totalRevenue.toLocaleString()}`} icon={<DollarSign className="h-4 w-4 text-muted-foreground" />} />
        <StatCard title="Pending Issues" value={adminStats.pendingIssues.toString()} icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />} />
      </div>

       {loading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {/* The charts have been removed from here. We can add other components later. */}
      
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    )
}
