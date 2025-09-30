
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Phone, Wifi, Zap, Tv, Ticket, CreditCard, Gamepad2, HelpCircle } from 'lucide-react';
import { getServices } from '@/lib/firebase/firestore';
import type { Service } from '@/lib/types';
import { cn } from '@/lib/utils';

const getServiceIcon = (serviceName: string) => {
  const name = serviceName.toLowerCase();
  if (name.includes('airtime')) return <Phone className="h-8 w-8 text-primary" />;
  if (name.includes('data')) return <Wifi className="h-8 w-8 text-primary" />;
  if (name.includes('electric')) return <Zap className="h-8 w-8 text-primary" />;
  if (name.includes('cable') || name.includes('dstv')) return <Tv className="h-8 w-8 text-primary" />;
  if (name.includes('epin')) return <Ticket className="h-8 w-8 text-primary" />;
  if (name.includes('card')) return <CreditCard className="h-8 w-8 text-primary" />;
  if (name.includes('betting')) return <Gamepad2 className="h-8 w-8 text-primary" />;
  return <HelpCircle className="h-8 w-8 text-primary" />;
};

const getServiceUrl = (service: Service) => {
    const name = service.name.toLowerCase();
    const query = `?provider=${encodeURIComponent(service.provider)}&name=${encodeURIComponent(service.name)}`;
    
    if (service.status === 'Inactive') return '#';

    if (name.includes('airtime')) return `/dashboard/services/airtime${query}`;
    if (name.includes('data')) return `/dashboard/services/data${query}`;
    if (name.includes('electric')) return `/dashboard/services/electricity${query}`;
    if (name.includes('cable')) return `/dashboard/services/cable${query}`;
    // Add more mappings here as new service pages are created
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
                {services.map((service) => (
                    <Link href={getServiceUrl(service)} key={service.id} className={cn(service.status === 'Inactive' && 'pointer-events-none opacity-50')}>
                        <Card className="hover:bg-secondary transition-colors h-full">
                            <CardContent className="flex flex-col items-center justify-center p-6 gap-4 text-center">
                                {getServiceIcon(service.name)}
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
