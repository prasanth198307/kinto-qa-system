import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = async (m: string, u: string, b?: any) => { const r = await fetch(u, { method: m, headers: {'Content-Type':'application/json'}, body: b ? JSON.stringify(b) : undefined, credentials: 'include' }); if (!r.ok) throw new Error(await r.text()); return r.json(); };
const fmt = (n: any) => Number(n||0).toLocaleString('en-IN', {maximumFractionDigits:2});

export default function EcommerceEnterprisePage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [channelForm, setChannelForm] = useState({ channel_name: "", channel_type: "amazon", api_key: "", seller_id: "" });
  const [returnForm, setReturnForm] = useState({ order_id: "", reason: "", refund_amount: "" });
  const [reportType, setReportType] = useState("channel-performance");
  const [reportData, setReportData] = useState<any[]>([]);
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");

  const [syncResult, setSyncResult] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  const { data: channels = [] } = useQuery({ queryKey: ['/api/ecommerce/channels'], queryFn: () => api('GET', '/api/ecommerce/channels') });
  const { data: orders = [] } = useQuery({ queryKey: ['/api/ecommerce/orders'], queryFn: () => api('GET', '/api/ecommerce/orders') });
  const { data: shipments = [] } = useQuery({ queryKey: ['/api/ecommerce/shipments'], queryFn: () => api('GET', '/api/ecommerce/shipments') });
  const { data: inventorySync = [] } = useQuery({ queryKey: ['/api/ecommerce/inventory/sync-status'], queryFn: () => api('GET', '/api/ecommerce/inventory/sync-status') });
  const { data: mktOrders = [] } = useQuery({ queryKey: ['/api/ecommerce/marketplace/orders'], queryFn: () => api('GET', '/api/ecommerce/marketplace/orders') });

  const syncNow = async () => { setSyncing(true); try { const r = await api('POST', '/api/ecommerce/marketplace/sync'); setSyncResult(r); qc.invalidateQueries({ queryKey: ['/api/ecommerce/marketplace/orders'] }); } catch(e:any) { setSyncResult({error:e.message}); } setSyncing(false); };
  const { data: returns = [] } = useQuery({ queryKey: ['/api/ecommerce/returns'], queryFn: () => api('GET', '/api/ecommerce/returns') });
  const { data: reviews = [] } = useQuery({ queryKey: ['/api/ecommerce/reviews'], queryFn: () => api('GET', '/api/ecommerce/reviews') });
  const { data: adSpend = [] } = useQuery({ queryKey: ['/api/ecommerce/marketing/ad-spend'], queryFn: () => api('GET', '/api/ecommerce/marketing/ad-spend') });

  const addChannel = useMutation({ mutationFn: (d: any) => api('POST', '/api/ecommerce/channels', d), onSuccess: () => qc.invalidateQueries({ queryKey: ['/api/ecommerce/channels'] }) });
  const processReturn = useMutation({ mutationFn: (d: any) => api('POST', '/api/ecommerce/returns/process', d), onSuccess: () => { qc.invalidateQueries({ queryKey: ['/api/ecommerce/returns'] }); alert('Return processed!'); } });
  const fetchReport = async () => { const r = await api('GET', `/api/ecommerce/reports/${reportType}?from=${from}&to=${to}`); setReportData(r); };

  const channelColors: Record<string,string> = { amazon: 'bg-orange-100 text-orange-800', flipkart: 'bg-blue-100 text-blue-800', shopify: 'bg-green-100 text-green-800', meesho: 'bg-purple-100 text-purple-800' };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">E-Commerce / D2C Enterprise</h1>
      <Tabs defaultValue="channels">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace Sync</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="channels">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Connected Channels</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(channels as any[]).map((c:any)=><div key={c.id} className="flex items-center justify-between p-3 border rounded">
                <div><span className={`px-2 py-0.5 rounded text-xs font-medium ${channelColors[c.channel_type]||'bg-gray-100'}`}>{c.channel_type?.toUpperCase()}</span><span className="ml-2 text-sm">{c.channel_name}</span></div>
                <div className="flex gap-2"><Badge variant={c.is_active?'default':'secondary'}>{c.is_active?'Active':'Inactive'}</Badge>
                <Button size="sm" variant="outline" onClick={()=>api('POST',`/api/ecommerce/channels/${c.id}/sync`).then(r=>alert(`Synced ${r.synced_count||0} products!`))}>Sync</Button></div>
              </div>)}
              {(channels as any[]).length===0&&<p className="text-gray-400 text-center py-4">No channels connected</p>}
              <div className="space-y-2 border-t pt-3">
                <Input placeholder="Channel name" value={channelForm.channel_name} onChange={e=>setChannelForm({...channelForm,channel_name:e.target.value})} />
                <select className="border rounded px-2 py-1 w-full text-sm" value={channelForm.channel_type} onChange={e=>setChannelForm({...channelForm,channel_type:e.target.value})}>
                  {['amazon','flipkart','meesho','shopify','website','instagram','jiomart'].map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
                </select>
                <Input placeholder="API Key / Token" value={channelForm.api_key} onChange={e=>setChannelForm({...channelForm,api_key:e.target.value})} />
                <Input placeholder="Seller ID" value={channelForm.seller_id} onChange={e=>setChannelForm({...channelForm,seller_id:e.target.value})} />
                <Button onClick={()=>addChannel.mutate(channelForm)}>Connect Channel</Button>
              </div>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Channel Summary</CardTitle></CardHeader>
            <CardContent>
              {(channels as any[]).length===0?<p className="text-gray-400 text-sm text-center py-8">Connect channels to see performance</p>:
              <div className="space-y-3">
                {(channels as any[]).map((c:any)=><div key={c.id} className="p-3 bg-gray-50 rounded"><div className="font-medium text-sm">{c.channel_name}</div><div className="flex gap-4 mt-1 text-xs text-gray-600"><span>Orders: {c.order_count||0}</span><span>Revenue: {sym}{fmt(c.revenue||0)}</span></div></div>)}
              </div>}
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="marketplace">
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Marketplace Sync</CardTitle>
                <Button onClick={syncNow} disabled={syncing}>{syncing ? "Syncing..." : "Sync Now"}</Button>
              </CardHeader>
              <CardContent>
                {syncResult && <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded text-sm">
                  Last sync: Amazon {syncResult.amazon||0} | Flipkart {syncResult.flipkart||0} | Meesho {syncResult.meesho||0} | Total {syncResult.total||0} orders
                </div>}
                <div className="grid grid-cols-3 gap-4">
                  {['amazon','flipkart','meesho'].map(ch => {
                    const count = (mktOrders as any[]).filter((o:any) => o.channel === ch || (o as any).platform === ch).length;
                    const colors: Record<string,string> = {amazon:'text-orange-600',flipkart:'text-blue-600',meesho:'text-purple-600'};
                    return <Card key={ch} className="border">
                      <CardContent className="pt-4">
                        <p className={`text-lg font-bold capitalize ${colors[ch]}`}>{ch}</p>
                        <p className="text-2xl font-bold mt-1">{count}</p>
                        <p className="text-xs text-muted-foreground">orders (last 30d)</p>
                      </CardContent>
                    </Card>;
                  })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Inventory Sync Status</CardTitle></CardHeader>
              <CardContent>
                <Table><TableHeader><TableRow><TableHead>SKU</TableHead><TableHead>Available Qty</TableHead><TableHead>Reserved</TableHead><TableHead>Last Synced</TableHead></TableRow></TableHeader>
                <TableBody>{(inventorySync as any[]).map((s:any) => <TableRow key={s.id}><TableCell className="font-mono text-xs">{s.sku}</TableCell><TableCell>{s.available_qty}</TableCell><TableCell>{s.reserved_qty||0}</TableCell><TableCell>{s.last_synced ? new Date(s.last_synced).toLocaleString() : '—'}</TableCell></TableRow>)}</TableBody></Table>
                {(inventorySync as any[]).length === 0 && <p className="text-center text-gray-400 py-4">No inventory sync data. Push inventory to sync.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <Card><CardHeader><CardTitle>Multi-Channel Orders</CardTitle></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Order ID</TableHead><TableHead>Channel</TableHead><TableHead>Customer</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
            <TableBody>{(orders as any[]).map((o:any)=><TableRow key={o.id}><TableCell className="font-mono text-xs">{o.platform_order_id||o.id?.slice(0,8)}</TableCell><TableCell><span className={`px-1 py-0.5 rounded text-xs ${channelColors[o.channel_type]||'bg-gray-100'}`}>{o.channel_type||'direct'}</span></TableCell><TableCell>{o.customer_name}</TableCell><TableCell>{sym}{fmt(o.total_amount)}</TableCell><TableCell><Badge>{o.status}</Badge></TableCell><TableCell><Button size="sm" variant="outline" onClick={()=>api('POST',`/api/ecommerce/orders/${o.id}/allocate-stock`).then(()=>qc.invalidateQueries({queryKey:['/api/ecommerce/orders']}))}>Allocate</Button></TableCell></TableRow>)}</TableBody></Table>
            {(orders as any[]).length===0&&<p className="text-center text-gray-400 py-8">No orders. Sync your channels to pull orders.</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="shipments">
          <Card><CardHeader><CardTitle>Shipments & Tracking</CardTitle></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Provider</TableHead><TableHead>Tracking No</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
            <TableBody>{(shipments as any[]).map((s:any)=><TableRow key={s.id}><TableCell className="font-mono text-xs">{s.order_number||s.order_id}</TableCell><TableCell>{s.customer_name||'—'}</TableCell><TableCell><Badge variant="outline">{s.provider}</Badge></TableCell><TableCell className="font-mono text-xs">{s.tracking_no}</TableCell><TableCell><Badge variant={s.status==='delivered'?'default':s.status==='created'?'secondary':'outline'}>{s.status}</Badge></TableCell><TableCell className="text-xs">{s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}</TableCell></TableRow>)}</TableBody></Table>
            {(shipments as any[]).length===0&&<p className="text-center text-gray-400 py-8">No shipments yet. Ship orders from the Orders tab.</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="returns">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle>Process Return</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Order ID</Label><Input value={returnForm.order_id} onChange={e=>setReturnForm({...returnForm,order_id:e.target.value})} /></div>
              <div><Label>Return Reason</Label><Input value={returnForm.reason} onChange={e=>setReturnForm({...returnForm,reason:e.target.value})} /></div>
              <div><Label>Refund Amount (${sym})</Label><Input type="number" value={returnForm.refund_amount} onChange={e=>setReturnForm({...returnForm,refund_amount:e.target.value})} /></div>
              <Button onClick={()=>processReturn.mutate({...returnForm,refund_amount:Number(returnForm.refund_amount)})}>Process Return</Button>
            </CardContent></Card>
            <Card><CardHeader><CardTitle>Returns</CardTitle></CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Reason</TableHead><TableHead>Refund</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>{(returns as any[]).map((r:any)=><TableRow key={r.id}><TableCell>{r.order_id?.slice(0,8)}</TableCell><TableCell>{r.reason}</TableCell><TableCell>{sym}{fmt(r.refund_amount)}</TableCell><TableCell><Badge>{r.status}</Badge></TableCell></TableRow>)}</TableBody></Table>
              {(returns as any[]).length===0&&<p className="text-center text-gray-400 py-4">No returns</p>}
            </CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="reviews">
          <Card><CardHeader><CardTitle>Customer Reviews</CardTitle></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Rating</TableHead><TableHead>Channel</TableHead><TableHead>Review</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>{(reviews as any[]).map((r:any)=><TableRow key={r.id}><TableCell>{r.product_name}</TableCell><TableCell>{'⭐'.repeat(r.rating||0)} {r.rating}/5</TableCell><TableCell><span className={`px-1 py-0.5 rounded text-xs ${channelColors[r.channel]||'bg-gray-100'}`}>{r.channel}</span></TableCell><TableCell className="max-w-xs truncate">{r.review_text}</TableCell><TableCell>{r.review_date?.slice(0,10)}</TableCell></TableRow>)}</TableBody></Table>
            {(reviews as any[]).length===0&&<p className="text-center text-gray-400 py-8">No reviews synced yet</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="marketing">
          <Card><CardHeader><CardTitle>Ad Spend & ROAS</CardTitle></CardHeader>
          <CardContent>
            <Table><TableHeader><TableRow><TableHead>Platform</TableHead><TableHead>Campaign</TableHead><TableHead>Spend</TableHead><TableHead>Revenue</TableHead><TableHead>ROAS</TableHead></TableRow></TableHeader>
            <TableBody>{(adSpend as any[]).map((a:any)=><TableRow key={a.id}><TableCell>{a.platform}</TableCell><TableCell>{a.campaign_name}</TableCell><TableCell>{sym}{fmt(a.spend)}</TableCell><TableCell>{sym}{fmt(a.revenue)}</TableCell><TableCell><Badge variant={Number(a.revenue)/Number(a.spend||1)>=2?'default':'destructive'}>{(Number(a.revenue)/Number(a.spend||1)).toFixed(1)}x</Badge></TableCell></TableRow>)}</TableBody></Table>
            {(adSpend as any[]).length===0&&<p className="text-center text-gray-400 py-8">No ad spend tracked. Add campaigns to track ROAS.</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card><CardHeader><CardTitle>E-Commerce Reports</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap items-end">
              <div><Label>Report</Label>
                <select className="border rounded px-2 py-1 text-sm" value={reportType} onChange={e=>setReportType(e.target.value)}>
                  {['channel-performance','return-rate','product-wise','fulfillment-tat','customer-ltv'].map(r=><option key={r} value={r}>{r.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                </select>
              </div>
              <div><Label>From</Label><Input type="date" value={from} onChange={e=>setFrom(e.target.value)} className="w-36" /></div>
              <div><Label>To</Label><Input type="date" value={to} onChange={e=>setTo(e.target.value)} className="w-36" /></div>
              <Button onClick={fetchReport}>Generate</Button>
            </div>
            {reportData.length>0&&<div className="overflow-auto max-h-96">
              <Table><TableHeader><TableRow>{Object.keys(reportData[0]).map(k=><TableHead key={k}>{k}</TableHead>)}</TableRow></TableHeader>
              <TableBody>{reportData.map((row,i)=><TableRow key={i}>{Object.values(row).map((v:any,j)=><TableCell key={j}>{String(v??'')}</TableCell>)}</TableRow>)}</TableBody></Table>
            </div>}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
