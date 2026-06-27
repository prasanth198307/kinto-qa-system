import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, ShoppingCart, Package, RotateCcw, Landmark, Store, BarChart3, Pencil, Trash2, X, TrendingUp, AlertCircle } from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-orange-100 text-orange-700",
};

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card><CardContent className="p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></div>
    </CardContent></Card>
  );
}

function FieldRow({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/ecommerce/stats"] });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Today's Orders" value={stats?.todayOrders ?? 0} icon={ShoppingCart} color="bg-blue-100 text-blue-600" />
        <StatCard title="Monthly Revenue" value={`₹${fmt(stats?.monthlyRevenue)}`} icon={TrendingUp} color="bg-green-100 text-green-600" />
        <StatCard title="Pending Returns" value={stats?.pendingReturns ?? 0} icon={RotateCcw} color="bg-red-100 text-red-600" />
        <StatCard title="Active Channels" value={stats?.activeChannels ?? 0} icon={Store} color="bg-purple-100 text-purple-600" />
      </div>
      {stats?.byChannel?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Channel Performance (This Month)</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byChannel.map((ch: any) => (
                <div key={ch.channel_name} className="flex items-center gap-3">
                  <div className="w-32 text-sm font-medium truncate">{ch.channel_name}</div>
                  <Badge variant="outline" className="text-xs">{ch.platform}</Badge>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, (Number(ch.revenue) / (stats.monthlyRevenue || 1)) * 100)}%` }} />
                  </div>
                  <div className="text-sm text-right w-28">₹{fmt(ch.revenue)} <span className="text-muted-foreground">({ch.orders} orders)</span></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Orders Tab ────────────────────────────────────────────────────────────────
function OrdersTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ items: [] });
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showStatus, setShowStatus] = useState(false);
  const [statusForm, setStatusForm] = useState<any>({});

  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/ecommerce/orders"] });
  const { data: channels = [] } = useQuery<any[]>({ queryKey: ["/api/ecommerce/channels"] });

  const createOrder = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ecommerce/orders", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/orders"] }); setShowForm(false); setForm({ items: [] }); toast({ title: "Order created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PUT", `/api/ecommerce/orders/${id}/status`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/orders"] }); setShowStatus(false); toast({ title: "Status updated" }); },
  });

  const filtered = orders.filter((o: any) => {
    const matchSearch = !search || o.order_number?.toLowerCase().includes(search.toLowerCase()) || o.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || o.status === statusFilter;
    const matchChannel = !channelFilter || o.channel_id?.toString() === channelFilter;
    return matchSearch && matchStatus && matchChannel;
  });

  const addItem = () => setForm((p: any) => ({ ...p, items: [...(p.items || []), { product_name: "", quantity: 1, selling_price: 0, amount: 0 }] }));
  const updateItem = (i: number, field: string, val: any) => setForm((p: any) => { const items = [...p.items]; items[i] = { ...items[i], [field]: val }; if (field === 'quantity' || field === 'selling_price') items[i].amount = (Number(items[i].quantity || 0) * Number(items[i].selling_price || 0)); return { ...p, items, total_amount: items.reduce((s: number, it: any) => s + Number(it.amount || 0), 0) }; });
  const removeItem = (i: number) => setForm((p: any) => ({ ...p, items: p.items.filter((_: any, idx: number) => idx !== i) }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-40"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search orders…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-36"><SelectValue placeholder="All Status" /></SelectTrigger><SelectContent><SelectItem value="">All</SelectItem>{["pending","confirmed","shipped","delivered","cancelled","returned"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Select value={channelFilter} onValueChange={setChannelFilter}><SelectTrigger className="w-36"><SelectValue placeholder="All Channels" /></SelectTrigger><SelectContent><SelectItem value="">All</SelectItem>{channels.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent></Select>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />New Order</Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Order #", "Customer", "Channel", "Amount", "Status", "Date", "Actions"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.slice(0, 100).map((o: any) => (
              <tr key={o.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{o.order_number}</td>
                <td className="px-3 py-2">{o.customer_name}</td>
                <td className="px-3 py-2">{o.channel_name || "—"}</td>
                <td className="px-3 py-2">₹{fmt(o.total_amount)}</td>
                <td className="px-3 py-2"><Badge className={STATUS_COLORS[o.status] || ""}>{o.status}</Badge></td>
                <td className="px-3 py-2">{o.order_date ? new Date(o.order_date).toLocaleDateString("en-IN") : "—"}</td>
                <td className="px-3 py-2"><Button size="sm" variant="outline" onClick={() => { setSelectedOrder(o); setStatusForm({ id: o.id, status: o.status, tracking_number: o.tracking_number, courier: o.courier }); setShowStatus(true); }}>Update</Button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No orders</td></tr>}
          </tbody>
        </table>
      </div>

      {/* New Order */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Order</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Channel"><Select value={form.channel_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, channel_id: v }))}><SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger><SelectContent>{channels.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Channel Order ID"><Input value={form.channel_order_id || ""} onChange={e => setForm((p: any) => ({ ...p, channel_order_id: e.target.value }))} /></FieldRow>
            <FieldRow label="Customer Name *"><Input value={form.customer_name || ""} onChange={e => setForm((p: any) => ({ ...p, customer_name: e.target.value }))} /></FieldRow>
            <FieldRow label="Phone"><Input value={form.customer_phone || ""} onChange={e => setForm((p: any) => ({ ...p, customer_phone: e.target.value }))} /></FieldRow>
            <FieldRow label="Order Date"><Input type="date" value={form.order_date || ""} onChange={e => setForm((p: any) => ({ ...p, order_date: e.target.value }))} /></FieldRow>
            <FieldRow label="Payment"><Select value={form.payment_method || "prepaid"} onValueChange={v => setForm((p: any) => ({ ...p, payment_method: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["prepaid","cod","credit"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FieldRow>
            <div className="col-span-2"><FieldRow label="Shipping Address"><Textarea value={form.shipping_address || ""} onChange={e => setForm((p: any) => ({ ...p, shipping_address: e.target.value }))} rows={2} /></FieldRow></div>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2"><Label className="text-sm font-semibold">Items</Label><Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add Item</Button></div>
            {form.items?.map((it: any, i: number) => (
              <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-end">
                <div className="col-span-2"><Input placeholder="Product name" value={it.product_name || ""} onChange={e => updateItem(i, 'product_name', e.target.value)} /></div>
                <Input placeholder="Qty" type="number" value={it.quantity || ""} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                <Input placeholder="Price" type="number" value={it.selling_price || ""} onChange={e => updateItem(i, 'selling_price', e.target.value)} />
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeItem(i)}><X className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-semibold">Total: ₹{fmt(form.total_amount)}</span>
            <div className="flex gap-2"><Button onClick={() => createOrder.mutate(form)} disabled={!form.customer_name}>Create Order</Button><Button variant="outline" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Status */}
      <Dialog open={showStatus} onOpenChange={v => { if (!v) setShowStatus(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Order Status</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Status"><Select value={statusForm.status || ""} onValueChange={v => setStatusForm((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["pending","confirmed","shipped","delivered","cancelled","returned"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Tracking Number"><Input value={statusForm.tracking_number || ""} onChange={e => setStatusForm((p: any) => ({ ...p, tracking_number: e.target.value }))} /></FieldRow>
            <FieldRow label="Courier"><Input value={statusForm.courier || ""} onChange={e => setStatusForm((p: any) => ({ ...p, courier: e.target.value }))} /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => updateStatus.mutate(statusForm)}>Update</Button><Button variant="outline" onClick={() => setShowStatus(false)}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Listings Tab ──────────────────────────────────────────────────────────────
function ListingsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: listings = [] } = useQuery<any[]>({ queryKey: ["/api/ecommerce/listings"] });
  const { data: channels = [] } = useQuery<any[]>({ queryKey: ["/api/ecommerce/channels"] });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/ecommerce/listings/${editing.id}`, data) : apiRequest("POST", "/api/ecommerce/listings", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/listings"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/ecommerce/listings/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/listings"] }); toast({ title: "Deleted" }); } });

  const filtered = listings.filter((l: any) => l.product_name?.toLowerCase().includes(search.toLowerCase()) || l.sku?.toLowerCase().includes(search.toLowerCase()));
  const openForm = (l?: any) => { setEditing(l || null); setForm(l ? { ...l } : { is_active: true }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search listings…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Listing</Button>
      </div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Product", "SKU", "Channel", "MRP", "Selling Price", "Stock", "Status", ""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((l: any) => (
              <tr key={l.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{l.product_name}</td>
                <td className="px-3 py-2">{l.sku || "—"}</td>
                <td className="px-3 py-2">{l.channel_name || "—"}</td>
                <td className="px-3 py-2">₹{fmt(l.mrp)}</td>
                <td className="px-3 py-2">₹{fmt(l.selling_price)}</td>
                <td className="px-3 py-2"><span className={Number(l.stock_qty) < 5 ? "text-red-600 font-bold" : ""}>{l.stock_qty}</span></td>
                <td className="px-3 py-2"><Badge variant={l.is_active ? "default" : "secondary"}>{l.is_active ? "Active" : "Inactive"}</Badge></td>
                <td className="px-3 py-2"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openForm(l)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => del.mutate(l.id)}><Trash2 className="h-3 w-3" /></Button></div></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">No listings</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Listing" : "Add Listing"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Product Name *"><Input value={form.product_name || ""} onChange={e => setForm((p: any) => ({ ...p, product_name: e.target.value }))} /></FieldRow></div>
            <FieldRow label="SKU"><Input value={form.sku || ""} onChange={e => setForm((p: any) => ({ ...p, sku: e.target.value }))} /></FieldRow>
            <FieldRow label="Channel"><Select value={form.channel_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, channel_id: v }))}><SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger><SelectContent>{channels.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="MRP"><Input type="number" value={form.mrp || ""} onChange={e => setForm((p: any) => ({ ...p, mrp: e.target.value }))} /></FieldRow>
            <FieldRow label="Selling Price"><Input type="number" value={form.selling_price || ""} onChange={e => setForm((p: any) => ({ ...p, selling_price: e.target.value }))} /></FieldRow>
            <FieldRow label="Stock Qty"><Input type="number" value={form.stock_qty || ""} onChange={e => setForm((p: any) => ({ ...p, stock_qty: e.target.value }))} /></FieldRow>
            <FieldRow label="Category"><Input value={form.category || ""} onChange={e => setForm((p: any) => ({ ...p, category: e.target.value }))} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Listing URL"><Input value={form.listing_url || ""} onChange={e => setForm((p: any) => ({ ...p, listing_url: e.target.value }))} /></FieldRow></div>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.product_name}>Save</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Returns Tab ───────────────────────────────────────────────────────────────
function ReturnsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: returns = [] } = useQuery<any[]>({ queryKey: ["/api/ecommerce/returns"] });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/ecommerce/orders"] });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/ecommerce/returns/${editing.id}`, data) : apiRequest("POST", "/api/ecommerce/returns", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/returns"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openForm = (r?: any) => { setEditing(r || null); setForm(r ? { ...r } : { return_type: 'return', status: 'pending' }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Log Return/RTO</Button></div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Return #", "Order #", "Customer", "Type", "Amount", "Status", ""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {returns.map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{r.return_number}</td>
                <td className="px-3 py-2">{r.order_number || "—"}</td>
                <td className="px-3 py-2">{r.customer_name || "—"}</td>
                <td className="px-3 py-2"><Badge variant="outline">{r.return_type}</Badge></td>
                <td className="px-3 py-2">₹{fmt(r.amount)}</td>
                <td className="px-3 py-2"><Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge></td>
                <td className="px-3 py-2"><Button size="sm" variant="ghost" onClick={() => openForm(r)}><Pencil className="h-3 w-3" /></Button></td>
              </tr>
            ))}
            {returns.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No returns</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Return" : "Log Return/RTO"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <FieldRow label="Order"><Select value={form.order_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, order_id: v }))}><SelectTrigger><SelectValue placeholder="Order" /></SelectTrigger><SelectContent>{orders.map((o: any) => <SelectItem key={o.id} value={o.id.toString()}>{o.order_number} — {o.customer_name}</SelectItem>)}</SelectContent></Select></FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Type"><Select value={form.return_type || "return"} onValueChange={v => setForm((p: any) => ({ ...p, return_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["return","rto","exchange","refund"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FieldRow>
              <FieldRow label="Status"><Select value={form.status || "pending"} onValueChange={v => setForm((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["pending","in_transit","received","processed","refunded"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FieldRow>
            </div>
            <FieldRow label="Amount"><Input type="number" value={form.amount || ""} onChange={e => setForm((p: any) => ({ ...p, amount: e.target.value }))} /></FieldRow>
            <FieldRow label="Reason"><Textarea value={form.reason || ""} onChange={e => setForm((p: any) => ({ ...p, reason: e.target.value }))} rows={2} /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.order_id}>Save</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Settlements Tab ───────────────────────────────────────────────────────────
function SettlementsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: settlements = [] } = useQuery<any[]>({ queryKey: ["/api/ecommerce/settlements"] });
  const { data: channels = [] } = useQuery<any[]>({ queryKey: ["/api/ecommerce/channels"] });

  const save = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/ecommerce/settlements", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/settlements"] }); setShowForm(false); setForm({}); toast({ title: "Settlement recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const totalNet = settlements.reduce((s: number, se: any) => s + Number(se.net_amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Total Settled: <span className="font-bold text-foreground">₹{fmt(totalNet)}</span></div>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Record Settlement</Button>
      </div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Settlement #", "Channel", "Date", "Gross", "Commission", "TDS", "Net", "UTR"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {settlements.map((s: any) => (
              <tr key={s.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{s.settlement_number}</td>
                <td className="px-3 py-2">{s.channel_name || "—"}</td>
                <td className="px-3 py-2">{s.settlement_date ? new Date(s.settlement_date).toLocaleDateString("en-IN") : "—"}</td>
                <td className="px-3 py-2">₹{fmt(s.gross_amount)}</td>
                <td className="px-3 py-2 text-red-600">-₹{fmt(s.commission)}</td>
                <td className="px-3 py-2 text-red-600">-₹{fmt(s.tds)}</td>
                <td className="px-3 py-2 font-bold text-green-600">₹{fmt(s.net_amount)}</td>
                <td className="px-3 py-2">{s.utr_number || "—"}</td>
              </tr>
            ))}
            {settlements.length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">No settlements</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record Settlement</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Channel *"><Select value={form.channel_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, channel_id: v }))}><SelectTrigger><SelectValue placeholder="Channel" /></SelectTrigger><SelectContent>{channels.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent></Select></FieldRow></div>
            <FieldRow label="Settlement Date *"><Input type="date" value={form.settlement_date || ""} onChange={e => setForm((p: any) => ({ ...p, settlement_date: e.target.value }))} /></FieldRow>
            <FieldRow label="UTR Number"><Input value={form.utr_number || ""} onChange={e => setForm((p: any) => ({ ...p, utr_number: e.target.value }))} /></FieldRow>
            <FieldRow label="Gross Amount"><Input type="number" value={form.gross_amount || ""} onChange={e => setForm((p: any) => ({ ...p, gross_amount: e.target.value }))} /></FieldRow>
            <FieldRow label="Commission"><Input type="number" value={form.commission || ""} onChange={e => setForm((p: any) => ({ ...p, commission: e.target.value }))} /></FieldRow>
            <FieldRow label="TDS"><Input type="number" value={form.tds || ""} onChange={e => setForm((p: any) => ({ ...p, tds: e.target.value }))} /></FieldRow>
            <FieldRow label="Other Deductions"><Input type="number" value={form.other_deductions || ""} onChange={e => setForm((p: any) => ({ ...p, other_deductions: e.target.value }))} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Net Amount"><Input type="number" value={form.net_amount || ""} onChange={e => setForm((p: any) => ({ ...p, net_amount: e.target.value }))} /></FieldRow></div>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.channel_id || !form.settlement_date}>Save</Button><Button variant="outline" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Channels Tab ──────────────────────────────────────────────────────────────
function ChannelsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: channels = [] } = useQuery<any[]>({ queryKey: ["/api/ecommerce/channels"] });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/ecommerce/channels/${editing.id}`, data) : apiRequest("POST", "/api/ecommerce/channels", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/channels"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/ecommerce/channels/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/ecommerce/channels"] }); toast({ title: "Deleted" }); } });

  const openForm = (c?: any) => { setEditing(c || null); setForm(c ? { ...c } : { platform: 'amazon', is_active: true }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Channel</Button></div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {channels.map((c: any) => (
          <Card key={c.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-1">
                <div><p className="font-medium">{c.name}</p><Badge variant="outline" className="text-xs mt-1">{c.platform}</Badge></div>
                <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openForm(c)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => del.mutate(c.id)}><Trash2 className="h-3 w-3" /></Button></div>
              </div>
              {c.seller_id && <p className="text-xs text-muted-foreground mt-2">Seller ID: {c.seller_id}</p>}
              <Badge className={c.is_active ? "bg-green-100 text-green-700 mt-2" : "bg-gray-100 text-gray-600 mt-2"}>{c.is_active ? "Active" : "Inactive"}</Badge>
            </CardContent>
          </Card>
        ))}
        {channels.length === 0 && <div className="col-span-full text-center py-8 text-muted-foreground">No channels configured</div>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Channel" : "Add Channel"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Name *"><Input value={form.name || ""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></FieldRow>
            <FieldRow label="Platform"><Select value={form.platform || "amazon"} onValueChange={v => setForm((p: any) => ({ ...p, platform: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["amazon","flipkart","meesho","myntra","nykaa","shopify","woocommerce","manual"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Seller ID"><Input value={form.seller_id || ""} onChange={e => setForm((p: any) => ({ ...p, seller_id: e.target.value }))} /></FieldRow>
            <FieldRow label="Marketplace ID"><Input value={form.marketplace_id || ""} onChange={e => setForm((p: any) => ({ ...p, marketplace_id: e.target.value }))} /></FieldRow>
            <div className="col-span-2"><FieldRow label="API Key"><Input value={form.api_key || ""} onChange={e => setForm((p: any) => ({ ...p, api_key: e.target.value }))} /></FieldRow></div>
            <div className="col-span-2"><FieldRow label="API Secret"><Input type="password" value={form.api_secret || ""} onChange={e => setForm((p: any) => ({ ...p, api_secret: e.target.value }))} /></FieldRow></div>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.name}>Save</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EcommercePage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg"><ShoppingCart className="h-6 w-6 text-orange-600" /></div>
        <div><h1 className="text-2xl font-bold">E-commerce Order Sync</h1><p className="text-sm text-muted-foreground">Multi-channel order management</p></div>
      </div>
      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="returns">Returns/RTO</TabsTrigger>
          <TabsTrigger value="settlements">Settlements</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="orders"><OrdersTab /></TabsContent>
        <TabsContent value="listings"><ListingsTab /></TabsContent>
        <TabsContent value="returns"><ReturnsTab /></TabsContent>
        <TabsContent value="settlements"><SettlementsTab /></TabsContent>
        <TabsContent value="channels"><ChannelsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
