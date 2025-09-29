import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Zap, Droplet, Flame, MessageSquare, Ticket } from 'lucide-react';

const services = [
  { name: 'Airtime', icon: <Smartphone className="h-8 w-8" />, href: '/dashboard/services/airtime', description: 'Top up any mobile network instantly.' },
  { name: 'Data Bundles', icon: <Smartphone className="h-8 w-8" />, href: '/dashboard/services/data', description: 'Get data bundles for all networks.' },
  { name: 'Electricity', icon: <Zap className="h-8 w-8" />, href: '/dashboard/services/electricity', description: 'Pay your electricity bills with ease.' },
  { name: 'Water Bills', icon: <Droplet className="h-8 w-8" />, href: '#', description: 'Settle your water bills quickly.' },
  { name: 'Gas Refill', icon: <Flame className="h-8 w-8" />, href: '#', description: 'Order for gas refill and delivery.' },
  { name: 'Bulk SMS', icon: <MessageSquare className="h-8 w-8" />, href: '#', description: 'Send SMS to multiple contacts.' },
  { name: 'Recharge Print', icon: <Ticket className="h-8 w-8" />, href: '#', description: 'Print and sell recharge vouchers.' },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome Back, User!</h1>
        <p className="text-muted-foreground">Here&apos;s a quick overview of your account.</p>
      </div>

      <Card className="bg-primary text-primary-foreground shadow-lg">
        <CardHeader>
          <CardTitle>My Wallet</CardTitle>
          <CardDescription className="text-primary-foreground/80">Your available balance</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">₦25,450.75</p>
        </CardContent>
        <CardFooter>
          <Button variant="secondary" asChild>
            <Link href="/dashboard/wallet">Fund Wallet</Link>
          </Button>
        </CardFooter>
      </Card>

      <div>
        <h2 className="text-2xl font-bold mb-4">Our Services</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {services.map((service) => (
            <Link href={service.href} key={service.name}>
              <Card className="hover:shadow-md hover:border-primary transition-all duration-200 h-full flex flex-col">
                <CardHeader>
                  <div className="text-primary">{service.icon}</div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <CardTitle className="text-lg">{service.name}</CardTitle>
                  <CardDescription className="mt-2 text-sm">{service.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
