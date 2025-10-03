
'use client';

import { useEffect, useState, useMemo } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addDataPlan, getDataPlans, deleteDataPlan, getCablePlans, addCablePlan, deleteCablePlan, addDisco, getDiscos, deleteDisco, updateDataPlanStatus, updateDataPlansStatusByType } from '@/lib/firebase/firestore';
import type { DataPlan, CablePlan, Disco } from '@/lib/types';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

// --- Fixed Network Data ---
const networks = [
    { id: 'MTN', name: 'MTN' },
    { id: 'GLO', name: 'GLO' },
    { id: '9MOBILE', name: '9MOBILE' },
    { id: 'AIRTEL', name: 'AIRTEL' },
];

const cableProviders = [
    { id: '1', name: 'GOTV' },
    { id: '2', name: 'DSTV' },
    { id: '3', name: 'Startimes' },
];

// --- Data Pricing Tab ---
const dataPlanSchema = z.object({
    planId: z.string().min(1, "Data Plan ID is required"),
    networkName: z.string().min(1, "Network is required"),
    planType: z.string().min(1, "Plan type is required"),
    name: z.string().min(1, "Plan Name (e.g. 500MB) is required"),
    price: z.coerce.number().min(0, "Amount must be a positive number"),
    fee: z.coerce.number().min(0, "Fee must be a positive number").optional(),
    validity: z.string().min(1, "Validity is required"),
});

