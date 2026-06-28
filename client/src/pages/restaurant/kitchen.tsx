import { useState, useEffect } from "react";
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

const STATUS_FLOW: Record<string, string> = { pending: "cooking", cooking: "ready", ready: "served" };
const STATUS_COLOR: Record<string, string> = { pending: "bg-gray-100 text-gray-700", cooking: "bg-orange-100 text-orange-700", ready: "bg-green-100 text-green-700", served: "bg-blue-100 text-blue-700" };
const STATIONS = ["All", "Hot Kitchen", "Cold Kitchen", "Bar"];

function elapsed(createdAt: string) {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  return mins;
}

function borderColor(mins: number) {
  if (mins < 5) return "border-green-400";
  if (mins < 10) return "border-yellow-400";
  return "border-red-500";
}

export default function RestaurantKitchenPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [station, setStation] = useState("All");
  const [orders, setOrders] = useState<any[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fetchOrders = () =>
      api("GET", "/api/restaurant/kot/orders/kitchen").then(data => setOrders(Array.isArray(data) ? data : []));
    fetchOrders();
    const t = setInterval(() => { fetchOrders(); setTick(p => p + 1); }, 5000);
    return () => clearInterval(t);
  }, []);

  const updateStatus = useMutation({
    mutationFn: ({ kotId, itemId, status }: { kotId: number; itemId: number; status: string }) =>
      api("PUT", `/api/restaurant/kot/orders/${kotId}/items/${itemId}/status`, { status }),
    onSuccess: () => {
      toast({ title: "Status updated" });
      api("GET", "/api/restaurant/kot/orders/kitchen").then(data => setOrders(Array.isArray(data) ? data : []));
    },
  });

  const filtered = station === "All" ? orders : orders.filter((o: any) => o.station === station);
  const pending = orders.filter((o: any) => o.items?.some((i: any) => i.kitchenStatus !== "served")).length;
  const avgMins = orders.length > 0 ? Math.round(orders.reduce((s: number, o: any) => s + elapsed(o.createdAt), 0) / orders.length) : 0;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold">Kitchen Display</h1>
        <div className="flex gap-2 text-sm">
          <Badge variant="outline">Pending Orders: {pending}</Badge>
          <Badge variant="outline">Avg Time: {avgMins} min</Badge>
          <Badge variant="secondary">Auto-refresh every 5s</Badge>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATIONS.map(s => (
          <Button key={s} size="sm" variant={station === s ? "default" : "outline"} onClick={() => setStation(s)}>{s}</Button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-gray-400 py-16 text-lg">No orders in kitchen</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((order: any) => {
          const mins = elapsed(order.createdAt);
          return (
            <Card key={order.id} className={`border-2 ${borderColor(mins)}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">Table #{order.tableNumber ?? order.tableId}</CardTitle>
                  <div className="text-right text-xs text-gray-500">
                    <div>{new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</div>
                    <div className={`font-bold ${mins >= 10 ? "text-red-600" : mins >= 5 ? "text-yellow-600" : "text-green-600"}`}>{mins} min ago</div>
                  </div>
                </div>
                {order.orderType && <Badge variant="outline" className="w-fit text-xs">{order.orderType}</Badge>}
              </CardHeader>
              <CardContent className="space-y-2">
                {(order.items ?? []).map((item: any) => {
                  const nextStatus = STATUS_FLOW[item.kitchenStatus];
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-2 p-2 rounded bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{item.menuItemName ?? item.name}</div>
                        <div className="text-xs text-gray-500">Qty: {item.qty}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[item.kitchenStatus] ?? ""}`}>{item.kitchenStatus}</span>
                        {nextStatus && (
                          <Button size="sm" className="h-6 text-xs px-2" variant="outline"
                            onClick={() => updateStatus.mutate({ kotId: order.id, itemId: item.id, status: nextStatus })}>
                            → {nextStatus}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
