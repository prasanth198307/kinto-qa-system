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
import { Plus, Pencil, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const fmt = (n: any, d = 2) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: d });
const fmtWt = (n: any) => `${fmt(n, 3)} g`;
const fmtAmt = (n: any) => `${sym}${fmt(n)}`;
const today = () => new Date().toISOString().slice(0, 10);

function FL({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function SH({ title, action }: any) {
  return <div className="flex items-center justify-between gap-2 flex-wrap mb-4"><h2 className="text-lg font-semibold">{title}</h2>{action}</div>;
}
function SBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    booked: "bg-blue-100 text-blue-700", delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700", in_progress: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
  };
  return <Badge className={`text-xs capitalize ${cls[status] || "bg-muted text-muted-foreground"}`}>{status?.replace(/_/g, " ")}</Badge>;
}

// ── Bullion Bookings ──────────────────────────────────────────────────────────
export function BullionBookingsSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ party_type: "supplier", metal_type: "gold", form_type: "bar", payment_terms: "advance", delivery_type: "physical" });
  const { data: bookings = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/bullion-bookings"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const amount = Number(form.weight_gm || 0) * Number(form.rate_per_gram || 0);
  const gst = amount * 0.03;

  const saveMut = useMutation({
    mutationFn: (d: any) => editing
      ? apiRequest("PUT", `/api/gold-erp/bullion-bookings/${editing.id}`, d)
      : apiRequest("POST", "/api/gold-erp/bullion-bookings", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/bullion-bookings"] });
      setShowForm(false); setEditing(null);
      setForm({ party_type: "supplier", metal_type: "gold", form_type: "bar", payment_terms: "advance", delivery_type: "physical" });
      toast({ title: "Bullion booking saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SH title="Bullion Bookings" action={
        <Button size="sm" data-testid="button-new-bullion-booking" onClick={() => { setEditing(null); setForm({ party_type: "supplier", metal_type: "gold", form_type: "bar", payment_terms: "advance", delivery_type: "physical" }); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />New Booking
        </Button>
      } />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["No.", "Party", "Type", "Metal / Form", "Weight", "Rate", "Amount", "Status", "Delivery", ""].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {(bookings as any[]).map((b: any) => (
              <tr key={b.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 text-xs text-muted-foreground">{b.booking_no}</td>
                <td className="px-4 py-2"><p className="font-medium">{b.party_name}</p><p className="text-xs capitalize text-muted-foreground">{b.party_type}</p></td>
                <td className="px-4 py-2"><Badge className="text-xs capitalize">{b.delivery_type}</Badge></td>
                <td className="px-4 py-2 text-xs capitalize">{b.metal_type} · {b.form_type}{b.fineness ? ` · ${b.fineness}` : ""}</td>
                <td className="px-4 py-2">{fmtWt(b.weight_gm)}</td>
                <td className="px-4 py-2">{fmtAmt(b.rate_per_gram)}/g</td>
                <td className="px-4 py-2 font-semibold">{fmtAmt(b.amount)}</td>
                <td className="px-4 py-2"><SBadge status={b.status} /></td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{b.expected_delivery || "—"}</td>
                <td className="px-4 py-2"><Button size="icon" variant="ghost" onClick={() => { setEditing(b); setForm(b); setShowForm(true); }}><Pencil className="h-4 w-4" /></Button></td>
              </tr>
            ))}
            {bookings.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No bullion bookings</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Booking" : "New Bullion Booking"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editing && <>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Party Type">
                  <Select value={form.party_type || "supplier"} onValueChange={v => set("party_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="supplier">Supplier</SelectItem><SelectItem value="customer">Customer</SelectItem><SelectItem value="refinery">Refinery</SelectItem></SelectContent>
                  </Select>
                </FL>
                <FL label="Party Name *"><Input data-testid="input-booking-party" value={form.party_name || ""} onChange={e => set("party_name", e.target.value)} /></FL>
                <FL label="Metal">
                  <Select value={form.metal_type || "gold"} onValueChange={v => set("metal_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="platinum">Platinum</SelectItem></SelectContent>
                  </Select>
                </FL>
                <FL label="Form">
                  <Select value={form.form_type || "bar"} onValueChange={v => set("form_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="bar">Bar</SelectItem><SelectItem value="coin">Coin</SelectItem><SelectItem value="granule">Granule</SelectItem><SelectItem value="dore">Dore</SelectItem></SelectContent>
                  </Select>
                </FL>
                <FL label="Fineness"><Input value={form.fineness || ""} onChange={e => set("fineness", e.target.value)} placeholder="999.9 / 995" /></FL>
                <FL label="Weight (g)"><Input data-testid="input-booking-weight" type="number" value={form.weight_gm || ""} onChange={e => set("weight_gm", e.target.value)} /></FL>
                <FL label="Rate/g (${sym})"><Input data-testid="input-booking-rate" type="number" value={form.rate_per_gram || ""} onChange={e => set("rate_per_gram", e.target.value)} /></FL>
                <FL label="Payment Terms">
                  <Select value={form.payment_terms || "advance"} onValueChange={v => set("payment_terms", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="advance">Advance</SelectItem><SelectItem value="on_delivery">On Delivery</SelectItem><SelectItem value="credit_15">Credit 15 days</SelectItem><SelectItem value="credit_30">Credit 30 days</SelectItem></SelectContent>
                  </Select>
                </FL>
                <FL label="Delivery Type">
                  <Select value={form.delivery_type || "physical"} onValueChange={v => set("delivery_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="physical">Physical</SelectItem><SelectItem value="vault">Vault</SelectItem><SelectItem value="mcx">MCX</SelectItem></SelectContent>
                  </Select>
                </FL>
                <FL label="Expected Delivery"><Input type="date" value={form.expected_delivery || ""} onChange={e => set("expected_delivery", e.target.value)} /></FL>
              </div>
              {form.weight_gm && form.rate_per_gram && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span>Amount</span><span>{fmtAmt(amount)}</span></div>
                  <div className="flex justify-between"><span>GST @3%</span><span>{fmtAmt(gst)}</span></div>
                  <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span>{fmtAmt(amount + gst)}</span></div>
                </div>
              )}
            </>}
            {editing && <>
              <FL label="Status">
                <Select value={form.status || "booked"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="booked">Booked</SelectItem><SelectItem value="in_transit">In Transit</SelectItem><SelectItem value="delivered">Delivered</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
                </Select>
              </FL>
              <div className="grid grid-cols-2 gap-3">
                <FL label="Actual Delivery"><Input type="date" value={form.actual_delivery || ""} onChange={e => set("actual_delivery", e.target.value)} /></FL>
                <FL label="Received Weight (g)"><Input type="number" value={form.received_weight_gm || ""} onChange={e => set("received_weight_gm", e.target.value)} /></FL>
                <FL label="Assay Cert No."><Input value={form.assay_cert_no || ""} onChange={e => set("assay_cert_no", e.target.value)} /></FL>
              </div>
            </>}
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button data-testid="button-save-bullion-booking" onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Vault Audit ───────────────────────────────────────────────────────────────
export function VaultAuditSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ audit_date: today(), location: "main_vault" });
  const { data: audits = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/vault-audits"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => editing
      ? apiRequest("PUT", `/api/gold-erp/vault-audits/${editing.id}`, d)
      : apiRequest("POST", "/api/gold-erp/vault-audits", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/vault-audits"] });
      setShowForm(false); setEditing(null); setForm({ audit_date: today(), location: "main_vault" });
      toast({ title: "Vault audit saved" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <>
      <SH title="Vault Audit" action={
        <Button size="sm" data-testid="button-start-vault-audit" onClick={() => { setEditing(null); setForm({ audit_date: today(), location: "main_vault" }); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-1" />Start Vault Audit
        </Button>
      } />
      <div className="space-y-3">
        {(audits as any[]).map((a: any) => (
          <Card key={a.id} className={a.discrepancy_gm && Number(a.discrepancy_gm) !== 0 ? "border-red-200 dark:border-red-800" : ""}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold">{a.audit_no} <span className="text-xs text-muted-foreground ml-2">{a.audit_date}</span></p>
                  <p className="text-xs text-muted-foreground">{a.auditor_1}{a.auditor_2 ? ` & ${a.auditor_2}` : ""} · {a.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  {a.seal_intact ? <Badge className="bg-green-100 text-green-700 text-xs"><Shield className="h-3 w-3 mr-1" />Seal Intact</Badge> : <Badge className="bg-red-100 text-red-700 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />Seal Broken</Badge>}
                  <SBadge status={a.status} />
                </div>
              </div>
              {a.total_system_gm !== null && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs">
                  <div><span className="text-muted-foreground">System: </span>{fmtWt(a.total_system_gm)}</div>
                  <div><span className="text-muted-foreground">Physical: </span>{fmtWt(a.total_physical_gm)}</div>
                  <div className={`font-semibold ${Number(a.discrepancy_gm) < 0 ? "text-red-600" : Number(a.discrepancy_gm) > 0 ? "text-amber-600" : "text-green-600"}`}>
                    Discrepancy: {Number(a.discrepancy_gm) > 0 ? "+" : ""}{fmtWt(a.discrepancy_gm)}
                  </div>
                </div>
              )}
              {a.tamper_evidence && <p className="text-xs text-red-600 mt-1">Tamper Evidence: {a.tamper_evidence}</p>}
              <Button size="sm" variant="outline" className="mt-3" onClick={() => { setEditing(a); setForm(a); setShowForm(true); }}>
                <Pencil className="h-3 w-3 mr-1" />Update
              </Button>
            </CardContent>
          </Card>
        ))}
        {audits.length === 0 && <p className="text-center text-muted-foreground py-8">No vault audits on record</p>}
      </div>
      <Dialog open={showForm} onOpenChange={v => { setShowForm(v); if (!v) setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Update Vault Audit" : "Start Vault Audit"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editing && <div className="grid grid-cols-2 gap-3">
              <FL label="Audit Date"><Input type="date" value={form.audit_date || today()} onChange={e => set("audit_date", e.target.value)} /></FL>
              <FL label="Location"><Input data-testid="input-vault-audit-location" value={form.location || "main_vault"} onChange={e => set("location", e.target.value)} /></FL>
              <FL label="Auditor 1"><Input data-testid="input-vault-audit-auditor1" value={form.auditor_1 || ""} onChange={e => set("auditor_1", e.target.value)} /></FL>
              <FL label="Auditor 2"><Input value={form.auditor_2 || ""} onChange={e => set("auditor_2", e.target.value)} /></FL>
              <FL label="Manager"><Input value={form.manager_name || ""} onChange={e => set("manager_name", e.target.value)} /></FL>
              <FL label="Next Audit Date"><Input type="date" value={form.next_audit_date || ""} onChange={e => set("next_audit_date", e.target.value)} /></FL>
            </div>}
            {editing && <>
              <FL label="Status">
                <Select value={form.status || "in_progress"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="discrepancy">Discrepancy Found</SelectItem></SelectContent>
                </Select>
              </FL>
              <div className="grid grid-cols-2 gap-3">
                <FL label="System Total (g)"><Input type="number" value={form.total_system_gm || 0} onChange={e => set("total_system_gm", e.target.value)} /></FL>
                <FL label="Physical Total (g)"><Input type="number" value={form.total_physical_gm || 0} onChange={e => set("total_physical_gm", e.target.value)} /></FL>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2"><input type="checkbox" checked={!!form.seal_intact} onChange={e => set("seal_intact", e.target.checked ? 1 : 0)} id="seal" /><Label htmlFor="seal" className="text-sm">Seal Intact</Label></div>
                <div className="flex items-center gap-2"><input type="checkbox" checked={!!form.signed_off} onChange={e => set("signed_off", e.target.checked ? 1 : 0)} id="signoff" /><Label htmlFor="signoff" className="text-sm">Signed Off</Label></div>
              </div>
              <FL label="Tamper Evidence"><Textarea value={form.tamper_evidence || ""} onChange={e => set("tamper_evidence", e.target.value)} rows={2} /></FL>
            </>}
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button data-testid="button-save-vault-audit" onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
