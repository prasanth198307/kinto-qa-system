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

export default function RestaurantDeliveryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ customer_name: "", phone: "", address: "", items: "", total: "" });

  const { data: deliveries = [] } = useQuery({ queryKey: ["restaurant-delivery"], queryFn: () => api("GET", "/api/restaurant/delivery") });

  const addDelivery = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/delivery", { ...form, total: Number(form.total) }),
    onSuccess: () => { toast({ title: "Delivery order added" }); qc.invalidateQueries({ queryKey: ["restaurant-delivery"] }); setForm({ customer_name: "", phone: "", address: "", items: "", total: "" }); }
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api("PUT", `/api/restaurant/delivery/${id}/status`, { status }),
    onSuccess: () => { toast({ title: "Status updated" }); qc.invalidateQueries({ queryKey: ["restaurant-delivery"] }); }
  });

  const deliveryList: any[] = Array.isArray(deliveries) ? deliveries : (deliveries as any)?.deliveries || [];

  const nextStatus = (s: string) => s === "pending" ? "Assigned" : s === "assigned" ? "Picked" : s === "picked" ? "Delivered" : null;

  const statusBadge = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "delivered") return "default";
    if (s === "picked") return "secondary";
    if (s === "cancelled") return "destructive";
    return "outline";
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Delivery Orders</h1>
      <Card>
        <CardHeader><CardTitle>New Delivery Order</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Customer Name" value={form.customer_name} onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))} className="w-40" />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-36" />
            <Input placeholder="Address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="w-56" />
            <Input placeholder="Items (text)" value={form.items} onChange={e => setForm(p => ({ ...p, items: e.target.value }))} className="w-48" />
            <Input placeholder="Total" type="number" value={form.total} onChange={e => setForm(p => ({ ...p, total: e.target.value }))} className="w-28" />
            <Button onClick={() => addDelivery.mutate()}>Add Order</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Delivery Orders</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Rider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveryList.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono">{d.order_no || d.id}</TableCell>
                  <TableCell>{d.customer_name}</TableCell>
                  <TableCell>{d.phone}</TableCell>
                  <TableCell>{d.address}</TableCell>
                  <TableCell>{d.rider || "-"}</TableCell>
                  <TableCell><Badge variant={statusBadge(d.status)}>{d.status}</Badge></TableCell>
                  <TableCell>{d.eta || "-"}</TableCell>
                  <TableCell>
                    {nextStatus(d.status) && (
                      <Button size="sm" onClick={() => updateStatus.mutate({ id: d.id, status: nextStatus(d.status)!.toLowerCase() })}>
                        Mark {nextStatus(d.status)}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
