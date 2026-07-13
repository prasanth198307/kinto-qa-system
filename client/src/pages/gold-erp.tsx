import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Search, Pencil, Trash2, TrendingUp, Users, IndianRupee,
  Gem, Wrench, Shield, RefreshCw, LayoutDashboard,
  Star, Package, Factory, Truck, BarChart3, CheckCircle, Layers,
  BookOpen, Camera, Zap, Crosshair, ClipboardList, Award,
  RotateCcw, ShoppingBag, Tag, Gift, Repeat2, Wifi, ShoppingCart,
  Globe, CreditCard, Settings2, Coins, AlertTriangle, BookMarked,
} from "lucide-react";

// ── Sub-module imports ─────────────────────────────────────────────────────────
import { SketchSection, CADSection, CAMSection, GhatSection, SettlementSection, JobFinalizeSection, KarigarLedgerSection } from "./gold-erp-production-ext";
import { KarigarAttendanceSection, BullionRateCutsSection, ChitCollectionRegisterSection, WholesaleB2BOrdersSection, JewelleryPOSSection, BullionVaultMovementSection } from "./gold-erp-gap-screens";
import { WholesaleJobworkSection, HallmarkingBatchesSection } from "./gold-erp-wholesale";
import { CounterBookingsSection, CustomerApprovalsSection, BuybackSection, PhysicalAuditSection, LoyaltySection, PromotionsSection, RefiningSection, PosOldGoldSection } from "./gold-erp-retail";
import { BullionBookingsSection, VaultAuditSection } from "./gold-erp-bullion-trade";
import { ChitMaturitySection, ChitDefaultersSection, ChitRedemptionsSection } from "./gold-erp-chit-ext";
import { ECatalogSection } from "./gold-erp-catalog";
import { OMSOrdersSection, OMSNotifyConfigSection } from "./gold-erp-oms";
import { ECommerceSection } from "./gold-erp-ecommerce";
import { RFIDSection } from "./gold-erp-rfid";
import { MetalFinanceSection } from "./gold-erp-finance";
import { IntegrationConfigsSection } from "./gold-erp-integrations";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const fmt = (n: any, d = 2) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: d });
const fmtWt = (n: any) => `${fmt(n, 3)} g`;
const fmtAmt = (sym: string, n: any) => `${sym}${fmt(n)}`;
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
  submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  purchase: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  sale: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  inward: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  adjustment: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`capitalize text-xs ${STATUS_COLORS[status] || "bg-gray-100 text-gray-600"}`}>
      {status?.replace(/_/g, " ")}
    </Badge>
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

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewSection() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/gold-erp/stats"] });
  const { data: rates = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/metal-rates/today"] });

  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const statCards = [
    { title: "Gold Rate (22K)", value: `${sym}${fmt(stats?.goldRate)}/g`, icon: TrendingUp, color: "bg-yellow-100 text-yellow-600" },
    { title: "Karigars", value: stats?.totalKarigars ?? 0, icon: Users, color: "bg-blue-100 text-blue-600" },
    { title: "Jewellery Items", value: stats?.totalItems ?? 0, icon: Package, color: "bg-purple-100 text-purple-600" },
    { title: "Active Repairs", value: stats?.activeRepairs ?? 0, icon: Wrench, color: "bg-orange-100 text-orange-600" },
    { title: "Active Schemes", value: stats?.activeSchemes ?? 0, icon: Shield, color: "bg-green-100 text-green-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map(s => (
          <Card key={s.title}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.color}`}><s.icon className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">{s.title}</p>
                <p className="text-lg font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Today's Metal Rates</CardTitle></CardHeader>
          <CardContent>
            {rates.length === 0
              ? <p className="text-sm text-muted-foreground">No rates set. Go to Metal Rates to enter today's rates.</p>
              : <div className="space-y-2">
                  {rates.map((r: any) => (
                    <div key={r.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                      <span className="font-medium capitalize">{r.metal} — {r.purity_name}</span>
                      <span className="font-bold">{sym}{fmt(r.rate_per_gram)}/g</span>
                    </div>
                  ))}
                </div>
            }
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Module Guide</CardTitle></CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li><span className="font-medium text-foreground">Metal Rates</span> — Update daily IBJA/MCX prices</li>
              <li><span className="font-medium text-foreground">Karigar</span> — Artisan workforce & advances</li>
              <li><span className="font-medium text-foreground">Jewellery Items</span> — Gold/silver pieces with weight, purity & HUID</li>
              <li><span className="font-medium text-foreground">Karigar Job Orders</span> — Internal: issue your gold to karigar</li>
              <li><span className="font-medium text-foreground">Customer Jobwork</span> — External: manufacture on customer's gold</li>
              <li><span className="font-medium text-foreground">Hallmarking — Batch Submission</span> — Send batches to BIS centre</li>
              <li><span className="font-medium text-foreground">Hallmarking — HUID Records</span> — Record HUID per item on return</li>
              <li><span className="font-medium text-foreground">Jewellery POS</span> — Full billing with GST, exchange gold & loyalty</li>
              <li><span className="font-medium text-foreground">Old Gold Purchase (No Sale)</span> — Buy-only counter; posts to bullion stock</li>
              <li><span className="font-medium text-foreground">Chit Schemes</span> — INR & gold-weight savings plans</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <a href="?section=analytics" className="block">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600"><Star className="h-4 w-4" /></div>
              <div>
                <p className="text-xs font-medium">JW Analytics</p>
                <p className="text-xs text-muted-foreground">Production & wastage deep-dive</p>
              </div>
            </CardContent>
          </Card>
        </a>
        <a href="/" className="block">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600"><LayoutDashboard className="h-4 w-4" /></div>
              <div>
                <p className="text-xs font-medium">Sales Dashboard</p>
                <p className="text-xs text-muted-foreground">Invoicing & payment KPIs</p>
              </div>
            </CardContent>
          </Card>
        </a>
        <a href="/mis" className="block">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600"><BarChart3 className="h-4 w-4" /></div>
              <div>
                <p className="text-xs font-medium">MIS Dashboard</p>
                <p className="text-xs text-muted-foreground">Business intelligence reports</p>
              </div>
            </CardContent>
          </Card>
        </a>
        <a href="/hr/payroll" className="block">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600"><Users className="h-4 w-4" /></div>
              <div>
                <p className="text-xs font-medium">HR & Payroll</p>
                <p className="text-xs text-muted-foreground">Employees, attendance & payslips</p>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>
    </div>
  );
}

// ── Metal Rates ───────────────────────────────────────────────────────────────
function MetalRatesSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ metal: "gold", purity_name: "22K (916)", purity_percent: 91.6, source: "IBJA", rate_date: today() });
  const { data: rates = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/metal-rates"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gold-erp/metal-rates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/metal-rates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/metal-rates/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/stats"] });
      setShowForm(false);
      setForm({ metal: "gold", purity_name: "22K (916)", purity_percent: 91.6, source: "IBJA", rate_date: today() });
      toast({ title: "Rate saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/gold-erp/metal-rates/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/metal-rates"] }); toast({ title: "Deleted" }); },
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const metalChange = (v: string) => { const def = PURITIES[v]?.[0]; set("metal", v); if (def) { set("purity_name", def.name); set("purity_percent", def.pct); } };
  const purityChange = (v: string) => { const p = PURITIES[form.metal]?.find((x: any) => x.name === v); set("purity_name", v); if (p) set("purity_percent", p.pct); };
  const { currency_symbol: sym } = useTenantConfig();

  return (
    <>
      <SectionHeader title="Metal Rates"
        action={<Button onClick={() => setShowForm(true)} size="sm" data-testid="button-add-metal-rate"><Plus className="h-4 w-4 mr-1" />Add Rate</Button>} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Metal", "Purity", "Rate/g", "Source", "Date", ""].map(h => (
                <th key={h} className={`px-4 py-2 text-left${h === "Rate/g" ? " text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rates.map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 capitalize font-medium">{r.metal}</td>
                <td className="px-4 py-2">{r.purity_name}</td>
                <td className="px-4 py-2 text-right font-bold">{sym}{fmt(r.rate_per_gram)}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.source}</td>
                <td className="px-4 py-2 text-muted-foreground">{r.rate_date?.slice(0, 10)}</td>
                <td className="px-4 py-2 text-right">
                  <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {rates.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No rates yet</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Metal Rate</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Metal">
              <Select value={form.metal} onValueChange={metalChange}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="platinum">Platinum</SelectItem></SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Purity">
              <Select value={form.purity_name} onValueChange={purityChange}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(PURITIES[form.metal] || []).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Rate per gram "><Input type="number" value={form.rate_per_gram || ""} onChange={e => set("rate_per_gram", e.target.value)} data-testid="input-rate-per-gram" /></FieldRow>
            <FieldRow label="Source">
              <Select value={form.source} onValueChange={v => set("source", v)}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="IBJA">IBJA</SelectItem><SelectItem value="MCX">MCX</SelectItem><SelectItem value="manual">Manual</SelectItem></SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Date"><Input type="date" value={form.rate_date} onChange={e => set("rate_date", e.target.value)} /></FieldRow>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-rate">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Karigar ───────────────────────────────────────────────────────────────────
function KarigarSection() {
  const { currency_symbol: sym } = useTenantConfig();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ metal_type: "gold", status: "active" });
  const { data: karigars = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigars"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/gold-erp/karigars/${editing.id}`, data) : apiRequest("POST", "/api/gold-erp/karigars", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/karigars"] }); queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/stats"] }); setShowForm(false); setEditing(null); setForm({ metal_type: "gold", status: "active" }); toast({ title: "Karigar saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/gold-erp/karigars/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/karigars"] }); toast({ title: "Deleted" }); },
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const filtered = karigars.filter((k: any) => k.name?.toLowerCase().includes(search.toLowerCase()) || k.phone?.includes(search));

  return (
    <>
      <SectionHeader title="Karigar Management" action={
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9 w-48" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <Button onClick={() => { setEditing(null); setForm({ metal_type: "gold", status: "active" }); setShowForm(true); }} size="sm" data-testid="button-add-karigar"><Plus className="h-4 w-4 mr-1" />Add</Button>
        </div>
      } />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((k: any) => (
          <Card key={k.id} data-testid={`card-karigar-${k.id}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-semibold">{k.name}</p><p className="text-xs text-muted-foreground">{k.karigar_code}</p></div>
                <StatusBadge status={k.status} />
              </div>
              <p className="text-sm text-muted-foreground">{k.phone}{k.specialization ? ` · ${k.specialization}` : ""}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded p-2"><p className="text-muted-foreground">Balance</p><p className="font-semibold">{fmtWt(k.balance_grams)}</p></div>
                <div className="bg-muted/50 rounded p-2"><p className="text-muted-foreground">Wage/g</p><p className="font-semibold">{fmtAmt(sym, k.wage_per_gram)}</p></div>
                <div className="bg-muted/50 rounded p-2"><p className="text-muted-foreground">Daily Rate</p><p className="font-semibold">{fmtAmt(sym, k.daily_rate)}</p></div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(k); setForm(k); setShowForm(true); }}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(k.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8">No karigars found</p>}
      </div>
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) { setEditing(null); setForm({ metal_type: "gold", status: "active" }); } }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Karigar" : "Add Karigar"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Name *"><Input value={form.name || ""} onChange={e => set("name", e.target.value)} data-testid="input-karigar-name" /></FieldRow>
            <FieldRow label="Phone"><Input value={form.phone || ""} onChange={e => set("phone", e.target.value)} /></FieldRow>
            <FieldRow label="Specialization"><Input value={form.specialization || ""} onChange={e => set("specialization", e.target.value)} placeholder="Bangles, Rings, Chains…" /></FieldRow>
            <FieldRow label="Wage per gram "><Input type="number" value={form.wage_per_gram || ""} onChange={e => set("wage_per_gram", e.target.value)} /></FieldRow>
            <FieldRow label="Daily Rate "><Input type="number" value={form.daily_rate || ""} onChange={e => set("daily_rate", e.target.value)} placeholder="e.g. 800" /></FieldRow>
            <FieldRow label="Aadhaar No"><Input value={form.aadhar_no || ""} onChange={e => set("aadhar_no", e.target.value)} /></FieldRow>
            <FieldRow label="Address"><Textarea value={form.address || ""} onChange={e => set("address", e.target.value)} rows={2} /></FieldRow>
            {editing && <FieldRow label="Status"><Select value={form.status || "active"} onValueChange={v => set("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select></FieldRow>}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-karigar">Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Item Master ───────────────────────────────────────────────────────────────
function ItemMasterSection() {
  const { currency_symbol: sym } = useTenantConfig();
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
  const filtered = items.filter((i: any) => [i.name, i.item_code, i.category].some(f => f?.toLowerCase().includes(search.toLowerCase())));

  return (
    <>
      <SectionHeader title="Jewellery Item Master" action={
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9 w-48" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <Button onClick={() => { setEditing(null); setForm({ metal_type: "gold", purity_name: "22K (916)", making_charge_type: "percent", stock_qty: 1 }); setShowForm(true); }} size="sm" data-testid="button-add-item"><Plus className="h-4 w-4 mr-1" />Add Item</Button>
        </div>
      } />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {["Code", "Name / Category", "Metal / Purity", "Gross Wt", "Net Wt", "Selling Price", "Qty", ""].map((h, i) => (
                <th key={i} className={`px-4 py-2 text-left${["Gross Wt","Net Wt","Selling Price"].includes(h) ? " text-right" : ""}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item: any) => (
              <tr key={item.id} className="border-t hover:bg-muted/30" data-testid={`row-item-${item.id}`}>
                <td className="px-4 py-2 text-xs text-muted-foreground">{item.item_code}</td>
                <td className="px-4 py-2"><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.category}</p></td>
                <td className="px-4 py-2 capitalize"><p>{item.metal_type}</p><p className="text-xs text-muted-foreground">{item.purity_name}</p></td>
                <td className="px-4 py-2 text-right">{fmtWt(item.gross_weight_gm)}</td>
                <td className="px-4 py-2 text-right">{fmtWt(item.net_weight_gm)}</td>
                <td className="px-4 py-2 text-right font-semibold">{item.selling_price ? fmtAmt(sym, item.selling_price) : "—"}</td>
                <td className="px-4 py-2 text-center">{item.stock_qty}</td>
                <td className="px-4 py-2">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(item); setForm(item); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(item.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No items found</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Item" : "Add Jewellery Item"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Name *"><Input value={form.name || ""} onChange={e => set("name", e.target.value)} data-testid="input-item-name" /></FieldRow>
            <FieldRow label="Category"><Input value={form.category || ""} onChange={e => set("category", e.target.value)} placeholder="Ring, Bangle…" /></FieldRow>
            <FieldRow label="Metal">
              <Select value={form.metal_type || "gold"} onValueChange={v => { set("metal_type", v); const d = PURITIES[v]?.[0]; if (d) { set("purity_name", d.name); set("purity_percent", d.pct); } }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="platinum">Platinum</SelectItem></SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Purity">
              <Select value={form.purity_name || ""} onValueChange={v => { set("purity_name", v); const p = PURITIES[form.metal_type]?.find((x: any) => x.name === v); if (p) set("purity_percent", p.pct); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(PURITIES[form.metal_type] || []).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Gross Weight (g)"><Input type="number" value={form.gross_weight_gm || ""} onChange={e => set("gross_weight_gm", e.target.value)} /></FieldRow>
            <FieldRow label="Stone Weight (g)"><Input type="number" value={form.stone_weight_gm || ""} onChange={e => set("stone_weight_gm", e.target.value)} /></FieldRow>
            <FieldRow label="Making Charge Type">
              <Select value={form.making_charge_type || "percent"} onValueChange={v => set("making_charge_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="percent">% of Metal Value</SelectItem><SelectItem value="per_gram">Per Gram</SelectItem><SelectItem value="fixed">Fixed</SelectItem></SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Making Charge Value"><Input type="number" value={form.making_charge_value || ""} onChange={e => set("making_charge_value", e.target.value)} /></FieldRow>
            <FieldRow label="Wastage %"><Input type="number" value={form.wastage_pct || ""} onChange={e => set("wastage_pct", e.target.value)} /></FieldRow>
            <FieldRow label="Stone Value "><Input type="number" value={form.stone_value || ""} onChange={e => set("stone_value", e.target.value)} /></FieldRow>
            <FieldRow label="Selling Price "><Input type="number" value={form.selling_price || ""} onChange={e => set("selling_price", e.target.value)} /></FieldRow>
            <FieldRow label="Stock Qty"><Input type="number" value={form.stock_qty || 1} onChange={e => set("stock_qty", e.target.value)} /></FieldRow>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-item">Save Item</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Estimates ─────────────────────────────────────────────────────────────────
function EstimatesSection() {
  const { currency_symbol: sym } = useTenantConfig();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ metal_type: "gold", purity_name: "22K (916)", gst_pct: 3, making_charge_type: "percent" });
  const { data: estimates = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/estimates"] });
  const { data: ratesData = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/metal-rates/today"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gold-erp/estimates", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/estimates"] }); setShowForm(false); setForm({ metal_type: "gold", purity_name: "22K (916)", gst_pct: 3, making_charge_type: "percent" }); toast({ title: "Estimate created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const autoFillRate = () => {
    const r = ratesData.find((r: any) => r.metal === form.metal_type && r.purity_name === form.purity_name);
    if (r) set("rate_per_gram", r.rate_per_gram);
    else toast({ title: "No rate found for selected metal/purity", variant: "destructive" });
  };

  useEffect(() => {
    if ((ratesData as any[]).length > 0 && form.metal_type && form.purity_name) {
      const r = (ratesData as any[]).find((r: any) => r.metal === form.metal_type && r.purity_name === form.purity_name);
      if (r) setForm((p: any) => ({ ...p, rate_per_gram: r.rate_per_gram }));
    }
  }, [form.metal_type, form.purity_name, (ratesData as any[]).length]);

  const calcTotal = () => {
    const wt = Number(form.weight_gm || 0);
    const rate = Number(form.rate_per_gram || 0);
    const metalVal = wt * rate;
    const wastage = metalVal * Number(form.wastage_pct || 0) / 100;
    const mt = form.making_charge_type || "percent";
    const making = mt === "percent" ? metalVal * Number(form.making_charge_value || 0) / 100
      : mt === "per_gram" ? wt * Number(form.making_charge_value || 0)
        : Number(form.making_charge_value || 0);
    const stone = Number(form.stone_value || 0);
    const sub = metalVal + wastage + making + stone;
    const gst = sub * Number(form.gst_pct || 3) / 100;
    setForm((p: any) => ({ ...p, total_metal_value: metalVal.toFixed(2), wastage_amount: wastage.toFixed(2), making_charges: making.toFixed(2), gst_amount: gst.toFixed(2), total_amount: (sub + gst).toFixed(2) }));
  };

  return (
    <>
      <SectionHeader title="Estimates / Quotations"
        action={<Button onClick={() => setShowForm(true)} size="sm" data-testid="button-add-estimate"><Plus className="h-4 w-4 mr-1" />New Estimate</Button>} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["No.", "Customer", "Metal", "Total", "Status", "Date"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody>
            {estimates.map((e: any) => (
              <tr key={e.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs text-muted-foreground">{e.estimate_no}</td>
                <td className="px-4 py-2"><p className="font-medium">{e.customer_name || "—"}</p><p className="text-xs text-muted-foreground">{e.customer_phone}</p></td>
                <td className="px-4 py-2 capitalize">{e.metal_type} · {e.purity_name}</td>
                <td className="px-4 py-2 font-bold">{fmtAmt(sym, e.total_amount)}</td>
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
              <FieldRow label="Customer Name"><Input value={form.customer_name || ""} onChange={e => set("customer_name", e.target.value)} /></FieldRow>
              <FieldRow label="Phone"><Input value={form.customer_phone || ""} onChange={e => set("customer_phone", e.target.value)} /></FieldRow>
              <FieldRow label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => set("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="platinum">Platinum</SelectItem></SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Purity">
                <Select value={form.purity_name || ""} onValueChange={v => set("purity_name", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(PURITIES[form.metal_type] || []).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Weight (g)"><Input type="number" value={form.weight_gm || ""} onChange={e => set("weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Rate/g (${sym})">
                <div className="flex gap-1">
                  <Input type="number" value={form.rate_per_gram || ""} onChange={e => set("rate_per_gram", e.target.value)} />
                  <Button size="sm" variant="outline" onClick={autoFillRate} title="Fill from today's rate"><RefreshCw className="h-4 w-4" /></Button>
                </div>
              </FieldRow>
              <FieldRow label="Wastage %"><Input type="number" value={form.wastage_pct || ""} onChange={e => set("wastage_pct", e.target.value)} /></FieldRow>
              <FieldRow label="Making Charge">
                <div className="flex gap-1">
                  <Select value={form.making_charge_type || "percent"} onValueChange={v => set("making_charge_type", v)}>
                    <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="percent">%</SelectItem><SelectItem value="per_gram">${sym}/g</SelectItem><SelectItem value="fixed">Fixed</SelectItem></SelectContent>
                  </Select>
                  <Input type="number" value={form.making_charge_value || ""} onChange={e => set("making_charge_value", e.target.value)} />
                </div>
              </FieldRow>
              <FieldRow label="Stone Value "><Input type="number" value={form.stone_value || ""} onChange={e => set("stone_value", e.target.value)} /></FieldRow>
              <FieldRow label="GST %"><Input type="number" value={form.gst_pct ?? 3} onChange={e => set("gst_pct", e.target.value)} /></FieldRow>
            </div>
            <Button variant="outline" className="w-full" onClick={calcTotal} data-testid="button-calculate">Calculate Total</Button>
            {form.total_amount && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Metal Value</span><span>{fmtAmt(sym, form.total_metal_value)}</span></div>
                <div className="flex justify-between"><span>Wastage</span><span>{fmtAmt(sym, form.wastage_amount)}</span></div>
                <div className="flex justify-between"><span>Making Charges</span><span>{fmtAmt(sym, form.making_charges)}</span></div>
                <div className="flex justify-between"><span>Stone Value</span><span>{fmtAmt(sym, form.stone_value)}</span></div>
                <div className="flex justify-between"><span>GST ({form.gst_pct}%)</span><span>{fmtAmt(sym, form.gst_amount)}</span></div>
                <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>{fmtAmt(sym, form.total_amount)}</span></div>
              </div>
            )}
            <FieldRow label="Valid Until"><Input type="date" value={form.valid_until || ""} onChange={e => set("valid_until", e.target.value)} /></FieldRow>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-estimate">Save Estimate</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Production ────────────────────────────────────────────────────────────────
function ProductionSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [form, setForm] = useState<any>({ metal_type: "gold", purity_name: "22K (916)", qty: 1 });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/production-orders"] });
  const { data: karigars = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigars"] });
  const { data: designs = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/designs"] });
  const { data: stages = [] } = useQuery<any[]>({
    queryKey: ["/api/gold-erp/production-orders", selectedOrder?.id, "stages"],
    queryFn: () => selectedOrder ? fetch(`/api/gold-erp/production-orders/${selectedOrder.id}/stages`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) : Promise.resolve([]),
    enabled: !!selectedOrder,
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gold-erp/production-orders", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/production-orders"] }); setShowForm(false); setForm({ metal_type: "gold", purity_name: "22K (916)", qty: 1 }); toast({ title: "Production order created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateStageMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PUT", `/api/gold-erp/production-stages/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/production-orders", selectedOrder?.id, "stages"] }); },
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const STAGE_STATUS = ["pending", "in_progress", "completed", "skipped"];
  const STAGE_COLORS: Record<string, string> = { completed: "text-green-600", in_progress: "text-orange-500", pending: "text-muted-foreground", skipped: "text-gray-400" };

  return (
    <>
      <SectionHeader title="Production Orders"
        action={<Button data-testid="button-new-production-order" onClick={() => setShowForm(true)} size="sm"><Plus className="h-4 w-4 mr-1" />New Order</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((o: any) => (
          <Card key={o.id} className="cursor-pointer hover-elevate" onClick={() => setSelectedOrder(o)}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-semibold text-sm">{o.order_no}</p><p className="text-xs text-muted-foreground">{o.design_name || "Custom"}</p></div>
                <StatusBadge status={o.status} />
              </div>
              <p className="text-xs text-muted-foreground">Karigar: {o.karigar_name || "—"}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Issued:</span> {fmtWt(o.issued_weight_gm)}</div>
                <div><span className="text-muted-foreground">Target:</span> {o.target_date?.slice(0, 10) || "—"}</div>
              </div>
              <p className="text-xs font-medium text-blue-600">Stage: {o.current_stage}</p>
            </CardContent>
          </Card>
        ))}
        {orders.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8">No production orders yet</p>}
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={v => !v && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Production Stages — {selectedOrder?.order_no}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {(stages as any[]).map((s: any) => (
              <div key={s.id} className="border rounded-lg p-3 flex items-center gap-3">
                <span className={`text-sm font-medium w-5 ${STAGE_COLORS[s.status] || ""}`}>{s.stage_order}.</span>
                <span className="flex-1 text-sm font-medium">{s.stage_name}</span>
                {s.weight_out_gm && <span className="text-xs text-muted-foreground">{fmtWt(s.weight_out_gm)}</span>}
                <Select value={s.status} onValueChange={v => updateStageMutation.mutate({ id: s.id, data: { ...s, status: v } })}>
                  <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STAGE_STATUS.map(st => <SelectItem key={st} value={st}>{st.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
            {stages.length === 0 && <p className="text-center text-muted-foreground py-4">Loading…</p>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Production Order</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Design">
              <Select value={form.design_id?.toString() || ""} onValueChange={v => set("design_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select design (optional)" /></SelectTrigger>
                <SelectContent>{designs.map((d: any) => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Karigar">
              <Select value={form.karigar_id?.toString() || ""} onValueChange={v => set("karigar_id", parseInt(v))}>
                <SelectTrigger data-testid="select-prod-karigar"><SelectValue placeholder="Select karigar" /></SelectTrigger>
                <SelectContent>{karigars.map((k: any) => <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => { const def = PURITIES[v]?.[0]; setForm((p: any) => ({ ...p, metal_type: v, purity_name: def?.name || "" })); }}>
                  <SelectTrigger data-testid="select-prod-metal"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="platinum">Platinum</SelectItem></SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Purity">
                <Select value={form.purity_name || "22K (916)"} onValueChange={v => set("purity_name", v)}>
                  <SelectTrigger data-testid="select-prod-purity"><SelectValue /></SelectTrigger>
                  <SelectContent>{(PURITIES[form.metal_type || "gold"] || []).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Qty"><Input data-testid="input-prod-qty" type="number" value={form.qty || 1} onChange={e => set("qty", e.target.value)} /></FieldRow>
              <FieldRow label="Issued Weight (g)"><Input data-testid="input-prod-issued-weight" type="number" value={form.issued_weight_gm || ""} onChange={e => set("issued_weight_gm", e.target.value)} /></FieldRow>
            </div>
            <FieldRow label="Target Date"><Input data-testid="input-prod-target-date" type="date" value={form.target_date || ""} onChange={e => set("target_date", e.target.value)} /></FieldRow>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button data-testid="button-create-production-order" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Create Order</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Jobwork ───────────────────────────────────────────────────────────────────
function JobworkSection() {
  const { currency_symbol: sym } = useTenantConfig();
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
    <>
      <SectionHeader title="Jobwork Orders"
        action={<Button onClick={() => { setEditing(null); setForm({ metal_type: "gold", order_date: today() }); setShowForm(true); }} size="sm"><Plus className="h-4 w-4 mr-1" />New Jobwork</Button>} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["No.", "Karigar", "Metal", "Issued", "Received", "Wastage", "Wage", "Status", ""].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(orders as any[]).map((o: any) => (
              <tr key={o.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs text-muted-foreground">{o.jobwork_no}</td>
                <td className="px-4 py-2 font-medium">{o.karigar_name || "—"}</td>
                <td className="px-4 py-2 capitalize">{o.metal_type} · {o.purity_name}</td>
                <td className="px-4 py-2">{fmtWt(o.issued_weight_gm)}</td>
                <td className="px-4 py-2">{o.received_weight_gm ? fmtWt(o.received_weight_gm) : "—"}</td>
                <td className="px-4 py-2">{o.wastage_gm ? fmtWt(o.wastage_gm) : "—"}</td>
                <td className="px-4 py-2 font-semibold">{fmtAmt(sym, o.total_wage)}</td>
                <td className="px-4 py-2"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-2"><Button size="icon" variant="ghost" onClick={() => { setEditing(o); setForm(o); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No jobwork orders yet</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Jobwork" : "New Jobwork Order"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Karigar *">
              <Select value={form.karigar_id?.toString() || ""} onValueChange={v => set("karigar_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select karigar" /></SelectTrigger>
                <SelectContent>{karigars.map((k: any) => <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => set("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="platinum">Platinum</SelectItem></SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Purity">
                <Select value={form.purity_name || ""} onValueChange={v => set("purity_name", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(PURITIES[form.metal_type] || []).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Issued Weight (g)"><Input type="number" value={form.issued_weight_gm || ""} onChange={e => set("issued_weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Wage/g (${sym})"><Input type="number" value={form.wage_per_gram || ""} onChange={e => set("wage_per_gram", e.target.value)} /></FieldRow>
              {editing && <>
                <FieldRow label="Received Wt (g)"><Input type="number" value={form.received_weight_gm || ""} onChange={e => set("received_weight_gm", e.target.value)} /></FieldRow>
                <FieldRow label="Wastage (g)"><Input type="number" value={form.wastage_gm || ""} onChange={e => set("wastage_gm", e.target.value)} /></FieldRow>
                <FieldRow label="Status">
                  <Select value={form.status || "pending"} onValueChange={v => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label="Completed Date"><Input type="date" value={form.completed_date || ""} onChange={e => set("completed_date", e.target.value)} /></FieldRow>
              </>}
              <FieldRow label="Expected Date"><Input type="date" value={form.expected_date || ""} onChange={e => set("expected_date", e.target.value)} /></FieldRow>
            </div>
            <FieldRow label="Description"><Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Bullion ───────────────────────────────────────────────────────────────────
function BullionSection() {
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
  const { currency_symbol: sym } = useTenantConfig();

  return (
    <>
      <SectionHeader title="Bullion Management"
        action={<Button onClick={() => setShowForm(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Record Transaction</Button>} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
        {(stock as any[]).map((s: any) => (
          <Card key={s.id}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground capitalize">{s.metal_type} — {s.purity_name}</p>
              <p className="text-xl font-bold mt-1">{fmtWt(s.stock_grams)}</p>
              <p className="text-xs text-muted-foreground">Avg {sym}{fmt(s.avg_rate)}/g</p>
            </CardContent>
          </Card>
        ))}
        {stock.length === 0 && <p className="col-span-4 text-sm text-muted-foreground py-2">No bullion stock yet.</p>}
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Txn No.", "Type", "Metal", "Weight", "Rate/g", "Amount", "Party", "Date"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(transactions as any[]).map((t: any) => (
              <tr key={t.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs text-muted-foreground">{t.txn_no}</td>
                <td className="px-4 py-2"><StatusBadge status={t.txn_type} /></td>
                <td className="px-4 py-2 capitalize">{t.metal_type} · {t.purity_name}</td>
                <td className="px-4 py-2">{fmtWt(t.weight_gm)}</td>
                <td className="px-4 py-2">{fmtAmt(sym, t.rate_per_gram)}</td>
                <td className="px-4 py-2 font-semibold">{fmtAmt(sym, t.amount)}</td>
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
            <FieldRow label="Type">
              <Select value={form.txn_type} onValueChange={v => set("txn_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="purchase">Purchase (Inward)</SelectItem><SelectItem value="sale">Sale (Outward)</SelectItem><SelectItem value="inward">Inward (Refining)</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem></SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => set("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="platinum">Platinum</SelectItem></SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Purity">
                <Select value={form.purity_name || ""} onValueChange={v => set("purity_name", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(PURITIES[form.metal_type] || []).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Weight (g)"><Input type="number" value={form.weight_gm || ""} onChange={e => set("weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Rate/g (${sym})"><Input type="number" value={form.rate_per_gram || ""} onChange={e => set("rate_per_gram", e.target.value)} /></FieldRow>
            </div>
            <FieldRow label="Party Name"><Input value={form.party_name || ""} onChange={e => set("party_name", e.target.value)} /></FieldRow>
            <FieldRow label="Date"><Input type="date" value={form.txn_date} onChange={e => set("txn_date", e.target.value)} /></FieldRow>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Record</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Repairs ───────────────────────────────────────────────────────────────────
function RepairsSection() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ metal_type: "gold", issue_date: today() });
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceRepair, setInvoiceRepair] = useState<any>(null);
  const [goldRate, setGoldRate] = useState<number>(6820);
  const [goldAdded, setGoldAdded] = useState<number>(0);
  const { data: repairs = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/repairs"] });
  const { data: karigars = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigars"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/gold-erp/repairs/${editing.id}`, data) : apiRequest("POST", "/api/gold-erp/repairs", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/repairs"] }); queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/stats"] }); setShowForm(false); setEditing(null); setForm({ metal_type: "gold", issue_date: today() }); toast({ title: "Repair saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const { currency_symbol: sym } = useTenantConfig();
  const filtered = (repairs as any[]).filter((r: any) => r.customer_name?.toLowerCase().includes(search.toLowerCase()) || r.repair_no?.includes(search));

  return (
    <>
      <SectionHeader title="Repair Orders" action={
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input className="pl-9 w-48" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <Button onClick={() => { setEditing(null); setForm({ metal_type: "gold", issue_date: today() }); setShowForm(true); }} size="sm"><Plus className="h-4 w-4 mr-1" />New Repair</Button>
        </div>
      } />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["No.", "Customer", "Item / Type", "Karigar", "Charges", "Status", "Expected", ""].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs text-muted-foreground">{r.repair_no}</td>
                <td className="px-4 py-2"><p className="font-medium">{r.customer_name}</p><p className="text-xs text-muted-foreground">{r.customer_phone}</p></td>
                <td className="px-4 py-2"><p className="text-xs">{r.item_description?.slice(0, 30)}</p><p className="text-xs text-muted-foreground">{r.repair_type}</p></td>
                <td className="px-4 py-2">{r.karigar_name || "—"}</td>
                <td className="px-4 py-2 font-semibold">{fmtAmt(sym, r.repair_charges)}</td>
                <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{r.expected_delivery?.slice(0, 10) || "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setForm(r); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button>
                    {r.status === "completed" && (
                      <Button size="sm" variant="outline" className="text-xs h-7 px-2" onClick={() => { setInvoiceRepair(r); setShowInvoice(true); }}>Generate Invoice</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No repairs found</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Repair" : "New Repair Order"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Customer Name *"><Input value={form.customer_name || ""} onChange={e => set("customer_name", e.target.value)} /></FieldRow>
              <FieldRow label="Phone"><Input value={form.customer_phone || ""} onChange={e => set("customer_phone", e.target.value)} /></FieldRow>
            </div>
            <FieldRow label="Item Description"><Textarea value={form.item_description || ""} onChange={e => set("item_description", e.target.value)} rows={2} /></FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Repair Type"><Input value={form.repair_type || ""} onChange={e => set("repair_type", e.target.value)} placeholder="Sizing, Polishing…" /></FieldRow>
              <FieldRow label="Karigar">
                <Select value={form.karigar_id?.toString() || ""} onValueChange={v => set("karigar_id", parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{karigars.map((k: any) => <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Issue Date"><Input type="date" value={form.issue_date || today()} onChange={e => set("issue_date", e.target.value)} /></FieldRow>
              <FieldRow label="Expected Delivery"><Input type="date" value={form.expected_delivery || ""} onChange={e => set("expected_delivery", e.target.value)} /></FieldRow>
              <FieldRow label="Metal Weight (g)"><Input type="number" value={form.metal_weight_gm || ""} onChange={e => set("metal_weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Old Gold Wt (g)"><Input type="number" value={form.old_gold_weight_gm || ""} onChange={e => set("old_gold_weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Repair Charges "><Input type="number" value={form.repair_charges || ""} onChange={e => set("repair_charges", e.target.value)} /></FieldRow>
              <FieldRow label="Advance "><Input type="number" value={form.advance_amount || ""} onChange={e => set("advance_amount", e.target.value)} /></FieldRow>
            </div>
            {editing && <FieldRow label="Status">
              <Select value={form.status || "received"} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["received","in_progress","completed","delivered","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>}
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Invoice Dialog for completed repairs */}
      <Dialog open={showInvoice} onOpenChange={v => { setShowInvoice(v); if (!v) { setInvoiceRepair(null); setGoldAdded(0); } }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Generate Repair Invoice</DialogTitle></DialogHeader>
          {invoiceRepair && (() => {
            const repairCharges = parseFloat(invoiceRepair.repair_charges || 0);
            const goldValue = goldAdded * goldRate;
            const gstOnMaking = repairCharges * 0.05;
            const total = repairCharges + goldValue + gstOnMaking;
            return (
              <div className="space-y-4">
                <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                  <p><span className="text-muted-foreground">Repair No:</span> <strong>{invoiceRepair.repair_no}</strong></p>
                  <p><span className="text-muted-foreground">Customer:</span> {invoiceRepair.customer_name}</p>
                  <p><span className="text-muted-foreground">Item:</span> {invoiceRepair.item_description?.slice(0, 60)}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FieldRow label="Gold Added (gm)">
                    <input type="number" step="0.001" className="w-full rounded-md border px-3 py-1.5 text-sm" value={goldAdded} onChange={e => setGoldAdded(parseFloat(e.target.value) || 0)} />
                  </FieldRow>
                  <FieldRow label="Gold Rate (${sym}/gm)">
                    <input type="number" className="w-full rounded-md border px-3 py-1.5 text-sm" value={goldRate} onChange={e => setGoldRate(parseFloat(e.target.value) || 0)} />
                  </FieldRow>
                </div>
                <div className="rounded-md border p-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span>Repair Charges</span><span>{fmtAmt(sym, repairCharges)}</span></div>
                  <div className="flex justify-between"><span>Gold Addition ({goldAdded} gm × {sym}{goldRate})</span><span>{fmtAmt(sym, goldValue)}</span></div>
                  <div className="flex justify-between"><span>GST on Making (5%)</span><span>{fmtAmt(sym, gstOnMaking)}</span></div>
                  <div className="flex justify-between font-semibold border-t pt-2"><span>Total</span><span>{fmtAmt(sym, total)}</span></div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowInvoice(false)}>Cancel</Button>
                  <Button onClick={() => {
                    apiRequest("POST", `/api/gold-erp/repairs/${invoiceRepair.id}/invoice`, {
                      gold_added_gm: goldAdded,
                      gold_rate: goldRate,
                      repair_charges: repairCharges,
                      gold_value: goldValue,
                      gst_amount: gstOnMaking,
                      total_amount: total,
                    }).then(() => {
                      toast({ title: "Invoice created", description: `${sym}${total.toFixed(2)} for ${invoiceRepair.customer_name}` });
                      setShowInvoice(false); setInvoiceRepair(null); setGoldAdded(0);
                    }).catch((e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }));
                  }}>Save Invoice</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Hallmarking ───────────────────────────────────────────────────────────────
function HallmarkingSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ metal_type: "gold", purity_name: "22K (916)", hallmark_date: today() });
  const { data: records = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/hallmarking"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gold-erp/hallmarking", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/hallmarking"] }); setShowForm(false); setForm({ metal_type: "gold", purity_name: "22K (916)", hallmark_date: today() }); toast({ title: "Hallmark record created — HUID generated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PUT", `/api/gold-erp/hallmarking/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/hallmarking"] }); },
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <>
      <SectionHeader title="Hallmarking Register (BIS / HUID)"
        action={<Button onClick={() => setShowForm(true)} size="sm" data-testid="button-add-hallmark-record"><Plus className="h-4 w-4 mr-1" />Add Record</Button>} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["HUID", "Item", "Metal / Purity", "Gross Wt", "Net Wt", "Assay Centre", "Lot No.", "Status"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr>
          </thead>
          <tbody>
            {(records as any[]).map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 font-mono text-xs font-semibold text-blue-600">{r.huid}</td>
                <td className="px-4 py-2 text-sm">{r.item_description}</td>
                <td className="px-4 py-2 capitalize">{r.metal_type} · {r.purity_name}</td>
                <td className="px-4 py-2">{fmtWt(r.gross_weight_gm)}</td>
                <td className="px-4 py-2">{fmtWt(r.net_weight_gm)}</td>
                <td className="px-4 py-2">{r.assay_centre || "—"}</td>
                <td className="px-4 py-2">{r.lot_no || "—"}</td>
                <td className="px-4 py-2">
                  <Select value={r.status} onValueChange={v => updateMutation.mutate({ id: r.id, data: { ...r, status: v } })}>
                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="submitted">Submitted</SelectItem><SelectItem value="hallmarked">Hallmarked</SelectItem></SelectContent>
                  </Select>
                </td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No hallmarking records yet</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Hallmarking Record</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">HUID is auto-generated by the system.</p>
          <div className="space-y-3">
            <FieldRow label="Item Description"><Textarea value={form.item_description || ""} onChange={e => set("item_description", e.target.value)} rows={2} /></FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => set("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="platinum">Platinum</SelectItem></SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Purity">
                <Select value={form.purity_name || ""} onValueChange={v => set("purity_name", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(PURITIES[form.metal_type] || []).map(p => <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Gross Weight (g)"><Input data-testid="input-hallmark-gross-weight" type="number" value={form.gross_weight_gm || ""} onChange={e => set("gross_weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Net Weight (g)"><Input data-testid="input-hallmark-net-weight" type="number" value={form.net_weight_gm || ""} onChange={e => set("net_weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Assay Centre"><Input data-testid="input-hallmark-assay-centre" value={form.assay_centre || ""} onChange={e => set("assay_centre", e.target.value)} /></FieldRow>
              <FieldRow label="Lot Number"><Input value={form.lot_no || ""} onChange={e => set("lot_no", e.target.value)} /></FieldRow>
              <FieldRow label="Date" className="col-span-2"><Input type="date" value={form.hallmark_date} onChange={e => set("hallmark_date", e.target.value)} /></FieldRow>
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button data-testid="button-save-hallmark-record" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>Save & Generate HUID</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Chit Schemes ──────────────────────────────────────────────────────────────
function ChitSchemesSection() {
  const { toast } = useToast();
  const [showSchemeForm, setShowSchemeForm] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<any>(null);
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showPayForm, setShowPayForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [sf, setSf] = useState<any>({ duration_months: 11, metal_type: "gold", bonus_month_free: 1, max_members: 20 });
  const [mf, setMf] = useState<any>({});
  const [pf, setPf] = useState<any>({ payment_mode: "cash", paid_date: today() });

  const { data: schemes = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/chit-schemes"] });
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/gold-erp/chit-schemes", selectedScheme?.id, "members"],
    queryFn: () => selectedScheme ? fetch(`/api/gold-erp/chit-schemes/${selectedScheme.id}/members`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) : Promise.resolve([]),
    enabled: !!selectedScheme,
  });

  const schemeMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/chit-schemes", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/chit-schemes"] }); queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/stats"] }); setShowSchemeForm(false); setSf({ duration_months: 11, metal_type: "gold", bonus_month_free: 1, max_members: 20 }); toast({ title: "Scheme created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const memberMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", `/api/gold-erp/chit-schemes/${selectedScheme.id}/members`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/chit-schemes", selectedScheme?.id, "members"] }); setShowMemberForm(false); setMf({}); toast({ title: "Member enrolled" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const payMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", `/api/gold-erp/chit-members/${selectedMember.id}/pay`, d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/chit-schemes", selectedScheme?.id, "members"] }); setShowPayForm(false); setPf({ payment_mode: "cash", paid_date: today() }); toast({ title: "Installment recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SectionHeader title="Gold Chit Schemes"
        action={<Button onClick={() => setShowSchemeForm(true)} size="sm" data-testid="button-add-scheme"><Plus className="h-4 w-4 mr-1" />New Scheme</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(schemes as any[]).map((s: any) => (
          <Card key={s.id} className="cursor-pointer hover-elevate" onClick={() => setSelectedScheme(s)} data-testid={`card-scheme-${s.id}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-semibold">{s.name}</p><p className="text-xs text-muted-foreground">{s.scheme_code}</p></div>
                <StatusBadge status={s.status} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Monthly: </span><span className="font-semibold">{fmtAmt(s.monthly_amount)}</span></div>
                <div><span className="text-muted-foreground">Duration: </span>{s.duration_months}+{s.bonus_month_free} mo.</div>
                <div><span className="text-muted-foreground">Members: </span>{s.member_count || 0}/{s.max_members}</div>
                <div><span className="text-muted-foreground capitalize">Metal: </span>{s.metal_type}</div>
              </div>
            </CardContent>
          </Card>
        ))}
        {schemes.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8">No chit schemes yet</p>}
      </div>

      {/* Members dialog */}
      <Dialog open={!!selectedScheme} onOpenChange={v => !v && setSelectedScheme(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{selectedScheme?.name} — Members</DialogTitle></DialogHeader>
          <div className="flex justify-end mb-2">
            <Button size="sm" onClick={() => setShowMemberForm(true)} data-testid="button-enroll-member"><Plus className="h-4 w-4 mr-1" />Enroll Member</Button>
          </div>
          {(members as any[]).map((m: any) => (
            <div key={m.id} className="border rounded-lg p-3 flex items-center justify-between gap-2 mb-2">
              <div>
                <p className="font-medium text-sm">{m.member_name}</p>
                <p className="text-xs text-muted-foreground">{m.phone} · {m.member_code}</p>
                <p className="text-xs">{m.installments_paid} installments paid · {fmtAmt(sym, m.total_paid)} total</p>
              </div>
              <div className="flex gap-2 items-center">
                <StatusBadge status={m.status} />
                <Button size="sm" variant="outline" onClick={() => { setSelectedMember(m); setPf({ payment_mode: "cash", paid_date: today(), amount: selectedScheme?.monthly_amount }); setShowPayForm(true); }}>
                  <IndianRupee className="h-3 w-3 mr-1" />Pay
                </Button>
              </div>
            </div>
          ))}
          {members.length === 0 && <p className="text-center text-muted-foreground py-4">No members enrolled yet</p>}
        </DialogContent>
      </Dialog>

      {/* New scheme form */}
      <Dialog open={showSchemeForm} onOpenChange={setShowSchemeForm}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Chit Scheme</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Scheme Name *"><Input data-testid="input-scheme-name" value={sf.name || ""} onChange={e => setSf((p: any) => ({ ...p, name: e.target.value }))} placeholder="e.g. Diwali Gold Scheme 2026" /></FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Monthly Amount "><Input data-testid="input-scheme-amount" type="number" value={sf.monthly_amount || ""} onChange={e => setSf((p: any) => ({ ...p, monthly_amount: e.target.value }))} /></FieldRow>
              <FieldRow label="Metal">
                <Select value={sf.metal_type || "gold"} onValueChange={v => setSf((p: any) => ({ ...p, metal_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem></SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Paid Months"><Input data-testid="input-scheme-duration" type="number" value={sf.duration_months || 11} onChange={e => setSf((p: any) => ({ ...p, duration_months: e.target.value }))} /></FieldRow>
              <FieldRow label="Bonus Months"><Input data-testid="input-scheme-bonus" type="number" value={sf.bonus_month_free || 1} onChange={e => setSf((p: any) => ({ ...p, bonus_month_free: e.target.value }))} /></FieldRow>
              <FieldRow label="Max Members"><Input data-testid="input-scheme-max" type="number" value={sf.max_members || 20} onChange={e => setSf((p: any) => ({ ...p, max_members: e.target.value }))} /></FieldRow>
              <FieldRow label="Start Date"><Input data-testid="input-scheme-start-date" type="date" value={sf.start_date || ""} onChange={e => setSf((p: any) => ({ ...p, start_date: e.target.value }))} /></FieldRow>
            </div>
            <FieldRow label="Notes"><Textarea value={sf.notes || ""} onChange={e => setSf((p: any) => ({ ...p, notes: e.target.value }))} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowSchemeForm(false)} data-testid="button-scheme-cancel">Cancel</Button>
              <Button onClick={() => schemeMut.mutate(sf)} disabled={schemeMut.isPending} data-testid="button-save-scheme">Create Scheme</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enroll member */}
      <Dialog open={showMemberForm} onOpenChange={setShowMemberForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Enroll Member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Name *"><Input data-testid="input-member-name" value={mf.member_name || ""} onChange={e => setMf((p: any) => ({ ...p, member_name: e.target.value }))} /></FieldRow>
            <FieldRow label="Phone"><Input data-testid="input-member-phone" value={mf.phone || ""} onChange={e => setMf((p: any) => ({ ...p, phone: e.target.value }))} /></FieldRow>
            <FieldRow label="Address"><Textarea value={mf.address || ""} onChange={e => setMf((p: any) => ({ ...p, address: e.target.value }))} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowMemberForm(false)} data-testid="button-member-cancel">Cancel</Button>
              <Button onClick={() => memberMut.mutate(mf)} disabled={memberMut.isPending} data-testid="button-save-member">Enroll</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pay installment */}
      <Dialog open={showPayForm} onOpenChange={setShowPayForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Record Installment — {selectedMember?.member_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Amount "><Input type="number" value={pf.amount || ""} onChange={e => setPf((p: any) => ({ ...p, amount: e.target.value }))} /></FieldRow>
            <FieldRow label="Payment Mode">
              <Select value={pf.payment_mode} onValueChange={v => setPf((p: any) => ({ ...p, payment_mode: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="bank_transfer">Bank Transfer</SelectItem><SelectItem value="card">Card</SelectItem></SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Date"><Input type="date" value={pf.paid_date} onChange={e => setPf((p: any) => ({ ...p, paid_date: e.target.value }))} /></FieldRow>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowPayForm(false)}>Cancel</Button>
              <Button onClick={() => payMut.mutate(pf)} disabled={payMut.isPending}>Record Payment</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Analytics Section ─────────────────────────────────────────────────────────
function AnalyticsSection() {
  const { data: overview } = useQuery<any>({ queryKey: ["/api/gold-erp/analytics/overview"] });
  const { data: wastage = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/analytics/wastage"] });
  const { data: karigarOutput = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/analytics/karigar-output"] });
  const { data: makingCharges = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/analytics/making-charges"] });
  const { data: stockValue } = useQuery<any>({ queryKey: ["/api/gold-erp/analytics/stock-value"] });

  const totalStockVal = (stockValue?.itemStock || []).reduce((s: number, i: any) => s + Number(i.total_value || 0), 0)
    + (stockValue?.bullionStock || []).reduce((s: number, i: any) => s + Number(i.value || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">JW Analytics</h2>
        <p className="text-sm text-muted-foreground">Business intelligence for your jewellery operations</p>
      </div>

      {/* Overview KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Items", val: overview?.items?.cnt || 0, sub: `${fmtWt(overview?.items?.total_stock)} total stock` },
          { label: "Live Stock Value", val: fmtAmt(sym, totalStockVal), sub: "Bullion + Finished goods" },
          { label: "Active Karigars", val: overview?.karigars?.cnt || 0, sub: "Currently working" },
          { label: "Open Repairs", val: overview?.repairs?.cnt || 0, sub: `Charges: ${fmtAmt(sym, overview?.repairs?.total_charges)}` },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold mt-1">{k.val}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wastage by Stage */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Wastage by Production Stage</CardTitle></CardHeader>
          <CardContent>
            {wastage.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No wastage data yet</p>}
            <div className="space-y-3">
              {wastage.map((w: any) => (
                <div key={w.stage_name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{w.stage_name}</span>
                    <span className="text-muted-foreground">{fmtWt(w.total_wastage)} ({w.avg_wastage_pct}%)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5">
                    <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min(Number(w.avg_wastage_pct) * 10, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Karigar Output */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Karigar Output</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50"><tr>{["Karigar", "Orders", "JW Orders", "Issued (g)", "Received (g)"].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody>
                  {karigarOutput.slice(0, 8).map((k: any) => (
                    <tr key={k.karigar_name} className="border-t">
                      <td className="px-3 py-1.5 font-medium">{k.karigar_name}</td>
                      <td className="px-3 py-1.5">{k.total_orders}</td>
                      <td className="px-3 py-1.5">{k.jobwork_count}</td>
                      <td className="px-3 py-1.5">{fmtWt(k.jw_issued_gm)}</td>
                      <td className="px-3 py-1.5">{fmtWt(k.jw_received_gm)}</td>
                    </tr>
                  ))}
                  {karigarOutput.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">No karigar data</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Making Charge Trends */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Making Charge Trends (Monthly)</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50"><tr>{["Month", "Estimates", "Making Charges", "Revenue", "Wastage %"].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                <tbody>
                  {makingCharges.slice(0, 6).map((m: any) => (
                    <tr key={m.month} className="border-t">
                      <td className="px-3 py-1.5">{new Date(m.month).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })}</td>
                      <td className="px-3 py-1.5">{m.estimate_count}</td>
                      <td className="px-3 py-1.5">{fmtAmt(sym, m.total_making)}</td>
                      <td className="px-3 py-1.5">{fmtAmt(sym, m.total_revenue)}</td>
                      <td className="px-3 py-1.5">{m.avg_wastage_pct}%</td>
                    </tr>
                  ))}
                  {makingCharges.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">No estimate data yet</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Live Stock Value */}
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Live Stock Value Breakdown</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Bullion Stock</p>
              {(stockValue?.bullionStock || []).map((b: any) => (
                <div key={`${b.metal_type}-${b.purity_name}`} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span>{b.metal_type} — {b.purity_name}</span>
                  <span className="font-medium">{fmtWt(b.stock_grams)} · {fmtAmt(sym, b.value)}</span>
                </div>
              ))}
              {!(stockValue?.bullionStock?.length) && <p className="text-xs text-muted-foreground">No bullion stock</p>}
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Item Stock</p>
              {(stockValue?.itemStock || []).map((b: any) => (
                <div key={`${b.metal_type}-${b.purity_name}`} className="flex justify-between text-sm py-1 border-b last:border-0">
                  <span>{b.metal_type} — {b.purity_name}</span>
                  <span className="font-medium">{fmtWt(b.total_gm)} · {fmtAmt(sym, b.total_value)}</span>
                </div>
              ))}
              {!(stockValue?.itemStock?.length) && <p className="text-xs text-muted-foreground">No item stock</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Metal Ledger Section ───────────────────────────────────────────────────────
function MetalLedgerSection() {
  const { toast } = useToast();
  const [view, setView] = useState<"balances" | "transactions">("balances");
  const [showForm, setShowForm] = useState(false);
  const [searchCust, setSearchCust] = useState("");
  const [form, setForm] = useState<any>({ metal_type: "gold", purity_name: "22K (916)", transaction_type: "inward", txn_date: today() });

  const { data: txns = [], isLoading: txnLoading } = useQuery<any[]>({ queryKey: ["/api/gold-erp/metal-ledger"] });
  const { data: balances = [], isLoading: balLoading } = useQuery<any[]>({ queryKey: ["/api/gold-erp/metal-ledger/balances"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/gold-erp/metal-ledger", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/metal-ledger"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/metal-ledger/balances"] });
      setShowForm(false); setForm({ metal_type: "gold", purity_name: "22K (916)", transaction_type: "inward", txn_date: today() });
      toast({ title: "Transaction recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));
  const { currency_symbol: sym } = useTenantConfig();
  const filteredBalances = balances.filter((b: any) => b.customer_name?.toLowerCase().includes(searchCust.toLowerCase()));
  const filteredTxns = txns.filter((t: any) => t.customer_name?.toLowerCase().includes(searchCust.toLowerCase()));
  const PURITIES_FLAT = Object.values(PURITIES).flat().map(p => p.name);

  const TXN_TYPES = [
    { value: "inward", label: "Inward (Customer Deposits)" },
    { value: "outward", label: "Outward (Metal Used)" },
    { value: "purchase", label: "Purchase" },
    { value: "sale", label: "Sale" },
    { value: "repair_issue", label: "Repair Issue" },
    { value: "repair_return", label: "Repair Return" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="text-lg font-bold">Customer Metal Ledger</h2>
          <p className="text-sm text-muted-foreground">Track gold/silver balances held for each customer</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <button onClick={() => setView("balances")} className={`px-3 py-1.5 text-sm ${view === "balances" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Balances</button>
            <button onClick={() => setView("transactions")} className={`px-3 py-1.5 text-sm ${view === "transactions" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Transactions</button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 w-44" placeholder="Search customer…" value={searchCust} onChange={e => setSearchCust(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => setShowForm(true)} data-testid="button-add-metal-txn"><Plus className="h-4 w-4 mr-1" />Add Transaction</Button>
        </div>
      </div>

      {view === "balances" ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Customer", "Phone", "Metal", "Purity", "Balance (g)", "Last Transaction"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {filteredBalances.map((b: any, i: number) => (
                <tr key={i} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{b.customer_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{b.customer_phone || "—"}</td>
                  <td className="px-4 py-2 capitalize">{b.metal_type}</td>
                  <td className="px-4 py-2">{b.purity_name}</td>
                  <td className="px-4 py-2 font-semibold text-yellow-700 dark:text-yellow-400">{fmtWt(b.balance_gm)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{b.last_txn_date}</td>
                </tr>
              ))}
              {filteredBalances.length === 0 && !balLoading && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No customer balances</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Date", "Customer", "Type", "Metal", "Purity", "Weight (g)", "Rate/g", "Amount", "Ref"].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {filteredTxns.map((t: any) => (
                <tr key={t.id} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-1.5">{t.txn_date}</td>
                  <td className="px-3 py-1.5 font-medium">{t.customer_name}</td>
                  <td className="px-3 py-1.5"><Badge className="text-xs capitalize">{t.transaction_type?.replace("_", " ")}</Badge></td>
                  <td className="px-3 py-1.5 capitalize">{t.metal_type}</td>
                  <td className="px-3 py-1.5">{t.purity_name}</td>
                  <td className="px-3 py-1.5 font-medium">{fmtWt(t.weight_gm)}</td>
                  <td className="px-3 py-1.5">{t.rate_per_gram ? fmtAmt(sym, t.rate_per_gram) : "—"}</td>
                  <td className="px-3 py-1.5">{t.amount ? fmtAmt(sym, t.amount) : "—"}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{t.reference_no || "—"}</td>
                </tr>
              ))}
              {filteredTxns.length === 0 && !txnLoading && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No transactions yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Metal Ledger Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Customer Name *</Label><Input value={form.customer_name || ""} onChange={e => set("customer_name", e.target.value)} data-testid="input-ledger-customer" /></div>
              <div className="space-y-1"><Label className="text-xs">Phone</Label><Input value={form.customer_phone || ""} onChange={e => set("customer_phone", e.target.value)} /></div>
              <div className="space-y-1">
                <Label className="text-xs">Metal Type</Label>
                <Select value={form.metal_type} onValueChange={v => set("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="platinum">Platinum</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Purity</Label>
                <Select value={form.purity_name} onValueChange={v => set("purity_name", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PURITIES_FLAT.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Transaction Type *</Label>
                <Select value={form.transaction_type} onValueChange={v => set("transaction_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TXN_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" value={form.txn_date} onChange={e => set("txn_date", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Weight (grams) *</Label><Input type="number" step="0.001" value={form.weight_gm || ""} onChange={e => set("weight_gm", e.target.value)} data-testid="input-ledger-weight" /></div>
              <div className="space-y-1"><Label className="text-xs">Rate per Gram (${sym})</Label><Input type="number" value={form.rate_per_gram || ""} onChange={e => set("rate_per_gram", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Reference No</Label><Input value={form.reference_no || ""} onChange={e => set("reference_no", e.target.value)} /></div>
              <div className="space-y-1">
                <Label className="text-xs">Reference Type</Label>
                <Select value={form.reference_type || ""} onValueChange={v => set("reference_type", v)}>
                  <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="estimate">Estimate</SelectItem><SelectItem value="repair">Repair</SelectItem><SelectItem value="jobwork">Jobwork</SelectItem><SelectItem value="bullion">Bullion</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Notes</Label><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} data-testid="button-save-metal-ledger">Save Entry</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Nav config ────────────────────────────────────────────────────────────────
const NAV_SECTIONS = [
  {
    group: "Core",
    items: [
      { key: "overview",      label: "Overview",              icon: LayoutDashboard },
      { key: "rates",         label: "Metal Rates",           icon: TrendingUp },
      { key: "karigar",       label: "Karigar",               icon: Users },
      { key: "items",         label: "Jewellery Items",       icon: Package },
      { key: "estimates",     label: "Estimates",             icon: IndianRupee },
      { key: "metal-ledger",  label: "Metal Ledger",          icon: BookOpen },
      // JW Analytics is accessible from Overview quick links & directly via ?section=analytics
      // Kept in SECTION_MAP but removed from top-level nav to reduce dashboard clutter
    ],
  },
  {
    group: "Production",
    items: [
      { key: "production",         label: "Production",                     icon: Factory },
      { key: "jobwork",            label: "Karigar Job Orders (Internal)",  icon: Layers },
      { key: "sketch",             label: "Sketch / Design",                icon: Camera },
      { key: "cad",                label: "CAD Process",                    icon: Crosshair },
      { key: "cam",                label: "CAM / Milling",                  icon: Layers },
      { key: "karigar-attendance", label: "Karigar Attendance",             icon: Users },
      { key: "ghat",               label: "Ghat Settlement",                icon: Coins },
      { key: "settlement",         label: "Karigar Settlement",             icon: IndianRupee },
      { key: "finalize",           label: "Job Finalize",                   icon: CheckCircle },
      { key: "karigar-ledger",     label: "Karigar Ledger",                 icon: BookMarked },
      { key: "repairs",            label: "Repairs",                        icon: Wrench },
    ],
  },
  {
    group: "Wholesale & B2B",
    items: [
      { key: "wholesale-b2b-orders", label: "B2B Order Booking",               icon: ClipboardList },
      { key: "wholesale-jobwork",    label: "Customer Jobwork (Customer's Gold)", icon: Layers },
      { key: "hallmarking-batches",  label: "Hallmarking — Batch Submission",   icon: Award },
    ],
  },
  {
    group: "Retail",
    items: [
      { key: "jewellery-pos",      label: "Jewellery POS",               icon: ShoppingCart },
      { key: "counter-bookings",   label: "Counter Bookings",            icon: ClipboardList },
      { key: "customer-approvals", label: "Approvals",                   icon: CheckCircle },
      { key: "buyback",            label: "Old Gold Buy-back",           icon: RotateCcw },
      { key: "physical-audit",     label: "Physical Audit",              icon: ShoppingBag },
      { key: "loyalty",            label: "Loyalty & Rewards",           icon: Gift },
      { key: "promotions",         label: "Promotions",                  icon: Tag },
      { key: "refining",           label: "Refining",                    icon: Zap },
      { key: "pos-old-gold",       label: "Old Gold Purchase (No Sale)", icon: ShoppingCart },
      { key: "hallmarking",        label: "Hallmarking — HUID Records",  icon: CheckCircle },
    ],
  },
  {
    group: "Bullion & Vault",
    items: [
      { key: "bullion",              label: "Bullion Stock",        icon: BarChart3 },
      { key: "bullion-rate-cuts",    label: "Rate Cut Invoices",    icon: TrendingUp },
      { key: "vault-movement",       label: "Vault Movement",       icon: Truck },
      { key: "bullion-bookings",     label: "Bullion Bookings",     icon: CreditCard },
      { key: "vault-audit",          label: "Vault Audit",          icon: Shield },
    ],
  },
  {
    group: "Chit Schemes",
    items: [
      { key: "chit",                      label: "Chit Schemes",         icon: Shield },
      { key: "chit-collection-register",  label: "Collection Register",  icon: ClipboardList },
      { key: "chit-maturity",             label: "Maturity",             icon: CheckCircle },
      { key: "chit-defaulters",           label: "Defaulters",           icon: AlertTriangle },
      { key: "chit-redemptions",          label: "Redemptions",          icon: Gift },
    ],
  },
  {
    group: "Digital & OMS",
    items: [
      { key: "ecatalog",          label: "E-Catalog",         icon: BookOpen },
      { key: "oms-orders",        label: "OMS Orders",        icon: ClipboardList },
      { key: "oms-notify",        label: "OMS Notifications", icon: Repeat2 },
      { key: "ecommerce",         label: "E-Commerce Store",  icon: Globe },
    ],
  },
  {
    group: "RFID",
    items: [
      { key: "rfid",              label: "RFID Management",   icon: Wifi },
    ],
  },
  {
    group: "Finance",
    items: [
      { key: "metal-finance",     label: "Metal Finance",     icon: Coins },
    ],
  },
  {
    group: "Integrations",
    items: [
      { key: "integrations-config", label: "Integrations",   icon: Settings2 },
    ],
  },
];

const SECTION_MAP: Record<string, React.ReactNode> = {
  overview:             <OverviewSection />,
  rates:                <MetalRatesSection />,
  karigar:              <KarigarSection />,
  items:                <ItemMasterSection />,
  estimates:            <EstimatesSection />,
  production:           <ProductionSection />,
  jobwork:              <JobworkSection />,
  bullion:              <BullionSection />,
  repairs:              <RepairsSection />,
  hallmarking:          <HallmarkingSection />,
  chit:                 <ChitSchemesSection />,
  "metal-ledger":       <MetalLedgerSection />,
  analytics:            <AnalyticsSection />,
  // Production Extensions
  sketch:               <SketchSection />,
  cad:                  <CADSection />,
  cam:                  <CAMSection />,
  ghat:                 <GhatSection />,
  settlement:           <SettlementSection />,
  finalize:             <JobFinalizeSection />,
  "karigar-ledger":     <KarigarLedgerSection />,
  "karigar-attendance": <KarigarAttendanceSection />,
  // Wholesale & B2B
  "wholesale-b2b-orders": <WholesaleB2BOrdersSection />,
  "wholesale-jobwork":  <WholesaleJobworkSection />,
  "hallmarking-batches": <HallmarkingBatchesSection />,
  // Retail
  "jewellery-pos":      <JewelleryPOSSection />,
  "counter-bookings":   <CounterBookingsSection />,
  "customer-approvals": <CustomerApprovalsSection />,
  buyback:              <BuybackSection />,
  "physical-audit":     <PhysicalAuditSection />,
  loyalty:              <LoyaltySection />,
  promotions:           <PromotionsSection />,
  refining:             <RefiningSection />,
  "pos-old-gold":       <PosOldGoldSection />,
  // Bullion & Vault
  "bullion-rate-cuts":  <BullionRateCutsSection />,
  "vault-movement":     <BullionVaultMovementSection />,
  "bullion-bookings":   <BullionBookingsSection />,
  "vault-audit":        <VaultAuditSection />,
  // Chit Extensions
  "chit-collection-register": <ChitCollectionRegisterSection />,
  "chit-maturity":      <ChitMaturitySection />,
  "chit-defaulters":    <ChitDefaultersSection />,
  "chit-redemptions":   <ChitRedemptionsSection />,
  // Digital & OMS
  ecatalog:             <ECatalogSection />,
  "oms-orders":         <OMSOrdersSection />,
  "oms-notify":         <OMSNotifyConfigSection />,
  ecommerce:            <ECommerceSection />,
  // RFID
  rfid:                 <RFIDSection />,
  // Finance
  "metal-finance":      <MetalFinanceSection />,
  // Integrations
  "integrations-config": <IntegrationConfigsSection />,
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function GoldErpPage({ activeSection }: { activeSection?: string }) {
  const section = activeSection && SECTION_MAP[activeSection] ? activeSection : "overview";
  return (
    <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6">
      {SECTION_MAP[section]}
    </div>
  );
}
