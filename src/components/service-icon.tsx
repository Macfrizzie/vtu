
'use client';

import { Phone, Wifi, Zap, Tv, Ticket, GraduationCap, Gamepad2, CreditCard, HelpCircle, type LucideProps } from 'lucide-react';
import type { Service } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ServiceIconProps extends LucideProps {
    serviceName: Service['name'] | undefined;
}

export function ServiceIcon({ serviceName, className, ...props }: ServiceIconProps) {
  const iconProps = {
    className: cn("h-8 w-8 text-primary", className),
    ...props
  };

  if (!serviceName) {
    return <HelpCircle {...iconProps} />;
  }

  const name = serviceName.toLowerCase();

  if (name.includes('airtime')) {
    return <Phone {...iconProps} />;
  }
  if (name.includes('data bundles')) {
    return <Wifi {...iconProps} />;
  }
  if (name.includes('electricity')) {
    return <Zap {...iconProps} />;
  }
  if (name.includes('cable')) {
    return <Tv {...iconProps} />;
  }
  if (name.includes('e-pins')) {
    return <GraduationCap {...iconProps} />;
  }
  if (name.includes('recharge card')) {
    return <Ticket {...iconProps} />;
  }
  
  return <HelpCircle {...iconProps} />;
}
