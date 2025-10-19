
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
import { purchaseService, getEducationPinTypes, getServices } from '@/lib/firebase/firestore';
import { Label } from '@/components/ui/label';
import type { EducationPinType, Service } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  examBody: z.string().min(1, 'Please select an exam body.'),
  variationId: z.string().min(1, 'Please select a pin type.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1').max(10, 'You can buy a maximum of 10 pins at a time.'),
});

type FormData = z.infer<typeof formSchema>;

type GeneratedPin = {
  pin: string;
  serial: string;
};

export default function EducationPinPurchasePage() {
  const { user, userData, loading, forceRefetch } = useUser();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [generatedPins, setGeneratedPins] = useState<GeneratedPin[] | null>(null);
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [allPinTypes, setAllPinTypes] = useState<EducationPinType[]>([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [educationService, setEducationService] = useState<Service | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      examBody: '',
      variationId: '',
      quantity: 1,
    },
  });
  
  useEffect(() => {
    async function fetchServiceData() {
        setServicesLoading(true);
        try {
            const [allPins, allServices] = await Promise.all([
                getEducationPinTypes(),
                getServices()
            ]);

            const relevantService = allServices.find(s => s.category === 'Education');
            
            setAllPinTypes(allPins.filter(p => p.status === 'Active'));
            setEducationService(relevantService || null);

        } catch (error) {
            console.error(`Failed to fetch education data:`, error);
            toast({ variant: 'destructive', title: 'Error', description: `Could not load education service details.` });
        } finally {
            setServicesLoading(false);
        }
    }
    fetchServiceData();
  }, [toast]);

  const examBodies = useMemo(() => {
      return [...new Set(allPinTypes.map(p => p.examBody))];
  }, [allPinTypes]);

  const selectedExamBody = form.watch('examBody');
  const quantity = form.watch('quantity');

  const availablePinTypes = useMemo(() => {
      if (!selectedExamBody) return [];
      return allPinTypes.filter(p => p.examBody === selectedExamBody);
  }, [allPinTypes, selectedExamBody]);
  
  const selectedVariationId = form.watch('variationId');

  const selectedPin = useMemo(() => 
      availablePinTypes.find(p => p.id === selectedVariationId)
  , [availablePinTypes, selectedVariationId]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(id);
      setTimeout(() => setIsCopied(null), 2000);
    });
  };
  
  const totalCost = selectedPin && userData ? (selectedPin.price + (selectedPin.fees?.[userData.role || 'Customer'] || 0)) * quantity : 0;

  async function onSubmit(values: FormData) {
    if (!user || !userData || !educationService) {
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
    setGeneratedPins(null);
    try {
      const purchaseInputs = { 
        quantity: values.quantity,
      };
      
      const result = await purchaseService(user.uid, educationService.id, values.variationId, purchaseInputs, user.email!);

      if (typeof result !== 'string' && result.pins && Array.isArray(result.pins) && result.pins.length > 0) {
        setGeneratedPins(result.pins);
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

  if (!educationService) {
      return (
        <div className="mx-auto max-w-2xl space-y-8">
             <div>
                <h1 className="text-3xl font-bold">Education E-Pins</h1>
            </div>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Service Unavailable</AlertTitle>
              <AlertDescription>
                The Education E-Pin service is inactive or could not be found.
              </AlertDescription>
            </Alert>
        </div>
      );
  }


  return (
    <>
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Education E-Pin</h1>
          <p className="text-muted-foreground">Purchase pins for WAEC, NECO, JAMB and more.</p>
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
                  name="examBody"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Exam Body</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                            field.onChange(value);
                            form.resetField('variationId');
                        }}
                        value={field.value} 
                        disabled={examBodies.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={examBodies.length === 0 ? `No exam bodies available` : "Select an exam body"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {examBodies.map(body => (
                            <SelectItem key={body} value={body}>
                                {body}
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
                  name="variationId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pin Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={availablePinTypes.length === 0}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={!selectedExamBody ? "Select exam body first" : "Select a pin type"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availablePinTypes.map(p => {
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

      <AlertDialog open={!!generatedPins} onOpenChange={() => setGeneratedPins(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Your Pin Has Been Generated!</AlertDialogTitle>
            <AlertDialogDescription>
              Here are the details of your purchase. Please copy and save them securely.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-4 py-4">
                {generatedPins?.map((pinData, index) => (
                <div key={index} className="space-y-3 rounded-lg border p-4">
                    <h3 className="font-semibold">Pin #{index + 1}</h3>
                    <div className="space-y-1">
                        <Label htmlFor={`pin-${index}`}>PIN</Label>
                        <div className="flex items-center gap-2">
                            <p id={`pin-${index}`} className="w-full rounded-md border bg-muted px-3 py-2 font-mono text-base font-semibold">
                            {pinData.pin}
                            </p>
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(pinData.pin, `pin-${index}`)}>
                            {isCopied === `pin-${index}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={`serial-${index}`}>Serial Number</Label>
                        <div className="flex items-center gap-2">
                            <p id={`serial-${index}`} className="w-full rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                            {pinData.serial}
                            </p>
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(pinData.serial, `serial-${index}`)}>
                            {isCopied === `serial-${index}` ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </div>
                ))}
            </div>
           </ScrollArea>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setGeneratedPins(null)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
