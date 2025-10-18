

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
    const [educationServices, setEducationServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchEducationServices() {
            setLoading(true);
            try {
                const allServices = await getServices();
                const filteredServices = allServices.filter(
                    service => service.category === 'Education' && service.status === 'Active'
                );
                setEducationServices(filteredServices);
            } catch (error) {
                console.error("Failed to fetch education services:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchEducationServices();
    }, []);

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
            ) : educationServices.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {educationServices.map((service) => {
                        return (
                            <Link href={`/dashboard/services/education/${service.id}`} key={service.id}>
                                <Card className="hover:bg-secondary transition-colors h-full">
                                    <CardContent className="flex flex-col items-center justify-center p-6 gap-4 text-center">
                                        <ServiceIcon serviceName={service.name} />
                                        <span className="text-center font-medium">{service.name}</span>
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
