import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const MOCK_ORDERS = [
  { id: "ONDC-001", buyer_app: "Paytm", item: "Paneer Butter Masala", amount: 320, status: "pending" },
  { id: "ONDC-002", buyer_app: "PhonePe", item: "Veg Thali", amount: 180, status: "accepted" },
  { id: "ONDC-003", buyer_app: "Snapdeal", item: "Biryani", amount: 450, status: "delivered" },
];

function SetupTab() {
  const [form, setForm] = useState({ subscriber_id: "", signing_key: "", bap_endpoint: "", np_type: "BPP" });
  const { toast } = useToast();
  return (
    <Card>
      <CardHeader><CardTitle>ONDC Seller Configuration</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Subscriber ID</Label>
            <Input value={form.subscriber_id} onChange={e => setForm(f => ({ ...f, subscriber_id: e.target.value }))} placeholder="your-domain.ondc.org" />
          </div>
          <div className="space-y-1">
            <Label>Signing Key (Ed25519)</Label>
            <Input type="password" value={form.signing_key} onChange={e => setForm(f => ({ ...f, signing_key: e.target.value }))} placeholder="Base64 private key" />
          </div>
          <div className="space-y-1">
            <Label>BAP Endpoint URL</Label>
            <Input value={form.bap_endpoint} onChange={e => setForm(f => ({ ...f, bap_endpoint: e.target.value }))} placeholder="https://bap.example.com/api" />
          </div>
          <div className="space-y-1">
            <Label>NP Type</Label>
            <Select value={form.np_type} onValueChange={v => setForm(f => ({ ...f, np_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BPP">BPP (Seller App)</SelectItem>
                <SelectItem value="BAP">BAP (Buyer App)</SelectItem>
                <SelectItem value="BG">BG (Gateway)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={() => toast({ title: "Settings saved", description: "ONDC configuration updated" })}>
          Save Configuration
        </Button>
      </CardContent>
    </Card>
  );
}

function CatalogSyncTab() {
  const { toast } = useToast();
  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/restaurant/ondc/sync-catalog"),
    onSuccess: (data: any) => toast({ title: "Catalog Synced", description: `${data.items_synced} items pushed to ONDC network` }),
    onError: () => toast({ title: "Sync failed", variant: "destructive" }),
  });
  return (
    <Card>
      <CardHeader><CardTitle>Catalog Sync</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-4 bg-muted/30">
          <p className="text-sm text-muted-foreground">Push your menu items to the ONDC network. Items are automatically mapped to ONDC catalog format.</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center"><div className="text-2xl font-bold">42</div><div className="text-xs text-muted-foreground">Total Items</div></Card>
          <Card className="p-4 text-center"><div className="text-2xl font-bold text-green-600">38</div><div className="text-xs text-muted-foreground">Synced</div></Card>
          <Card className="p-4 text-center"><div className="text-2xl font-bold text-yellow-600">4</div><div className="text-xs text-muted-foreground">Pending</div></Card>
        </div>
        <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
          {syncMutation.isPending ? "Syncing..." : "Push Menu to ONDC Network"}
        </Button>
      </CardContent>
    </Card>
  );
}

function OrderManagementTab() {
  const { toast } = useToast();
  const [orders, setOrders] = useState(MOCK_ORDERS);

  const handleAction = (id: string, action: "accept" | "reject") => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: action === "accept" ? "accepted" : "rejected" } : o));
    toast({ title: `Order ${action}ed`, description: `Order ${id} has been ${action}ed` });
  };

  const statusColor = (s: string) => {
    if (s === "accepted" || s === "delivered") return "bg-green-100 text-green-700";
    if (s === "rejected") return "bg-red-100 text-red-700";
    return "bg-yellow-100 text-yellow-700";
  };

  return (
    <Card>
      <CardHeader><CardTitle>ONDC Orders</CardTitle></CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Buyer App</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map(o => (
              <TableRow key={o.id}>
                <TableCell className="font-mono text-sm">{o.id}</TableCell>
                <TableCell>{o.buyer_app}</TableCell>
                <TableCell>{o.item}</TableCell>
                <TableCell>₹{o.amount}</TableCell>
                <TableCell><span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(o.status)}`}>{o.status}</span></TableCell>
                <TableCell>
                  {o.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleAction(o.id, "accept")}>Accept</Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleAction(o.id, "reject")}>Reject</Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AnalyticsTab() {
  const ondc = 35;
  const direct = 65;
  return (
    <Card>
      <CardHeader><CardTitle>ONDC vs Direct Orders</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 text-center"><div className="text-2xl font-bold">₹1.2L</div><div className="text-xs text-muted-foreground">ONDC Revenue</div></Card>
          <Card className="p-4 text-center"><div className="text-2xl font-bold">₹2.3L</div><div className="text-xs text-muted-foreground">Direct Revenue</div></Card>
          <Card className="p-4 text-center"><div className="text-2xl font-bold">34%</div><div className="text-xs text-muted-foreground">ONDC Growth MoM</div></Card>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span>ONDC Orders</span><span className="font-medium">{ondc}%</span></div>
          <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${ondc}%` }} />
          </div>
          <div className="flex justify-between text-sm"><span>Direct Orders</span><span className="font-medium">{direct}%</span></div>
          <div className="w-full bg-muted rounded-full h-6 overflow-hidden">
            <div className="bg-green-500 h-full rounded-full" style={{ width: `${direct}%` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function OndcIntegrationPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">ONDC Seller Integration</h1>
        <p className="text-muted-foreground">Open Network for Digital Commerce — connect your restaurant to the ONDC network</p>
      </div>
      <Tabs defaultValue="setup">
        <TabsList>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="catalog">Catalog Sync</TabsTrigger>
          <TabsTrigger value="orders">Order Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="setup"><SetupTab /></TabsContent>
        <TabsContent value="catalog"><CatalogSyncTab /></TabsContent>
        <TabsContent value="orders"><OrderManagementTab /></TabsContent>
        <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
