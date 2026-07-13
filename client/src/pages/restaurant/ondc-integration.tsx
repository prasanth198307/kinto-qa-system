import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, CheckCircle, Package, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700", accepted: "bg-blue-100 text-blue-700",
  preparing: "bg-purple-100 text-purple-700", ready: "bg-indigo-100 text-indigo-700",
  dispatched: "bg-orange-100 text-orange-700", delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

function SetupTab() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { data: configs = [] } = useQuery<any[]>({ queryKey: ["aggregator-configs"], queryFn: () => fetch("/api/aggregators/config").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const ondcConfig = (configs as any[]).find((c: any) => c.platform === "ondc") || {};
  const [form, setForm] = useState({ subscriber_id: "", signing_public_key: "", bap_endpoint: "", registry_url: "https://preprod.registry.ondc.org/ondc", is_enabled: false });

  useEffect(() => {
    if (ondcConfig.api_key) {
      try { const parsed = JSON.parse(ondcConfig.api_key); setForm(f => ({ ...f, ...parsed })); } catch {}
    }
    if (ondcConfig.is_enabled !== undefined) setForm(f => ({ ...f, is_enabled: !!ondcConfig.is_enabled }));
  }, [ondcConfig.api_key, ondcConfig.is_enabled]);

  const saveMut = useMutation({
    mutationFn: () => api("POST", "/api/aggregators/config", { platform: "ondc", api_key: JSON.stringify({ subscriber_id: form.subscriber_id, signing_public_key: form.signing_public_key, bap_endpoint: form.bap_endpoint, registry_url: form.registry_url }), is_enabled: form.is_enabled ? 1 : 0 }),
    onSuccess: () => { toast({ title: "ONDC configuration saved" }); qc.invalidateQueries({ queryKey: ["aggregator-configs"] }); },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const toggleMut = useMutation({
    mutationFn: (enabled: boolean) => api("PUT", "/api/aggregators/config/ondc/toggle", { is_enabled: enabled ? 1 : 0 }),
    onSuccess: () => { toast({ title: "ONDC toggled" }); qc.invalidateQueries({ queryKey: ["aggregator-configs"] }); },
  });

  return (
    <div className="space-y-4">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
        <p className="font-semibold mb-1">ONDC (Open Network for Digital Commerce)</p>
        <p>India's govt-backed zero-commission food ordering network. Register as a Seller App (BPP) to receive orders from Paytm, PhonePe, Snapdeal, and other ONDC buyer apps without paying commissions. Webhook: <code className="bg-orange-100 px-1 rounded">/api/aggregators/ondc/webhook</code></p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">ONDC Seller App (BPP) Configuration</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{form.is_enabled ? "Active" : "Inactive"}</span>
            <Switch checked={form.is_enabled} onCheckedChange={v => { setForm(f => ({ ...f, is_enabled: v })); toggleMut.mutate(v); }} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Subscriber ID (ONDC domain)</Label><Input value={form.subscriber_id} onChange={e => setForm(f => ({ ...f, subscriber_id: e.target.value }))} placeholder="yourbrand.com" /></div>
            <div><Label>Registry URL</Label><Input value={form.registry_url} onChange={e => setForm(f => ({ ...f, registry_url: e.target.value }))} /></div>
            <div><Label>BAP Endpoint (buyer app callback)</Label><Input value={form.bap_endpoint} onChange={e => setForm(f => ({ ...f, bap_endpoint: e.target.value }))} placeholder="https://bap.paytm.com/api" /></div>
            <div><Label>Signing Public Key (Ed25519 Base64)</Label><Input value={form.signing_public_key} onChange={e => setForm(f => ({ ...f, signing_public_key: e.target.value }))} placeholder="Base64-encoded public key" /></div>
          </div>
          <div className="bg-muted/30 rounded p-3 text-xs space-y-1">
            <p className="font-medium">BPP Endpoints (share with ONDC registry):</p>
            <p>Search: <code>{window.location.origin}/api/aggregators/ondc/on_search</code></p>
            <p>Select: <code>{window.location.origin}/api/aggregators/ondc/on_select</code></p>
            <p>Confirm: <code>{window.location.origin}/api/aggregators/ondc/on_confirm</code></p>
            <p>Status: <code>{window.location.origin}/api/aggregators/ondc/on_status</code></p>
            <p>Cancel: <code>{window.location.origin}/api/aggregators/ondc/on_cancel</code></p>
          </div>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Save Configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CatalogSyncTab() {
  const { currency_symbol: sym } = useTenantConfig();
  const { toast } = useToast();
  const { data: catalog, isLoading, refetch } = useQuery<any>({ queryKey: ["ondc-catalog"], queryFn: () => fetch("/api/aggregators/ondc/catalog").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }), enabled: false });
  const items = catalog?.message?.catalog?.["bpp/providers"]?.[0]?.items || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">ONDC Catalog (Beckn Format)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Your menu items are auto-mapped to ONDC Beckn catalog format. Click "Fetch Catalog" to preview what the network sees.</p>
          {items.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-3 text-center"><p className="text-xl font-bold">{items.length}</p><p className="text-xs text-muted-foreground">Items Published</p></Card>
              <Card className="p-3 text-center"><p className="text-xl font-bold text-green-600">{items.filter((i: any) => i["@ondc/org/available_on_cod"]).length}</p><p className="text-xs text-muted-foreground">COD Enabled</p></Card>
              <Card className="p-3 text-center"><p className="text-xl font-bold">{catalog?.message?.catalog?.["bpp/providers"]?.[0]?.descriptor?.name || "—"}</p><p className="text-xs text-muted-foreground">Restaurant Name</p></Card>
            </div>
          )}
          <Button onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />} Fetch Catalog
          </Button>
          {items.length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Price (${sym})</TableHead><TableHead>Category</TableHead><TableHead>Ship Time</TableHead></TableRow></TableHeader>
              <TableBody>
                {items.slice(0, 20).map((item: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{item.descriptor?.name}</TableCell>
                    <TableCell className="text-right">{item.price?.value}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.category_id || "—"}</TableCell>
                    <TableCell className="text-xs">{item["@ondc/org/time_to_ship"] || "PT30M"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function OrderManagementTab() {
  const { currency_symbol: sym } = useTenantConfig();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: orders = [], isLoading, refetch } = useQuery<any[]>({ queryKey: ["ondc-orders"], queryFn: () => fetch("/api/aggregators/ondc/orders").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }).catch(() => []) });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => fetch(`/api/aggregators/orders/${id}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => { toast({ title: "Order status updated" }); qc.invalidateQueries({ queryKey: ["ondc-orders"] }); },
  });

  const rows: any[] = Array.isArray(orders) ? orders : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rows.length} ONDC orders — zero commission, paid directly via buyer app</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}><RefreshCw className="h-3 w-3 mr-1" />Refresh</Button>
      </div>
      <Table>
        <TableHeader><TableRow><TableHead>Order No</TableHead><TableHead>Customer</TableHead><TableHead>Phone</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead></TableHead></TableRow></TableHeader>
        <TableBody>
          {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></TableCell></TableRow>}
          {rows.map((o: any) => (
            <TableRow key={o.id}>
              <TableCell className="font-mono text-xs">{o.order_number || o.id}</TableCell>
              <TableCell>{o.customer_name || "—"}</TableCell>
              <TableCell className="text-xs">{o.customer_phone || "—"}</TableCell>
              <TableCell className="text-right">{sym}{Number(o.grand_total || 0).toFixed(0)}</TableCell>
              <TableCell><Badge className={`text-xs ${STATUS_COLOR[o.status] || "bg-gray-100"}`}>{o.status}</Badge></TableCell>
              <TableCell className="text-xs">{o.created_at ? new Date(o.created_at).toLocaleString("en-IN") : "—"}</TableCell>
              <TableCell>
                {o.status === "pending" && (
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7 text-xs bg-green-600 hover:bg-green-700" onClick={() => updateStatus.mutate({ id: o.id, status: "accepted" })}>Accept</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => updateStatus.mutate({ id: o.id, status: "cancelled" })}>Reject</Button>
                  </div>
                )}
                {o.status === "accepted" && <Button size="sm" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: o.id, status: "preparing" })}>Mark Preparing</Button>}
                {o.status === "preparing" && <Button size="sm" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: o.id, status: "ready" })}>Ready</Button>}
                {o.status === "ready" && <Button size="sm" className="h-7 text-xs" onClick={() => updateStatus.mutate({ id: o.id, status: "delivered" })}>Delivered</Button>}
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No ONDC orders yet. Configure your BPP settings and register with the ONDC network.</TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );
}

function AnalyticsTab() {
  const { currency_symbol: sym } = useTenantConfig();
  const { data: stats, isLoading } = useQuery<any>({ queryKey: ["ondc-analytics"], queryFn: () => fetch("/api/aggregators/ondc/analytics").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }).catch(() => ({})) });
  const ondcPct = stats?.ondc_pct || 0;
  const directPct = stats?.total_orders > 0 ? Math.round((stats?.direct_orders / stats?.total_orders) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">ONDC Revenue</p><p className="text-2xl font-bold text-orange-700">{sym}{Number(stats?.ondc_revenue || 0).toLocaleString("en-IN")}</p><p className="text-xs text-muted-foreground">{stats?.ondc_orders || 0} orders · 0% commission</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Direct Revenue</p><p className="text-2xl font-bold">{sym}{Number(stats?.direct_revenue || 0).toLocaleString("en-IN")}</p><p className="text-xs text-muted-foreground">{stats?.direct_orders || 0} orders</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">ONDC Share</p><p className="text-2xl font-bold text-blue-600">{ondcPct}%</p><p className="text-xs text-muted-foreground">of total orders</p></CardContent></Card>
      </div>
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1"><span>ONDC Orders ({ondcPct}%)</span><span className="font-medium">{stats?.ondc_orders || 0}</span></div>
            <div className="w-full bg-muted rounded-full h-5 overflow-hidden"><div className="bg-orange-500 h-full rounded-full transition-all" style={{ width: `${ondcPct}%` }} /></div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1"><span>Direct Orders ({directPct}%)</span><span className="font-medium">{stats?.direct_orders || 0}</span></div>
            <div className="w-full bg-muted rounded-full h-5 overflow-hidden"><div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${directPct}%` }} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Commission saved via ONDC: ~{sym}{Math.round((stats?.ondc_revenue || 0) * 0.20).toLocaleString("en-IN")} (vs 20% aggregator fee)</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs font-medium mb-2">ONDC Network Links</p>
          <div className="flex gap-2 flex-wrap">
            {[["ONDC Registry (Preprod)", "https://preprod.registry.ondc.org/ondc"], ["ONDC Documentation", "https://docs.ondc.org"], ["ONDC Seller Registration", "https://ondc.org/network-participant-registration"]].map(([label, url]) => (
              <Button key={label} size="sm" variant="outline" className="text-xs" onClick={() => window.open(url, "_blank")}>
                {label} <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OndcIntegrationPage() {
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">ONDC Seller Integration</h1>
        <p className="text-muted-foreground text-sm">Open Network for Digital Commerce — zero-commission orders via Beckn BPP protocol · Paytm, PhonePe, Snapdeal buyer apps</p>
      </div>
      <Tabs defaultValue="setup">
        <TabsList>
          <TabsTrigger value="setup">BPP Setup</TabsTrigger>
          <TabsTrigger value="catalog">Catalog (Beckn)</TabsTrigger>
          <TabsTrigger value="orders">Live Orders</TabsTrigger>
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
