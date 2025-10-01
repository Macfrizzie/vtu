
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
import type { Service, ApiProvider } from '@/lib/types';
import { useSearchParams } from 'next/navigation';

const formSchema = z.object({
  serviceId: z.string().min(1, 'Please select a provider.'),
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
  const [services, setServices] = useState<Service[]>([]);
  const [apiProviders, setApiProviders] = useState<ApiProvider[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: '',
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
            setServices(allServices.filter(s => s.category === 'Cable' && s.status === 'Active'));
            setApiProviders(allProviders);
        } catch (error) {
            console.error("Failed to fetch cable services:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load cable providers.' });
        } finally {
            setServicesLoading(false);
        }
    }
    fetchServices();
  }, [toast]);
  

  const selectedServiceId = form.watch('serviceId');
  const smartCardValue = form.watch('smartCardNumber');
  const selectedService = useMemo(() => services.find(s => s.id === selectedServiceId), [selectedServiceId, services]);

  const availablePackages = useMemo(() => {
    return selectedService?.variations || [];
  }, [selectedService]);

  const selectedVariationId = form.watch('variationId');
  const selectedVariation = availablePackages.find(v => v.id === selectedVariationId);

  async function handleVerify() {
    setIsVerifying(true);
    setCustomerName(null);
    form.clearErrors('smartCardNumber');

    if (!selectedService || !selectedService.apiProviderId) {
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'Selected service is not linked to an API provider.' });
        setIsVerifying(false);
        return;
    }

    const provider = apiProviders.find(p => p.id === selectedService.apiProviderId);
    if (!provider) {
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'API provider not found.' });
        setIsVerifying(false);
        return;
    }

    try {
      const verificationResult = await verifySmartCard(
          provider.baseUrl,
          provider.apiKey,
          selectedService.provider, // 'dstv', 'gotv', etc.
          smartCardValue
      );
      
      const name = verificationResult.customer_name || verificationResult.Customer_Name;
      
      if (!name) {
         throw new Error("Customer name not found in verification response.");
      }

      setCustomerName(name);
      toast({
        title: 'Verification Successful',
        description: 'Customer name has been retrieved.',
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

    if (!selectedVariation || !selectedService) {
      toast({ variant: 'destructive', title: 'Invalid Package', description: 'The selected package could not be found.' });
      return;
    }

    const totalCost = selectedVariation.price + (selectedVariation.fees?.[userData.role] || 0);

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
          variation_code: selectedVariation.id, // Pass variation ID
          amount: selectedVariation.price // Pass the base price
      };

      await purchaseService(user.uid, values.serviceId, values.variationId, purchaseInputs, user.email!);
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

  const totalCost = selectedVariation && userData ? selectedVariation.price + (selectedVariation.fees?.[userData.role] || 0) : 0;

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
                name="serviceId"
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
                      disabled={servicesLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={servicesLoading ? "Loading..." : "Select a provider"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {services.map(s => (
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
                    <div className="flex gap-2">
                        <FormControl>
                            <Input type="tel" placeholder="Enter smart card number" {...field} />
                        </FormControl>
                         <Button type="button" onClick={handleVerify} disabled={isVerifying || smartCardValue.length < 10 || !selectedServiceId}>
                            {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4"/>}
                            Verify
                        </Button>
                    </div>
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

              <FormField
                control={form.control}
                name="variationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Package</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedServiceId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a package" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availablePackages.map(p => {
                          const fee = p.fees?.[userData?.role || 'Customer'] || 0;
                          const finalPrice = p.price + fee;
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
            </CardContent>
            <CardFooter>
                 <Button type="submit" className="w-full" size="lg" disabled={isPurchasing || !customerName || !selectedVariationId}>
                    {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isPurchasing ? 'Processing...' : (totalCost > 0 ? `Pay ₦${totalCost.toLocaleString()}` : 'Purchase Subscription')}
                </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
