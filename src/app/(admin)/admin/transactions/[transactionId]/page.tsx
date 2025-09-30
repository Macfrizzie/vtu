
'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Printer, CheckCircle, XCircle } from 'lucide-react';
import { getTransactionById } from '@/lib/firebase/firestore';
import type { Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { VtuBossLogo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';


export default function TransactionDetailPage({ params }: { params: Promise<{ transactionId: string }> }) {
  const { transactionId } = use(params);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTransaction = useCallback(async () => {
    if (!transactionId) return;
    setLoading(true);
    try {
      const tx = await getTransactionById(transactionId as string);
      setTransaction(tx);
    } catch (error) {
      console.error('Failed to fetch transaction:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch transaction.' });
    } finally {
      setLoading(false);
    }
  }, [transactionId, toast]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  const handleStatusUpdate = async (status: 'Successful' | 'Failed') => {
    // Placeholder for actual update logic
    toast({ title: 'Simulating Update', description: `Marking transaction as ${status}...`});
    // In the next step, we will call a Firestore function here.
    // For now, we just update the local state to show the change.
    if (transaction) {
      setTransaction({ ...transaction, status: status });
    }
    toast({ title: 'Success!', description: `Transaction has been marked as ${status}.`});
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Transaction Not Found</h1>
        <p className="text-muted-foreground">The transaction you are looking for does not exist.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/admin/transactions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Transactions
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/transactions">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Log
          </Link>
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt
        </Button>
      </div>

      <Card className="print:shadow-none print:border-none">
        <CardHeader className="border-b">
            <div className="flex justify-between items-center">
                <div>
                    <CardTitle>Transaction Receipt</CardTitle>
                    <CardDescription>Details for transaction #{transaction.id}</CardDescription>
                </div>
                <VtuBossLogo className="h-10 w-10 text-primary" />
            </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Transaction ID" value={transaction.id} />
            <InfoItem label="Date & Time" value={new Date(transaction.date).toLocaleString()} />
            <InfoItem label="User Email" value={transaction.userEmail || 'N/A'} />
            <InfoItem label="Description" value={transaction.description} />
            <InfoItem label="Type" value={transaction.type} />
            <InfoItem label="Amount">
                <span className={cn('font-bold', transaction.type === 'Credit' ? 'text-green-600' : 'text-red-600')}>
                    {transaction.type === 'Credit' ? '+' : '-'}₦{Math.abs(transaction.amount).toLocaleString()}
                </span>
            </InfoItem>
            <InfoItem label="Status">
                <Badge variant={transaction.status === 'Successful' ? 'default' : transaction.status === 'Pending' ? 'secondary' : 'destructive'} className={cn(transaction.status === 'Successful' && 'bg-green-500 hover:bg-green-600')}>
                    {transaction.status}
                </Badge>
            </InfoItem>
          </div>
        </CardContent>
        {transaction.status === 'Pending' && (
          <CardFooter className="border-t bg-muted/50 p-4">
            <div className="flex flex-col w-full gap-2">
                <p className="text-sm font-semibold text-center">Manual Verification</p>
                <p className="text-xs text-muted-foreground text-center mb-2">This transaction is pending. Manually update its status below.</p>
                <div className="flex w-full gap-2">
                    <Button className="w-full" variant="outline" onClick={() => handleStatusUpdate('Successful')}>
                        <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                        Mark as Successful
                    </Button>
                    <Button className="w-full" variant="destructive" onClick={() => handleStatusUpdate('Failed')}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Mark as Failed
                    </Button>
                </div>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

function InfoItem({ label, value, children }: { label: string, value?: string, children?: React.ReactNode }) {
    return (
        <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            {value ? <p className="font-semibold break-words">{value}</p> : children}
        </div>
    )
}
