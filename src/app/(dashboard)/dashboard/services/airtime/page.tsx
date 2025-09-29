import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AirtimePage() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Buy Airtime</h1>
        <p className="text-muted-foreground">Top up airtime for any network quickly and easily.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Airtime Top-up</CardTitle>
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
                <Label htmlFor="amount">Amount (₦)</Label>
                <Input id="amount" type="number" placeholder="Enter amount" />
            </div>
            <Button className="w-full" size="lg">Purchase Airtime</Button>
        </CardContent>
      </Card>
    </div>
  );
}
