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

const STATUSES = ["all", "new", "confirmed", "preparing", "dispatched", "delivered"] as const;
const PLATFORM_COLORS: Record<string, string> = { direct: "bg-blue-600", zomato: "bg-red-600", swiggy: "bg-orange-500", dunzo: "bg-purple-600" };
const STATUS_COLORS: Record<string, string> = { new: "bg-yellow-500", confirmed: "bg-blue-400", preparing: "bg-blue-600", dispatched: "bg-purple-600", delivered: "bg-green-600", cancelled: "bg-red-600" };
const BLANK_FORM = { customer_name: "", customer_phone: "", delivery_address: "", platform: "direct", total_amount: "", delivery_fee: "", notes: "" };

const NEXT_STATUS: Record<string, { label: string; status: string }> = {
  new: { label: "Confirm", status: "confirmed" },
  confirmed: { label: "Start Prep", status: "preparing" },
  preparing: { label: "Dispatch", status: "dispatched" },
  dispatched: { label: "Delivered", status: "delivered" },
};

export default function RestaurantDeliveryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ ...BLANK_FORM });
  const [dispatchBoy, setDispatchBoy] = useState<Record<number, string>>({});

  const { data: orders = [] } = useQuery({
    queryKey: ["/api/restaurant/delivery-orders"],
    queryFn: () => api("GET", "/api/restaurant/delivery-orders")
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status, delivery_boy }: any) =>
      api("PUT", `/api/restaurant/delivery-orders/${id}`, { status, ...(delivery_boy ? { delivery_boy } : {}) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/delivery-orders"] }); toast({ title: "Order updated" }); }
  });

  const createOrder = useMutation({
    mutationFn: (d: any) => api("POST", "/api/restaurant/delivery-orders", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/restaurant/delivery-orders"] }); setShowForm(false); setForm({ ...BLANK_FORM }); toast({ title: "Delivery order created" }); }
  });

  const filtered = activeTab === "all" ? orders : orders.filter((o: any) => o.status === activeTab);

  const counts = STATUSES.reduce((acc, s) => ({
    ...acc,
    [s]: s === "all" ? orders.length : orders.filter((o: any) => o.status === s).length
  }), {} as Record<string, number>);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Delivery Orders</h1>
        <Button onClick={() => setShowForm(true)}>+ New Delivery Order</Button>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {STATUSES.map(s => (
          <Card key={s} className={`cursor-pointer border-2 ${activeTab === s ? "border-primary" : "border-transparent"}`} onClick={() => setActiveTab(s)}>
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-xl font-bold">{counts[s]}</div>
              <div className="text-xs capitalize text-muted-foreground">{s}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Delivery Order</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="Customer Name" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
              <Input placeholder="Phone" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} />
              <Select value={form.platform} onValueChange={v => setForm({ ...form, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="direct">Direct</SelectItem><SelectItem value="zomato">Zomato</SelectItem><SelectItem value="swiggy">Swiggy</SelectItem><SelectItem value="dunzo">Dunzo</SelectItem></SelectContent>
              </Select>
              <Input placeholder="Delivery Address" value={form.delivery_address} onChange={e => setForm({ ...form, delivery_address: e.target.value })} className="col-span-2" />
              <Input placeholder="Total Amount" type="number" value={form.total_amount} onChange={e => setForm({ ...form, total_amount: e.target.value })} />
              <Input placeholder="Delivery Fee" type="number" value={form.delivery_fee} onChange={e => setForm({ ...form, delivery_fee: e.target.value })} />
              <Input placeholder="Notes" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="col-span-2" />
            </div>
            <div className="flex gap-2 mt-3">
              <Button onClick={() => createOrder.mutate(form)}>Create Order</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setForm({ ...BLANK_FORM }); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((o: any) => {
          const next = NEXT_STATUS[o.status];
          return (
            <Card key={o.id} className="relative">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex gap-2">
                    <Badge variant="outline" className="font-mono">#{o.order_number || o.id}</Badge>
                    <Badge className={PLATFORM_COLORS[o.platform] || "bg-gray-500"}>{o.platform}</Badge>
                  </div>
                  <Badge className={STATUS_COLORS[o.status] || "bg-gray-400"}>{o.status}</Badge>
                </div>
                <div>
                  <div className="font-semibold">{o.customer_name}</div>
                  <div className="text-sm text-muted-foreground">{o.customer_phone}</div>
                </div>
                <div className="text-sm text-muted-foreground line-clamp-2">{o.delivery_address}</div>
                <div className="flex justify-between text-sm">
                  <span>Amount: <strong>₹{fmt(o.total_amount)}</strong></span>
                  <span>Fee: <strong>₹{fmt(o.delivery_fee)}</strong></span>
                </div>
                {o.notes && <div className="text-xs text-muted-foreground italic">{o.notes}</div>}
                {next && (
                  <div className="pt-1">
                    {o.status === "preparing" && (
                      <Input placeholder="Delivery boy name" value={dispatchBoy[o.id] || ""} onChange={e => setDispatchBoy(d => ({ ...d, [o.id]: e.target.value }))} className="mb-2 h-8 text-sm" />
                    )}
                    <Button size="sm" className="w-full" onClick={() => updateStatus.mutate({ id: o.id, status: next.status, ...(o.status === "preparing" ? { delivery_boy: dispatchBoy[o.id] } : {}) })}>
                      {next.label}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-12 text-muted-foreground">No delivery orders found</div>
        )}
      </div>
    </div>
  );
}
