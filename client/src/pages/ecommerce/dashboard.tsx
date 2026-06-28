import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function EcommerceDashboardPage() {
  const { data: orders = [] } = useQuery({ queryKey: ["/api/ecommerce/orders"], queryFn: () => api("GET", "/api/ecommerce/orders") });
  const { data: channels = [] } = useQuery({ queryKey: ["/api/ecommerce/channels"], queryFn: () => api("GET", "/api/ecommerce/channels") });

  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = Array.isArray(orders) ? orders.filter((o: any) => o.order_date?.slice(0, 10) === today) : [];
  const revenueToday = todayOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
  const pendingShipments = Array.isArray(orders) ? orders.filter((o: any) => o.fulfillment_status === "pending").length : 0;
  const returnsPending = Array.isArray(orders) ? orders.filter((o: any) => o.fulfillment_status === "return_pending").length : 0;

  const channelNames = ["Amazon", "Flipkart", "Meesho", "Shopify", "Website"];
  const channelBreakdown = channelNames.map(ch => {
    const chOrders = Array.isArray(orders) ? orders.filter((o: any) => o.channel === ch) : [];
    return {
      channel: ch,
      orders: chOrders.length,
      revenue: chOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0),
      returns: chOrders.filter((o: any) => o.fulfillment_status === "returned").length,
    };
  });

  const recentOrders = Array.isArray(orders) ? [...orders].slice(0, 10) : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">E-Commerce Dashboard</h1>
      <div className="grid grid-cols-4 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Orders Today</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{todayOrders.length}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Revenue Today</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">&#8377;{fmt(revenueToday)}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Pending Shipments</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{pendingShipments}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Returns Pending</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{returnsPending}</p></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Channel-wise Breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Channel</TableHead><TableHead>Orders</TableHead><TableHead>Revenue</TableHead><TableHead>Returns</TableHead></TableRow></TableHeader>
            <TableBody>
              {channelBreakdown.map(c => (
                <TableRow key={c.channel}>
                  <TableCell>{c.channel}</TableCell><TableCell>{c.orders}</TableCell>
                  <TableCell>&#8377;{fmt(c.revenue)}</TableCell><TableCell>{c.returns}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Recent Orders (Last 10)</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Order ID</TableHead><TableHead>Channel</TableHead><TableHead>Product</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {recentOrders.map((o: any) => (
                <TableRow key={o.order_id || o.id}>
                  <TableCell>{o.order_id}</TableCell><TableCell>{o.channel}</TableCell><TableCell>{o.product}</TableCell>
                  <TableCell>&#8377;{fmt(o.total)}</TableCell>
                  <TableCell><Badge>{o.fulfillment_status || "pending"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
