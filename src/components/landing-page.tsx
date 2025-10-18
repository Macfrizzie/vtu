import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { VtuBossLogo } from '@/components/icons';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Wallet, Zap, MessageSquare, Cog, ShieldCheck, Gem } from 'lucide-react';
import { cn } from '@/lib/utils';

const heroImage = PlaceHolderImages.find(img => img.id === 'hero');
const featureApiImage = PlaceHolderImages.find(img => img.id === 'feature-api');

export function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <VtuBossLogo className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold tracking-tight">VTU Boss</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm md:flex">
             <Link href="#features" className="text-muted-foreground transition-colors hover:text-foreground">Features</Link>
             <Link href="#pricing" className="text-muted-foreground transition-colors hover:text-foreground">Pricing</Link>
             <Link href="#developers" className="text-muted-foreground transition-colors hover:text-foreground">Developers</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="container grid items-center gap-10 py-12 md:py-20 lg:grid-cols-2 lg:py-28">
          <div className="flex flex-col items-start gap-6">
             <h1 className="text-4xl font-extrabold tracking-tighter md:text-5xl lg:text-6xl">
              Your All-in-One Digital Services Portal
            </h1>
            <p className="max-w-[700px] text-lg text-muted-foreground">
              Effortlessly manage airtime, data, bill payments, and more. VTU Boss provides a seamless, reliable platform for personal use and reselling.
            </p>
            <div className="flex gap-4">
              <Button size="lg" asChild>
                <Link href="/signup">Get Started for Free</Link>
              </Button>
               <Button size="lg" variant="outline" asChild>
                <Link href="#developers">Developer API</Link>
              </Button>
            </div>
          </div>
          <div className="relative h-[300px] w-full overflow-hidden rounded-xl border p-4 shadow-lg md:h-[400px]">
            {heroImage && (
              <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                fill
                className="rounded-md object-cover"
                data-ai-hint={heroImage.imageHint}
                priority
              />
            )}
          </div>
        </section>

        <section id="features" className="w-full bg-secondary/50 py-20 md:py-28">
          <div className="container">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything You Need, Nothing You Don't</h2>
              <p className="mx-auto mt-4 max-w-3xl text-muted-foreground md:text-lg">
                We provide robust, developer-friendly features to empower your digital transactions business, backed by top-tier security and reliability.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
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
                icon={<Gem className="h-8 w-8 text-primary" />}
                title="AI-Powered Integrations"
                description="Our AI tools help you connect to new service providers faster than ever before, reducing development time."
              />
              <FeatureCard
                icon={<ShieldCheck className="h-8 w-8 text-primary" />}
                title="Bank-Grade Security"
                description="Your funds and transactions are protected with the latest security protocols and measures."
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
        
        <section id="developers" className="container py-20 md:py-28">
            <div className="grid items-center gap-12 lg:grid-cols-2">
                <div>
                    <h3 className="text-3xl font-bold tracking-tight">Built for Developers, by Developers</h3>
                    <p className="mt-4 text-lg text-muted-foreground">Our groundbreaking AI tool simplifies adding new service providers. It analyzes existing configurations and suggests parameters, request formats, and security measures for new integrations, drastically reducing setup time and complexity.</p>
                     <Button size="lg" className="mt-6" asChild><Link href="/admin/api-connector">Explore the AI Connector</Link></Button>
                </div>
                 <div className="relative h-[300px] w-full overflow-hidden rounded-xl border p-2 shadow-lg lg:h-[350px]">
                    {featureApiImage && (
                      <Image
                        src={featureApiImage.imageUrl}
                        alt={featureApiImage.description}
                        fill
                        className="rounded-md object-cover"
                        data-ai-hint={featureApiImage.imageHint}
                      />
                    )}
                  </div>
            </div>
        </section>

      </main>
      <footer className="border-t border-border/40">
        <div className="container flex flex-col items-center justify-between gap-4 py-10 md:h-24 md:flex-row md:py-0">
          <div className="flex items-center gap-2">
            <VtuBossLogo className="h-6 w-6 text-primary" />
            <p className="text-center text-sm leading-loose md:text-left">
              &copy; {new Date().getFullYear()} VTU Boss. All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
             <Link href="#" className="transition-colors hover:text-foreground">Terms</Link>
             <Link href="#" className="transition-colors hover:text-foreground">Privacy</Link>
             <Link href="#" className="transition-colors hover:text-foreground">Docs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="border-border/60 bg-card/50 text-center transition-all hover:shadow-lg hover:-translate-y-1">
      <CardHeader>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="mb-2 text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
