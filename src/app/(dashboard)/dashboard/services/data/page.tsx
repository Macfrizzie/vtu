import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function DataPage() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Buy Data Bundle</h1>
        <p className="text-muted-foreground">Get the best data plans for all networks.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Purchase</CardTitle>
          <CardDescription>Your current wallet balance is ₦25,450.75</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="network">Mobile Network</Label>
              <Select>
                <SelectTrigger id="network">
                  <SelectValue placeholder="Select a network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mtn">MTN</SelectItem>
                  <SelectItem value="glo">Glo</SelectItem>
                  <SelectItem value="airtel">Airtel</SelectItem>
                  <SelectItem value="9mobile">9mobile</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="e.g., 08012345678" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data-plan">Data Plan</Label>
              <Select>
                <SelectTrigger id="data-plan">
                  <SelectValue placeholder="Select a data plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1gb">1GB - 30 Days (₦300)</SelectItem>
                  <SelectItem value="2gb">2GB - 30 Days (₦500)</SelectItem>
                  <SelectItem value="5gb">5GB - 30 Days (₦1200)</SelectItem>
                  <SelectItem value="10gb">10GB - 30 Days (₦2500)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" size="lg">Purchase Data</Button>
        </CardContent>
      </Card>
    </div>
  );
}
