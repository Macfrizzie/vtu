
'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, User as UserIcon, Mail, Wallet, Calendar, ArrowLeft } from 'lucide-react';
import { getUserData, getUserTransactions } from '@/lib/firebase/firestore';
import type { UserData } from '@/lib/firebase/firestore';
import type { Transaction } from '@/lib/types';
import Link from 'next/link';

export default function AdminUserDetailPage({ params: { userId } }: { params: { userId: string } }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;
      setLoading(true);
      try {
        const [userData, userTransactions] = await Promise.all([
          getUserData(userId),
          getUserTransactions(userId),
        ]);

        if (!userData) {
          notFound();
        }

        setUser(userData);
        setTransactions(userTransactions);
      } catch (error) {
        console.error('Failed to fetch user details:', error);
        notFound();
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return notFound();
  }
  
  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : 'N/A';

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
            <Link href="/admin/users">
                <ArrowLeft className="h-4 w-4" />
            </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{user.fullName}</h1>
          <p className="text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>User Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <InfoItem icon={<UserIcon className="h-5 w-5 text-muted-foreground" />} label="Full Name" value={user.fullName} />
                    <InfoItem icon={<Mail className="h-5 w-5 text-muted-foreground" />} label="Email Address" value={user.email} />
                    <InfoItem icon={<Wallet className="h-5 w-5 text-muted-foreground" />} label="Wallet Balance" value={`₦${user.walletBalance.toLocaleString()}`} />
                    <InfoItem icon={<Calendar className="h-5 w-5 text-muted-foreground" />} label="Member Since" value={joinDate} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                    <Button variant="outline">Suspend User</Button>
                    <Button variant="outline">Reset Password</Button>
                    <Button>Fund/Debit Wallet</Button>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>All transactions for {user.fullName}.</CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((tx) => (
                        <TableRow key={tx.id}>
                            <TableCell>{new Date(tx.date).toLocaleString()}</TableCell>
                            <TableCell className="font-medium">{tx.description}</TableCell>
                            <TableCell>
                            <Badge variant={tx.type === 'Credit' ? 'default' : 'secondary'} className={cn(tx.type === 'Credit' && 'bg-green-500/20 text-green-700 border-transparent')}>{tx.type}</Badge>
                            </TableCell>
                            <TableCell className={cn('text-right font-semibold', tx.type === 'Credit' ? 'text-green-600' : 'text-red-600')}>
                            {tx.type === 'Credit' ? '+' : ''}₦{Math.abs(tx.amount).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-center">
                            <Badge variant={tx.status === 'Successful' ? 'default' : tx.status === 'Pending' ? 'secondary' : 'destructive'} className={cn(tx.status === 'Successful' && 'bg-green-500 hover:bg-green-600')}>
                                {tx.status}
                            </Badge>
                            </TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {transactions.length === 0 && (
                    <div className="text-center text-muted-foreground p-8">
                        No transactions found for this user.
                    </div>
                )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | null | undefined }) {
    return (
        <div className="flex items-start gap-3">
            <div className="pt-1">{icon}</div>
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-semibold">{value || 'N/A'}</p>
            </div>
        </div>
    )
}
