
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
import { useState, useMemo } from 'react';
import { Loader2, Copy, Check } from 'lucide-react';
import { purchaseService } from '@/lib/firebase/firestore';
import { Label } from '@/components/ui/label';

const educationPins = {
  waec: [{ id: 'waec-result', label: 'Result Checker Pin', price: 4000 }],
  neco: [{ id: 'neco-result', label: 'Result Checker Token', price: 1500 }],
  jamb: [
    { id: 'jamb-utme', label: 'UTME Registration Pin', price: 7500 },
    { id: 'jamb-de', label: 'Direct Entry Pin', price: 7500 },
  ],
};

const formSchema = z.object({
  provider: z.enum(['waec', 'neco', 'jamb']),
  pinType: z.string().min(1, 'Please select a pin type.'),
});

type FormData = z.infer<typeof formSchema>;

export default function EducationPinPage() {
  const { user, userData, loading, forceRefetch } = useUser();
  const { toast } = useToast();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<{ pin: string; serial: string } | null>(null);
  const [isCopied, setIsCopied] = useState<'pin' | 'serial' | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: 'waec',
      pinType: '',
    },
  });

  const selectedProvider = form.watch('provider');
  const selectedPinTypeId = form.watch('pinType');
  
  const availablePins = useMemo(() => educationPins[selectedProvider] || [], [selectedProvider]);
  
  const selectedPin = useMemo(() => 
      availablePins.find(p => p.id === selectedPinTypeId)
  , [availablePins, selectedPinTypeId]);

  const copyToClipboard = (text: string, type: 'pin' | 'serial') => {
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(type);
      setTimeout(() => setIsCopied(null), 2000);
    });
  };

  async function onSubmit(values: FormData) {
    if (!user || !userData) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to make a purchase.' });
      return;
    }
    
    if (!selectedPin) {
        toast({ variant: 'destructive', title: 'Invalid Selection', description: 'Please select a valid pin type.' });
        return;
    }

    if (userData.walletBalance < selectedPin.price) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Funds',
        description: `Your balance is ₦${userData.walletBalance.toLocaleString()}, but the purchase requires at least ₦${selectedPin.price.toLocaleString()}.`,
      });
      return;
    }

    setIsPurchasing(true);
    try {
      // Simulate PIN generation
      await new Promise(res => setTimeout(res, 1500));
      const newPin = Math.random().toString(36).substring(2, 12).toUpperCase();
      const newSerial = 'VTU' + Date.now();

      const description = `${selectedPin.label} for ${values.provider.toUpperCase()}`;
      await purchaseService(user.uid, selectedPin.price, description, user.email!, values.provider);
      forceRefetch();

      setGeneratedPin({ pin: newPin, serial: newSerial });

      toast({
        title: 'Purchase Successful!',
        description: `Your ${selectedPin.label} has been generated.`,
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
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Examination Body</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.resetField('pinType');
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an exam body" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="waec">WAEC</SelectItem>
                          <SelectItem value="neco">NECO</SelectItem>
                          <SelectItem value="jamb">JAMB</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pinType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pin Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={!selectedProvider}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a pin type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availablePins.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.label} (₦{p.price.toLocaleString()})
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
                   <Button type="submit" className="w-full" size="lg" disabled={isPurchasing || !selectedPin}>
                      {isPurchasing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {selectedPin ? `Buy Pin (₦${selectedPin.price.toLocaleString()})` : 'Select Pin Type'}
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
