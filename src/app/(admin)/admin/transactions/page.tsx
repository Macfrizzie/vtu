import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mockTransactions } from '@/lib/placeholder-data';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Filter } from 'lucide-react';

export default function AdminTransactionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Transaction Log</h1>
        <p className="text-muted-foreground">View and search all platform transactions.</p>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>All Transactions</CardTitle>
            <div className="flex gap-2">
              <Input placeholder="Search by description or user..." className="max-w-sm" />
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User Email</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTransactions.concat(mockTransactions).map((tx, index) => (
                <TableRow key={`${tx.id}-${index}`}>
                  <TableCell>{new Date(tx.date).toLocaleDateString()}</TableCell>
                   <TableCell>user@example.com</TableCell>
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
