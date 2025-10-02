
'use client';

import { useEffect, useState } from 'react';
import * as z from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Loader2, Trash2, GripVertical, DownloadCloud } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getServices, addService, updateService, updateServiceStatus, getApiProviders } from '@/lib/firebase/firestore';
import type { Service, ApiProvider, ServiceVariation } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';


const serviceVariationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Variation name is required.'),
  price: z.coerce.number().min(0, 'Price must be 0 or greater.'),
  fees: z.object({
    Customer: z.coerce.number().min(0).default(0),
    Vendor: z.coerce.number().min(0).default(0),
    Admin: z.coerce.number().min(0).default(0),
  }).default({ Customer: 0, Vendor: 0, Admin: 0 }),
});

const serviceFormSchema = z.object({
  name: z.string().min(3, 'Service name must be at least 3 characters.'),
  provider: z.string().min(1, 'Service code is required (e.g., 1 for MTN, dstv, etc).'),
  category: z.enum(['Airtime', 'Data', 'Cable', 'Electricity', 'Education', 'Recharge Card', 'Other']),
  status: z.enum(['Active', 'Inactive']),
  apiProviderId: z.string().optional(),
  variations: z.array(serviceVariationSchema).optional(),
});

type SimpleProvider = Pick<ApiProvider, 'id' | 'name'>;

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [apiProviders, setApiProviders] = useState<ApiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      provider: '',
      category: 'Data',
      status: 'Active',
      apiProviderId: '',
      variations: [],
    },
  });

  const { fields, append, remove, move, replace } = useFieldArray({
    control: form.control,
    name: "variations",
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [allServices, allProviders] = await Promise.all([
        getServices(),
        getApiProviders(),
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
  }, [toast]);

  const handleFormOpen = (service: Service | null) => {
    setEditingService(service);
    if (service) {
      form.reset({
        ...service,
        apiProviderId: service.apiProviderId || '',
        variations: service.variations || [],
      });
    } else {
      form.reset({
        name: '',
        provider: '',
        category: 'Data',
        status: 'Active',
        apiProviderId: '',
        variations: [],
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
      toast({ variant: 'destructive', title: 'Error', description: `Failed to save service. ${error instanceof Error ? error.message : ''}` });
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

  const getProviderName = (providerId?: string) => {
    if (!providerId) return 'N/A';
    return apiProviders.find(p => p.id === providerId)?.name || 'Unknown';
  }
  
  const category = form.watch("category");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Management</h1>
          <p className="text-muted-foreground">Add, edit, and manage all platform services and their pricing variations.</p>
        </div>
        <Button onClick={() => handleFormOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Service
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Available Services</CardTitle>
           <CardDescription>A list of all services available on the platform.</CardDescription>
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
                  <TableHead>Category</TableHead>
                  <TableHead>API Provider</TableHead>
                  <TableHead>Variations</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{service.category}</TableCell>
                    <TableCell className="text-muted-foreground">{getProviderName(service.apiProviderId)}</TableCell>
                    <TableCell>{service.variations?.length || 0}</TableCell>
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
      
      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingService ? 'Edit' : 'Add New'} Service</DialogTitle>
            <DialogDescription>
              Fill in the details for the service. For Data and Cable, add pricing variations below.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[80vh] overflow-y-auto pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Name</FormLabel>
                    <FormControl><Input placeholder="e.g., MTN Data" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="provider" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Code/ID</FormLabel>
                    <FormControl><Input placeholder="e.g., 1 for MTN, dstv for DSTV" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        {['Airtime', 'Data', 'Cable', 'Electricity', 'Education', 'Recharge Card', 'Other'].map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="apiProviderId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Provider</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || 'none'}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a Provider" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {apiProviders.map(provider => (<SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
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
                )} />
              </div>

             {['Data', 'Cable', 'Electricity', 'Education', 'Recharge Card'].includes(category) && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Service Variations (e.g., Plans)</h3>
                    <div className="flex gap-2">
                        <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ id: `var_${Date.now()}`, name: '', price: 0, fees: { Customer: 0, Vendor: 0, Admin: 0 } })}
                        >
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Variation
                        </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {fields.map((field, index) => (
                      <Card key={field.id} className="p-4 bg-muted/50">
                        <div className="flex gap-4">
                          <div className="flex-grow space-y-2">
                             <FormField
                                control={form.control}
                                name={`variations.${index}.id`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Variation ID (Plan ID)</FormLabel>
                                    <FormControl><Input placeholder="API Plan/Variation ID" {...field} /></FormControl>
                                  </FormItem>
                                )}
                              />
                            <FormField
                              control={form.control}
                              name={`variations.${index}.name`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Variation Name</FormLabel>
                                  <FormControl><Input placeholder="e.g., 1.5GB - 30 Days" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              <FormField
                                control={form.control}
                                name={`variations.${index}.price`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Price (₦)</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`variations.${index}.fees.Customer`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Fee (Cust.)</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`variations.${index}.fees.Vendor`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Fee (Vendor)</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                          <div className="flex flex-col items-center justify-center gap-1">
                             <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="cursor-grab"
                                onDragStart={(e) => e.dataTransfer.setData('text/plain', index.toString())}
                                draggable
                              >
                               <GripVertical className="h-5 w-5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-5 w-5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}


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
}
