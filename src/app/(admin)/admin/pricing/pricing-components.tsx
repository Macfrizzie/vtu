
'use client';

import { useEffect, useState, useMemo } from 'react';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Trash2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
    addDataPlan, getDataPlans, deleteDataPlan, updateDataPlanStatus, updateDataPlansStatusByType,
    getCablePlans, addCablePlan, deleteCablePlan, updateCablePlanStatus,
    addDisco, getDiscos, deleteDisco, updateDiscoStatus,
    addRechargeCardDenomination, getRechargeCardDenominations, deleteRechargeCardDenomination, updateRechargeCardDenominationStatus,
    addEducationPinType, getEducationPinTypes, deleteEducationPinType, updateEducationPinTypeStatus
} from '@/lib/firebase/firestore';
import type { DataPlan, CablePlan, Disco, RechargeCardDenomination, EducationPinType } from '@/lib/types';
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
import { BulkUploadDialog } from './bulk-upload-dialog';

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

const examBodies = ['WAEC', 'NECO', 'JAMB'];

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
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

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
        
        // Optimistic UI update
        setDataPlans(prevPlans => 
            prevPlans.map(p => p.id === plan.id ? { ...p, status: newStatus } : p)
        );

        try {
            await updateDataPlanStatus(plan.id, newStatus);
            toast({ title: 'Status Updated', description: `${plan.name} is now ${newStatus}.` });
        } catch (error) {
            // Revert UI on error
            setDataPlans(prevPlans => 
                prevPlans.map(p => p.id === plan.id ? { ...p, status: plan.status } : p)
            );
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update plan status.' });
        }
    };

    const handlePlanTypeStatusToggle = async (networkName: string, planType: string, newStatus: 'Active' | 'Inactive') => {
        const originalStatuses = new Map(dataPlans.map(p => [p.id, p.status]));

        // Optimistic UI update
        setDataPlans(prevPlans => 
            prevPlans.map(p => (p.networkName === networkName && p.planType === planType) ? { ...p, status: newStatus } : p)
        );
        
        try {
            await updateDataPlansStatusByType(networkName, planType, newStatus);
            toast({ title: 'Status Updated', description: `All ${planType} plans for ${networkName} are now ${newStatus}.` });
        } catch (error) {
            // Revert UI on error
             setDataPlans(prevPlans => 
                prevPlans.map(p => ({ ...p, status: originalStatuses.get(p.id) || p.status }))
            );
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update plan statuses.' });
        }
    }

    const validities = ['1 day', '2 days', '3 days', '7 days', '14 days', '30 days', '30 days/1 month', '60 days', '1 year'];

    return (
        <>
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Data Plan Base Prices</CardTitle>
                        <CardDescription>Manually input data plans and their prices, or use the bulk upload feature.</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setIsBulkUploadOpen(true)}>
                        <Upload className="mr-2 h-4 w-4" />
                        Bulk Upload
                    </Button>
                </div>
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
                                            const isGroupActive = plansInGroup.some(p => p.status === 'Active');
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
                                                                            checked={plan.status === 'Active'}
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
        <BulkUploadDialog 
            isOpen={isBulkUploadOpen}
            onClose={() => setIsBulkUploadOpen(false)}
            onSuccess={fetchData}
        />
        </>
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
    
    const handleStatusToggle = async (plan: CablePlan) => {
        const newStatus = plan.status === 'Active' ? 'Inactive' : 'Active';

        setCablePlans(prevPlans => 
            prevPlans.map(p => p.id === plan.id ? { ...p, status: newStatus } : p)
        );

        try {
            await updateCablePlanStatus(plan.id, newStatus);
            toast({ title: 'Status Updated', description: `${plan.planName} is now ${newStatus}.` });
        } catch (error) {
            setCablePlans(prevPlans => 
                prevPlans.map(p => p.id === plan.id ? { ...p, status: plan.status } : p)
            );
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update plan status.' });
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
                    <TableHeader><TableRow><TableHead>Provider</TableHead><TableHead>Plan ID</TableHead><TableHead>Plan Name</TableHead><TableHead>Base Price</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Active</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {cablePlans.map((plan) => (
                            <TableRow key={plan.id} className={cn(plan.status === 'Inactive' && 'opacity-50')}>
                                <TableCell>{plan.providerName}</TableCell>
                                <TableCell>{plan.planId}</TableCell>
                                <TableCell>{plan.planName}</TableCell>
                                <TableCell>₦{plan.basePrice}</TableCell>
                                <TableCell>
                                    <Badge variant={plan.status === 'Active' ? 'default' : 'secondary'} className={cn(plan.status === 'Active' ? 'bg-green-500' : 'bg-gray-500')}>
                                        {plan.status || 'Active'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Switch
                                        checked={plan.status === 'Active'}
                                        onCheckedChange={() => handleStatusToggle(plan)}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this cable plan.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(plan.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                        {cablePlans.length === 0 && <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No cable plans added yet.</TableCell></TableRow>}
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

    const handleStatusToggle = async (disco: Disco) => {
        const newStatus = disco.status === 'Active' ? 'Inactive' : 'Active';
        
        setDiscos(prevDiscos => 
            prevDiscos.map(d => d.id === disco.id ? { ...d, status: newStatus } : d)
        );

        try {
            await updateDiscoStatus(disco.id, newStatus);
            toast({ title: 'Status Updated', description: `${disco.discoName} is now ${newStatus}.` });
        } catch (error) {
            setDiscos(prevDiscos => 
                prevDiscos.map(d => d.id === disco.id ? { ...d, status: disco.status } : d)
            );
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update disco status.' });
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
                    <TableHeader><TableRow><TableHead>Disco ID</TableHead><TableHead>Disco Name</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Active</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {discos.map((disco) => (
                            <TableRow key={disco.id} className={cn(disco.status === 'Inactive' && 'opacity-50')}>
                                <TableCell>{disco.discoId}</TableCell>
                                <TableCell>{disco.discoName}</TableCell>
                                <TableCell>
                                    <Badge variant={disco.status === 'Active' ? 'default' : 'secondary'} className={cn(disco.status === 'Active' ? 'bg-green-500' : 'bg-gray-500')}>
                                        {disco.status || 'Active'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Switch
                                        checked={disco.status === 'Active'}
                                        onCheckedChange={() => handleStatusToggle(disco)}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this disco.</AlertDialogDescription></AlertDialogHeader>
                                            <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(disco.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                        {discos.length === 0 && <TableRow><TableCell colSpan={5} className="text-center h-24 text-muted-foreground">No discos added yet.</TableCell></TableRow>}
                    </TableBody>
                </Table>
                )}
            </CardContent>
        </Card>
    );
}

// --- Recharge Card Pricing Tab ---
const rechargeCardSchema = z.object({
    networkName: z.string().min(1, "Network is required"),
    denominationId: z.string().min(1, "Denomination ID is required"),
    name: z.string().min(1, "Name is required"),
    price: z.coerce.number().min(0, "Price must be a positive number"),
    fee: z.coerce.number().min(0, "Fee must be a positive number").optional(),
});

export function RechargeCardPricingTab() {
    const { toast } = useToast();
    const [denominations, setDenominations] = useState<RechargeCardDenomination[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    const form = useForm<z.infer<typeof rechargeCardSchema>>({
        resolver: zodResolver(rechargeCardSchema),
        defaultValues: { networkName: 'MTN', denominationId: '', name: '', price: 100, fee: 0 },
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getRechargeCardDenominations();
            setDenominations(data);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch denominations.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const onSubmit = async (values: z.infer<typeof rechargeCardSchema>) => {
        setIsSubmitting(true);
        try {
            await addRechargeCardDenomination({ 
                ...values,
                fees: { Customer: values.fee || 0, Vendor: values.fee || 0, Admin: 0 }
            });
            toast({ title: "Denomination Added" });
            await fetchData();
            form.reset();
        } catch(error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to add denomination.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteRechargeCardDenomination(id);
            toast({ title: 'Success', description: 'Denomination deleted.' });
            await fetchData();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete denomination.' });
        }
    };

    const handleStatusToggle = async (item: RechargeCardDenomination) => {
        const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
        
        setDenominations(prev => prev.map(p => p.id === item.id ? { ...p, status: newStatus } : p));
        
        try {
            await updateRechargeCardDenominationStatus(item.id, newStatus);
            toast({ title: 'Status Updated' });
        } catch (error) {
            setDenominations(prev => prev.map(p => p.id === item.id ? { ...p, status: item.status } : p));
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
        }
    };
    
    return (
        <Card>
            <CardHeader><CardTitle>Recharge Card Denominations</CardTitle><CardDescription>Manage denominations for recharge card printing.</CardDescription></CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end p-4 border rounded-lg">
                        <FormField control={form.control} name="networkName" render={({ field }) => (
                            <FormItem><FormLabel>Network</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{networks.map(n => <SelectItem key={n.id} value={n.name}>{n.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="denominationId" render={({ field }) => (
                            <FormItem><FormLabel>Denomination ID</FormLabel><FormControl><Input placeholder="e.g., mtn-100" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., ₦100 Pin" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="price" render={({ field }) => (
                            <FormItem><FormLabel>Price (₦)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <FormField control={form.control} name="fee" render={({ field }) => (
                            <FormItem><FormLabel>Fee (₦)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="lg:col-span-5"><Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add Denomination</Button></div>
                    </form>
                </Form>
                {loading ? <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                 <Table>
                    <TableHeader><TableRow><TableHead>Network</TableHead><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Fee</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Active</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {denominations.map((item) => (
                            <TableRow key={item.id} className={cn(item.status === 'Inactive' && 'opacity-50')}>
                                <TableCell>{item.networkName}</TableCell>
                                <TableCell>{item.denominationId}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>₦{item.price}</TableCell>
                                <TableCell>₦{item.fees?.Customer || 0}</TableCell>
                                <TableCell><Badge variant={item.status === 'Active' ? 'default' : 'secondary'} className={cn(item.status === 'Active' ? 'bg-green-500' : 'bg-gray-500')}>{item.status || 'Active'}</Badge></TableCell>
                                <TableCell className="text-center"><Switch checked={item.status === 'Active'} onCheckedChange={() => handleStatusToggle(item)}/></TableCell>
                                <TableCell className="text-right"><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this denomination.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                )}
            </CardContent>
        </Card>
    );
}


// --- Education Pricing Tab ---
const educationPinSchema = z.object({
    examBody: z.string().min(1, "Exam Body is required"),
    pinTypeId: z.string().min(1, "Pin Type ID is required"),
    name: z.string().min(1, "Name is required"),
    price: z.coerce.number().min(0, "Price must be a positive number"),
    fee: z.coerce.number().min(0, "Fee must be a positive number").optional(),
});

export function EducationPricingTab() {
    const { toast } = useToast();
    const [pinTypes, setPinTypes] = useState<EducationPinType[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    const form = useForm<z.infer<typeof educationPinSchema>>({
        resolver: zodResolver(educationPinSchema),
        defaultValues: { examBody: 'WAEC', pinTypeId: '', name: '', price: 2000, fee: 0 },
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await getEducationPinTypes();
            setPinTypes(data);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch E-Pins.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const onSubmit = async (values: z.infer<typeof educationPinSchema>) => {
        setIsSubmitting(true);
        try {
            await addEducationPinType({ 
                ...values,
                fees: { Customer: values.fee || 0, Vendor: values.fee || 0, Admin: 0 }
            });
            toast({ title: "E-Pin Added" });
            await fetchData();
            form.reset();
        } catch(error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to add E-Pin.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    const handleDelete = async (id: string) => {
        try {
            await deleteEducationPinType(id);
            toast({ title: 'Success', description: 'E-Pin deleted.' });
            await fetchData();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to delete E-Pin.' });
        }
    };

    const handleStatusToggle = async (item: EducationPinType) => {
        const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';

        setPinTypes(prev => prev.map(p => p.id === item.id ? { ...p, status: newStatus } : p));
        
        try {
            await updateEducationPinTypeStatus(item.id, newStatus);
            toast({ title: 'Status Updated' });
        } catch (error) {
            setPinTypes(prev => prev.map(p => p.id === item.id ? { ...p, status: item.status } : p));
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to update status.' });
        }
    };
    
    return (
        <Card>
            <CardHeader><CardTitle>Education E-Pin Prices</CardTitle><CardDescription>Manage prices for WAEC, NECO, and JAMB result checker pins.</CardDescription></CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end p-4 border rounded-lg">
                        <FormField control={form.control} name="examBody" render={({ field }) => (
                            <FormItem><FormLabel>Exam Body</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{examBodies.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="pinTypeId" render={({ field }) => (
                            <FormItem><FormLabel>Pin Type ID</FormLabel><FormControl><Input placeholder="e.g., waec-result" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., WAEC Result Pin" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="price" render={({ field }) => (
                            <FormItem><FormLabel>Price (₦)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="fee" render={({ field }) => (
                            <FormItem><FormLabel>Fee (₦)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="lg:col-span-5"><Button type="submit" disabled={isSubmitting} className="w-full">{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />} Add E-Pin</Button></div>
                    </form>
                </Form>
                {loading ? <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                 <Table>
                    <TableHeader><TableRow><TableHead>Exam Body</TableHead><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Fee</TableHead><TableHead>Status</TableHead><TableHead className="text-center">Active</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                    <TableBody>
                        {pinTypes.map((item) => (
                            <TableRow key={item.id} className={cn(item.status === 'Inactive' && 'opacity-50')}>
                                <TableCell>{item.examBody}</TableCell>
                                <TableCell>{item.pinTypeId}</TableCell>
                                <TableCell>{item.name}</TableCell>
                                <TableCell>₦{item.price}</TableCell>
                                <TableCell>₦{item.fees?.Customer || 0}</TableCell>
                                <TableCell><Badge variant={item.status === 'Active' ? 'default' : 'secondary'} className={cn(item.status === 'Active' ? 'bg-green-500' : 'bg-gray-500')}>{item.status || 'Active'}</Badge></TableCell>
                                <TableCell className="text-center"><Switch checked={item.status === 'Active'} onCheckedChange={() => handleStatusToggle(item)}/></TableCell>
                                <TableCell className="text-right"><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this E-Pin type.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                )}
            </CardContent>
        </Card>
    );
}

    