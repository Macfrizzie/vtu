
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { getServices } from '@/lib/firebase/firestore';
import type { Service } from '@/lib/types';
import { ServiceIcon } from '@/components/service-icon';
import { cn } from '@/lib/utils';

export default function EducationServicesHubPage() {
    const [educationServices, setEducationServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchEducationServices() {
            setLoading(true);
            try {
                const allServices = await getServices();
                const activeEducationServices = allServices.filter(
                    service => service.category === 'Education' && service.status === 'Active'
                );
                setEducationServices(activeEducationServices);
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
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {educationServices.map((service) => {
                         const isClickable = service.status === 'Active' && service.variations && service.variations.length > 0;
                        return (
                            <Link href={`/dashboard/services/education/${service.id}`} key={service.id} className={cn(!isClickable && "pointer-events-none opacity-50")}>
                                <Card className="hover:bg-secondary transition-colors h-full">
                                    <CardContent className="flex flex-col items-center justify-center p-6 gap-4 text-center">
                                        <ServiceIcon serviceName={service.name} />
                                        <span className="text-center font-medium">{service.name}</span>
                                        {!isClickable && <div className="text-xs text-destructive font-semibold absolute bottom-2">Coming Soon</div>}
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                     {educationServices.length === 0 && (
                        <div className="col-span-full text-center text-muted-foreground py-10">
                            <p>No education services are currently available.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
