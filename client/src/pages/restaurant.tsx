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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, UtensilsCrossed, Table2, ChefHat, Truck, BarChart3, Pencil, Trash2, Check, X, Clock } from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  occupied: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  reserved: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  preparing: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  ready: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  served: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  "out for delivery": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  veg: "bg-green-100 text-green-700",
  "non-veg": "bg-red-100 text-red-700",
};

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldRow({ label, children }: any) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/restaurant/stats"] });
  const occupancy = stats?.totalTables ? Math.round((stats.occupiedTables / stats.totalTables) * 100) : 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Tables" value={`${stats?.occupiedTables ?? 0}/${stats?.totalTables ?? 0}`} icon={Table2} color="bg-blue-100 text-blue-600" />
        <StatCard title="Pending KOTs" value={stats?.pendingKots ?? 0} icon={ChefHat} color="bg-orange-100 text-orange-600" />
        <StatCard title="Active Deliveries" value={stats?.activeDeliveries ?? 0} icon={Truck} color="bg-purple-100 text-purple-600" />
        <StatCard title="Today's Revenue" value={`₹${fmt(stats?.todayRevenue)}`} icon={BarChart3} color="bg-green-100 text-green-600" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Table Occupancy</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold">{occupancy}%</div>
            <div className="flex-1 bg-muted rounded-full h-4">
              <div className="bg-orange-500 h-4 rounded-full transition-all" style={{ width: `${occupancy}%` }} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{stats?.occupiedTables ?? 0} of {stats?.totalTables ?? 0} tables occupied</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── POS / KOT Tab ─────────────────────────────────────────────────────────────
