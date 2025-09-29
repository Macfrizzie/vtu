
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
import { PlusCircle, MoreHorizontal, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getServices, addService } from '@/lib/firebase/firestore';
import type { Service } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const serviceFormSchema = z.object({
  name: z.string().min(3, 'Service name must be at least 3 characters.'),
  provider: z.string().min(2, 'Provider name must be at least 2 characters.'),
  fee: z.coerce.number().min(0, 'Fee cannot be negative.'),
  status: z.enum(['Active', 'Inactive']),
});

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      provider: '',
      fee: 0,
      status: 'Active',
    },
  });

  async function fetchServices() {
    setLoading(true);
    try {
      const allServices = await getServices();
      setServices(allServices);
    } catch (error) {
      console.error("Failed to fetch services:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch services.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchServices();
  }, []);

  async function onSubmit(values: z.infer<typeof serviceFormSchema>) {
    setIsSubmitting(true);
    try {
      await addService(values);
      toast({ title: 'Success!', description: 'Service has been added successfully.' });
      form.reset();
      setIsDialogOpen(false);
      await fetchServices(); // Refetch services to show the new one
    } catch (error) {
      console.error("Failed to add service:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to add service.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Service Management</h1>
          <p className="text-muted-foreground">Configure and manage all services and providers.</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Service</DialogTitle>
              <DialogDescription>
                Fill in the details for the new service you want to add.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                      <FormLabel>Provider</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., MTN NG" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fee (₦)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 50" {...field} />
                      </FormControl>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Service
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
                  <TableHead>Provider</TableHead>
                  <TableHead className="text-right">Fee/Commission</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell>{service.provider}</TableCell>
                    <TableCell className="text-right">{service.fee.toFixed(2)}</TableCell>
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
                          <DropdownMenuItem>Edit Service</DropdownMenuItem>
                          <DropdownMenuItem>Manage Pricing</DropdownMenuItem>
                          <DropdownMenuItem>{service.status === 'Active' ? 'Deactivate' : 'Activate'}</DropdownMenuItem>
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
    </div>
  );
}
