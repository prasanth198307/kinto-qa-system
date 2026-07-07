import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, RefreshCw, Globe, Trash2 } from "lucide-react";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());
const CHANNELS = ["website", "amazon", "flipkart", "meesho", "jiomart", "ondc"];
const BLANK = { product_id: "", channel: "website", channel_sku: "", channel_price: "", buffer_qty: "0" };

export default function RetailOmniChannelPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(BLANK);

  const { data: listings = [] } = useQuery<any[]>({ queryKey: ["retail-omni"], queryFn: () => api("GET", "/api/pos/omni-channel/listings") });
  const { data: syncLog = [] } = useQuery<any[]>({ queryKey: ["retail-omni-log"], queryFn: () => api("GET", "/api/pos/omni-channel/sync-log") });

  const addMut = useMutation({
    mutationFn: () => api("POST", "/api/pos/omni-channel/listings", { ...form, product_id: Number(form.product_id), channel_price: Number(form.channel_price || 0), buffer_qty: Number(form.buffer_qty || 0) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["retail-omni"] }); setOpen(false); setForm(BLANK); toast({ title: "Channel listing added" }); },
  });
  const syncMut = useMutation({
    mutationFn: () => api("POST", "/api/pos/omni-channel/sync", {}),
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["retail-omni"] }); qc.invalidateQueries({ queryKey: ["retail-omni-log"] });
      toast({ title: `Synced ${d.products_synced} listings across ${Object.keys(d.channels || {}).length} channels` });
    },
  });
  const removeMut = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/pos/omni-channel/listings/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["retail-omni"] }); toast({ title: "Listing removed" }); },
  });

  const byChannel: Record<string, number> = {};
  listings.forEach((l: any) => { byChannel[l.channel] = (byChannel[l.channel] || 0) + 1; });
  const outOfSync = listings.filter((l: any) => Math.max(0, Number(l.store_stock) - Number(l.buffer_qty)) !== Number(l.online_stock)).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Globe className="w-6 h-6 text-blue-600" /><h1 className="text-2xl font-bold">Omni-Channel Stock Sync</h1></div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" />Add Listing</Button>
          <Button size="sm" onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
            <RefreshCw className={`w-4 h-4 mr-1 ${syncMut.isPending ? "animate-spin" : ""}`} />{syncMut.isPending ? "Syncing..." : "Sync All Channels"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Total Listings</div><div className="text-xl font-bold">{listings.length}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Channels</div><div className="text-xl font-bold">{Object.keys(byChannel).length}</div></CardContent></Card>
        <Card className={outOfSync ? "border-amber-300" : ""}><CardContent className="p-3"><div className="text-xs text-muted-foreground">Out of Sync</div><div className={`text-xl font-bold ${outOfSync ? "text-amber-600" : "text-green-600"}`}>{outOfSync}</div></CardContent></Card>
        <Card><CardContent className="p-3"><div className="text-xs text-muted-foreground">Last Sync</div><div className="text-sm font-semibold">{syncLog[0] ? String(syncLog[0].synced_at).slice(0, 16).replace("T", " ") : "Never"}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="listings">
        <TabsList><TabsTrigger value="listings">Listings</TabsTrigger><TabsTrigger value="log">Sync Log</TabsTrigger></TabsList>

        <TabsContent value="listings">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Product</TableHead><TableHead>Channel</TableHead><TableHead>Channel SKU</TableHead><TableHead>Price</TableHead>
                <TableHead>Store Stock</TableHead><TableHead>Buffer</TableHead><TableHead>Online Stock</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {listings.map((l: any) => {
                  const expected = Math.max(0, Number(l.store_stock) - Number(l.buffer_qty));
                  const inSync = expected === Number(l.online_stock);
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.product_name || `#${l.product_id}`}</TableCell>
                      <TableCell><Badge variant="outline" className="uppercase text-xs">{l.channel}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{l.channel_sku || "—"}</TableCell>
                      <TableCell>₹{Number(l.channel_price)}</TableCell>
                      <TableCell>{Number(l.store_stock)}</TableCell>
                      <TableCell>{Number(l.buffer_qty)}</TableCell>
                      <TableCell className="font-semibold">{Number(l.online_stock)}</TableCell>
                      <TableCell><Badge variant={inSync ? "default" : "destructive"}>{inSync ? "In Sync" : "Out of Sync"}</Badge></TableCell>
                      <TableCell><Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeMut.mutate(l.id)}><Trash2 className="w-3 h-3" /></Button></TableCell>
                    </TableRow>
                  );
                })}
                {!listings.length && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No channel listings — add products to sell online</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="log">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Channel</TableHead><TableHead>Direction</TableHead><TableHead>Products</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {syncLog.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">{String(s.synced_at).slice(0, 19).replace("T", " ")}</TableCell>
                    <TableCell className="uppercase text-sm">{s.channel}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{s.direction === "push" ? "Store → Online" : "Online → Store"}</Badge></TableCell>
                    <TableCell>{s.products_synced}</TableCell>
                    <TableCell><Badge variant={s.status === "success" ? "default" : "destructive"}>{s.status}</Badge></TableCell>
                  </TableRow>
                ))}
                {!syncLog.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No syncs yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Channel Listing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Product ID</Label><Input type="number" value={form.product_id} onChange={e => setForm((p: any) => ({ ...p, product_id: e.target.value }))} className="h-8" /></div>
            <div><Label className="text-xs">Channel</Label>
              <Select value={form.channel} onValueChange={v => setForm((p: any) => ({ ...p, channel: v }))}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{CHANNELS.map(c => <SelectItem key={c} value={c}>{c.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Channel SKU</Label><Input value={form.channel_sku} onChange={e => setForm((p: any) => ({ ...p, channel_sku: e.target.value }))} className="h-8" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Channel Price (₹)</Label><Input type="number" value={form.channel_price} onChange={e => setForm((p: any) => ({ ...p, channel_price: e.target.value }))} className="h-8" /></div>
              <div><Label className="text-xs">Buffer Qty</Label><Input type="number" value={form.buffer_qty} onChange={e => setForm((p: any) => ({ ...p, buffer_qty: e.target.value }))} className="h-8" /></div>
            </div>
            <p className="text-xs text-muted-foreground">Buffer qty is held back from online listing to protect walk-in sales.</p>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => addMut.mutate()} disabled={addMut.isPending || !form.product_id}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
