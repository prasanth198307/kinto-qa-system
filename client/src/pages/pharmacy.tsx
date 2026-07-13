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
import { Plus, Search, Pill, Package, ShoppingCart, FileText, Shield, AlertCircle, Pencil, Trash2, X, TrendingUp } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

function StatCard({ title, value, icon: Icon, color, alert }: any) {
  return (
    <Card className={alert ? "border-red-300" : ""}><CardContent className="p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
      <div><p className="text-sm text-muted-foreground">{title}</p><p className={`text-2xl font-bold ${alert ? "text-red-600" : ""}`}>{value}</p></div>
    </CardContent></Card>
  );
}

function FieldRow({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}

const SCHEDULES = ["OTC", "H", "H1", "X", "G", "J"];

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/pharmacy/stats"] });
  const { data: expiry = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/stock/expiry-alerts"] });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard title="Total Drugs" value={stats?.totalDrugs ?? 0} icon={Pill} color="bg-blue-100 text-blue-600" />
        <StatCard title="Today's Sales" value={`${sym}${fmt(stats?.todaySalesAmount)} (${stats?.todaySalesCount ?? 0})`} icon={TrendingUp} color="bg-green-100 text-green-600" />
        <StatCard title="Stock Value" value={`${sym}${fmt(stats?.stockValue)}`} icon={Package} color="bg-purple-100 text-purple-600" />
        <StatCard title="Expiring in 30 Days" value={stats?.expiringIn30 ?? 0} icon={AlertCircle} color="bg-red-100 text-red-600" alert={stats?.expiringIn30 > 0} />
        <StatCard title="Expiring in 60 Days" value={stats?.expiringIn60 ?? 0} icon={AlertCircle} color="bg-orange-100 text-orange-600" alert={stats?.expiringIn60 > 0} />
      </div>
      {expiry.length > 0 && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-base text-red-700 flex items-center gap-2"><AlertCircle className="h-4 w-4" />Expiry Alerts</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiry.slice(0, 20).map((s: any) => {
                const days = Math.ceil((new Date(s.expiry_date).getTime() - Date.now()) / 86400000);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
                return (
                  <div key={s.id} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                    <div><p className="font-medium">{s.drug_name}</p><p className="text-xs text-muted-foreground">Batch: {s.batch_number || "—"} · Qty: {s.qty_available}</p></div>
                    <Badge className={days <= 30 ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"}>{days <= 0 ? "Expired" : `${days}d left`}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Billing / POS ─────────────────────────────────────────────────────────────
function BillingTab() {
  const { toast } = useToast();
  const [cart, setCart] = useState<any[]>([]);
  const [patientForm, setPatientForm] = useState<any>({ patient_name: "Cash", payment_mode: "cash", sale_date: new Date().toISOString().slice(0, 10) });
  const [drugSearch, setDrugSearch] = useState("");
  const [selectedStock, setSelectedStock] = useState<any>(null);

  const { data: drugs = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/drugs"] });
  const { data: stock = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/stock"] });
  const { data: sales = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/sales"] });

  const createSale = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/pharmacy/sales", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/sales"] }); queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/stock"] }); queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/stats"] }); setCart([]); setPatientForm({ patient_name: "Cash", payment_mode: "cash", sale_date: new Date().toISOString().slice(0, 10) }); toast({ title: "Sale created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filteredDrugs = drugs.filter((d: any) => d.name?.toLowerCase().includes(drugSearch.toLowerCase()) || d.generic_name?.toLowerCase().includes(drugSearch.toLowerCase()));
  const addToCart = (drug: any, stockItem: any) => {
    setCart(prev => [...prev, { drug_id: drug.id, stock_id: stockItem?.id, drug_name: drug.name, schedule: drug.schedule, batch_number: stockItem?.batch_number, quantity: 1, mrp: stockItem?.mrp || drug.mrp, rate: stockItem?.mrp || drug.mrp, gst_rate: drug.gst_rate, amount: stockItem?.mrp || drug.mrp }]);
    setDrugSearch("");
  };
  const updateCartQty = (i: number, qty: number) => setCart(prev => { const c = [...prev]; c[i] = { ...c[i], quantity: qty, amount: qty * c[i].rate }; return c; });
  const removeFromCart = (i: number) => setCart(prev => prev.filter((_, idx) => idx !== i));
  const total = cart.reduce((s, it) => s + Number(it.amount || 0), 0);

  const submit = () => {
    createSale.mutate({ ...patientForm, total_amount: total, paid_amount: total, items: cart });
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Patient Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <FieldRow label="Patient Name"><Input value={patientForm.patient_name || ""} onChange={e => setPatientForm((p: any) => ({ ...p, patient_name: e.target.value }))} /></FieldRow>
            <FieldRow label="Phone"><Input value={patientForm.patient_phone || ""} onChange={e => setPatientForm((p: any) => ({ ...p, patient_phone: e.target.value }))} /></FieldRow>
            <FieldRow label="Doctor"><Input value={patientForm.doctor_name || ""} onChange={e => setPatientForm((p: any) => ({ ...p, doctor_name: e.target.value }))} /></FieldRow>
            <FieldRow label="Rx No"><Input value={patientForm.prescription_no || ""} onChange={e => setPatientForm((p: any) => ({ ...p, prescription_no: e.target.value }))} /></FieldRow>
            <FieldRow label="Date"><Input type="date" value={patientForm.sale_date || ""} onChange={e => setPatientForm((p: any) => ({ ...p, sale_date: e.target.value }))} /></FieldRow>
            <FieldRow label="Payment"><Select value={patientForm.payment_mode || "cash"} onValueChange={v => setPatientForm((p: any) => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash","upi","card","credit"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FieldRow>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Add Drug</CardTitle></CardHeader>
          <CardContent>
            <div className="relative mb-3"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search drug…" className="pl-8" value={drugSearch} onChange={e => setDrugSearch(e.target.value)} /></div>
            {drugSearch && filteredDrugs.length > 0 && (
              <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                {filteredDrugs.slice(0, 10).map((d: any) => {
                  const dStock = stock.filter((s: any) => s.drug_id === d.id && s.qty_available > 0);
                  return (
                    <div key={d.id} className="p-2">
                      <div className="flex items-center justify-between">
                        <div><p className="text-sm font-medium">{d.name} <Badge variant="outline" className="text-xs ml-1">{d.schedule}</Badge></p><p className="text-xs text-muted-foreground">{d.generic_name} · {d.strength} · MRP: {sym}{d.mrp}</p></div>
                      </div>
                      {dStock.length > 0 ? (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {dStock.map((s: any) => <Button key={s.id} size="sm" variant="outline" className="text-xs h-6" onClick={() => addToCart(d, s)}>Batch {s.batch_number || "—"} (Qty:{s.qty_available})</Button>)}
                        </div>
                      ) : <p className="text-xs text-red-500 mt-1">Out of stock</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Bill ({cart.length} items)</CardTitle></CardHeader>
          <CardContent>
            {cart.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No items</p>}
            {cart.map((it, i) => (
              <div key={i} className="flex items-center gap-2 mb-2 text-sm">
                <div className="flex-1 min-w-0"><p className="font-medium truncate">{it.drug_name} {it.schedule !== 'OTC' && <Badge className="text-xs bg-red-100 text-red-700 ml-1">{it.schedule}</Badge>}</p><p className="text-xs text-muted-foreground">Batch: {it.batch_number || "—"} · {sym}{it.rate}/unit</p></div>
                <Input type="number" value={it.quantity} onChange={e => updateCartQty(i, Number(e.target.value))} className="w-16 h-7 text-sm" min={1} />
                <span className="w-20 text-right font-medium">{sym}{fmt(it.amount)}</span>
                <Button size="sm" variant="ghost" className="text-red-600 h-6 w-6 p-0" onClick={() => removeFromCart(i)}><X className="h-3 w-3" /></Button>
              </div>
            ))}
            {cart.length > 0 && (
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{sym}{fmt(total)}</span></div>
                <Button className="w-full mt-3" onClick={submit} disabled={createSale.isPending || cart.length === 0}>Create Bill</Button>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Recent Sales</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {sales.slice(0, 8).map((s: any) => (
                <div key={s.id} className="flex items-center justify-between text-sm border rounded px-2 py-1.5">
                  <div><p className="font-medium">{s.bill_number}</p><p className="text-xs text-muted-foreground">{s.patient_name}</p></div>
                  <span className="font-bold text-green-600">{sym}{fmt(s.total_amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Drug Master Tab ───────────────────────────────────────────────────────────
function DrugMasterTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: drugs = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/drugs"] });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/pharmacy/drugs/${editing.id}`, data) : apiRequest("POST", "/api/pharmacy/drugs", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/drugs"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/pharmacy/drugs/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/drugs"] }); toast({ title: "Deleted" }); } });

  const filtered = drugs.filter((d: any) => d.name?.toLowerCase().includes(search.toLowerCase()) || d.generic_name?.toLowerCase().includes(search.toLowerCase()));
  const openForm = (d?: any) => { setEditing(d || null); setForm(d ? { ...d } : { schedule: 'OTC', form: 'tablet', gst_rate: 12, unit: 'strip', reorder_level: 10 }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search drugs…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Drug</Button>
      </div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Drug", "Generic", "Schedule", "Form", "MRP", "GST%", "Reorder", ""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((d: any) => (
              <tr key={d.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2"><p className="font-medium">{d.name}</p><p className="text-xs text-muted-foreground">{d.manufacturer || "—"}</p></td>
                <td className="px-3 py-2">{d.generic_name || "—"}</td>
                <td className="px-3 py-2"><Badge className={d.schedule === 'H' || d.schedule === 'X' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}>{d.schedule}</Badge></td>
                <td className="px-3 py-2">{d.form} {d.strength}</td>
                <td className="px-3 py-2">{sym}{fmt(d.mrp)}</td>
                <td className="px-3 py-2">{d.gst_rate}%</td>
                <td className="px-3 py-2">{d.reorder_level}</td>
                <td className="px-3 py-2"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openForm(d)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => del.mutate(d.id)}><Trash2 className="h-3 w-3" /></Button></div></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">No drugs</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Drug" : "Add Drug"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Drug Name *"><Input value={form.name || ""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></FieldRow></div>
            <FieldRow label="Generic Name"><Input value={form.generic_name || ""} onChange={e => setForm((p: any) => ({ ...p, generic_name: e.target.value }))} /></FieldRow>
            <FieldRow label="Manufacturer"><Input value={form.manufacturer || ""} onChange={e => setForm((p: any) => ({ ...p, manufacturer: e.target.value }))} /></FieldRow>
            <FieldRow label="Schedule"><Select value={form.schedule || "OTC"} onValueChange={v => setForm((p: any) => ({ ...p, schedule: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SCHEDULES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Form"><Select value={form.form || "tablet"} onValueChange={v => setForm((p: any) => ({ ...p, form: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["tablet","capsule","syrup","injection","cream","drops","inhaler","powder","other"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Strength"><Input value={form.strength || ""} onChange={e => setForm((p: any) => ({ ...p, strength: e.target.value }))} placeholder="e.g. 500mg" /></FieldRow>
            <FieldRow label="Unit"><Select value={form.unit || "strip"} onValueChange={v => setForm((p: any) => ({ ...p, unit: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["strip","bottle","vial","tube","sachet","pcs"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="MRP"><Input type="number" value={form.mrp || ""} onChange={e => setForm((p: any) => ({ ...p, mrp: e.target.value }))} /></FieldRow>
            <FieldRow label="Purchase Price"><Input type="number" value={form.purchase_price || ""} onChange={e => setForm((p: any) => ({ ...p, purchase_price: e.target.value }))} /></FieldRow>
            <FieldRow label="GST Rate (%)"><Input type="number" value={form.gst_rate || ""} onChange={e => setForm((p: any) => ({ ...p, gst_rate: e.target.value }))} /></FieldRow>
            <FieldRow label="HSN Code"><Input value={form.hsn_code || ""} onChange={e => setForm((p: any) => ({ ...p, hsn_code: e.target.value }))} /></FieldRow>
            <FieldRow label="Reorder Level"><Input type="number" value={form.reorder_level || ""} onChange={e => setForm((p: any) => ({ ...p, reorder_level: e.target.value }))} /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.name}>Save</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Stock Tab ─────────────────────────────────────────────────────────────────
function StockTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: stock = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/stock"] });
  const { data: drugs = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/drugs"] });

  const save = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/pharmacy/stock", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/stock"] }); queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/stats"] }); setShowForm(false); setForm({}); toast({ title: "Stock added" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const today = new Date();
  const getExpiryColor = (d: string) => {
    if (!d) return "";
    const days = Math.ceil((new Date(d).getTime() - today.getTime()) / 86400000);
    if (days <= 0) return "text-red-600 font-bold";
    if (days <= 30) return "text-red-500";
    if (days <= 60) return "text-orange-500";
    return "";
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Add Stock</Button></div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Drug", "Batch", "Expiry", "Available", "Received", "MRP", "Purchase Price"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {stock.map((s: any) => (
              <tr key={s.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2"><p className="font-medium">{s.drug_name}</p><p className="text-xs text-muted-foreground">{s.schedule} · {s.form} {s.strength}</p></td>
                <td className="px-3 py-2">{s.batch_number || "—"}</td>
                <td className={`px-3 py-2 ${getExpiryColor(s.expiry_date)}`}>{s.expiry_date ? new Date(s.expiry_date).toLocaleDateString("en-IN") : "—"}</td>
                <td className="px-3 py-2 font-bold">{s.qty_available}</td>
                <td className="px-3 py-2">{s.qty_received}</td>
                <td className="px-3 py-2">{sym}{fmt(s.mrp)}</td>
                <td className="px-3 py-2">{sym}{fmt(s.purchase_price)}</td>
              </tr>
            ))}
            {stock.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No stock</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Stock</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Drug *"><Select value={form.drug_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, drug_id: v }))}><SelectTrigger><SelectValue placeholder="Drug" /></SelectTrigger><SelectContent>{drugs.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>{d.name} ({d.schedule})</SelectItem>)}</SelectContent></Select></FieldRow></div>
            <FieldRow label="Batch Number"><Input value={form.batch_number || ""} onChange={e => setForm((p: any) => ({ ...p, batch_number: e.target.value }))} /></FieldRow>
            <FieldRow label="Expiry Date"><Input type="date" value={form.expiry_date || ""} onChange={e => setForm((p: any) => ({ ...p, expiry_date: e.target.value }))} /></FieldRow>
            <FieldRow label="Qty Received"><Input type="number" value={form.qty_received || ""} onChange={e => setForm((p: any) => ({ ...p, qty_received: e.target.value }))} /></FieldRow>
            <FieldRow label="MRP"><Input type="number" value={form.mrp || ""} onChange={e => setForm((p: any) => ({ ...p, mrp: e.target.value }))} /></FieldRow>
            <FieldRow label="Purchase Price"><Input type="number" value={form.purchase_price || ""} onChange={e => setForm((p: any) => ({ ...p, purchase_price: e.target.value }))} /></FieldRow>
            <FieldRow label="Supplier"><Input value={form.supplier_name || ""} onChange={e => setForm((p: any) => ({ ...p, supplier_name: e.target.value }))} /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.drug_id || !form.qty_received}>Save</Button><Button variant="outline" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Purchases Tab ─────────────────────────────────────────────────────────────
function PurchasesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ items: [] });

  const { data: purchases = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/purchases"] });
  const { data: drugs = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/drugs"] });

  const save = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/pharmacy/purchases", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/purchases"] }); queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/stock"] }); setShowForm(false); setForm({ items: [] }); toast({ title: "Purchase recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addItem = () => setForm((p: any) => ({ ...p, items: [...(p.items || []), { drug_id: "", quantity: 1, purchase_price: 0, mrp: 0, amount: 0 }] }));
  const updItem = (i: number, f: string, v: any) => setForm((p: any) => { const items = [...p.items]; items[i] = { ...items[i], [f]: v }; if (f === 'quantity' || f === 'purchase_price') items[i].amount = Number(items[i].quantity || 0) * Number(items[i].purchase_price || 0); return { ...p, items, total_amount: items.reduce((s: number, it: any) => s + Number(it.amount || 0), 0) }; });
  const remItem = (i: number) => setForm((p: any) => ({ ...p, items: p.items.filter((_: any, idx: number) => idx !== i) }));

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />New Purchase</Button></div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Purchase #", "Supplier", "Invoice #", "Date", "Total", "Net", "Mode"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {purchases.slice(0, 50).map((p: any) => (
              <tr key={p.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{p.purchase_number}</td>
                <td className="px-3 py-2">{p.supplier_name}</td>
                <td className="px-3 py-2">{p.invoice_number || "—"}</td>
                <td className="px-3 py-2">{p.purchase_date ? new Date(p.purchase_date).toLocaleDateString("en-IN") : "—"}</td>
                <td className="px-3 py-2">{sym}{fmt(p.total_amount)}</td>
                <td className="px-3 py-2 font-bold">{sym}{fmt(p.net_amount)}</td>
                <td className="px-3 py-2"><Badge variant="outline">{p.payment_mode}</Badge></td>
              </tr>
            ))}
            {purchases.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No purchases</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Purchase</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Supplier *"><Input value={form.supplier_name || ""} onChange={e => setForm((p: any) => ({ ...p, supplier_name: e.target.value }))} /></FieldRow></div>
            <FieldRow label="Invoice Number"><Input value={form.invoice_number || ""} onChange={e => setForm((p: any) => ({ ...p, invoice_number: e.target.value }))} /></FieldRow>
            <FieldRow label="Date"><Input type="date" value={form.purchase_date || ""} onChange={e => setForm((p: any) => ({ ...p, purchase_date: e.target.value }))} /></FieldRow>
            <FieldRow label="GST Amount"><Input type="number" value={form.gst_amount || ""} onChange={e => setForm((p: any) => ({ ...p, gst_amount: e.target.value }))} /></FieldRow>
            <FieldRow label="Payment Mode"><Select value={form.payment_mode || "credit"} onValueChange={v => setForm((p: any) => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash","cheque","bank_transfer","upi","credit"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FieldRow>
          </div>
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2"><Label className="text-sm font-semibold">Items</Label><Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add</Button></div>
            {form.items?.map((it: any, i: number) => (
              <div key={i} className="grid grid-cols-6 gap-2 mb-2 items-end">
                <div className="col-span-2"><Select value={it.drug_id?.toString() || ""} onValueChange={v => updItem(i, 'drug_id', v)}><SelectTrigger className="text-xs"><SelectValue placeholder="Drug" /></SelectTrigger><SelectContent>{drugs.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}</SelectContent></Select></div>
                <Input placeholder="Batch" value={it.batch_number || ""} onChange={e => updItem(i, 'batch_number', e.target.value)} className="text-xs" />
                <Input placeholder="Qty" type="number" value={it.quantity || ""} onChange={e => updItem(i, 'quantity', e.target.value)} className="text-xs" />
                <Input placeholder="Purchase${sym}" type="number" value={it.purchase_price || ""} onChange={e => updItem(i, 'purchase_price', e.target.value)} className="text-xs" />
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => remItem(i)}><X className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="font-semibold">Total: {sym}{fmt(form.total_amount)}</span>
            <div className="flex gap-2"><Button onClick={() => save.mutate({ ...form, net_amount: form.total_amount })} disabled={!form.supplier_name || !form.items?.length}>Create</Button><Button variant="outline" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Schedule H Register ───────────────────────────────────────────────────────
function ScheduleHTab() {
  const { data: register = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/schedule-h"] });
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Automatically populated when Schedule H/X drugs are sold.</p>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Drug", "Schedule", "Patient", "Doctor", "Rx No", "Qty", "Date"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {register.map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{r.drug_name}</td>
                <td className="px-3 py-2"><Badge className="bg-red-100 text-red-700">{r.schedule}</Badge></td>
                <td className="px-3 py-2">{r.patient_name} {r.patient_phone && <span className="text-xs text-muted-foreground">({r.patient_phone})</span>}</td>
                <td className="px-3 py-2">{r.doctor_name || "—"}</td>
                <td className="px-3 py-2">{r.prescription_no || "—"}</td>
                <td className="px-3 py-2">{r.quantity}</td>
                <td className="px-3 py-2">{r.sale_date ? new Date(r.sale_date).toLocaleDateString("en-IN") : "—"}</td>
              </tr>
            ))}
            {register.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No Schedule H/X records</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Licenses Tab ──────────────────────────────────────────────────────────────
function LicensesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: licenses = [] } = useQuery<any[]>({ queryKey: ["/api/pharmacy/licenses"] });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/pharmacy/licenses/${editing.id}`, data) : apiRequest("POST", "/api/pharmacy/licenses", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/licenses"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/pharmacy/licenses/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/pharmacy/licenses"] }); toast({ title: "Deleted" }); } });

  const openForm = (l?: any) => { setEditing(l || null); setForm(l ? { ...l } : {}); setShowForm(true); };

  const getExpiry = (d: string) => {
    if (!d) return null;
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    if (days <= 0) return <Badge className="bg-red-100 text-red-700">Expired</Badge>;
    if (days <= 30) return <Badge className="bg-orange-100 text-orange-700">{days}d left</Badge>;
    if (days <= 90) return <Badge className="bg-yellow-100 text-yellow-700">{days}d left</Badge>;
    return <Badge className="bg-green-100 text-green-700">Valid</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add License</Button></div>
      <div className="grid sm:grid-cols-2 gap-3">
        {licenses.map((l: any) => (
          <Card key={l.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div><p className="font-medium">{l.license_type}</p><p className="text-sm text-muted-foreground">{l.license_number}</p></div>
                <div className="flex items-center gap-1">{getExpiry(l.expiry_date)}<Button size="sm" variant="ghost" onClick={() => openForm(l)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => del.mutate(l.id)}><Trash2 className="h-3 w-3" /></Button></div>
              </div>
              <p className="text-xs text-muted-foreground">Issued by: {l.issuing_authority || "—"}</p>
              <p className="text-xs text-muted-foreground">Valid: {l.issue_date || "—"} → {l.expiry_date ? new Date(l.expiry_date).toLocaleDateString("en-IN") : "—"}</p>
            </CardContent>
          </Card>
        ))}
        {licenses.length === 0 && <div className="col-span-full text-center py-8 text-muted-foreground">No licenses</div>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit License" : "Add License"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <FieldRow label="License Type *"><Select value={form.license_type || ""} onValueChange={v => setForm((p: any) => ({ ...p, license_type: v }))}><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger><SelectContent>{["Drug License (Retail)","Drug License (Wholesale)","Drug License (Manufacturing)","FSSAI","GSTIN","Shop & Establishment","Other"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="License Number *"><Input value={form.license_number || ""} onChange={e => setForm((p: any) => ({ ...p, license_number: e.target.value }))} /></FieldRow>
            <FieldRow label="Issuing Authority"><Input value={form.issuing_authority || ""} onChange={e => setForm((p: any) => ({ ...p, issuing_authority: e.target.value }))} /></FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Issue Date"><Input type="date" value={form.issue_date || ""} onChange={e => setForm((p: any) => ({ ...p, issue_date: e.target.value }))} /></FieldRow>
              <FieldRow label="Expiry Date"><Input type="date" value={form.expiry_date || ""} onChange={e => setForm((p: any) => ({ ...p, expiry_date: e.target.value }))} /></FieldRow>
            </div>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2} /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.license_type || !form.license_number}>Save</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PharmacyPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg"><Pill className="h-6 w-6 text-cyan-600" /></div>
        <div><h1 className="text-2xl font-bold">Pharmacy ERP</h1><p className="text-sm text-muted-foreground">Drug master, stock, billing & compliance</p></div>
      </div>
      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="drugs">Drug Master</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="schedule-h">Schedule H</TabsTrigger>
          <TabsTrigger value="licenses">Licenses</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="billing"><BillingTab /></TabsContent>
        <TabsContent value="drugs"><DrugMasterTab /></TabsContent>
        <TabsContent value="stock"><StockTab /></TabsContent>
        <TabsContent value="purchases"><PurchasesTab /></TabsContent>
        <TabsContent value="schedule-h"><ScheduleHTab /></TabsContent>
        <TabsContent value="licenses"><LicensesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
