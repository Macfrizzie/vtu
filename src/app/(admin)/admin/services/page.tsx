
'use client';

import { useEffect, useState } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Loader2, TrendingUp } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getServices, addService, updateService, updateServiceStatus, getApiProvidersForSelect, bulkUpdateFees } from '@/lib/firebase/firestore';
import type { Service, ApiProvider } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const serviceFormSchema = z.object({
  name: z.string().min(3, 'Service name must be at least 3 characters.'),
  provider: z.string().min(2, 'Service code must be at least 2 characters (e.g., mtn, dstv).'),
  fees: z.object({
      Customer: z.coerce.number().min(0, 'Fee cannot be negative.'),
      Vendor: z.coerce.number().min(0, 'Fee cannot be negative.'),
      Admin: z.coerce.number().min(0, 'Fee cannot be negative.'),
  }),
  status: z.enum(['Active', 'Inactive']),
  apiProviderId: z.string().optional(),
});

const bulkUpdateSchema = z.object({
  updateType: z.enum(['increase_percentage', 'increase_fixed', 'decrease_percentage', 'decrease_fixed']),
  value: z.coerce.number().min(0, "Value must be positive."),
});

type SimpleProvider = Pick<ApiProvider, 'id' | 'name'>;

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [apiProviders, setApiProviders] = useState<SimpleProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      provider: '',
      fees: { Customer: 0, Vendor: 0, Admin: 0 },
      status: 'Active',
      apiProviderId: '',
    },
  });

  const bulkUpdateForm = useForm<z.infer<typeof bulkUpdateSchema>>({
    resolver: zodResolver(bulkUpdateSchema),
    defaultValues: {
      updateType: 'increase_percentage',
      value: 10,
    }
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [allServices, allProviders] = await Promise.all([
        getServices(),
        getApiProvidersForSelect(),
      ]);
      setServices(allServices);
      setApiProviders(allProviders);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch services or providers.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  const handleFormOpen = (service: Service | null) => {
    setEditingService(service);
    if (service) {
      form.reset({
        name: service.name,
        provider: service.provider,
        fees: service.fees || { Customer: 0, Vendor: 0, Admin: 0 },
        status: service.status,
        apiProviderId: service.apiProviderId || 'none',
      });
    } else {
      form.reset({
        name: '',
        provider: '',
        fees: { Customer: 0, Vendor: 0, Admin: 0 },
        status: 'Active',
        apiProviderId: 'none',
      });
    }
    setIsFormOpen(true);
  };
  
  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingService(null);
  }

  async function onSubmit(values: z.infer<typeof serviceFormSchema>) {
    setIsSubmitting(true);
    
    const dataToSubmit = {
      ...values,
      apiProviderId: values.apiProviderId === 'none' ? '' : values.apiProviderId,
    };
    
    try {
      if (editingService) {
        await updateService(editingService.id, dataToSubmit);
        toast({ title: 'Success!', description: 'Service has been updated successfully.' });
      } else {
        await addService(dataToSubmit);
        toast({ title: 'Success!', description: 'Service has been added successfully.' });
      }
      handleFormClose();
      await fetchData();
    } catch (error) {
      console.error("Failed to save service:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save service.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleStatusToggle = async (service: Service) => {
    const newStatus = service.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateServiceStatus(service.id, newStatus);
      toast({ title: 'Status Updated', description: `${service.name} has been set to ${newStatus}.` });
      await fetchData();
    } catch (error) {
      console.error("Failed to update status:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update service status.' });
    }
  };

  async function onBulkUpdateSubmit(values: z.infer<typeof bulkUpdateSchema>) {
    setIsSubmitting(true);
    try {
      await bulkUpdateFees(values.updateType, values.value);
      toast({ title: 'Success!', description: 'All service fees have been updated.' });
      setIsBulkUpdateOpen(false);
      await fetchData();
    } catch (error) {
      console.error("Failed to bulk update fees:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update service fees.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  const getProviderName = (providerId?: string) => {
    if (!providerId) return 'N/A';
    return apiProviders.find(p => p.id === providerId)?.name || 'Unknown';
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Management</h1>
          <p className="text-muted-foreground">Configure and manage all services and providers.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsBulkUpdateOpen(true)}>
                <TrendingUp className="mr-2 h-4 w-4" /> Bulk Update Prices
            </Button>
            <Button onClick={() => handleFormOpen(null)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Service
            </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Available Services</CardTitle>
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
                  <TableHead>Service Name</TableHead>
                  <TableHead>Service Code</TableHead>
                  <TableHead>API Provider</TableHead>
                  <TableHead className="text-right">Fee (Customer)</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{service.provider}</TableCell>
                    <TableCell className="text-muted-foreground">{getProviderName(service.apiProviderId)}</TableCell>
                    <TableCell className="text-right">₦{(service.fees?.Customer || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={service.status === 'Active' ? 'default' : 'destructive'} className={cn(service.status === 'Active' && 'bg-green-500 hover:bg-green-600')}>
                        {service.status}
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
                          <DropdownMenuItem onClick={() => handleFormOpen(service)}>Edit Service</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusToggle(service)}>
                            {service.status === 'Active' ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
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
      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit' : 'Add New'} Service</DialogTitle>
            <DialogDescription>
              Fill in the details for the service.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
               <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., MTN Data" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Code</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., mtn-data, dstv-padi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="apiProviderId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API Provider</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'none'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an API Provider" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {apiProviders.map(provider => (
                            <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2 rounded-md border p-4">
                    <h4 className="font-medium">Pricing Tiers (Fees in ₦)</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <FormField
                            control={form.control}
                            name="fees.Customer"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Customer</FormLabel>
                                <FormControl>
                                <Input type="number" placeholder="e.g., 50" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="fees.Vendor"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Vendor</FormLabel>
                                <FormControl>
                                <Input type="number" placeholder="e.g., 25" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="fees.Admin"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Admin</FormLabel>
                                <FormControl>
                                <Input type="number" placeholder="e.g., 0" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                </div>

                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a status" />
                            </SelectTrigger>
                            </FormControl>
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

      {/* Bulk Update Dialog */}
      <Dialog open={isBulkUpdateOpen} onOpenChange={setIsBulkUpdateOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Bulk Update Service Fees</DialogTitle>
                <DialogDescription>
                    Apply a pricing adjustment to all services at once. This action cannot be undone.
                </DialogDescription>
            </DialogHeader>
            <Form {...bulkUpdateForm}>
                <form onSubmit={bulkUpdateForm.handleSubmit(onBulkUpdateSubmit)} className="space-y-4 py-4">
                    <FormField
                        control={bulkUpdateForm.control}
                        name="updateType"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Update Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="increase_percentage">Increase by Percentage (%)</SelectItem>
                                    <SelectItem value="increase_fixed">Increase by Fixed Amount (₦)</SelectItem>
                                    <SelectItem value="decrease_percentage">Decrease by Percentage (%)</SelectItem>
                                    <SelectItem value="decrease_fixed">Decrease by Fixed Amount (₦)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={bulkUpdateForm.control}
                        name="value"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Value</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g., 10" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsBulkUpdateOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Apply Update
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
