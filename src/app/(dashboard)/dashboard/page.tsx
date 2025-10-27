
'use client';

import Link from 'next/link';
import {
  Bell,
  Eye,
  Plus,
  ArrowRight,
  MoreHorizontal,
  Loader2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUser } from '@/context/user-context';
import { useEffect, useState } from 'react';
import type { Transaction, Service } from '@/lib/types';
import { getUserTransactions, getServices } from '@/lib/firebase/firestore';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"
import { ServiceIcon } from '@/components/service-icon';
import { Skeleton } from '@/components/ui/skeleton';


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


export default function DashboardPage() {
    const { user, userData, loading } = useUser();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [quickLinks, setQuickLinks] = useState<React.ReactNode[]>([]);
    const [dataLoading, setDataLoading] = useState(true);


    useEffect(() => {
        async function fetchData() {
            if (!user) return;
            setDataLoading(true);
            try {
                const [userTransactions, allServices] = await Promise.all([
                    getUserTransactions(user.uid),
                    getServices()
                ]);
                
                const filteredServices = allServices.filter(s => s.name !== 'DSTV' && s.name !== 'GOTV' && s.name !== 'Startimes');

                setTransactions(userTransactions.slice(0, 4)); // Get first 4 recent
                setServices(filteredServices);
                
                const activeServices = filteredServices.filter(s => s.status === 'Active');
                const links = activeServices.slice(0, 7).map(service => (
                    <Link href={getServiceUrl(service)} key={service.id} className="flex flex-col items-center justify-center text-center gap-2 group">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary transition-colors group-hover:bg-primary">
                            <ServiceIcon serviceName={service.name} className="h-6 w-6 text-primary transition-colors group-hover:text-primary-foreground" />
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">{service.name.split(' ')[0]}</span>
                    </Link>
                ));

                if (allServices.length > 7) {
                    links.push(
                         <Link href="/dashboard/services" key="more" className="flex flex-col items-center justify-center text-center gap-2 group">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary transition-colors group-hover:bg-primary">
                                <MoreHorizontal className="h-6 w-6 text-primary transition-colors group-hover:text-primary-foreground" />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">More</span>
                        </Link>
                    );
                }
                setQuickLinks(links);

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setDataLoading(false);
            }
        }
        fetchData();
    }, [user]);

    const getTransactionServiceName = (description: string): Service['name'] | undefined => {
        const lowerDescription = description.toLowerCase();
    
        if (lowerDescription.includes('wallet funding')) return undefined;
        
        // Prioritize specific keywords
        if (lowerDescription.includes('airtime')) return 'Airtime';
        if (lowerDescription.includes('data')) return 'Data';
        if (lowerDescription.includes('electricity') || lowerDescription.includes('electric')) return 'Electricity';
        if (lowerDescription.includes('dstv') || lowerDescription.includes('gotv') || lowerDescription.includes('startimes') || lowerDescription.includes('cable')) return 'Cable TV';
        if (lowerDescription.includes('waec') || lowerDescription.includes('neco') || lowerDescription.includes('jamb') || lowerDescription.includes('education')) return 'Education';
        if (lowerDescription.includes('recharge card')) return 'Recharge Card';
        
        // Fallback to searching by service category
        const service = services.find(s => s.category && lowerDescription.includes(s.category.toLowerCase()));
        return service?.name;
    }

  return (
    <div className="p-0">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarFallback>{userData?.fullName?.[0] || user?.email?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-muted-foreground">Good morning,</p>
            <h1 className="text-xl font-bold text-foreground">
                {loading ? '...' : userData?.fullName?.split(' ')[0] || 'User'}
            </h1>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell size={24} />
        </Button>
      </header>
      
      <Card className="w-full bg-primary text-primary-foreground overflow-hidden relative mb-8">
        <CardContent className="p-6 relative z-10">
            <p className="text-sm opacity-80">Available Balance</p>
            <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2">
                    {loading ? (
                         <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                        <p className="text-4xl font-bold">₦{userData?.walletBalance?.toLocaleString() || '0.00'}</p>
                    )}
                    <Button variant="ghost" size="icon" className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/20">
                    <Eye size={24} />
                    </Button>
                </div>
                <Button variant="secondary" asChild className="rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90">
                    <Link href="/dashboard/wallet">
                    <Plus size={16} />
                    Fund Wallet
                    </Link>
                </Button>
            </div>
        </CardContent>
         <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/az-subtle.png')] opacity-10 z-0"></div>
      </Card>


      <section className="mb-8">
        <h2 className="mb-4 font-semibold text-foreground">Quick Services</h2>
        <div className="grid grid-cols-4 gap-4">
            {dataLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <Skeleton className="h-3 w-10" />
                    </div>
                ))
            ) : (
                quickLinks
            )}
        </div>
      </section>

      <section className="mb-8">
        <Carousel className="w-full">
            <CarouselContent>
                <CarouselItem>
                    <Link href="/dashboard/wallet">
                        <Card className="relative overflow-hidden rounded-xl bg-blue-500/10 p-6 shadow-none border-blue-500/20">
                        <CardContent className="p-0">
                            <div className="relative z-10">
                            <h3 className="text-lg font-semibold text-blue-900">Easy Wallet Top-up</h3>
                            <p className="mt-1 text-sm text-blue-800/80">
                                Fund your wallet using Card or Bank Transfer.
                            </p>
                            </div>
                        </CardContent>
                        </Card>
                    </Link>
                </CarouselItem>
                <CarouselItem>
                   <Link href="#">
                        <Card className="relative overflow-hidden rounded-xl bg-green-500/10 p-6 shadow-none border-green-500/20">
                        <CardContent className="p-0">
                            <div className="relative z-10">
                            <h3 className="text-lg font-semibold text-green-900">Refer & Earn Big</h3>
                            <p className="mt-1 text-sm text-green-800/80">
                                Invite your friends and earn rewards when they transact.
                            </p>
                            </div>
                        </CardContent>
                        </Card>
                    </Link>
                </CarouselItem>
            </CarouselContent>
        </Carousel>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Recent Transactions</h2>
          <Link
            href="/dashboard/history"
            className="flex items-center text-sm font-medium text-primary"
          >
            View all <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        {dataLoading ? (
            <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                        <Skeleton className="h-5 w-16" />
                    </div>
                ))}
            </div>
        ) : transactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-10 bg-secondary/50 rounded-lg">
                <p className="font-semibold">No transactions yet</p>
                <p className="text-sm">Make a purchase or fund your wallet to see activity.</p>
            </div>
        ) : (
            <div className="space-y-2">
            {transactions.map((tx) => {
                const serviceName = getTransactionServiceName(tx.description);
                return (
                    <Card key={tx.id} className="rounded-xl p-4 shadow-none bg-secondary/50">
                    <CardContent className="flex items-center justify-between p-0">
                        <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background">
                            {tx.description.toLowerCase().includes('wallet funding') ? (
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                                    <Plus size={20} className="text-green-600 dark:text-green-400" />
                                </div>
                            ) : (
                                <ServiceIcon serviceName={serviceName} className="h-6 w-6" />
                            )}
                        </div>
                        <div>
                            <p className="font-semibold">{tx.description}</p>
                            <p className="text-xs text-muted-foreground">
                                {new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                {' at '}
                                {new Date(tx.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                        </div>
                        <p
                         className={cn(
                            'font-semibold',
                            tx.type === 'Credit' ? 'text-green-600' : 'text-red-600'
                          )}
                        >
                        {tx.type === 'Credit' ? '+' : '-'} ₦{Math.abs(tx.amount).toLocaleString()}
                        </p>
                    </CardContent>
                    </Card>
                );
            })}
            </div>
        )}
      </section>
    </div>
  );

    



    