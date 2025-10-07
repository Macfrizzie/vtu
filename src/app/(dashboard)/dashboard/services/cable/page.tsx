

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
import { Loader2, UserCheck, Sparkles, AlertCircle } from 'lucide-react';
import { purchaseService, getServices, getApiProviders } from '@/lib/firebase/firestore';
import { verifySmartCard } from '@/services/husmodata';
import type { Service, ApiProvider, ServiceVariation } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
        console.log('🎬 CABLE PAGE: Starting service fetch...');
        setServicesLoading(true);
        try {
            const allServices = await getServices();
            
            console.log('🎬 CABLE PAGE: All services received:', allServices.length);
            console.log('🎬 CABLE PAGE: All services:', allServices.map(s => ({
                id: s.id,
                name: s.name,
                category: s.category,
                status: s.status
            })));
            
            const service = allServices.find(s => s.category === 'Cable' && s.status === 'Active');
            
            console.log('🎬 CABLE PAGE: Cable service search result:', service ? 'FOUND' : 'NOT FOUND');
            
            if (service) {
                console.log('🎬 CABLE PAGE: Cable Service Details:', {
                    id: service.id,
                    name: service.name,
                    status: service.status,
                    variationsCount: service.variations?.length || 0,
                    hasApiProviderIds: !!service.apiProviderIds,
                    apiProviderIdsCount: service.apiProviderIds?.length || 0
                });
            } else {
                console.error('❌ CABLE PAGE: No active Cable service found!');
                console.log('Available services:', allServices.map(s => `${s.name} (${s.category}) - ${s.status}`));
            }
            
            setCableService(service || null);
            
        } catch (error) {
            console.error("❌ CABLE PAGE: Failed to fetch services:", error);
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
    const uniqueProviderNames = [...new Set(cableService.variations.map(v => v.providerName).filter(Boolean))];
    const providerList = uniqueProviderNames.map(name => ({ id: name as string, name: name as string }));
    return providerList;
  }, [cableService]);

  const selectedCableName = form.watch('cablename');
  const smartCardValue = form.watch('smartCardNumber');

  const availablePackages = useMemo(() => {
    if (!selectedCableName || !cableService || !cableService.variations) {
      return [];
    }
    return cableService.variations.filter(v => v.providerName === selectedCableName && v.status === 'Active');
  }, [selectedCableName, cableService]);

  const selectedVariationId = form.watch('variationId');
  const selectedVariation = availablePackages.find(v => v.id === selectedVariationId);

  async function handleVerify() {
    setIsVerifying(true);
    setCustomerName(null);
    form.clearErrors('smartCardNumber');

     if (!cableService) {
        toast({ variant: 'destructive', title: 'Configuration Error', description: 'Cable service is not loaded.' });
        setIsVerifying(false);
        return;
    }

    try {
      const selectedProviderName = form.getValues('cablename');
      if(!selectedProviderName) {
          throw new Error("Selected service does not have a valid provider name for verification.");
      }
      
      const verificationResult = await verifySmartCard(
          selectedProviderName,
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
      await purchaseService(user.uid, cableService.id, values.variationId, {
          smart_card_number: values.smartCardNumber,
          customer_name: customerName,
      }, user.email!);
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
  const isSmartCardValid = form.getFieldState('smartCardNumber').isDirty && !form.getFieldState('smartCardNumber').invalid;

  if (servicesLoading) {
      return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
  }

  if (!cableService) {
      return (
        <div className="mx-auto max-w-2xl space-y-8">
            <h1 className="text-3xl font-bold">Cable TV Subscription</h1>
             <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Service Unavailable</AlertTitle>
              <AlertDescription>
                The Cable TV service is currently inactive or not configured. Please contact support.
              </AlertDescription>
            </Alert>
        </div>
      )
  }


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
                      disabled={cableProviders.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={cableProviders.length === 0 ? "No providers available" : "Select a provider"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {cableProviders.map(provider => (
                            <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <FormLabel htmlFor="smartCardNumber">Smart Card / IUC Number</FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="smartCardNumber"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                            <Input id="smartCardNumber" type="tel" placeholder="Enter smart card number" {...field} onChange={(e) => {
                                field.onChange(e);
                                if (customerName) setCustomerName(null);
                                form.clearErrors('smartCardNumber');
                            }} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" onClick={handleVerify} disabled={isVerifying || !isSmartCardValid}>
                    {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4"/>}
                    Verify
                  </Button>
                </div>
              </div>

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
                      disabled={!customerName || availablePackages.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!customerName ? "Verify card first" : "Select a package"} />
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

