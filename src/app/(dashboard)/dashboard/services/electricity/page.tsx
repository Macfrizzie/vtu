

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
import { Loader2, AlertCircle } from 'lucide-react';
import { purchaseService, getServices } from '@/lib/firebase/firestore';
import type { Service, Disco } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const [electricityService, setElectricityService] = useState<Service | null>(null);
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
      console.log("[ElectricityPage] Fetching services...");
      setServicesLoading(true);
      try {
        const allServices = await getServices();
        console.log("[ElectricityPage] All services fetched:", allServices);
        const service = allServices.find(s => s.category === 'Electricity' && s.status === 'Active');
        
        if (service) {
          console.log("[ElectricityPage] Found active Electricity service:", service);
          setElectricityService(service);
        } else {
          console.warn("[ElectricityPage] No active 'Electricity' service found.");
          setElectricityService(null);
        }
      } catch (error) {
        console.error("[ElectricityPage] Failed to fetch electricity services:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load distributors.' });
        setElectricityService(null);
      } finally {
        setServicesLoading(false);
        console.log("[ElectricityPage] Service fetching finished.");
      }
    }
    fetchServices();
  }, [toast]);

  const discos = useMemo(() => {
    if (!electricityService || !electricityService.variations) {
        console.log("[ElectricityPage] Discos: No service or variations, returning empty array.");
        return [];
    }
    console.log("[ElectricityPage] Discos derived from service variations:", electricityService.variations);
    return electricityService.variations;
  }, [electricityService]);
  
  const selectedDiscoId = form.watch('serviceId');
  const selectedDisco = discos.find(d => d.id === selectedDiscoId);
  
  async function onSubmit(values: FormData) {
    if (!user || !userData) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to make a purchase.' });
      return;
    }

    if (!electricityService) {
        toast({ variant: 'destructive', title: 'Service Unavailable', description: 'Electricity service is currently unavailable.'});
        return;
    }
    
    if (!selectedDisco) {
        toast({ variant: 'destructive', title: 'Invalid Distributor', description: 'Please select a valid distributor.' });
        return;
    }
    
    const serviceFee = selectedDisco.fees?.[userData.role] || 100; // Fallback to 100
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
      await purchaseService(user.uid, electricityService.id, values.serviceId, {
        meterNumber: values.meterNumber,
        meterType: values.meterType,
        amount: values.amount,
      }, user.email!);
      
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

  const serviceFee = selectedDisco ? (selectedDisco.fees?.[userData?.role || 'Customer'] ?? 100) : 100;
  const amount = form.watch('amount');
  const totalCost = amount + serviceFee;

  if (servicesLoading) {
      return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
  }

  if (!electricityService) {
      return (
        <div className="mx-auto max-w-2xl space-y-8">
             <div>
                <h1 className="text-3xl font-bold">Pay Electricity Bill</h1>
                <p className="text-muted-foreground">
                Pay for prepaid or postpaid meters with ease.
                </p>
            </div>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Service Unavailable</AlertTitle>
              <AlertDescription>
                The Electricity service is currently inactive or not configured. Please contact support.
              </AlertDescription>
            </Alert>
        </div>
      )
  }

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
                    <Select onValueChange={field.onChange} value={field.value} disabled={discos.length === 0}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={discos.length === 0 ? "No distributors available" : "Select your electricity distributor"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {discos.map(disco => (
                             <SelectItem key={disco.id} value={disco.id}>{disco.name}</SelectItem>
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
              
              <div className="space-y-1 rounded-md border bg-secondary/50 p-4 text-sm text-muted-foreground">
                 <div className="flex justify-between">
                    <span>Service Fee:</span>
                    <span className="font-semibold text-foreground">₦{serviceFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground">
                    <span>Total to Pay:</span>
                    <span>₦{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" size="lg" disabled={isPurchasing || loading || !selectedDiscoId}>
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
