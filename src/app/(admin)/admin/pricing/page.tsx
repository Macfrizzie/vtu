
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PlusCircle, Upload } from 'lucide-react';

export default function AdminPricingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Pricing Management</h1>
        <p className="text-muted-foreground">Configure service pricing for different networks and API providers.</p>
      </div>

      <Tabs defaultValue="airtime">
        <TabsList>
          <TabsTrigger value="airtime">Airtime</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
          <TabsTrigger value="cable">Cable TV</TabsTrigger>
          <TabsTrigger value="electricity">Electricity</TabsTrigger>
        </TabsList>

        <TabsContent value="airtime" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Airtime Pricing</CardTitle>
                    <CardDescription>Set the percentage discount for each network and API provider.</CardDescription>
                </div>
                 <div className="flex gap-2">
                    <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Bulk Upload</Button>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Airtime Price</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Airtime pricing configuration will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="mt-4">
          <Card>
             <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Data Plan Pricing</CardTitle>
                    <CardDescription>Set prices for each data plan under different networks and providers.</CardDescription>
                </div>
                 <div className="flex gap-2">
                    <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Bulk Upload</Button>
                    <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Data Plan</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Data plan pricing configuration will be displayed here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cable" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Coming Soon</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Pricing management for Cable TV will be available here.</p>
                </CardContent>
            </Card>
        </TabsContent>
         <TabsContent value="electricity" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Coming Soon</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Pricing management for Electricity will be available here.</p>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
