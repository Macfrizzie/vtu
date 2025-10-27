

'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Filter, Loader2, Shield } from 'lucide-react';
import { getAllUsers } from '@/lib/firebase/firestore';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  async function fetchAdmins() {
    setLoading(true);
    try {
      // Fetch only users with 'Admin' or 'Super Admin' roles
      const allAdmins = await getAllUsers(['Admin', 'Super Admin']);
      setAdmins(allAdmins as User[]);
    } catch (error) {
      console.error("Failed to fetch admins:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch administrators.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAdmins();
  }, []);

  const filteredAdmins = useMemo(() => {
    return admins.filter(admin =>
      (admin.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (admin.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [admins, searchTerm]);
  
  const handleRowClick = (userId: string) => {
    // Redirect to the standard user details page
    router.push(`/admin/users/${userId}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Shield className="h-8 w-8 text-primary" />
        <div>
            <h1 className="text-3xl font-bold">Manage Administrators</h1>
            <p className="text-muted-foreground">View, manage, and promote administrators.</p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle>Administrator Accounts</CardTitle>
                 <Input 
                    placeholder="Search by name or email..." 
                    className="max-w-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </CardHeader>
        <CardContent>
           {loading ? (
             <div className="flex justify-center items-center h-60">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Last Login</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAdmins.map((admin) => (
                <TableRow key={admin.id} onClick={() => handleRowClick(admin.id)} className="cursor-pointer">
                  <TableCell className="font-medium">{admin.name}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>
                      <Badge variant={admin.role === 'Super Admin' ? 'default' : 'secondary'} className={cn(admin.role === 'Super Admin' && 'bg-primary')}>
                          {admin.role}
                      </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={admin.status === 'Active' ? 'default' : admin.status === 'Pending' ? 'secondary' : 'destructive'} 
                      className={cn(admin.status === 'Active' && 'bg-green-500 hover:bg-green-600')}
                    >
                      {admin.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(admin.lastLogin).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    