
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mockTransactions } from '@/lib/placeholder-data';
import { cn } from '@/lib/utils';
import { Copy, Loader2 } from 'lucide-react';
import { useUser } from '@/context/user-context';
import { fundWallet } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';


export default function WalletPage() {
    const { user, userData, loading, forceRefetch } = useUser();
    const { toast } = useToast();
    const [isFunding, setIsFunding] = useState(false);

    const handleFundWallet = async () => {
        if (!user) {
            toast({ variant: 'destructive', title: 'You must be logged in to fund your wallet.' });
            return;
        }

        setIsFunding(true);
        try {
            // Pass user details to fundWallet in case the doc needs to be created
            await fundWallet(user.uid, 5000, user.email, userData?.fullName); 
            forceRefetch(); // Refetch user data to update balance
            toast({ title: 'Success!', description: '₦5,000 has been added to your wallet.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Funding Failed', description: 'Could not add funds to your wallet.' });
        } finally {
            setIsFunding(false);
        }
    };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Wallet</h1>
        <p className="text-muted-foreground">Manage your funds and view your transaction history.</p>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            ) : (
                <p className="text-5xl font-extrabold text-primary">₦{userData?.walletBalance?.toLocaleString() || '0.00'}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fund Your Wallet</CardTitle>
            <CardDescription>
              Make a transfer to your unique virtual account to fund your wallet instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border bg-secondary p-4">
              <p className="text-sm font-medium text-muted-foreground">Bank Name</p>
              <p className="text-lg font-semibold">Wema Bank</p>
            </div>
             <div className="rounded-lg border bg-secondary p-4">
              <div className="flex justify-between items-center">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Account Number</p>
                    <p className="text-lg font-semibold">9876543210</p>
                </div>
                <Button variant="ghost" size="icon">
                    <Copy className="h-5 w-5"/>
                </Button>
              </div>
            </div>
             <div className="rounded-lg border bg-secondary p-4">
              <p className="text-sm font-medium text-muted-foreground">Account Name</p>
              <p className="text-lg font-semibold">VTUBOSS - {userData?.fullName?.toUpperCase() || user?.displayName?.toUpperCase() || '...'}</p>
            </div>
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleFundWallet} disabled={isFunding}>
                {isFunding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Fund with Paystack (Simulated)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
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
              {mockTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
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
  );
}
