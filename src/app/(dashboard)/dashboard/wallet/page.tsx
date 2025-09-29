import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mockTransactions } from '@/lib/placeholder-data';
import { cn } from '@/lib/utils';
import { Copy } from 'lucide-react';

export default function WalletPage() {
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
            <p className="text-5xl font-extrabold text-primary">₦25,450.75</p>
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
              <p className="text-lg font-semibold">VTUBOSS - JOHN DOE</p>
            </div>
            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                Fund with Paystack
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
