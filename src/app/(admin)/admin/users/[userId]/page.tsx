
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserData, getUserTransactions } from '@/lib/firebase/firestore';
import type { UserData, Transaction } from '@/lib/types';
import { Loader2, ArrowLeft, User, Mail, Wallet, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminUserDetailPage({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const [user, setUser] = useState<UserData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!userId) return;
      setLoading(true);
      try {
        const [userData, userTransactions] = await Promise.all([
          getUserData(userId as string),
          getUserTransactions(userId as string),
        ]);
        setUser(userData);
        setTransactions(userTransactions);
      } catch (error) {
        console.error('Failed to fetch user details:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId]);

  const getInitials = (name: string | undefined | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">User Not Found</h1>
        <p className="text-muted-foreground">The user you are looking for does not exist.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <Button variant="outline" size="sm" asChild className="mb-4">
          <Link href="/admin/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to All Users
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={`https://i.pravatar.cc/150?u=${user.uid}`} />
            <AvatarFallback className="text-2xl">{getInitials(user.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold">{user.fullName}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <InfoCard label="Role" value={user.role} />
          <InfoCard label="Status" value={user.status} badgeVariant={user.status === 'Active' ? 'default' : user.status === 'Pending' ? 'secondary' : 'destructive'} />
          <InfoCard label="Wallet Balance" value={`₦${user.walletBalance.toLocaleString()}`} />
          <InfoCard label="Member Since" value={new Date(user.createdAt).toLocaleDateString()} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>A log of all financial activities for this user.</CardDescription>
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
              {transactions.length > 0 ? transactions.map((tx) => (
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
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">No transactions found for this user.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoCard({ label, value, badgeVariant }: { label: string, value: string, badgeVariant?: "default" | "secondary" | "destructive" | "outline" | null }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardDescription>{label}</CardDescription>
            </CardHeader>
            <CardContent>
                {badgeVariant ? (
                     <Badge variant={badgeVariant} className={cn(badgeVariant === 'default' && 'bg-green-500')}>{value}</Badge>
                ) : (
                    <p className="text-xl font-bold">{value}</p>
                )}
            </CardContent>
        </Card>
    );
}
