
'use client';

import { useEffect, useState } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Edit, MoreHorizontal, Loader2, Link as LinkIcon, Percent, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getServices, updateService, getApiProviders } from '@/lib/firebase/firestore';
import type { Service, ApiProvider } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

const serviceFormSchema = z.object({
  status: z.enum(['Active', 'Inactive']),
  markupType: z.enum(['none', 'percentage', 'fixed']),
  markupValue: z.coerce.number().min(0, 'Markup value must be non-negative.'),
  apiProviderIds: z.array(z.object({
      id: z.string(),
      priority: z.enum(['Primary', 'Fallback']),
  })).min(1, 'You must select at least one API provider.'),
});

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
      status: 'Active',
      markupType: 'none',
      markupValue: 0,
      apiProviderIds: [],
    },
  });
  
  const markupType = form.watch('markupType');

  async function fetchData() {
    setLoading(true);
    try {
      const [allServices, allProviders] = await Promise.all([
        getServices(),
        getApiProviders(),
      ]);
      setServices(allServices);
      setApiProviders(allProviders.filter(p => p.status === 'Active'));
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

  const handleFormOpen = (service: Service) => {
    setEditingService(service);
    form.reset({
      status: service.status,
      markupType: service.markupType || 'none',
      markupValue: service.markupValue || 0,
      apiProviderIds: service.apiProviderIds || [],
    });
    setIsFormOpen(true);
  };
  
  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingService(null);
  }

  async function onSubmit(values: z.infer<typeof serviceFormSchema>) {
    if (!editingService) return;
    setIsSubmitting(true);
    
    try {
        await updateService(editingService.id, values);
        toast({ title: 'Success!', description: `${editingService.name} service has been updated.` });
        handleFormClose();
        await fetchData();
    } catch (error) {
      console.error("Failed to save service:", error);
      toast({ variant: 'destructive', title: 'Error', description: `Failed to save service. ${error instanceof Error ? error.message : ''}` });
    } finally {
      setIsSubmitting(false);
    }
  }

  const getProviderDetails = (providerLinks: { id: string, priority: 'Primary' | 'Fallback' }[]) => {
      if (!providerLinks || providerLinks.length === 0) return 'N/A';
      return providerLinks.map(link => {
          const provider = apiProviders.find(p => p.id === link.id);
          return provider ? `${provider.name} (${link.priority})` : `Unknown (${link.priority})`;
      }).join(', ');
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Service Management</h1>
        <p className="text-muted-foreground">Link core services to API providers and set global markup rules.</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Core Platform Services</CardTitle>
           <CardDescription>Configure the API providers and pricing markup for each service.</CardDescription>
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
                  <TableHead>API Provider(s)</TableHead>
                  <TableHead>Markup</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell className="text-muted-foreground">{getProviderDetails(service.apiProviderIds)}</TableCell>
                    <TableCell>
                        {service.markupType === 'none' ? 'None' : 
                         service.markupType === 'percentage' ? `${service.markupValue}%` : `₦${service.markupValue}`
                        }
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={service.status === 'Active' ? 'default' : 'destructive'} className={cn(service.status === 'Active' && 'bg-green-500 hover:bg-green-600')}>
                        {service.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleFormOpen(service)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Service: {editingService?.name}</DialogTitle>
            <DialogDescription>
              Configure API providers and markup for this service. Base prices are set on the Pricing page.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4 max-h-[80vh] overflow-y-auto pr-4">
              
               <FormField
                control={form.control}
                name="apiProviderIds"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">API Providers</FormLabel>
                      <p className="text-sm text-muted-foreground">Select one or more API providers for this service.</p>
                    </div>
                    {apiProviders.map((provider) => (
                      <FormField
                        key={provider.id}
                        control={form.control}
                        name="apiProviderIds"
                        render={({ field }) => {
                          const currentSelection = field.value.find(p => p.id === provider.id);
                          return (
                            <FormItem key={provider.id} className="flex items-center gap-4 rounded-md border p-4">
                               <Checkbox
                                checked={!!currentSelection}
                                onCheckedChange={(checked) => {
                                  const newValue = checked
                                    ? [...field.value, { id: provider.id, priority: 'Primary' }]
                                    : field.value.filter((p) => p.id !== provider.id);
                                  field.onChange(newValue);
                                }}
                              />
                              <div className="flex-1">
                                  <FormLabel className="font-semibold">{provider.name}</FormLabel>
                                  <p className="text-xs text-muted-foreground">{provider.description}</p>
                              </div>
                               <Select 
                                 disabled={!currentSelection}
                                 onValueChange={(priority: 'Primary' | 'Fallback') => {
                                     const newValue = field.value.map(p => p.id === provider.id ? {...p, priority} : p);
                                     field.onChange(newValue);
                                 }}
                                 value={currentSelection?.priority || 'Primary'}
                               >
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Primary">Primary</SelectItem>
                                  <SelectItem value="Fallback">Fallback</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Status</FormLabel>
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

               <div>
                <FormLabel className="text-base">Global Markup</FormLabel>
                <p className="text-sm text-muted-foreground">Add a global markup to the base price of all items in this service category.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="markupType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Markup Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount (₦)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="markupValue" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Markup Value</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} disabled={markupType === 'none'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
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
}
    