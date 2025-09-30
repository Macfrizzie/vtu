'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Printer } from 'lucide-react';
import { getTransactionById } from '@/lib/firebase/firestore';
import type { Transaction } from '@/lib/types';
import { cn } from '@/lib/utils';
import { VtuBossLogo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';

export default function UserTransactionDetailPage({
  params,
}: {
  params: Promise<{ transactionId: string }>;
}) {
  const { transactionId } = use(params);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchTransaction() {
      if (!transactionId) return;
      setLoading(true);
      try {
        const tx = await getTransactionById(transactionId as string);
        setTransaction(tx);
      } catch (error) {
        console.error('Failed to fetch transaction:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch transaction.',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchTransaction();
  }, [transactionId, toast]);

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
        <p className="text-muted-foreground">
          The transaction you are looking for does not exist.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/dashboard/history">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to History
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/history">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to History
          </Link>
        </Button>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Print Receipt
        </Button>
      </div>

      <Card className="print:border-none print:shadow-none">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction Receipt</CardTitle>
              <CardDescription>
                Details for transaction #{transaction.id.substring(0, 10)}...
              </CardDescription>
            </div>
            <VtuBossLogo className="h-10 w-10 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Transaction ID" value={transaction.id} />
            <InfoItem
              label="Date & Time"
              value={new Date(transaction.date).toLocaleString()}
            />
            <InfoItem label="Description" value={transaction.description} />
            <InfoItem label="Type" value={transaction.type} />
            <InfoItem label="Amount">
              <span
                className={cn(
                  'font-bold',
                  transaction.type === 'Credit'
                    ? 'text-green-600'
                    : 'text-red-600'
                )}
              >
                {transaction.type === 'Credit' ? '+' : '-'}₦
                {Math.abs(transaction.amount).toLocaleString()}
              </span>
            </InfoItem>
            <InfoItem label="Status">
              <Badge
                variant={
                  transaction.status === 'Successful'
                    ? 'default'
                    : transaction.status === 'Pending'
                    ? 'secondary'
                    : 'destructive'
                }
                className={cn(
                  transaction.status === 'Successful' &&
                    'bg-green-500 hover:bg-green-600'
                )}
              >
                {transaction.status}
              </Badge>
            </InfoItem>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoItem({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {value ? (
        <p className="break-words font-semibold">{value}</p>
      ) : (
        children
      )}
    </div>
  );
}
