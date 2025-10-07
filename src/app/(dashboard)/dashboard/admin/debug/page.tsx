
'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { verifyDatabaseSetup, initializeServices } from '@/lib/firebase/firestore';

export default function DebugPage() {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    
    async function handleVerify() {
        setLoading(true);
        try {
            const result = await verifyDatabaseSetup();
            setResult(result);
            console.log('Verification complete - check console for details');
        } catch (error) {
            console.error('Verification failed:', error);
        } finally {
            setLoading(false);
        }
    }
    
    async function handleInitialize() {
        setLoading(true);
        try {
            await initializeServices();
            console.log('Initialization complete - check console for details');
            await handleVerify(); // Verify after initialization
        } catch (error) {
            console.error('Initialization failed:', error);
        } finally {
            setLoading(false);
        }
    }
    
    return (
        <div className="container mx-auto p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Database Debug Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleVerify} disabled={loading}>
                        Verify Database Setup
                    </Button>
                    <Button onClick={handleInitialize} disabled={loading} variant="destructive">
                        Initialize/Reset Database
                    </Button>
                    
                    {result && (
                        <div className="mt-4 p-4 bg-gray-100 rounded">
                            <pre>{JSON.stringify(result, null, 2)}</pre>
                            <p className="mt-2 text-sm">Check browser console for detailed logs</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    