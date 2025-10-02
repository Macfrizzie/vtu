
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUser } from '@/context/user-context';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { purchaseService, getServices } from '@/lib/firebase/firestore';
import type { Service } from '@/lib/types';

const formSchema = z.object({
  serviceId: z.string().min(1, 'Please select a distributor.'),
  meterType: z.enum(['prepaid', 'postpaid'], {
    required_error: 'Please select a meter type.',
  }),
  meterNumber: z.string().regex(/^\d{10,13}$/, 'Please enter a valid meter number (10-13 digits).'),
  amount: z.coerce.number().min(100, 'Amount must be at least ₦100.'),
});

type FormData = z.infer<typeof formSchema>;

export default function ElectricityPage() {
  const { user, userData, loading, forceRefetch } = useUser();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: '',
      meterType: 'prepaid',
      meterNumber: '',
      amount: 1000,
    },
  });
  
  useEffect(() => {
    async function fetchServices() {
      setServicesLoading(true);
      try {
        const allServices = await getServices();
        setServices(allServices.filter(s => s.category === 'Electricity' && s.status === 'Active'));
      } catch (error) {
        console.error("Failed to fetch electricity services:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load distributors.' });
      } finally {
        setServicesLoading(false);
      }
    }
    fetchServices();
  }, [toast]);
  
  const selectedServiceId = form.watch('serviceId');
  const selectedService = services.find(s => s.id === selectedServiceId);
  const selectedVariation = selectedService?.variations?.[0];

  async function onSubmit(values: FormData) {
    if (!user || !userData) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to make a purchase.' });
      return;
    }
    
    if (!selectedVariation) {
        toast({ variant: 'destructive', title: 'Invalid Service', description: 'Please select a valid distributor.' });
        return;
    }
    
    const serviceFee = selectedVariation.fees?.[userData.role] || 0;
    const totalCost = values.amount + serviceFee;

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
        meterNumber: values.meterNumber,
        meterType: values.meterType,
        amount: values.amount,
      };

      if (!selectedService?.name) {
          throw new Error("Service name not found");
      }

      await purchaseService(user.uid, values.serviceId, selectedService.name, purchaseInputs, user.email!);
      
      forceRefetch();
      toast({
        title: 'Payment Successful!',
        description: `Your payment of ₦${values.amount.toLocaleString()} for meter ${values.meterNumber} was successful.`,
      });
      form.reset({ serviceId: '', meterType: 'prepaid', meterNumber: '', amount: 1000 });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      });
    } finally {
      setIsPurchasing(false);
    }
  }

  const serviceFee = useMemo(() => {
    if (!selectedVariation || !userData) return 0;
    return selectedVariation.fees?.[userData.role] || 0;
  }, [selectedVariation, userData]);

  const amount = form.watch('amount');
  const totalCost = amount + serviceFee;


  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Pay Electricity Bill</h1>
        <p className="text-muted-foreground">
          Pay for prepaid or postpaid meters with ease.
        </p>
      </div>

      <Card>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Electricity Payment</CardTitle>
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
                    <FormLabel>Distributor (Disco)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={servicesLoading}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={servicesLoading ? "Loading..." : "Select your electricity distributor"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {services.map(service => (
                             <SelectItem key={service.id} value={service.id}>{service.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meterType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Meter Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex gap-4"
                      >
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="prepaid" id="prepaid" />
                          </FormControl>
                          <FormLabel htmlFor="prepaid" className="font-normal">Prepaid</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <RadioGroupItem value="postpaid" id="postpaid" />
                          </FormControl>
                          <FormLabel htmlFor="postpaid" className="font-normal">Postpaid</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="meterNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meter Number</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="Enter meter number" {...field} />
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
              
              <div className="text-sm text-muted-foreground">
                <p>Service Fee: ₦{serviceFee.toLocaleString()}</p>
                <p className="font-semibold">Total to Pay: ₦{totalCost.toLocaleString()}</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" size="lg" disabled={isPurchasing || loading || !selectedServiceId}>
                {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPurchasing ? 'Processing...' : (totalCost > 0 ? `Pay ₦${totalCost.toLocaleString()}` : 'Pay Bill')}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
