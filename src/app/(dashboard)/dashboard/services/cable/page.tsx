

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser } from '@/context/user-context';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import { Loader2, UserCheck, Sparkles } from 'lucide-react';
import { purchaseService, getServices, getApiProviders } from '@/lib/firebase/firestore';
import { verifySmartCard } from '@/services/husmodata';
import type { Service, ApiProvider, ServiceVariation } from '@/lib/types';

const formSchema = z.object({
  cablename: z.string().min(1, 'Please select a provider.'),
  smartCardNumber: z.string().regex(/^\d{10,12}$/, 'Please enter a valid smart card number (10-12 digits).'),
  variationId: z.string().min(1, 'Please select a package.'),
});

type FormData = z.infer<typeof formSchema>;

export default function CableTvPage() {
  const { user, userData, loading, forceRefetch } = useUser();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const [cableService, setCableService] = useState<Service | null>(null);
  const [apiProviders, setApiProviders] = useState<ApiProvider[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cablename: '',
      smartCardNumber: '',
      variationId: '',
    },
  });

  useEffect(() => {
    async function fetchServices() {
        setServicesLoading(true);
        try {
            const [allServices, allProviders] = await Promise.all([
                getServices(),
                getApiProviders()
            ]);
            const service = allServices.find(s => s.category === 'Cable' && s.status === 'Active') || null;
            setCableService(service);
            setApiProviders(allProviders.filter(p => p.status === 'Active'));
        } catch (error) {
            console.error("Failed to fetch cable services:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load cable providers.' });
        } finally {
            setServicesLoading(false);
        }
    }
    fetchServices();
  }, [toast]);
  
  const cableProviders = useMemo(() => {
    if (!cableService || !cableService.variations) {
      return [];
    }
    const providerNames = new Set(cableService.variations.map(v => v.providerName).filter(Boolean));
    return Array.from(providerNames).map(name => ({ id: name!, name: name! }));
  }, [cableService]);

  const selectedCableName = form.watch('cablename');
  const smartCardValue = form.watch('smartCardNumber');

  const availablePackages = useMemo(() => {
    if (!selectedCableName || !cableService) return [];
    return (cableService.variations || []).filter(v => v.providerName === selectedCableName);
  }, [selectedCableName, cableService]);

  const selectedVariationId = form.watch('variationId');
  const selectedVariation = availablePackages.find(v => v.id === selectedVariationId);

  async function handleVerify() {
    setIsVerifying(true);
    setCustomerName(null);
    form.clearErrors('smartCardNumber');

    if (!cableService || !cableService.apiProviderIds || cableService.apiProviderIds.length === 0) {
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'Selected service is not linked to an API provider.' });
        setIsVerifying(false);
        return;
    }

    const providerInfo = cableService.apiProviderIds.find(p => p.priority === 'Primary') || cableService.apiProviderIds[0];
    const provider = apiProviders.find(p => p.id === providerInfo.id);

    if (!provider) {
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'Primary API provider not found or is inactive.' });
        setIsVerifying(false);
        return;
    }

    try {
      if(!selectedCableName) {
          throw new Error("Selected service does not have a valid provider name for verification.");
      }
      
      const verificationResult = await verifySmartCard(
          provider.baseUrl,
          provider.apiKey || '',
          selectedCableName,
          smartCardValue
      );
      
      const name = verificationResult.customer_name || verificationResult.Customer_Name || verificationResult.name;
      
      if (!name) {
         throw new Error("Customer name not found in verification response.");
      }

      setCustomerName(name);
      toast({
        title: 'Verification Successful',
        description: `Customer: ${name}`,
      });
    } catch (error) {
       const errorMessage = error instanceof Error ? error.message : 'Could not verify smart card number. Please check and try again.';
       form.setError('smartCardNumber', { type: 'manual', message: errorMessage });
       toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: errorMessage,
      });
    } finally {
      setIsVerifying(false);
    }
  }

  async function onSubmit(values: FormData) {
    if (!user || !userData) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to make a purchase.' });
      return;
    }
    
    if (!customerName) {
        toast({ variant: 'destructive', title: 'Verification Required', description: 'Please verify your smart card number before purchasing.' });
        return;
    }

    if (!selectedVariation || !cableService) {
      toast({ variant: 'destructive', title: 'Invalid Package', description: 'The selected package could not be found.' });
      return;
    }

    const totalCost = selectedVariation.price + (cableService.markupValue || 0);

    if (userData.walletBalance < totalCost) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Funds',
        description: `Your balance is ₦${userData.walletBalance.toLocaleString()}, but the purchase requires ₦${totalCost.toLocaleString()}.`,
      });
      return;
    }

    setIsPurchasing(true);
    try {
      const purchaseInputs = {
          smart_card_number: values.smartCardNumber,
          customer_name: customerName,
          cablename: values.cablename,
      };

      await purchaseService(user.uid, cableService.id, values.variationId, purchaseInputs, user.email!);
      forceRefetch();
      toast({
        title: 'Purchase Successful!',
        description: `${selectedVariation.name} for ${values.smartCardNumber} was purchased.`,
      });
      form.reset();
      setCustomerName(null);
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      toast({
        variant: 'destructive',
        title: 'Purchase Failed',
        description: errorMessage,
      });
    } finally {
      setIsPurchasing(false);
    }
  }

  const totalCost = selectedVariation ? selectedVariation.price + (cableService?.markupValue || 0) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Cable TV Subscription</h1>
        <p className="text-muted-foreground">Renew your DSTV, GOtv, or StarTimes subscription instantly.</p>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Cable Subscription</CardTitle>
              <CardDescription>
                Your current wallet balance is{' '}
                {loading ? (
                  <span className="animate-pulse">...</span>
                ) : (
                  <span className="font-semibold text-primary">
                    ₦{userData?.walletBalance?.toLocaleString() || '0.00'}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="cablename"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cable Provider</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.resetField('variationId');
                        form.resetField('smartCardNumber');
                        setCustomerName(null);
                      }}
                      value={field.value}
                      disabled={servicesLoading || !cableService || cableProviders.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={servicesLoading ? "Loading..." : "Select a provider"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cableProviders.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="smartCardNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Smart Card / IUC Number</FormLabel>
                    <FormControl>
                        <Input type="tel" placeholder="Enter smart card number" {...field} onChange={(e) => {
                            field.onChange(e);
                            setCustomerName(null); // Reset verification on change
                        }} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="variationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Package</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedCableName || availablePackages.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedCableName ? "Select provider first" : "Select a package"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availablePackages.map(p => {
                          const finalPrice = p.price + (cableService?.markupValue || 0);
                          return (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} (₦{finalPrice.toLocaleString()})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
                
              {customerName && (
                <div className="flex items-center gap-2 rounded-md border border-green-500 bg-green-50 p-3">
                  <UserCheck className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-semibold text-green-800">{customerName}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
                 {customerName ? (
                     <Button type="submit" className="w-full" size="lg" disabled={isPurchasing || !selectedVariationId}>
                        {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isPurchasing ? 'Processing...' : (totalCost > 0 ? `Pay ₦${totalCost.toLocaleString()}` : 'Purchase Subscription')}
                    </Button>
                 ) : (
                    <Button type="button" className="w-full" size="lg" onClick={handleVerify} disabled={isVerifying || !form.formState.isValid || !selectedCableName}>
                        {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4"/>}
                        Verify Details
                    </Button>
                 )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
