
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { getServices } from '@/lib/firebase/firestore';
import type { Service } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ServiceIcon } from '@/components/service-icon';


const getServiceUrl = (service: Service) => {
    if (service.status === 'Inactive') return '#';

    const category = service.category.toLowerCase();
    
    switch (category) {
        case 'airtime':
            return '/dashboard/services/airtime';
        case 'data':
            return '/dashboard/services/data';
        case 'electricity':
            return '/dashboard/services/electricity';
        case 'cable':
            return '/dashboard/services/cable';
        case 'education':
            return '/dashboard/services/education';
        case 'recharge card':
            return '/dashboard/services/recharge-card';
        default:
            return '#';
    }
}


export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchServices() {
            setLoading(true);
            try {
                const fetchedServices = await getServices();
                setServices(fetchedServices);
            } catch (error) {
                console.error("Failed to fetch services:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchServices();
    }, []);

    const displayedServices = useMemo(() => {
        if (loading) return [];
        // Only show active services. The getServiceUrl function will handle whether it's clickable.
        return services.filter(service => service.status === 'Active');
    }, [services, loading]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Pay for Services</h1>
        <p className="text-muted-foreground">Select a service to continue.</p>
      </div>

       {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {displayedServices.map((service) => {
                    const isClickable = service.status === 'Active';
                    return (
                        <Link href={getServiceUrl(service)} key={service.id} className={cn(!isClickable && 'pointer-events-none opacity-50')}>
                            <Card className="hover:bg-secondary transition-colors h-full">
                                <CardContent className="flex flex-col items-center justify-center p-6 gap-4 text-center relative">
                                    <ServiceIcon serviceName={service.name} />
                                    <span className="text-center font-medium">{service.name}</span>
                                    {!isClickable && <div className="text-xs text-destructive font-semibold absolute bottom-2">Coming Soon</div>}
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>
        )}
    </div>
  );
}
