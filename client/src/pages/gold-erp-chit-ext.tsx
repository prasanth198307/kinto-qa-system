import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Phone, MessageSquare, AlertTriangle, CheckCircle, Gift } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const fmt = (n: any, d = 2) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: d });
  const { currency_symbol: sym } = useTenantConfig();
const fmtAmt = (n: any) => `${sym}${fmt(n)}`;
const fmtWt = (n: any) => `${fmt(n, 3)} g`;
const today = () => new Date().toISOString().slice(0, 10);

function FL({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function SH({ title, action }: any) {
  return <div className="flex items-center justify-between gap-2 flex-wrap mb-4"><h2 className="text-lg font-semibold">{title}</h2>{action}</div>;
}

// ── Chit Maturity ─────────────────────────────────────────────────────────────
export function ChitMaturitySection() {
  const { data: members = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/chit-maturity"] });
  const today_str = today();

  const upcoming = (members as any[]).filter(m => m.maturity_date && m.maturity_date >= today_str && m.status !== "matured");
  const matured = (members as any[]).filter(m => m.maturity_date && m.maturity_date < today_str && m.status !== "matured");

  return (
    <>
      <SH title="Chit Scheme Maturity" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Upcoming Maturity</p><p className="text-2xl font-bold text-amber-700">{upcoming.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Matured (Pending)</p><p className="text-2xl font-bold text-red-600">{matured.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-xs text-muted-foreground">Total Members</p><p className="text-2xl font-bold">{members.length}</p></CardContent></Card>
      </div>

      {matured.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-1"><AlertTriangle className="h-4 w-4" />Overdue — Awaiting Redemption</h3>
          <div className="space-y-2">
            {matured.map((m: any) => (
              <div key={m.id} className="border border-red-200 dark:border-red-800 rounded-lg p-3 bg-red-50/50 dark:bg-red-900/10">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold">{m.member_name} <span className="text-xs text-muted-foreground ml-2">{m.member_code}</span></p>
                    <p className="text-xs text-muted-foreground">{m.phone} · {m.scheme_name}</p>
                    <p className="text-xs mt-0.5">Matured: <span className="font-medium">{m.maturity_date}</span> · {m.installments_paid} installments · {fmtAmt(m.total_paid)} paid</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">{fmtAmt(Number(m.total_paid) + Number(m.monthly_amount || 0))}</p>
                    <p className="text-xs text-muted-foreground">incl. bonus month</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 className="text-sm font-semibold mb-3">Upcoming Maturities</h3>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Member", "Phone", "Scheme", "Installments Paid", "Total Paid", "Maturity Date", "Status"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {upcoming.map((m: any) => {
              const daysLeft = Math.ceil((new Date(m.maturity_date).getTime() - Date.now()) / 86400000);
              return (
                <tr key={m.id} className={`border-t hover:bg-muted/30 ${daysLeft <= 30 ? "bg-amber-50/50 dark:bg-amber-900/5" : ""}`}>
                  <td className="px-4 py-2 font-medium">{m.member_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{m.phone}</td>
                  <td className="px-4 py-2 text-xs">{m.scheme_name}</td>
                  <td className="px-4 py-2 text-center">{m.installments_paid}/{m.duration_months}</td>
                  <td className="px-4 py-2">{fmtAmt(m.total_paid)}</td>
                  <td className="px-4 py-2 text-xs">{m.maturity_date}</td>
                  <td className="px-4 py-2">{daysLeft <= 30 ? <Badge className="bg-amber-100 text-amber-700 text-xs">{daysLeft}d left</Badge> : <span className="text-xs text-muted-foreground">{daysLeft} days</span>}</td>
                </tr>
              );
            })}
            {upcoming.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No upcoming maturities</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Chit Defaulters ───────────────────────────────────────────────────────────
export function ChitDefaultersSection() {
  const { toast } = useToast();
  const [showActionForm, setShowActionForm] = useState(false);
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [form, setForm] = useState<any>({ action_type: "call", action_date: today() });
  const { data: defaulters = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/chit-defaulters"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const actionMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/chit-defaulter-actions", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/chit-defaulters"] });
      setShowActionForm(false); setSelectedMember(null); setForm({ action_type: "call", action_date: today() });
      toast({ title: "Follow-up action recorded" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const actionIcon = (t: string) => ({ call: <Phone className="h-3 w-3" />, whatsapp: <MessageSquare className="h-3 w-3" />, visit: <AlertTriangle className="h-3 w-3" />, legal: <AlertTriangle className="h-3 w-3" /> }[t] || null);

  return (
    <>
      <SH title="Chit Defaulters Management" />
      {defaulters.length === 0 && (
        <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
          <CheckCircle className="h-10 w-10 text-green-500" />
          <p className="font-medium">No defaulters found — all members on track!</p>
        </div>
      )}
      <div className="space-y-3">
        {(defaulters as any[]).map((d: any) => (
          <Card key={d.id} className="border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="font-semibold">{d.member_name} <Badge className="bg-red-100 text-red-700 text-xs ml-2">Defaulter</Badge></p>
                  <p className="text-xs text-muted-foreground">{d.phone} · {d.scheme_name} · {fmtAmt(d.monthly_amount)}/month</p>
                  <p className="text-xs mt-0.5">
                    <span className="font-medium">{d.installments_paid}</span> installments paid ·
                    <span className="font-medium text-red-600 ml-1">{d.action_count || 0}</span> follow-up actions
                  </p>
                </div>
                <Button size="sm" onClick={() => { setSelectedMember(d); setForm({ action_type: "call", action_date: today(), member_id: d.id }); setShowActionForm(true); }}>
                  <Phone className="h-4 w-4 mr-1" />Follow Up
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={showActionForm} onOpenChange={v => { setShowActionForm(v); if (!v) setSelectedMember(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Follow-up Action — {selectedMember?.member_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FL label="Action Type">
              <Select value={form.action_type || "call"} onValueChange={v => set("action_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="visit">Physical Visit</SelectItem>
                  <SelectItem value="legal">Legal Notice</SelectItem>
                </SelectContent>
              </Select>
            </FL>
            <FL label="Date"><Input type="date" value={form.action_date || today()} onChange={e => set("action_date", e.target.value)} /></FL>
            <FL label="Notes"><Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={3} placeholder="Outcome of the action…" /></FL>
            <FL label="Next Follow-up Date"><Input type="date" value={form.next_followup_date || ""} onChange={e => set("next_followup_date", e.target.value)} /></FL>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowActionForm(false)}>Cancel</Button>
              <Button onClick={() => actionMut.mutate({ ...form, member_id: selectedMember?.id })} disabled={actionMut.isPending}>Record Action</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Chit Redemptions ──────────────────────────────────────────────────────────
export function ChitRedemptionsSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ redemption_type: "gold", redemption_date: today() });
  const { data: redemptions = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/chit-redemptions"] });
  const { data: allMembers = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/chit-members"] });
  const { data: maturedMembers = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/chit-maturity"] });
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/chit-redemptions", d),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/chit-redemptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/chit-maturity"] });
      setShowForm(false); setForm({ redemption_type: "gold", redemption_date: today() });
      toast({ title: "Redemption processed" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const eligible = (maturedMembers as any[]).filter(m => m.status !== "matured");
  const selectableMembers = eligible.length > 0 ? eligible : (allMembers as any[]);

  return (
    <>
      <SH title="Chit Redemptions" action={
        <Button size="sm" onClick={() => setShowForm(true)} data-testid="button-add-redemption">
          <Gift className="h-4 w-4 mr-1" />Process Redemption
        </Button>
      } />
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr>{["Member", "Scheme", "Type", "Total Paid", "Bonus", "TDS", "Net Redeemable", "Date", "Status"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {(redemptions as any[]).map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 font-medium">{r.member_name}</td>
                <td className="px-4 py-2 text-xs">{r.scheme_name}</td>
                <td className="px-4 py-2 capitalize text-xs">{r.redemption_type}</td>
                <td className="px-4 py-2">{fmtAmt(r.total_paid)}</td>
                <td className="px-4 py-2 text-green-700">+{fmtAmt(r.bonus_amount)}</td>
                <td className="px-4 py-2 text-red-600">-{fmtAmt(r.tds_deducted)}</td>
                <td className="px-4 py-2 font-bold">{fmtAmt(r.total_redeemable)}</td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{r.redemption_date}</td>
                <td className="px-4 py-2"><Badge className="bg-green-100 text-green-700 text-xs">{r.status}</Badge></td>
              </tr>
            ))}
            {redemptions.length === 0 && <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">No redemptions processed</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Process Chit Redemption</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FL label="Member *">
              <Select value={form.member_id?.toString() || ""} onValueChange={v => {
                const m = selectableMembers.find((e: any) => e.id.toString() === v);
                set("member_id", parseInt(v));
                if (m) set("scheme_id", m.scheme_id);
              }}>
                <SelectTrigger data-testid="select-redemption-member"><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>{selectableMembers.map((m: any) => <SelectItem key={m.id} value={m.id.toString()}>{m.member_name} — {m.scheme_name || m.name || `Scheme #${m.scheme_id}`}</SelectItem>)}</SelectContent>
              </Select>
            </FL>
            <FL label="Redemption Type">
              <Select value={form.redemption_type || "gold"} onValueChange={v => set("redemption_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="gold">Gold Purchase</SelectItem><SelectItem value="cash">Cash</SelectItem><SelectItem value="jewellery">Jewellery</SelectItem></SelectContent>
              </Select>
            </FL>
            <div className="grid grid-cols-2 gap-3">
              <FL label="Gold Weight (g) if applicable"><Input data-testid="input-redemption-gold-wt" type="number" value={form.gold_weight_gm || ""} onChange={e => set("gold_weight_gm", e.target.value)} /></FL>
              <FL label="Item Tag (if jewellery)"><Input data-testid="input-redemption-item-tag" value={form.item_tag || ""} onChange={e => set("item_tag", e.target.value)} /></FL>
              <FL label="TDS Deducted "><Input data-testid="input-redemption-tds" type="number" value={form.tds_deducted || 0} onChange={e => set("tds_deducted", e.target.value)} /></FL>
              <FL label="Redemption Date"><Input data-testid="input-redemption-date" type="date" value={form.redemption_date || today()} onChange={e => set("redemption_date", e.target.value)} /></FL>
            </div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)} data-testid="button-redemption-cancel">Cancel</Button><Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} data-testid="button-save-redemption">Process</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
