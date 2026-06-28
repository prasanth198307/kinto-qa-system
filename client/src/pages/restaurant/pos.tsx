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

export default function RestaurantPOSPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [discount, setDiscount] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(false);

  const { data: tables = [] } = useQuery({ queryKey: ["floor-plan"], queryFn: () => api("GET", "/api/restaurant/floor-plan") });
  const { data: menuItems = [] } = useQuery({ queryKey: ["menu-items"], queryFn: () => api("GET", "/api/pos/menu-items") });

  const tableStatusColor = (s: string) => s === "available" ? "bg-green-100 border-green-400" : s === "occupied" ? "bg-yellow-100 border-yellow-400" : "bg-red-100 border-red-400";

  const filteredItems = (Array.isArray(menuItems) ? menuItems : (menuItems as any)?.items || []).filter((i: any) =>
    i.name?.toLowerCase().includes(search.toLowerCase())
  );

  const addItem = (item: any) => {
    setOrderItems(prev => {
      const ex = prev.find(x => x.id === item.id);
      if (ex) return prev.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
  const gst = subtotal * 0.05;
  const sc = serviceCharge ? subtotal * 0.1 : 0;
  const total = subtotal + gst + sc - discount;

  const payMutation = useMutation({
    mutationFn: (mode: string) => api("POST", "/api/restaurant/orders", {
      table_id: selectedTable?.id, items: orderItems, subtotal, gst, service_charge: sc, discount, total, payment_mode: mode
    }),
    onSuccess: () => { toast({ title: "Payment done" }); setOrderItems([]); setSelectedTable(null); qc.invalidateQueries({ queryKey: ["floor-plan"] }); }
  });

  const kotMutation = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/kot", { table_id: selectedTable?.id, items: orderItems }),
    onSuccess: () => toast({ title: "KOT sent to kitchen" })
  });

  return (
    <div className="flex h-screen gap-4 p-4">
      <div className="flex-1">
        <h2 className="text-xl font-bold mb-3">Floor Plan</h2>
        <div className="grid grid-cols-5 gap-3">
          {(Array.isArray(tables) ? tables : (tables as any)?.tables || []).map((t: any) => (
            <div key={t.id} onClick={() => setSelectedTable(t)}
              className={`border-2 rounded-lg p-3 cursor-pointer text-center ${tableStatusColor(t.status)} ${selectedTable?.id === t.id ? "ring-2 ring-blue-500" : ""}`}>
              <div className="font-bold">T{t.table_number}</div>
              <div className="text-xs">{t.seating_capacity} seats</div>
              <Badge variant="outline" className="text-xs mt-1">{t.status}</Badge>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-4 text-sm">
          <span>Green = Available</span>
          <span>Yellow = Occupied</span>
          <span>Red = Reserved</span>
        </div>
      </div>
      {selectedTable && (
        <div className="w-96 flex flex-col gap-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle>Table {selectedTable.table_number} Order</CardTitle></CardHeader>
            <CardContent>
              <Input placeholder="Search menu..." value={search} onChange={e => setSearch(e.target.value)} className="mb-2" />
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center border rounded p-1 hover:bg-gray-50 cursor-pointer" onClick={() => addItem(item)}>
                    <span className="text-sm">{item.name}</span>
                    <span className="text-sm font-medium">Rs {fmt(item.price)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="flex-1">
            <CardHeader className="pb-2"><CardTitle>Order Items</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {orderItems.map(i => (
                  <div key={i.id} className="flex justify-between items-center text-sm">
                    <span>{i.name} x{i.qty}</span>
                    <span>Rs {fmt(i.price * i.qty)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 text-sm border-t pt-2">
                <div className="flex justify-between"><span>Subtotal</span><span>Rs {fmt(subtotal)}</span></div>
                <div className="flex justify-between"><span>GST 5%</span><span>Rs {fmt(gst)}</span></div>
                <div className="flex justify-between items-center">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={serviceCharge} onChange={e => setServiceCharge(e.target.checked)} />
                    Service Charge 10%
                  </label>
                  <span>Rs {fmt(sc)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Discount</span>
                  <Input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-24 h-7 text-right text-sm" />
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>Rs {fmt(total)}</span></div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" onClick={() => kotMutation.mutate()}>Print KOT</Button>
                <Button size="sm" variant="outline">Generate Bill</Button>
              </div>
              <div className="flex gap-2 mt-2">
                {["Cash","UPI","Card"].map(m => (
                  <Button key={m} size="sm" onClick={() => payMutation.mutate(m)} disabled={orderItems.length === 0}>{m}</Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
