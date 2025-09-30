'use client';

import { useEffect, useState, use } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getUserData, getUserTransactions, manualFundWallet, manualDeductFromWallet, updateUser } from '@/lib/firebase/firestore';
import type { UserData, Transaction } from '@/lib/types';
import { Loader2, ArrowLeft, PiggyBank, Landmark, PlusCircle, MinusCircle, Edit } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/context/user-context';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


const walletFormSchema = z.object({
  amount: z.coerce.number().min(1, 'Amount must be at least 1.'),
});

const editUserFormSchema = z.object({
  role: z.enum(['Customer', 'Vendor', 'Admin']),
  status: z.enum(['Active', 'Pending', 'Blocked']),
});


export default function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const { user: adminUser } = useUser();
  const [user, setUser] = useState<UserData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'fund' | 'deduct' | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
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
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch user data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userId]);

  const walletForm = useForm<z.infer<typeof walletFormSchema>>({
    resolver: zodResolver(walletFormSchema),
    defaultValues: { amount: 0 },
  });
  
  const editUserForm = useForm<z.infer<typeof editUserFormSchema>>({
    resolver: zodResolver(editUserFormSchema),
  });

  useEffect(() => {
    if (user) {
        editUserForm.reset({
            role: user.role,
            status: user.status,
        });
    }
  }, [user, editUserForm]);


  const handleWalletAction = async (values: z.infer<typeof walletFormSchema>) => {
    if (!adminUser || !dialogAction) return;

    try {
      if (dialogAction === 'fund') {
        await manualFundWallet(userId, values.amount, adminUser.uid);
        toast({ title: 'Success', description: `Successfully funded user wallet with ₦${values.amount}.` });
      } else {
        await manualDeductFromWallet(userId, values.amount, adminUser.uid);
        toast({ title: 'Success', description: `Successfully deducted ₦${values.amount} from user wallet.` });
      }
      await fetchData(); // Refetch data to show updated balance
      setIsWalletDialogOpen(false);
      walletForm.reset();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
    }
  };
  
  const handleEditUser = async (values: z.infer<typeof editUserFormSchema>) => {
    if (!user) return;
    try {
      await updateUser(user.uid, values);
      toast({ title: 'Success', description: `User profile has been updated.` });
      await fetchData(); // Refetch data to show updated role/status
      setIsEditUserDialogOpen(false);
    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update user profile.' });
    }
  }


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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
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
            
            <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto">
                        <Edit className="mr-2 h-4 w-4"/>
                        Edit User
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User Profile</DialogTitle>
                        <DialogDescription>
                            Change the user's role and status.
                        </DialogDescription>
                    </DialogHeader>
                     <Form {...editUserForm}>
                        <form onSubmit={editUserForm.handleSubmit(handleEditUser)} className="space-y-4 py-4">
                             <FormField
                                control={editUserForm.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Role</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                        <SelectItem value="Customer">Customer</SelectItem>
                                        <SelectItem value="Vendor">Vendor</SelectItem>
                                        <SelectItem value="Admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={editUserForm.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select a status" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Pending">Pending</SelectItem>
                                        <SelectItem value="Blocked">Blocked</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="submit" disabled={editUserForm.formState.isSubmitting}>
                                {editUserForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <InfoCard label="Role" value={user.role} />
        <InfoCard label="Status" value={user.status} badgeVariant={user.status === 'Active' ? 'default' : user.status === 'Pending' ? 'secondary' : 'destructive'} />
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Wallet Balance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₦{user.walletBalance.toLocaleString()}</p>
          </CardContent>
        </Card>
        <InfoCard label="Member Since" value={new Date(user.createdAt).toLocaleDateString()} />
      </div>

      <Dialog open={isWalletDialogOpen} onOpenChange={setIsWalletDialogOpen}>
        <Card>
          <CardHeader>
            <CardTitle>Wallet Actions</CardTitle>
            <CardDescription>Manually fund or deduct from this user's wallet.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <DialogTrigger asChild>
              <Button onClick={() => setDialogAction('fund')}>
                <PlusCircle className="mr-2 h-4 w-4" /> Fund Wallet
              </Button>
            </DialogTrigger>
            <DialogTrigger asChild>
              <Button variant="destructive" onClick={() => setDialogAction('deduct')}>
                <MinusCircle className="mr-2 h-4 w-4" /> Deduct Funds
              </Button>
            </DialogTrigger>
          </CardContent>
        </Card>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogAction === 'fund' ? 'Fund User Wallet' : 'Deduct From User Wallet'}</DialogTitle>
            <DialogDescription>
              Enter the amount to {dialogAction}. This action will be logged.
            </DialogDescription>
          </DialogHeader>
          <Form {...walletForm}>
            <form onSubmit={walletForm.handleSubmit(handleWalletAction)} className="space-y-4 py-4">
              <FormField
                control={walletForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₦)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 5000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={walletForm.formState.isSubmitting}>
                  {walletForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {dialogAction === 'fund' ? 'Fund Wallet' : 'Deduct Funds'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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