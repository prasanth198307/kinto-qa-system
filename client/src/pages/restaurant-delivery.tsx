import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

type DeliveryOrder = {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone?: string;
  delivery_address?: string;
  platform: "direct" | "zomato" | "swiggy" | "dunzo" | "other";
  status: "new" | "confirmed" | "preparing" | "dispatched" | "delivered" | "cancelled";
  total_amount: number;
  delivery_fee?: number;
  notes?: string;
  estimated_delivery_time?: string;
  delivery_boy_name?: string;
  created_at?: string;
  dispatched_at?: string;
};

const PLATFORM_COLORS: Record<string, string> = {
  direct: "bg-blue-100 text-blue-800 border-blue-300",
  zomato: "bg-red-100 text-red-800 border-red-300",
  swiggy: "bg-orange-100 text-orange-800 border-orange-300",
  dunzo: "bg-green-100 text-green-800 border-green-300",
  other: "bg-gray-100 text-gray-800 border-gray-300",
};

const PLATFORM_BADGE_BG: Record<string, string> = {
  direct: "#3B82F6",
  zomato: "#EF4444",
  swiggy: "#F97316",
  dunzo: "#22C55E",
  other: "#6B7280",
};

const STATUS_FLOW: Record<string, { next: string; label: string; color: string } | null> = {
  new: { next: "confirmed", label: "Confirm Order", color: "bg-blue-500 hover:bg-blue-600 text-white" },
  confirmed: { next: "preparing", label: "Start Preparing", color: "bg-yellow-500 hover:bg-yellow-600 text-white" },
  preparing: { next: "dispatched", label: "Mark Dispatched", color: "bg-purple-500 hover:bg-purple-600 text-white" },
  dispatched: { next: "delivered", label: "Mark Delivered", color: "bg-green-500 hover:bg-green-600 text-white" },
  delivered: null,
  cancelled: null,
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  confirmed: "bg-yellow-100 text-yellow-800",
  preparing: "bg-purple-100 text-purple-800",
  dispatched: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const emptyOrder = (): Partial<DeliveryOrder> => ({
  customer_name: "",
  customer_phone: "",
  delivery_address: "",
  platform: "direct",
  total_amount: 0,
  delivery_fee: 40,
  notes: "",
  estimated_delivery_time: "",
});

function timeSince(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m ago`;
}

export default function RestaurantDeliveryPage() {
  const fmt = (n: any) => sym + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;

  const { data: orders = [] } = useQuery<DeliveryOrder[]>({
    queryKey: ["/api/restaurant/delivery-orders"],
    queryFn: () => api("GET", "/api/restaurant/delivery-orders"),
    refetchInterval: 30000,
  });

  // ─── FILTERS ──────────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  // ─── ADD ORDER PANEL ──────────────────────────────────────────────────────
  const [showPanel, setShowPanel] = useState(false);
  const [mainTab, setMainTab] = useState<"delivery" | "whatsapp">("delivery");
  const [confirmingWA, setConfirmingWA] = useState<any>(null);
  const [waItems, setWaItems] = useState<{name:string;price:number;quantity:number}[]>([{name:"",price:0,quantity:1}]);
  const [waOrderType, setWaOrderType] = useState("delivery");
  const [form, setForm] = useState<Partial<DeliveryOrder>>(emptyOrder());

  // ─── DISPATCH MODAL ───────────────────────────────────────────────────────
  const [dispatchOrderId, setDispatchOrderId] = useState<number | null>(null);
  const [deliveryBoyName, setDeliveryBoyName] = useState("");

  // ─── MUTATIONS ────────────────────────────────────────────────────────────
  const createOrder = useMutation({
    mutationFn: (d: Partial<DeliveryOrder>) => api("POST", "/api/restaurant/delivery-orders", d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/restaurant/delivery-orders"] });
      setShowPanel(false);
      setForm(emptyOrder());
      toast({ title: "Delivery order created" });
    },
    onError: () => toast({ title: "Error creating order", variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, extra }: { id: number; status: string; extra?: any }) =>
      api("PUT", `/api/restaurant/delivery-orders/${id}`, { status, ...extra }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/delivery-orders"] }),
  });

  const advanceStatus = (order: DeliveryOrder) => {
    const flow = STATUS_FLOW[order.status];
    if (!flow) return;
    if (order.status === "preparing") {
      setDispatchOrderId(order.id);
      setDeliveryBoyName("");
      return;
    }
    updateStatus.mutate({ id: order.id, status: flow.next });
  };

  const confirmDispatch = () => {
    if (!dispatchOrderId) return;
    updateStatus.mutate({
      id: dispatchOrderId,
      status: "dispatched",
      extra: { delivery_boy_name: deliveryBoyName, dispatched_at: new Date().toISOString() },
    });
    setDispatchOrderId(null);
    setDeliveryBoyName("");
    toast({ title: "Order dispatched" });
  };

  const cancelOrder = (id: number) => {
    if (!confirm("Cancel this order?")) return;
    updateStatus.mutate({ id, status: "cancelled" });
  };

  // ─── FILTER LOGIC ─────────────────────────────────────────────────────────
  const filtered = orders.filter(o => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (platformFilter !== "all" && o.platform !== platformFilter) return false;
    if (search && !o.order_number?.toLowerCase().includes(search.toLowerCase()) && !o.customer_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (dateFilter && o.created_at && !o.created_at.startsWith(dateFilter)) return false;
    return true;
  });

  const statusCounts: Record<string, number> = {
    new: orders.filter(o => o.status === "new").length,
    confirmed: orders.filter(o => o.status === "confirmed").length,
    preparing: orders.filter(o => o.status === "preparing").length,
    dispatched: orders.filter(o => o.status === "dispatched").length,
    delivered: orders.filter(o => o.status === "delivered").length,
  };

  const dispatchedOrders = orders.filter(o => o.status === "dispatched");

  const { data: waOrders = [], refetch: refetchWA } = useQuery({
    queryKey: ["/api/restaurant/whatsapp/pending-orders"],
    queryFn: () => api("GET", "/api/restaurant/whatsapp/pending-orders"),
    refetchInterval: 30000,
    enabled: mainTab === "whatsapp",
  });

  const confirmWAMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api("POST", "/api/restaurant/whatsapp/pending-orders/" + id + "/confirm", data),
    onSuccess: (result) => {
      refetchWA();
      setConfirmingWA(null);
      setWaItems([{name:"",price:0,quantity:1}]);
      toast({ title: "KOT created: " + (result.kot_number || "") });
    },
    onError: () => toast({ title: "Failed to confirm order", variant: "destructive" }),
  });

  const fmt2 = (n: any) => sym + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Delivery Orders</h1>
        <Button onClick={() => { setForm(emptyOrder()); setShowPanel(true); }}>+ New Delivery</Button>
      </div>

      {/* ── SUMMARY CARDS ── */}
      <div className="grid grid-cols-5 gap-3">
        {(["new", "confirmed", "preparing", "dispatched", "delivered"] as const).map(s => (
          <Card
            key={s}
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === s ? "ring-2 ring-primary" : ""}`}
            onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
          >
            <CardContent className="pt-4 pb-3 text-center">
              <div className={`text-3xl font-bold`}>{statusCounts[s]}</div>
              <div className="text-xs text-muted-foreground mt-1 capitalize">{s}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── FILTER BAR ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {(["all", "new", "confirmed", "preparing", "dispatched", "delivered", "cancelled"] as const).map(s => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              className="capitalize text-xs"
            >
              {s}
            </Button>
          ))}
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All Platforms" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {["direct", "zomato", "swiggy", "dunzo", "other"].map(p => (
              <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" className="w-40" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        <Input className="w-48" placeholder="Search order # or name..." value={search} onChange={e => setSearch(e.target.value)} />
        {(statusFilter !== "all" || platformFilter !== "all" || search || dateFilter) && (
          <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setPlatformFilter("all"); setSearch(""); setDateFilter(""); }}>Clear Filters</Button>
        )}
      </div>

      {/* ── ADD ORDER PANEL ── */}
      {showPanel && (
        <Card className="border-2 border-primary/30">
          <CardHeader className="pb-2"><CardTitle className="text-base">New Delivery Order</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium">Customer Name *</label>
              <Input value={form.customer_name || ""} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Full name" />
            </div>
            <div>
              <label className="text-xs font-medium">Phone</label>
              <Input value={form.customer_phone || ""} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} placeholder="+91 98xxx" />
            </div>
            <div>
              <label className="text-xs font-medium">Platform</label>
              <Select value={form.platform || "direct"} onValueChange={v => setForm(f => ({ ...f, platform: v as DeliveryOrder["platform"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["direct", "zomato", "swiggy", "dunzo", "other"].map(p => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-3">
              <label className="text-xs font-medium">Delivery Address</label>
              <textarea className="w-full border rounded px-3 py-2 text-sm min-h-16 bg-background" value={form.delivery_address || ""} onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))} placeholder="Full delivery address..." />
            </div>
            <div>
              <label className="text-xs font-medium">Total Amount (${sym})</label>
              <Input type="number" value={form.total_amount || ""} onChange={e => setForm(f => ({ ...f, total_amount: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-medium">Delivery Fee (${sym})</label>
              <Input type="number" value={form.delivery_fee ?? 40} onChange={e => setForm(f => ({ ...f, delivery_fee: Number(e.target.value) }))} />
            </div>
            <div>
              <label className="text-xs font-medium">Est. Delivery Time</label>
              <Input type="time" value={form.estimated_delivery_time || ""} onChange={e => setForm(f => ({ ...f, estimated_delivery_time: e.target.value }))} />
            </div>
            <div className="col-span-3">
              <label className="text-xs font-medium">Notes</label>
              <textarea className="w-full border rounded px-3 py-2 text-sm min-h-12 bg-background" value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Special instructions, landmarks..." />
            </div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPanel(false)}>Cancel</Button>
              <Button onClick={() => createOrder.mutate(form)} disabled={!form.customer_name}>Create Order</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── DISPATCH MODAL ── */}
      {dispatchOrderId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <Card className="w-96">
            <CardHeader><CardTitle>Assign Delivery Boy</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Enter delivery boy name before dispatching.</p>
              <Input
                placeholder="Delivery boy name"
                value={deliveryBoyName}
                onChange={e => setDeliveryBoyName(e.target.value)}
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setDispatchOrderId(null)}>Cancel</Button>
                <Button onClick={confirmDispatch} disabled={!deliveryBoyName.trim()}>Dispatch</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── ORDER CARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(order => {
          const flow = STATUS_FLOW[order.status];
          return (
            <div key={order.id} className={`border-2 rounded-lg p-4 space-y-3 bg-card ${PLATFORM_COLORS[order.platform]} relative`}>
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded text-white uppercase"
                    style={{ backgroundColor: PLATFORM_BADGE_BG[order.platform] }}
                  >
                    {order.platform}
                  </span>
                  <span className="font-mono font-bold text-sm">{order.order_number}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE_COLORS[order.status]}`}>
                  {order.status}
                </span>
              </div>

              {/* Time */}
              <div className="text-xs text-muted-foreground">{timeSince(order.created_at)}</div>

              {/* Customer */}
              <div className="space-y-1">
                <div className="font-semibold text-sm">{order.customer_name}</div>
                {order.customer_phone && (
                  <button
                    className="text-sm text-blue-600 hover:underline font-mono"
                    onClick={() => { navigator.clipboard.writeText(order.customer_phone!); toast({ title: "Phone copied" }); }}
                    title="Click to copy"
                  >
                    📞 {order.customer_phone}
                  </button>
                )}
              </div>

              {/* Address */}
              {order.delivery_address && (
                <div className="text-xs text-muted-foreground bg-white/50 rounded px-2 py-1 line-clamp-2" title={order.delivery_address}>
                  📍 {order.delivery_address}
                </div>
              )}

              {/* Amount */}
              <div className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-bold">{fmt(order.total_amount)}</span>
                  {order.delivery_fee ? <span className="text-muted-foreground ml-1">+ {fmt(order.delivery_fee)} delivery</span> : null}
                </div>
                {order.estimated_delivery_time && (
                  <span className="text-xs text-muted-foreground">ETA: {order.estimated_delivery_time}</span>
                )}
              </div>

              {/* Notes */}
              {order.notes && (
                <div className="text-xs italic text-muted-foreground border-t pt-2">{order.notes}</div>
              )}

              {/* Delivery boy info (dispatched) */}
              {order.status === "dispatched" && order.delivery_boy_name && (
                <div className="text-xs bg-orange-50 border border-orange-200 rounded px-2 py-1">
                  🛵 {order.delivery_boy_name} · {timeSince(order.dispatched_at)}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1 border-t">
                {flow && (
                  <button
                    className={`flex-1 text-sm py-1.5 rounded font-medium transition-colors ${flow.color}`}
                    onClick={() => advanceStatus(order)}
                    disabled={updateStatus.isPending}
                  >
                    {flow.label}
                  </button>
                )}
                {order.status !== "cancelled" && order.status !== "delivered" && (
                  <button
                    className="px-3 py-1.5 text-sm rounded border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                    onClick={() => cancelOrder(order.id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center text-muted-foreground py-16 text-sm">
            No delivery orders found for current filters.
          </div>
        )}
      </div>

      {/* ── DELIVERY BOY TRACKER ── */}
      {dispatchedOrders.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">🛵 Out for Delivery ({dispatchedOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Delivery Boy</TableHead>
                  <TableHead>Dispatched</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatchedOrders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono font-bold">{o.order_number}</TableCell>
                    <TableCell>
                      <div className="font-medium">{o.customer_name}</div>
                      {o.customer_phone && (
                        <div className="text-xs text-muted-foreground font-mono">{o.customer_phone}</div>
                      )}
                    </TableCell>
                    <TableCell>{o.delivery_boy_name || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{timeSince(o.dispatched_at)}</TableCell>
                    <TableCell>{fmt(o.total_amount)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={o.delivery_address}>{o.delivery_address || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 items-center">
                        {o.customer_phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => { navigator.clipboard.writeText(o.customer_phone!); toast({ title: "Phone copied to clipboard" }); }}
                          >
                            📞 Copy
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="bg-green-500 hover:bg-green-600 text-white"
                          onClick={() => updateStatus.mutate({ id: o.id, status: "delivered" })}
                        >
                          Delivered
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
