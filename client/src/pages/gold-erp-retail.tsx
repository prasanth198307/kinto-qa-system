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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
import { Plus, Pencil, Star, CheckCircle, AlertTriangle, ShoppingBag, RotateCcw, Search } from "lucide-react";

const fmt = (n: any, d = 2) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: d });
const fmtWt = (n: any) => `${fmt(n, 3)} g`;
// fmtAmt is now defined per-component using useTenantConfig
const today = () => new Date().toISOString().slice(0, 10);

function FL({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function SH({ title, action }: any) {
  return (
    <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
  );
}
function SBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    booked: "bg-blue-100 text-blue-700", open: "bg-blue-100 text-blue-700",
    in_progress: "bg-yellow-100 text-yellow-700", completed: "bg-green-100 text-green-700",
    delivered: "bg-emerald-100 text-emerald-700", cancelled: "bg-red-100 text-red-700",
    pending: "bg-yellow-100 text-yellow-700", accepted: "bg-green-100 text-green-700",
    sent: "bg-blue-100 text-blue-700", received: "bg-green-100 text-green-700",
    active: "bg-green-100 text-green-700",
  };
  return <Badge className={`text-xs capitalize ${cls[status] || "bg-muted text-muted-foreground"}`}>{status?.replace(/_/g, " ")}</Badge>;
}

