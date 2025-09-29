import Link from 'next/link';
import { VtuBossLogo } from '@/components/icons';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary">
       <div className="absolute top-4 left-4">
        <Link href="/" className="flex items-center gap-2 text-foreground">
            <VtuBossLogo className="h-6 w-6" />
            <span className="text-md font-bold">VTU Boss</span>
          </Link>
       </div>
      {children}
    </div>
  );
}
