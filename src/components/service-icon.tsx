
'use client';

import { Phone, Wifi, Zap, Tv, Ticket, GraduationCap, HelpCircle, type LucideProps } from 'lucide-react';
import type { Service } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ServiceIconProps extends LucideProps {
    category: Service['category'] | undefined;
}

export function ServiceIcon({ category, className, ...props }: ServiceIconProps) {
  const iconProps = {
    className: cn("h-8 w-8 text-primary", className),
    ...props
  };

  if (!category) {
    return <HelpCircle {...iconProps} />;
  }

  // Convert category to lower case to ensure a case-insensitive match.
  switch (category.toLowerCase()) {
    case 'airtime':
      return <Phone {...iconProps} />;
    case 'data':
      return <Wifi {...iconProps} />;
    case 'electricity':
      return <Zap {...iconProps} />;
    case 'cable':
      return <Tv {...iconProps} />;
    case 'education':
      return <GraduationCap {...iconProps} />;
    case 'recharge card':
      return <Ticket {...iconProps} />;
    default:
      return <HelpCircle {...iconProps} />;
  }
}
