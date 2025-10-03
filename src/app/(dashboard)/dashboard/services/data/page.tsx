

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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUser } from '@/context/user-context';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { purchaseService, getServices } from '@/lib/firebase/firestore';
import type { Service, ServiceVariation } from '@/lib/types';

const formSchema = z.object({
  serviceId: z.string().min(1, 'Please select a network.'),
  phone: z.string().regex(/^0[789][01]\d{8}$/, 'Please enter a valid Nigerian phone number.'),
  planType: z.string().min(1, "Please select a plan type."),
  variationId: z.string().min(1, 'Please select a data plan.'),
});

type FormData = z.infer<typeof formSchema>;

// Helper function to parse size string (e.g., "1.5GB", "500MB") into MB
const parseDataSize = (sizeStr: string): number => {
    if (!sizeStr) return 0;
    const lowerStr = sizeStr.toLowerCase();
    const value = parseFloat(lowerStr);
    if (isNaN(value)) return 0;

    if (lowerStr.includes('gb')) {
        return value * 1024;
    }
    if (lowerStr.includes('mb')) {
        return value;
    }
    return 0;
};


export default function DataPage() {
  const { user, userData, loading, forceRefetch } = useUser();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: '',
      phone: '',
      planType: '',
      variationId: '',
    },
  });

  useEffect(() => {
    async function fetchServices() {
      setServicesLoading(true);
      try {
        const allServices = await getServices();
        setServices(allServices.filter(s => s.category === 'Data' && s.status === 'Active'));
      } catch (error) {
        console.error("Failed to fetch data services:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load data plans.' });
      } finally {
        setServicesLoading(false);
      }
    }
    fetchServices();
  }, [toast]);

  const selectedServiceId = form.watch('serviceId');
  const selectedPlanType = form.watch('planType');
  
  const { allPlansForNetwork, availablePlanTypes } = useMemo(() => {
    const selectedService = services.find(s => s.id === selectedServiceId);
    const plans = selectedService?.variations || [];
    const planTypes = [...new Set(plans.map(p => p.planType).filter(Boolean)) as string[]];
    return { allPlansForNetwork: plans, availablePlanTypes: planTypes };
  }, [selectedServiceId, services]);

  const availablePlans = useMemo(() => {
      if (!selectedPlanType) return [];
      return allPlansForNetwork
        .filter(p => p.planType === selectedPlanType)
        .sort((a, b) => parseDataSize(a.name) - parseDataSize(b.name));
  }, [selectedPlanType, allPlansForNetwork]);


  async function onSubmit(values: FormData) {
    if (!user || !userData) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to make a purchase.' });
      return;
    }

    const selectedVariation = availablePlans.find(v => v.id === values.variationId);

    if (!selectedVariation) {
      toast({ variant: 'destructive', title: 'Invalid Plan', description: 'The selected data plan could not be found.' });
      return;
    }
    
    const userRole = userData.role || 'Customer';
    const fee = selectedVariation.fees?.[userRole] ?? 0;
    const totalCost = selectedVariation.price + fee;

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
          mobile_number: values.phone, 
          plan: values.variationId,
      };
      await purchaseService(user.uid, values.serviceId, values.variationId, purchaseInputs, user.email!);
      forceRefetch();
      toast({
        title: 'Purchase Successful!',
        description: `${selectedVariation.name} for ${values.phone} was purchased.`,
      });
      form.reset({ serviceId: '', phone: '', planType: '', variationId: ''});
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

  const selectedVariationId = form.watch('variationId');
  const selectedVariation = availablePlans.find(p => p.id === selectedVariationId);
  const totalCost = selectedVariation && userData ? selectedVariation.price + (selectedVariation.fees?.[userData.role || 'Customer'] || 0) : 0;
  const basePrice = selectedVariation?.price || 0;
  const convenienceFee = totalCost - basePrice;


  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Buy Data Bundle</h1>
        <p className="text-muted-foreground">Get the best data plans for all networks.</p>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Data Purchase</CardTitle>
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
                    <FormLabel>Mobile Network</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.resetField('planType');
                        form.resetField('variationId');
                      }}
                      value={field.value}
                      disabled={servicesLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={servicesLoading ? "Loading networks..." : "Select a network"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {services.map(service => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="e.g., 08012345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="planType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.resetField('variationId');
                      }}
                      value={field.value}
                      disabled={!selectedServiceId || availablePlanTypes.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedServiceId ? "Select network first" : "Select a plan type"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availablePlanTypes.map(type => (
                           <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="variationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Plan</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedPlanType || availablePlans.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={!selectedPlanType ? "Select plan type first" : "Select a data plan"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availablePlans.map(plan => {
                            const fee = plan.fees?.[userData?.role || 'Customer'] || 0;
                            const finalPrice = plan.price + fee;
                            return (
                                <SelectItem key={plan.id} value={plan.id}>
                                    {plan.name} ({plan.validity}) - ₦{finalPrice.toLocaleString()}
                                </SelectItem>
                            )
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <div className="space-y-1 rounded-md border bg-secondary/50 p-4 text-sm text-muted-foreground">
                <div className="flex justify-between">
                    <span>Price:</span>
                    <span className="font-semibold text-foreground">₦{basePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                 <div className="flex justify-between">
                    <span>Fee:</span>
                    <span className="font-semibold text-foreground">₦{convenienceFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground">
                    <span>Total to Pay:</span>
                    <span>₦{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" size="lg" disabled={isPurchasing || loading || !selectedVariationId}>
                {isPurchasing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isPurchasing ? 'Processing...' : (totalCost > 0 ? `Pay ₦${totalCost.toLocaleString()}` : 'Purchase Data')}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
