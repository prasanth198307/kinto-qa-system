import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ChevronDown, ChevronUp, RefreshCw, Truck } from "lucide-react";

const fmt = (n: number) => "₹" + new Intl.NumberFormat("en-IN").format(n);

type Order = {
  id: number; order_number: string; channel_name: string; platform: string;
  customer_name: string; customer_phone: string; customer_email: string;
  shipping_address: string; order_date: string; total_amount: number;
  shipping_amount: number; commission_amount: number; payment_method: string;
  status: string; tracking_number: string; courier: string;
};

const statusColor: Record<string, [string, string]> = {
  pending: ["#f59e0b", "#fffbeb"], confirmed: ["#3b82f6", "#eff6ff"],
  shipped: ["#8b5cf6", "#f5f3ff"], delivered: ["#22c55e", "#f0fdf4"],
  cancelled: ["#ef4444", "#fef2f2"], returned: ["#f97316", "#fff7ed"],
};
const platColor: Record<string, string> = {
  amazon: "#f97316", flipkart: "#eab308", meesho: "#ec4899", direct: "#3b82f6", manual: "#9ca3af",
};

const Badge = ({ label, color, bg }: { label: string; color: string; bg: string }) => (
  <span style={{ background: bg, color, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>{label}</span>
);

function ShipModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tracking, setTracking] = useState(order.tracking_number ?? "");
  const [courier, setCourier] = useState(order.courier ?? "");
  const [provider, setProvider] = useState("manual");

  const updateStatus = useMutation({
    mutationFn: () => fetch(`/api/ecommerce/orders/${order.id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "shipped", tracking_number: tracking, courier }),
    }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ecommerce-orders"] }); toast({ title: "Order marked shipped" }); onClose(); },
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  const ship = useMutation({
    mutationFn: () => fetch(`/api/ecommerce/orders/${order.id}/ship`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    }).then(r => r.json()),
    onSuccess: (d) => { toast({ title: "Shipment created", description: d.tracking_number ?? "" }); updateStatus.mutate(); },
    onError: () => toast({ title: "Shipment failed", variant: "destructive" }),
  });

  const handle = () => provider === "manual" ? updateStatus.mutate() : ship.mutate();

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700 }}>Mark Shipped — {order.order_number}</h3>
        {[["Tracking Number", tracking, setTracking], ["Courier", courier, setCourier]].map(([label, val, set]) => (
          <div key={label as string} style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>{label as string}</label>
            <input value={val as string} onChange={e => (set as (v: string) => void)(e.target.value)}
              style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 10px", fontSize: 13, boxSizing: "border-box" }} />
          </div>
        ))}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, color: "#6b7280", display: "block", marginBottom: 4 }}>Provider</label>
          <select value={provider} onChange={e => setProvider(e.target.value)}
            style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 10px", fontSize: 13 }}>
            <option value="manual">Manual</option>
            <option value="shiprocket">Shiprocket</option>
            <option value="delhivery">Delhivery</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={handle} disabled={updateStatus.isPending || ship.isPending}
            style={{ padding: "8px 16px", borderRadius: 6, border: "none", background: "#8b5cf6", color: "#fff", fontSize: 13, cursor: "pointer" }}>
            {updateStatus.isPending || ship.isPending ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EcommerceOrders() {
  const { toast } = useToast();
  const [channelId, setChannelId] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [shipOrder, setShipOrder] = useState<Order | null>(null);

  const { data: channelsData } = useQuery<any[]>({
    queryKey: ["ecommerce-channels"],
    queryFn: () => fetch("/api/ecommerce/channels").then(r => r.json()),
  });

  const params = new URLSearchParams();
  if (channelId) params.set("channel_id", channelId);
  if (status) params.set("status", status);

  const { data: ordersData, isLoading } = useQuery<{ orders: Order[] } | Order[]>({
    queryKey: ["ecommerce-orders", channelId, status],
    queryFn: () => fetch(`/api/ecommerce/orders?${params}`).then(r => r.json()),
  });

  const { data: itemsData } = useQuery<any[]>({
    queryKey: ["ecommerce-order-items", expanded],
    queryFn: () => fetch(`/api/ecommerce/orders/${expanded}/items`).then(r => r.json()),
    enabled: expanded !== null,
  });

  const pullMarketplace = useMutation({
    mutationFn: () => fetch("/api/ecommerce/marketplace/orders?channel=all").then(r => r.json()),
    onSuccess: () => toast({ title: "Pulled marketplace orders" }),
    onError: () => toast({ title: "Pull failed", variant: "destructive" }),
  });

  const channels = Array.isArray(channelsData) ? channelsData : [];
  const rawOrders: Order[] = Array.isArray(ordersData) ? ordersData : (ordersData as any)?.orders ?? [];
  const orders = rawOrders.filter(o =>
    !search || o.order_number.toLowerCase().includes(search.toLowerCase()) || o.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  const th = (label: string) => <th style={{ textAlign: "left", padding: "8px 10px", color: "#6b7280", fontWeight: 500, fontSize: 12, whiteSpace: "nowrap" }}>{label}</th>;

  return (
    <div style={{ padding: 24, background: "#f9fafb", minHeight: "100vh", fontFamily: "inherit" }}>
      {shipOrder && <ShipModal order={shipOrder} onClose={() => setShipOrder(null)} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Orders</h1>
        <button onClick={() => pullMarketplace.mutate()} disabled={pullMarketplace.isPending}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "#6366f1", color: "#fff", border: "none", borderRadius: 7, padding: "8px 14px", fontSize: 13, cursor: "pointer" }}>
          <RefreshCw size={14} /> {pullMarketplace.isPending ? "Pulling…" : "Pull from Marketplace"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={channelId} onChange={e => setChannelId(e.target.value)}
          style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 10px", fontSize: 13, background: "#fff" }}>
          <option value="">All Channels</option>
          {channels.map((c: any) => <option key={c.id} value={c.id}>{c.channel_name}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 10px", fontSize: 13, background: "#fff" }}>
          <option value="">All Statuses</option>
          {["pending","confirmed","shipped","delivered","cancelled","returned"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input placeholder="Search order # or customer…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "7px 12px", fontSize: 13, flex: 1, minWidth: 200 }} />
      </div>

      <div style={{ background: "#fff", borderRadius: 10, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>{[th("Order #"), th("Customer"), th("Channel"), th("Amount"), th("Payment"), th("Status"), th("Tracking"), th("Date"), th("Actions")]}</tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>Loading…</td></tr>}
            {!isLoading && orders.length === 0 && <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: "#9ca3af" }}>No orders found</td></tr>}
            {orders.map(o => {
              const [sc, sbg] = statusColor[o.status] ?? ["#9ca3af", "#f3f4f6"];
              const isExp = expanded === o.id;
              return <>
                <tr key={o.id} onClick={() => setExpanded(isExp ? null : o.id)}
                  style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: isExp ? "#fafafa" : undefined }}>
                  <td style={{ padding: "10px" }}><b>{o.order_number}</b></td>
                  <td style={{ padding: "10px" }}>{o.customer_name}</td>
                  <td style={{ padding: "10px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{o.channel_name}</div>
                    <span style={{ background: (platColor[o.platform] ?? "#9ca3af") + "20", color: platColor[o.platform] ?? "#9ca3af", borderRadius: 4, padding: "1px 6px", fontSize: 11 }}>{o.platform}</span>
                  </td>
                  <td style={{ padding: "10px" }}>{fmt(o.total_amount)}</td>
                  <td style={{ padding: "10px", textTransform: "capitalize" }}>{o.payment_method}</td>
                  <td style={{ padding: "10px" }}><Badge label={o.status} color={sc} bg={sbg} /></td>
                  <td style={{ padding: "10px", fontSize: 12, color: "#6b7280" }}>{o.tracking_number || "—"}</td>
                  <td style={{ padding: "10px", fontSize: 12, color: "#6b7280" }}>{new Date(o.order_date).toLocaleDateString("en-IN")}</td>
                  <td style={{ padding: "10px" }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => setShipOrder(o)}
                      style={{ display: "flex", alignItems: "center", gap: 4, background: "#8b5cf620", color: "#8b5cf6", border: "none", borderRadius: 5, padding: "5px 10px", fontSize: 12, cursor: "pointer" }}>
                      <Truck size={12} /> Ship
                    </button>
                  </td>
                </tr>
                {isExp && (
                  <tr key={o.id + "-exp"} style={{ background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
                    <td colSpan={9} style={{ padding: "12px 16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, fontSize: 13 }}>
                        <div><b style={{ color: "#6b7280", fontSize: 11 }}>SHIPPING ADDRESS</b><p style={{ margin: "4px 0 0", lineHeight: 1.5 }}>{o.shipping_address}</p></div>
                        <div><b style={{ color: "#6b7280", fontSize: 11 }}>FINANCIALS</b>
                          <p style={{ margin: "4px 0 0" }}>Shipping: {fmt(o.shipping_amount)}</p>
                          <p style={{ margin: "2px 0 0" }}>Commission: {fmt(o.commission_amount)}</p>
                          <p style={{ margin: "2px 0 0" }}>Payment: {o.payment_method}</p>
                        </div>
                        <div><b style={{ color: "#6b7280", fontSize: 11 }}>ITEMS</b>
                          {Array.isArray(itemsData) ? itemsData.map((it: any, i: number) => (
                            <p key={i} style={{ margin: "4px 0 0" }}>{it.product_name} × {it.quantity} @ {fmt(it.unit_price)}</p>
                          )) : <p style={{ margin: "4px 0 0", color: "#9ca3af" }}>Loading…</p>}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
