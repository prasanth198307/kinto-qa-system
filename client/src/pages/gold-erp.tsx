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
import { Plus, Search, Pencil, Trash2, TrendingUp, Package, Wrench, Users, IndianRupee, CheckCircle, Clock, RefreshCw, Gem, Layers, BarChart3, Shield } from "lucide-react";

const fmt = (n: any, d = 2) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: d });
const fmtWt = (n: any) => `${fmt(n, 3)} g`;
const fmtAmt = (n: any) => `₹${fmt(n)}`;
const today = () => new Date().toISOString().slice(0, 10);

const PURITIES: Record<string, { name: string; pct: number }[]> = {
  gold: [
    { name: "24K (999)", pct: 99.9 },
    { name: "22K (916)", pct: 91.6 },
    { name: "18K (750)", pct: 75.0 },
    { name: "14K (585)", pct: 58.5 },
  ],
  silver: [
    { name: "Sterling (925)", pct: 92.5 },
    { name: "Fine (999)", pct: 99.9 },
  ],
  platinum: [{ name: "Platinum 950", pct: 95.0 }],
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  received: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  delivered: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  hallmarked: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  inward: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  purchase: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  sale: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  adjustment: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

function StatCard({ title, value, sub, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-xl font-bold">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
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

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`capitalize text-xs ${STATUS_COLORS[status] || "bg-gray-100 text-gray-600"}`}>
      {status?.replace(/_/g, " ")}
    </Badge>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/gold-erp/stats"] });
  const { data: rates = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/metal-rates/today"] });

  const goldRate = rates.find((r: any) => r.metal === "gold" && r.purity_name?.includes("22K"));
  const silverRate = rates.find((r: any) => r.metal === "silver");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Gold Rate (22K)" value={`₹${fmt(stats?.goldRate || goldRate?.rate_per_gram)}/g`} icon={TrendingUp} color="bg-yellow-100 text-yellow-600" />
        <StatCard title="Karigars" value={stats?.totalKarigars ?? 0} icon={Users} color="bg-blue-100 text-blue-600" />
        <StatCard title="Jewellery Items" value={stats?.totalItems ?? 0} icon={Gem} color="bg-purple-100 text-purple-600" />
        <StatCard title="Active Repairs" value={stats?.activeRepairs ?? 0} icon={Wrench} color="bg-orange-100 text-orange-600" />
        <StatCard title="Active Schemes" value={stats?.activeSchemes ?? 0} icon={Shield} color="bg-green-100 text-green-600" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Metal Rates</CardTitle>
          </CardHeader>
          <CardContent>
            {rates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No rates set. Go to Metal Rates tab to enter today's rates.</p>
            ) : (
              <div className="space-y-2">
                {rates.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                    <span className="font-medium">{r.metal?.toUpperCase()} — {r.purity_name}</span>
                    <span className="font-bold">₹{fmt(r.rate_per_gram)}/g</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Use the tabs above to manage:</p>
            <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
              <li>Metal Rates — Update daily gold/silver prices</li>
              <li>Karigar — Manage artisan workforce</li>
              <li>Item Master — Jewellery inventory & barcode</li>
              <li>Estimates — Customer quotations with GST</li>
              <li>Production — Track orders through 12 stages</li>
              <li>Bullion — Stock inward & outward transactions</li>
              <li>Repairs — Customer repair job tracking</li>
              <li>Hallmarking — BIS HUID register</li>
              <li>Chit Schemes — Gold savings schemes</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Metal Rates ───────────────────────────────────────────────────────────────
function MetalRatesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ metal: "gold", purity_name: "22K (916)", purity_percent: 91.6, source: "IBJA", rate_date: today() });
  const { data: rates = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/metal-rates"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gold-erp/metal-rates", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/metal-rates"] }); queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/metal-rates/today"] }); queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/stats"] }); setShowForm(false); setForm({ metal: "gold", purity_name: "22K (916)", purity_percent: 91.6, source: "IBJA", rate_date: today() }); toast({ title: "Rate saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/gold-erp/metal-rates/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/metal-rates"] }); toast({ title: "Deleted" }); },
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const metalChange = (v: string) => { const def = PURITIES[v]?.[0]; set("metal", v); if (def) { set("purity_name", def.name); set("purity_percent", def.pct); } };
  const purityChange = (v: string) => { const p = PURITIES[form.metal]?.find(x => x.name === v); set("purity_name", v); if (p) set("purity_percent", p.pct); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold">Metal Rates</h2>
        <Button onClick={() => setShowForm(true)} size="sm" data-testid="button-add-metal-rate"><Plus className="h-4 w-4 mr-1" />Add Rate</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2">Metal</th>
              <th className="text-left px-4 py-2">Purity</th>
              <th className="text-right px-4 py-2">Rate/g</th>
              <th className="text-left px-4 py-2">Source</th>
              <th className="text-left px-4 py-2">Date</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rates.map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 font-medium capitalize">{r.metal}</td>
                <td className="px-4 py-2">{r.purity_name}</td>
                <td className="px-4 py-2 text-right font-bold">₹{fmt(r.rate_per_gram)}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.source}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.rate_date?.slice(0, 10)}</td>
                <td className="px-4 py-2 text-right">
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(r.id)} data-testid={`button-delete-rate-${r.id}`}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {rates.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No rates entered yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Metal Rate</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Metal">
              <Select value={form.metal} onValueChange={metalChange}>
                <SelectTrigger data-testid="select-metal"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Purity">
              <Select value={form.purity_name} onValueChange={purityChange}>
                <SelectTrigger data-testid="select-purity"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(PURITIES[form.metal] || []).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Rate per Gram (₹)">
              <Input type="number" value={form.rate_per_gram || ""} onChange={e => set("rate_per_gram", e.target.value)} placeholder="e.g. 6500" data-testid="input-rate-per-gram" />
            </FieldRow>
            <FieldRow label="Source">
              <Select value={form.source} onValueChange={v => set("source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IBJA">IBJA</SelectItem>
                  <SelectItem value="MCX">MCX</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Date">
              <Input type="date" value={form.rate_date} onChange={e => set("rate_date", e.target.value)} data-testid="input-rate-date" />
            </FieldRow>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-rate">Save Rate</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Karigar ───────────────────────────────────────────────────────────────────
function KarigarTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const { data: karigars = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigars"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/gold-erp/karigars/${editing.id}`, data) : apiRequest("POST", "/api/gold-erp/karigars", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/karigars"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Karigar saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/gold-erp/karigars/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/karigars"] }); toast({ title: "Deleted" }); },
  });

  const openEdit = (k: any) => { setEditing(k); setForm(k); setShowForm(true); };
  const openNew = () => { setEditing(null); setForm({ metal_type: "gold", status: "active" }); setShowForm(true); };
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const filtered = karigars.filter((k: any) => k.name?.toLowerCase().includes(search.toLowerCase()) || k.phone?.includes(search));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search karigar..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-karigar" />
        </div>
        <Button onClick={openNew} size="sm" data-testid="button-add-karigar"><Plus className="h-4 w-4 mr-1" />Add Karigar</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((k: any) => (
          <Card key={k.id} data-testid={`card-karigar-${k.id}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{k.name}</p>
                  <p className="text-xs text-muted-foreground">{k.karigar_code}</p>
                </div>
                <StatusBadge status={k.status} />
              </div>
              <p className="text-sm text-muted-foreground">{k.phone} {k.specialization ? `· ${k.specialization}` : ""}</p>
              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-muted-foreground">Balance</p>
                  <p className="font-semibold">{fmtWt(k.balance_grams)}</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <p className="text-muted-foreground">Wage/g</p>
                  <p className="font-semibold">{fmtAmt(k.wage_per_gram)}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(k)} data-testid={`button-edit-karigar-${k.id}`}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(k.id)} data-testid={`button-delete-karigar-${k.id}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8">No karigars found</p>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditing(null); setForm({}); } }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Karigar" : "Add Karigar"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Name *"><Input value={form.name || ""} onChange={e => set("name", e.target.value)} data-testid="input-karigar-name" /></FieldRow>
            <FieldRow label="Phone"><Input value={form.phone || ""} onChange={e => set("phone", e.target.value)} data-testid="input-karigar-phone" /></FieldRow>
            <FieldRow label="Specialization"><Input value={form.specialization || ""} onChange={e => set("specialization", e.target.value)} placeholder="e.g. Bangles, Rings, Chains" data-testid="input-karigar-spec" /></FieldRow>
            <FieldRow label="Wage per gram (₹)"><Input type="number" value={form.wage_per_gram || ""} onChange={e => set("wage_per_gram", e.target.value)} data-testid="input-karigar-wage" /></FieldRow>
            <FieldRow label="Aadhaar No"><Input value={form.aadhar_no || ""} onChange={e => set("aadhar_no", e.target.value)} data-testid="input-karigar-aadhar" /></FieldRow>
            <FieldRow label="Address"><Textarea value={form.address || ""} onChange={e => set("address", e.target.value)} rows={2} data-testid="input-karigar-address" /></FieldRow>
            {editing && (
              <FieldRow label="Status">
                <Select value={form.status || "active"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
            )}
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-karigar">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Item Master ───────────────────────────────────────────────────────────────
function ItemMasterTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ metal_type: "gold", purity_name: "22K (916)", making_charge_type: "percent", stock_qty: 1 });
  const { data: items = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/items"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/gold-erp/items/${editing.id}`, data) : apiRequest("POST", "/api/gold-erp/items", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/items"] }); queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/stats"] }); setShowForm(false); setEditing(null); setForm({ metal_type: "gold", purity_name: "22K (916)", making_charge_type: "percent", stock_qty: 1 }); toast({ title: "Item saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/gold-erp/items/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/items"] }); toast({ title: "Deleted" }); },
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const openEdit = (item: any) => { setEditing(item); setForm(item); setShowForm(true); };
  const openNew = () => { setEditing(null); setForm({ metal_type: "gold", purity_name: "22K (916)", making_charge_type: "percent", stock_qty: 1 }); setShowForm(true); };
  const filtered = items.filter((i: any) => i.name?.toLowerCase().includes(search.toLowerCase()) || i.item_code?.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search items..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-items" />
        </div>
        <Button onClick={openNew} size="sm" data-testid="button-add-item"><Plus className="h-4 w-4 mr-1" />Add Item</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2">Code</th>
              <th className="text-left px-4 py-2">Name / Category</th>
              <th className="text-left px-4 py-2">Metal / Purity</th>
              <th className="text-right px-4 py-2">Gross Wt</th>
              <th className="text-right px-4 py-2">Net Wt</th>
              <th className="text-right px-4 py-2">Selling Price</th>
              <th className="text-center px-4 py-2">Qty</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item: any) => (
              <tr key={item.id} className="border-t hover:bg-muted/30" data-testid={`row-item-${item.id}`}>
                <td className="px-4 py-2 text-xs text-muted-foreground">{item.item_code}</td>
                <td className="px-4 py-2">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.category}</p>
                </td>
                <td className="px-4 py-2">
                  <p className="capitalize">{item.metal_type}</p>
                  <p className="text-xs text-muted-foreground">{item.purity_name}</p>
                </td>
                <td className="px-4 py-2 text-right">{fmtWt(item.gross_weight_gm)}</td>
                <td className="px-4 py-2 text-right">{fmtWt(item.net_weight_gm)}</td>
                <td className="px-4 py-2 text-right font-semibold">{item.selling_price ? fmtAmt(item.selling_price) : "—"}</td>
                <td className="px-4 py-2 text-center">{item.stock_qty}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(item)} data-testid={`button-edit-item-${item.id}`}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)} data-testid={`button-delete-item-${item.id}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No items found</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditing(null); } }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Item" : "Add Jewellery Item"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Name *"><Input value={form.name || ""} onChange={e => set("name", e.target.value)} data-testid="input-item-name" /></FieldRow>
              <FieldRow label="Category"><Input value={form.category || ""} onChange={e => set("category", e.target.value)} placeholder="Ring, Bangle, Chain…" data-testid="input-item-category" /></FieldRow>
              <FieldRow label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => { set("metal_type", v); const def = PURITIES[v]?.[0]; if (def) { set("purity_name", def.name); set("purity_percent", def.pct); } }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Purity">
                <Select value={form.purity_name || ""} onValueChange={v => { set("purity_name", v); const p = PURITIES[form.metal_type]?.find((x: any) => x.name === v); if (p) set("purity_percent", p.pct); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(PURITIES[form.metal_type] || []).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Gross Weight (g)"><Input type="number" value={form.gross_weight_gm || ""} onChange={e => set("gross_weight_gm", e.target.value)} data-testid="input-gross-weight" /></FieldRow>
              <FieldRow label="Stone Weight (g)"><Input type="number" value={form.stone_weight_gm || ""} onChange={e => set("stone_weight_gm", e.target.value)} data-testid="input-stone-weight" /></FieldRow>
              <FieldRow label="Making Charge Type">
                <Select value={form.making_charge_type || "percent"} onValueChange={v => set("making_charge_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">% of Metal Value</SelectItem>
                    <SelectItem value="per_gram">Per Gram</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Making Charge Value"><Input type="number" value={form.making_charge_value || ""} onChange={e => set("making_charge_value", e.target.value)} data-testid="input-making-charge" /></FieldRow>
              <FieldRow label="Wastage %"><Input type="number" value={form.wastage_pct || ""} onChange={e => set("wastage_pct", e.target.value)} data-testid="input-wastage" /></FieldRow>
              <FieldRow label="Stone Value (₹)"><Input type="number" value={form.stone_value || ""} onChange={e => set("stone_value", e.target.value)} data-testid="input-stone-value" /></FieldRow>
              <FieldRow label="Selling Price (₹)"><Input type="number" value={form.selling_price || ""} onChange={e => set("selling_price", e.target.value)} data-testid="input-selling-price" /></FieldRow>
              <FieldRow label="Stock Qty"><Input type="number" value={form.stock_qty || 1} onChange={e => set("stock_qty", e.target.value)} data-testid="input-stock-qty" /></FieldRow>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-item">Save Item</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Estimates / Quotations ────────────────────────────────────────────────────
function EstimatesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ metal_type: "gold", purity_name: "22K (916)", gst_pct: 3 });
  const { data: estimates = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/estimates"] });
  const { data: ratesData = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/metal-rates/today"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gold-erp/estimates", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/estimates"] }); setShowForm(false); setForm({ metal_type: "gold", purity_name: "22K (916)", gst_pct: 3 }); toast({ title: "Estimate created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const autoFillRate = () => {
    const r = ratesData.find((r: any) => r.metal === form.metal_type && r.purity_name === form.purity_name);
    if (r) set("rate_per_gram", r.rate_per_gram);
    else toast({ title: "No rate found for selected metal/purity", variant: "destructive" });
  };

  const calcTotal = () => {
    const wt = Number(form.weight_gm || 0);
    const rate = Number(form.rate_per_gram || 0);
    const metalVal = wt * rate;
    const wastage = metalVal * Number(form.wastage_pct || 0) / 100;
    const makingType = form.making_charge_type || "percent";
    const making = makingType === "percent" ? metalVal * Number(form.making_charge_value || 0) / 100
      : makingType === "per_gram" ? wt * Number(form.making_charge_value || 0)
        : Number(form.making_charge_value || 0);
    const stone = Number(form.stone_value || 0);
    const sub = metalVal + wastage + making + stone;
    const gst = sub * Number(form.gst_pct || 3) / 100;
    setForm((p: any) => ({ ...p, total_metal_value: metalVal.toFixed(2), wastage_amount: wastage.toFixed(2), making_charges: making.toFixed(2), gst_amount: gst.toFixed(2), total_amount: (sub + gst).toFixed(2) }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold">Estimates / Quotations</h2>
        <Button onClick={() => setShowForm(true)} size="sm" data-testid="button-add-estimate"><Plus className="h-4 w-4 mr-1" />New Estimate</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2">No.</th>
              <th className="text-left px-4 py-2">Customer</th>
              <th className="text-left px-4 py-2">Metal</th>
              <th className="text-right px-4 py-2">Total</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {estimates.map((e: any) => (
              <tr key={e.id} className="border-t hover:bg-muted/30" data-testid={`row-estimate-${e.id}`}>
                <td className="px-4 py-2 text-xs text-muted-foreground">{e.estimate_no}</td>
                <td className="px-4 py-2">
                  <p className="font-medium">{e.customer_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{e.customer_phone}</p>
                </td>
                <td className="px-4 py-2 capitalize">{e.metal_type} · {e.purity_name}</td>
                <td className="px-4 py-2 text-right font-bold">{fmtAmt(e.total_amount)}</td>
                <td className="px-4 py-2"><StatusBadge status={e.status} /></td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{e.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
            {estimates.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No estimates yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Estimate</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Customer Name"><Input value={form.customer_name || ""} onChange={e => set("customer_name", e.target.value)} data-testid="input-est-customer" /></FieldRow>
              <FieldRow label="Phone"><Input value={form.customer_phone || ""} onChange={e => set("customer_phone", e.target.value)} data-testid="input-est-phone" /></FieldRow>
              <FieldRow label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => set("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Purity">
                <Select value={form.purity_name || ""} onValueChange={v => set("purity_name", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(PURITIES[form.metal_type] || []).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Weight (g)"><Input type="number" value={form.weight_gm || ""} onChange={e => set("weight_gm", e.target.value)} data-testid="input-est-weight" /></FieldRow>
              <FieldRow label="Rate/g (₹)">
                <div className="flex gap-1">
                  <Input type="number" value={form.rate_per_gram || ""} onChange={e => set("rate_per_gram", e.target.value)} data-testid="input-est-rate" />
                  <Button size="sm" variant="outline" onClick={autoFillRate} title="Auto-fill from today's rate"><RefreshCw className="h-4 w-4" /></Button>
                </div>
              </FieldRow>
              <FieldRow label="Wastage %"><Input type="number" value={form.wastage_pct || ""} onChange={e => set("wastage_pct", e.target.value)} data-testid="input-est-wastage" /></FieldRow>
              <FieldRow label="Making Charge">
                <div className="flex gap-1">
                  <Select value={form.making_charge_type || "percent"} onValueChange={v => set("making_charge_type", v)}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">%</SelectItem>
                      <SelectItem value="per_gram">₹/g</SelectItem>
                      <SelectItem value="fixed">Fixed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" value={form.making_charge_value || ""} onChange={e => set("making_charge_value", e.target.value)} data-testid="input-est-making" />
                </div>
              </FieldRow>
              <FieldRow label="Stone Value (₹)"><Input type="number" value={form.stone_value || ""} onChange={e => set("stone_value", e.target.value)} data-testid="input-est-stone" /></FieldRow>
              <FieldRow label="GST %"><Input type="number" value={form.gst_pct ?? 3} onChange={e => set("gst_pct", e.target.value)} data-testid="input-est-gst" /></FieldRow>
            </div>
            <Button variant="outline" className="w-full" onClick={calcTotal} data-testid="button-calculate">Calculate Total</Button>
            {form.total_amount && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Metal Value</span><span>{fmtAmt(form.total_metal_value)}</span></div>
                <div className="flex justify-between"><span>Wastage</span><span>{fmtAmt(form.wastage_amount)}</span></div>
                <div className="flex justify-between"><span>Making Charges</span><span>{fmtAmt(form.making_charges)}</span></div>
                <div className="flex justify-between"><span>Stone Value</span><span>{fmtAmt(form.stone_value)}</span></div>
                <div className="flex justify-between"><span>GST ({form.gst_pct}%)</span><span>{fmtAmt(form.gst_amount)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1 mt-1"><span>Total</span><span>{fmtAmt(form.total_amount)}</span></div>
              </div>
            )}
            <FieldRow label="Valid Until"><Input type="date" value={form.valid_until || ""} onChange={e => set("valid_until", e.target.value)} /></FieldRow>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-estimate">Save Estimate</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Production ────────────────────────────────────────────────────────────────
function ProductionTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [form, setForm] = useState<any>({ metal_type: "gold", qty: 1 });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/production-orders"] });
  const { data: karigars = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigars"] });
  const { data: designs = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/designs"] });
  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ["/api/gold-erp/production-orders", selectedOrder?.id, "stages"],
    queryFn: () => selectedOrder ? fetch(`/api/gold-erp/production-orders/${selectedOrder.id}/stages`).then(r => r.json()) : Promise.resolve([]),
    enabled: !!selectedOrder,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gold-erp/production-orders", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/production-orders"] }); setShowForm(false); setForm({ metal_type: "gold", qty: 1 }); toast({ title: "Production order created with stages" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PUT", `/api/gold-erp/production-stages/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/production-orders", selectedOrder?.id, "stages"] }); toast({ title: "Stage updated" }); },
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const STAGE_STATUS = ["pending", "in_progress", "completed", "skipped"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold">Production Orders</h2>
        <Button onClick={() => setShowForm(true)} size="sm" data-testid="button-add-production"><Plus className="h-4 w-4 mr-1" />New Order</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((o: any) => (
          <Card key={o.id} className="cursor-pointer hover-elevate" onClick={() => setSelectedOrder(o)} data-testid={`card-production-${o.id}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{o.order_no}</p>
                  <p className="text-xs text-muted-foreground">{o.design_name || "Custom"}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <p className="text-xs text-muted-foreground">Karigar: {o.karigar_name || "—"}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Issued:</span> {fmtWt(o.issued_weight_gm)}</div>
                <div><span className="text-muted-foreground">Target:</span> {o.target_date?.slice(0, 10) || "—"}</div>
              </div>
              <p className="text-xs text-blue-600 font-medium">Stage: {o.current_stage}</p>
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8">No production orders yet</p>}
      </div>

      {/* Stage Tracker Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={v => !v && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Production Stages — {selectedOrder?.order_no}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {stages.map((s: any) => (
              <div key={s.id} className="border rounded-lg p-3 space-y-2" data-testid={`stage-${s.id}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-4">{s.stage_order}.</span>
                    <span className="font-medium text-sm">{s.stage_name}</span>
                  </div>
                  <Select value={s.status} onValueChange={v => updateStageMutation.mutate({ id: s.id, data: { ...s, status: v } })}>
                    <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGE_STATUS.map(st => <SelectItem key={st} value={st}>{st.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {s.status !== "pending" && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Wt In:</span> {s.weight_in_gm ? fmtWt(s.weight_in_gm) : "—"}</div>
                    <div><span className="text-muted-foreground">Wt Out:</span> {s.weight_out_gm ? fmtWt(s.weight_out_gm) : "—"}</div>
                    <div><span className="text-muted-foreground">Wastage:</span> {s.wastage_gm ? fmtWt(s.wastage_gm) : "—"}</div>
                  </div>
                )}
              </div>
            ))}
            {stages.length === 0 && <p className="text-center text-muted-foreground py-4">Loading stages…</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Order Form */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Production Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Design">
              <Select value={form.design_id?.toString() || ""} onValueChange={v => set("design_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select design (optional)" /></SelectTrigger>
                <SelectContent>
                  {designs.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Karigar">
              <Select value={form.karigar_id?.toString() || ""} onValueChange={v => set("karigar_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select karigar" /></SelectTrigger>
                <SelectContent>
                  {karigars.map((k: any) => <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => set("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Purity">
                <Select value={form.purity_name || ""} onValueChange={v => set("purity_name", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(PURITIES[form.metal_type] || []).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Qty"><Input type="number" value={form.qty || 1} onChange={e => set("qty", e.target.value)} /></FieldRow>
              <FieldRow label="Issued Weight (g)"><Input type="number" value={form.issued_weight_gm || ""} onChange={e => set("issued_weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Target Date" className="col-span-2"><Input type="date" value={form.target_date || ""} onChange={e => set("target_date", e.target.value)} /></FieldRow>
            </div>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-production">Create Order</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Bullion ───────────────────────────────────────────────────────────────────
function BullionTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ txn_type: "purchase", metal_type: "gold", purity_name: "22K (916)", txn_date: today() });
  const { data: stock = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/bullion-stock"] });
  const { data: transactions = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/bullion-transactions"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gold-erp/bullion-transactions", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/bullion-stock"] }); queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/bullion-transactions"] }); setShowForm(false); setForm({ txn_type: "purchase", metal_type: "gold", purity_name: "22K (916)", txn_date: today() }); toast({ title: "Transaction recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold">Bullion Management</h2>
        <Button onClick={() => setShowForm(true)} size="sm" data-testid="button-add-bullion"><Plus className="h-4 w-4 mr-1" />Record Transaction</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {stock.map((s: any) => (
          <Card key={s.id}>
            <CardContent className="p-4">
              <p className="font-semibold capitalize">{s.metal_type} — {s.purity_name}</p>
              <p className="text-2xl font-bold mt-1">{fmtWt(s.stock_grams)}</p>
              <p className="text-xs text-muted-foreground">Avg Rate: {fmtAmt(s.avg_rate)}/g</p>
            </CardContent>
          </Card>
        ))}
        {stock.length === 0 && <p className="col-span-3 text-sm text-muted-foreground">No bullion stock yet. Record a purchase to get started.</p>}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2">Txn No.</th>
              <th className="text-left px-4 py-2">Type</th>
              <th className="text-left px-4 py-2">Metal</th>
              <th className="text-right px-4 py-2">Weight</th>
              <th className="text-right px-4 py-2">Rate/g</th>
              <th className="text-right px-4 py-2">Amount</th>
              <th className="text-left px-4 py-2">Party</th>
              <th className="text-left px-4 py-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t: any) => (
              <tr key={t.id} className="border-t hover:bg-muted/30" data-testid={`row-bullion-${t.id}`}>
                <td className="px-4 py-2 text-xs text-muted-foreground">{t.txn_no}</td>
                <td className="px-4 py-2"><StatusBadge status={t.txn_type} /></td>
                <td className="px-4 py-2 capitalize">{t.metal_type} · {t.purity_name}</td>
                <td className="px-4 py-2 text-right">{fmtWt(t.weight_gm)}</td>
                <td className="px-4 py-2 text-right">{fmtAmt(t.rate_per_gram)}</td>
                <td className="px-4 py-2 text-right font-semibold">{fmtAmt(t.amount)}</td>
                <td className="px-4 py-2">{t.party_name || "—"}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{t.txn_date}</td>
              </tr>
            ))}
            {transactions.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No transactions yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Bullion Transaction</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Transaction Type">
              <Select value={form.txn_type} onValueChange={v => set("txn_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="purchase">Purchase (Inward)</SelectItem>
                  <SelectItem value="sale">Sale (Outward)</SelectItem>
                  <SelectItem value="inward">Inward (Refining)</SelectItem>
                  <SelectItem value="adjustment">Adjustment</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => set("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Purity">
                <Select value={form.purity_name || ""} onValueChange={v => set("purity_name", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(PURITIES[form.metal_type] || []).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Weight (g)"><Input type="number" value={form.weight_gm || ""} onChange={e => set("weight_gm", e.target.value)} data-testid="input-bullion-weight" /></FieldRow>
              <FieldRow label="Rate/g (₹)"><Input type="number" value={form.rate_per_gram || ""} onChange={e => set("rate_per_gram", e.target.value)} data-testid="input-bullion-rate" /></FieldRow>
            </div>
            <FieldRow label="Party Name"><Input value={form.party_name || ""} onChange={e => set("party_name", e.target.value)} data-testid="input-bullion-party" /></FieldRow>
            <FieldRow label="Date"><Input type="date" value={form.txn_date} onChange={e => set("txn_date", e.target.value)} /></FieldRow>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-bullion">Record</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Repairs ───────────────────────────────────────────────────────────────────
function RepairsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ metal_type: "gold", issue_date: today() });
  const { data: repairs = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/repairs"] });
  const { data: karigars = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigars"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/gold-erp/repairs/${editing.id}`, data) : apiRequest("POST", "/api/gold-erp/repairs", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/repairs"] }); queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/stats"] }); setShowForm(false); setEditing(null); setForm({ metal_type: "gold", issue_date: today() }); toast({ title: "Repair saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const filtered = repairs.filter((r: any) => r.customer_name?.toLowerCase().includes(search.toLowerCase()) || r.repair_no?.includes(search));
  const REPAIR_STATUSES = ["received", "in_progress", "completed", "delivered", "cancelled"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search repairs..." value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-repairs" />
        </div>
        <Button onClick={() => { setEditing(null); setForm({ metal_type: "gold", issue_date: today() }); setShowForm(true); }} size="sm" data-testid="button-add-repair"><Plus className="h-4 w-4 mr-1" />New Repair</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2">Repair No.</th>
              <th className="text-left px-4 py-2">Customer</th>
              <th className="text-left px-4 py-2">Item / Type</th>
              <th className="text-left px-4 py-2">Karigar</th>
              <th className="text-right px-4 py-2">Charges</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Expected</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-muted/30" data-testid={`row-repair-${r.id}`}>
                <td className="px-4 py-2 text-xs text-muted-foreground">{r.repair_no}</td>
                <td className="px-4 py-2">
                  <p className="font-medium">{r.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{r.customer_phone}</p>
                </td>
                <td className="px-4 py-2">
                  <p className="text-xs">{r.item_description?.slice(0, 30)}</p>
                  <p className="text-xs text-muted-foreground">{r.repair_type}</p>
                </td>
                <td className="px-4 py-2 text-sm">{r.karigar_name || "—"}</td>
                <td className="px-4 py-2 text-right font-semibold">{fmtAmt(r.repair_charges)}</td>
                <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{r.expected_delivery?.slice(0, 10) || "—"}</td>
                <td className="px-4 py-2 text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setForm(r); setShowForm(true); }} data-testid={`button-edit-repair-${r.id}`}><Pencil className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No repairs found</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditing(null); } }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Repair" : "New Repair Order"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Customer Name *"><Input value={form.customer_name || ""} onChange={e => set("customer_name", e.target.value)} data-testid="input-repair-customer" /></FieldRow>
              <FieldRow label="Phone"><Input value={form.customer_phone || ""} onChange={e => set("customer_phone", e.target.value)} data-testid="input-repair-phone" /></FieldRow>
            </div>
            <FieldRow label="Item Description"><Textarea value={form.item_description || ""} onChange={e => set("item_description", e.target.value)} rows={2} data-testid="input-repair-desc" /></FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Repair Type"><Input value={form.repair_type || ""} onChange={e => set("repair_type", e.target.value)} placeholder="Sizing, Polishing, Stone setting…" data-testid="input-repair-type" /></FieldRow>
              <FieldRow label="Karigar">
                <Select value={form.karigar_id?.toString() || ""} onValueChange={v => set("karigar_id", parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Select karigar" /></SelectTrigger>
                  <SelectContent>
                    {karigars.map((k: any) => <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Issue Date"><Input type="date" value={form.issue_date || today()} onChange={e => set("issue_date", e.target.value)} /></FieldRow>
              <FieldRow label="Expected Delivery"><Input type="date" value={form.expected_delivery || ""} onChange={e => set("expected_delivery", e.target.value)} /></FieldRow>
              <FieldRow label="Metal Weight (g)"><Input type="number" value={form.metal_weight_gm || ""} onChange={e => set("metal_weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Old Gold Wt (g)"><Input type="number" value={form.old_gold_weight_gm || ""} onChange={e => set("old_gold_weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Repair Charges (₹)"><Input type="number" value={form.repair_charges || ""} onChange={e => set("repair_charges", e.target.value)} data-testid="input-repair-charges" /></FieldRow>
              <FieldRow label="Advance (₹)"><Input type="number" value={form.advance_amount || ""} onChange={e => set("advance_amount", e.target.value)} /></FieldRow>
            </div>
            {editing && (
              <FieldRow label="Status">
                <Select value={form.status || "received"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REPAIR_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldRow>
            )}
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-repair">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Hallmarking ───────────────────────────────────────────────────────────────
function HallmarkingTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ metal_type: "gold", purity_name: "22K (916)", hallmark_date: today() });
  const { data: records = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/hallmarking"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gold-erp/hallmarking", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/hallmarking"] }); setShowForm(false); setForm({ metal_type: "gold", purity_name: "22K (916)", hallmark_date: today() }); toast({ title: "Hallmark record created", description: "HUID generated automatically" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PUT", `/api/gold-erp/hallmarking/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/hallmarking"] }); toast({ title: "Updated" }); },
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold">Hallmarking Register (BIS)</h2>
        <Button onClick={() => setShowForm(true)} size="sm" data-testid="button-add-hallmark"><Plus className="h-4 w-4 mr-1" />Add Record</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2">HUID</th>
              <th className="text-left px-4 py-2">Item</th>
              <th className="text-left px-4 py-2">Metal / Purity</th>
              <th className="text-right px-4 py-2">Gross Wt</th>
              <th className="text-right px-4 py-2">Net Wt</th>
              <th className="text-left px-4 py-2">Assay Centre</th>
              <th className="text-left px-4 py-2">Lot No.</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {records.map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-muted/30" data-testid={`row-hallmark-${r.id}`}>
                <td className="px-4 py-2 font-mono text-xs font-semibold text-blue-600">{r.huid}</td>
                <td className="px-4 py-2 text-sm">{r.item_description}</td>
                <td className="px-4 py-2 capitalize">{r.metal_type} · {r.purity_name}</td>
                <td className="px-4 py-2 text-right">{fmtWt(r.gross_weight_gm)}</td>
                <td className="px-4 py-2 text-right">{fmtWt(r.net_weight_gm)}</td>
                <td className="px-4 py-2 text-sm">{r.assay_centre || "—"}</td>
                <td className="px-4 py-2 text-sm">{r.lot_no || "—"}</td>
                <td className="px-4 py-2">
                  <Select value={r.status} onValueChange={v => updateMutation.mutate({ id: r.id, data: { ...r, status: v } })}>
                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="submitted">Submitted</SelectItem>
                      <SelectItem value="hallmarked">Hallmarked</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-4 py-2 text-right">
                  <span className="text-xs text-muted-foreground">{r.hallmark_date}</span>
                </td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No hallmarking records yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Hallmarking Record</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">HUID will be auto-generated by the system.</p>
          <div className="space-y-3">
            <FieldRow label="Item Description"><Textarea value={form.item_description || ""} onChange={e => set("item_description", e.target.value)} rows={2} data-testid="input-hallmark-item" /></FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => set("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Purity">
                <Select value={form.purity_name || ""} onValueChange={v => set("purity_name", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(PURITIES[form.metal_type] || []).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Gross Weight (g)"><Input type="number" value={form.gross_weight_gm || ""} onChange={e => set("gross_weight_gm", e.target.value)} data-testid="input-hallmark-gross" /></FieldRow>
              <FieldRow label="Net Weight (g)"><Input type="number" value={form.net_weight_gm || ""} onChange={e => set("net_weight_gm", e.target.value)} data-testid="input-hallmark-net" /></FieldRow>
              <FieldRow label="Assay Centre"><Input value={form.assay_centre || ""} onChange={e => set("assay_centre", e.target.value)} placeholder="BIS Assay Centre name" data-testid="input-hallmark-assay" /></FieldRow>
              <FieldRow label="Lot Number"><Input value={form.lot_no || ""} onChange={e => set("lot_no", e.target.value)} data-testid="input-hallmark-lot" /></FieldRow>
              <FieldRow label="Hallmark Date" className="col-span-2"><Input type="date" value={form.hallmark_date} onChange={e => set("hallmark_date", e.target.value)} /></FieldRow>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-hallmark">Save & Generate HUID</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Chit Schemes ──────────────────────────────────────────────────────────────
function ChitSchemesTab() {
  const { toast } = useToast();
  const [showSchemeForm, setShowSchemeForm] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<any>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [schemeForm, setSchemeForm] = useState<any>({ duration_months: 11, metal_type: "gold", bonus_month_free: 1, max_members: 20 });
  const [memberForm, setMemberForm] = useState<any>({});
  const [payForm, setPayForm] = useState<any>({ payment_mode: "cash", paid_date: today() });

  const { data: schemes = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/chit-schemes"] });
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/gold-erp/chit-schemes", selectedScheme?.id, "members"],
    queryFn: () => selectedScheme ? fetch(`/api/gold-erp/chit-schemes/${selectedScheme.id}/members`).then(r => r.json()) : Promise.resolve([]),
    enabled: !!selectedScheme,
  });

  const schemeMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gold-erp/chit-schemes", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/chit-schemes"] }); queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/stats"] }); setShowSchemeForm(false); setSchemeForm({ duration_months: 11, metal_type: "gold", bonus_month_free: 1, max_members: 20 }); toast({ title: "Scheme created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const memberMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/gold-erp/chit-schemes/${selectedScheme.id}/members`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/chit-schemes", selectedScheme?.id, "members"] }); setShowMemberForm(false); setMemberForm({}); toast({ title: "Member enrolled" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const payMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/gold-erp/chit-members/${selectedMember.id}/pay`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/chit-schemes", selectedScheme?.id, "members"] }); setShowPayForm(false); setPayForm({ payment_mode: "cash", paid_date: today() }); toast({ title: "Installment recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const setS = (k: string, v: any) => setSchemeForm((p: any) => ({ ...p, [k]: v }));
  const setM = (k: string, v: any) => setMemberForm((p: any) => ({ ...p, [k]: v }));
  const setP = (k: string, v: any) => setPayForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold">Gold Chit Schemes</h2>
        <Button onClick={() => setShowSchemeForm(true)} size="sm" data-testid="button-add-scheme"><Plus className="h-4 w-4 mr-1" />New Scheme</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {schemes.map((s: any) => (
          <Card key={s.id} className="cursor-pointer hover-elevate" onClick={() => setSelectedScheme(s)} data-testid={`card-scheme-${s.id}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.scheme_code}</p>
                </div>
                <StatusBadge status={s.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Monthly:</span> <span className="font-semibold">{fmtAmt(s.monthly_amount)}</span></div>
                <div><span className="text-muted-foreground">Duration:</span> {s.duration_months}+{s.bonus_month_free} mo.</div>
                <div><span className="text-muted-foreground">Members:</span> {s.member_count || 0}/{s.max_members}</div>
                <div><span className="text-muted-foreground">Metal:</span> <span className="capitalize">{s.metal_type}</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
        {schemes.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8">No chit schemes yet</p>}
      </div>

      {/* Members Dialog */}
      <Dialog open={!!selectedScheme} onOpenChange={v => !v && setSelectedScheme(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedScheme?.name} — Members</DialogTitle>
          </DialogHeader>
          <div className="flex justify-end mb-2">
            <Button size="sm" onClick={() => setShowMemberForm(true)} data-testid="button-add-member"><Plus className="h-4 w-4 mr-1" />Enroll Member</Button>
          </div>
          <div className="space-y-2">
            {members.map((m: any) => (
              <div key={m.id} className="border rounded-lg p-3 flex items-center justify-between gap-2" data-testid={`member-${m.id}`}>
                <div>
                  <p className="font-medium text-sm">{m.member_name}</p>
                  <p className="text-xs text-muted-foreground">{m.phone} · {m.member_code}</p>
                  <p className="text-xs">Paid: {m.installments_paid} installments · {fmtAmt(m.total_paid)} total</p>
                </div>
                <div className="flex gap-2 items-center">
                  <StatusBadge status={m.status} />
                  <Button size="sm" variant="outline" onClick={() => { setSelectedMember(m); setPayForm({ payment_mode: "cash", paid_date: today(), amount: selectedScheme?.monthly_amount }); setShowPayForm(true); }} data-testid={`button-pay-member-${m.id}`}>
                    <IndianRupee className="h-3 w-3 mr-1" />Pay
                  </Button>
                </div>
              </div>
            ))}
            {members.length === 0 && <p className="text-center text-muted-foreground py-4">No members enrolled yet</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* New Scheme Form */}
      <Dialog open={showSchemeForm} onOpenChange={setShowSchemeForm}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Chit Scheme</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Scheme Name *"><Input value={schemeForm.name || ""} onChange={e => setS("name", e.target.value)} placeholder="e.g. Diwali Gold Scheme 2026" data-testid="input-scheme-name" /></FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Monthly Amount (₹)"><Input type="number" value={schemeForm.monthly_amount || ""} onChange={e => setS("monthly_amount", e.target.value)} data-testid="input-scheme-amount" /></FieldRow>
              <FieldRow label="Metal">
                <Select value={schemeForm.metal_type || "gold"} onValueChange={v => setS("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Duration (paid months)"><Input type="number" value={schemeForm.duration_months || 11} onChange={e => setS("duration_months", e.target.value)} /></FieldRow>
              <FieldRow label="Free Months (Bonus)"><Input type="number" value={schemeForm.bonus_month_free || 1} onChange={e => setS("bonus_month_free", e.target.value)} /></FieldRow>
              <FieldRow label="Max Members"><Input type="number" value={schemeForm.max_members || 20} onChange={e => setS("max_members", e.target.value)} /></FieldRow>
              <FieldRow label="Start Date"><Input type="date" value={schemeForm.start_date || ""} onChange={e => setS("start_date", e.target.value)} /></FieldRow>
            </div>
            <FieldRow label="Notes"><Textarea value={schemeForm.notes || ""} onChange={e => setS("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowSchemeForm(false)}>Cancel</Button>
              <Button onClick={() => schemeMutation.mutate(schemeForm)} disabled={schemeMutation.isPending} data-testid="button-save-scheme">Create Scheme</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enroll Member Form */}
      <Dialog open={showMemberForm} onOpenChange={setShowMemberForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Enroll Member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Member Name *"><Input value={memberForm.member_name || ""} onChange={e => setM("member_name", e.target.value)} data-testid="input-member-name" /></FieldRow>
            <FieldRow label="Phone"><Input value={memberForm.phone || ""} onChange={e => setM("phone", e.target.value)} data-testid="input-member-phone" /></FieldRow>
            <FieldRow label="Address"><Textarea value={memberForm.address || ""} onChange={e => setM("address", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowMemberForm(false)}>Cancel</Button>
              <Button onClick={() => memberMutation.mutate(memberForm)} disabled={memberMutation.isPending} data-testid="button-save-member">Enroll</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Payment Form */}
      <Dialog open={showPayForm} onOpenChange={setShowPayForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Installment — {selectedMember?.member_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Amount (₹)"><Input type="number" value={payForm.amount || ""} onChange={e => setP("amount", e.target.value)} data-testid="input-pay-amount" /></FieldRow>
            <FieldRow label="Payment Mode">
              <Select value={payForm.payment_mode} onValueChange={v => setP("payment_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Date"><Input type="date" value={payForm.paid_date} onChange={e => setP("paid_date", e.target.value)} /></FieldRow>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowPayForm(false)}>Cancel</Button>
              <Button onClick={() => payMutation.mutate(payForm)} disabled={payMutation.isPending} data-testid="button-confirm-payment">Record Payment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Jobwork ───────────────────────────────────────────────────────────────────
function JobworkTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ metal_type: "gold", order_date: today() });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/jobwork-orders"] });
  const { data: karigars = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigars"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/gold-erp/jobwork-orders/${editing.id}`, data) : apiRequest("POST", "/api/gold-erp/jobwork-orders", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/jobwork-orders"] }); setShowForm(false); setEditing(null); setForm({ metal_type: "gold", order_date: today() }); toast({ title: "Jobwork order saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-semibold">Jobwork Orders</h2>
        <Button onClick={() => { setEditing(null); setForm({ metal_type: "gold", order_date: today() }); setShowForm(true); }} size="sm" data-testid="button-add-jobwork"><Plus className="h-4 w-4 mr-1" />New Jobwork</Button>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2">No.</th>
              <th className="text-left px-4 py-2">Karigar</th>
              <th className="text-left px-4 py-2">Metal</th>
              <th className="text-right px-4 py-2">Issued</th>
              <th className="text-right px-4 py-2">Received</th>
              <th className="text-right px-4 py-2">Wastage</th>
              <th className="text-right px-4 py-2">Wage</th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o: any) => (
              <tr key={o.id} className="border-t hover:bg-muted/30" data-testid={`row-jobwork-${o.id}`}>
                <td className="px-4 py-2 text-xs text-muted-foreground">{o.jobwork_no}</td>
                <td className="px-4 py-2 font-medium">{o.karigar_name || "—"}</td>
                <td className="px-4 py-2 capitalize">{o.metal_type} · {o.purity_name}</td>
                <td className="px-4 py-2 text-right">{fmtWt(o.issued_weight_gm)}</td>
                <td className="px-4 py-2 text-right">{o.received_weight_gm ? fmtWt(o.received_weight_gm) : "—"}</td>
                <td className="px-4 py-2 text-right">{o.wastage_gm ? fmtWt(o.wastage_gm) : "—"}</td>
                <td className="px-4 py-2 text-right font-semibold">{fmtAmt(o.total_wage)}</td>
                <td className="px-4 py-2"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-2 text-right">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(o); setForm(o); setShowForm(true); }} data-testid={`button-edit-jobwork-${o.id}`}><Pencil className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No jobwork orders yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditing(null); } }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Jobwork" : "New Jobwork Order"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Karigar *">
              <Select value={form.karigar_id?.toString() || ""} onValueChange={v => set("karigar_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select karigar" /></SelectTrigger>
                <SelectContent>
                  {karigars.map((k: any) => <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => set("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gold">Gold</SelectItem>
                    <SelectItem value="silver">Silver</SelectItem>
                    <SelectItem value="platinum">Platinum</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Purity">
                <Select value={form.purity_name || ""} onValueChange={v => set("purity_name", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(PURITIES[form.metal_type] || []).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Issued Weight (g)"><Input type="number" value={form.issued_weight_gm || ""} onChange={e => set("issued_weight_gm", e.target.value)} data-testid="input-jw-issued" /></FieldRow>
              <FieldRow label="Wage/g (₹)"><Input type="number" value={form.wage_per_gram || ""} onChange={e => set("wage_per_gram", e.target.value)} data-testid="input-jw-wage" /></FieldRow>
              {editing && <>
                <FieldRow label="Received Wt (g)"><Input type="number" value={form.received_weight_gm || ""} onChange={e => set("received_weight_gm", e.target.value)} /></FieldRow>
                <FieldRow label="Wastage (g)"><Input type="number" value={form.wastage_gm || ""} onChange={e => set("wastage_gm", e.target.value)} /></FieldRow>
                <FieldRow label="Status">
                  <Select value={form.status || "pending"} onValueChange={v => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label="Completed Date"><Input type="date" value={form.completed_date || ""} onChange={e => set("completed_date", e.target.value)} /></FieldRow>
              </>}
              <FieldRow label="Expected Date"><Input type="date" value={form.expected_date || ""} onChange={e => set("expected_date", e.target.value)} /></FieldRow>
            </div>
            <FieldRow label="Description"><Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={2} /></FieldRow>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-jobwork">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GoldErpPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
          <Gem className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gold & Jewellery ERP</h1>
          <p className="text-sm text-muted-foreground">Complete management for jewellery manufacturers, retailers & karigars</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="rates" data-testid="tab-rates">Metal Rates</TabsTrigger>
          <TabsTrigger value="karigar" data-testid="tab-karigar">Karigar</TabsTrigger>
          <TabsTrigger value="items" data-testid="tab-items">Item Master</TabsTrigger>
          <TabsTrigger value="estimates" data-testid="tab-estimates">Estimates</TabsTrigger>
          <TabsTrigger value="production" data-testid="tab-production">Production</TabsTrigger>
          <TabsTrigger value="jobwork" data-testid="tab-jobwork">Jobwork</TabsTrigger>
          <TabsTrigger value="bullion" data-testid="tab-bullion">Bullion</TabsTrigger>
          <TabsTrigger value="repairs" data-testid="tab-repairs">Repairs</TabsTrigger>
          <TabsTrigger value="hallmarking" data-testid="tab-hallmarking">Hallmarking</TabsTrigger>
          <TabsTrigger value="chit" data-testid="tab-chit">Chit Schemes</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="rates"><MetalRatesTab /></TabsContent>
          <TabsContent value="karigar"><KarigarTab /></TabsContent>
          <TabsContent value="items"><ItemMasterTab /></TabsContent>
          <TabsContent value="estimates"><EstimatesTab /></TabsContent>
          <TabsContent value="production"><ProductionTab /></TabsContent>
          <TabsContent value="jobwork"><JobworkTab /></TabsContent>
          <TabsContent value="bullion"><BullionTab /></TabsContent>
          <TabsContent value="repairs"><RepairsTab /></TabsContent>
          <TabsContent value="hallmarking"><HallmarkingTab /></TabsContent>
          <TabsContent value="chit"><ChitSchemesTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
