
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Phone, Wifi, Zap, Tv, Ticket, CreditCard, Gamepad2, HelpCircle, GraduationCap } from 'lucide-react';
import { getServices } from '@/lib/firebase/firestore';
import type { Service } from '@/lib/types';
import { cn } from '@/lib/utils';

const getServiceIcon = (service: Service) => {
  if (!service.category) return <HelpCircle className="h-8 w-8 text-primary" />;
  const cat = service.category.toLowerCase();
  
  switch(cat) {
    case 'airtime': return <Phone className="h-8 w-8 text-primary" />;
    case 'data': return <Wifi className="h-8 w-8 text-primary" />;
    case 'electricity': return <Zap className="h-8 w-8 text-primary" />;
    case 'cable': return <Tv className="h-8 w-8 text-primary" />;
    case 'education': return <GraduationCap className="h-8 w-8 text-primary" />;
    case 'recharge card': return <Ticket className="h-8 w-8 text-primary" />;
    default: return <HelpCircle className="h-8 w-8 text-primary" />;
  }
};

const getServiceUrl = (service: Service) => {
    if (service.status === 'Inactive' || !service.name) return '#';

    const query = `?provider=${encodeURIComponent(service.provider)}&name=${encodeURIComponent(service.name)}`;
    
    // Fallback based on category if name doesn't match
    if (service.category) {
        const category = service.category.toLowerCase();
        switch(category) {
            case 'airtime': return `/dashboard/services/airtime${query}`;
            case 'data': return `/dashboard/services/data${query}`;
            case 'electricity': return `/dashboard/services/electricity${query}`;
            case 'cable': return `/dashboard/services/cable${query}`;
            case 'education': return `/dashboard/services/education${query}`;
            case 'recharge card': return `/dashboard/services/recharge-card${query}`;
        }
    }

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
                                {getServiceIcon(service)}
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
