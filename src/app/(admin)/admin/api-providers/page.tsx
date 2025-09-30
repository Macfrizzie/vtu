
'use client';

import { useEffect, useState } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Loader2, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiProviders, addApiProvider, updateApiProvider, deleteApiProvider } from '@/lib/firebase/firestore';
import type { ApiProvider } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

const providerFormSchema = z.object({
  name: z.string().min(2, 'Provider name must be at least 2 characters.'),
  baseUrl: z.string().url('Please enter a valid URL.'),
  status: z.enum(['Active', 'Inactive']),
  priority: z.enum(['Primary', 'Fallback']),
});

type ProviderFormData = z.infer<typeof providerFormSchema>;

export default function AdminApiProvidersPage() {
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ApiProvider | null>(null);
  const { toast } = useToast();

  const form = useForm<ProviderFormData>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: {
      name: '',
      baseUrl: '',
      status: 'Active',
      priority: 'Primary',
    },
  });

  async function fetchProviders() {
    try {
      const allProviders = await getApiProviders();
      setProviders(allProviders);
    } catch (error) {
      console.error("Failed to fetch API providers:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch API providers.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchProviders();
  }, []);
  
  useEffect(() => {
    if (editingProvider) {
      form.reset(editingProvider);
      setIsFormOpen(true);
    } else {
      form.reset({ name: '', baseUrl: '', status: 'Active', priority: 'Primary' });
    }
  }, [editingProvider, form]);

  const handleFormOpen = (provider: ApiProvider | null) => {
    setEditingProvider(provider);
    setIsFormOpen(true);
  }

  const handleFormClose = () => {
    setEditingProvider(null);
    setIsFormOpen(false);
  }

  async function onSubmit(values: ProviderFormData) {
    setIsSubmitting(true);
    try {
      if (editingProvider) {
        await updateApiProvider(editingProvider.id, values);
        toast({ title: 'Success!', description: 'API Provider has been updated successfully.' });
      } else {
        await addApiProvider(values);
        toast({ title: 'Success!', description: 'API Provider has been added successfully.' });
      }
      handleFormClose();
      await fetchProviders();
    } catch (error) {
      console.error("Failed to save provider:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save API Provider.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(providerId: string) {
    try {
      await deleteApiProvider(providerId);
      toast({ title: 'Provider Deleted', description: 'The API provider has been removed.' });
      await fetchProviders();
    } catch (error) {
      console.error("Failed to delete provider:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete API Provider.' });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Provider Management</h1>
          <p className="text-muted-foreground">Configure and manage all third-party API providers.</p>
        </div>
        <Button onClick={() => handleFormOpen(null)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Provider
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Configured Providers</CardTitle>
          <CardDescription>A list of all integrated API providers.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-60">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider Name</TableHead>
                  <TableHead>Base URL</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">{provider.name}</TableCell>
                    <TableCell className="text-muted-foreground">{provider.baseUrl}</TableCell>
                    <TableCell>
                        <Badge variant={provider.priority === 'Primary' ? 'default' : 'secondary'}>
                            {provider.priority}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={provider.status === 'Active' ? 'default' : 'destructive'} className={cn(provider.status === 'Active' && 'bg-green-500 hover:bg-green-600')}>
                        {provider.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleFormOpen(provider)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem disabled>Test Connection</DropdownMenuItem>
                          <DropdownMenuSeparator />
                           <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete the API provider.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(provider.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Add/Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => {
            if (isSubmitting) e.preventDefault();
        }}>
          <DialogHeader>
            <DialogTitle>{editingProvider ? 'Edit' : 'Add'} API Provider</DialogTitle>
            <DialogDescription>
              Fill in the details for the API provider.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., VTPass" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="baseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base URL</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., https://api.vtpass.com/api" {...field} />
                    </FormControl>
                     <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Primary">Primary</SelectItem>
                        <SelectItem value="Fallback">Fallback</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleFormClose} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );

    