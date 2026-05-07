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
import { Plus, CheckCircle, AlertTriangle, RefreshCw, Pencil } from "lucide-react";

const fmt = (n: any, d = 2) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: d });
const fmtWt = (n: any) => `${fmt(n, 3)} g`;
const fmtAmt = (n: any) => `₹${fmt(n)}`;
const today = () => new Date().toISOString().slice(0, 10);

function FieldRow({ label, children }: any) {
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
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    alert: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };
  return <Badge className={`text-xs capitalize ${cls[status] || "bg-muted text-muted-foreground"}`}>{status?.replace(/_/g, " ")}</Badge>;
}

// ── Sketch Process ────────────────────────────────────────────────────────────
export function SketchSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/production-orders"] });
  const { data: sketches = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/sketch"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/gold-erp/sketch/${editing.id}`, d) : apiRequest("POST", "/api/gold-erp/sketch", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/sketch"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Sketch saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SH title="Sketch Process" action={<Button size="sm" onClick={() => { setEditing(null); setForm({}); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" />Add Sketch</Button>} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Order No.", "Design", "Sketch URL", "Customer Approved", "Status", ""].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {(sketches as any[]).map((s: any) => (
              <tr key={s.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs text-muted-foreground">{s.order_no}</td>
                <td className="px-4 py-2">{s.design_name || "Custom"}</td>
                <td className="px-4 py-2">{s.sketch_image_url ? <a href={s.sketch_image_url} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">View</a> : "—"}</td>
                <td className="px-4 py-2">{s.customer_approval ? <CheckCircle className="h-4 w-4 text-green-500" /> : "—"}</td>
                <td className="px-4 py-2"><SBadge status={s.status} /></td>
                <td className="px-4 py-2 text-right"><Button size="icon" variant="ghost" onClick={() => { setEditing(s); setForm(s); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {sketches.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No sketch records</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Sketch" : "New Sketch Record"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editing && <FieldRow label="Production Order *">
              <Select value={form.production_order_id?.toString() || ""} onValueChange={v => set("production_order_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                <SelectContent>{(orders as any[]).map((o: any) => <SelectItem key={o.id} value={o.id.toString()}>{o.order_no}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>}
            <FieldRow label="Customer Brief"><Textarea value={form.customer_brief || ""} onChange={e => set("customer_brief", e.target.value)} rows={3} /></FieldRow>
            <FieldRow label="Sketch Image URL"><Input value={form.sketch_image_url || ""} onChange={e => set("sketch_image_url", e.target.value)} placeholder="https://…" /></FieldRow>
            <FieldRow label="Design Category"><Input value={form.design_category || ""} onChange={e => set("design_category", e.target.value)} placeholder="Ring, Necklace…" /></FieldRow>
            {editing && <>
              <FieldRow label="Status">
                <Select value={form.status || "pending"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pending">Pending</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="approved">Approved</SelectItem></SelectContent>
                </Select>
              </FieldRow>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={!!form.customer_approval} onChange={e => set("customer_approval", e.target.checked ? 1 : 0)} id="capp" />
                <Label htmlFor="capp" className="text-sm">Customer Approved</Label>
              </div>
              <FieldRow label="Revision Notes"><Textarea value={form.revision_notes || ""} onChange={e => set("revision_notes", e.target.value)} rows={2} /></FieldRow>
            </>}
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

// ── CAD Process ───────────────────────────────────────────────────────────────
export function CADSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/production-orders"] });
  const { data: cadList = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/cad"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => editing ? apiRequest("PUT", `/api/gold-erp/cad/${editing.id}`, d) : apiRequest("POST", "/api/gold-erp/cad", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/cad"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "CAD record saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SH title="CAD / Design Process" action={<Button size="sm" onClick={() => { setEditing(null); setForm({}); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" />Add CAD</Button>} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Order", "Software", "Wt Estimate", "Revisions", "Customer OK", "Status", ""].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {(cadList as any[]).map((c: any) => (
              <tr key={c.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs">{c.order_no}</td>
                <td className="px-4 py-2">{c.cad_software || "—"}</td>
                <td className="px-4 py-2">{c.weight_estimate_gm ? fmtWt(c.weight_estimate_gm) : "—"}</td>
                <td className="px-4 py-2 text-center">{c.revision_count || 0}</td>
                <td className="px-4 py-2">{c.customer_approval ? <CheckCircle className="h-4 w-4 text-green-500" /> : "—"}</td>
                <td className="px-4 py-2"><SBadge status={c.status} /></td>
                <td className="px-4 py-2"><Button size="icon" variant="ghost" onClick={() => { setEditing(c); setForm(c); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {cadList.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No CAD records</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update CAD" : "New CAD Record"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editing && <FieldRow label="Production Order">
              <Select value={form.production_order_id?.toString() || ""} onValueChange={v => set("production_order_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                <SelectContent>{(orders as any[]).map((o: any) => <SelectItem key={o.id} value={o.id.toString()}>{o.order_no}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>}
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="CAD Software"><Input value={form.cad_software || ""} onChange={e => set("cad_software", e.target.value)} placeholder="RhinoGold, JewelCAD…" /></FieldRow>
              <FieldRow label="Weight Estimate (g)"><Input type="number" value={form.weight_estimate_gm || ""} onChange={e => set("weight_estimate_gm", e.target.value)} /></FieldRow>
            </div>
            <FieldRow label="CAD File URL"><Input value={form.cad_file_url || ""} onChange={e => set("cad_file_url", e.target.value)} /></FieldRow>
            <FieldRow label="Render Image URL"><Input value={form.render_image_url || ""} onChange={e => set("render_image_url", e.target.value)} /></FieldRow>
            {editing && <>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Status">
                  <Select value={form.status || "in_progress"} onValueChange={v => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="approved">Approved</SelectItem></SelectContent>
                  </Select>
                </FieldRow>
                <FieldRow label="Revisions"><Input type="number" value={form.revision_count || 0} onChange={e => set("revision_count", e.target.value)} /></FieldRow>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={!!form.customer_approval} onChange={e => set("customer_approval", e.target.checked ? 1 : 0)} id="cad-capp" />
                <Label htmlFor="cad-capp" className="text-sm">Customer Approved</Label>
              </div>
            </>}
            <FieldRow label="Notes"><Textarea value={form.design_notes || ""} onChange={e => set("design_notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Ghat Entries ──────────────────────────────────────────────────────────────
export function GhatSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ stage_name: "Casting", weigh_date: today() });
  const { data: entries = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/ghat-entries"] });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/production-orders"] });
  const { data: karigars = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigars"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/ghat-entries", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/ghat-entries"] }); setShowForm(false); setForm({ stage_name: "Casting", weigh_date: today() }); toast({ title: "Ghat entry saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SH title="Ghat / Weight Verification" action={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Add Entry</Button>} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Order", "Stage", "Issued (g)", "Received (g)", "Wastage (g)", "Wastage %", "Alert", "Date"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {(entries as any[]).map((e: any) => (
              <tr key={e.id} className={`border-t hover:bg-muted/30 ${e.alert_flag ? "bg-red-50 dark:bg-red-900/10" : ""}`}>
                <td className="px-4 py-2 text-xs">{e.order_no}</td>
                <td className="px-4 py-2">{e.stage_name}</td>
                <td className="px-4 py-2">{fmtWt(e.issued_weight_gm)}</td>
                <td className="px-4 py-2">{fmtWt(e.received_weight_gm)}</td>
                <td className="px-4 py-2 font-semibold text-red-600">{fmtWt(e.wastage_gm)}</td>
                <td className="px-4 py-2">{Number(e.wastage_pct || 0).toFixed(2)}%</td>
                <td className="px-4 py-2">{e.alert_flag ? <AlertTriangle className="h-4 w-4 text-red-500" /> : "—"}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{e.weigh_date}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No ghat entries</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Ghat / Weight Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Production Order">
              <Select value={form.production_order_id?.toString() || ""} onValueChange={v => set("production_order_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                <SelectContent>{(orders as any[]).map((o: any) => <SelectItem key={o.id} value={o.id.toString()}>{o.order_no}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Stage">
              <Select value={form.stage_name || "Casting"} onValueChange={v => set("stage_name", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Sketch","CAD","CAM","Casting","Filing","Polish","Finishing","QC","Settlement"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Karigar">
              <Select value={form.karigar_id?.toString() || ""} onValueChange={v => set("karigar_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select karigar" /></SelectTrigger>
                <SelectContent>{(karigars as any[]).map((k: any) => <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Issued (g)"><Input type="number" value={form.issued_weight_gm || ""} onChange={e => set("issued_weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Received (g)"><Input type="number" value={form.received_weight_gm || ""} onChange={e => set("received_weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Assay Purity %"><Input type="number" value={form.assay_purity_pct || ""} onChange={e => set("assay_purity_pct", e.target.value)} /></FieldRow>
              <FieldRow label="Date"><Input type="date" value={form.weigh_date || today()} onChange={e => set("weigh_date", e.target.value)} /></FieldRow>
            </div>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save Entry</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Settlement ────────────────────────────────────────────────────────────────
export function SettlementSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ allowable_wastage_pct: 3, settlement_date: today() });
  const { data: settlements = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/settlements"] });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/production-orders"] });
  const { data: karigars = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigars"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const calcSettlement = () => {
    const issued = Number(form.gold_issued_gm || 0);
    const received = Number(form.gold_received_gm || 0);
    const actual_wastage = issued - received;
    const allowable = issued * Number(form.allowable_wastage_pct || 3) / 100;
    const excess = Math.max(0, actual_wastage - allowable);
    const rate = Number(form.gold_rate || 0);
    const excess_deduction = excess * rate;
    const wage = Number(form.wage_amount || 0);
    const net = wage - excess_deduction;
    setForm((p: any) => ({ ...p, actual_wastage_gm: actual_wastage.toFixed(3), excess_wastage_gm: excess.toFixed(3), excess_deduction: excess_deduction.toFixed(2), net_payable: net.toFixed(2) }));
  };

  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/settlements", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/settlements"] }); setShowForm(false); setForm({ allowable_wastage_pct: 3, settlement_date: today() }); toast({ title: "Settlement recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SH title="Karigar Settlement" action={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />New Settlement</Button>} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Order", "Karigar", "Issued", "Received", "Excess Wastage", "Wage", "Deduction", "Net Payable", "Date"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {(settlements as any[]).map((s: any) => (
              <tr key={s.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs">{s.order_no}</td>
                <td className="px-4 py-2">{s.karigar_name}</td>
                <td className="px-4 py-2">{fmtWt(s.gold_issued_gm)}</td>
                <td className="px-4 py-2">{fmtWt(s.gold_received_gm)}</td>
                <td className="px-4 py-2 text-red-600">{fmtWt(s.excess_wastage_gm)}</td>
                <td className="px-4 py-2">{fmtAmt(s.wage_amount)}</td>
                <td className="px-4 py-2 text-red-600">-{fmtAmt(s.excess_deduction)}</td>
                <td className="px-4 py-2 font-bold text-green-700">{fmtAmt(s.net_payable)}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{s.settlement_date}</td>
              </tr>
            ))}
            {settlements.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No settlements</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Karigar Settlement</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Production Order">
                <Select value={form.production_order_id?.toString() || ""} onValueChange={v => set("production_order_id", parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                  <SelectContent>{(orders as any[]).map((o: any) => <SelectItem key={o.id} value={o.id.toString()}>{o.order_no}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Karigar">
                <Select value={form.karigar_id?.toString() || ""} onValueChange={v => set("karigar_id", parseInt(v))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{(karigars as any[]).map((k: any) => <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Gold Issued (g)"><Input type="number" value={form.gold_issued_gm || ""} onChange={e => set("gold_issued_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Gold Received (g)"><Input type="number" value={form.gold_received_gm || ""} onChange={e => set("gold_received_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Allowable Wastage %"><Input type="number" value={form.allowable_wastage_pct || 3} onChange={e => set("allowable_wastage_pct", e.target.value)} /></FieldRow>
              <FieldRow label="Gold Rate (₹/g)"><Input type="number" value={form.gold_rate || ""} onChange={e => set("gold_rate", e.target.value)} /></FieldRow>
              <FieldRow label="Wage Amount (₹)"><Input type="number" value={form.wage_amount || ""} onChange={e => set("wage_amount", e.target.value)} /></FieldRow>
              <FieldRow label="Settlement Date"><Input type="date" value={form.settlement_date || today()} onChange={e => set("settlement_date", e.target.value)} /></FieldRow>
            </div>
            <Button variant="outline" className="w-full" onClick={calcSettlement}><RefreshCw className="h-4 w-4 mr-2" />Calculate Settlement</Button>
            {form.net_payable && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between"><span>Actual Wastage</span><span className="text-red-600">{fmtWt(form.actual_wastage_gm)}</span></div>
                <div className="flex justify-between"><span>Excess Wastage</span><span className="text-red-600">{fmtWt(form.excess_wastage_gm)}</span></div>
                <div className="flex justify-between"><span>Wage</span><span>{fmtAmt(form.wage_amount)}</span></div>
                <div className="flex justify-between"><span>Excess Deduction</span><span className="text-red-600">-{fmtAmt(form.excess_deduction)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Net Payable</span><span className="text-green-700">{fmtAmt(form.net_payable)}</span></div>
              </div>
            )}
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Record Settlement</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Job Finalize ──────────────────────────────────────────────────────────────
export function JobFinalizeSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ finalize_date: today() });
  const { data: finalizes = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/finalize"] });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/production-orders"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/finalize", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/finalize"] }); setShowForm(false); setForm({ finalize_date: today() }); toast({ title: "Job finalized — moved to stock" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SH title="Job Finalize & Barcode / HUID" action={<Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Finalize Job</Button>} />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Order", "Final Wt", "HUID", "Barcode", "QC Passed", "Moved to Stock", "Date"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {(finalizes as any[]).map((f: any) => (
              <tr key={f.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs">{f.order_no}</td>
                <td className="px-4 py-2">{fmtWt(f.final_weight_gm)}</td>
                <td className="px-4 py-2 font-mono text-xs text-blue-600">{f.huid_no || "—"}</td>
                <td className="px-4 py-2 font-mono text-xs">{f.barcode || "—"}</td>
                <td className="px-4 py-2">{f.qc_passed ? <CheckCircle className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}</td>
                <td className="px-4 py-2">{f.moved_to_stock ? <CheckCircle className="h-4 w-4 text-green-500" /> : "—"}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{f.finalize_date}</td>
              </tr>
            ))}
            {finalizes.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No finalized jobs</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Finalize Production Job</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Production Order">
              <Select value={form.production_order_id?.toString() || ""} onValueChange={v => set("production_order_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select order" /></SelectTrigger>
                <SelectContent>{(orders as any[]).map((o: any) => <SelectItem key={o.id} value={o.id.toString()}>{o.order_no}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Final Weight (g)"><Input type="number" value={form.final_weight_gm || ""} onChange={e => set("final_weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="HUID No."><Input value={form.huid_no || ""} onChange={e => set("huid_no", e.target.value)} placeholder="Auto or manual" /></FieldRow>
              <FieldRow label="Barcode"><Input value={form.barcode || ""} onChange={e => set("barcode", e.target.value)} /></FieldRow>
              <FieldRow label="RFID Tag"><Input value={form.rfid_tag || ""} onChange={e => set("rfid_tag", e.target.value)} /></FieldRow>
              <FieldRow label="Finalize Date"><Input type="date" value={form.finalize_date || today()} onChange={e => set("finalize_date", e.target.value)} /></FieldRow>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><input type="checkbox" checked={!!form.stone_setting_done} onChange={e => set("stone_setting_done", e.target.checked ? 1 : 0)} id="sts" /><Label htmlFor="sts" className="text-sm">Stone Setting Done</Label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={!!form.qc_passed} onChange={e => set("qc_passed", e.target.checked ? 1 : 0)} id="qcp" /><Label htmlFor="qcp" className="text-sm">QC Passed</Label></div>
              <div className="flex items-center gap-2"><input type="checkbox" checked={!!form.moved_to_stock} onChange={e => set("moved_to_stock", e.target.checked ? 1 : 0)} id="mts" /><Label htmlFor="mts" className="text-sm">Move to Stock</Label></div>
            </div>
            <FieldRow label="QC Notes"><Textarea value={form.qc_notes || ""} onChange={e => set("qc_notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Finalize</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Karigar Material Ledger ───────────────────────────────────────────────────
export function KarigarLedgerSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [filterKarigar, setFilterKarigar] = useState("");
  const [form, setForm] = useState<any>({ txn_type: "issue", metal_type: "gold", txn_date: today() });
  const { data: ledger = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigar-ledger"] });
  const { data: karigars = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/karigars"] });
  const { data: orders = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/production-orders"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/karigar-ledger", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/karigar-ledger"] }); setShowForm(false); setForm({ txn_type: "issue", metal_type: "gold", txn_date: today() }); toast({ title: "Ledger entry saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = (ledger as any[]).filter(l => !filterKarigar || l.karigar_name?.toLowerCase().includes(filterKarigar.toLowerCase()));

  return (
    <>
      <SH title="Karigar Material Ledger" action={
        <div className="flex items-center gap-2">
          <Input className="w-40" placeholder="Filter karigar…" value={filterKarigar} onChange={e => setFilterKarigar(e.target.value)} />
          <Button size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Add Entry</Button>
        </div>
      } />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Karigar", "Order", "Type", "Metal", "Weight (g)", "Date", "Notes"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((l: any) => (
              <tr key={l.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 font-medium">{l.karigar_name}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{l.order_no || "—"}</td>
                <td className="px-4 py-2"><Badge className={`text-xs ${l.txn_type === "issue" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{l.txn_type}</Badge></td>
                <td className="px-4 py-2 capitalize">{l.metal_type}</td>
                <td className="px-4 py-2 font-semibold">{fmtWt(l.weight_gm)}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{l.txn_date}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{l.notes || "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No ledger entries</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Karigar Material Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Karigar *">
              <Select value={form.karigar_id?.toString() || ""} onValueChange={v => set("karigar_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Select karigar" /></SelectTrigger>
                <SelectContent>{(karigars as any[]).map((k: any) => <SelectItem key={k.id} value={k.id.toString()}>{k.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Production Order">
              <Select value={form.production_order_id?.toString() || ""} onValueChange={v => set("production_order_id", parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>{(orders as any[]).map((o: any) => <SelectItem key={o.id} value={o.id.toString()}>{o.order_no}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Type">
                <Select value={form.txn_type || "issue"} onValueChange={v => set("txn_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="issue">Issue</SelectItem><SelectItem value="return">Return</SelectItem><SelectItem value="wastage">Wastage</SelectItem></SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Metal">
                <Select value={form.metal_type || "gold"} onValueChange={v => set("metal_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem></SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Weight (g)"><Input type="number" value={form.weight_gm || ""} onChange={e => set("weight_gm", e.target.value)} /></FieldRow>
              <FieldRow label="Date"><Input type="date" value={form.txn_date || today()} onChange={e => set("txn_date", e.target.value)} /></FieldRow>
            </div>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={2} /></FieldRow>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
