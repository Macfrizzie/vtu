
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { bulkAddDataPlans } from '@/lib/firebase/firestore';
import type { DataPlan } from '@/lib/types';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface BulkUploadDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type ParsedPlan = Omit<DataPlan, 'id' | 'status'> & { fees: { Customer: number } };
type ValidationResult = {
    plan: ParsedPlan;
    errors: string[];
};

export function BulkUploadDialog({ isOpen, onClose, onSuccess }: BulkUploadDialogProps) {
    const { toast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [parsedData, setParsedData] = useState<ValidationResult[]>([]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            handleParse(selectedFile);
        }
    };

    const handleParse = (fileToParse: File) => {
        setIsParsing(true);
        setParsedData([]);

        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target?.result as string;
            const lines = content.split('\n').filter(line => line.trim() !== '');
            const headers = lines.shift()?.trim().split(',').map(h => h.trim()) || [];
            
            const expectedHeaders = ['planId', 'networkName', 'planType', 'name', 'price', 'fee', 'validity'];
            if (!expectedHeaders.every(h => headers.includes(h))) {
                 toast({ variant: 'destructive', title: 'Invalid CSV Headers', description: `Expected headers: ${expectedHeaders.join(', ')}` });
                 setIsParsing(false);
                 return;
            }

            const results: ValidationResult[] = lines.map((line, index) => {
                const values = line.trim().split(',');
                const rowData: any = headers.reduce((obj, header, i) => {
                    obj[header] = values[i];
                    return obj;
                }, {} as any);

                const plan: ParsedPlan = {
                    planId: rowData.planId || '',
                    networkName: rowData.networkName || '',
                    planType: rowData.planType || '',
                    name: rowData.name || '',
                    price: parseFloat(rowData.price),
                    validity: rowData.validity || '',
                    fees: {
                        Customer: parseFloat(rowData.fee) || 0,
                        Vendor: parseFloat(rowData.fee) || 0,
                        Admin: 0,
                    },
                };
                
                const errors: string[] = [];
                if (!plan.planId) errors.push('planId is missing.');
                if (!plan.networkName) errors.push('networkName is missing.');
                if (!plan.planType) errors.push('planType is missing.');
                if (!plan.name) errors.push('name is missing.');
                if (isNaN(plan.price)) errors.push('price is not a valid number.');
                if (!plan.validity) errors.push('validity is missing.');

                return { plan, errors };
            });

            setParsedData(results);
            setIsParsing(false);
        };

        reader.readAsText(fileToParse);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const validPlans = parsedData.filter(item => item.errors.length === 0).map(item => item.plan);

        if (validPlans.length === 0) {
            toast({ variant: 'destructive', title: 'No Valid Plans', description: 'There are no valid plans to upload.' });
            setIsSubmitting(false);
            return;
        }

        try {
            await bulkAddDataPlans(validPlans);
            toast({ title: 'Upload Successful', description: `${validPlans.length} data plans have been added.` });
            onSuccess();
            handleClose();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not add the data plans.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleClose = () => {
        setFile(null);
        setParsedData([]);
        onClose();
    }

    const totalRows = parsedData.length;
    const validRows = parsedData.filter(item => item.errors.length === 0).length;
    const invalidRows = totalRows - validRows;


    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Bulk Upload Data Plans</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to add multiple data plans at once. Only valid rows will be imported.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    <div className="space-y-4">
                        <Alert>
                            <AlertTitle>CSV Format Instructions</AlertTitle>
                            <AlertDescription>
                                <p className="mb-2">Your CSV file must contain the following headers in the first row:</p>
                                <code className="text-xs p-2 bg-muted rounded-md block">planId,networkName,planType,name,price,fee,validity</code>
                                <p className="mt-2 text-xs text-muted-foreground">e.g., <code className="text-xs">101,MTN,SME,500MB,150,10,30 days</code></p>
                            </AlertDescription>
                        </Alert>
                         <Input
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            disabled={isParsing || isSubmitting}
                        />

                         {parsedData.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold">Validation Summary</h3>
                                <div className="flex items-center gap-4 text-sm">
                                    <p>Total Rows: {totalRows}</p>
                                    <p className="text-green-600 flex items-center gap-1"><CheckCircle className="h-4 w-4" /> Valid: {validRows}</p>
                                    <p className="text-red-600 flex items-center gap-1"><XCircle className="h-4 w-4" /> Invalid: {invalidRows}</p>
                                </div>
                            </div>
                        )}
                    </div>
                   
                    <div className="space-y-2">
                         <h3 className="font-semibold">Parsed Data Preview</h3>
                        <ScrollArea className="h-64 w-full rounded-md border">
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Network</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isParsing ? (
                                        <TableRow><TableCell colSpan={4} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                    ) : parsedData.length > 0 ? (
                                        parsedData.map((item, index) => (
                                            <TableRow key={index} className={cn(item.errors.length > 0 && 'bg-red-500/10')}>
                                                <TableCell>
                                                    {item.errors.length > 0 ? 
                                                        <XCircle className="h-5 w-5 text-red-500" title={item.errors.join(' ')} /> : 
                                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                                    }
                                                </TableCell>
                                                <TableCell>{item.plan.networkName}</TableCell>
                                                <TableCell>{item.plan.name}</TableCell>
                                                <TableCell>₦{item.plan.price}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Upload a file to see a preview.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </ScrollArea>
                    </div>

                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || isParsing || validRows === 0}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Upload {validRows > 0 ? validRows : ''} Valid Plan(s)
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

    