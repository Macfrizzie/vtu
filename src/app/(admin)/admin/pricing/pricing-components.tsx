
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
  const [networks, setNetworks] = useState<Network[]>([]);
  const [airtimePrices, setAirtimePrices] = useState<AirtimePrice[]>([]);

  const form = useForm<z.infer<typeof airtimePriceFormSchema>>({
    resolver: zodResolver(airtimePriceFormSchema),
    defaultValues: { apiProviderId: '', networkId: '', discountPercent: 2 },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const providers = await getApiProviders();
      setApiProviders(providers);
      const husmoProvider = providers.find(p => p.id === 'husmodata');
      if (!husmoProvider) throw new Error("HusmoData provider configuration not found.");

      const [fetchedNetworks, prices] = await Promise.all([
        fetchHusmoDataNetworks(husmoProvider.baseUrl, husmoProvider.apiKey),
        getAirtimePrices(),
      ]);
      setNetworks(fetchedNetworks);
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
      const selectedNetwork = networks.find(n => n.id.toString() === values.networkId);
      if (!selectedNetwork) throw new Error('Selected network not found.');

      const dataToSubmit = { ...values, networkName: selectedNetwork.network_name, serviceId: 'airtime' };
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
                <Select onValueChange={field.onChange} value={field.value} disabled={loading || networks.length === 0}><FormControl><SelectTrigger><SelectValue placeholder={networks.length === 0 ? "No networks found" : "Select Network"} /></SelectTrigger></FormControl><SelectContent>{networks.map(n => <SelectItem key={n.id} value={n.id.toString()}>{n.network_name}</SelectItem>)}</SelectContent></Select><FormMessage />
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

// --- Service-based Pricing Tab ---
const serviceVariationSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.coerce.number(),
  fees: z.object({
    Customer: z.coerce.number().min(0).default(0),
    Vendor: z.coerce.number().min(0).default(0),
    Admin: z.coerce.number().min(0).default(0),
  }).default({ Customer: 0, Vendor: 0, Admin: 0 }),
});
const servicePricingFormSchema = z.object({ variations: z.array(serviceVariationSchema) });

function ServicePricingCard({ service, onSave }: { service: Service, onSave: (serviceId: string, variations: ServiceVariation[]) => Promise<void> }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<z.infer<typeof servicePricingFormSchema>>({
    resolver: zodResolver(servicePricingFormSchema),
    defaultValues: { variations: service.variations },
  });

  const { fields } = useFieldArray({ control: form.control, name: "variations" });

  const onSubmit = async (values: z.infer<typeof servicePricingFormSchema>) => {
    setIsSubmitting(true);
    await onSave(service.id, values.variations);
    setIsSubmitting(false);
  };

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>{service.name}</CardTitle>
            <CardDescription>{service.variations.length} plan(s) available. Set role-based convenience fees below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg space-y-2">
                <h4 className="font-semibold">{field.name}</h4>
                <div className="text-sm text-muted-foreground">Base Price: ₦{field.price.toLocaleString()}</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <FormField control={form.control} name={`variations.${index}.fees.Customer`} render={({ field }) => (<FormItem><FormLabel>Customer Fee (₦)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name={`variations.${index}.fees.Vendor`} render={({ field }) => (<FormItem><FormLabel>Vendor Fee (₦)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name={`variations.${index}.fees.Admin`} render={({ field }) => (<FormItem><FormLabel>Admin Fee (₦)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} <Save className="mr-2 h-4 w-4" /> Save Changes for {service.name}</Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
}

function GenericServicePricingTab({ category, title, description }: { category: Service['category'], title: string, description: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const allServices = await getServices();
      setServices(allServices.filter(s => s.category === category && s.status === 'Active' && s.variations?.length > 0));
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: `Failed to fetch ${category} services.` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async (serviceId: string, variations: ServiceVariation[]) => {
    try {
      await updateServiceVariations(serviceId, variations);
      toast({ title: 'Success!', description: 'Pricing has been updated.' });
      await fetchData(); // Refetch to ensure data is consistent
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save pricing changes.' });
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-60"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (services.length === 0) {
    return (
        <Card>
            <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">No active {category.toLowerCase()} services with configurable plans found. Please add or configure them in the 'Services' tab first.</p></CardContent>
        </Card>
    );
  }

  return (
    <div className="space-y-4">
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
        </Card>
        <Accordion type="single" collapsible className="w-full space-y-4">
            {services.map(service => (
                <AccordionItem value={service.id} key={service.id} className="border-none">
                    <Card className="overflow-hidden">
                        <AccordionTrigger className="p-6 hover:no-underline">
                            <CardTitle>{service.name}</CardTitle>
                        </AccordionTrigger>
                        <AccordionContent>
                           <ServicePricingCard service={service} onSave={handleSave} />
                        </AccordionContent>
                    </Card>
                </AccordionItem>
            ))}
        </Accordion>
    </div>
  )
}

export function DataPricingTab() {
  return <GenericServicePricingTab category="Data" title="Data Plan Pricing" description="Set convenience fees for each data plan. The final price for a user will be 'Base Price' + 'Role Fee'." />;
}

export function CablePricingTab() {
  return <GenericServicePricingTab category="Cable" title="Cable TV Pricing" description="Set convenience fees for each Cable TV package." />;
}

export function ElectricityPricingTab() {
  return <GenericServicePricingTab category="Electricity" title="Electricity Bill Pricing" description="Set a convenience fee for electricity bill payments." />;
}
