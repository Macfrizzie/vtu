
'use client';

import { useUser } from '@/context/user-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, User, Mail, Wallet, Calendar } from 'lucide-react';

export default function ProfilePage() {
  const { user, userData, loading } = useUser();

  const getInitials = (name: string | undefined | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('');
  };

  const joinDate = userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }) : 'N/A';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          View and manage your account details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.photoURL || `https://i.pravatar.cc/150?u=${user?.uid}`} />
              <AvatarFallback className="text-2xl">{getInitials(userData?.fullName)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-3xl">{loading ? '...' : userData?.fullName}</CardTitle>
              <CardDescription>{loading ? '...' : userData?.email}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          {loading ? (
            <div className="flex justify-center items-center h-24">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
                <InfoItem icon={<User className="h-5 w-5 text-muted-foreground" />} label="Full Name" value={userData?.fullName} />
                <InfoItem icon={<Mail className="h-5 w-5 text-muted-foreground" />} label="Email Address" value={userData?.email} />
                <InfoItem icon={<Wallet className="h-5 w-5 text-muted-foreground" />} label="Wallet Balance" value={`₦${userData?.walletBalance.toLocaleString()}`} />
                <InfoItem icon={<Calendar className="h-5 w-5 text-muted-foreground" />} label="Member Since" value={joinDate} />
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button disabled>Edit Profile</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | null | undefined }) {
    return (
        <div className="flex items-start gap-4 rounded-lg border bg-secondary/50 p-4">
            {icon}
            <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-semibold">{value || 'N/A'}</p>
            </div>
        </div>
    )
}
