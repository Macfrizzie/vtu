

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUser } from '@/context/user-context';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';
import { Loader2, Copy, Check } from 'lucide-react';
import { purchaseService, getServices } from '@/lib/firebase/firestore';
import { Label } from '@/components/ui/label';
import type { Service, ServiceVariation } from '@/lib/types';

const formSchema = z.object({
  serviceId: z.string().min(1, 'Please select an exam body.'),
  variationId: z.string().min(1, 'Please select a pin type.'),
});

type FormData = z.infer<typeof formSchema>;

type GeneratedPin = {
  pin: string;
  serial: string;
};

export default function EducationPinPage() {
  const { user, userData, loading, forceRefetch } = useUser();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<GeneratedPin | null>(null);
  const [isCopied, setIsCopied] = useState<'pin' | 'serial' | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: '',
      variationId: '',
    },
  });

  useEffect(() => {
    async function fetchServices() {
        setServicesLoading(true);
        try {
            const allServices = await getServices();
            setServices(allServices.filter(s => s.category === 'Education' && s.status === 'Active'));
        } catch (error) {
            console.error("Failed to fetch education services:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load education services.' });
        } finally {
            setServicesLoading(false);
        }
    }
    fetchServices();
  }, [toast]);


  const selectedServiceId = form.watch('serviceId');
  const selectedVariationId = form.watch('variationId');
  
  const availablePins = useMemo(() => {
    const selectedService = services.find(s => s.id === selectedServiceId);
    return selectedService?.variations || [];
  }, [selectedServiceId, services]);
  
  const selectedPin = useMemo(() => 
      availablePins.find(p => p.id === selectedVariationId)
  , [availablePins, selectedVariationId]);

  const copyToClipboard = (text: string, type: 'pin' | 'serial') => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(type);
      setTimeout(() => setIsCopied(null), 2000);
    });
  };
  
  const totalCost = selectedPin && userData ? selectedPin.price + (selectedPin.fees?.[userData.role] || 0) : 0;

  async function onSubmit(values: FormData) {
    if (!user || !userData) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to make a purchase.' });
      return;
    }
    
    if (!selectedPin) {
        toast({ variant: 'destructive', title: 'Invalid Selection', description: 'Please select a valid pin type.' });
        return;
    }

    if (userData.walletBalance < totalCost) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Funds',
        description: `Your balance is ₦${userData.walletBalance.toLocaleString()}, but the purchase requires at least ₦${totalCost.toLocaleString()}.`,
      });
      return;
    }

    setIsPurchasing(true);
    setGeneratedPin(null);
    try {
      const purchaseInputs = { quantity: 1 };
      
      const result = await purchaseService(user.uid, values.serviceId, values.variationId, purchaseInputs, user.email!);

      if (typeof result !== 'string' && result.pins && result.pins.length > 0) {
        const firstPin = result.pins[0];
        setGeneratedPin({ pin: firstPin.pin, serial: firstPin.serial_number });
        forceRefetch();
        toast({
          title: 'Purchase Successful!',
          description: `Your ${selectedPin.name} has been generated.`,
        });
      } else {
         throw new Error("Failed to retrieve PIN from provider. Please check your transaction history.");
      }
      form.reset();
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
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
    <>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Education E-Pins</h1>
          <p className="text-muted-foreground">Purchase WAEC, NECO, and JAMB pins instantly.</p>
        </div>

        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Buy E-Pin</CardTitle>
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
                      <FormLabel>Examination Body</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.resetField('variationId');
                        }}
                        value={field.value}
                        disabled={servicesLoading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={servicesLoading ? "Loading..." : "Select exam body"} />
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
                  name="variationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pin Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedServiceId || availablePins.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a pin type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availablePins.map(p => {
                             const fee = p.fees?.[userData?.role || 'Customer'] || 0;
                             const finalPrice = p.price + fee;
                            return (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} (₦{finalPrice.toLocaleString()})
                                </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                   <Button type="submit" className="w-full" size="lg" disabled={isPurchasing || !selectedPin}>
                      {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isPurchasing ? 'Processing...' : (totalCost > 0 ? `Pay ₦${totalCost.toLocaleString()}` : 'Buy Pin')}
                  </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>

      <AlertDialog open={!!generatedPin} onOpenChange={() => setGeneratedPin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Your Pin Has Been Generated!</AlertDialogTitle>
            <AlertDialogDescription>
              Here are the details of your purchase. Please copy and save them securely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <div className="flex items-center gap-2">
                <p id="pin" className="w-full rounded-md border bg-muted px-3 py-2 font-mono text-lg font-semibold">
                  {generatedPin?.pin}
                </p>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedPin?.pin || '', 'pin')}>
                  {isCopied === 'pin' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial">Serial Number</Label>
               <div className="flex items-center gap-2">
                <p id="serial" className="w-full rounded-md border bg-muted px-3 py-2 font-mono text-lg font-semibold">
                  {generatedPin?.serial}
                </p>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedPin?.serial || '', 'serial')}>
                  {isCopied === 'serial' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setGeneratedPin(null)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
