
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
    if (service.status === 'Inactive' || !service.name) return '#';

    const query = `?provider=${encodeURIComponent(service.name)}&name=${encodeURIComponent(service.name)}`;
    
    // Fallback based on name if it contains keywords
    const name = service.name.toLowerCase();
    if (name.includes('airtime')) return `/dashboard/services/airtime${query}`;
    if (name.includes('data')) return `/dashboard/services/data${query}`;
    if (name.includes('electricity')) return `/dashboard/services/electricity${query}`;
    if (name.includes('cable')) return `/dashboard/services/cable${query}`;
    if (name.includes('education')) return `/dashboard/services/education${query}`;
    if (name.includes('recharge card')) return `/dashboard/services/recharge-card${query}`;

    return '#';
}


export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchServices() {
            setLoading(true);
            try {
                const fetchedServices = await getServices();
                const filteredServices = fetchedServices.filter(s => s.name !== 'DSTV' && s.name !== 'GOTV' && s.name !== 'Startimes');
                setServices(filteredServices);
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
                {displayedServices.map((service) => (
                    <Link href={getServiceUrl(service)} key={service.id} className={cn(service.status === 'Inactive' && 'pointer-events-none opacity-50')}>
                        <Card className="hover:bg-secondary transition-colors h-full">
                            <CardContent className="flex flex-col items-center justify-center p-6 gap-4 text-center">
                                <ServiceIcon serviceName={service.name} />
                                <span className="text-center font-medium">{service.name}</span>
                                {service.status === 'Inactive' && <div className="text-xs text-destructive font-semibold absolute bottom-2">Coming Soon</div>}
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        )}
    </div>
  );
}

    