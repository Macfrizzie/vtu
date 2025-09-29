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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import { DstvLogo, KudaLogo, MtnLogo } from '@/components/icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const fundWalletImage = PlaceHolderImages.find(
  img => img.id === 'feature-wallet'
);

const quickLinks = [
  { name: 'Airtime', icon: <Phone size={24} />, href: '#' },
  { name: 'Data', icon: <Wifi size={24} />, href: '#' },
  { name: 'Electricity', icon: <Zap size={24} />, href: '#' },
  { name: 'More', icon: <MoreHorizontal size={24} />, href: '#' },
];

const transactions = [
  {
    icon: <MtnLogo className="h-6 w-6" />,
    title: 'Airtime Top Up',
    time: '11:25 AM',
    date: '28th, June 2024',
    amount: '- ₦1,200',
    type: 'debit',
  },
  {
    icon: (
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
        <Plus size={20} className="text-blue-600" />
      </div>
    ),
    title: 'Fund Wallet',
    time: '11:25 AM',
    date: '28th, June 2024',
    amount: '+ ₦1,200',
    type: 'credit',
  },
  {
    icon: <DstvLogo className="h-8 w-8" />,
    title: 'TV Subscription',
    time: '11:25 AM',
    date: '28th, June 2024',
    amount: '- ₦1,200',
    type: 'debit',
  },
  {
    icon: <KudaLogo className="h-8 w-8" />,
    title: 'Electricity',
    time: '11:25 AM',
    date: '28th, June 2024',
    amount: '- ₦1,200',
    type: 'debit',
  },
];

export default function DashboardPage() {
  return (
    <div className="p-0">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <h1 className="text-xl font-semibold text-foreground">
            Welcome, Alex
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
            <p className="text-4xl font-bold">₦10,000</p>
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
          {quickLinks.map(link => (
            <Link href={link.href} key={link.name}>
              <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center">
                <div className="text-muted-foreground">{link.icon}</div>
                <span className="text-xs font-medium">{link.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-8">
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
        <div className="mt-4 flex justify-center">
          <div className="flex gap-1.5">
            <span className="h-1.5 w-4 rounded-full bg-primary" />
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
          </div>
        </div>
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
        <div className="space-y-4">
          {transactions.map((tx, index) => (
            <Card key={index} className="rounded-xl p-4 shadow-none">
              <CardContent className="flex items-center justify-between p-0">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center">
                    {tx.icon}
                  </div>
                  <div>
                    <p className="font-semibold">{tx.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {tx.time} {tx.date}
                    </p>
                  </div>
                </div>
                <p
                  className={`font-semibold ${
                    tx.type === 'credit' ? 'text-green-600' : ''
                  }`}
                >
                  {tx.amount}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
