
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
import { Edit, Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getServices, updateService, getApiProviders, addService, deleteService } from '@/lib/firebase/firestore';
import type { Service, ApiProvider } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
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

const serviceFormSchema = z.object({
  status: z.enum(['Active', 'Inactive']),
  markupType: z.enum(['none', 'percentage', 'fixed']),
  markupValue: z.coerce.number().min(0, 'Markup value must be non-negative.'),
  apiProviderIds: z.array(z.object({
      id: z.string(),
      priority: z.enum(['Primary', 'Fallback']),
  })),
});

const addServiceFormSchema = z.object({
    name: z.string().min(3, "Service name is required"),
    category: z.enum(['Airtime', 'Data', 'Cable', 'Electricity', 'Education', 'Recharge Card']),
    provider: z.string().min(2, "Provider/Service code is required"),
})

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [apiProviders, setApiProviders] = useState<ApiProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const { toast } = useToast();

  const editForm = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      status: 'Active',
      markupType: 'none',
      markupValue: 0,
      apiProviderIds: [],
    },
  });

   const addForm = useForm<z.infer<typeof addServiceFormSchema>>({
    resolver: zodResolver(addServiceFormSchema),
    defaultValues: {
        name: '',
        category: 'Airtime',
        provider: '',
    },
  });
  
  const markupType = editForm.watch('markupType');

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
    editForm.reset({
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
  
  const handleAddFormClose = () => {
      setIsAddFormOpen(false);
      addForm.reset();
  }

  async function onEditSubmit(values: z.infer<typeof serviceFormSchema>) {
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
  
  async function onAddSubmit(values: z.infer<typeof addServiceFormSchema>) {
    setIsSubmitting(true);
    try {
        await addService(values);
        toast({ title: 'Success!', description: `${values.name} service has been created.` });
        handleAddFormClose();
        await fetchData();
    } catch (error) {
      console.error("Failed to add service:", error);
      toast({ variant: 'destructive', title: 'Error', description: `Failed to create service. ${error instanceof Error ? error.message : ''}` });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  async function handleDeleteService(serviceId: string) {
      try {
          await deleteService(serviceId);
          toast({ title: 'Service Deleted', description: 'The service has been successfully removed.' });
          await fetchData();
      } catch (error) {
          console.error("Failed to delete service:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete the service.' });
      }
  }

  const getProviderDetails = (providerLinks: { id: string, priority: 'Primary' | 'Fallback' }[] | undefined) => {
      if (!providerLinks || providerLinks.length === 0) return 'N/A';
      return providerLinks.map(link => {
          const provider = apiProviders.find(p => p.id === link.id);
          return provider ? `${provider.name} (${link.priority})` : `Unknown (${link.priority})`;
      }).join(', ');
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold">Service Management</h1>
            <p className="text-muted-foreground">Link core services to API providers and set global markup rules.</p>
        </div>
        <Button onClick={() => setIsAddFormOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Service
        </Button>
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
                  <TableHead>Category</TableHead>
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
                    <TableCell className="text-muted-foreground">{service.category}</TableCell>
                    <TableCell className="text-muted-foreground">{getProviderDetails(service.apiProviderIds)}</TableCell>
                    <TableCell>
                        {service.markupType === 'none' || !service.markupType ? 'None' : 
                         service.markupType === 'percentage' ? `${service.markupValue}%` : `₦${service.markupValue}`
                        }
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={service.status === 'Active' ? 'default' : 'destructive'} className={cn(service.status === 'Active' && 'bg-green-500 hover:bg-green-600')}>
                        {service.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleFormOpen(service)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="sm">
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete the <strong>{service.name}</strong> service. This action cannot be undone.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteService(service.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Service Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Service: {editingService?.name}</DialogTitle>
            <DialogDescription>
              Configure API providers and markup for this service. Base prices are set on the Pricing page.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6 py-4 max-h-[80vh] overflow-y-auto pr-4">
              
               <FormField
                control={editForm.control}
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
                        control={editForm.control}
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
                <FormField control={editForm.control} name="status" render={({ field }) => (
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
                 <FormField control={editForm.control} name="markupType" render={({ field }) => (
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
                <FormField control={editForm.control} name="markupValue" render={({ field }) => (
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
      
       {/* Add Service Dialog */}
      <Dialog open={isAddFormOpen} onOpenChange={setIsAddFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Service</DialogTitle>
            <DialogDescription>
              Create a new core service category for your platform.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4 py-4">
              <FormField
                control={addForm.control}
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
                control={addForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                     <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Airtime">Airtime</SelectItem>
                        <SelectItem value="Data">Data</SelectItem>
                        <SelectItem value="Cable">Cable TV</SelectItem>
                        <SelectItem value="Electricity">Electricity</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Recharge Card">Recharge Card</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={addForm.control}
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Provider/Service Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 'mtn' or 'DSTV'" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="pt-4">
                 <Button type="button" variant="outline" onClick={handleAddFormClose} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Service
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
