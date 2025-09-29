
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, CreditCard, DollarSign, AlertCircle, Loader2 } from 'lucide-react';
import { adminStats } from '@/lib/placeholder-data';
import { useEffect, useState, useMemo } from 'react';
import type { Transaction, User, Service } from '@/lib/types';
import { getTransactions, getAllUsers, getServices } from '@/lib/firebase/firestore';
import { RevenueChart, ServiceBreakdownPieChart } from './charts';

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

    const { dailyRevenue, totalRevenue, serviceBreakdown } = useMemo(() => {
        if (transactions.length === 0) {
            return { dailyRevenue: [], totalRevenue: 0, serviceBreakdown: [] };
        }

        const revenueByDay: { [key: string]: number } = {};
        const breakdown: { [key: string]: number } = {};
        let total = 0;

        transactions.forEach(tx => {
            if (tx.type === 'Debit') {
                const date = new Date(tx.date).toLocaleDateString('en-CA'); // YYYY-MM-DD
                const amount = Math.abs(tx.amount);
                
                // For daily revenue
                if (!revenueByDay[date]) revenueByDay[date] = 0;
                revenueByDay[date] += amount;

                // For service breakdown
                const serviceName = tx.description.split(' ')[0].toUpperCase();
                if (!breakdown[serviceName]) breakdown[serviceName] = 0;
                breakdown[serviceName]++;

                total += amount;
            }
        });
        
        const sortedRevenue = Object.entries(revenueByDay)
            .sort(([dateA], [dateB]) => new Date(dateA).getTime() - new Date(dateB).getTime())
            .map(([date, revenue]) => ({ date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric'}), revenue: Math.round(revenue) }));

        const sortedBreakdown = Object.entries(breakdown)
            .map(([name, count]) => ({ name, count }))
            .sort((a,b) => b.count - a.count);

        return { dailyRevenue: sortedRevenue.slice(-30), totalRevenue: total, serviceBreakdown: sortedBreakdown };
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

      <div className="grid gap-8 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Revenue Analytics</CardTitle>
            <CardDescription>Daily revenue from service purchases over the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-80">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <RevenueChart data={dailyRevenue} />
            )}
          </CardContent>
        </Card>
         <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Service Breakdown</CardTitle>
            <CardDescription>A breakdown of transactions by service type.</CardDescription>
          </CardHeader>
          <CardContent>
             {loading ? (
              <div className="flex justify-center items-center h-80">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <ServiceBreakdownPieChart data={serviceBreakdown} />
            )}
          </CardContent>
        </Card>
      </div>
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
