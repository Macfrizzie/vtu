
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
import { useEffect, useState } from 'react';
import { Loader2, Sparkles, UserCheck } from 'lucide-react';
import { purchaseService } from '@/lib/firebase/firestore';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const packages: { [key: string]: { id: string; label: string; price: number }[] } = {
  dstv: [
    { id: 'dstv-padi', label: 'DStv Padi (₦3,950)', price: 3950 },
    { id: 'dstv-yanga', label: 'DStv Yanga (₦5,500)', price: 5500 },
    { id: 'dstv-confam', label: 'DStv Confam (₦9,300)', price: 9300 },
    { id: 'dstv-premium', label: 'DStv Premium (₦31,000)', price: 31000 },
  ],
  gotv: [
    { id: 'gotv-smallie', label: 'GOtv Smallie (₦1,300)', price: 1300 },
    { id: 'gotv-jinja', label: 'GOtv Jinja (₦2,700)', price: 2700 },
    { id: 'gotv-jollie', label: 'GOtv Jollie (₦4,150)', price: 4150 },
    { id: 'gotv-max', label: 'GOtv MAX (₦5,700)', price: 5700 },
    { id: 'gotv-supa', label: 'GOtv Supa (₦7,600)', price: 7600 },
  ],
  startimes: [
    { id: 'startimes-nova', label: 'StarTimes Nova (₦1,700)', price: 1700 },
    { id: 'startimes-basic', label: 'StarTimes Basic (₦2,300)', price: 2300 },
    { id: 'startimes-classic', label: 'StarTimes Classic (₦3,500)', price: 3500 },
    { id: 'startimes-super', label: 'StarTimes Super (₦5,600)', price: 5600 },
  ],
};

const validProviders = ['dstv', 'gotv', 'startimes'] as const;

const formSchema = z.object({
  provider: z.enum(validProviders, { required_error: 'Please select a provider.'}),
  smartCardNumber: z.string().regex(/^\d{10,12}$/, 'Please enter a valid smart card number (10-12 digits).'),
  package: z.string().min(1, 'Please select a package.'),
});

type FormData = z.infer<typeof formSchema>;

export default function CableTvPage() {
  const { user, userData, loading, forceRefetch } = useUser();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [customerName, setCustomerName] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const initialProvider = searchParams.get('provider')?.toLowerCase();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      smartCardNumber: '',
    },
  });

  useEffect(() => {
    if (initialProvider && validProviders.includes(initialProvider as any)) {
      form.setValue('provider', initialProvider as FormData['provider']);
    }
  }, [initialProvider, form]);

  const selectedProvider = form.watch('provider');
  const smartCardValue = form.watch('smartCardNumber');
  const availablePackages = selectedProvider ? packages[selectedProvider] : [];

  async function handleVerify() {
    setIsVerifying(true);
    setCustomerName(null);
    try {
      // Simulate API call to verify smart card
      await new Promise(resolve => setTimeout(resolve, 1500));
      setCustomerName('Tunde Adebayo'); // Mock name
      toast({
        title: 'Verification Successful',
        description: 'Customer name has been retrieved.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: 'Could not verify smart card number. Please check and try again.',
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

    const selectedPackage = availablePackages.find(p => p.id === values.package);
    if (!selectedPackage) {
      toast({ variant: 'destructive', title: 'Invalid Package', description: 'The selected package could not be found.' });
      return;
    }

    if (userData.walletBalance < selectedPackage.price) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Funds',
        description: `Your balance is ₦${userData.walletBalance.toLocaleString()}, but you need ₦${selectedPackage.price.toLocaleString()}.`,
      });
      return;
    }

    setIsPurchasing(true);
    try {
      const description = `${selectedPackage.label.split('(')[0]} for ${values.smartCardNumber}`;
      await purchaseService(user.uid, selectedPackage.price, description, user.email!);
      forceRefetch();
      toast({
        title: 'Purchase Successful!',
        description: `${selectedPackage.label} for ${values.smartCardNumber} was purchased.`,
      });
      form.reset();
      setCustomerName(null);
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
                name="provider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cable Provider</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        form.resetField('package');
                        form.resetField('smartCardNumber');
                        setCustomerName(null);
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="dstv">DSTV</SelectItem>
                        <SelectItem value="gotv">GOtv</SelectItem>
                        <SelectItem value="startimes">StarTimes</SelectItem>
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
                         <Button type="button" onClick={handleVerify} disabled={isVerifying || smartCardValue.length < 10}>
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
                name="package"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subscription Package</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!selectedProvider}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a package" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availablePackages.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
                 <Button type="submit" className="w-full" size="lg" disabled={isPurchasing || !customerName}>
                    {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Purchase Subscription
                </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
