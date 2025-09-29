import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { VtuBossLogo } from '@/components/icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Wallet, Zap, MessageSquare, Cog } from 'lucide-react';

const heroImage = PlaceHolderImages.find(img => img.id === 'hero');
const featureWalletImage = PlaceHolderImages.find(img => img.id === 'feature-wallet');
const featureServicesImage = PlaceHolderImages.find(img => img.id === 'feature-services');
const featureApiImage = PlaceHolderImages.find(img => img.id === 'feature-api');

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <VtuBossLogo className="h-8 w-8 text-primary" />
            <span className="text-lg font-bold">VTU Boss</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="container grid items-center gap-8 pb-8 pt-6 md:py-12 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-4">
            <h1 className="text-4xl font-extrabold tracking-tighter md:text-5xl lg:text-6xl">
              Your All-in-One Digital Services Portal
            </h1>
            <p className="max-w-[700px] text-lg text-muted-foreground">
              Effortlessly manage airtime, data, bill payments, and more. VTU Boss provides a seamless platform for personal use and reselling.
            </p>
            <div className="flex gap-4">
              <Button size="lg" asChild>
                <Link href="/signup">Get Started for Free</Link>
              </Button>
            </div>
          </div>
          <div className="relative h-[300px] w-full overflow-hidden rounded-lg shadow-2xl lg:h-[400px]">
            {heroImage && (
              <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                fill
                className="object-cover"
                data-ai-hint={heroImage.imageHint}
                priority
              />
            )}
          </div>
        </section>

        <section id="features" className="w-full bg-secondary py-12 md:py-24">
          <div className="container">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold md:text-4xl">Why Choose VTU Boss?</h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                We provide robust features to empower your digital transactions business.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <FeatureCard
                icon={<Wallet className="h-8 w-8 text-primary" />}
                title="Instant Wallet Funding"
                description="Top up your wallet instantly using your unique bank account. No delays, no hassle."
              />
              <FeatureCard
                icon={<Zap className="h-8 w-8 text-primary" />}
                title="Automated Services"
                description="Enjoy automated delivery of airtime, data, electricity, and other bill payments."
              />
              <FeatureCard
                icon={<MessageSquare className="h-8 w-8 text-primary" />}
                title="Bulk SMS & Vouchers"
                description="Print recharge vouchers and send bulk SMS effortlessly from your dashboard."
              />
              <FeatureCard
                icon={<Cog className="h-8 w-8 text-primary" />}
                title="Powerful API"
                description="Integrate our services into your own application with our well-documented developer API."
              />
            </div>
          </div>
        </section>
        
        <section className="container py-12 md:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-2">
                <div>
                    <h3 className="text-3xl font-bold">Smart, AI-Powered API Connector</h3>
                    <p className="mt-4 text-muted-foreground">Our groundbreaking AI tool simplifies adding new service providers. It analyzes existing configurations and suggests parameters, request formats, and security measures for new integrations, drastically reducing setup time and complexity.</p>
                </div>
                 <div className="relative h-[300px] w-full overflow-hidden rounded-lg shadow-lg">
                    {featureApiImage && (
                      <Image
                        src={featureApiImage.imageUrl}
                        alt={featureApiImage.description}
                        fill
                        className="object-cover"
                        data-ai-hint={featureApiImage.imageHint}
                      />
                    )}
                  </div>
            </div>
        </section>

      </main>
      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
          <div className="flex items-center gap-2">
            <VtuBossLogo className="h-6 w-6 text-primary" />
            <p className="text-center text-sm leading-loose md:text-left">
              Built by VTU Boss. &copy; {new Date().getFullYear()} All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
             <Link href="#" className="hover:text-primary">Terms of Service</Link>
             <Link href="#" className="hover:text-primary">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="text-center">
      <CardHeader>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {icon}
        </div>
        <CardTitle className="mt-4">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
