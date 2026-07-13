import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const ROOM_TYPES = ["Deluxe", "Super Deluxe", "Suite", "Presidential"];
const DAYS = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
});

const INITIAL_CHANNELS = [
  { name: "MakeMyTrip", connected: true, api_key: "MMT-KEY-XXXX", last_sync: "2026-06-30 10:30" },
  { name: "Booking.com", connected: true, api_key: "BDC-KEY-XXXX", last_sync: "2026-06-30 09:45" },
  { name: "Expedia", connected: false, api_key: "", last_sync: "-" },
  { name: "Airbnb", connected: true, api_key: "ABB-KEY-XXXX", last_sync: "2026-06-30 11:00" },
  { name: "Agoda", connected: true, api_key: "AGA-KEY-XXXX", last_sync: "2026-06-30 10:15" },
];

const INITIAL_RATES = [
  { room_type: "Deluxe", bar: 4500, weekend: 5500, los3: 4200 },
  { room_type: "Super Deluxe", bar: 6000, weekend: 7200, los3: 5600 },
  { room_type: "Suite", bar: 9500, weekend: 11000, los3: 8800 },
  { room_type: "Presidential", bar: 18000, weekend: 22000, los3: 16500 },
];

function ChannelList({ channels, setChannels }: { channels: typeof INITIAL_CHANNELS; setChannels: React.Dispatch<React.SetStateAction<typeof INITIAL_CHANNELS>> }) {
  return (
    <Card>
      <CardHeader><CardTitle>Connected OTAs</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {channels.map((ch, idx) => (
            <div key={ch.name} className="flex items-center gap-4 p-3 border rounded-lg">
              <Switch
                checked={ch.connected}
                onCheckedChange={v => setChannels(prev => prev.map((c, i) => i === idx ? { ...c, connected: v } : c))}
              />
              <div className="w-32 font-medium">{ch.name}</div>
              <Input
                className="flex-1"
                placeholder="API Key"
                value={ch.api_key}
                onChange={e => setChannels(prev => prev.map((c, i) => i === idx ? { ...c, api_key: e.target.value } : c))}
              />
              <Badge variant={ch.connected ? "default" : "secondary"}>{ch.connected ? "Active" : "Inactive"}</Badge>
              <span className="text-xs text-muted-foreground whitespace-nowrap">Last sync: {ch.last_sync}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InventoryGrid() {
  const [grid, setGrid] = useState<Record<string, Record<string, number>>>(() => {
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
    const g: Record<string, Record<string, number>> = {};
    ROOM_TYPES.forEach(rt => {
      g[rt] = {};
      DAYS.forEach(d => { g[rt][d] = Math.floor(Math.random() * 5) + 3; });
    });
    return g;
  });

  return (
    <Card>
      <CardHeader><CardTitle>Inventory Grid — Available Rooms (Next 14 Days)</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Room Type</TableHead>
              {DAYS.map(d => <TableHead key={d} className="text-center text-xs px-1">{d}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROOM_TYPES.map(rt => (
              <TableRow key={rt}>
                <TableCell className="font-medium">{rt}</TableCell>
                {DAYS.map(d => (
                  <TableCell key={d} className="p-1">
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      className="w-12 text-center text-xs h-7 px-1"
                      value={grid[rt][d]}
                      onChange={e => setGrid(prev => ({ ...prev, [rt]: { ...prev[rt], [d]: parseInt(e.target.value) || 0 } }))}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function RateManagement({ rates, setRates }: { rates: typeof INITIAL_RATES; setRates: React.Dispatch<React.SetStateAction<typeof INITIAL_RATES>> }) {
  const { currency_symbol: sym } = useTenantConfig();
  return (
    <Card>
      <CardHeader><CardTitle>Rate Management</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Room Type</TableHead>
              <TableHead>BAR (Best Available Rate)</TableHead>
              <TableHead>Weekend Rate</TableHead>
              <TableHead>LOS 3+ Nights</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((r, idx) => (
              <TableRow key={r.room_type}>
                <TableCell className="font-medium">{r.room_type}</TableCell>
                {(["bar", "weekend", "los3"] as const).map(field => (
                  <TableCell key={field}>
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">${sym}</span>
                      <Input
                        type="number"
                        className="w-24 h-8"
                        value={r[field]}
                        onChange={e => setRates(prev => prev.map((x, i) => i === idx ? { ...x, [field]: parseInt(e.target.value) || 0 } : x))}
                      />
                    </div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function ChannelManagerPage() {
  const { toast } = useToast();
  const [channels, setChannels] = useState(INITIAL_CHANNELS);
  const [rates, setRates] = useState(INITIAL_RATES);

  const pushMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/hotel/channel-manager/push", { channels, rates }),
    onSuccess: (data: any) => toast({ title: "Pushed!", description: `${data.channels_updated} channels updated successfully` }),
    onError: () => toast({ title: "Push failed", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Channel Manager</h1>
          <p className="text-muted-foreground">Manage OTA connections, inventory and rates from one place</p>
        </div>
        <Button onClick={() => pushMutation.mutate()} disabled={pushMutation.isPending} size="lg">
          {pushMutation.isPending ? "Pushing..." : "Push Rates & Inventory"}
        </Button>
      </div>
      <ChannelList channels={channels} setChannels={setChannels} />
      <InventoryGrid />
      <RateManagement rates={rates} setRates={setRates} />
    </div>
  );
}
