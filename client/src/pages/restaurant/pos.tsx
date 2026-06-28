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

type CartItem = { id: number; name: string; price: number; qty: number };

export default function RestaurantPOSPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState("dine_in");
  const [covers, setCovers] = useState(1);
  const [customerPhone, setCustomerPhone] = useState("");
  const [customer, setCustomer] = useState<any>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showPayment, setShowPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [upiAmount, setUpiAmount] = useState("");
  const [outlet, setOutlet] = useState("");
  const [kotOrderId, setKotOrderId] = useState<number | null>(null);

  const { data: outlets = [] } = useQuery({ queryKey: ["/api/restaurant/outlets"], queryFn: () => api("GET", "/api/restaurant/outlets") });
  const { data: tables = [], refetch: refetchTables } = useQuery({ queryKey: ["/api/restaurant/tables"], queryFn: () => api("GET", "/api/restaurant/tables") });
  const { data: stats } = useQuery({ queryKey: ["/api/restaurant/stats"], queryFn: () => api("GET", "/api/restaurant/stats") });
  const { data: categories = [] } = useQuery({ queryKey: ["/api/restaurant/menu-categories"], queryFn: () => api("GET", "/api/restaurant/menu-categories") });
  const { data: menuItems = [] } = useQuery({
    queryKey: ["/api/restaurant/menu-items/search", itemSearch],
    queryFn: () => api("GET", `/api/restaurant/menu-items/search?q=${itemSearch}`),
    enabled: itemSearch.length > 1,
  });

  useEffect(() => {
    const t = setInterval(() => refetchTables(), 10000);
    return () => clearInterval(t);
  }, [refetchTables]);

  const lookupCustomer = async () => {
    if (!customerPhone) return;
    const res = await api("GET", `/api/restaurant/customers/lookup/${customerPhone}`);
    setCustomer(res?.id ? res : null);
    if (!res?.id) toast({ title: "Customer not found", variant: "destructive" });
  };

  const addItem = (item: any) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === item.id);
      return ex ? prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { id: item.id, name: item.name, price: Number(item.price), qty: 1 }];
    });
  };
  const updateQty = (id: number, delta: number) => setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0));

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const gst = subtotal * 0.05;
  const total = subtotal + gst;
  const paid = Number(cashAmount || 0) + Number(upiAmount || 0);

  const kotMutation = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/kot/orders", { tableId: selectedTable?.id, orderType, covers, customerId: customer?.id, items: cart.map(i => ({ menuItemId: i.id, qty: i.qty, rate: i.price })) }),
    onSuccess: (res) => { setKotOrderId(res.id); toast({ title: "KOT sent!" }); qc.invalidateQueries({ queryKey: ["/api/restaurant/tables"] }); },
  });

  const payMutation = useMutation({
    mutationFn: () => api("POST", `/api/restaurant/kot/orders/${kotOrderId}/payment`, { cashAmount: Number(cashAmount), upiAmount: Number(upiAmount), total }),
    onSuccess: () => { toast({ title: "Payment complete!" }); setCart([]); setSelectedTable(null); setShowPayment(false); setKotOrderId(null); qc.invalidateQueries({ queryKey: ["/api/restaurant/tables"] }); },
  });

  const tableColor = (s: string) => s === "available" ? "bg-green-100 border-green-400" : s === "occupied" ? "bg-red-100 border-red-400" : "bg-yellow-100 border-yellow-400";
  const filteredItems = selectedCategory === "all" ? menuItems : menuItems.filter((i: any) => String(i.categoryId) === selectedCategory);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Panel */}
      <div className="w-2/5 border-r p-3 overflow-y-auto bg-gray-50 flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          <Select value={outlet} onValueChange={setOutlet}>
            <SelectTrigger><SelectValue placeholder="Select Outlet" /></SelectTrigger>
            <SelectContent>{outlets.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-3 gap-1 text-center text-xs">
          <Card className="p-2"><div className="font-bold text-green-700">₹{fmt(stats?.todaySales)}</div><div>Today Sales</div></Card>
          <Card className="p-2"><div className="font-bold text-blue-700">{stats?.openTables ?? 0}</div><div>Open Tables</div></Card>
          <Card className="p-2"><div className="font-bold text-orange-700">{stats?.activeKots ?? 0}</div><div>Active KOTs</div></Card>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {tables.map((t: any) => (
            <div key={t.id} onClick={() => setSelectedTable(t)} className={`border-2 rounded p-2 cursor-pointer text-center text-xs font-semibold ${tableColor(t.status)} ${selectedTable?.id === t.id ? "ring-2 ring-blue-500" : ""}`}>
              <div>T{t.tableNumber}</div>
              <div className="text-gray-500">{t.capacity}p</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-3/5 flex flex-col p-3 overflow-y-auto gap-2">
        {!selectedTable ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-lg">Select a table to start billing</div>
        ) : (
          <>
            <div className="flex gap-2 items-center flex-wrap">
              <Badge variant="outline">Table #{selectedTable.tableNumber}</Badge>
              <Input type="number" className="w-20" value={covers} onChange={e => setCovers(Number(e.target.value))} placeholder="Covers" />
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dine_in">Dine In</SelectItem>
                  <SelectItem value="takeaway">Takeaway</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-1 ml-auto">
                <Input className="w-32" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Customer Phone" />
                <Button size="sm" variant="outline" onClick={lookupCustomer}>Search</Button>
              </div>
            </div>
            {customer && <div className="text-sm text-green-700">✓ {customer.name} — {customer.loyaltyPoints ?? 0} pts</div>}

            <Input value={itemSearch} onChange={e => setItemSearch(e.target.value)} placeholder="Search menu items..." />
            <div className="flex gap-1 flex-wrap">
              <Button size="sm" variant={selectedCategory === "all" ? "default" : "outline"} onClick={() => setSelectedCategory("all")}>All</Button>
              {categories.map((c: any) => (
                <Button key={c.id} size="sm" variant={selectedCategory === String(c.id) ? "default" : "outline"} onClick={() => setSelectedCategory(String(c.id))}>{c.name}</Button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {filteredItems.map((item: any) => (
                <Card key={item.id} className="p-2 cursor-pointer hover:shadow" onClick={() => addItem(item)}>
                  <div className="text-xs font-semibold">{item.name}</div>
                  <div className="text-xs text-gray-500">₹{fmt(item.price)}</div>
                </Card>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="border rounded overflow-hidden">
                <Table>
                  <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Rate</TableHead><TableHead>Amt</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {cart.map(i => (
                      <TableRow key={i.id}>
                        <TableCell className="text-xs">{i.name}</TableCell>
                        <TableCell><div className="flex items-center gap-1"><Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => updateQty(i.id, -1)}>-</Button><span className="text-xs">{i.qty}</span><Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => updateQty(i.id, 1)}>+</Button></div></TableCell>
                        <TableCell className="text-xs">₹{fmt(i.price)}</TableCell>
                        <TableCell className="text-xs">₹{fmt(i.price * i.qty)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-2 text-xs space-y-1 bg-gray-50">
                  <div className="flex justify-between"><span>Subtotal</span><span>₹{fmt(subtotal)}</span></div>
                  <div className="flex justify-between"><span>GST (5%)</span><span>₹{fmt(gst)}</span></div>
                  <div className="flex justify-between font-bold"><span>Total</span><span>₹{fmt(total)}</span></div>
                </div>
              </div>
            )}

            {showPayment && (
              <div className="border rounded p-3 space-y-2 bg-blue-50">
                <div className="font-semibold text-sm">Payment — Grand Total: ₹{fmt(total)}</div>
                <div className="flex gap-2"><Input placeholder="Cash" value={cashAmount} onChange={e => setCashAmount(e.target.value)} /><Input placeholder="UPI" value={upiAmount} onChange={e => setUpiAmount(e.target.value)} /></div>
                <div className="text-xs text-gray-600">Paid: ₹{fmt(paid)} | Balance: ₹{fmt(Math.max(0, paid - total))}</div>
                <Button className="w-full" onClick={() => payMutation.mutate()} disabled={paid < total || !kotOrderId}>Complete Payment</Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={() => kotMutation.mutate()} disabled={cart.length === 0}>Send KOT</Button>
              <Button className="flex-1" onClick={() => setShowPayment(true)} disabled={cart.length === 0}>Print Bill</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
