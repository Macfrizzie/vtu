
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Filter, MoreHorizontal, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getAllUsers } from '@/lib/firebase/firestore';
import type { User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const router = useRouter();

  async function fetchUsers() {
    setLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers as User[]);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch users.' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);
  
  const handleRowClick = (userId: string) => {
    router.push(`/admin/users/${userId}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">View, manage, and search for users.</p>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Search users by name or email..." 
                className="max-w-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Button variant="outline" disabled>
                <Filter className="mr-2 h-4 w-4" /> Filter
              </Button>
            </div>
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
                <TableHead>Wallet Balance</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} onClick={() => handleRowClick(user.id)} className="cursor-pointer">
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>₦{user.walletBalance.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <Badge 
                      variant={user.status === 'Active' ? 'default' : user.status === 'Pending' ? 'secondary' : 'destructive'} 
                      className={cn(
                        user.status === 'Active' && 'bg-green-500 hover:bg-green-600',
                        user.status === 'Blocked' && 'bg-red-500 text-white hover:bg-red-600'
                      )}
                    >
                      {user.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.lastLogin).toLocaleString()}</TableCell>
                   <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleRowClick(user.id)}>View Details</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
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
