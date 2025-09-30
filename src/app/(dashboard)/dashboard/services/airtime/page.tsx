
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
import { MtnLogo } from '@/components/icons';

const formSchema = z.object({
  network: z.string().min(1, 'Please select a network.'),
  phone: z.string().regex(/^0[789][01]\d{8}$/, 'Please enter a valid Nigerian phone number.'),
  amount: z.coerce.number().min(50, 'Amount must be at least ₦50.'),
});

const networkMapping: { [key: string]: string } = {
  'mtn ng': 'mtn',
  'airtel ng': 'airtel',
  'glo ng': 'glo',
  '9mobile ng': '9mobile',
};

const networkOptions = [
    { value: 'mtn', label: 'MTN'},
    { value: 'glo', label: 'Glo'},
    { value: 'airtel', label: 'Airtel'},
    { value: '9mobile', label: '9mobile'},
]

export default function AirtimePage() {
  const { user, userData, loading, forceRefetch } = useUser();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const searchParams = useSearchParams();
  const provider = searchParams.get('provider');
  const serviceName = searchParams.get('name');


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      network: '',
      phone: '',
      amount: 100,
    },
  });

  useEffect(() => {
    if (provider) {
        const networkKey = provider.toLowerCase();
        if (networkKey in networkMapping) {
            form.setValue('network', networkMapping[networkKey]);
        } else if (Object.values(networkOptions).some(opt => opt.value === networkKey)) {
            form.setValue('network', networkKey);
        }
    }
  }, [provider, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !userData) {
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: 'You must be logged in to make a purchase.',
      });
      return;
    }
    
    // In a real app, we'd fetch the fee for the service. For now, let's assume a small fee or check if it exists.
    // The purchaseService function now handles fee logic.
    if (userData.walletBalance < values.amount) {
        toast({
            variant: 'destructive',
            title: 'Insufficient Funds',
            description: `Your wallet balance is ₦${userData.walletBalance.toLocaleString()}, but the purchase requires at least ₦${values.amount.toLocaleString()}.`,
        });
        return;
    }

    setIsPurchasing(true);
    try {
      const description = `${values.network.toUpperCase()} Airtime Purchase for ${values.phone}`;
      await purchaseService(user.uid, values.amount, description, user.email!, 'airtime');
      forceRefetch();
      toast({
        title: 'Purchase Successful!',
        description: `Your airtime purchase for ${values.phone} was successful.`,
      });
      form.reset({
        network: '',
        phone: '',
        amount: 100,
      });
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
        <h1 className="text-3xl font-bold">{serviceName || 'Buy Airtime'}</h1>
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
                name="network"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile Network</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a network" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {networkOptions.map(opt => (
                           <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                    {/* In a real app, you'd have logos for all networks */}
                                    {opt.value === 'mtn' && <MtnLogo className="h-5 w-5" />}
                                    <span>{opt.label}</span>
                                </div>
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
              <Button type="submit" className="w-full" size="lg" disabled={isPurchasing}>
                {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Purchase Airtime
              </Button>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
}
