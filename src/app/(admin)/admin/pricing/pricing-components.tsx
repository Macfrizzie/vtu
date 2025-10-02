
'use client';

import { useEffect, useState } from 'react';
import * as z from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiProviders, addAirtimePrice, getAirtimePrices, deleteAirtimePrice, getServices, updateServiceVariations } from '@/lib/firebase/firestore';
import type { ApiProvider, AirtimePrice, Service, ServiceVariation } from '@/lib/types';
import { fetchHusmoDataNetworks, type Network } from '@/services/husmodata';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// --- Airtime Tab ---
const airtimePriceFormSchema = z.object({
  apiProviderId: z.string().min(1, 'Please select an API provider.'),
  networkId: z.string().min(1, 'Please select a network.'),
  discountPercent: z.coerce.number().min(0, 'Discount must be 0 or greater.').max(100, 'Discount cannot exceed 100.'),
});

export function AirtimePricingTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiProviders, setApiProviders] = useState<ApiProvider[]>([]);
  const [networks, setNetworks] = useState<{id: string, name: string}[]>([
      { id: '1', name: 'MTN' },
      { id: '2', name: 'GLO' },
      { id: '3', name: '9MOBILE' },
      { id: '4', name: 'AIRTEL' },
  ]);
  const [airtimePrices, setAirtimePrices] = useState<AirtimePrice[]>([]);

  const form = useForm<z.infer<typeof airtimePriceFormSchema>>({
    resolver: zodResolver(airtimePriceFormSchema),
    defaultValues: { apiProviderId: '', networkId: '', discountPercent: 2 },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [providers, prices] = await Promise.all([
        getApiProviders(),
        getAirtimePrices(),
      ]);
      setApiProviders(providers.filter(p => p.status === 'Active'));
      setAirtimePrices(prices);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: `Failed to fetch required data. ${error instanceof Error ? error.message : ''}` });
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
      const selectedNetwork = networks.find(n => n.id === values.networkId);
      if (!selectedNetwork) throw new Error('Selected network not found.');

      const dataToSubmit = { ...values, networkName: selectedNetwork.name, serviceId: 'airtime' };
      await addAirtimePrice(dataToSubmit);
      toast({ title: 'Success', description: 'Airtime price rule added.' });
      await fetchData();
      form.reset({ apiProviderId: '', networkId: '', discountPercent: 2 });
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
  };

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
                <Select onValueChange={field.onChange} value={field.value} disabled={loading}><FormControl><SelectTrigger><SelectValue placeholder="Select Provider" /></SelectTrigger></FormControl><SelectContent>{apiProviders.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="networkId" render={({ field }) => (
              <FormItem>
                <FormLabel>Network</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={loading}><FormControl><SelectTrigger><SelectValue placeholder="Select Network" /></SelectTrigger></FormControl><SelectContent>{networks.map(n => <SelectItem key={n.id} value={n.id.toString()}>{n.name}</SelectItem>)}</SelectContent></Select><FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="discountPercent" render={({ field }) => (
              <FormItem>
                <FormLabel>Discount (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 2" {...field} /></FormControl><FormMessage />
              </FormItem>
            )} />
            <Button type="submit" disabled={isSubmitting || loading} className="w-full">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add Rule</Button>
          </form>
        </Form>
        {loading ? (<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>) : (
          <Table><TableHeader><TableRow><TableHead>Network</TableHead><TableHead>API Provider</TableHead><TableHead>Discount</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{airtimePrices.map(price => (<TableRow key={price.id}><TableCell className="font-medium">{price.networkName}</TableCell><TableCell>{getProviderName(price.apiProviderId)}</TableCell><TableCell className="text-green-600 font-semibold">{price.discountPercent}%</TableCell><TableCell className="text-right"><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this pricing rule.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(price.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>))}</TableBody></Table>
        )}
      </CardContent>
    </Card>
  );
}

// --- Data Pricing Tab ---
const dataPlanSchema = z.object({
    id: z.string().min(1, "Data ID is required"),
    network: z.string().min(1, "Network is required"),
    planType: z.string().min(1, "Plan type is required"),
    size: z.string().min(1, "Size is required"),
    amount: z.coerce.number().min(0, "Amount must be a positive number"),
    validity: z.string().min(1, "Validity is required"),
    percentageIncrease: z.coerce.number().optional(),
    fixedAmountIncrease: z.coerce.number().optional(),
});

export function DataPricingTab() {
    const { toast } = useToast();
    // This component will manage its own state for data plans
    // In a real app, this would be fetched from Firestore.
    // For now, we'll manage it in local state to demonstrate UI.
    const [dataPlans, setDataPlans] = useState<z.infer<typeof dataPlanSchema>[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof dataPlanSchema>>({
        resolver: zodResolver(dataPlanSchema),
        defaultValues: {
            id: '',
            network: '1', // Default to MTN
            planType: 'SME',
            size: '',
            amount: 0,
            validity: '30 days/1 month',
        }
    });

    const onSubmit = (values: z.infer<typeof dataPlanSchema>) => {
        setIsSubmitting(true);
        // Here you would typically save to Firestore
        console.log("Adding data plan:", values);
        setDataPlans(prev => [...prev, values]);
        toast({ title: "Data Plan Added", description: `${values.size} for ${values.network} has been added.` });
        form.reset();
        setIsSubmitting(false);
    }
    
     const networks = [
        { id: '1', name: 'MTN' },
        { id: '2', name: 'GLO' },
        { id: '3', name: '9MOBILE' },
        { id: '4', name: 'AIRTEL' },
    ];
    
    const validities = ['1 day', '2 days', '3 days', '7 days', '30 days/1 month'];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Data Plan Pricing</CardTitle>
                <CardDescription>Manually input data plans and set markup rules. APIs should be linked on the Services page.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end p-4 border rounded-lg">
                        <FormField control={form.control} name="id" render={({ field }) => (
                            <FormItem><FormLabel>Data ID</FormLabel><FormControl><Input placeholder="e.g., 101" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="network" render={({ field }) => (
                            <FormItem><FormLabel>Network</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{networks.map(n => <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="planType" render={({ field }) => (
                            <FormItem><FormLabel>Plan Type</FormLabel><FormControl><Input placeholder="SME, Corporate, etc." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="size" render={({ field }) => (
                            <FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="500MB, 1GB, etc." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="amount" render={({ field }) => (
                            <FormItem><FormLabel>Amount (Base Price)</FormLabel><FormControl><Input type="number" placeholder="e.g., 300" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="validity" render={({ field }) => (
                            <FormItem><FormLabel>Validity</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{validities.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <div className="lg:col-span-3">
                             <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add Data Plan</Button>
                        </div>
                    </form>
                </Form>
                 <Table>
                    <TableHeader><TableRow><TableHead>Data ID</TableHead><TableHead>Network</TableHead><TableHead>Size</TableHead><TableHead>Base Price</TableHead><TableHead>Validity</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {dataPlans.map((plan, index) => (
                            <TableRow key={index}><TableCell>{plan.id}</TableCell><TableCell>{networks.find(n => n.id === plan.network)?.name}</TableCell><TableCell>{plan.size}</TableCell><TableCell>₦{plan.amount}</TableCell><TableCell>{plan.validity}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell></TableRow>
                        ))}
                         {dataPlans.length === 0 && (
                            <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No data plans added yet.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


// --- Generic Service Pricing Tabs ---

function GenericServicePricingTab({ category, title, description }: { category: Service['category'], title: string, description: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    const fetchData = async () => {
        setLoading(true);
        try {
        const allServices = await getServices();
        setServices(allServices.filter(s => s.category === category && s.status === 'Active'));
        } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Error', description: `Failed to fetch ${category} services.` });
        } finally {
        setLoading(false);
        }
    };
    fetchData();
  }, [category, toast]);

  if (loading) {
    return <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (services.length === 0) {
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">No active {category.toLowerCase()} services found. Please add or configure them in the 'Services' tab first.</p></CardContent>
        </Card>
    );
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Manual plan entry for this category will be implemented here.</p>
        </CardContent>
    </Card>
  )
}


export function CablePricingTab() {
  return <GenericServicePricingTab category="Cable" title="Cable TV Pricing" description="Manually input cable TV packages and set markup rules." />;
}

export function ElectricityPricingTab() {
  return <GenericServicePricingTab category="Electricity" title="Electricity Bill Pricing" description="Manually input DISCOs and set convenience fees." />;
}

    