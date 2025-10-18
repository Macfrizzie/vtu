

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
import { Loader2, Copy, Check, AlertCircle } from 'lucide-react';
import { purchaseService, getServices } from '@/lib/firebase/firestore';
import { Label } from '@/components/ui/label';
import type { Service, ServiceVariation } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
  variationId: z.string().min(1, 'Please select a pin type.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1').max(10, 'You can buy a maximum of 10 pins at a time.'),
});

type FormData = z.infer<typeof formSchema>;

type GeneratedPin = {
  pin: string;
  serial: string;
};

export default function EducationPinPurchasePage({ params }: { params: { serviceId: string } }) {
  const { serviceId: examBodyId } = params;
  const { user, userData, loading, forceRefetch } = useUser();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<GeneratedPin[] | null>(null);
  const [isCopied, setIsCopied] = useState<'pin' | 'serial' | null>(null);
  const [examBodyService, setExamBodyService] = useState<Service | null>(null);
  const [servicesLoading, setServicesLoading] = useState(true);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      variationId: '',
      quantity: 1,
    },
  });
  
  useEffect(() => {
    async function fetchServiceData() {
        if (!examBodyId) return;
        setServicesLoading(true);
        try {
            const allServices = await getServices();
            const relevantService = allServices.find(s => s.id === examBodyId && s.category === 'Education');
            
            setExamBodyService(relevantService || null);

        } catch (error) {
            console.error(`Failed to fetch data for ${examBodyId}:`, error);
            toast({ variant: 'destructive', title: 'Error', description: `Could not load details for ${examBodyId}.` });
        } finally {
            setServicesLoading(false);
        }
    }
    fetchServiceData();
  }, [examBodyId, toast]);


  const selectedVariationId = form.watch('variationId');
  const quantity = form.watch('quantity');
  
  const pinTypes = useMemo(() => examBodyService?.variations || [], [examBodyService]);

  const selectedPin = useMemo(() => 
      pinTypes.find(p => p.id === selectedVariationId)
  , [pinTypes, selectedVariationId]);

  const copyToClipboard = (text: string, type: 'pin' | 'serial') => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(type);
      setTimeout(() => setIsCopied(null), 2000);
    });
  };
  
  const totalCost = selectedPin && userData ? (selectedPin.price + (selectedPin.fees?.[userData.role] || 0)) * quantity : 0;

  async function onSubmit(values: FormData) {
    if (!user || !userData || !examBodyService) {
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
      const purchaseInputs = { 
        quantity: values.quantity,
      };
      
      // The service ID is now the exam body name (e.g., 'WAEC')
      const result = await purchaseService(user.uid, examBodyService.id, values.variationId, purchaseInputs, user.email!);

      if (typeof result !== 'string' && result.pins && Array.isArray(result.pins) && result.pins.length > 0) {
        setGeneratedPin(result.pins);
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

  if (servicesLoading || loading) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  if (!examBodyService) {
      return (
        <div className="mx-auto max-w-2xl space-y-8">
             <div>
                <h1 className="text-3xl font-bold">Service Not Found</h1>
            </div>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Service Unavailable</AlertTitle>
              <AlertDescription>
                The requested education service '{examBodyId}' is inactive or could not be found.
              </AlertDescription>
            </Alert>
        </div>
      );
  }


  return (
    <>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">{examBodyService.name} E-Pin</h1>
          <p className="text-muted-foreground">Purchase pins for {examBodyService.name}.</p>
        </div>

        <Card>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardHeader>
                <CardTitle>Buy E-Pin</CardTitle>
                <CardDescription>
                  Your current wallet balance is{' '}
                  <span className="font-semibold text-primary">
                      ₦{userData?.walletBalance?.toLocaleString() || '0.00'}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="variationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pin Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={pinTypes.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={pinTypes.length === 0 ? `No pins available for ${examBodyService.name}` : "Select a pin type"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pinTypes.map(p => {
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
            {generatedPin?.map((pinData, index) => (
              <div key={index} className="space-y-2 border-b pb-4 last:border-b-0 last:pb-0">
                <div className="space-y-2">
                    <Label htmlFor={`pin-${index}`}>PIN</Label>
                    <div className="flex items-center gap-2">
                        <p id={`pin-${index}`} className="w-full rounded-md border bg-muted px-3 py-2 font-mono text-lg font-semibold">
                        {pinData.pin}
                        </p>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(pinData.pin, 'pin')}>
                        {isCopied === 'pin' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`serial-${index}`}>Serial Number</Label>
                    <div className="flex items-center gap-2">
                        <p id={`serial-${index}`} className="w-full rounded-md border bg-muted px-3 py-2 font-mono text-lg font-semibold">
                        {pinData.serial}
                        </p>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(pinData.serial, 'serial')}>
                        {isCopied === 'serial' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setGeneratedPin(null)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
