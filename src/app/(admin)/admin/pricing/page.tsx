
'use client';

import { useEffect, useState } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload, MoreHorizontal, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiProvidersForSelect, addAirtimePrice, getAirtimePrices, deleteAirtimePrice } from '@/lib/firebase/firestore';
import type { ApiProvider, AirtimePrice } from '@/lib/types';
import { getNetworks as fetchHusmoDataNetworks, type Network } from '@/services/husmodata';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

// --- Airtime Tab Components ---

const airtimePriceFormSchema = z.object({
  apiProviderId: z.string().min(1, 'Please select an API provider.'),
  networkId: z.string().min(1, 'Please select a network.'),
  discountPercent: z.coerce.number().min(0, 'Discount must be 0 or greater.').max(100, 'Discount cannot exceed 100.'),
});

function AirtimePricingTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiProviders, setApiProviders] = useState<Pick<ApiProvider, 'id' | 'name'>[]>([]);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [airtimePrices, setAirtimePrices] = useState<AirtimePrice[]>([]);

  const form = useForm<z.infer<typeof airtimePriceFormSchema>>({
    resolver: zodResolver(airtimePriceFormSchema),
    defaultValues: {
      apiProviderId: '',
      networkId: '',
      discountPercent: 2,
    },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [providers, fetchedNetworks, prices] = await Promise.all([
        getApiProvidersForSelect(),
        fetchHusmoDataNetworks(),
        getAirtimePrices(),
      ]);
      setApiProviders(providers);
      setNetworks(fetchedNetworks);
      setAirtimePrices(prices);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch required data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (values: z.infer<typeof airtimePriceFormSchema>) => {
    setIsSubmitting(true);
    try {
        const selectedNetwork = networks.find(n => n.id.toString() === values.networkId);
        if (!selectedNetwork) {
            toast({ variant: 'destructive', title: 'Error', description: 'Selected network not found.' });
            return;
        }

        const dataToSubmit = {
            ...values,
            networkName: selectedNetwork.network_name,
            serviceId: 'airtime', // Generic service ID for airtime
        };
        await addAirtimePrice(dataToSubmit);
        toast({ title: 'Success', description: 'Airtime price rule added.' });
        await fetchData(); // Refetch prices
        form.reset();

    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to add pricing rule.' });
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (priceId: string) => {
    try {
      await deleteAirtimePrice(priceId);
      toast({ title: 'Success', description: 'Pricing rule deleted.' });
      await fetchData();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete rule.' });
    }
  }

  const getProviderName = (providerId: string) => apiProviders.find(p => p.id === providerId)?.name || 'Unknown';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Airtime Pricing</CardTitle>
        <CardDescription>Set the percentage discount for each network and API provider.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end p-4 border rounded-lg">
            <FormField control={form.control} name="apiProviderId" render={({ field }) => (
              <FormItem>
                <FormLabel>API Provider</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select Provider" /></SelectTrigger></FormControl>
                  <SelectContent>{apiProviders.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
             <FormField control={form.control} name="networkId" render={({ field }) => (
              <FormItem>
                <FormLabel>Network</FormLabel>
                 <Select onValueChange={field.onChange} value={field.value} disabled={loading}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select Network" /></SelectTrigger></FormControl>
                  <SelectContent>{networks.map(n => <SelectItem key={n.id} value={n.id.toString()}>{n.network_name}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
             <FormField control={form.control} name="discountPercent" render={({ field }) => (
              <FormItem>
                <FormLabel>Discount (%)</FormLabel>
                <FormControl><Input type="number" placeholder="e.g., 2" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" disabled={isSubmitting || loading} className="w-full">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
              Add Rule
            </Button>
          </form>
        </Form>

        {loading ? (
             <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : (
             <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Network</TableHead>
                        <TableHead>API Provider</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {airtimePrices.map(price => (
                        <TableRow key={price.id}>
                            <TableCell className="font-medium">{price.networkName}</TableCell>
                            <TableCell>{getProviderName(price.apiProviderId)}</TableCell>
                            <TableCell className="text-green-600 font-semibold">{price.discountPercent}%</TableCell>
                            <TableCell className="text-right">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>This will permanently delete this pricing rule.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(price.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
             </Table>
        )}
      </CardContent>
    </Card>
  );
}

// --- Main Page Component ---

export default function AdminPricingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Pricing Management</h1>
        <p className="text-muted-foreground">Configure service pricing for different networks and API providers.</p>
      </div>

      <Tabs defaultValue="airtime">
        <TabsList>
          <TabsTrigger value="airtime">Airtime Discounts</TabsTrigger>
          <TabsTrigger value="data" disabled>Data Plans (managed in Services)</TabsTrigger>
          <TabsTrigger value="cable" disabled>Cable TV (managed in Services)</TabsTrigger>
          <TabsTrigger value="electricity" disabled>Electricity (managed in Services)</TabsTrigger>
        </TabsList>

        <TabsContent value="airtime" className="mt-4">
          <AirtimePricingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
