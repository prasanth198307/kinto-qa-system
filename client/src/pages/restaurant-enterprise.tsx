import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const apiRequest = async (method: string, url: string, body?: any) => {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined, credentials: "include" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
};
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

function POSTab() {
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [discount, setDiscount] = useState(0);
  const [serviceCharge, setServiceCharge] = useState(false);
  const { data: tables = [] } = useQuery({ queryKey: ["/api/restaurant/floor-plan"], queryFn: () => apiRequest("GET", "/api/restaurant/floor-plan") });
  const { data: outlets = [] } = useQuery({ queryKey: ["/api/restaurant/outlets"], queryFn: () => apiRequest("GET", "/api/restaurant/outlets") });
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const gst = subtotal * 0.05;
  const sc = serviceCharge ? subtotal * 0.1 : 0;
  const total = subtotal + gst + sc - discount;
  const tableColor = (s: string) => s === "available" ? "bg-green-100 border-green-400" : s === "occupied" ? "bg-yellow-100 border-yellow-400" : "bg-red-100 border-red-400";
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2">
        <div className="flex gap-2 mb-3">
          <Select><SelectTrigger className="w-40"><SelectValue placeholder="Outlet" /></SelectTrigger><SelectContent>{outlets.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.outlet_name}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {tables.map((t: any) => (
            <div key={t.id} onClick={() => setSelectedTable(t)} className={`p-3 border-2 rounded cursor-pointer text-center text-sm font-medium ${tableColor(t.status)} ${selectedTable?.id === t.id ? "ring-2 ring-blue-500" : ""}`}>
              T{t.table_number}<br /><span className="text-xs">{t.status}</span>
            </div>
          ))}
        </div>
      </div>
      {selectedTable && (
        <div className="border rounded p-3 space-y-2">
          <div className="font-semibold">Table {selectedTable.table_number}</div>
          <AddItemForm onAdd={(item) => setItems([...items, item])} />
          <div className="text-xs space-y-1 border-t pt-2">
            {items.map((it, i) => <div key={i} className="flex justify-between"><span>{it.name} x{it.qty}</span><span>₹{fmt(it.qty * it.price)}</span></div>)}
          </div>
          <div className="border-t pt-2 text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{fmt(subtotal)}</span></div>
            <div className="flex justify-between"><span>GST 5%</span><span>₹{fmt(gst)}</span></div>
            <div className="flex items-center gap-2"><input type="checkbox" checked={serviceCharge} onChange={e => setServiceCharge(e.target.checked)} /><span>Service 10%</span><span className="ml-auto">₹{fmt(sc)}</span></div>
            <Input placeholder="Discount" type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="h-7 text-xs" />
            <div className="flex justify-between font-bold"><span>Total</span><span>₹{fmt(total)}</span></div>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {["Cash", "UPI", "Card"].map(m => <Button key={m} size="sm" variant="outline" className="text-xs">{m}</Button>)}
          </div>
          <div className="grid grid-cols-2 gap-1">
            <Button size="sm" variant="outline" className="text-xs">Print KOT</Button>
            <Button size="sm" className="text-xs">Generate Bill</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddItemForm({ onAdd }: { onAdd: (i: any) => void }) {
  const [name, setName] = useState(""); const [qty, setQty] = useState(1); const [price, setPrice] = useState(0);
  return (
    <div className="flex gap-1">
      <Input placeholder="Item" value={name} onChange={e => setName(e.target.value)} className="h-7 text-xs" />
      <Input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} className="h-7 text-xs w-14" />
      <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} className="h-7 text-xs w-16" />
      <Button size="sm" className="h-7 text-xs px-2" onClick={() => { if (name) { onAdd({ name, qty, price }); setName(""); } }}>+</Button>
    </div>
  );
}

function KDSTab() {
  const qc = useQueryClient();
  const { data: orders = [] } = useQuery({ queryKey: ["/api/restaurant/shifts"], queryFn: () => apiRequest("GET", "/api/restaurant/shifts"), refetchInterval: 30000 });
  const markReady = useMutation({ mutationFn: ({ kotId, itemId }: any) => apiRequest("PUT", `/api/restaurant/kot/${kotId}/items/${itemId}/status`, { status: "ready" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/shifts"] }) });
  const elapsed = (t: string) => Math.floor((Date.now() - new Date(t).getTime()) / 60000);
  const color = (min: number) => min < 5 ? "bg-green-50" : min < 10 ? "bg-yellow-50" : "bg-red-50";
  return (
    <div className="grid grid-cols-3 gap-3">
      {orders.map((o: any) => {
        const min = elapsed(o.created_at || new Date().toISOString());
        return (
          <Card key={o.id} className={color(min)}>
            <CardHeader className="py-2 px-3"><CardTitle className="text-sm">Table {o.table_number} — {min}min ago</CardTitle></CardHeader>
            <CardContent className="px-3 pb-3 space-y-1">
              {(o.items || []).map((item: any) => (
                <div key={item.id} className="flex justify-between items-center text-xs">
                  <span>{item.name} x{item.quantity}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant={item.status === "ready" ? "default" : "secondary"} className="text-xs">{item.status}</Badge>
                    {item.status !== "ready" && <Button size="sm" className="h-5 text-xs px-1" onClick={() => markReady.mutate({ kotId: o.id, itemId: item.id })}>Ready</Button>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
      {orders.length === 0 && <div className="col-span-3 text-center text-gray-400 py-10">No active KOTs</div>}
    </div>
  );
}

function MenuTab() {
  const qc = useQueryClient();
  const { data: menuItems = [] } = useQuery({ queryKey: ["/api/pos/menu-items"], queryFn: () => apiRequest("GET", "/api/pos/menu-items") });
  const { data: modifiers = [] } = useQuery({ queryKey: ["/api/restaurant/modifiers"], queryFn: () => apiRequest("GET", "/api/restaurant/modifiers") });
  const [form, setForm] = useState({ name: "", price: "", gst_rate: "5", is_veg: true, is_available: true });
  const addItem = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/pos/menu-items", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/pos/menu-items"] }) });
  return (
    <Tabs defaultValue="items">
      <TabsList><TabsTrigger value="items">Items</TabsTrigger><TabsTrigger value="modifiers">Modifiers</TabsTrigger><TabsTrigger value="combos">Combos</TabsTrigger></TabsList>
      <TabsContent value="items">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
          <Button onClick={() => addItem.mutate(form)}>Add Item</Button>
        </div>
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>GST%</TableHead><TableHead>Veg</TableHead><TableHead>Available</TableHead></TableRow></TableHeader>
          <TableBody>{menuItems.map((i: any) => <TableRow key={i.id}><TableCell>{i.name}</TableCell><TableCell>₹{fmt(i.price)}</TableCell><TableCell>{i.gst_rate}%</TableCell><TableCell>{i.is_veg ? "🟢" : "🔴"}</TableCell><TableCell>{i.is_available ? "Yes" : "No"}</TableCell></TableRow>)}</TableBody>
        </Table>
      </TabsContent>
      <TabsContent value="modifiers">
        <Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Required</TableHead></TableRow></TableHeader>
          <TableBody>{modifiers.map((m: any) => <TableRow key={m.id}><TableCell>{m.name}</TableCell><TableCell>{m.type}</TableCell><TableCell>{m.is_required ? "Yes" : "No"}</TableCell></TableRow>)}</TableBody>
        </Table>
      </TabsContent>
      <TabsContent value="combos"><div className="text-gray-400 text-sm py-4">No combos configured</div></TabsContent>
    </Tabs>
  );
}

function ShiftsTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ cashier_name: "", opening_cash: "" });
  const openShift = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/restaurant/shifts/open", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/shifts/history"] }) });
  const { data: history = [] } = useQuery({ queryKey: ["/api/restaurant/shifts/history"], queryFn: () => apiRequest("GET", "/api/restaurant/shifts/history") });
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-sm">Open Shift</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Cashier Name" value={form.cashier_name} onChange={e => setForm({ ...form, cashier_name: e.target.value })} />
          <Input placeholder="Opening Cash" value={form.opening_cash} onChange={e => setForm({ ...form, opening_cash: e.target.value })} />
          <Button onClick={() => openShift.mutate(form)}>Open Shift</Button>
        </CardContent>
      </Card>
      <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Cashier</TableHead><TableHead>Sales</TableHead><TableHead>Orders</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
        <TableBody>{history.map((s: any) => <TableRow key={s.id}><TableCell>{s.date}</TableCell><TableCell>{s.cashier_name}</TableCell><TableCell>₹{fmt(s.total_sales)}</TableCell><TableCell>{s.orders_count}</TableCell><TableCell><Badge>{s.status}</Badge></TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function CustomersTab() {
  const [phone, setPhone] = useState(""); const [customer, setCustomer] = useState<any>(null); const [points, setPoints] = useState("");
  const lookup = async () => { try { const c = await apiRequest("GET", `/api/restaurant/customers/${phone}/lookup`); setCustomer(c); } catch { setCustomer(null); } };
  const earnPoints = useMutation({ mutationFn: (d: any) => apiRequest("POST", `/api/restaurant/customers/${customer.id}/earn-points`, d) });
  return (
    <div className="space-y-4">
      <div className="flex gap-2"><Input placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} /><Button onClick={lookup}>Search</Button></div>
      {customer && (
        <Card><CardContent className="pt-4 space-y-2">
          <div className="flex justify-between"><span className="font-semibold">{customer.name}</span><Badge>{customer.tier}</Badge></div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>Points: <strong>{customer.points}</strong></div>
            <div>Visits: <strong>{customer.total_visits}</strong></div>
            <div>Spend: <strong>₹{fmt(customer.total_spend)}</strong></div>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Bill amount / Points" value={points} onChange={e => setPoints(e.target.value)} />
            <Button size="sm" onClick={() => earnPoints.mutate({ bill_amount: points })}>Earn</Button>
            <Button size="sm" variant="outline" onClick={() => apiRequest("POST", `/api/restaurant/customers/${customer.id}/redeem-points`, { points })}>Redeem</Button>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

function WastageTab() {
  const qc = useQueryClient();
  const { data: wastage = [] } = useQuery({ queryKey: ["/api/restaurant/wastage"], queryFn: () => apiRequest("GET", "/api/restaurant/wastage") });
  const [form, setForm] = useState({ item_name: "", quantity: "", unit: "", reason: "spoilage", cost_per_unit: "" });
  const addWastage = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/restaurant/wastage", d), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/restaurant/wastage"] }) });
  return (
    <div className="space-y-4">
      <Card><CardHeader><CardTitle className="text-sm">Log Wastage</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-2">
          <Input placeholder="Item" value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} />
          <Input placeholder="Qty" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
          <Input placeholder="Unit" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
          <Select value={form.reason} onValueChange={v => setForm({ ...form, reason: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="spoilage">Spoilage</SelectItem><SelectItem value="preparation">Preparation</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent></Select>
          <Input placeholder="Cost/Unit" value={form.cost_per_unit} onChange={e => setForm({ ...form, cost_per_unit: e.target.value })} />
          <Button onClick={() => addWastage.mutate(form)}>Add</Button>
        </CardContent>
      </Card>
      <Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Reason</TableHead><TableHead>Cost</TableHead></TableRow></TableHeader>
        <TableBody>{wastage.map((w: any) => <TableRow key={w.id}><TableCell>{w.date}</TableCell><TableCell>{w.item_name}</TableCell><TableCell>{w.quantity} {w.unit}</TableCell><TableCell>{w.reason}</TableCell><TableCell>₹{fmt(w.cost_per_unit * w.quantity)}</TableCell></TableRow>)}</TableBody>
      </Table>
    </div>
  );
}

function ReportsTab() {
  const [type, setType] = useState("eod-summary"); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [data, setData] = useState<any[]>([]);
  const fetch = async () => { try { const r = await apiRequest("GET", `/api/restaurant/reports/${type}?from=${from}&to=${to}`); setData(Array.isArray(r) ? r : r.data || []); } catch { setData([]); } };
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Select value={type} onValueChange={setType}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{["hourly-sales","item-wise","category-wise","cashier-wise","void-discount","eod-summary"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
        <Button onClick={fetch}>Fetch</Button>
      </div>
      {data.length > 0 && <Table><TableHeader><TableRow>{Object.keys(data[0]).map(k => <TableHead key={k}>{k}</TableHead>)}</TableRow></TableHeader><TableBody>{data.map((row, i) => <TableRow key={i}>{Object.values(row).map((v: any, j) => <TableCell key={j}>{String(v)}</TableCell>)}</TableRow>)}</TableBody></Table>}
    </div>
  );
}

export default function RestaurantEnterprisePage() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Restaurant Enterprise</h1>
      <Tabs defaultValue="pos">
        <TabsList className="flex flex-wrap gap-1 h-auto mb-4">
          {[["pos","POS"],["kds","Kitchen"],["menu","Menu"],["shifts","Shifts"],["customers","Customers"],["outlets","Outlets"],["wastage","Wastage"],["reports","Reports"]].map(([v,l]) => <TabsTrigger key={v} value={v}>{l}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="pos"><POSTab /></TabsContent>
        <TabsContent value="kds"><KDSTab /></TabsContent>
        <TabsContent value="menu"><MenuTab /></TabsContent>
        <TabsContent value="shifts"><ShiftsTab /></TabsContent>
        <TabsContent value="customers"><CustomersTab /></TabsContent>
        <TabsContent value="outlets">
          <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader><CardTitle className="text-sm">Outlets</CardTitle></CardHeader><CardContent><p className="text-xs text-gray-400">Outlet management table</p></CardContent></Card>
            <Card><CardHeader><CardTitle className="text-sm">Terminals</CardTitle></CardHeader><CardContent><p className="text-xs text-gray-400">Terminal management table</p></CardContent></Card>
          </div>
        </TabsContent>
        <TabsContent value="wastage"><WastageTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