function POSKOTTab() {
  const { toast } = useToast();
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [waiter, setWaiter] = useState("");
  const [orderType, setOrderType] = useState("dine_in");
  const [showKots, setShowKots] = useState(false);

  const { data: tables = [] } = useQuery<any[]>({ queryKey: ["/api/restaurant/tables"] });
  const { data: menuItems = [] } = useQuery<any[]>({ queryKey: ["/api/restaurant/menu-items"] });
  const { data: categories = [] } = useQuery<any[]>({ queryKey: ["/api/restaurant/menu-categories"] });
  const { data: kots = [] } = useQuery<any[]>({ queryKey: ["/api/restaurant/kot-orders"] });

  const createKot = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/restaurant/kot-orders", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/kot-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/stats"] });
      setCart([]); setSelectedTable(null); setWaiter("");
      toast({ title: "KOT Created" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateKot = useMutation({
    mutationFn: ({ id, status }: any) => apiRequest("PUT", `/api/restaurant/kot-orders/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/kot-orders"] }); toast({ title: "Updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addToCart = (item: any) => {
    setCart(prev => {
      const exists = prev.find(c => c.menu_item_id === item.id);
      if (exists) return prev.map(c => c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1, amount: (c.quantity + 1) * c.rate } : c);
      return [...prev, { menu_item_id: item.id, name: item.name, quantity: 1, rate: Number(item.price), amount: Number(item.price) }];
    });
  };

  const removeFromCart = (menuItemId: number) => setCart(prev => prev.filter(c => c.menu_item_id !== menuItemId));
  const total = cart.reduce((s, c) => s + c.amount, 0);

  const placeOrder = () => {
    if (cart.length === 0) return toast({ title: "Cart empty", variant: "destructive" });
    createKot.mutate({ table_id: selectedTable?.id || null, order_type: orderType, waiter_name: waiter, items: cart });
  };

  const [catFilter, setCatFilter] = useState<string>("all");
  const filteredMenu = catFilter === "all" ? menuItems.filter((m: any) => m.is_available) : menuItems.filter((m: any) => m.is_available && m.category_id?.toString() === catFilter);
  const pendingKots = kots.filter((k: any) => k.status === 'pending' || k.status === 'preparing');

  return (
    <div className="grid md:grid-cols-3 gap-4">
      {/* Menu */}
      <div className="md:col-span-2 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={catFilter === "all" ? "default" : "outline"} onClick={() => setCatFilter("all")}>All</Button>
          {categories.map((c: any) => (
            <Button key={c.id} size="sm" variant={catFilter === c.id.toString() ? "default" : "outline"} onClick={() => setCatFilter(c.id.toString())}>{c.name}</Button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filteredMenu.map((item: any) => (
            <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => addToCart(item)}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <span className="font-medium text-sm">{item.name}</span>
                  <Badge className={`text-xs ${item.food_type === 'veg' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{item.food_type === 'veg' ? '🟢' : '🔴'}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{item.category_name}</p>
                <p className="font-bold mt-1">₹{fmt(item.price)}</p>
              </CardContent>
            </Card>
          ))}
          {filteredMenu.length === 0 && <div className="col-span-full text-center py-6 text-muted-foreground">No items</div>}
        </div>

        {/* KOT List */}
        {showKots && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><ChefHat className="h-4 w-4" />Active KOTs ({pendingKots.length})</h3>
            <div className="space-y-2">
              {pendingKots.map((k: any) => (
                <Card key={k.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs font-bold">{k.kot_number}</p>
                      <p className="text-sm">{k.table_number ? `Table ${k.table_number}` : k.order_type}</p>
                      <p className="text-xs text-muted-foreground">{k.waiter_name || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={STATUS_COLORS[k.status] || ""}>{k.status}</Badge>
                      {k.status === 'pending' && <Button size="sm" onClick={() => updateKot.mutate({ id: k.id, status: 'preparing' })}>Prepare</Button>}
                      {k.status === 'preparing' && <Button size="sm" variant="outline" onClick={() => updateKot.mutate({ id: k.id, status: 'ready' })}><Check className="h-3 w-3 mr-1" />Ready</Button>}
                      {k.status === 'ready' && <Button size="sm" variant="outline" onClick={() => updateKot.mutate({ id: k.id, status: 'served' })}>Served</Button>}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {pendingKots.length === 0 && <p className="text-muted-foreground text-sm">No active KOTs</p>}
            </div>
          </div>
        )}
      </div>

      {/* Cart / Order */}
      <div className="space-y-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">New Order</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <FieldRow label="Order Type">
              <Select value={orderType} onValueChange={setOrderType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["dine_in", "takeaway", "delivery"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            {orderType === 'dine_in' && (
              <FieldRow label="Table">
                <Select value={selectedTable?.id?.toString() || ""} onValueChange={v => setSelectedTable(tables.find((t: any) => t.id.toString() === v))}>
                  <SelectTrigger><SelectValue placeholder="Select table" /></SelectTrigger>
                  <SelectContent>{tables.map((t: any) => <SelectItem key={t.id} value={t.id.toString()}>Table {t.table_number} ({t.status})</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
            )}
            <FieldRow label="Waiter"><Input value={waiter} onChange={e => setWaiter(e.target.value)} placeholder="Waiter name" /></FieldRow>

            <div className="border rounded-md divide-y min-h-[100px]">
              {cart.length === 0 && <p className="text-center text-muted-foreground text-sm py-6">Click items to add</p>}
              {cart.map(c => (
                <div key={c.menu_item_id} className="flex items-center justify-between px-2 py-1.5">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">×{c.quantity} @ ₹{fmt(c.rate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">₹{fmt(c.amount)}</span>
                    <Button size="sm" variant="ghost" className="text-red-600 h-6 w-6 p-0" onClick={() => removeFromCart(c.menu_item_id)}><X className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between font-bold">
              <span>Total</span>
              <span>₹{fmt(total)}</span>
            </div>

            <Button className="w-full" onClick={placeOrder} disabled={cart.length === 0 || createKot.isPending}>
              {createKot.isPending ? "Sending..." : "Send to Kitchen (KOT)"}
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setShowKots(v => !v)}>
              {showKots ? "Hide" : "View"} Active KOTs ({pendingKots.length})
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Tables Tab ────────────────────────────────────────────────────────────────
function TablesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: tables = [] } = useQuery<any[]>({ queryKey: ["/api/restaurant/tables"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PUT", `/api/restaurant/tables/${editing.id}`, data)
      : apiRequest("POST", "/api/restaurant/tables", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/tables"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/restaurant/tables/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/tables"] }); toast({ title: "Deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openForm = (t?: any) => { setEditing(t || null); setForm(t ? { ...t } : { capacity: 4, status: "available" }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Table</Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {tables.map((t: any) => (
          <Card key={t.id} className="cursor-pointer hover:shadow-md">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold mb-1">{t.table_number}</div>
              <p className="text-xs text-muted-foreground mb-2">{t.section || "Main Hall"} · {t.capacity} seats</p>
              <Badge className={STATUS_COLORS[t.status] || ""}>{t.status}</Badge>
              <div className="flex gap-1 mt-3">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openForm(t)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" className="flex-1 text-red-600" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {tables.length === 0 && <div className="col-span-full text-center py-8 text-muted-foreground">No tables</div>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Edit Table" : "Add Table"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <FieldRow label="Table Number *"><Input value={form.table_number || ""} onChange={e => setForm((p: any) => ({ ...p, table_number: e.target.value }))} /></FieldRow>
            <FieldRow label="Section"><Input value={form.section || ""} onChange={e => setForm((p: any) => ({ ...p, section: e.target.value }))} placeholder="Main Hall, Terrace, etc." /></FieldRow>
            <FieldRow label="Capacity"><Input type="number" value={form.capacity || 4} onChange={e => setForm((p: any) => ({ ...p, capacity: e.target.value }))} /></FieldRow>
            <FieldRow label="Status">
              <Select value={form.status || "available"} onValueChange={v => setForm((p: any) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["available", "occupied", "reserved", "maintenance"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => saveMutation.mutate(form)} disabled={!form.table_number}>Save</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Menu Tab ──────────────────────────────────────────────────────────────────
function MenuTab() {
  const { toast } = useToast();
  const [showItemForm, setShowItemForm] = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [itemForm, setItemForm] = useState<any>({});
  const [catForm, setCatForm] = useState<any>({});
  const [search, setSearch] = useState("");

  const { data: items = [] } = useQuery<any[]>({ queryKey: ["/api/restaurant/menu-items"] });
  const { data: categories = [] } = useQuery<any[]>({ queryKey: ["/api/restaurant/menu-categories"] });

  const saveItem = useMutation({
    mutationFn: (data: any) => editingItem
      ? apiRequest("PUT", `/api/restaurant/menu-items/${editingItem.id}`, data)
      : apiRequest("POST", "/api/restaurant/menu-items", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/menu-items"] }); setShowItemForm(false); setEditingItem(null); setItemForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteItem = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/restaurant/menu-items/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/menu-items"] }); toast({ title: "Deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveCat = useMutation({
    mutationFn: (data: any) => editingCat
      ? apiRequest("PUT", `/api/restaurant/menu-categories/${editingCat.id}`, data)
      : apiRequest("POST", "/api/restaurant/menu-categories", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/menu-categories"] }); setShowCatForm(false); setEditingCat(null); setCatForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteCat = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/restaurant/menu-categories/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/restaurant/menu-categories"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = items.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()) || i.category_name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Categories</h3>
          <Button size="sm" onClick={() => { setEditingCat(null); setCatForm({}); setShowCatForm(true); }}><Plus className="h-3 w-3 mr-1" />Add Category</Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((c: any) => (
            <div key={c.id} className="flex items-center gap-1 border rounded-full px-3 py-1 text-sm">
              <span>{c.name}</span>
              <Button size="sm" variant="ghost" className="h-4 w-4 p-0" onClick={() => { setEditingCat(c); setCatForm({ ...c }); setShowCatForm(true); }}><Pencil className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" className="h-4 w-4 p-0 text-red-600" onClick={() => deleteCat.mutate(c.id)}><X className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search menu…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <Button size="sm" onClick={() => { setEditingItem(null); setItemForm({ food_type: "veg", is_available: true, prep_time_minutes: 15 }); setShowItemForm(true); }}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
        </div>
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>{["Item", "Category", "Type", "Price", "Cost", "Prep (min)", "Available", ""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-medium">{item.name}</td>
                  <td className="px-3 py-2">{item.category_name || "—"}</td>
                  <td className="px-3 py-2"><Badge className={item.food_type === 'veg' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>{item.food_type}</Badge></td>
                  <td className="px-3 py-2">₹{fmt(item.price)}</td>
                  <td className="px-3 py-2">₹{fmt(item.cost_price)}</td>
                  <td className="px-3 py-2">{item.prep_time_minutes}</td>
                  <td className="px-3 py-2">{item.is_available ? <Check className="h-4 w-4 text-green-600" /> : <X className="h-4 w-4 text-red-600" />}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingItem(item); setItemForm({ ...item }); setShowItemForm(true); }}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteItem.mutate(item.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">No menu items</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Item form dialog */}
      <Dialog open={showItemForm} onOpenChange={v => { if (!v) { setShowItemForm(false); setEditingItem(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Name *"><Input value={itemForm.name || ""} onChange={e => setItemForm((p: any) => ({ ...p, name: e.target.value }))} /></FieldRow></div>
            <FieldRow label="Category">
              <Select value={itemForm.category_id?.toString() || ""} onValueChange={v => setItemForm((p: any) => ({ ...p, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>{categories.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Food Type">
              <Select value={itemForm.food_type || "veg"} onValueChange={v => setItemForm((p: any) => ({ ...p, food_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["veg", "non-veg", "egg"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Price"><Input type="number" value={itemForm.price || ""} onChange={e => setItemForm((p: any) => ({ ...p, price: e.target.value }))} /></FieldRow>
            <FieldRow label="Cost Price"><Input type="number" value={itemForm.cost_price || ""} onChange={e => setItemForm((p: any) => ({ ...p, cost_price: e.target.value }))} /></FieldRow>
            <FieldRow label="Prep Time (min)"><Input type="number" value={itemForm.prep_time_minutes || 15} onChange={e => setItemForm((p: any) => ({ ...p, prep_time_minutes: e.target.value }))} /></FieldRow>
            <FieldRow label="Available">
              <Select value={itemForm.is_available !== false ? "true" : "false"} onValueChange={v => setItemForm((p: any) => ({ ...p, is_available: v === "true" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
              </Select>
            </FieldRow>
            <div className="col-span-2"><FieldRow label="Description"><Textarea value={itemForm.description || ""} onChange={e => setItemForm((p: any) => ({ ...p, description: e.target.value }))} rows={2} /></FieldRow></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => saveItem.mutate(itemForm)} disabled={!itemForm.name}>Save</Button>
            <Button variant="outline" onClick={() => { setShowItemForm(false); setEditingItem(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category form dialog */}
      <Dialog open={showCatForm} onOpenChange={v => { if (!v) { setShowCatForm(false); setEditingCat(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingCat ? "Edit Category" : "Add Category"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <FieldRow label="Name *"><Input value={catForm.name || ""} onChange={e => setCatForm((p: any) => ({ ...p, name: e.target.value }))} /></FieldRow>
            <FieldRow label="Sort Order"><Input type="number" value={catForm.sort_order || 0} onChange={e => setCatForm((p: any) => ({ ...p, sort_order: e.target.value }))} /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => saveCat.mutate(catForm)} disabled={!catForm.name}>Save</Button>
            <Button variant="outline" onClick={() => { setShowCatForm(false); setEditingCat(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Kitchen Display Tab ───────────────────────────────────────────────────────
function KitchenDisplayTab() {
  const { toast } = useToast();
  const { data: kots = [] } = useQuery<any[]>({ queryKey: ["/api/restaurant/kot-orders"] }, { refetchInterval: 15000 });

  const updateKot = useMutation({
    mutationFn: ({ id, status }: any) => apiRequest("PUT", `/api/restaurant/kot-orders/${id}`, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/kot-orders"] }); queryClient.invalidateQueries({ queryKey: ["/api/restaurant/stats"] }); toast({ title: "Updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const activeKots = kots.filter((k: any) => ['pending', 'preparing', 'ready'].includes(k.status));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><ChefHat className="h-5 w-5" />Kitchen Display ({activeKots.length} active)</h3>
        <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Auto-refresh 15s</Badge>
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {activeKots.map((k: any) => (
          <Card key={k.id} className={`border-2 ${k.status === 'pending' ? 'border-yellow-400' : k.status === 'preparing' ? 'border-orange-400' : 'border-green-400'}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono">{k.kot_number}</CardTitle>
                <Badge className={STATUS_COLORS[k.status] || ""}>{k.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{k.table_number ? `Table ${k.table_number}` : k.order_type} · {k.waiter_name || "—"}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <KOTItems kotId={k.id} />
              <div className="flex gap-2">
                {k.status === 'pending' && <Button size="sm" className="flex-1 bg-orange-500 hover:bg-orange-600" onClick={() => updateKot.mutate({ id: k.id, status: 'preparing' })}>Start</Button>}
                {k.status === 'preparing' && <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600" onClick={() => updateKot.mutate({ id: k.id, status: 'ready' })}><Check className="h-3 w-3 mr-1" />Ready</Button>}
                {k.status === 'ready' && <Button size="sm" variant="outline" className="flex-1" onClick={() => updateKot.mutate({ id: k.id, status: 'served' })}>Mark Served</Button>}
              </div>
            </CardContent>
          </Card>
        ))}
        {activeKots.length === 0 && (
          <div className="col-span-full text-center py-12">
            <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">All caught up! No active orders.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function KOTItems({ kotId }: { kotId: number }) {
  const { data: items = [] } = useQuery<any[]>({ queryKey: [`/api/restaurant/kot-orders/${kotId}/items`] });
  return (
    <ul className="text-sm space-y-1">
      {items.map((it: any) => (
        <li key={it.id} className="flex justify-between">
          <span>{it.item_name || "Item"}</span>
          <span className="font-bold">×{it.quantity}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Delivery Tab ──────────────────────────────────────────────────────────────
function DeliveryTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/restaurant/delivery-orders"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PUT", `/api/restaurant/delivery-orders/${editing.id}`, data)
      : apiRequest("POST", "/api/restaurant/delivery-orders", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/delivery-orders"] }); queryClient.invalidateQueries({ queryKey: ["/api/restaurant/stats"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusNext: Record<string, string> = { pending: 'preparing', preparing: 'ready', ready: 'out for delivery', 'out for delivery': 'delivered' };

  const advance = useMutation({
    mutationFn: ({ id, status }: any) => apiRequest("PUT", `/api/restaurant/delivery-orders/${id}`, { ...orders.find(o => o.id === id), status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/delivery-orders"] }); toast({ title: "Updated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openForm = (o?: any) => { setEditing(o || null); setForm(o ? { ...o } : { platform: "direct" }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />New Delivery Order</Button>
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {orders.filter((o: any) => o.status !== 'delivered' && o.status !== 'cancelled').map((o: any) => (
          <Card key={o.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-mono text-xs font-bold">{o.order_number}</p>
                  <p className="font-medium">{o.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                </div>
                <Badge className={STATUS_COLORS[o.status] || ""}>{o.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{o.delivery_address}</p>
              <div className="flex items-center justify-between mt-2">
                <Badge variant="outline">{o.platform}</Badge>
                <span className="font-bold text-sm">₹{fmt(o.total_amount)}</span>
              </div>
              <div className="flex gap-1 mt-3">
                {statusNext[o.status] && (
                  <Button size="sm" className="flex-1" onClick={() => advance.mutate({ id: o.id, status: statusNext[o.status] })}>
                    → {statusNext[o.status]}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openForm(o)}><Pencil className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>{["Order No", "Customer", "Platform", "Amount", "Status"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {orders.filter((o: any) => o.status === 'delivered' || o.status === 'cancelled').map(o => (
              <tr key={o.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{o.order_number}</td>
                <td className="px-3 py-2">{o.customer_name}</td>
                <td className="px-3 py-2">{o.platform}</td>
                <td className="px-3 py-2">₹{fmt(o.total_amount)}</td>
                <td className="px-3 py-2"><Badge className={STATUS_COLORS[o.status] || ""}>{o.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Order" : "New Delivery Order"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <FieldRow label="Customer Name *"><Input value={form.customer_name || ""} onChange={e => setForm((p: any) => ({ ...p, customer_name: e.target.value }))} /></FieldRow>
            <FieldRow label="Phone"><Input value={form.customer_phone || ""} onChange={e => setForm((p: any) => ({ ...p, customer_phone: e.target.value }))} /></FieldRow>
            <FieldRow label="Delivery Address"><Textarea value={form.delivery_address || ""} onChange={e => setForm((p: any) => ({ ...p, delivery_address: e.target.value }))} rows={2} /></FieldRow>
            <FieldRow label="Platform">
              <Select value={form.platform || "direct"} onValueChange={v => setForm((p: any) => ({ ...p, platform: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["direct", "Swiggy", "Zomato", "Dunzo"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Total Amount"><Input type="number" value={form.total_amount || ""} onChange={e => setForm((p: any) => ({ ...p, total_amount: e.target.value }))} /></FieldRow>
              <FieldRow label="Delivery Fee"><Input type="number" value={form.delivery_fee || ""} onChange={e => setForm((p: any) => ({ ...p, delivery_fee: e.target.value }))} /></FieldRow>
            </div>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2} /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => saveMutation.mutate(form)} disabled={!form.customer_name}>Save</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
function ReportsTab() {
  const { data: kots = [] } = useQuery<any[]>({ queryKey: ["/api/restaurant/kot-orders"] });
  const { data: deliveries = [] } = useQuery<any[]>({ queryKey: ["/api/restaurant/delivery-orders"] });
  const { data: sessions = [] } = useQuery<any[]>({ queryKey: ["/api/restaurant/sessions"] });
  const { toast } = useToast();
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [form, setForm] = useState<any>({});

  const openSession = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/restaurant/sessions", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/sessions"] }); setShowSessionForm(false); setForm({}); toast({ title: "Session opened" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeSession = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest("PUT", `/api/restaurant/sessions/${id}/close`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/restaurant/sessions"] }); toast({ title: "Session closed" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const todayKots = kots.filter((k: any) => {
    const d = new Date(k.created_at);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const deliveredToday = deliveries.filter((d: any) => {
    const dt = new Date(d.created_at);
    const today = new Date();
    return dt.toDateString() === today.toDateString() && d.status === 'delivered';
  });

  const deliveryRevenue = deliveredToday.reduce((s: number, d: any) => s + Number(d.total_amount || 0), 0);
  const openSessions = sessions.filter((s: any) => s.status === 'open');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Today's KOTs</p><p className="text-2xl font-bold">{todayKots.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Served Today</p><p className="text-2xl font-bold">{todayKots.filter((k: any) => k.status === 'served').length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Deliveries Today</p><p className="text-2xl font-bold">{deliveredToday.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Delivery Revenue</p><p className="text-2xl font-bold">₹{fmt(deliveryRevenue)}</p></CardContent></Card>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Sessions</h3>
          <Button size="sm" onClick={() => setShowSessionForm(true)}><Plus className="h-3 w-3 mr-1" />Open Session</Button>
        </div>
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>{["Session", "Opened By", "Opening Cash", "Total Sales", "Status", ""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {sessions.slice(0, 20).map((s: any) => (
                <tr key={s.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2">{s.session_name}</td>
                  <td className="px-3 py-2">{s.opened_by || "—"}</td>
                  <td className="px-3 py-2">₹{fmt(s.opening_cash)}</td>
                  <td className="px-3 py-2">₹{fmt(s.total_sales)}</td>
                  <td className="px-3 py-2"><Badge className={s.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>{s.status}</Badge></td>
                  <td className="px-3 py-2">
                    {s.status === 'open' && <Button size="sm" variant="outline" onClick={() => closeSession.mutate({ id: s.id, closing_cash: 0 })}>Close</Button>}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">No sessions</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={showSessionForm} onOpenChange={v => { if (!v) setShowSessionForm(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Open Session</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <FieldRow label="Session Name *"><Input value={form.session_name || ""} onChange={e => setForm((p: any) => ({ ...p, session_name: e.target.value }))} placeholder="Morning / Evening" /></FieldRow>
            <FieldRow label="Opened By"><Input value={form.opened_by || ""} onChange={e => setForm((p: any) => ({ ...p, opened_by: e.target.value }))} /></FieldRow>
            <FieldRow label="Opening Cash"><Input type="number" value={form.opening_cash || ""} onChange={e => setForm((p: any) => ({ ...p, opening_cash: e.target.value }))} /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => openSession.mutate(form)} disabled={!form.session_name}>Open</Button>
            <Button variant="outline" onClick={() => setShowSessionForm(false)}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RestaurantPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
          <UtensilsCrossed className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Restaurant ERP</h1>
          <p className="text-sm text-muted-foreground">POS, KOT, kitchen display & delivery</p>
        </div>
      </div>

      <Tabs defaultValue="pos">
        <TabsList className="flex-wrap">
          <TabsTrigger value="pos">POS / KOT</TabsTrigger>
          <TabsTrigger value="tables">Tables</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
          <TabsTrigger value="kitchen">Kitchen Display</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="pos"><POSKOTTab /></TabsContent>
        <TabsContent value="tables"><TablesTab /></TabsContent>
        <TabsContent value="menu"><MenuTab /></TabsContent>
        <TabsContent value="kitchen"><KitchenDisplayTab /></TabsContent>
        <TabsContent value="delivery"><DeliveryTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
