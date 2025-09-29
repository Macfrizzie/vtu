import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export default function ElectricityPage() {
  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Pay Electricity Bill</h1>
        <p className="text-muted-foreground">Pay for prepaid or postpaid meters with ease.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Electricity Payment</CardTitle>
          <CardDescription>Your current wallet balance is ₦25,450.75</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disco">Distributor (Disco)</Label>
              <Select>
                <SelectTrigger id="disco">
                  <SelectValue placeholder="Select your electricity distributor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ikeja">Ikeja Electric (IKEDC)</SelectItem>
                  <SelectItem value="eko">Eko Electric (EKEDC)</SelectItem>
                  <SelectItem value="abuja">Abuja Electric (AEDC)</SelectItem>
                  <SelectItem value="ibadan">Ibadan Electric (IBEDC)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
                <Label>Meter Type</Label>
                <RadioGroup defaultValue="prepaid" className="flex gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="prepaid" id="prepaid" />
                        <Label htmlFor="prepaid">Prepaid</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="postpaid" id="postpaid" />
                        <Label htmlFor="postpaid">Postpaid</Label>
                    </div>
                </RadioGroup>
            </div>

            <div className="space-y-2">
                <Label htmlFor="meter-number">Meter Number</Label>
                <Input id="meter-number" type="text" placeholder="Enter meter number" />
            </div>
             <div className="space-y-2">
                <Label htmlFor="amount">Amount (₦)</Label>
                <Input id="amount" type="number" placeholder="Enter amount" />
            </div>
            <Button className="w-full" size="lg">Pay Bill</Button>
        </CardContent>
      </Card>
    </div>
  );
}
