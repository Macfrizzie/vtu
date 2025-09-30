
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useUser } from '@/context/user-context';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { purchaseService } from '@/lib/firebase/firestore';
import { useSearchParams } from 'next/navigation';

const discoMapping: { [key: string]: string } = {
    'ikedc': 'ikeja',
    'ekedc': 'eko',
    'aedc': 'abuja',
    'ibedc': 'ibadan',
    'kedco': 'kano',
    'phed': 'portharcourt',
};

const formSchema = z.object({
  disco: z.string().min(1, 'Please select a distributor.'),
  meterType: z.enum(['prepaid', 'postpaid'], {
    required_error: 'Please select a meter type.',
  }),
  meterNumber: z.string().regex(/^\d{10,13}$/, 'Please enter a valid meter number (10-13 digits).'),
  amount: z.coerce.number().min(100, 'Amount must be at least ₦100.'),
});

export default function ElectricityPage() {
  const { user, userData, loading, forceRefetch } = useUser();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const searchParams = useSearchParams();
  const provider = searchParams.get('provider');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      meterType: 'prepaid',
      meterNumber: '',
      amount: 1000,
    },
  });

  useEffect(() => {
    if (provider) {
        const discoKey = provider.toLowerCase();
        const disco = discoMapping[discoKey];
        if (disco) {
            form.setValue('disco', disco);
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

    if (userData.walletBalance < values.amount) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Funds',
        description: `Your balance is ₦${userData.walletBalance.toLocaleString()}, but you need ₦${values.amount.toLocaleString()}.`,
      });
      return;
    }

    setIsPurchasing(true);
    try {
      const description = `${values.disco.toUpperCase()} Electricity payment for ${values.meterNumber}`;
      await purchaseService(user.uid, values.amount, description, user.email!);
      forceRefetch();
      toast({
        title: 'Payment Successful!',
        description: `Your payment of ₦${values.amount.toLocaleString()} for meter ${values.meterNumber} was successful.`,
      });
      form.reset();
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: 'Something went wrong. Please try again.',
      });
    } finally {
      setIsPurchasing(false);
    }
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
                name="disco"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distributor (Disco)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your electricity distributor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ikeja">Ikeja Electric (IKEDC)</SelectItem>
                        <SelectItem value="eko">Eko Electric (EKEDC)</SelectItem>
                        <SelectItem value="abuja">Abuja Electric (AEDC)</SelectItem>
                        <SelectItem value="ibadan">Ibadan Electric (IBEDC)</SelectItem>
                        <SelectItem value="kano">Kano Electric (KEDCO)</SelectItem>
                        <SelectItem value="portharcourt">Port Harcourt Electric (PHED)</SelectItem>
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
              <Button type="submit" className="w-full" size="lg" disabled={isPurchasing}>
                {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Pay Bill
              </Button>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
}

    