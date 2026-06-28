import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const EMPTY = { channel_name: "", api_key: "", marketplace_seller_id: "" };

export default function EcommerceChannelsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: channels = [] } = useQuery({ queryKey: ["/api/ecommerce/channels"], queryFn: () => api("GET", "/api/ecommerce/channels") });

  const addMutation = useMutation({
    mutationFn: (b: any) => api("POST", "/api/ecommerce/channels", b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ecommerce/channels"] }); toast({ title: "Channel connected" }); setShowForm(false); setForm(EMPTY); },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => api("PUT", ),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ecommerce/channels"] }); toast({ title: "Sync initiated" }); },
  });

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Channels</h1>
        <Button onClick={() => setShowForm(s => !s)}>Connect Channel</Button>
      </div>
      {showForm && (
        <Card>
          <CardHeader><CardTitle>Connect Channel</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <Select value={form.channel_name} onValueChange={v => set("channel_name", v)}>
              <SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger>
              <SelectContent>
                {["Amazon","Flipkart","Meesho","Shopify"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input placeholder="API Key" value={form.api_key} onChange={e => set("api_key", e.target.value)} />
            <Input placeholder="Marketplace Seller ID" value={form.marketplace_seller_id} onChange={e => set("marketplace_seller_id", e.target.value)} />
            <div className="col-span-3 flex gap-2">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Channel</TableHead><TableHead>Status</TableHead><TableHead>Last Sync</TableHead>
              <TableHead>Orders</TableHead><TableHead>Listings</TableHead><TableHead>Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {Array.isArray(channels) && channels.map((c: any) => (
                <TableRow key={c.id || c.channel_name}>
                  <TableCell>{c.channel_name}</TableCell>
                  <TableCell><Badge variant={c.status === "connected" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                  <TableCell>{c.last_sync?.slice(0,16)}</TableCell>
                  <TableCell>{c.orders_count}</TableCell><TableCell>{c.listings_count}</TableCell>
                  <TableCell><Button size="sm" onClick={() => syncMutation.mutate(c.id)}>Sync Now</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
