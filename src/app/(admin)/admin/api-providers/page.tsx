

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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { testHusmoDataConnection } from '@/services/husmodata';

const providerFormSchema = z.object({
  name: z.string().min(2, 'Provider name must be at least 2 characters.'),
  description: z.string().optional(),
  baseUrl: z.string().url('Please enter a valid URL.'),
  auth_type: z.enum(['None', 'Token', 'API Key']),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  requestHeaders: z.string().refine(val => {
    if (!val) return true; // Allow empty string
    try {
      JSON.parse(val);
      return true;
    } catch (e) {
      return false;
    }
  }, { message: 'Request headers must be a valid JSON object or empty.' }).optional(),
  transactionCharge: z.coerce.number().min(0, 'Transaction charge cannot be negative.'),
  status: z.enum(['Active', 'Inactive']),
  priority: z.enum(['Primary', 'Fallback']),
});

type ProviderFormData = z.infer<typeof providerFormSchema>;

export default function AdminApiProvidersPage() {
  const [providers, setProviders] = useState<ApiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<ApiProvider | null>(null);
  const { toast } = useToast();

  const form = useForm<ProviderFormData>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: {
      name: '',
      description: '',
      baseUrl: '',
      auth_type: 'Token',
      apiKey: '',
      apiSecret: '',
      requestHeaders: '{}',
      transactionCharge: 0,
      status: 'Active',
      priority: 'Primary',
    },
  });

  async function fetchProviders() {
    setLoading(true);
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
    fetchProviders();
  }, []);
  
  const handleFormOpen = (provider: ApiProvider | null) => {
    setEditingProvider(provider);
    if (provider) {
        form.reset({
            ...provider,
            description: provider.description || '',
            apiKey: provider.apiKey || '',
            apiSecret: provider.apiSecret || '',
            requestHeaders: provider.requestHeaders || '{}',
            transactionCharge: provider.transactionCharge || 0,
        });
    } else {
        form.reset({
          name: '',
          description: '',
          baseUrl: '',
          auth_type: 'Token',
          apiKey: '',
          apiSecret: '',
          requestHeaders: '{}',
          transactionCharge: 0,
          status: 'Active',
          priority: 'Primary',
        });
    }
    setIsFormOpen(true);
  }

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingProvider(null);
  }

  async function onSubmit(values: ProviderFormData) {
    setIsSubmitting(true);
    const dataToSubmit = {
      ...values,
      description: values.description || '',
      apiKey: values.apiKey || '',
      apiSecret: values.apiSecret || '',
      requestHeaders: values.requestHeaders || '{}',
      transactionCharge: values.transactionCharge || 0,
    }

    try {
      if (editingProvider) {
        await updateApiProvider(editingProvider.id, dataToSubmit);
        toast({ title: 'Success!', description: 'API Provider has been updated successfully.' });
      } else {
        await addApiProvider(dataToSubmit);
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

  async function handleTestConnection(provider: ApiProvider) {
    setIsTesting(provider.id);
    try {
        await testHusmoDataConnection(provider.baseUrl, provider.apiKey || '');
        toast({ title: 'Connection Successful!', description: `Successfully connected to ${provider.name}. The API is reachable.` });
    } catch (error) {
        console.error("Failed to connect to provider:", error);
        toast({ variant: 'destructive', title: 'Connection Failed', description: `Could not connect to the provider. ${error instanceof Error ? error.message : 'An unknown error occurred.'}` });
    } finally {
        setIsTesting(null);
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
          <CardDescription>A list of all integrated API providers with configuration details.</CardDescription>
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
                  <TableHead>Auth Type</TableHead>
                  <TableHead>Charge (₦)</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">{provider.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{provider.auth_type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">₦{(provider.transactionCharge || 0).toFixed(2)}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleTestConnection(provider)} disabled={isTesting === provider.id}>
                            {isTesting === provider.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Test Connection
                          </DropdownMenuItem>
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
        <DialogContent className="sm:max-w-xl" onInteractOutside={(e) => {
            if (isSubmitting) e.preventDefault();
        }}>
          <DialogHeader>
            <DialogTitle>{editingProvider ? 'Edit' : 'Add'} API Provider</DialogTitle>
            <DialogDescription>
              Fill in the details for the API provider. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="A brief description of the provider..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField
                  control={form.control}
                  name="auth_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authentication Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Token">Authorization: Token</SelectItem>
                          <SelectItem value="API Key">Authorization: API Key</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="apiKey"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>API Key / Token</FormLabel>
                        <FormControl>
                            <Input type="password" placeholder="Enter API Key or Token" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              <FormField
                control={form.control}
                name="apiSecret"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>API Secret / Private Key</FormLabel>
                    <FormControl>
                        <Input type="password" placeholder="Enter API Secret" {...field} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
              />

               <FormField
                control={form.control}
                name="requestHeaders"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Request Headers (JSON)</FormLabel>
                    <FormControl>
                      <Textarea placeholder='{ "x-api-key": "some-other-key" }' className="font-mono text-xs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                <FormField
                    control={form.control}
                    name="transactionCharge"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Transaction Charge (₦)</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="e.g., 10" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
               </div>

              <DialogFooter className="pt-4">
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
    

    

    

    
