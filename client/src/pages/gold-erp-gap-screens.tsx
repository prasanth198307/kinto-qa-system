import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Pencil, AlertTriangle, CheckCircle, Clock,
  TrendingDown, IndianRupee, ChevronRight, BarChart3,
  Truck, Shield, Receipt, Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── Shared helpers ─────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const fmtWt = (n: any) => n ? `${Number(n).toFixed(3)} g` : "—";
const fmtAmt = (n: any) => n ? `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}` : "—";

function SH({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2 mb-4 flex-wrap">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    present: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    absent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    "half-day": "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    defaulted: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    invoiced: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    settled: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
    confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    dispatched: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    in_transit: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    verified: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  };
  return <Badge className={`text-xs capitalize ${map[status] || "bg-gray-100 text-gray-600"}`}>{status.replace(/_/g, " ")}</Badge>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. KARIGAR ATTENDANCE
// ═══════════════════════════════════════════════════════════════════════════════
export function KarigarAttendanceSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filterDate, setFilterDate] = useState(today());
  const [form, setForm] = useState<any>({ attend_date: today(), present: 1, work_type: "production" });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: attendance = [] } = useQuery<any[]>({
    queryKey: ["/api/gold-erp/karigar-attendance", filterDate],
    queryFn: () => fetch(`/api/gold-erp/karigar-attendance?date=${filterDate}`, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });
  const { data: karigars = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigars"] });

  // Auto-calculate daily wages from karigar's daily_rate and present type
  const autoCalcWages = (karigarId: number | string, presentVal: number) => {
    const k = (karigars as any[]).find((x: any) => x.id === Number(karigarId));
    const rate = Number(k?.daily_rate || 0);
    if (rate <= 0) return;
    const wages = presentVal === 1 ? rate : presentVal === 2 ? rate / 2 : 0;
    setForm((p: any) => ({ ...p, daily_wages: wages }));
  };

  const saveMut = useMutation({
    mutationFn: (d: any) => editing
      ? apiRequest("PUT", `/api/gold-erp/karigar-attendance/${editing.id}`, d)
      : apiRequest("POST", "/api/gold-erp/karigar-attendance", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/karigar-attendance"] });
      setShowForm(false); setEditing(null);
      setForm({ attend_date: today(), present: 1, work_type: "production" });
      toast({ title: "Attendance saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const presentCount = (attendance as any[]).filter((a: any) => a.present === 1).length;
  const absentCount = (attendance as any[]).filter((a: any) => a.present === 0).length;
  const totalWages = (attendance as any[]).reduce((s: number, a: any) => s + Number(a.daily_wages || 0), 0);

  return (
    <>
      <SH title="Karigar Attendance" sub="Daily in/out and wages register" action={
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            data-testid="input-attend-date-filter"
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="w-40"
          />
          <Button size="sm" onClick={() => { setEditing(null); setForm({ attend_date: filterDate, present: 1, work_type: "production" }); setShowForm(true); }} data-testid="button-add-attendance">
            <Plus className="h-4 w-4 mr-1" />Mark Attendance
          </Button>
        </div>
      } />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Present", value: presentCount, icon: CheckCircle, cls: "text-green-600" },
          { label: "Absent", value: absentCount, icon: AlertTriangle, cls: "text-red-500" },
          { label: "Total Wages", value: fmtAmt(totalWages), icon: IndianRupee, cls: "text-amber-600" },
          { label: "Total Karigars", value: (attendance as any[]).length, icon: Users, cls: "text-blue-600" },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="p-3 flex items-center gap-2">
              <c.icon className={`h-5 w-5 ${c.cls}`} />
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="font-semibold text-sm">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Karigar", "Work Type", "Check In", "Check Out", "Hours", "Wages", "Advance", "Status", ""].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {(attendance as any[]).map((a: any) => (
              <tr key={a.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{a.karigar_name || `ID #${a.karigar_id}`}</td>
                <td className="px-3 py-2 capitalize">{a.work_type || "—"}</td>
                <td className="px-3 py-2">{a.check_in_time || "—"}</td>
                <td className="px-3 py-2">{a.check_out_time || "—"}</td>
                <td className="px-3 py-2">{a.work_hours || "—"}</td>
                <td className="px-3 py-2">{fmtAmt(a.daily_wages)}</td>
                <td className="px-3 py-2">{a.advance_given ? fmtAmt(a.advance_given) : "—"}</td>
                <td className="px-3 py-2">
                  <SBadge status={a.present === 1 ? "present" : a.present === 2 ? "half-day" : "absent"} />
                </td>
                <td className="px-3 py-2">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setForm({ ...a }); setShowForm(true); }} data-testid={`button-edit-attend-${a.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {attendance.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No attendance for this date</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Attendance" : "Mark Attendance"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Karigar">
              <Select value={form.karigar_id?.toString() || ""} onValueChange={v => {
                set("karigar_id", parseInt(v));
                autoCalcWages(v, form.present ?? 1);
              }}>
                <SelectTrigger data-testid="select-attend-karigar"><SelectValue placeholder="Select karigar" /></SelectTrigger>
                <SelectContent>{(karigars as any[]).map((k: any) => <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Date">
                <Input data-testid="input-attend-date" type="date" value={form.attend_date || today()} onChange={e => set("attend_date", e.target.value)} />
              </FieldRow>
              <FieldRow label="Status">
                <Select value={form.present?.toString() || "1"} onValueChange={v => {
                  const presentVal = parseInt(v);
                  set("present", presentVal);
                  autoCalcWages(form.karigar_id, presentVal);
                }}>
                  <SelectTrigger data-testid="select-attend-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Present</SelectItem>
                    <SelectItem value="2">Half Day</SelectItem>
                    <SelectItem value="0">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Check In Time">
                <Input data-testid="input-attend-checkin" type="time" value={form.check_in_time || ""} onChange={e => set("check_in_time", e.target.value)} />
              </FieldRow>
              <FieldRow label="Check Out Time">
                <Input data-testid="input-attend-checkout" type="time" value={form.check_out_time || ""} onChange={e => set("check_out_time", e.target.value)} />
              </FieldRow>
              <FieldRow label="Work Type">
                <Select value={form.work_type || "production"} onValueChange={v => set("work_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["production","casting","setting","finishing","polishing","other"].map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Daily Wages (₹)">
                <Input data-testid="input-attend-wages" type="number" value={form.daily_wages || ""} onChange={e => set("daily_wages", e.target.value)} placeholder="0" />
              </FieldRow>
              <FieldRow label="Advance Given (₹)">
                <Input data-testid="input-attend-advance" type="number" value={form.advance_given || ""} onChange={e => set("advance_given", e.target.value)} placeholder="0" />
              </FieldRow>
            </div>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} data-testid="button-save-attendance">
                {saveMut.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. BULLION RATE CUTS
// ═══════════════════════════════════════════════════════════════════════════════
export function BullionRateCutsSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ cut_date: today(), metal_type: "gold", party_type: "dealer", gst_pct: 3, payment_mode: "bank", status: "draft" });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: cuts = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/bullion-rate-cuts"] });

  const saveMut = useMutation({
    mutationFn: (d: any) => {
      const wt = parseFloat(d.weight_gm) || 0;
      const spot = parseFloat(d.spot_rate) || 0;
      const cutPct = parseFloat(d.rate_cut_pct) || 0;
      const cutPerGm = spot * (cutPct / 100);
      const netRate = spot - cutPerGm;
      const total = netRate * wt;
      const gstAmt = total * ((parseFloat(d.gst_pct) || 3) / 100);
      const grand = total + gstAmt;
      return editing
        ? apiRequest("PUT", `/api/gold-erp/bullion-rate-cuts/${editing.id}`, { ...d, rate_cut_per_gm: cutPerGm, net_rate: netRate, total_amount: total, gst_amount: gstAmt, grand_total: grand })
        : apiRequest("POST", "/api/gold-erp/bullion-rate-cuts", { ...d, rate_cut_per_gm: cutPerGm, net_rate: netRate, total_amount: total, gst_amount: gstAmt, grand_total: grand });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/bullion-rate-cuts"] });
      setShowForm(false); setEditing(null);
      setForm({ cut_date: today(), metal_type: "gold", party_type: "dealer", gst_pct: 3, payment_mode: "bank", status: "draft" });
      toast({ title: "Rate cut invoice saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Live calc
  const spot = parseFloat(form.spot_rate) || 0;
  const wt = parseFloat(form.weight_gm) || 0;
  const cutPct = parseFloat(form.rate_cut_pct) || 0;
  const cutPerGm = spot * (cutPct / 100);
  const netRate = spot - cutPerGm;
  const totalAmt = netRate * wt;
  const gstAmt = totalAmt * ((parseFloat(form.gst_pct) || 3) / 100);
  const grandTotal = totalAmt + gstAmt;

  return (
    <>
      <SH title="Bullion Rate Cut Invoices" sub="Rate-cut invoices for bullion purchases from banks and dealers" action={
        <Button size="sm" onClick={() => { setEditing(null); setForm({ cut_date: today(), metal_type: "gold", party_type: "dealer", gst_pct: 3, payment_mode: "bank", status: "draft" }); setShowForm(true); }} data-testid="button-add-rate-cut">
          <Plus className="h-4 w-4 mr-1" />New Rate Cut
        </Button>
      } />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Invoice", "Date", "Party", "Metal", "Wt (g)", "Spot Rate", "Cut %", "Net Rate", "Grand Total", "Status", ""].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {(cuts as any[]).map((c: any) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{c.invoice_no || `RC-${c.id}`}</td>
                <td className="px-3 py-2 text-xs">{c.cut_date}</td>
                <td className="px-3 py-2">{c.party_name || "—"}</td>
                <td className="px-3 py-2 capitalize">{c.metal_type}</td>
                <td className="px-3 py-2">{fmtWt(c.weight_gm)}</td>
                <td className="px-3 py-2">{fmtAmt(c.spot_rate)}</td>
                <td className="px-3 py-2">{c.rate_cut_pct || 0}%</td>
                <td className="px-3 py-2 font-medium">{fmtAmt(c.net_rate)}</td>
                <td className="px-3 py-2 font-semibold">{fmtAmt(c.grand_total)}</td>
                <td className="px-3 py-2"><SBadge status={c.status || "draft"} /></td>
                <td className="px-3 py-2">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setForm({ ...c }); setShowForm(true); }} data-testid={`button-edit-ratecut-${c.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {cuts.length === 0 && <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">No rate cut invoices yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Rate Cut Invoice" : "New Rate Cut Invoice"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Invoice No">
                <Input data-testid="input-ratecut-invoice-no" value={form.invoice_no || ""} onChange={e => set("invoice_no", e.target.value)} placeholder="RC-001" />
              </FieldRow>
              <FieldRow label="Date">
                <Input type="date" value={form.cut_date || today()} onChange={e => set("cut_date", e.target.value)} />
              </FieldRow>
              <FieldRow label="Party Name">
                <Input data-testid="input-ratecut-party" value={form.party_name || ""} onChange={e => set("party_name", e.target.value)} placeholder="Bank or dealer name" />
              </FieldRow>
              <FieldRow label="Party Type">
                <Select value={form.party_type || "dealer"} onValueChange={v => set("party_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank</SelectItem>
                    <SelectItem value="dealer">Dealer</SelectItem>
                    <SelectItem value="refinery">Refinery</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
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
                <Input value={form.purity_name || ""} onChange={e => set("purity_name", e.target.value)} placeholder="e.g. 995, 24K" />
              </FieldRow>
              <FieldRow label="Weight (g)">
                <Input data-testid="input-ratecut-weight" type="number" value={form.weight_gm || ""} onChange={e => set("weight_gm", e.target.value)} placeholder="0.000" />
              </FieldRow>
              <FieldRow label="Spot Rate (₹/g)">
                <Input data-testid="input-ratecut-spot" type="number" value={form.spot_rate || ""} onChange={e => set("spot_rate", e.target.value)} placeholder="MCX/IBJA rate" />
              </FieldRow>
              <FieldRow label="Rate Cut %">
                <Input data-testid="input-ratecut-pct" type="number" value={form.rate_cut_pct || ""} onChange={e => set("rate_cut_pct", e.target.value)} placeholder="0.000" />
              </FieldRow>
              <FieldRow label="GST %">
                <Input type="number" value={form.gst_pct || 3} onChange={e => set("gst_pct", e.target.value)} />
              </FieldRow>
              <FieldRow label="Payment Mode">
                <Select value={form.payment_mode || "bank"} onValueChange={v => set("payment_mode", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Status">
                <Select value={form.status || "draft"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="invoiced">Invoiced</SelectItem>
                    <SelectItem value="settled">Settled</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>
            {/* Live Calculation */}
            {wt > 0 && spot > 0 && (
              <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                <div className="text-xs font-medium text-muted-foreground mb-2">Live Calculation</div>
                <div className="flex justify-between"><span>Cut per gram</span><span className="font-mono">{fmtAmt(cutPerGm)}/g</span></div>
                <div className="flex justify-between"><span>Net rate</span><span className="font-mono font-medium">{fmtAmt(netRate)}/g</span></div>
                <div className="flex justify-between"><span>Amount ({fmtWt(wt)})</span><span className="font-mono">{fmtAmt(totalAmt)}</span></div>
                <div className="flex justify-between"><span>GST ({form.gst_pct || 3}%)</span><span className="font-mono">{fmtAmt(gstAmt)}</span></div>
                <div className="flex justify-between border-t pt-1 font-semibold"><span>Grand Total</span><span className="font-mono text-amber-700 dark:text-amber-400">{fmtAmt(grandTotal)}</span></div>
              </div>
            )}
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} data-testid="button-save-ratecut">
                {saveMut.isPending ? "Saving…" : "Save Invoice"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CHIT COLLECTION REGISTER
// ═══════════════════════════════════════════════════════════════════════════════
export function ChitCollectionRegisterSection() {
  const { toast } = useToast();
  const [selectedScheme, setSelectedScheme] = useState<string>("");
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [payTarget, setPayTarget] = useState<any>(null);
  const [payForm, setPayForm] = useState<any>({ payment_mode: "cash", paid_date: today() });

  const { data: schemes = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/chit-schemes"] });

  // Fetch members for the selected scheme (exist from enrollment)
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ["/api/gold-erp/chit-schemes", selectedScheme, "members"],
    queryFn: () => selectedScheme
      ? fetch(`/api/gold-erp/chit-schemes/${selectedScheme}/members`, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); })
      : Promise.resolve([]),
    enabled: !!selectedScheme,
  });

  // Fetch paid installments for display history
  const { data: installments = [] } = useQuery<any[]>({
    queryKey: ["/api/gold-erp/chit-installments", selectedScheme],
    queryFn: () => selectedScheme
      ? fetch(`/api/gold-erp/chit-installments?scheme_id=${selectedScheme}`, { credentials: "include" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); })
      : Promise.resolve([]),
    enabled: !!selectedScheme,
  });

  // POST a new installment payment via the pay endpoint
  const payMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", `/api/gold-erp/chit-members/${d.member_id}/pay`, {
      amount: d.amount_inr,
      amount_gm: d.amount_gm,
      payment_mode: d.payment_mode,
      paid_date: d.paid_date,
      receipt_no: d.receipt_no,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/chit-installments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/chit-schemes", selectedScheme, "members"] });
      setShowPayDialog(false); toast({ title: "Payment recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Group installments by member_id for history display
  const instByMember: Record<string, any[]> = {};
  (installments as any[]).forEach((inst: any) => {
    const key = inst.member_id?.toString() || "";
    if (!instByMember[key]) instByMember[key] = [];
    instByMember[key].push(inst);
  });

  // Find the scheme's monthly_amount for pre-filling
  const selectedSchemeData = (schemes as any[]).find(s => s.id.toString() === selectedScheme);

  return (
    <>
      <SH title="Chit Collection Register" sub="Monthly installment collection grid for all scheme members" action={
        <Select value={selectedScheme} onValueChange={setSelectedScheme}>
          <SelectTrigger className="w-56" data-testid="select-chit-scheme"><SelectValue placeholder="Select scheme" /></SelectTrigger>
          <SelectContent>
            {(schemes as any[]).map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name || s.scheme_name}</SelectItem>)}
          </SelectContent>
        </Select>
      } />

      {!selectedScheme && (
        <div className="py-12 text-center text-muted-foreground">Select a chit scheme to view the collection register</div>
      )}

      {selectedScheme && (members as any[]).length === 0 && (
        <div className="py-12 text-center text-muted-foreground">No members enrolled in this scheme yet</div>
      )}

      {(members as any[]).map((member: any) => {
        const memberInsts = instByMember[member.id?.toString()] || [];
        const paidCount = member.installments_paid || memberInsts.filter((i: any) => i.status === "paid").length;
        const totalPaid = Number(member.total_paid || 0);
        return (
          <div key={member.id} className="mb-4 rounded-lg border">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b">
              <div>
                <span className="font-medium text-sm">{member.member_name}</span>
                <span className="ml-2 text-xs text-muted-foreground">{member.phone}</span>
                <span className="ml-2 text-xs text-muted-foreground">{paidCount} installments paid · {fmtAmt(totalPaid)}</span>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => {
                  setPayTarget(member);
                  setPayForm({
                    member_id: member.id,
                    payment_mode: "cash",
                    paid_date: today(),
                    amount_inr: selectedSchemeData?.monthly_amount || "",
                    amount_gm: "",
                  });
                  setShowPayDialog(true);
                }}
                data-testid={`button-collect-${member.id}`}>
                Record Payment
              </Button>
            </div>
            {memberInsts.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/20">
                    <tr>{["Inst #", "Amount (₹)", "Amount (g)", "Paid Date", "Mode", "Receipt", "Status"].map(h => (
                      <th key={h} className="px-3 py-1.5 text-left font-medium">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {memberInsts.map((inst: any) => (
                      <tr key={inst.id} className="border-t hover:bg-muted/20">
                        <td className="px-3 py-1.5">#{inst.installment_no}</td>
                        <td className="px-3 py-1.5">{inst.amount_inr ? fmtAmt(inst.amount_inr) : inst.amount ? fmtAmt(inst.amount) : "—"}</td>
                        <td className="px-3 py-1.5">{inst.amount_gm ? fmtWt(inst.amount_gm) : "—"}</td>
                        <td className="px-3 py-1.5">{inst.paid_date || "—"}</td>
                        <td className="px-3 py-1.5 capitalize">{inst.payment_mode || "—"}</td>
                        <td className="px-3 py-1.5">{inst.receipt_no || "—"}</td>
                        <td className="px-3 py-1.5"><SBadge status={inst.status || "paid"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent className="max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Installment Payment</DialogTitle></DialogHeader>
          {payTarget && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Member: {payTarget.member_name} · Instalment #{(payTarget.installments_paid || 0) + 1}</p>
              <FieldRow label="Amount (₹)">
                <Input type="number" value={payForm.amount_inr || ""} onChange={e => setPayForm((p: any) => ({ ...p, amount_inr: e.target.value }))} />
              </FieldRow>
              <FieldRow label="Amount in Gold (g)">
                <Input type="number" value={payForm.amount_gm || ""} onChange={e => setPayForm((p: any) => ({ ...p, amount_gm: e.target.value }))} placeholder="Optional — for gm-based chit" />
              </FieldRow>
              <FieldRow label="Paid Date">
                <Input type="date" value={payForm.paid_date || today()} onChange={e => setPayForm((p: any) => ({ ...p, paid_date: e.target.value }))} />
              </FieldRow>
              <FieldRow label="Payment Mode">
                <Select value={payForm.payment_mode || "cash"} onValueChange={v => setPayForm((p: any) => ({ ...p, payment_mode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="bank">Bank Transfer</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Receipt No">
                <Input value={payForm.receipt_no || ""} onChange={e => setPayForm((p: any) => ({ ...p, receipt_no: e.target.value }))} placeholder="Optional" />
              </FieldRow>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPayDialog(false)}>Cancel</Button>
                <Button onClick={() => payMut.mutate(payForm)} disabled={payMut.isPending} data-testid="button-save-chit-payment">
                  {payMut.isPending ? "Saving…" : "Record Payment"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. WHOLESALE B2B ORDER BOOKING
// ═══════════════════════════════════════════════════════════════════════════════
export function WholesaleB2BOrdersSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ order_date: today(), metal_type: "gold", status: "draft", gst_pct: 3 });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/wholesale-b2b-orders"] });

  const saveMut = useMutation({
    mutationFn: (d: any) => editing
      ? apiRequest("PUT", `/api/gold-erp/wholesale-b2b-orders/${editing.id}`, d)
      : apiRequest("POST", "/api/gold-erp/wholesale-b2b-orders", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/wholesale-b2b-orders"] });
      setShowForm(false); setEditing(null);
      setForm({ order_date: today(), metal_type: "gold", status: "draft", gst_pct: 3 });
      toast({ title: "B2B order saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const statusColor: Record<string, string> = {
    draft: "bg-gray-100 text-gray-600",
    confirmed: "bg-blue-100 text-blue-700",
    dispatched: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
  };

  return (
    <>
      <SH title="Wholesale B2B Orders" sub="Retailer order bookings for finished jewellery pieces" action={
        <Button size="sm" onClick={() => { setEditing(null); setForm({ order_date: today(), metal_type: "gold", status: "draft", gst_pct: 3 }); setShowForm(true); }} data-testid="button-add-b2b-order">
          <Plus className="h-4 w-4 mr-1" />New Order
        </Button>
      } />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Order No", "Date", "Customer", "Metal", "Pieces", "Weight", "Grand Total", "Balance", "Delivery", "Status", ""].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {(orders as any[]).map((o: any) => (
              <tr key={o.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{o.order_no || `B2B-${o.id}`}</td>
                <td className="px-3 py-2 text-xs">{o.order_date}</td>
                <td className="px-3 py-2">{o.customer_name || "—"}</td>
                <td className="px-3 py-2 capitalize">{o.metal_type}</td>
                <td className="px-3 py-2 text-center">{o.total_pieces || 0}</td>
                <td className="px-3 py-2">{fmtWt(o.total_weight_gm)}</td>
                <td className="px-3 py-2 font-semibold">{fmtAmt(o.grand_total)}</td>
                <td className="px-3 py-2 text-red-600">{fmtAmt(o.balance_due)}</td>
                <td className="px-3 py-2 text-xs">{o.delivery_date || "—"}</td>
                <td className="px-3 py-2">
                  <Badge className={`text-xs capitalize ${statusColor[o.status] || "bg-gray-100 text-gray-600"}`}>{o.status}</Badge>
                </td>
                <td className="px-3 py-2">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(o); setForm({ ...o }); setShowForm(true); }} data-testid={`button-edit-b2b-${o.id}`}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">No B2B orders yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit B2B Order" : "New Wholesale B2B Order"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Order No">
                <Input value={form.order_no || ""} onChange={e => set("order_no", e.target.value)} placeholder="B2B-001" />
              </FieldRow>
              <FieldRow label="Order Date">
                <Input type="date" value={form.order_date || today()} onChange={e => set("order_date", e.target.value)} />
              </FieldRow>
              <FieldRow label="Customer / Retailer">
                <Input data-testid="input-b2b-customer" value={form.customer_name || ""} onChange={e => set("customer_name", e.target.value)} placeholder="Retailer name" />
              </FieldRow>
              <FieldRow label="Phone">
                <Input value={form.customer_phone || ""} onChange={e => set("customer_phone", e.target.value)} />
              </FieldRow>
              <FieldRow label="GSTIN">
                <Input value={form.customer_gstin || ""} onChange={e => set("customer_gstin", e.target.value)} placeholder="22AAAAA0000A1Z5" />
              </FieldRow>
              <FieldRow label="Delivery Date">
                <Input type="date" value={form.delivery_date || ""} onChange={e => set("delivery_date", e.target.value)} />
              </FieldRow>
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
                <Input value={form.purity_name || ""} onChange={e => set("purity_name", e.target.value)} placeholder="e.g. 22K, 18K" />
              </FieldRow>
              <FieldRow label="Total Pieces">
                <Input type="number" value={form.total_pieces || ""} onChange={e => set("total_pieces", e.target.value)} />
              </FieldRow>
              <FieldRow label="Total Weight (g)">
                <Input type="number" value={form.total_weight_gm || ""} onChange={e => set("total_weight_gm", e.target.value)} />
              </FieldRow>
              <FieldRow label="Gold Rate Used (₹/g)">
                <Input type="number" value={form.gold_rate_used || ""} onChange={e => set("gold_rate_used", e.target.value)} />
              </FieldRow>
              <FieldRow label="Making Total (₹)">
                <Input type="number" value={form.making_total || ""} onChange={e => set("making_total", e.target.value)} />
              </FieldRow>
              <FieldRow label="Stone Total (₹)">
                <Input type="number" value={form.stone_total || ""} onChange={e => set("stone_total", e.target.value)} />
              </FieldRow>
              <FieldRow label="Discount Amount (₹)">
                <Input type="number" value={form.discount_amt || ""} onChange={e => set("discount_amt", e.target.value)} />
              </FieldRow>
              <FieldRow label="GST %">
                <Input type="number" value={form.gst_pct || 3} onChange={e => set("gst_pct", e.target.value)} />
              </FieldRow>
              <FieldRow label="Advance Paid (₹)">
                <Input type="number" value={form.advance_paid || ""} onChange={e => set("advance_paid", e.target.value)} />
              </FieldRow>
              <FieldRow label="Status">
                <Select value={form.status || "draft"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="dispatched">Dispatched</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancel</Button>
              <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} data-testid="button-save-b2b-order">
                {saveMut.isPending ? "Saving…" : "Save Order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. JEWELLERY POS
// ═══════════════════════════════════════════════════════════════════════════════
export function JewelleryPOSSection() {
  const { toast } = useToast();
  const [mode, setMode] = useState<"list" | "new">("list");
  const [form, setForm] = useState<any>({
    bill_date: today(), cgst_pct: 1.5, sgst_pct: 1.5,
    items_json: [], gold_rate: "", purity_name: "22K",
  });
  const [billItems, setBillItems] = useState<any[]>([]);

  const { data: bills = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/jewellery-pos-bills"] });
  const { data: metalRates = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/metal-rates"] });

  const latestRate = (metalRates as any[])[0]?.rate_per_gram_22k || "";

  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/jewellery-pos-bills", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/jewellery-pos-bills"] });
      setMode("list"); setBillItems([]);
      setForm({ bill_date: today(), cgst_pct: 1.5, sgst_pct: 1.5, items_json: [], gold_rate: "", purity_name: "22K" });
      toast({ title: "POS bill saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function addItem() {
    setBillItems(prev => [...prev, { description: "", gross_weight_gm: "", stone_weight_gm: 0, net_weight_gm: "", making_charge: "", stone_value: "" }]);
  }
  function updateItem(idx: number, k: string, v: any) {
    setBillItems(prev => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it));
  }
  function removeItem(idx: number) { setBillItems(prev => prev.filter((_, i) => i !== idx)); }

  const goldRate = parseFloat(form.gold_rate) || parseFloat(latestRate) || 0;
  const totals = billItems.reduce((acc, it) => {
    const netWt = parseFloat(it.net_weight_gm) || 0;
    const goldVal = netWt * goldRate;
    const making = parseFloat(it.making_charge) || 0;
    const stone = parseFloat(it.stone_value) || 0;
    const lineTotal = goldVal + making + stone;
    return { goldValue: acc.goldValue + goldVal, making: acc.making + making, stone: acc.stone + stone, gross: acc.gross + lineTotal };
  }, { goldValue: 0, making: 0, stone: 0, gross: 0 });

  const exchangeVal = (parseFloat(form.exchange_gold_wt) || 0) * (parseFloat(form.exchange_rate) || 0);
  const discountAmt = parseFloat(form.discount_amt) || 0;
  const taxableVal = Math.max(0, totals.gross - exchangeVal - discountAmt);
  const gstAmt = taxableVal * ((parseFloat(form.cgst_pct) + parseFloat(form.sgst_pct)) / 100);
  const grandTotal = taxableVal + gstAmt;
  const paid = (parseFloat(form.paid_cash) || 0) + (parseFloat(form.paid_card) || 0) + (parseFloat(form.paid_upi) || 0) + (parseFloat(form.advance_used) || 0);
  const balance = grandTotal - paid;

  function handleSave(status: "draft" | "paid") {
    saveMut.mutate({
      ...form,
      gold_rate: goldRate,
      items_json: JSON.stringify(billItems),
      exchange_value: exchangeVal,
      taxable_value: taxableVal,
      gst_amount: gstAmt,
      grand_total: grandTotal,
      balance,
      status,
    });
  }

  if (mode === "new") {
    return (
      <div className="space-y-4">
        <SH title="New Jewellery POS Bill" action={
          <Button variant="outline" size="sm" onClick={() => { setMode("list"); setBillItems([]); }}>Back to list</Button>
        } />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FieldRow label="Bill No"><Input value={form.bill_no || ""} onChange={e => setForm((p: any) => ({ ...p, bill_no: e.target.value }))} placeholder="INV-001" /></FieldRow>
          <FieldRow label="Date"><Input type="date" value={form.bill_date || today()} onChange={e => setForm((p: any) => ({ ...p, bill_date: e.target.value }))} /></FieldRow>
          <FieldRow label="Customer"><Input data-testid="input-pos-customer" value={form.customer_name || ""} onChange={e => setForm((p: any) => ({ ...p, customer_name: e.target.value }))} /></FieldRow>
          <FieldRow label="Phone"><Input value={form.customer_phone || ""} onChange={e => setForm((p: any) => ({ ...p, customer_phone: e.target.value }))} /></FieldRow>
          <FieldRow label="Gold Rate (₹/g)" >
            <Input data-testid="input-pos-rate" type="number" value={form.gold_rate || latestRate} onChange={e => setForm((p: any) => ({ ...p, gold_rate: e.target.value }))} placeholder={`Auto: ₹${latestRate}/g`} />
          </FieldRow>
          <FieldRow label="Purity">
            <Select value={form.purity_name || "22K"} onValueChange={v => setForm((p: any) => ({ ...p, purity_name: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["24K","22K","18K","14K"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </FieldRow>
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Items</h3>
            <Button size="sm" variant="outline" onClick={addItem} data-testid="button-pos-add-item"><Plus className="h-4 w-4 mr-1" />Add Item</Button>
          </div>
          {billItems.map((it, idx) => (
            <div key={idx} className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-2 p-2 rounded border bg-muted/20">
              <div className="sm:col-span-2">
                <Label className="text-xs">Description</Label>
                <Input className="mt-1" value={it.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Ring, chain, etc." />
              </div>
              <div>
                <Label className="text-xs">Gross Wt (g)</Label>
                <Input className="mt-1" type="number" value={it.gross_weight_gm} onChange={e => updateItem(idx, "gross_weight_gm", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Net Wt (g)</Label>
                <Input className="mt-1" type="number" value={it.net_weight_gm} onChange={e => updateItem(idx, "net_weight_gm", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Making (₹)</Label>
                <Input className="mt-1" type="number" value={it.making_charge} onChange={e => updateItem(idx, "making_charge", e.target.value)} />
              </div>
              <div className="flex flex-col">
                <Label className="text-xs">Stone Val (₹)</Label>
                <div className="flex gap-1 mt-1">
                  <Input type="number" value={it.stone_value} onChange={e => updateItem(idx, "stone_value", e.target.value)} />
                  <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} className="shrink-0"><AlertTriangle className="h-4 w-4 text-red-500" /></Button>
                </div>
              </div>
            </div>
          ))}
          {billItems.length === 0 && <p className="text-sm text-muted-foreground py-2">No items added yet</p>}
        </div>

        {/* Exchange & Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Old Gold Exchange</h3>
            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="Old Gold Wt (g)">
                <Input type="number" value={form.exchange_gold_wt || ""} onChange={e => setForm((p: any) => ({ ...p, exchange_gold_wt: e.target.value }))} />
              </FieldRow>
              <FieldRow label="Exchange Rate (₹/g)">
                <Input type="number" value={form.exchange_rate || ""} onChange={e => setForm((p: any) => ({ ...p, exchange_rate: e.target.value }))} />
              </FieldRow>
            </div>
          </div>

          <div className="rounded-lg border p-3 text-sm space-y-1 bg-muted/20">
            <div className="flex justify-between"><span>Gold Value</span><span>{fmtAmt(totals.goldValue)}</span></div>
            <div className="flex justify-between"><span>Making Charges</span><span>{fmtAmt(totals.making)}</span></div>
            <div className="flex justify-between"><span>Stone Value</span><span>{fmtAmt(totals.stone)}</span></div>
            <div className="flex justify-between text-red-600"><span>(-) Exchange Value</span><span>{fmtAmt(exchangeVal)}</span></div>
            <div className="flex justify-between text-red-600"><span>(-) Discount</span><span>
              <Input type="number" value={form.discount_amt || ""} onChange={e => setForm((p: any) => ({ ...p, discount_amt: e.target.value }))} className="w-24 h-6 text-xs inline" />
            </span></div>
            <div className="flex justify-between border-t pt-1"><span>Taxable Value</span><span>{fmtAmt(taxableVal)}</span></div>
            <div className="flex justify-between text-xs text-muted-foreground"><span>CGST {form.cgst_pct}% + SGST {form.sgst_pct}%</span><span>{fmtAmt(gstAmt)}</span></div>
            <div className="flex justify-between font-semibold text-base border-t pt-1"><span>Grand Total</span><span className="text-amber-700 dark:text-amber-400">{fmtAmt(grandTotal)}</span></div>
          </div>
        </div>

        {/* Payment */}
        <div className="rounded-lg border p-3 space-y-2">
          <h3 className="text-sm font-medium mb-2">Payment Received</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <FieldRow label="Cash (₹)"><Input type="number" value={form.paid_cash || ""} onChange={e => setForm((p: any) => ({ ...p, paid_cash: e.target.value }))} /></FieldRow>
            <FieldRow label="Card (₹)"><Input type="number" value={form.paid_card || ""} onChange={e => setForm((p: any) => ({ ...p, paid_card: e.target.value }))} /></FieldRow>
            <FieldRow label="UPI (₹)"><Input type="number" value={form.paid_upi || ""} onChange={e => setForm((p: any) => ({ ...p, paid_upi: e.target.value }))} /></FieldRow>
            <FieldRow label="Advance Used (₹)"><Input type="number" value={form.advance_used || ""} onChange={e => setForm((p: any) => ({ ...p, advance_used: e.target.value }))} /></FieldRow>
          </div>
          <div className="flex justify-between font-semibold text-sm pt-1">
            <span>Balance Due</span>
            <span className={balance > 0 ? "text-red-600" : "text-green-600"}>{fmtAmt(Math.abs(balance))} {balance < 0 ? "(change)" : ""}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => handleSave("draft")} disabled={saveMut.isPending} data-testid="button-pos-draft">Save Draft</Button>
          <Button onClick={() => handleSave("paid")} disabled={saveMut.isPending} data-testid="button-pos-bill">
            <Receipt className="h-4 w-4 mr-1" />Generate Bill
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SH title="Jewellery POS" sub="Full billing with gold rate, making charges, exchange & GST" action={
        <Button size="sm" onClick={() => setMode("new")} data-testid="button-new-pos-bill">
          <Plus className="h-4 w-4 mr-1" />New Bill
        </Button>
      } />

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Bill No", "Date", "Customer", "Purity", "Gold Rate", "Grand Total", "Status", ""].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {(bills as any[]).map((b: any) => (
              <tr key={b.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{b.bill_no || `POS-${b.id}`}</td>
                <td className="px-3 py-2 text-xs">{b.bill_date}</td>
                <td className="px-3 py-2">{b.customer_name || "Walk-in"}</td>
                <td className="px-3 py-2">{b.purity_name || "—"}</td>
                <td className="px-3 py-2">{b.gold_rate ? `₹${Number(b.gold_rate).toLocaleString()}/g` : "—"}</td>
                <td className="px-3 py-2 font-semibold">{fmtAmt(b.grand_total)}</td>
                <td className="px-3 py-2"><SBadge status={b.status || "draft"} /></td>
                <td className="px-3 py-2">
                  <Button size="sm" variant="ghost" className="text-xs">View</Button>
                </td>
              </tr>
            ))}
            {bills.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No POS bills yet</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. BULLION VAULT MOVEMENT DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export function BullionVaultMovementSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ movement_date: today(), movement_type: "in", metal_type: "gold", status: "pending" });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const { data: movements = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/vault-movements"] });

  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/vault-movements", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/vault-movements"] });
      setShowForm(false);
      setForm({ movement_date: today(), movement_type: "in", metal_type: "gold", status: "pending" });
      toast({ title: "Vault movement recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Vault balance summary
  const balances: Record<string, number> = {};
  (movements as any[]).forEach((m: any) => {
    const key = `${m.metal_type}_${m.purity_name || ""}`;
    if (!balances[key]) balances[key] = 0;
    if (m.movement_type === "in") balances[key] += Number(m.weight_gm || 0);
    else if (m.movement_type === "out") balances[key] -= Number(m.weight_gm || 0);
  });

  return (
    <>
      <SH title="Bullion Vault Movement Dashboard" sub="Live vault balance and movement log across locations" action={
        <Button size="sm" onClick={() => setShowForm(true)} data-testid="button-add-vault-movement">
          <Plus className="h-4 w-4 mr-1" />Record Movement
        </Button>
      } />

      {/* Live balance cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {Object.entries(balances).map(([key, balance]) => {
          const [metal, purity] = key.split("_");
          return (
            <Card key={key}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground capitalize">{metal} {purity && `(${purity})`}</p>
                <p className={`text-lg font-bold ${balance < 0 ? "text-red-600" : "text-amber-600"}`}>{fmtWt(balance)}</p>
                <p className="text-xs text-muted-foreground">Current vault balance</p>
              </CardContent>
            </Card>
          );
        })}
        {Object.keys(balances).length === 0 && (
          <Card className="col-span-4">
            <CardContent className="p-6 text-center text-muted-foreground text-sm">No movements recorded yet</CardContent>
          </Card>
        )}
      </div>

      {/* Movement log */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>{["Date", "Type", "Metal", "Weight (g)", "From", "To", "Vehicle", "Driver", "Verified By", "Status", ""].map(h => (
              <th key={h} className="px-3 py-2 text-left text-xs font-medium">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {(movements as any[]).map((m: any) => (
              <tr key={m.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 text-xs">{m.movement_date}</td>
                <td className="px-3 py-2">
                  <Badge className={`text-xs capitalize ${m.movement_type === "in" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : m.movement_type === "out" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-blue-100 text-blue-700"}`}>
                    {m.movement_type}
                  </Badge>
                </td>
                <td className="px-3 py-2 capitalize">{m.metal_type}</td>
                <td className="px-3 py-2 font-semibold">{fmtWt(m.weight_gm)}</td>
                <td className="px-3 py-2 text-xs">{m.from_location || "—"}</td>
                <td className="px-3 py-2 text-xs">{m.to_location || "—"}</td>
                <td className="px-3 py-2 text-xs">{m.vehicle_no || "—"}</td>
                <td className="px-3 py-2 text-xs">{m.driver_name || "—"}</td>
                <td className="px-3 py-2 text-xs">{m.verified_by || "—"}</td>
                <td className="px-3 py-2"><SBadge status={m.status || "pending"} /></td>
                <td className="px-3 py-2">
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => { setForm({ ...m }); setShowForm(true); }}>Edit</Button>
                </td>
              </tr>
            ))}
            {movements.length === 0 && <tr><td colSpan={11} className="px-4 py-8 text-center text-muted-foreground">No vault movements</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Record Vault Movement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Date"><Input type="date" value={form.movement_date || today()} onChange={e => set("movement_date", e.target.value)} /></FieldRow>
              <FieldRow label="Movement Type">
                <Select value={form.movement_type || "in"} onValueChange={v => set("movement_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in">Inward</SelectItem>
                    <SelectItem value="out">Outward</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
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
              <FieldRow label="Purity"><Input value={form.purity_name || ""} onChange={e => set("purity_name", e.target.value)} placeholder="e.g. 995, 22K" /></FieldRow>
              <FieldRow label="Weight (g)"><Input data-testid="input-vault-weight" type="number" value={form.weight_gm || ""} onChange={e => set("weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="From Location"><Input value={form.from_location || ""} onChange={e => set("from_location", e.target.value)} placeholder="Branch / vault" /></FieldRow>
              <FieldRow label="To Location"><Input value={form.to_location || ""} onChange={e => set("to_location", e.target.value)} placeholder="Branch / vault" /></FieldRow>
              <FieldRow label="Vehicle No"><Input value={form.vehicle_no || ""} onChange={e => set("vehicle_no", e.target.value)} /></FieldRow>
              <FieldRow label="Driver Name"><Input value={form.driver_name || ""} onChange={e => set("driver_name", e.target.value)} /></FieldRow>
              <FieldRow label="Security Seal"><Input value={form.security_seal || ""} onChange={e => set("security_seal", e.target.value)} /></FieldRow>
              <FieldRow label="Escorted By"><Input value={form.escorted_by || ""} onChange={e => set("escorted_by", e.target.value)} /></FieldRow>
              <FieldRow label="Status">
                <Select value={form.status || "pending"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_transit">In Transit</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>
            <FieldRow label="Reason"><Textarea value={form.reason || ""} onChange={e => set("reason", e.target.value)} rows={2} /></FieldRow>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} data-testid="button-save-vault-movement">
                {saveMut.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
