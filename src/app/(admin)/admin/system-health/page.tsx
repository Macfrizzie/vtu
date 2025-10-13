
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getSystemHealth, initializeServices, verifyDatabaseSetup, getApiProviders } from '@/lib/firebase/firestore';
import { testHusmoDataConnection } from '@/services/husmodata';
import type { SystemHealth, ApiProvider } from '@/lib/types';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, ShieldCheck, ShieldAlert, Database, Plug, Zap, HardDrive } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function SystemHealthPage() {
    const [health, setHealth] = useState<SystemHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [runningTest, setRunningTest] = useState<string | null>(null);
    const { toast } = useToast();

    async function fetchHealth() {
        setLoading(true);
        try {
            const healthData = await getSystemHealth();
            setHealth(healthData);
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch system health.' });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchHealth();
    }, []);

    const handleRunTest = async (testName: string, testFn: () => Promise<any>) => {
        setRunningTest(testName);
        try {
            const result = await testFn();
            toast({ title: `${testName} Complete`, description: 'Check console for detailed logs.' });
            console.log(`[${testName} Result]`, result);
            // Refetch health after running a test that might change state
            if (['Initialize/Seed Missing Data', 'Verify Database Structure'].includes(testName)) {
                await fetchHealth();
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: `${testName} Failed`, description: error.message });
        } finally {
            setRunningTest(null);
        }
    };
    
    const handleTestAllApiConnections = async () => {
        setRunningTest('Test All API Connections');
        const apiProviders = await getApiProviders();
        let allPassed = true;
        let providerResults: { name: string; status: 'Success' | 'Failed'; message: string }[] = [];

        for (const provider of apiProviders) {
            try {
                // We only test active providers
                if (provider.status === 'Active') {
                    const startTime = Date.now();
                    await testHusmoDataConnection(provider.baseUrl, provider.apiKey || '');
                    const endTime = Date.now();
                    
                    setHealth(prev => {
                        if (!prev) return null;
                        const newHealth = { ...prev };
                        newHealth.apiProviders[provider.name].reachable = true;
                        newHealth.apiProviders[provider.name].responseTime = endTime - startTime;
                        newHealth.apiProviders[provider.name].lastTested = new Date();
                        return newHealth;
                    });
                    providerResults.push({ name: provider.name, status: 'Success', message: `Connected in ${endTime - startTime}ms` });
                }
            } catch (error: any) {
                allPassed = false;
                setHealth(prev => {
                    if (!prev) return null;
                    const newHealth = { ...prev };
                    newHealth.apiProviders[provider.name].reachable = false;
                    newHealth.apiProviders[provider.name].lastTested = new Date();
                    return newHealth;
                });
                providerResults.push({ name: provider.name, status: 'Failed', message: error.message });
            }
        }
        
        toast({
            title: 'API Connection Tests Complete',
            description: allPassed ? 'All active providers are reachable.' : 'Some providers failed to connect.',
        });
        console.log('[API Connection Test Results]', providerResults);
        setRunningTest(null);
    }

    if (loading) {
        return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!health) {
        return <p>Could not load system health data.</p>;
    }

    const overallStatus = health.database.connected && Object.values(health.services).every(s => s.issues.length === 0);

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                 <div>
                    <h1 className="text-3xl font-bold">System Health</h1>
                    <p className="text-muted-foreground">A real-time diagnostic dashboard for your application.</p>
                </div>
                <div className="flex items-center gap-2">
                    {overallStatus ? (
                         <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                             <CheckCircle2 className="mr-2 h-4 w-4" /> All Systems Operational
                         </Badge>
                    ) : (
                        <Badge variant="destructive">
                            <AlertTriangle className="mr-2 h-4 w-4" /> Issues Detected
                        </Badge>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Interactive Diagnostic Tools</CardTitle>
                    <CardDescription>Run tests and perform actions to diagnose and resolve issues.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                     <Button onClick={handleTestAllApiConnections} disabled={!!runningTest}>
                        {runningTest === 'Test All API Connections' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
                        Test API Connections
                    </Button>
                     <Button onClick={() => handleRunTest('Verify Database Structure', verifyDatabaseSetup)} disabled={!!runningTest}>
                        {runningTest === 'Verify Database Structure' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                        Verify DB Structure
                    </Button>
                     <Button onClick={() => handleRunTest('Initialize/Seed Missing Data', initializeServices)} disabled={!!runningTest}>
                        {runningTest === 'Initialize/Seed Missing Data' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HardDrive className="mr-2 h-4 w-4" />}
                        Seed Missing Data
                    </Button>
                </CardContent>
            </Card>

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>Core Services Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="multiple" className="w-full">
                                {Object.entries(health.services).map(([name, service]) => (
                                    <AccordionItem value={name} key={name}>
                                        <AccordionTrigger>
                                            <div className="flex items-center gap-4">
                                                {service.issues.length === 0 ? <ShieldCheck className="h-5 w-5 text-green-500" /> : <ShieldAlert className="h-5 w-5 text-destructive" />}
                                                <span className="font-semibold">{name}</span>
                                                <Badge variant={service.status === 'Active' ? 'default' : 'secondary'} className={cn(service.status === 'Active' && 'bg-green-500')}>{service.status}</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="space-y-2 pl-6">
                                            <p>Exists: {service.exists ? 'Yes' : 'No'}</p>
                                            <p>Variations: {service.hasVariations ? `${service.variationCount} found` : 'Missing'}</p>
                                            <p>API Provider: {service.hasApiProvider ? 'Linked' : 'Missing'}</p>
                                            <p>Endpoint: {service.hasEndpoint ? 'Configured' : 'Missing'}</p>
                                            {service.issues.length > 0 && (
                                                <div className="pt-2">
                                                    <h4 className="font-semibold text-destructive">Issues:</h4>
                                                    <ul className="list-disc pl-5 text-destructive">
                                                        {service.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                                                    </ul>
                                                </div>
                                            )}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>API Provider Status</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {Object.entries(health.apiProviders).map(([name, provider]) => (
                                <div key={name} className="flex items-center justify-between border-b p-2 last:border-b-0">
                                    <span className="font-semibold">{name}</span>
                                    <div className="flex items-center gap-4">
                                         <Badge variant={provider.status === 'Active' ? 'default' : 'secondary'} className={cn(provider.status === 'Active' && 'bg-green-500')}>{provider.status}</Badge>
                                        {provider.lastTested ? (
                                            provider.reachable ? (
                                                <Badge className="bg-green-500"><CheckCircle2 className="mr-2 h-4 w-4"/> Reachable ({provider.responseTime}ms)</Badge>
                                            ) : (
                                                <Badge variant="destructive"><XCircle className="mr-2 h-4 w-4"/> Unreachable</Badge>
                                            )
                                        ) : (
                                            <Badge variant="outline">Not Tested</Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Database Integrity</CardTitle>
                        <CardDescription>Connection status and collection counts.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold">Connection Status</span>
                            {health.database.connected ? <Badge className="bg-green-500"><CheckCircle2 className="mr-2 h-4 w-4"/> Connected</Badge> : <Badge variant="destructive"><XCircle className="mr-2 h-4 w-4"/> Disconnected</Badge>}
                        </div>
                        <div className="space-y-2">
                            {Object.entries(health.database.collections).map(([name, collection]) => (
                                <div key={name} className="flex justify-between items-center text-sm p-2 bg-secondary/50 rounded-md">
                                    <span className="text-muted-foreground">{name}</span>
                                    <span className="font-semibold">{collection.count} docs</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

