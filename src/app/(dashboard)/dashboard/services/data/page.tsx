
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
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { purchaseService } from '@/lib/firebase/firestore';
import { useSearchParams } from 'next/navigation';

const dataPlans: { [key: string]: { id: string; label: string; price: number }[] } = {
  mtn: [
    { id: 'mtn-1gb', label: '1GB - 30 Days (₦300)', price: 300 },
    { id: 'mtn-2gb', label: '2.5GB - 30 Days (₦500)', price: 500 },
    { id: 'mtn-5gb', label: '6GB - 30 Days (₦1,200)', price: 1200 },
  ],
  glo: [
    { id: 'glo-1gb', label: '1.2GB - 30 Days (₦300)', price: 300 },
    { id: 'glo-2gb', label: '3GB - 30 Days (₦500)', price: 500 },
    { id: 'glo-5gb', label: '7GB - 30 Days (₦1,200)', price: 1200 },
  ],
  airtel: [
    { id: 'airtel-1gb', label: '1GB - 30 Days (₦300)', price: 300 },
    { id: 'airtel-2gb', label: '2GB - 30 Days (₦500)', price: 500 },
    { id: 'airtel-5gb', label: '6GB - 30 Days (₦1,200)', price: 1200 },
  ],
  '9mobile': [
    { id: '9mobile-1gb', label: '1GB - 30 Days (₦300)', price: 300 },
    { id: '9mobile-2gb', label: '2.5GB - 30 Days (₦500)', price: 500 },
    { id: '9mobile-5gb', label: '7GB - 30 Days (₦1,200)', price: 1200 },
  ],
};

const networkMapping: { [key: string]: keyof typeof dataPlans } = {
  'mtn ng': 'mtn',
  'airtel ng': 'airtel',
  'glo ng': 'glo',
  '9mobile ng': '9mobile',
};

const formSchema = z.object({
  network: z.enum(['mtn', 'glo', 'airtel', '9mobile']),
  phone: z.string().regex(/^0[789][01]\d{8}$/, 'Please enter a valid Nigerian phone number.'),
  dataPlan: z.string().min(1, 'Please select a data plan.'),
});

type FormData = z.infer<typeof formSchema>;

export default function DataPage() {
  const { user, userData, loading, forceRefetch } = useUser();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const searchParams = useSearchParams();
  const provider = searchParams.get('provider');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: '',
    },
  });

  useEffect(() => {
    if (provider) {
      const networkKey = provider.toLowerCase();
      const network = networkMapping[networkKey];
      if (network) {
        form.setValue('network', network);
      }
    }
  }, [provider, form]);

  const selectedNetwork = form.watch('network');
  const availablePlans = selectedNetwork ? dataPlans[selectedNetwork] : [];

  async function onSubmit(values: FormData) {
    if (!user || !userData) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to make a purchase.',
      });
      return;
    }

    const selectedPlan = availablePlans.find(plan => plan.id === values.dataPlan);
    if (!selectedPlan) {
      toast({
        variant: 'destructive',
        title: 'Invalid Plan',
        description: 'The selected data plan could not be found.',
      });
      return;
    }

    if (userData.walletBalance < selectedPlan.price) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Funds',
        description: `Your balance is ₦${userData.walletBalance.toLocaleString()}, but you need ₦${selectedPlan.price.toLocaleString()}.`,
      });
      return;
    }

    setIsPurchasing(true);
    try {
      const description = `${selectedPlan.label.split('(')[0]} for ${values.phone}`;
      await purchaseService(user.uid, selectedPlan.price, description, user.email!);
      forceRefetch();
      toast({
        title: 'Purchase Successful!',
        description: `${selectedPlan.label} for ${values.phone} was purchased.`,
      });
      form.reset();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Purchase Failed',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsPurchasing(false);
    }
  }

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
                name="network"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Network</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.resetField('dataPlan');
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a network" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mtn">MTN</SelectItem>
                        <SelectItem value="glo">Glo</SelectItem>
                        <SelectItem value="airtel">Airtel</SelectItem>
                        <SelectItem value="9mobile">9mobile</SelectItem>
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
                name="dataPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data Plan</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedNetwork}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a data plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availablePlans.map(plan => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" size="lg" disabled={isPurchasing}>
                {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Purchase Data
              </Button>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
}
