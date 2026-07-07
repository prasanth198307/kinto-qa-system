import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, IndianRupee, RotateCcw, Store, RefreshCw, Upload } from "lucide-react";

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);
const fmtCur = (n: number) => "₹" + fmt(n);

type Stats = {
  todayOrders: number;
  monthlyRevenue: number;
  pendingReturns: number;
  activeChannels: number;
  byChannel: { channel_name: string; platform: string; orders: number; revenue: number }[];
};

type Order = {
  id: number;
  order_number: string;
  customer_name: string;
  channel_name: string;
  total_amount: number;
  status: string;
  order_date: string;
};

const statusColor: Record<string, string> = {
  pending: "#f59e0b", confirmed: "#3b82f6", shipped: "#8b5cf6",
  delivered: "#22c55e", cancelled: "#ef4444", returned: "#f97316",
};

const card = (label: string, value: string | number, Icon: React.ElementType, color: string) => (
  <div key={label} style={{ background: "#fff", borderRadius: 10, padding: "20px 24px", flex: 1, minWidth: 180, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 16 }}>
    <div style={{ background: color + "20", borderRadius: 8, padding: 10 }}>
      <Icon size={22} color={color} />
    </div>
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#111" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{label}</div>
    </div>
  </div>
);

export default function EcommerceDashboard() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["ecommerce-stats"],
    queryFn: () => fetch("/api/ecommerce/stats").then(r => r.json()),
  });

  const { data: ordersData } = useQuery<{ orders: Order[] }>({
    queryKey: ["ecommerce-orders-top"],
    queryFn: () => fetch("/api/ecommerce/orders").then(r => r.json()),
  });

  const syncMarketplace = useMutation({
    mutationFn: () => fetch("/api/ecommerce/marketplace/sync", { method: "POST" }).then(r => r.json()),
    onSuccess: (data) => toast({
      title: "Marketplace Sync Complete",
      description: `Synced ${data.total ?? 0} orders — Amazon: ${data.amazon ?? 0}, Flipkart: ${data.flipkart ?? 0}, Meesho: ${data.meesho ?? 0}`,
    }),
    onError: () => toast({ title: "Sync Failed", variant: "destructive" }),
  });

  const pushInventory = useMutation({
    mutationFn: () => fetch("/api/ecommerce/inventory/sync-push", { method: "POST" }).then(r => r.json()),
    onSuccess: () => toast({ title: "Inventory Pushed", description: "Inventory synced to all channels." }),
    onError: () => toast({ title: "Push Failed", variant: "destructive" }),
  });

  const orders = ordersData?.orders ?? (Array.isArray(ordersData) ? ordersData : []);
  const channels = stats?.byChannel ?? [];

  return (
    <div style={{ padding: "24px", fontFamily: "inherit", background: "#f9fafb", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>E-Commerce Dashboard</h1>
          <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 13 }}>Overview of marketplace activity</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => syncMarketplace.mutate()} disabled={syncMarketplace.isPending}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#6366f1", color: "#fff", border: "none", borderRadius: 7, padding: "8px 14px", fontSize: 13, cursor: "pointer", opacity: syncMarketplace.isPending ? 0.7 : 1 }}>
            <RefreshCw size={14} /> {syncMarketplace.isPending ? "Syncing…" : "Sync Marketplace Orders"}
          </button>
          <button onClick={() => pushInventory.mutate()} disabled={pushInventory.isPending}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#0891b2", color: "#fff", border: "none", borderRadius: 7, padding: "8px 14px", fontSize: 13, cursor: "pointer", opacity: pushInventory.isPending ? 0.7 : 1 }}>
            <Upload size={14} /> {pushInventory.isPending ? "Pushing…" : "Push Inventory"}
          </button>
        </div>
      </div>

      {statsLoading ? <p style={{ color: "#9ca3af" }}>Loading stats…</p> : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 28 }}>
          {card("Today's Orders", stats?.todayOrders ?? 0, ShoppingCart, "#6366f1")}
          {card("Monthly Revenue", fmtCur(stats?.monthlyRevenue ?? 0), IndianRupee, "#22c55e")}
          {card("Pending Returns", stats?.pendingReturns ?? 0, RotateCcw, "#f59e0b")}
          {card("Active Channels", stats?.activeChannels ?? 0, Store, "#3b82f6")}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div style={{ background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 14px" }}>Channel Performance</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                {["Channel", "Platform", "Orders", "Revenue", "Avg Order"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {channels.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "16px 8px", color: "#9ca3af", textAlign: "center" }}>No channel data</td></tr>
              ) : channels.map((ch, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px" }}>{ch.channel_name}</td>
                  <td style={{ padding: "8px", textTransform: "capitalize" }}>{ch.platform}</td>
                  <td style={{ padding: "8px" }}>{ch.orders}</td>
                  <td style={{ padding: "8px" }}>{fmtCur(ch.revenue)}</td>
                  <td style={{ padding: "8px" }}>{ch.orders ? fmtCur(Math.round(ch.revenue / ch.orders)) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 14px" }}>Recent Orders</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                {["Order #", "Customer", "Channel", "Amount", "Status"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 8px", color: "#6b7280", fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 10).map((o) => (
                <tr key={o.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "8px", fontWeight: 500 }}>{o.order_number}</td>
                  <td style={{ padding: "8px" }}>{o.customer_name}</td>
                  <td style={{ padding: "8px" }}>{o.channel_name}</td>
                  <td style={{ padding: "8px" }}>{fmtCur(o.total_amount)}</td>
                  <td style={{ padding: "8px" }}>
                    <span style={{ background: (statusColor[o.status] ?? "#9ca3af") + "20", color: statusColor[o.status] ?? "#6b7280", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={5} style={{ padding: "16px 8px", color: "#9ca3af", textAlign: "center" }}>No recent orders</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
