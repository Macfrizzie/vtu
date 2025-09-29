
'use client';

import Link from 'next/link';
import {
  Bell,
  Eye,
  Plus,
  ArrowRight,
  Wifi,
  Zap,
  Phone,
  MoreHorizontal,
  Loader2,
  Tv,
  Ticket,
  Gamepad2,
  HelpCircle,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { DstvLogo, KudaLogo, MtnLogo } from '@/components/icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useUser } from '@/context/user-context';
import { useEffect, useState } from 'react';
import type { Transaction, Service } from '@/lib/types';
import { getUserTransactions, getServices } from '@/lib/firebase/firestore';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"

const fundWalletImage = PlaceHolderImages.find(
  img => img.id === 'feature-wallet'
);

const getServiceUrl = (service: Service) => {
    const name = service.name.toLowerCase();
    const query = `?provider=${encodeURIComponent(service.provider)}&name=${encodeURIComponent(service.name)}`;
    
    if (service.status === 'Inactive') return '#';

    if (name.includes('airtime')) return `/dashboard/services/airtime${query}`;
    if (name.includes('data')) return `/dashboard/services/data${query}`;
    if (name.includes('electric')) return `/dashboard/services/electricity${query}`;
    // Add more mappings here as new service pages are created
    return '#';
}


const getServiceIcon = (serviceName: string) => {
    const name = serviceName.toLowerCase();
    if (name.includes('airtime')) return <Phone size={24} />;
    if (name.includes('data')) return <Wifi size={24} />;
    if (name.includes('electric')) return <Zap size={24} />;
    if (name.includes('cable') || name.includes('dstv')) return <Tv size={24} />;
    if (name.includes('epin')) return <Ticket size={24} />;
    if (name.includes('card')) return <CreditCard size={24} />;
    if (name.includes('betting')) return <Gamepad2 size={24} />;
    return <HelpCircle size={24} />;
};


const getTransactionIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('mtn')) return <MtnLogo className="h-6 w-6" />;
    if (desc.includes('dstv')) return <DstvLogo className="h-8 w-8" />;
    if (desc.includes('electric')) return <KudaLogo className="h-8 w-8" />; // Placeholder
    if (desc.includes('wallet funding')) return (
         <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
            <Plus size={20} className="text-blue-600" />
        </div>
    );
    return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
            <Zap size={20} className="text-gray-600" />
        </div>
    );
}

export default function DashboardPage() {
    const { user, userData, loading } = useUser();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
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
                setTransactions(userTransactions.slice(0, 4)); // Get first 4 recent
                
                const activeServices = allServices.filter(s => s.status === 'Active');
                const links = activeServices.slice(0, 3).map(service => (
                    <Link href={getServiceUrl(service)} key={service.id}>
                        <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center">
                            <div className="text-muted-foreground">{getServiceIcon(service.name)}</div>
                            <span className="text-xs font-medium">{service.name.split(' ')[0]}</span>
                        </div>
                    </Link>
                ));

                if (allServices.length > 3) {
                    links.push(
                        <Link href="/dashboard/services" key="more">
                            <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center">
                                <div className="text-muted-foreground"><MoreHorizontal size={24} /></div>
                                <span className="text-xs font-medium">More</span>
                            </div>
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

  return (
    <div className="p-0">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user?.photoURL || `https://i.pravatar.cc/150?u=${user?.uid}`} />
            <AvatarFallback>{userData?.fullName?.[0] || user?.email?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <h1 className="text-xl font-semibold text-foreground">
             Welcome, {loading ? '...' : userData?.fullName?.split(' ')[0] || 'User'}
          </h1>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell size={24} />
        </Button>
      </header>

      <section className="mb-8">
        <p className="mb-2 text-sm text-muted-foreground">Available Balance</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {loading ? (
                 <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
                <p className="text-4xl font-bold">₦{userData?.walletBalance?.toLocaleString() || '0.00'}</p>
            )}
            <Button variant="ghost" size="icon">
              <Eye size={24} className="text-muted-foreground" />
            </Button>
          </div>
          <Button asChild className="rounded-full">
            <Link href="/dashboard/wallet">
              <Plus size={16} />
              Fund Wallet
            </Link>
          </Button>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 font-semibold text-foreground">Quick Links</h2>
        <div className="grid grid-cols-4 gap-3">
            {dataLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center animate-pulse">
                        <div className="h-6 w-6 bg-muted rounded-md"></div>
                        <div className="h-3 w-10 bg-muted rounded-md"></div>
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
                        <Card className="relative overflow-hidden rounded-xl bg-secondary/50 p-6 shadow-none">
                        <CardContent className="p-0">
                            <div className="relative z-10">
                            <h3 className="text-lg font-semibold">Fund Wallet with Card</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Add money to your wallet using your credit or debit card.
                            </p>
                            </div>
                            {fundWalletImage && (
                            <Image
                                src={fundWalletImage.imageUrl}
                                alt={fundWalletImage.description}
                                width={150}
                                height={100}
                                className="absolute -right-8 -top-4 z-0"
                                data-ai-hint={fundWalletImage.imageHint}
                            />
                            )}
                        </CardContent>
                        </Card>
                    </Link>
                </CarouselItem>
                <CarouselItem>
                   <Link href="#">
                        <Card className="relative overflow-hidden rounded-xl bg-blue-500/10 p-6 shadow-none">
                        <CardContent className="p-0">
                            <div className="relative z-10">
                            <h3 className="text-lg font-semibold text-blue-800">Refer & Earn</h3>
                            <p className="mt-1 text-sm text-blue-700/80">
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
          <h2 className="font-semibold text-foreground">Transactions</h2>
          <Link
            href="/dashboard/history"
            className="flex items-center text-sm font-medium text-primary"
          >
            View all <ArrowRight size={16} className="ml-1" />
          </Link>
        </div>
        {dataLoading ? (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        ) : transactions.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">
                <p>No transactions yet.</p>
                <p className="text-sm">Make a purchase or fund your wallet to see activity.</p>
            </div>
        ) : (
            <div className="space-y-4">
            {transactions.map((tx) => (
                <Card key={tx.id} className="rounded-xl p-4 shadow-none">
                <CardContent className="flex items-center justify-between p-0">
                    <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center">
                        {getTransactionIcon(tx.description)}
                    </div>
                    <div>
                        <p className="font-semibold">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                            {new Date(tx.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} {' '}
                            {new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                    </div>
                    </div>
                    <p
                    className={cn('font-semibold',
                        tx.type === 'Credit' ? 'text-green-600' : ''
                    )}
                    >
                     {tx.type === 'Credit' ? '+' : '-'} ₦{Math.abs(tx.amount).toLocaleString()}
                    </p>
                </CardContent>
                </Card>
            ))}
            </div>
        )}
      </section>
    </div>
  );
}

    

    