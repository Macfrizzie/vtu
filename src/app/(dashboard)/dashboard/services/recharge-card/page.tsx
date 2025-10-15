

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
import type { Service } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  networkId: z.string().min(1, 'Please select a network.'),
  variationId: z.string().min(1, 'Please select a denomination.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.').max(10, 'You can buy a maximum of 10 pins at a time.'),
});

type FormData = z.infer<typeof formSchema>;

type GeneratedPin = {
  pin: string;
  serial: string;
};

export default function RechargeCardPage() {
  const { user, userData, loading, forceRefetch } = useUser();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [generatedPins, setGeneratedPins] = useState<GeneratedPin[] | null>(null);
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [rechargeCardService, setRechargeCardService] = useState<Service | null>(null);
  const [servicesLoading, setServicesLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      networkId: '',
      variationId: '',
      quantity: 1,
    },
  });

  useEffect(() => {
    async function fetchServices() {
        console.log('💳 RECHARGE CARD PAGE: Starting service fetch...');
        setServicesLoading(true);
        try {
            const allServices = await getServices();
            const service = allServices.find(s => s.category === 'Recharge Card' && s.status === 'Active');
            console.log('💳 RECHARGE CARD PAGE: Active service found:', service);
            setRechargeCardService(service || null);
        } catch (error) {
            console.error("❌ RECHARGE CARD PAGE: Failed to fetch services:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load services.' });
        } finally {
            setServicesLoading(false);
        }
    }
    fetchServices();
  }, [toast]);


  const selectedNetworkId = form.watch('networkId');
  const selectedVariationId = form.watch('variationId');
  const quantity = form.watch('quantity');
  
  const availableDenominations = useMemo(() => {
    const selectedNetwork = rechargeCardService?.variations?.find(v => v.id === selectedNetworkId);
    console.log('💳 RECHARGE CARD PAGE: Selected network:', selectedNetwork?.name);
    console.log('💳 RECHARGE CARD PAGE: Denominations for selected network:', selectedNetwork?.variations);
    return selectedNetwork?.variations || [];
  }, [selectedNetworkId, rechargeCardService]);
  
  const selectedDenomination = useMemo(() => 
      availableDenominations.find(p => p.id === selectedVariationId)
  , [availableDenominations, selectedVariationId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(id);
      setTimeout(() => setIsCopied(null), 2000);
    });
  };
  
  const totalCost = selectedDenomination && userData ? (selectedDenomination.price + (selectedDenomination.fees?.[userData.role] || 0)) * quantity : 0;

  async function onSubmit(values: FormData) {
    if (!user || !userData || !rechargeCardService) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to make a purchase.' });
      return;
    }
    
    if (!selectedDenomination) {
        toast({ variant: 'destructive', title: 'Invalid Selection', description: 'Please select a valid denomination.' });
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
    setGeneratedPins(null);
    try {
      const purchaseInputs = { 
        quantity: values.quantity,
        name_on_card: userData.fullName,
      };
      
      const result = await purchaseService(user.uid, rechargeCardService.id, values.variationId, purchaseInputs, user.email!);
      
      if (typeof result !== 'string' && result.CARDS && result.CARDS.length > 0) {
        const pins = result.CARDS.map((card: any) => ({ pin: card.pin, serial: card.serial_number }));
        setGeneratedPins(pins);
        forceRefetch();
        toast({
          title: 'Purchase Successful!',
          description: `Your recharge card(s) have been generated.`,
        });
      } else {
         throw new Error("Failed to retrieve PINs from provider. Please check your transaction history.");
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
          <h1 className="text-3xl font-bold">Recharge Card E-Pins</h1>
          <p className="text-muted-foreground">Purchase and print recharge card pins instantly.</p>
        </div>

        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Buy Recharge Card Pin</CardTitle>
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
                  name="networkId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Network</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.resetField('variationId');
                        }}
                        value={field.value}
                        disabled={servicesLoading || !rechargeCardService?.variations?.length}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={servicesLoading ? "Loading..." : "Select network"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {rechargeCardService?.variations?.map(s => (
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
                      <FormLabel>Denomination</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedNetworkId || availableDenominations.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a denomination" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableDenominations.map(p => {
                             const fee = p.fees?.[userData?.role || 'Customer'] || 0;
                             const finalPrice = p.price + fee;
                            return (
                                <SelectItem key={p.id} value={p.id}>
                                  ₦{p.price.toLocaleString()} Pin (Cost: ₦{finalPrice.toLocaleString()})
                                </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                 <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                            <Input type="number" min="1" max="10" placeholder="e.g., 1" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

              </CardContent>
              <CardFooter>
                   <Button type="submit" className="w-full" size="lg" disabled={isPurchasing || !selectedDenomination}>
                      {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isPurchasing ? 'Processing...' : (totalCost > 0 ? `Pay ₦${totalCost.toLocaleString()}` : 'Buy Pin(s)')}
                  </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>

      <AlertDialog open={!!generatedPins} onOpenChange={() => setGeneratedPins(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Your Recharge Card(s) are Ready!</AlertDialogTitle>
            <AlertDialogDescription>
              Here are the details of your purchase. Please copy and save them securely. You can also print this dialog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-4 py-4">
                {generatedPins?.map((item, index) => (
                    <div key={index} className="space-y-3 rounded-lg border p-4">
                         <h3 className="font-semibold">Pin #{index + 1}</h3>
                        <div className="space-y-1">
                            <Label htmlFor={`pin-${index}`}>PIN</Label>
                            <div className="flex items-center gap-2">
                                <p id={`pin-${index}`} className="w-full rounded-md border bg-muted px-3 py-2 font-mono text-base font-semibold">
                                {item.pin}
                                </p>
                                <Button variant="outline" size="icon" onClick={() => copyToClipboard(item.pin, `pin-${index}`)}>
                                {isCopied === `pin-${index}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor={`serial-${index}`}>Serial Number</Label>
                            <div className="flex items-center gap-2">
                                <p id={`serial-${index}`} className="w-full rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                                {item.serial}
                                </p>
                                <Button variant="outline" size="icon" onClick={() => copyToClipboard(item.serial, `serial-${index}`)}>
                                {isCopied === `serial-${index}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
          </ScrollArea>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => window.print()}>Print</Button>
            <AlertDialogAction onClick={() => setGeneratedPins(null)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
