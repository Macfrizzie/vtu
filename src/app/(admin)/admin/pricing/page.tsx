
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataPricingTab, CablePricingTab, ElectricityPricingTab } from './pricing-components';

export default function AdminPricingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Pricing &amp; Fees Management</h1>
        <p className="text-muted-foreground">Configure service discounts, markups, and convenience fees.</p>
      </div>

      <Tabs defaultValue="data" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="data">Data Plans</TabsTrigger>
          <TabsTrigger value="cable">Cable TV</TabsTrigger>
          <TabsTrigger value="electricity">Electricity</TabsTrigger>
        </TabsList>

        <TabsContent value="data" className="mt-4">
          <DataPricingTab />
        </TabsContent>
         <TabsContent value="cable" className="mt-4">
          <CablePricingTab />
        </TabsContent>
         <TabsContent value="electricity" className="mt-4">
          <ElectricityPricingTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
