
'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowLeft, Loader2, User, Mail, Wallet, Calendar, Edit, Shield } from 'lucide-react';
import { getUserData, getUserTransactions, type UserData } from '@/lib/firebase/firestore';
import type { Transaction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number | null | undefined }) {
    return (
        <div className="flex items-start gap-4 rounded-lg border bg-secondary/50 p-4">
            {icon}
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-semibold">{value || 'N/A'}</p>
            </div>
        </div>
    )
}

export default function AdminUserDetailPage({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const [userData, setUserData] = useState<UserData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;
      setLoading(true);
      try {
        const [fetchedUserData, fetchedTransactions] = await Promise.all([
          getUserData(userId),
          getUserTransactions(userId),
        ]);

        if (!fetchedUserData) {
          notFound();
          return;
        }

        setUserData(fetchedUserData);
        setTransactions(fetchedTransactions);
      } catch (error) {
        console.error("Failed to fetch user details:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  const joinDate = userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : 'N/A';

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div>
        <h1 className="text-2xl font-bold">User not found</h1>
        <p>The requested user could not be found.</p>
         <Button variant="outline" asChild className="mt-4">
            <Link href="/admin/users"><ArrowLeft className="mr-2 h-4 w-4" />Back to Users</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
         <Button variant="outline" size="icon" asChild>
            <Link href="/admin/users"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
            <h1 className="text-3xl font-bold">{userData.fullName}</h1>
            <p className="text-muted-foreground">{userData.email}</p>
        </div>
      </div>
      
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>User Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <InfoItem icon={<User className="h-5 w-5 text-muted-foreground" />} label="Full Name" value={userData.fullName} />
                    <InfoItem icon={<Mail className="h-5 w-5 text-muted-foreground" />} label="Email Address" value={userData.email} />
                    <InfoItem icon={<Wallet className="h-5 w-5 text-muted-foreground" />} label="Wallet Balance" value={`₦${userData.walletBalance.toLocaleString()}`} />
                    <InfoItem icon={<Shield className="h-5 w-5 text-muted-foreground" />} label="Role" value={userData.role} />
                    <InfoItem icon={<Calendar className="h-5 w-5 text-muted-foreground" />} label="Member Since" value={joinDate} />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Actions</CardTitle>
                    <CardDescription>Perform actions on this user's account.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2">
                    <Button variant="outline"><Edit className="mr-2" />Edit User</Button>
                    <Button variant="outline">Adjust Wallet</Button>
                    <Button variant="outline">Reset Password</Button>
                    <Button variant="destructive">Suspend User</Button>
                </CardContent>
            </Card>
        </div>

        <div className="lg:col-span-2">
             <Card>
                <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>All transactions for {userData.fullName}.</CardDescription>
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
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