// ── Counter Bookings ───────────────────────────────────────────────────────────
export function CounterBookingsSection() {
  const { toast } = useToast();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const fmtAmt = (n: any) => fmtCur(n, tenantConfig);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<any>({ booking_type: "custom_order", urgency: "normal" });
  const { data: bookings = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/counter-bookings"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => editing
      ? apiRequest("PUT", `/api/gold-erp/counter-bookings/${editing.id}`, d)
      : apiRequest("POST", "/api/gold-erp/counter-bookings", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/counter-bookings"] });
      setShowForm(false); setEditing(null); setForm({ booking_type: "custom_order", urgency: "normal" });
      toast({ title: "Counter booking saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = (bookings as any[]).filter(b =>
    b.customer_name?.toLowerCase().includes(search.toLowerCase()) || b.booking_no?.includes(search));

  return (
    <>
      <SH title="Counter Bookings" action={
        <div className="flex items-center gap-2">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 w-44" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <Button size="sm" onClick={() => { setEditing(null); setForm({ booking_type: "custom_order", urgency: "normal" }); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" />New Booking
          </Button>
        </div>
      } />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["No.", "Customer", "Type", "Urgency", "Advance", "Expected", "Status", ""].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((b: any) => (
              <tr key={b.id} className={`border-t hover:bg-muted/30 ${b.urgency === "urgent" ? "bg-red-50/50 dark:bg-red-900/5" : ""}`}>
                <td className="px-4 py-2 text-xs text-muted-foreground">{b.booking_no}</td>
                <td className="px-4 py-2"><p className="font-medium">{b.customer_name}</p><p className="text-xs text-muted-foreground">{b.customer_phone}</p></td>
                <td className="px-4 py-2 text-xs capitalize">{b.booking_type?.replace(/_/g, " ")}</td>
                <td className="px-4 py-2">{b.urgency === "urgent" ? <Badge className="bg-red-100 text-red-700 text-xs">Urgent</Badge> : <span className="text-xs capitalize">{b.urgency}</span>}</td>
                <td className="px-4 py-2">{fmtAmt(b.advance_collected)}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{b.expected_ready || "—"}</td>
                <td className="px-4 py-2"><SBadge status={b.status} /></td>
                <td className="px-4 py-2"><Button size="icon" variant="ghost" onClick={() => { setEditing(b); setForm(b); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No bookings found</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Booking" : "New Counter Booking"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FL label="Customer Name *"><Input value={form.customer_name || ""} onChange={e => set("customer_name", e.target.value)} /></FL>
              <FL label="Phone *"><Input value={form.customer_phone || ""} onChange={e => set("customer_phone", e.target.value)} /></FL>
              <FL label="Booking Type">
                <Select value={form.booking_type || "custom_order"} onValueChange={v => set("booking_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="custom_order">Custom Order</SelectItem><SelectItem value="repair">Repair</SelectItem><SelectItem value="resize">Resize</SelectItem><SelectItem value="engraving">Engraving</SelectItem><SelectItem value="approval">Approval</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Urgency">
                <Select value={form.urgency || "normal"} onValueChange={v => set("urgency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="priority">Priority</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Item Weight (gm)"><Input type="number" step="0.001" placeholder="0.000" value={form.item_weight || ""} onChange={e => set("item_weight", e.target.value)} /></FL>
              <FL label={`Today's Rate (${sym}/gm)`}><Input type="number" step="0.01" placeholder="0.00" value={form.gold_rate_today || ""} onChange={e => set("gold_rate_today", e.target.value)} /></FL>
              <FL label={`Advance Collected (${sym})`}><Input type="number" value={form.advance_collected || ""} onChange={e => set("advance_collected", e.target.value)} /></FL>
              <FL label="Expected Ready"><Input type="date" value={form.expected_ready || ""} onChange={e => set("expected_ready", e.target.value)} /></FL>
              <FL label="Counter Staff"><Input value={form.counter_staff || ""} onChange={e => set("counter_staff", e.target.value)} /></FL>
              <FL label="Design Ref"><Input value={form.design_ref || ""} onChange={e => set("design_ref", e.target.value)} /></FL>
            </div>
            <FL label="Item Description"><Textarea value={form.item_description || ""} onChange={e => set("item_description", e.target.value)} rows={2} /></FL>
            <FL label="Description / Notes"><Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={2} /></FL>
            {editing && <FL label="Status">
              <Select value={form.status || "booked"} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["booked","assigned","in_progress","ready","delivered","cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FL>}
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Customer Approvals ────────────────────────────────────────────────────────
export function CustomerApprovalsSection() {
  const { toast } = useToast();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const fmtAmt = (n: any) => fmtCur(n, tenantConfig);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ issue_date: today() });
  const { data: approvals = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/customer-approvals"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => editing
      ? apiRequest("PUT", `/api/gold-erp/customer-approvals/${editing.id}`, d)
      : apiRequest("POST", "/api/gold-erp/customer-approvals", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/customer-approvals"] });
      setShowForm(false); setEditing(null); setForm({ issue_date: today() });
      toast({ title: "Approval record saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const totalValue = (approvals as any[]).filter(a => a.status === "open").reduce((s, a) => s + Number(a.total_value || 0), 0);

  return (
    <>
      <SH title="Customer Approvals (On-Approval Sales)" action={
        <Button size="sm" data-testid="button-new-approval" onClick={() => { setEditing(null); setForm({ issue_date: today() }); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />New Approval
        </Button>
      } />
      <div className="flex gap-3 mb-4">
        <Card className="flex-1"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Open Approvals</p><p className="text-2xl font-bold">{(approvals as any[]).filter(a => a.status === "open").length}</p></CardContent></Card>
        <Card className="flex-1"><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Value at Risk</p><p className="text-2xl font-bold">{fmtAmt(totalValue)}</p></CardContent></Card>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["No.", "Customer", "Issue Date", "Expected Return", "Total Value", "Deposit", "Status", ""].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {(approvals as any[]).map((a: any) => (
              <tr key={a.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs text-muted-foreground">{a.approval_no}</td>
                <td className="px-4 py-2"><p className="font-medium">{a.customer_name}</p><p className="text-xs text-muted-foreground">{a.customer_phone}</p></td>
                <td className="px-4 py-2 text-xs">{a.issue_date}</td>
                <td className="px-4 py-2 text-xs">{a.expected_return || "—"}</td>
                <td className="px-4 py-2 font-semibold">{fmtAmt(a.total_value)}</td>
                <td className="px-4 py-2">{a.deposit_collected ? <><CheckCircle className="h-3 w-3 text-green-500 inline" /> {fmtAmt(a.deposit_amount)}</> : "—"}</td>
                <td className="px-4 py-2"><SBadge status={a.status} /></td>
                <td className="px-4 py-2"><Button size="icon" variant="ghost" onClick={() => { setEditing(a); setForm(a); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {approvals.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No approval records</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Approval" : "New Customer Approval"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FL label="Customer Name *"><Input data-testid="input-approval-customer" value={form.customer_name || ""} onChange={e => set("customer_name", e.target.value)} /></FL>
              <FL label="Phone"><Input data-testid="input-approval-phone" value={form.customer_phone || ""} onChange={e => set("customer_phone", e.target.value)} /></FL>
              <FL label="Issue Date"><Input type="date" value={form.issue_date || today()} onChange={e => set("issue_date", e.target.value)} /></FL>
              <FL label="Expected Return"><Input type="date" value={form.expected_return || ""} onChange={e => set("expected_return", e.target.value)} /></FL>
              <FL label={`Total Value (${sym})`}><Input data-testid="input-approval-value" type="number" value={form.total_value || ""} onChange={e => set("total_value", e.target.value)} /></FL>
              <FL label={`Deposit Amount (${sym})`}><Input data-testid="input-approval-deposit" type="number" value={form.deposit_amount || ""} onChange={e => set("deposit_amount", e.target.value)} /></FL>
              <FL label="Counter Staff"><Input value={form.counter_staff || ""} onChange={e => set("counter_staff", e.target.value)} /></FL>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.deposit_collected} onChange={e => set("deposit_collected", e.target.checked ? 1 : 0)} id="dep" />
              <Label htmlFor="dep" className="text-sm">Deposit Collected</Label>
            </div>
            {editing && <>
              <FL label="Status">
                <Select value={form.status || "open"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["open","partially_returned","fully_returned","converted_to_sale","lost"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </FL>
              <FL label="Return Date"><Input type="date" value={form.return_date || ""} onChange={e => set("return_date", e.target.value)} /></FL>
            </>}
            <FL label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FL>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button data-testid="button-save-approval" onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Buy-back ──────────────────────────────────────────────────────────────────
export function BuybackSection() {
  const { toast } = useToast();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const fmtAmt = (n: any) => fmtCur(n, tenantConfig);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ metal_type: "gold", buyback_rate_pct: 95 });
  const { data: records = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/buyback"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => editing
      ? apiRequest("PUT", `/api/gold-erp/buyback/${editing.id}`, d)
      : apiRequest("POST", "/api/gold-erp/buyback", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/buyback"] });
      setShowForm(false); setEditing(null); setForm({ metal_type: "gold", buyback_rate_pct: 95 });
      toast({ title: "Buy-back recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const netWeight = Number(form.gross_weight_gm || 0) - Number(form.stone_weight_gm || 0);
  const buybackValue = netWeight * Number(form.gold_rate_today || 0) * Number(form.buyback_rate_pct || 95) / 100;

  return (
    <>
      <SH title="Old Gold Buy-back" action={
        <Button size="sm" onClick={() => { setEditing(null); setForm({ metal_type: "gold", buyback_rate_pct: 95 }); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />New Buy-back
        </Button>
      } />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["No.", "Customer", "Item", "Net Wt", "Purity%", "Rate/g", "Rate%", "Buyback Value", "Accepted"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {(records as any[]).map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs text-muted-foreground">{r.buyback_no}</td>
                <td className="px-4 py-2"><p className="font-medium">{r.customer_name}</p><p className="text-xs text-muted-foreground">{r.customer_phone}</p></td>
                <td className="px-4 py-2 text-xs">{r.item_description?.slice(0, 30)}</td>
                <td className="px-4 py-2">{fmtWt(r.net_weight_gm)}</td>
                <td className="px-4 py-2">{r.purity_tested_pct ? `${r.purity_tested_pct}%` : "—"}</td>
                <td className="px-4 py-2">{fmtAmt(r.gold_rate_today)}</td>
                <td className="px-4 py-2">{r.buyback_rate_pct}%</td>
                <td className="px-4 py-2 font-semibold">{fmtAmt(r.buyback_value)}</td>
                <td className="px-4 py-2">{r.customer_accepted ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Button size="sm" variant="outline" onClick={() => saveMut.mutate({ ...r, customer_accepted: 1 })}>Accept</Button>}</td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No buy-back records</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Old Gold Buy-back</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FL label="Customer Name"><Input value={form.customer_name || ""} onChange={e => set("customer_name", e.target.value)} /></FL>
              <FL label="Phone"><Input value={form.customer_phone || ""} onChange={e => set("customer_phone", e.target.value)} /></FL>
              <FL label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => set("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="platinum">Platinum</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Purity Tested %"><Input type="number" value={form.purity_tested_pct || ""} onChange={e => set("purity_tested_pct", e.target.value)} /></FL>
              <FL label="Gross Weight (g)"><Input type="number" value={form.gross_weight_gm || ""} onChange={e => set("gross_weight_gm", e.target.value)} /></FL>
              <FL label="Stone Weight (g)"><Input type="number" value={form.stone_weight_gm || 0} onChange={e => set("stone_weight_gm", e.target.value)} /></FL>
              <FL label={`Today's Rate (${sym}/g)`}><Input type="number" value={form.gold_rate_today || ""} onChange={e => set("gold_rate_today", e.target.value)} /></FL>
              <FL label="Buyback Rate %"><Input type="number" value={form.buyback_rate_pct || 95} onChange={e => set("buyback_rate_pct", e.target.value)} /></FL>
              <FL label="Payment Mode">
                <Select value={form.payment_mode || "cash"} onValueChange={v => set("payment_mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="cash">Cash</SelectItem><SelectItem value="upi">UPI</SelectItem><SelectItem value="credit_note">Credit Note</SelectItem></SelectContent>
                </Select>
              </FL>
            </div>
            {(form.gross_weight_gm && form.gold_rate_today) && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Net Weight</span><span>{fmtWt(netWeight)}</span></div>
                <div className="flex justify-between font-bold"><span>Buyback Value</span><span className="text-amber-700">{fmtAmt(buybackValue)}</span></div>
              </div>
            )}
            <FL label="Item Description"><Textarea value={form.item_description || ""} onChange={e => set("item_description", e.target.value)} rows={2} /></FL>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Record Buy-back</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Physical Inventory Audit ───────────────────────────────────────────────────
export function PhysicalAuditSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ audit_type: "full", audit_date: today() });
  const { data: audits = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/physical-audits"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => editing
      ? apiRequest("PUT", `/api/gold-erp/physical-audits/${editing.id}`, d)
      : apiRequest("POST", "/api/gold-erp/physical-audits", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/physical-audits"] });
      setShowForm(false); setEditing(null); setForm({ audit_type: "full", audit_date: today() });
      toast({ title: "Audit saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SH title="Physical Inventory Audit" action={
        <Button size="sm" data-testid="button-start-physical-audit" onClick={() => { setEditing(null); setForm({ audit_type: "full", audit_date: today() }); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />Start Audit
        </Button>
      } />
      <div className="space-y-3">
        {(audits as any[]).map((a: any) => (
          <Card key={a.id} className={a.discrepancy_gm && Number(a.discrepancy_gm) !== 0 ? "border-red-200 dark:border-red-800" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold">{a.audit_no} <span className="text-xs text-muted-foreground ml-2">{a.audit_date}</span></p>
                  <p className="text-xs text-muted-foreground">{a.auditor_name} · {a.branch} · {a.audit_type}</p>
                </div>
                <SBadge status={a.status} />
              </div>
              {a.status !== "in_progress" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                  <div><span className="text-muted-foreground">System Pieces: </span>{a.total_system_pieces}</div>
                  <div><span className="text-muted-foreground">Physical Pieces: </span>{a.total_physical_pieces}</div>
                  <div><span className="text-muted-foreground">System (g): </span>{fmtWt(a.total_system_gm)}</div>
                  <div><span className="text-muted-foreground">Physical (g): </span>{fmtWt(a.total_physical_gm)}</div>
                  {a.discrepancy_gm && <div className={`col-span-2 font-semibold ${Number(a.discrepancy_gm) < 0 ? "text-red-600" : "text-green-600"}`}>
                    Discrepancy: {Number(a.discrepancy_gm) > 0 ? "+" : ""}{fmtWt(a.discrepancy_gm)}
                  </div>}
                </div>
              )}
              <Button size="sm" variant="outline" className="mt-3" data-testid={`button-edit-physical-audit-${a.id}`} onClick={() => { setEditing(a); setForm(a); setShowForm(true); }}>
                <Pencil className="h-3 w-3 mr-1" />Update Audit
              </Button>
            </CardContent>
          </Card>
        ))}
        {audits.length === 0 && <p className="text-center text-muted-foreground py-8">No audits yet</p>}
      </div>
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Audit" : "Start Physical Audit"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {!editing && <>
                <FL label="Audit Date"><Input type="date" value={form.audit_date || today()} onChange={e => set("audit_date", e.target.value)} /></FL>
                <FL label="Branch"><Input data-testid="input-audit-branch" value={form.branch || "main"} onChange={e => set("branch", e.target.value)} /></FL>
                <FL label="Audit Type">
                  <Select value={form.audit_type || "full"} onValueChange={v => set("audit_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="full">Full Audit</SelectItem><SelectItem value="spot_check">Spot Check</SelectItem><SelectItem value="gold_only">Gold Only</SelectItem></SelectContent>
                  </Select>
                </FL>
                <FL label="Auditor Name"><Input data-testid="input-audit-auditor" value={form.auditor_name || ""} onChange={e => set("auditor_name", e.target.value)} /></FL>
              </>}
              {editing && <>
                <FL label="Status">
                  <Select value={form.status || "in_progress"} onValueChange={v => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="discrepancy">Discrepancy</SelectItem></SelectContent>
                  </Select>
                </FL>
                <FL label="Approved By"><Input value={form.approved_by || ""} onChange={e => set("approved_by", e.target.value)} /></FL>
                <FL label="System Pieces"><Input type="number" value={form.total_system_pieces || 0} onChange={e => set("total_system_pieces", e.target.value)} /></FL>
                <FL label="Physical Pieces"><Input type="number" value={form.total_physical_pieces || 0} onChange={e => set("total_physical_pieces", e.target.value)} /></FL>
                <FL label="System Weight (g)"><Input type="number" value={form.total_system_gm || 0} onChange={e => set("total_system_gm", e.target.value)} /></FL>
                <FL label="Physical Weight (g)"><Input type="number" value={form.total_physical_gm || 0} onChange={e => set("total_physical_gm", e.target.value)} /></FL>
                <FL label="Action Taken" className="col-span-2"><Textarea value={form.action_taken || ""} onChange={e => set("action_taken", e.target.value)} rows={2} /></FL>
              </>}
            </div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button data-testid="button-save-physical-audit" onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Loyalty & Rewards ─────────────────────────────────────────────────────────
export function LoyaltySection() {
  const { toast } = useToast();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const fmtAmt = (n: any) => fmtCur(n, tenantConfig);
  const [tab, setTab] = useState<"members" | "programs">("members");
  const [showMemberForm, setShowMemberForm] = useState(false);
  const [showProgForm, setShowProgForm] = useState(false);
  const [mf, setMf] = useState<any>({});
  const [pf, setPf] = useState<any>({ points_per_rupee: 0.01, redemption_value: 0.5 });
  const { data: members = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/loyalty/members"] });
  const { data: programs = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/loyalty/programs"] });
  const setM = (k: string, v: any) => setMf((p: any) => ({ ...p, [k]: v }));
  const setP = (k: string, v: any) => setPf((p: any) => ({ ...p, [k]: v }));

  const memberMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/loyalty/members", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/loyalty/members"] }); setShowMemberForm(false); setMf({}); toast({ title: "Member enrolled" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const progMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/loyalty/programs", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/loyalty/programs"] }); setShowProgForm(false); setPf({ points_per_rupee: 0.01, redemption_value: 0.5 }); toast({ title: "Program created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const tierColor = (tier: string) => ({ silver: "bg-gray-100 text-gray-700", gold: "bg-yellow-100 text-yellow-700", platinum: "bg-purple-100 text-purple-700" }[tier] || "bg-muted text-muted-foreground");

  return (
    <>
      <SH title="Loyalty & Rewards" action={
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowProgForm(true)}><Plus className="h-4 w-4 mr-1" />Program</Button>
          <Button size="sm" onClick={() => setShowMemberForm(true)}><Plus className="h-4 w-4 mr-1" />Enroll Member</Button>
        </div>
      } />
      <div className="flex border-b mb-4">
        {[["members","Members"],["programs","Programs"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k as any)} className={`px-4 py-2 text-sm ${tab === k ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>
      {tab === "members" ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Name", "Phone", "Program", "Tier", "Points Balance", "Total Spent", "Joined"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {(members as any[]).map((m: any) => (
                <tr key={m.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 font-medium">{m.member_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{m.phone}</td>
                  <td className="px-4 py-2 text-xs">{m.program_name || "—"}</td>
                  <td className="px-4 py-2"><Badge className={`text-xs capitalize ${tierColor(m.tier)}`}><Star className="h-3 w-3 mr-1" />{m.tier || "silver"}</Badge></td>
                  <td className="px-4 py-2 font-semibold">{fmt(m.points_balance, 0)} pts</td>
                  <td className="px-4 py-2">{fmtAmt(m.total_spent)}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{m.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
              {members.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No members enrolled</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(programs as any[]).map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-2">
                <p className="font-semibold">{p.program_name}</p>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div><span className="text-muted-foreground">{`Points/${sym}: `}</span>{p.points_per_rupee}</div>
                  <div><span className="text-muted-foreground">Redeem Value: </span>{sym}{p.redemption_value}/pt</div>
                  <div><span className="text-muted-foreground">Silver: </span>{sym}{p.silver_threshold}+</div>
                  <div><span className="text-muted-foreground">Gold: </span>{sym}{p.gold_threshold}+</div>
                  <div><span className="text-muted-foreground">Platinum: </span>{sym}{p.platinum_threshold}+</div>
                </div>
              </CardContent>
            </Card>
          ))}
          {programs.length === 0 && <p className="col-span-2 text-center text-muted-foreground py-8">No programs created</p>}
        </div>
      )}
      <Dialog open={showMemberForm} onOpenChange={setShowMemberForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Enroll Loyalty Member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FL label="Name *"><Input value={mf.member_name || ""} onChange={e => setM("member_name", e.target.value)} /></FL>
            <FL label="Phone"><Input value={mf.phone || ""} onChange={e => setM("phone", e.target.value)} /></FL>
            <FL label="Email"><Input type="email" value={mf.email || ""} onChange={e => setM("email", e.target.value)} /></FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Birthday"><Input type="date" value={mf.birthday || ""} onChange={e => setM("birthday", e.target.value)} /></FL>
              <FL label="Anniversary"><Input type="date" value={mf.anniversary || ""} onChange={e => setM("anniversary", e.target.value)} /></FL>
            </div>
            <FL label="Program">
              <Select value={mf.program_id?.toString() || ""} onValueChange={v => setM("program_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                <SelectContent>{(programs as any[]).map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.program_name}</SelectItem>)}</SelectContent>
              </Select>
            </FL>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowMemberForm(false)}>Cancel</Button><Button onClick={() => memberMut.mutate(mf)} disabled={memberMut.isPending}>Enroll</Button></div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showProgForm} onOpenChange={setShowProgForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Loyalty Program</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FL label="Program Name *"><Input value={pf.program_name || ""} onChange={e => setP("program_name", e.target.value)} /></FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label={`Silver Threshold (${sym})`}><Input type="number" value={pf.silver_threshold || 50000} onChange={e => setP("silver_threshold", e.target.value)} /></FL>
              <FL label={`Gold Threshold (${sym})`}><Input type="number" value={pf.gold_threshold || 200000} onChange={e => setP("gold_threshold", e.target.value)} /></FL>
              <FL label={`Platinum Threshold (${sym})`}><Input type="number" value={pf.platinum_threshold || 500000} onChange={e => setP("platinum_threshold", e.target.value)} /></FL>
              <FL label={`Points per ${sym}`}><Input type="number" value={pf.points_per_rupee || 0.01} onChange={e => setP("points_per_rupee", e.target.value)} /></FL>
              <FL label={`${sym} per Point (redemption)`}><Input type="number" value={pf.redemption_value || 0.5} onChange={e => setP("redemption_value", e.target.value)} /></FL>
            </div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowProgForm(false)}>Cancel</Button><Button onClick={() => progMut.mutate(pf)} disabled={progMut.isPending}>Create</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Promotions ────────────────────────────────────────────────────────────────
export function PromotionsSection() {
  const { toast } = useToast();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const fmtAmt = (n: any) => fmtCur(n, tenantConfig);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ promo_type: "discount_pct", discount_pct: 0 });
  const { data: promos = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/promotions"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/promotions", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/promotions"] }); setShowForm(false); setForm({ promo_type: "discount_pct", discount_pct: 0 }); toast({ title: "Promotion created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: any) => apiRequest("PUT", `/api/gold-erp/promotions/${id}`, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/promotions"] }),
  });

  return (
    <>
      <SH title="Promotions & Offers" action={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />New Promotion</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(promos as any[]).map((p: any) => (
          <Card key={p.id} className={!p.is_active ? "opacity-60" : ""}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-sm">{p.promo_name}</p>
                <Badge className={`text-xs ${p.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{p.is_active ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="text-xs space-y-0.5">
                <p className="text-muted-foreground capitalize">{p.promo_type?.replace(/_/g, " ")}</p>
                {p.discount_pct > 0 && <p><span className="text-muted-foreground">Discount: </span>{p.discount_pct}%</p>}
                {p.discount_value > 0 && <p><span className="text-muted-foreground">Flat Off: </span>{fmtAmt(p.discount_value)}</p>}
                {p.min_purchase_value && <p><span className="text-muted-foreground">Min Purchase: </span>{fmtAmt(p.min_purchase_value)}</p>}
                {p.valid_from && <p><span className="text-muted-foreground">Valid: </span>{p.valid_from} to {p.valid_to || "∞"}</p>}
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={() => toggleMut.mutate({ id: p.id, is_active: p.is_active ? 0 : 1 })}>
                {p.is_active ? "Deactivate" : "Activate"}
              </Button>
            </CardContent>
          </Card>
        ))}
        {promos.length === 0 && <p className="col-span-3 text-center text-muted-foreground py-8">No promotions created</p>}
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Promotion</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FL label="Promotion Name *"><Input value={form.promo_name || ""} onChange={e => set("promo_name", e.target.value)} /></FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Type">
                <Select value={form.promo_type || "discount_pct"} onValueChange={v => set("promo_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="discount_pct">% Discount</SelectItem><SelectItem value="flat_off">Flat Off</SelectItem><SelectItem value="free_making">Free Making</SelectItem><SelectItem value="gift">Gift</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Applicable Categories"><Input value={form.applicable_categories || "all"} onChange={e => set("applicable_categories", e.target.value)} placeholder="all / ring / necklace" /></FL>
              <FL label="Discount %"><Input type="number" value={form.discount_pct || 0} onChange={e => set("discount_pct", e.target.value)} /></FL>
              <FL label="Flat Discount (₹)"><Input type="number" value={form.discount_value || 0} onChange={e => set("discount_value", e.target.value)} /></FL>
              <FL label="Min Purchase (₹)"><Input type="number" value={form.min_purchase_value || ""} onChange={e => set("min_purchase_value", e.target.value)} /></FL>
              <FL label="Valid From"><Input type="date" value={form.valid_from || ""} onChange={e => set("valid_from", e.target.value)} /></FL>
              <FL label="Valid To"><Input type="date" value={form.valid_to || ""} onChange={e => set("valid_to", e.target.value)} /></FL>
            </div>
            <FL label="Terms & Conditions"><Textarea value={form.terms || ""} onChange={e => set("terms", e.target.value)} rows={2} /></FL>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Create</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Refining ──────────────────────────────────────────────────────────────────
export function RefiningSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ source_type: "scrap", credited_to: "own_stock" });
  const { data: entries = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/refining"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => editing
      ? apiRequest("PUT", `/api/gold-erp/refining/${editing.id}`, d)
      : apiRequest("POST", "/api/gold-erp/refining", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/refining"] });
      setShowForm(false); setEditing(null); setForm({ source_type: "scrap", credited_to: "own_stock" });
      toast({ title: "Refining entry saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SH title="Refining Process" action={
        <Button size="sm" onClick={() => { setEditing(null); setForm({ source_type: "scrap", credited_to: "own_stock" }); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />New Refining Entry
        </Button>
      } />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["No.", "Source", "Gross (g)", "Purity%", "Fine Gold (g)", "Refinery", "Sent", "Received", "Status"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {(entries as any[]).map((e: any) => (
              <tr key={e.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs text-muted-foreground">{e.refinery_no}</td>
                <td className="px-4 py-2 capitalize text-xs">{e.source_type}</td>
                <td className="px-4 py-2">{fmtWt(e.gross_recv_gm)}</td>
                <td className="px-4 py-2">{e.assay_purity_pct ? `${e.assay_purity_pct}%` : "—"}</td>
                <td className="px-4 py-2 font-semibold">{fmtWt(e.net_fine_gold_gm)}</td>
                <td className="px-4 py-2 text-xs">{e.refinery_name || "—"}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{e.date_sent || "—"}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{e.date_received || "—"}</td>
                <td className="px-4 py-2 flex gap-1 items-center"><SBadge status={e.status} /><Button size="icon" variant="ghost" onClick={() => { setEditing(e); setForm(e); setShowForm(true); }}><Pencil className="h-3 w-3" /></Button></td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No refining entries</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Refining" : "New Refining Entry"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FL label="Source Type">
                <Select value={form.source_type || "scrap"} onValueChange={v => set("source_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="scrap">Scrap</SelectItem><SelectItem value="buyback">Buy-back</SelectItem><SelectItem value="old_gold">Old Gold</SelectItem><SelectItem value="karigar_wastage">Karigar Wastage</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Customer Name"><Input value={form.customer_name || ""} onChange={e => set("customer_name", e.target.value)} /></FL>
              <FL label="Gross Weight (g)"><Input type="number" value={form.gross_recv_gm || ""} onChange={e => set("gross_recv_gm", e.target.value)} /></FL>
              <FL label="Assay Purity %"><Input type="number" value={form.assay_purity_pct || ""} onChange={e => set("assay_purity_pct", e.target.value)} /></FL>
              <FL label="Refinery Name"><Input value={form.refinery_name || ""} onChange={e => set("refinery_name", e.target.value)} /></FL>
              <FL label="Date Sent"><Input type="date" value={form.date_sent || ""} onChange={e => set("date_sent", e.target.value)} /></FL>
              <FL label="Credited To">
                <Select value={form.credited_to || "own_stock"} onValueChange={v => set("credited_to", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="own_stock">Own Stock</SelectItem><SelectItem value="customer">Customer</SelectItem></SelectContent>
                </Select>
              </FL>
            </div>
            {editing && <>
              <FL label="Status">
                <Select value={form.status || "sent"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="sent">Sent</SelectItem><SelectItem value="in_refining">In Refining</SelectItem><SelectItem value="received">Received</SelectItem></SelectContent>
                </Select>
              </FL>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Date Received"><Input type="date" value={form.date_received || ""} onChange={e => set("date_received", e.target.value)} /></FL>
                <FL label="Refined Gold Received (g)"><Input type="number" value={form.refined_gold_recv_gm || ""} onChange={e => set("refined_gold_recv_gm", e.target.value)} /></FL>
              </div>
            </>}
            <FL label="Item Description"><Textarea value={form.item_description || ""} onChange={e => set("item_description", e.target.value)} rows={2} /></FL>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── POS Old Gold ───────────────────────────────────────────────────────────────
export function PosOldGoldSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ metal_type: "gold", buyback_rate_pct: 95 });
  const { data: records = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/pos-old-gold"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/pos-old-gold", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/pos-old-gold"] }); setShowForm(false); setForm({ metal_type: "gold", buyback_rate_pct: 95 }); toast({ title: "Old gold credit recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const net = Number(form.gross_weight_gm || 0) - Number(form.stone_weight_gm || 0);
  const credit = net * Number(form.today_rate || 0) * Number(form.buyback_rate_pct || 95) / 100;

  return (
    <>
      <SH title="POS — Old Gold Exchange" action={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Record Exchange</Button>} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Customer", "Item", "Metal", "Gross", "Net", "Rate", "Credit Value", "Date"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {(records as any[]).map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2"><p className="font-medium">{r.customer_name || "Walk-in"}</p><p className="text-xs text-muted-foreground">{r.customer_phone}</p></td>
                <td className="px-4 py-2 text-xs">{r.item_description?.slice(0, 30) || "—"}</td>
                <td className="px-4 py-2 capitalize text-xs">{r.metal_type}</td>
                <td className="px-4 py-2">{fmtWt(r.gross_weight_gm)}</td>
                <td className="px-4 py-2">{fmtWt(r.net_weight_gm)}</td>
                <td className="px-4 py-2 text-xs">{fmtAmt(r.today_rate)}/g</td>
                <td className="px-4 py-2 font-semibold text-amber-700">{fmtAmt(r.credit_value)}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{r.created_at?.slice(0, 10)}</td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No old gold exchanges</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Old Gold Exchange</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FL label="Customer Name"><Input value={form.customer_name || ""} onChange={e => set("customer_name", e.target.value)} /></FL>
              <FL label="Phone"><Input value={form.customer_phone || ""} onChange={e => set("customer_phone", e.target.value)} /></FL>
              <FL label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => set("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Purity %"><Input type="number" value={form.purity_tested_pct || ""} onChange={e => set("purity_tested_pct", e.target.value)} /></FL>
              <FL label="Gross Weight (g)"><Input type="number" value={form.gross_weight_gm || ""} onChange={e => set("gross_weight_gm", e.target.value)} /></FL>
              <FL label="Stone Weight (g)"><Input type="number" value={form.stone_weight_gm || 0} onChange={e => set("stone_weight_gm", e.target.value)} /></FL>
              <FL label="Today Rate (₹/g)"><Input type="number" value={form.today_rate || ""} onChange={e => set("today_rate", e.target.value)} /></FL>
              <FL label="Buyback Rate %"><Input type="number" value={form.buyback_rate_pct || 95} onChange={e => set("buyback_rate_pct", e.target.value)} /></FL>
            </div>
            {form.gross_weight_gm && form.today_rate && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-sm flex justify-between font-bold">
                <span>Credit Value</span><span className="text-amber-700">{fmtAmt(credit)}</span>
              </div>
            )}
            <FL label="Item Description"><Input value={form.item_description || ""} onChange={e => set("item_description", e.target.value)} /></FL>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Record</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
