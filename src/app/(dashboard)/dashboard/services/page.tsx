
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { getServices } from '@/lib/firebase/firestore';
import type { Service } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ServiceIcon } from '@/components/service-icon';


const getServiceUrl = (category: string) => {
    if (!category) return '#';
    
    const cat = category.toLowerCase();
    if (cat.includes('airtime')) return `/dashboard/services/airtime`;
    if (cat.includes('data')) return `/dashboard/services/data`;
    if (cat.includes('electricity')) return `/dashboard/services/electricity`;
    if (cat.includes('cable')) return `/dashboard/services/cable`;
    if (cat.includes('education')) return `/dashboard/services/education`;
    if (cat.includes('recharge card')) return `/dashboard/services/recharge-card`;

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
                setServices(fetchedServices);
            } catch (error) {
                console.error("Failed to fetch services:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchServices();
    }, []);

    const groupedServices = useMemo(() => {
        if (loading) return [];

        const activeServices = services.filter(s => s.status === 'Active');

        const serviceMap = new Map<string, Service>();

        activeServices.forEach(service => {
            if (!service.category) return;
            
            // We use the category as the key to group services.
            // If we haven't seen this category yet, we add a representative service to the map.
            if (!serviceMap.has(service.category)) {
                // For "Data", we create a custom "Data Bundles" entry.
                // For others, we just use the first service we encounter for that category.
                if (service.category === 'Data') {
                     serviceMap.set('Data', {
                        id: 'data-category-group',
                        name: 'Data Bundles',
                        category: 'Data',
                        status: 'Active',
                    });
                } else {
                     serviceMap.set(service.category, {
                        id: service.id,
                        name: service.category, // Use category name for display
                        category: service.category,
                        status: 'Active'
                     });
                }
            }
        });
        
        return Array.from(serviceMap.values());

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
                {groupedServices.map((service) => (
                    <Link href={getServiceUrl(service.category)} key={service.id} className={cn(service.status === 'Inactive' && 'pointer-events-none opacity-50')}>
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
