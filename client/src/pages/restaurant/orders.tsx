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

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500", cooking: "bg-blue-500", ready: "bg-green-600",
  paid: "bg-gray-500", cancelled: "bg-red-600"
};
const KS_COLORS: Record<string, string> = {
  pending: "bg-yellow-400 text-black", cooking: "bg-blue-500", ready: "bg-green-600",
  served: "bg-gray-500", cancelled: "bg-red-600"
};

export default function RestaurantOrdersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [voidReasons, setVoidReasons] = useState<Record<number, string>>({});

  const { data: orders = [] } = useQuery({
    queryKey: ["/api/restaurant/kot/orders", date, status],
    queryFn: () => {
      const p = new URLSearchParams({ date });
      if (status !== "all") p.set("status", status);
      return api("GET", `/api/restaurant/kot/orders?${p}`);
    }
  });

  const { data: orderDetail } = useQuery({
    queryKey: ["/api/restaurant/kot/orders", expandedId],
    queryFn: () => expandedId ? api("GET", `/api/restaurant/kot/orders/${expandedId}`) : null,
    enabled: !!expandedId
  });

  const voidItem = useMutation({
    mutationFn: ({ orderId, itemId, reason }: any) =>
      api("DELETE", `/api/restaurant/kot/orders/${orderId}/items/${itemId}`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/kot/orders", expandedId] }); toast({ title: "Item voided" }); }
  });

  const updateKitchenStatus = useMutation({
    mutationFn: ({ orderId, itemId, kitchen_status }: any) =>
      api("PUT", `/api/restaurant/kot/orders/${orderId}/items/${itemId}/status`, { kitchen_status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/kot/orders", expandedId] })
  });

  const filtered = orders.filter((o: any) =>
    !search || String(o.kot_number || o.id).includes(search)
  );

  const summary = {
    total: orders.length,
    revenue: orders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0),
    open: orders.filter((o: any) => !["paid", "cancelled"].includes(o.status)).length,
    paid: orders.filter((o: any) => o.status === "paid").length,
  };

  return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Orders", val: summary.total },
          { label: "Total Revenue", val: `₹${fmt(summary.revenue)}` },
          { label: "Open Orders", val: summary.open },
          { label: "Paid Orders", val: summary.paid },
        ].map(c => (
          <Card key={c.label}><CardContent className="pt-4"><div className="text-2xl font-bold">{c.val}</div><div className="text-sm text-muted-foreground">{c.label}</div></CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-3 flex-wrap items-center">
            <CardTitle>Orders & KOT</CardTitle>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["all", "pending", "cooking", "ready", "paid", "cancelled"].map(s => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Search order#" value={search} onChange={e => setSearch(e.target.value)} className="w-40" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>KOT#</TableHead><TableHead>Table</TableHead><TableHead>Type</TableHead>
                <TableHead>Items</TableHead><TableHead>Status</TableHead><TableHead>Amount</TableHead>
                <TableHead>Cashier</TableHead><TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o: any) => (
                <>
                  <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}>
                    <TableCell className="font-mono">{o.kot_number || o.id}</TableCell>
                    <TableCell>{o.table_number || "-"}</TableCell>
                    <TableCell className="capitalize">{o.order_type}</TableCell>
                    <TableCell>{o.items_count || "-"}</TableCell>
                    <TableCell><Badge className={STATUS_COLORS[o.status] || "bg-gray-400"}>{o.status}</Badge></TableCell>
                    <TableCell>₹{fmt(o.total_amount)}</TableCell>
                    <TableCell>{o.cashier_name || "-"}</TableCell>
                    <TableCell>{o.created_at ? new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "-"}</TableCell>
                  </TableRow>
                  {expandedId === o.id && orderDetail && (
                    <TableRow key={`${o.id}-detail`}>
                      <TableCell colSpan={8}>
                        <div className="p-3 bg-muted/30 rounded space-y-2">
                          <div className="font-semibold text-sm mb-2">Order Items</div>
                          {(orderDetail.items || []).map((item: any) => (
                            <div key={item.id} className="flex items-center gap-3 text-sm border-b pb-1">
                              <span className="flex-1">{item.name}</span>
                              <span>Qty: {item.qty}</span>
                              <span>₹{fmt(item.rate)}</span>
                              <span className="font-semibold">₹{fmt(item.amount)}</span>
                              <Badge className={KS_COLORS[item.kitchen_status] || "bg-gray-400"}>{item.kitchen_status}</Badge>
                              <Select value={item.kitchen_status} onValueChange={v => updateKitchenStatus.mutate({ orderId: o.id, itemId: item.id, kitchen_status: v })}>
                                <SelectTrigger className="w-28 h-7"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {["pending", "cooking", "ready", "served", "cancelled"].map(s => (
                                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input placeholder="Void reason" value={voidReasons[item.id] || ""} onChange={e => setVoidReasons(r => ({ ...r, [item.id]: e.target.value }))} className="w-36 h-7 text-xs" />
                              <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => voidItem.mutate({ orderId: o.id, itemId: item.id, reason: voidReasons[item.id] })}>Void</Button>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