export function DataPricingTab() {
    const { toast } = useToast();
    const [dataPlans, setDataPlans] = useState<DataPlan[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    const form = useForm<z.infer<typeof dataPlanSchema>>({
        resolver: zodResolver(dataPlanSchema),
        defaultValues: {
            planId: '',
            networkName: 'MTN',
            planType: 'SME',
            name: '',
            price: 0,
            fee: 0,
            validity: '30 days/1 month',
        }
    });
    
    const groupedPlans = useMemo(() => {
        return dataPlans.reduce((acc, plan) => {
            const { networkName, planType } = plan;
            if (!acc[networkName]) {
                acc[networkName] = {};
            }
            if (!acc[networkName][planType]) {
                acc[networkName][planType] = [];
            }
            acc[networkName][planType].push(plan);
            return acc;
        }, {} as Record<string, Record<string, DataPlan[]>>);
    }, [dataPlans]);


    const fetchData = async () => {
        setLoading(true);
        try {
            const plans = await getDataPlans();
            setDataPlans(plans);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch data plans.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);


    const onSubmit = async (values: z.infer<typeof dataPlanSchema>) => {
        setIsSubmitting(true);
        try {
            const planData: Omit<DataPlan, 'id'> = {
                planId: values.planId,
                networkName: values.networkName,
                planType: values.planType,
                name: values.name,
                price: values.price,
                validity: values.validity,
                fees: {
                    Customer: values.fee || 0,
                    Vendor: values.fee || 0,
                    Admin: 0, 
                },
                status: 'Active',
            };
            await addDataPlan(planData);
            toast({ title: "Data Plan Added", description: `The plan has been added successfully.` });
            await fetchData();
            form.reset();
        } catch(error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to add data plan.' });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleDelete = async (planId: string) => {
        try {
            await deleteDataPlan(planId);
            toast({ title: 'Success', description: 'Data plan deleted.' });
            await fetchData();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete data plan.' });
        }
    };
    
    const handleStatusToggle = async (plan: DataPlan) => {
        const newStatus = plan.status === 'Active' ? 'Inactive' : 'Active';
        try {
            await updateDataPlanStatus(plan.id, newStatus);
            setDataPlans(prevPlans => 
                prevPlans.map(p => p.id === plan.id ? { ...p, status: newStatus } : p)
            );
            toast({ title: 'Status Updated', description: `${plan.name} is now ${newStatus}.` });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update plan status.' });
        }
    };

    const handlePlanTypeStatusToggle = async (networkName: string, planType: string, newStatus: 'Active' | 'Inactive') => {
        try {
            await updateDataPlansStatusByType(networkName, planType, newStatus);
            setDataPlans(prevPlans => 
                prevPlans.map(p => (p.networkName === networkName && p.planType === planType) ? { ...p, status: newStatus } : p)
            );
            toast({ title: 'Status Updated', description: `All ${planType} plans for ${networkName} are now ${newStatus}.` });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update plan statuses.' });
        }
    }

    const validities = ['1 day', '2 days', '3 days', '7 days', '14 days', '30 days', '30 days/1 month', '60 days', '1 year'];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Data Plan Base Prices</CardTitle>
                <CardDescription>Manually input data plans and their prices. This is where you define the products available to users.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end p-4 border rounded-lg">
                        <FormField control={form.control} name="planId" render={({ field }) => (
                            <FormItem><FormLabel>Data Plan ID (Provider)</FormLabel><FormControl><Input placeholder="e.g., 101" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="networkName" render={({ field }) => (
                            <FormItem><FormLabel>Network</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{networks.map(n => <SelectItem key={n.id} value={n.name}>{n.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="planType" render={({ field }) => (
                            <FormItem><FormLabel>Plan Type</FormLabel><FormControl><Input placeholder="SME, Gifting, etc." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Plan Name</FormLabel><FormControl><Input placeholder="500MB, 1GB, etc." {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="price" render={({ field }) => (
                            <FormItem><FormLabel>Base Price (₦)</FormLabel><FormControl><Input type="number" placeholder="e.g., 300" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="fee" render={({ field }) => (
                            <FormItem><FormLabel>Convenience Fee (₦)</FormLabel><FormControl><Input type="number" placeholder="e.g., 10" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="validity" render={({ field }) => (
                            <FormItem><FormLabel>Validity</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{validities.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <div className="lg:col-span-3">
                             <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add Data Plan</Button>
                        </div>
                    </form>
                </Form>
                 {loading ? (<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>) : (
                    <Accordion type="multiple" className="w-full">
                        {Object.keys(groupedPlans).sort().map(networkName => (
                            <AccordionItem value={networkName} key={networkName}>
                                <AccordionTrigger className="text-lg font-semibold">{networkName}</AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-6 pl-2">
                                        {Object.keys(groupedPlans[networkName]).sort().map(planType => {
                                            const plansInGroup = groupedPlans[networkName][planType];
                                            const isGroupActive = plansInGroup.some(p => p.status === 'Active' || p.status === undefined);
                                            return (
                                            <div key={planType}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium text-md text-muted-foreground">{planType} Plans</h4>
                                                    <div className="flex items-center gap-2">
                                                        <Label htmlFor={`switch-${networkName}-${planType}`} className="text-xs text-muted-foreground">
                                                            {isGroupActive ? 'Active' : 'Inactive'}
                                                        </Label>
                                                         <Switch
                                                            id={`switch-${networkName}-${planType}`}
                                                            checked={isGroupActive}
                                                            onCheckedChange={(checked) => handlePlanTypeStatusToggle(networkName, planType, checked ? 'Active' : 'Inactive')}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="border rounded-md">
                                                    <Table>
                                                        <TableHeader><TableRow><TableHead>Plan ID</TableHead><TableHead>Name</TableHead><TableHead>Base Price</TableHead><TableHead>Fee</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Active</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                                                        <TableBody>
                                                            {plansInGroup.map(plan => (
                                                                <TableRow key={plan.id} className={cn(plan.status === 'Inactive' && 'opacity-50')}>
                                                                    <TableCell>{plan.planId}</TableCell>
                                                                    <TableCell>{plan.name}</TableCell>
                                                                    <TableCell>₦{plan.price.toLocaleString()}</TableCell>
                                                                    <TableCell>₦{(plan.fees?.Customer || 0).toLocaleString()}</TableCell>
                                                                    <TableCell>
                                                                        <Badge variant={plan.status === 'Active' ? 'default' : 'secondary'} className={cn(plan.status === 'Active' ? 'bg-green-500' : 'bg-gray-500')}>
                                                                            {plan.status || 'Active'}
                                                                        </Badge>
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        <Switch
                                                                            checked={plan.status === 'Active' || plan.status === undefined}
                                                                            onCheckedChange={() => handleStatusToggle(plan)}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell className="text-right">
                                                                        <AlertDialog>
                                                                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                                                            <AlertDialogContent>
                                                                                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this data plan.</AlertDialogDescription></AlertDialogHeader>
                                                                                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(plan.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                                            </AlertDialogContent>
                                                                        </AlertDialog>
                                                                    </TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                )}
                 {dataPlans.length === 0 && !loading && (
                    <div className="text-center h-24 text-muted-foreground flex items-center justify-center">No data plans added yet.</div>
                )}
            </CardContent>
        </Card>
    );
}


// --- Cable Pricing Tab ---
const cablePlanSchema = z.object({
    providerId: z.string().min(1, "Provider is required"),
    planId: z.string().min(1, "Cable Plan ID is required"),
    planName: z.string().min(3, "Plan name is required"),
    basePrice: z.coerce.number().min(0, "Amount must be a positive number"),
});

export function CablePricingTab() {
    const { toast } = useToast();
    const [cablePlans, setCablePlans] = useState<CablePlan[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    const form = useForm<z.infer<typeof cablePlanSchema>>({
        resolver: zodResolver(cablePlanSchema),
        defaultValues: { providerId: '1', planId: '', planName: '', basePrice: 0 }
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const plans = await getCablePlans();
            setCablePlans(plans);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch cable plans.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const onSubmit = async (values: z.infer<typeof cablePlanSchema>) => {
        setIsSubmitting(true);
        try {
            const provider = cableProviders.find(p => p.id === values.providerId);
            if (!provider) throw new Error("Cable provider not found");

            await addCablePlan({ ...values, providerName: provider.name });
            toast({ title: "Cable Plan Added" });
            await fetchData();
            form.reset();
        } catch(error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to add cable plan.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleDelete = async (planId: string) => {
        try {
            await deleteCablePlan(planId);
            toast({ title: 'Success', description: 'Cable plan deleted.' });
            await fetchData();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete cable plan.' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cable TV Base Prices</CardTitle>
                <CardDescription>Manually input cable TV packages and their base prices.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end p-4 border rounded-lg">
                        <FormField control={form.control} name="providerId" render={({ field }) => (
                            <FormItem><FormLabel>Provider</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{cableProviders.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="planId" render={({ field }) => (
                            <FormItem><FormLabel>Plan ID</FormLabel><FormControl><Input placeholder="e.g., dstv-padi" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="planName" render={({ field }) => (
                            <FormItem><FormLabel>Plan Name</FormLabel><FormControl><Input placeholder="e.g., Padi" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="basePrice" render={({ field }) => (
                            <FormItem><FormLabel>Base Price (₦)</FormLabel><FormControl><Input type="number" placeholder="e.g., 2150" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="lg:col-span-4">
                            <Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add Cable Plan</Button>
                        </div>
                    </form>
                </Form>
                {loading ? (<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>) : (
                 <Table>
                    <TableHeader><TableRow><TableHead>Provider</TableHead><TableHead>Plan ID</TableHead><TableHead>Plan Name</TableHead><TableHead>Base Price</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {cablePlans.map((plan) => (
                            <TableRow key={plan.id}><TableCell>{plan.providerName}</TableCell><TableCell>{plan.planId}</TableCell><TableCell>{plan.planName}</TableCell><TableCell>₦{plan.basePrice}</TableCell><TableCell className="text-right"><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this cable plan.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(plan.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>
                        ))}
                        {cablePlans.length === 0 && <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No cable plans added yet.</TableCell></TableRow>}
                    </TableBody>
                </Table>
                )}
            </CardContent>
        </Card>
    );
}

// --- Electricity Pricing Tab ---
const discoSchema = z.object({
    discoId: z.string().min(1, "Disco ID is required"),
    discoName: z.string().min(3, "Disco name is required"),
});

export function ElectricityPricingTab() {
    const { toast } = useToast();
    const [discos, setDiscos] = useState<Disco[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    const form = useForm<z.infer<typeof discoSchema>>({
        resolver: zodResolver(discoSchema),
        defaultValues: { discoId: '', discoName: '' }
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const allDiscos = await getDiscos();
            setDiscos(allDiscos);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch discos.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const onSubmit = async (values: z.infer<typeof discoSchema>) => {
        setIsSubmitting(true);
        try {
            await addDisco(values);
            toast({ title: "Disco Added" });
            await fetchData();
            form.reset();
        } catch(error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to add disco.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteDisco(id);
            toast({ title: 'Success', description: 'Disco deleted.' });
            await fetchData();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete disco.' });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Electricity Distributors (Discos)</CardTitle>
                <CardDescription>Manually input electricity discos. Convenience fees are set globally from the Services page.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 items-end p-4 border rounded-lg">
                        <FormField control={form.control} name="discoId" render={({ field }) => (
                            <FormItem><FormLabel>Disco ID</FormLabel><FormControl><Input placeholder="e.g., ikeja-electric" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="discoName" render={({ field }) => (
                            <FormItem><FormLabel>Disco Name</FormLabel><FormControl><Input placeholder="e.g., Ikeja Electric" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add Disco</Button>
                    </form>
                </Form>
                {loading ? (<div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>) : (
                 <Table>
                    <TableHeader><TableRow><TableHead>Disco ID</TableHead><TableHead>Disco Name</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {discos.map((disco) => (
                            <TableRow key={disco.id}><TableCell>{disco.discoId}</TableCell><TableCell>{disco.discoName}</TableCell><TableCell className="text-right"><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this disco.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(disco.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>
                        ))}
                        {discos.length === 0 && <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No discos added yet.</TableCell></TableRow>}
                    </TableBody>
                </Table>
                )}
            </CardContent>
        </Card>
    );
}


    

    