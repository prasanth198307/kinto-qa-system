import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, ShoppingCart, Users, Tag, RotateCcw, TrendingUp, X, Pencil, Trash2 } from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
function F({ label, children }: any) { return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>; }
function SC({ title, value, icon: Icon, color }: any) {
  return <Card><CardContent className="p-5 flex items-center gap-4"><div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5"/></div><div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></div></CardContent></Card>;
}

function OverviewTab() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/pos/stats"] });
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <SC title="Today's Sales" value={`₹${fmt(stats?.todaySales)}`} icon={TrendingUp} color="bg-green-100 text-green-600" />
      <SC title="Today's Txns" value={stats?.todayTransactions ?? 0} icon={ShoppingCart} color="bg-blue-100 text-blue-600" />
      <SC title="Monthly Sales" value={`₹${fmt(stats?.monthlySales)}`} icon={TrendingUp} color="bg-purple-100 text-purple-600" />
      <SC title="Open Sessions" value={stats?.openSessions ?? 0} icon={Tag} color="bg-orange-100 text-orange-600" />
      <SC title="Customers" value={stats?.totalCustomers ?? 0} icon={Users} color="bg-teal-100 text-teal-600" />
    </div>
  );
}

// ── POS Terminal ──────────────────────────────────────────────────────────────
function TerminalTab() {
  const { toast } = useToast();
  const [session, setSession] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [showOpenSession, setShowOpenSession] = useState(false);
  const [sessionForm, setSessionForm] = useState<any>({ counter_name: "Counter 1", opening_balance: 0 });

  const { data: activeSession } = useQuery<any>({ queryKey: ["/api/pos/sessions/active"], refetchInterval: 30000 });
  const { data: products = [] } = useQuery<any[]>({ queryKey: ["/api/inventory/products"] });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/pos/customers"] });

  const openSessionMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/pos/sessions/open", d), onSuccess: (r: any) => { queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions/active"] }); setShowOpenSession(false); r.json().then(setSession); toast({ title: "Session opened" }); } });
  const closeSessionMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", `/api/pos/sessions/${activeSession?.id}/close`, d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions/active"] }); toast({ title: "Session closed" }); } });
  const saleMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/pos/transactions", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pos/transactions"] }); queryClient.invalidateQueries({ queryKey: ["/api/pos/stats"] }); setCartItems([]); setSelectedCustomer(null); setAmountPaid(""); toast({ title: "Sale recorded!" }); },
  });

  const addToCart = (product: any) => {
    setCartItems(prev => { const ex = prev.find(i => i.product_id === product.id); if (ex) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1, amount: (i.quantity + 1) * i.unit_price } : i); return [...prev, { product_id: product.id, product_name: product.name, sku: product.sku || null, quantity: 1, unit_price: Number(product.selling_price || product.price || 0), discount_pct: 0, tax_rate: Number(product.tax_rate || 0), amount: Number(product.selling_price || product.price || 0) }]; });
  };
  const updateQty = (idx: number, qty: number) => { if (qty <= 0) { setCartItems(p => p.filter((_, i) => i !== idx)); return; } setCartItems(p => p.map((it, i) => i !== idx ? it : { ...it, quantity: qty, amount: qty * it.unit_price * (1 - it.discount_pct / 100) })); };
  const subtotal = cartItems.reduce((s, i) => s + i.amount, 0);
  const tax = cartItems.reduce((s, i) => s + i.amount * i.tax_rate / 100, 0);
  const total = subtotal + tax;
  const change = Number(amountPaid || 0) - total;

  const completeSale = () => {
    if (!cartItems.length) { toast({ title: "Cart is empty", variant: "destructive" }); return; }
    saleMut.mutate({ session_id: activeSession?.id || null, customer_id: selectedCustomer?.id || null, customer_name: selectedCustomer?.name || null, items: cartItems, payment_mode: paymentMode, amount_paid: Number(amountPaid) || total });
  };

  const filteredCustomers = (customers as any[]).filter(c => c.name?.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone?.includes(customerSearch));
  const filteredProducts = (products as any[]).filter(p => p.name?.toLowerCase().includes(customerSearch.toLowerCase()) || p.sku?.toLowerCase().includes(customerSearch.toLowerCase()));

  if (!activeSession) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <ShoppingCart className="h-12 w-12 text-muted-foreground"/>
        <p className="text-lg text-muted-foreground">No active POS session</p>
        <Button onClick={()=>setShowOpenSession(true)}>Open Session</Button>
        <Dialog open={showOpenSession} onOpenChange={setShowOpenSession}>
          <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Open POS Session</DialogTitle></DialogHeader>
            <div className="grid gap-3"><F label="Counter Name"><Input value={sessionForm.counter_name||""} onChange={e=>setSessionForm({...sessionForm,counter_name:e.target.value})}/></F><F label="Opening Balance (₹)"><Input type="number" value={sessionForm.opening_balance||""} onChange={e=>setSessionForm({...sessionForm,opening_balance:e.target.value})}/></F></div>
            <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowOpenSession(false)}>Cancel</Button><Button onClick={()=>openSessionMut.mutate(sessionForm)} disabled={openSessionMut.isPending}>Open</Button></div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-3">
        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200">
          <div><p className="font-medium text-sm text-green-800 dark:text-green-200">{activeSession.counter_name} — Session Active</p><p className="text-xs text-green-600">Sales: ₹{fmt(activeSession.total_sales)} · Txns: {activeSession.total_transactions}</p></div>
          <Button size="sm" variant="outline" onClick={()=>closeSessionMut.mutate({closing_balance:0})}>Close Session</Button>
        </div>
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search products by name or SKU..." className="pl-9" value={customerSearch} onChange={e=>setCustomerSearch(e.target.value)}/></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
          {filteredProducts.slice(0,30).map((p:any)=>(
            <button key={p.id} onClick={()=>addToCart(p)} className="text-left p-3 rounded-md border hover-elevate active-elevate-2 transition-all">
              <p className="font-medium text-sm truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.sku||"—"}</p>
              <p className="text-sm font-semibold mt-1">₹{fmt(p.selling_price||p.price||0)}</p>
            </button>
          ))}
          {!filteredProducts.length&&<p className="col-span-3 text-center py-4 text-muted-foreground text-sm">No products found</p>}
        </div>
      </div>
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Cart ({cartItems.length} items)</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cartItems.map((it,i)=>(
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="flex-1 min-w-0"><p className="truncate font-medium">{it.product_name}</p><p className="text-xs text-muted-foreground">₹{fmt(it.unit_price)} × {it.quantity}</p></div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-xs" onClick={()=>updateQty(i,it.quantity-1)}>-</Button>
                  <span className="w-6 text-center">{it.quantity}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-xs" onClick={()=>updateQty(i,it.quantity+1)}>+</Button>
                </div>
                <span className="w-20 text-right">₹{fmt(it.amount)}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={()=>setCartItems(p=>p.filter((_,idx)=>idx!==i))}><X className="h-3 w-3"/></Button>
              </div>
            ))}
            {!cartItems.length&&<p className="text-center text-sm text-muted-foreground py-4">Cart is empty</p>}
            <div className="border-t pt-2 space-y-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{fmt(subtotal)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>₹{fmt(tax)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>₹{fmt(total)}</span></div>
            </div>
            <F label="Customer"><Select value={selectedCustomer?.id?String(selectedCustomer.id):"__none__"} onValueChange={v=>{const c=(customers as any[]).find(c=>String(c.id)===v);setSelectedCustomer(c||null);}}><SelectTrigger><SelectValue placeholder="Walk-in customer"/></SelectTrigger><SelectContent><SelectItem value="__none__">Walk-in</SelectItem>{filteredCustomers.map((c:any)=><SelectItem key={c.id} value={String(c.id)}>{c.name} — {c.phone}</SelectItem>)}</SelectContent></Select></F>
            <F label="Payment Mode"><Select value={paymentMode} onValueChange={setPaymentMode}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["cash","card","upi","wallet"].map(m=><SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent></Select></F>
            <F label="Amount Tendered (₹)"><Input type="number" value={amountPaid} onChange={e=>setAmountPaid(e.target.value)} placeholder={fmt(total)}/></F>
            {amountPaid&&change>=0&&<p className="text-sm text-green-700 font-medium">Change: ₹{fmt(change)}</p>}
            <Button className="w-full" onClick={completeSale} disabled={saleMut.isPending || !cartItems.length}>Complete Sale — ₹{fmt(total)}</Button>
            {cartItems.length>0&&<Button variant="outline" className="w-full" onClick={()=>setCartItems([])}>Clear Cart</Button>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Sales History ─────────────────────────────────────────────────────────────
function SalesHistoryTab() {
  const [search, setSearch] = useState("");
  const { data: txns = [] } = useQuery<any[]>({ queryKey: ["/api/pos/transactions"] });
  const filtered = (txns as any[]).filter(t => t.transaction_no?.includes(search) || t.customer_name?.toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search transactions..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Txn No.","Customer","Subtotal","Tax","Discount","Total","Mode","Paid","Change","Date"].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{filtered.map(t=>(
          <tr key={t.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{t.transaction_no}</td><td className="px-3 py-2">{t.customer_name||"Walk-in"}</td>
            <td className="px-3 py-2">₹{fmt(t.subtotal)}</td><td className="px-3 py-2">₹{fmt(t.tax_amount)}</td><td className="px-3 py-2">₹{fmt(t.discount_amount)}</td>
            <td className="px-3 py-2 font-bold">₹{fmt(t.total_amount)}</td><td className="px-3 py-2 uppercase">{t.payment_mode}</td>
            <td className="px-3 py-2">₹{fmt(t.amount_paid)}</td><td className="px-3 py-2">₹{fmt(t.change_given)}</td>
            <td className="px-3 py-2">{new Date(t.created_at).toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"})}</td>
          </tr>
        ))}{!filtered.length&&<tr><td colSpan={10} className="px-3 py-6 text-center text-muted-foreground">No transactions</td></tr>}</tbody>
      </table></div>
    </div>
  );
}

// ── Customers Tab ─────────────────────────────────────────────────────────────
function CustomersTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState(""); const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/pos/customers"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/pos/customers/${editing.id}`, d) : apiRequest("POST", "/api/pos/customers", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pos/customers"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/pos/customers/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pos/customers"] }) });
  const openNew = () => { setEditing(null); setForm({}); setShowForm(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ ...c }); setShowForm(true); };
  const filtered = (customers as any[]).filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input placeholder="Search customers..." className="pl-9" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Customer</Button>
      </div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Code","Name","Phone","Email","Loyalty Pts","Credit Limit","Outstanding",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{filtered.map(c=>(
          <tr key={c.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{c.customer_code}</td><td className="px-3 py-2 font-medium">{c.name}</td>
            <td className="px-3 py-2">{c.phone||"—"}</td><td className="px-3 py-2">{c.email||"—"}</td>
            <td className="px-3 py-2"><Badge className="bg-blue-100 text-blue-700">{c.loyalty_points||0} pts</Badge></td>
            <td className="px-3 py-2">₹{fmt(c.credit_limit)}</td><td className="px-3 py-2">₹{fmt(c.outstanding_balance)}</td>
            <td className="px-3 py-2"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(c)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(c.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div></td>
          </tr>
        ))}{!filtered.length&&<tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No customers</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing?"Edit":"Add"} Customer</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></F></div>
            <F label="Phone"><Input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></F>
            <F label="Email"><Input value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/></F>
            <F label="Credit Limit (₹)"><Input type="number" value={form.credit_limit||""} onChange={e=>setForm({...form,credit_limit:e.target.value})}/></F>
            <F label="Date of Birth"><Input type="date" value={form.date_of_birth||""} onChange={e=>setForm({...form,date_of_birth:e.target.value})}/></F>
            <div className="col-span-2"><F label="Address"><Input value={form.address||""} onChange={e=>setForm({...form,address:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Returns Tab ───────────────────────────────────────────────────────────────
function ReturnsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false); const [form, setForm] = useState<any>({});
  const { data: returns_ = [] } = useQuery<any[]>({ queryKey: ["/api/pos/returns"] });
  const { data: customers = [] } = useQuery<any[]>({ queryKey: ["/api/pos/customers"] });
  const saveMut = useMutation({ mutationFn: (d: any) => apiRequest("POST", "/api/pos/returns", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pos/returns"] }); setShowForm(false); toast({ title: "Return processed" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/pos/returns/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pos/returns"] }) });
  const openNew = () => { setForm({ return_date: new Date().toISOString().split("T")[0], refund_mode: "cash" }); setShowForm(true); };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Process Return</Button></div>
      <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
        <thead className="bg-muted/50"><tr>{["Return No.","Customer","Date","Amount","Reason","Refund Mode","Status",""].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
        <tbody>{(returns_ as any[]).map(r=>(
          <tr key={r.id} className="border-t hover:bg-muted/30">
            <td className="px-3 py-2 font-mono text-xs">{r.return_number}</td><td className="px-3 py-2">{r.customer_name_ref||"Walk-in"}</td>
            <td className="px-3 py-2">{r.return_date?.split("T")[0]}</td><td className="px-3 py-2 font-medium">₹{fmt(r.return_amount)}</td>
            <td className="px-3 py-2 max-w-[150px] truncate">{r.reason||"—"}</td><td className="px-3 py-2 uppercase">{r.refund_mode}</td>
            <td className="px-3 py-2"><Badge className={r.status==="approved"?"bg-green-100 text-green-700":"bg-orange-100 text-orange-700"}>{r.status||"pending"}</Badge></td>
            <td className="px-3 py-2"><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(r.id)}><Trash2 className="h-3.5 w-3.5"/></Button></td>
          </tr>
        ))}{!(returns_ as any[]).length&&<tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No returns</td></tr>}</tbody>
      </table></div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Process Return</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Customer"><Select value={form.customer_id?String(form.customer_id):"__none__"} onValueChange={v=>setForm({...form,customer_id:v==="__none__"?"":v})}><SelectTrigger><SelectValue placeholder="Walk-in"/></SelectTrigger><SelectContent><SelectItem value="__none__">Walk-in</SelectItem>{(customers as any[]).map((c:any)=><SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></F></div>
            <F label="Original Txn No."><Input value={form.original_txn_no||""} onChange={e=>setForm({...form,original_txn_no:e.target.value})}/></F>
            <F label="Return Date"><Input type="date" value={form.return_date||""} onChange={e=>setForm({...form,return_date:e.target.value})}/></F>
            <F label="Return Amount (₹)"><Input type="number" value={form.return_amount||""} onChange={e=>setForm({...form,return_amount:e.target.value})}/></F>
            <F label="Refund Mode"><Select value={form.refund_mode||"cash"} onValueChange={v=>setForm({...form,refund_mode:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{["cash","card","upi","store_credit"].map(m=><SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent></Select></F>
            <div className="col-span-2"><F label="Reason"><Input value={form.reason||""} onChange={e=>setForm({...form,reason:e.target.value})}/></F></div>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Process</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Promotions Tab ────────────────────────────────────────────────────────────
function PromotionsTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<any>(null); const [form, setForm] = useState<any>({});
  const { data: promos = [] } = useQuery<any[]>({ queryKey: ["/api/pos/promotions"] });
  const saveMut = useMutation({ mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/pos/promotions/${editing.id}`, d) : apiRequest("POST", "/api/pos/promotions", d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pos/promotions"] }); setShowForm(false); toast({ title: "Saved" }); } });
  const delMut = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/pos/promotions/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/pos/promotions"] }) });
  const openNew = () => { setEditing(null); setForm({ promo_type: "percentage", is_active: true }); setShowForm(true); };
  const openEdit = (p: any) => { setEditing(p); setForm({ ...p, start_date: p.start_date?.split("T")[0], end_date: p.end_date?.split("T")[0] }); setShowForm(true); };
  const isActive = (p: any) => { if (!p.is_active) return false; const now = Date.now(); if (p.start_date && new Date(p.start_date).getTime() > now) return false; if (p.end_date && new Date(p.end_date).getTime() < now) return false; return true; };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openNew}><Plus className="h-4 w-4 mr-1"/>Add Promotion</Button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(promos as any[]).map(p=>(
          <Card key={p.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2"><p className="font-semibold">{p.name}</p><Badge className={isActive(p)?"bg-green-100 text-green-700":"bg-gray-100 text-gray-700"}>{isActive(p)?"Active":"Inactive"}</Badge></div>
                  {p.promo_code&&<p className="text-xs font-mono bg-muted px-2 py-0.5 rounded mt-1 inline-block">{p.promo_code}</p>}
                </div>
                <div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>openEdit(p)}><Pencil className="h-3.5 w-3.5"/></Button><Button size="icon" variant="ghost" onClick={()=>delMut.mutate(p.id)}><Trash2 className="h-3.5 w-3.5"/></Button></div>
              </div>
              <div className="space-y-1 text-sm">
                <p>{p.promo_type==="percentage" ? `${p.discount_value}% off` : `₹${fmt(p.discount_value)} off`}</p>
                {p.min_purchase_amount>0&&<p className="text-muted-foreground text-xs">Min purchase: ₹{fmt(p.min_purchase_amount)}</p>}
                {p.start_date&&<p className="text-xs text-muted-foreground">{p.start_date?.split("T")[0]} — {p.end_date?.split("T")[0]||"No end"}</p>}
                {p.usage_limit&&<p className="text-xs text-muted-foreground">Uses: {p.times_used||0}/{p.usage_limit}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
        {!(promos as any[]).length&&<p className="col-span-3 text-center py-8 text-muted-foreground">No promotions</p>}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{editing?"Edit":"Add"} Promotion</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><F label="Name *"><Input value={form.name||""} onChange={e=>setForm({...form,name:e.target.value})}/></F></div>
            <F label="Promo Code"><Input placeholder="SAVE10" value={form.promo_code||""} onChange={e=>setForm({...form,promo_code:e.target.value})}/></F>
            <F label="Type"><Select value={form.promo_type||"percentage"} onValueChange={v=>setForm({...form,promo_type:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed Amount (₹)</SelectItem></SelectContent></Select></F>
            <F label={`Discount ${form.promo_type==="percentage"?"%":"(₹)"}`}><Input type="number" value={form.discount_value||""} onChange={e=>setForm({...form,discount_value:e.target.value})}/></F>
            <F label="Min Purchase (₹)"><Input type="number" value={form.min_purchase_amount||""} onChange={e=>setForm({...form,min_purchase_amount:e.target.value})}/></F>
            <F label="Start Date"><Input type="date" value={form.start_date||""} onChange={e=>setForm({...form,start_date:e.target.value})}/></F>
            <F label="End Date"><Input type="date" value={form.end_date||""} onChange={e=>setForm({...form,end_date:e.target.value})}/></F>
            <F label="Usage Limit"><Input type="number" value={form.usage_limit||""} onChange={e=>setForm({...form,usage_limit:e.target.value})}/></F>
            <F label="Status"><Select value={form.is_active?"true":"false"} onValueChange={v=>setForm({...form,is_active:v==="true"})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="true">Active</SelectItem><SelectItem value="false">Inactive</SelectItem></SelectContent></Select></F>
          </div>
          <div className="flex justify-end gap-2 pt-2"><Button variant="outline" onClick={()=>setShowForm(false)}>Cancel</Button><Button onClick={()=>saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────
function SessionsTab() {
  const { data: sessions = [] } = useQuery<any[]>({ queryKey: ["/api/pos/sessions"] });
  return (
    <div className="rounded-md border overflow-x-auto"><table className="w-full text-sm">
      <thead className="bg-muted/50"><tr>{["Counter","Opened","Closed","Opening Balance","Closing Balance","Total Sales","Transactions","Status"].map(h=><th key={h} className="px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
      <tbody>{(sessions as any[]).map(s=>(
        <tr key={s.id} className="border-t hover:bg-muted/30">
          <td className="px-3 py-2 font-medium">{s.counter_name}</td>
          <td className="px-3 py-2">{new Date(s.opened_at).toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"})}</td>
          <td className="px-3 py-2">{s.closed_at?new Date(s.closed_at).toLocaleString("en-IN",{dateStyle:"short",timeStyle:"short"}):"—"}</td>
          <td className="px-3 py-2">₹{fmt(s.opening_balance)}</td><td className="px-3 py-2">₹{fmt(s.closing_balance)}</td>
          <td className="px-3 py-2 font-medium">₹{fmt(s.total_sales)}</td><td className="px-3 py-2">{s.total_transactions}</td>
          <td className="px-3 py-2"><Badge className={s.status==="open"?"bg-green-100 text-green-700":"bg-gray-100 text-gray-700"}>{s.status}</Badge></td>
        </tr>
      ))}{!(sessions as any[]).length&&<tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No sessions</td></tr>}</tbody>
    </table></div>
  );
}

export default function POSPage() {
  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div><h1 className="text-2xl font-bold">POS / Retail Management</h1><p className="text-muted-foreground text-sm mt-1">POS Terminal, Sales History, Customers, Returns, Promotions & Sessions</p></div>
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap gap-1 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="terminal"><ShoppingCart className="h-3.5 w-3.5 mr-1"/>POS Terminal</TabsTrigger>
          <TabsTrigger value="sales">Sales History</TabsTrigger>
          <TabsTrigger value="customers"><Users className="h-3.5 w-3.5 mr-1"/>Customers</TabsTrigger>
          <TabsTrigger value="returns"><RotateCcw className="h-3.5 w-3.5 mr-1"/>Returns</TabsTrigger>
          <TabsTrigger value="promotions"><Tag className="h-3.5 w-3.5 mr-1"/>Promotions</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
        </TabsList>
        <div className="mt-4">
          <TabsContent value="overview"><OverviewTab/></TabsContent>
          <TabsContent value="terminal"><TerminalTab/></TabsContent>
          <TabsContent value="sales"><SalesHistoryTab/></TabsContent>
          <TabsContent value="customers"><CustomersTab/></TabsContent>
          <TabsContent value="returns"><ReturnsTab/></TabsContent>
          <TabsContent value="promotions"><PromotionsTab/></TabsContent>
          <TabsContent value="sessions"><SessionsTab/></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
