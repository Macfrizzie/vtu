

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { getServices } from '@/lib/firebase/firestore';
import type { Service } from '@/lib/types';
import { ServiceIcon } from '@/components/service-icon';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function EducationServicesHubPage() {
    const [educationService, setEducationService] = useState<Service | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchEducationServices() {
            setLoading(true);
            try {
                const allServices = await getServices();
                const filteredService = allServices.find(
                    service => service.category === 'Education' && service.status === 'Active'
                );
                setEducationService(filteredService || null);
            } catch (error) {
                console.error("Failed to fetch education services:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchEducationServices();
    }, []);

    const examBodies = educationService?.variations || [];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Education E-Pins</h1>
                <p className="text-muted-foreground">Select an examination body to purchase an e-pin.</p>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : examBodies.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {examBodies.map((examBody) => {
                        return (
                            <Link href={`/dashboard/services/education/${examBody.id}`} key={examBody.id}>
                                <Card className="hover:bg-secondary transition-colors h-full">
                                    <CardContent className="flex flex-col items-center justify-center p-6 gap-4 text-center">
                                        <ServiceIcon serviceName={examBody.name} />
                                        <span className="text-center font-medium">{examBody.name}</span>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            ) : (
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No Services Available</AlertTitle>
                    <AlertDescription>
                        There are no active education services configured. Please contact support or check back later.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}
