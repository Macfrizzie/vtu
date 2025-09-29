import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { mockServices } from '@/lib/placeholder-data';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function AdminServicesPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold">Service Management</h1>
            <p className="text-muted-foreground">Configure and manage all services and providers.</p>
        </div>
        <Button>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Service
        </Button>
      </div>
      
      <Card>
        <CardHeader>
            <CardTitle>Available Services</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Fee/Commission (%)</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockServices.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>{service.provider}</TableCell>
                  <TableCell className="text-right">{service.fee.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={service.status === 'Active' ? 'default' : 'destructive'} className={cn(service.status === 'Active' && 'bg-green-500 hover:bg-green-600')}>
                      {service.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Service</DropdownMenuItem>
                        <DropdownMenuItem>Manage Pricing</DropdownMenuItem>
                        <DropdownMenuItem>{service.status === 'Active' ? 'Deactivate' : 'Activate'}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
