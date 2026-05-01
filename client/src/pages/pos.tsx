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
import { Plus, Search, ShoppingCart, CreditCard, Trash2, IndianRupee, Receipt, X } from "lucide-react";

interface CartItem { product_id?: string; product_name: string; sku?: string; quantity: number; unit_price: number; discount_pct: number; tax_rate: number; }

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card><CardContent className="p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-sm text-muted-foreground">{title}</p><p className="text-2xl font-bold">{value}</p></div>
    </CardContent></Card>
  );
}

// ── POS Terminal ──────────────────────────────────────────────────────────────
function POSTerminal({ session }: { session: any }) {
  const { toast } = useToast();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [customerName, setCustomerName] = useState("");
  const [search, setSearch] = useState("");
  const [showPayment, setShowPayment] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");

  const { data: products = [] } = useQuery<any[]>({ queryKey: ["/api/products"] });

  const saleMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/pos/transactions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pos/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pos/stats"] });
      setCart([]); setShowPayment(false); setCustomerName(""); setAmountPaid("");
      toast({ title: "Sale recorded successfully" });
    },
    onError: () => toast({ title: "Sale failed", variant: "destructive" }),
  });

  const filteredProducts = products.filter(p => (p.name || "").toLowerCase().includes(search.toLowerCase()) || (p.sku || "").toLowerCase().includes(search.toLowerCase())).slice(0, 20);

  const addToCart = (p: any) => {
    setCart(prev => {
      const existing = prev.findIndex(c => c.product_id === p.id);
      if (existing >= 0) { const n = [...prev]; n[existing] = {...n[existing], quantity: n[existing].quantity + 1}; return n; }
      return [...prev, { product_id: p.id, product_name: p.name, sku: p.sku, quantity: 1, unit_price: Number(p.sellingPrice || p.price || 0), discount_pct: 0, tax_rate: Number(p.gstRate || 18) }];
    });
  };

  const removeFromCart = (i: number) => setCart(prev => prev.filter((_, idx) => idx !== i));
  const updateQty = (i: number, qty: number) => { if (qty <= 0) return removeFromCart(i); setCart(prev => { const n = [...prev]; n[i] = {...n[i], quantity: qty}; return n; }); };

  const subtotal = cart.reduce((s, c) => s + c.quantity * c.unit_price * (1 - c.discount_pct / 100), 0);
  const tax = cart.reduce((s, c) => s + c.quantity * c.unit_price * (1 - c.discount_pct / 100) * c.tax_rate / 100, 0);
  const total = subtotal + tax;
  const change = Math.max(0, Number(amountPaid || 0) - total);

  const handleSale = () => {
    if (cart.length === 0) return;
    saleMutation.mutate({
      session_id: session?.id || null,
      customer_name: customerName || null,
      items: cart,
      payment_mode: paymentMode,
      amount_paid: Number(amountPaid) || total,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Product Search */}
      <div className="lg:col-span-2 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search products by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-pos-search" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
          {filteredProducts.map(p => (
            <Card key={p.id} className="cursor-pointer hover-elevate active-elevate-2" onClick={() => addToCart(p)} data-testid={`btn-add-product-${p.id}`}>
              <CardContent className="p-3">
                <p className="font-medium text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.sku || "—"}</p>
                <p className="text-sm font-bold mt-1 text-primary">₹{Number(p.sellingPrice || p.price || 0).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
          {filteredProducts.length === 0 && <div className="col-span-3 text-center py-8 text-muted-foreground text-sm">No products found</div>}
        </div>
      </div>

      {/* Cart & Payment */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><ShoppingCart className="h-4 w-4" />Cart ({cart.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {cart.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-sm" data-testid={`cart-item-${i}`}>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{c.product_name}</p>
                  <p className="text-xs text-muted-foreground">₹{c.unit_price} × {c.quantity}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(i, c.quantity - 1)}>-</Button>
                  <span className="w-6 text-center text-xs">{c.quantity}</span>
                  <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(i, c.quantity + 1)}>+</Button>
                </div>
                <p className="w-16 text-right text-xs font-semibold">₹{(c.quantity * c.unit_price * (1 - c.discount_pct / 100)).toFixed(0)}</p>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeFromCart(i)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
            {cart.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No items in cart</p>}
          </div>

          <div className="border-t pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>GST</span><span>₹{tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-bold text-base"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
          </div>

          <div className="space-y-2">
            <div><Label className="text-xs">Customer Name</Label><Input className="h-8 text-sm" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in" /></div>
            <div><Label className="text-xs">Payment Mode</Label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="card">Card</SelectItem><SelectItem value="credit">Credit</SelectItem></SelectContent>
              </Select>
            </div>
            {paymentMode === "cash" && (
              <div><Label className="text-xs">Amount Received (₹)</Label>
                <Input className="h-8 text-sm" type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} placeholder={total.toFixed(2)} />
                {Number(amountPaid) > 0 && <p className="text-xs text-green-600 mt-0.5">Change: ₹{change.toFixed(2)}</p>}
              </div>
            )}
          </div>

          <Button className="w-full" onClick={handleSale} disabled={cart.length === 0 || saleMutation.isPending} data-testid="button-complete-sale">
            <CreditCard className="h-4 w-4 mr-2" />{saleMutation.isPending ? "Processing..." : `Charge ₹${total.toFixed(2)}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Sales History Tab ─────────────────────────────────────────────────────────
function SalesHistoryTab() {
  const { data: transactions = [] } = useQuery<any[]>({ queryKey: ["/api/pos/transactions"] });

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="border-b bg-muted/40"><th className="text-left p-3">Transaction No.</th><th className="text-left p-3">Customer</th><th className="text-right p-3">Total (₹)</th><th className="text-left p-3">Mode</th><th className="text-left p-3">Time</th></tr></thead>
          <tbody>
            {transactions.map(t => (
              <tr key={t.id} className="border-b" data-testid={`row-txn-${t.id}`}>
                <td className="p-3 font-mono text-xs">{t.transaction_no}</td>
                <td className="p-3">{t.customer_name || "Walk-in"}</td>
                <td className="p-3 text-right font-semibold">₹{Number(t.total_amount || 0).toLocaleString()}</td>
                <td className="p-3"><Badge variant="outline">{t.payment_mode}</Badge></td>
                <td className="p-3 text-muted-foreground">{new Date(t.created_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
              </tr>
            ))}
            {transactions.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No transactions yet</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Sessions Tab ──────────────────────────────────────────────────────────────
function SessionsTab({ activeSession, onSessionChange }: { activeSession: any; onSessionChange: () => void }) {
  const { toast } = useToast();
  const [showOpen, setShowOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("");

  const { data: sessions = [] } = useQuery<any[]>({ queryKey: ["/api/pos/sessions"] });

  const openMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/pos/sessions/open", { opening_balance: Number(openingBalance) || 0 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions"] }); queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions/active"] }); onSessionChange(); setShowOpen(false); toast({ title: "Session opened" }); },
    onError: () => toast({ title: "Failed to open session", variant: "destructive" }),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/pos/sessions/${id}/close`, { closing_balance: activeSession?.total_sales || 0 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions"] }); queryClient.invalidateQueries({ queryKey: ["/api/pos/sessions/active"] }); onSessionChange(); toast({ title: "Session closed" }); },
    onError: () => toast({ title: "Failed to close session", variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!activeSession ? (
          <Button onClick={() => setShowOpen(true)} data-testid="button-open-session"><Plus className="h-4 w-4 mr-1" />Open Session</Button>
        ) : (
          <Button variant="destructive" onClick={() => closeMutation.mutate(activeSession.id)} data-testid="button-close-session">Close Current Session</Button>
        )}
      </div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40"><th className="text-left p-3">Counter</th><th className="text-left p-3">Opened</th><th className="text-left p-3">Closed</th><th className="text-right p-3">Sales (₹)</th><th className="text-right p-3">Txns</th><th className="text-left p-3">Status</th></tr></thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} className="border-b" data-testid={`row-session-${s.id}`}>
                  <td className="p-3">{s.counter_name}</td>
                  <td className="p-3 text-muted-foreground">{new Date(s.opened_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="p-3 text-muted-foreground">{s.closed_at ? new Date(s.closed_at).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                  <td className="p-3 text-right font-semibold">₹{Number(s.total_sales || 0).toLocaleString()}</td>
                  <td className="p-3 text-right">{s.total_transactions || 0}</td>
                  <td className="p-3"><Badge variant={s.status === "open" ? "default" : "secondary"}>{s.status}</Badge></td>
                </tr>
              ))}
              {sessions.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No sessions yet</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showOpen} onOpenChange={setShowOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Open POS Session</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Opening Cash Balance (₹)</Label><Input type="number" value={openingBalance} onChange={e => setOpeningBalance(e.target.value)} placeholder="0" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowOpen(false)}>Cancel</Button>
              <Button onClick={() => openMutation.mutate()} disabled={openMutation.isPending}>Open Session</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function POSPage() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/pos/stats"] });
  const { data: activeSession, refetch } = useQuery<any>({ queryKey: ["/api/pos/sessions/active"] });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Point of Sale</h1>
          <p className="text-muted-foreground mt-0.5">
            {activeSession ? <span className="text-green-600 font-medium">Session Open — {activeSession.counter_name}</span> : <span className="text-orange-500">No active session</span>}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Sales" value={`₹${Number(stats?.todaySales || 0).toLocaleString()}`} icon={IndianRupee} color="bg-green-100 text-green-600" />
        <StatCard title="Today's Transactions" value={stats?.todayTransactions ?? 0} icon={Receipt} color="bg-blue-100 text-blue-600" />
        <StatCard title="Monthly Sales" value={`₹${Number(stats?.monthlySales || 0).toLocaleString()}`} icon={ShoppingCart} color="bg-purple-100 text-purple-600" />
        <StatCard title="Open Sessions" value={stats?.openSessions ?? 0} icon={CreditCard} color="bg-orange-100 text-orange-600" />
      </div>

      <Tabs defaultValue="terminal">
        <TabsList className="flex-wrap">
          <TabsTrigger value="terminal" data-testid="tab-pos-terminal">POS Terminal</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-pos-history">Sales History</TabsTrigger>
          <TabsTrigger value="sessions" data-testid="tab-pos-sessions">Sessions</TabsTrigger>
        </TabsList>
        <TabsContent value="terminal" className="mt-4">
          {!activeSession ? (
            <Card><CardContent className="p-8 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">No active session</p>
              <p className="text-sm text-muted-foreground mt-1">Open a session from the Sessions tab to start selling</p>
            </CardContent></Card>
          ) : (
            <POSTerminal session={activeSession} />
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-4"><SalesHistoryTab /></TabsContent>
        <TabsContent value="sessions" className="mt-4"><SessionsTab activeSession={activeSession} onSessionChange={() => refetch()} /></TabsContent>
      </Tabs>
    </div>
  );
}
