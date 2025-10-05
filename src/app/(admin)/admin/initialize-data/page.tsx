
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Database, AlertCircle } from 'lucide-react';
import { initializeServices } from '@/lib/firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function InitializeDataPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState<string[]>([]);

    const handleInitialize = async () => {
        setIsLoading(true);
        setReport([]);
        try {
            const resultReport = await initializeServices();
            setReport(resultReport);
            toast({
                title: "Initialization Process Complete",
                description: "Check the report for details.",
            });
        } catch (error) {
            console.error("Failed to initialize database:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setReport(prev => [...prev, `[FATAL ERROR] ${errorMessage}`]);
            toast({ 
                variant: 'destructive', 
                title: 'Error', 
                description: 'Failed to run initialization process.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Initialize Database</h1>
                <p className="text-muted-foreground">
                    Use this tool to seed your database with required service configurations.
                </p>
            </div>

            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Warning!</AlertTitle>
                <AlertDescription>
                    This is a one-time setup action. Running this will add missing service configurations, cable plans, and electricity discos to your database. It is safe to run multiple times, as it will not duplicate existing data.
                </AlertDescription>
            </Alert>

            <Card>
                <CardHeader>
                    <CardTitle>Seed Service Data</CardTitle>
                    <CardDescription>
                        Click the button below to check for and create missing service documents, cable plans, and electricity distributors in your Firestore database.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Button onClick={handleInitialize} disabled={isLoading} className="w-full md:w-auto">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                        Initialize Service Configurations
                    </Button>

                    {report.length > 0 && (
                        <Card className="mt-4 bg-secondary/50">
                            <CardHeader>
                                <CardTitle>Initialization Report</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <pre className="p-4 rounded-md bg-background/50 border whitespace-pre-wrap text-sm font-mono">
                                    {report.join('\n')}
                                </pre>
                            </CardContent>
                        </Card>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
