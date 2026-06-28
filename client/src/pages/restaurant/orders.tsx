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

export default function RestaurantOrdersPage() {
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: orders = [] } = useQuery({
    queryKey: ["restaurant-orders"],
    queryFn: () => api("GET", "/api/restaurant/orders").catch(() => api("GET", "/api/restaurant/shifts/history"))
  });

  const orderList: any[] = Array.isArray(orders) ? orders : (orders as any)?.orders || [];
  const filtered = statusFilter === "all" ? orderList : orderList.filter((o: any) => o.status === statusFilter);

  const statusBadge = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "served") return "default";
    if (s === "preparing") return "secondary";
    if (s === "cancelled") return "destructive";
    return "outline";
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Orders and KOT</h1>
      <div className="flex gap-2 flex-wrap">
        {["all","pending","preparing","served","cancelled"].map(s => (
          <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)} className="capitalize">{s}</Button>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Orders ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order No</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Cashier</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono">{o.order_no || o.id}</TableCell>
                  <TableCell>{o.table_number || o.table}</TableCell>
                  <TableCell>{o.cashier || o.cashier_name}</TableCell>
                  <TableCell>{o.items_count || (o.items || []).length}</TableCell>
                  <TableCell>Rs {fmt(o.total)}</TableCell>
                  <TableCell><Badge variant={statusBadge(o.status)}>{o.status}</Badge></TableCell>
                  <TableCell>{o.created_at ? new Date(o.created_at).toLocaleTimeString() : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
