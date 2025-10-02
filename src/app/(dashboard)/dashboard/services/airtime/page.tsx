
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
import { Loader2 } from 'lucide-react';
import { purchaseService, getServices } from '@/lib/firebase/firestore';
import type { Service } from '@/lib/types';

const formSchema = z.object({
  serviceId: z.string().min(1, 'Please select a network.'),
  phone: z.string().regex(/^0[789][01]\d{8}$/, 'Please enter a valid Nigerian phone number.'),
  amount: z.coerce.number().min(50, 'Amount must be at least ₦50.'),
});

type FormData = z.infer<typeof formSchema>;

const networkMap: { [key: string]: string } = {
    'mtn': '1',
    'glo': '2',
    '9mobile': '3',
    'airtel': '4'
}

export default function AirtimePage() {
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
      amount: 100,
    },
  });

  useEffect(() => {
    async function fetchData() {
      setServicesLoading(true);
      try {
        const allServices = await getServices();
        setServices(allServices.filter(s => s.name.toLowerCase().includes('airtime') && s.status === 'Active'));
      } catch (error) {
        console.error("Failed to fetch airtime data:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load networks.' });
      } finally {
        setServicesLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  const selectedServiceId = form.watch('serviceId');
  const selectedService = services.find(s => s.id === selectedServiceId);
  const amount = form.watch('amount');
  
  const { totalCost, discount } = useMemo(() => {
    if (!selectedService) return { totalCost: amount, discount: 0 };
    let calculatedDiscount = 0;
    if (selectedService.markupType === 'percentage' && selectedService.markupValue) {
        calculatedDiscount = (amount * selectedService.markupValue) / 100;
    } else if (selectedService.markupType === 'fixed' && selectedService.markupValue) {
        calculatedDiscount = selectedService.markupValue;
    }
    return { totalCost: amount - calculatedDiscount, discount: calculatedDiscount };
  }, [amount, selectedService]);


  async function onSubmit(values: FormData) {
    if (!user || !userData) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to make a purchase.',
      });
      return;
    }
    
    if (!selectedService) {
        toast({ variant: 'destructive', title: 'Invalid Service', description: 'Please select a valid network.' });
        return;
    }
    
    if (userData.walletBalance < totalCost) {
        toast({
            variant: 'destructive',
            title: 'Insufficient Funds',
            description: `Your wallet balance is ₦${userData.walletBalance.toLocaleString()}, but the purchase requires ₦${totalCost.toLocaleString()}.`,
        });
        return;
    }

    const networkProviderName = selectedService.provider.toLowerCase();
    const networkId = networkMap[networkProviderName];
    if (!networkId) {
        toast({ variant: 'destructive', title: 'Configuration Error', description: `Network ID not found for provider: ${selectedService.provider}` });
        return;
    }

    setIsPurchasing(true);
    try {
      const purchaseInputs = { 
          mobile_number: values.phone, 
          amount: values.amount,
          networkId: networkId
      };
      await purchaseService(user.uid, values.serviceId, purchaseInputs, user.email!);
      forceRefetch();
      toast({
        title: 'Purchase Successful!',
        description: `Your airtime purchase for ${values.phone} was successful.`,
      });
      form.reset({
        serviceId: '',
        phone: '',
        amount: 100,
      });
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
  

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Buy Airtime</h1>
        <p className="text-muted-foreground">
          Top up airtime for any network quickly and easily.
        </p>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Airtime Top-up</CardTitle>
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
                    <Select onValueChange={field.onChange} value={field.value} disabled={servicesLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={servicesLoading ? "Loading..." : "Select a network"} />
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₦)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter amount" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <div className="space-y-1 rounded-md border bg-secondary/50 p-4 text-sm text-muted-foreground">
                <div className="flex justify-between">
                    <span>Discount:</span>
                    <span className="font-semibold text-green-600">- ₦{discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground">
                    <span>Total to Pay:</span>
                    <span>₦{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isPurchasing || !selectedService}>
                {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPurchasing ? 'Processing...' : (totalCost > 0 ? `Pay ₦${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Purchase Airtime')}
              </Button>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
}

    