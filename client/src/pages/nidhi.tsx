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
import { Users, Landmark, TrendingUp, AlertTriangle, CheckCircle, Calendar, Shield, Plus, Search, Pencil, Trash2, X, ArrowLeft, IndianRupee } from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtD = (d: any) => d ? new Date(d).toLocaleDateString("en-IN") : "—";
const FL = ({ label, children, full }: any) => <div className={`space-y-1 ${full ? "col-span-2" : ""}`}><Label className="text-xs">{label}</Label>{children}</div>;

function StatCard({ title, value, icon: Icon, color, sub, alert }: any) {
  return (
    <Card className={alert ? "border-red-300" : ""}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${color}`}><Icon className="h-4 w-4" /></div>
        <div><p className="text-xs text-muted-foreground">{title}</p><p className={`text-lg font-bold ${alert ? "text-red-600" : ""}`}>{value}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
      </CardContent>
    </Card>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: s = {} as any } = useQuery<any>({ queryKey: ["/api/nidhi/stats"] });
  const { data: nof = {} as any } = useQuery<any>({ queryKey: ["/api/nidhi/compliance/nof-ratio"] });
  const { data: unc = {} as any } = useQuery<any>({ queryKey: ["/api/nidhi/compliance/unencumbered-check"] });
  const { data: maturing = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/deposits/maturing"], queryFn: () => fetch("/api/nidhi/deposits/maturing?days=7").then(r => r.json()) });
  const { data: overdueEmis = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/reports/pending-emis"] });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="Total Members" value={s.totalMembers ?? 0} icon={Users} color="bg-blue-100 text-blue-600" sub={`${s.kycPending ?? 0} KYC pending`} />
        <StatCard title="Total Deposits" value={`₹${fmt(s.totalDeposits)}`} icon={Landmark} color="bg-green-100 text-green-600" sub={`${s.totalDepositAccounts ?? 0} accounts`} />
        <StatCard title="Total Loans" value={`₹${fmt(s.totalOutstanding)}`} icon={TrendingUp} color="bg-purple-100 text-purple-600" sub={`${s.totalLoans ?? 0} active`} />
        <StatCard title="NPA Loans" value={s.npaCount ?? 0} icon={AlertTriangle} color="bg-red-100 text-red-600" sub={`₹${fmt(s.npaAmount)}`} alert={(s.npaCount ?? 0) > 0} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard title="NOF Ratio" value={`1:${nof.ratio ?? 0}`} icon={Shield} color={nof.isCompliant ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"} sub="Max allowed: 1:20" alert={!nof.isCompliant} />
        <StatCard title="Unencumbered %" value={`${unc.percentage ?? 0}%`} icon={CheckCircle} color={unc.isCompliant ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"} sub="Min required: 10%" alert={!unc.isCompliant} />
        <StatCard title="New Members" value={s.newMembersThisMonth ?? 0} icon={Users} color="bg-blue-100 text-blue-600" sub="This month" />
        <StatCard title="EMIs Due Today" value={s.emisDueToday ?? 0} icon={Calendar} color="bg-orange-100 text-orange-600" alert={(s.emisDueToday ?? 0) > 0} />
      </div>

      {/* Compliance Banner */}
      <Card className={nof.isCompliant ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}>
        <CardContent className="p-4 flex items-center gap-4">
          {nof.isCompliant ? <CheckCircle className="h-6 w-6 text-green-600 shrink-0" /> : <AlertTriangle className="h-6 w-6 text-red-600 shrink-0" />}
          <div>
            <p className="font-semibold">{nof.isCompliant ? "NOF Compliance: ✓ COMPLIANT" : "NOF Compliance: ⚠ BREACH"}</p>
            <p className="text-sm text-muted-foreground">
              NOF: ₹{fmt(nof.netOwnedFunds)} · Deposits: ₹{fmt(nof.totalDeposits)} · Ratio: 1:{nof.ratio}
              {!nof.isCompliant && " — Exceeds maximum 1:20 limit!"}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {maturing.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4 text-orange-500" />FDs Maturing in 7 Days ({maturing.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {maturing.slice(0,5).map((d: any) => (
                <div key={d.id} className="flex justify-between items-center border rounded p-2 text-sm">
                  <div><p className="font-medium">{d.member_name}</p><p className="text-xs text-muted-foreground">{d.account_number} · {fmtD(d.maturity_date)}</p></div>
                  <p className="font-bold text-green-600">₹{fmt(d.maturity_amount || d.principal_amount)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {overdueEmis.slice(0,10).length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2 text-red-600"><AlertTriangle className="h-4 w-4" />Overdue EMIs</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {overdueEmis.slice(0,5).map((l: any) => (
                <div key={l.id} className="flex justify-between items-center border border-red-200 rounded p-2 text-sm">
                  <div><p className="font-medium">{l.member_name}</p><p className="text-xs text-muted-foreground">{l.loan_number} · {l.days_overdue}d overdue</p></div>
                  <div className="text-right"><p className="font-bold text-red-600">₹{fmt(l.outstanding_principal)}</p><p className="text-xs">{l.member_phone}</p></div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── MEMBERS TAB ───────────────────────────────────────────────────────────────
function MembersTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ gender: "male", kyc_status: "pending", status: "active", state: "Andhra Pradesh" });
  const [profile, setProfile] = useState<any>(null);

  const { data: members = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/members", search], queryFn: () => fetch(`/api/nidhi/members${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(r => r.json()) });
  const { data: memberProfile } = useQuery<any>({ queryKey: ["/api/nidhi/members/profile", profile?.id], queryFn: () => fetch(`/api/nidhi/members/${profile.id}`).then(r => r.json()), enabled: !!profile });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/nidhi/members/${editing.id}`, data) : apiRequest("POST", "/api/nidhi/members", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/members"] }); queryClient.invalidateQueries({ queryKey: ["/api/nidhi/stats"] }); setShowForm(false); setEditing(null); setForm({ gender: "male", kyc_status: "pending", status: "active", state: "Andhra Pradesh" }); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const KYC_COLOR: Record<string,string> = { verified: "bg-green-100 text-green-700", pending: "bg-yellow-100 text-yellow-700", rejected: "bg-red-100 text-red-700" };

  if (profile && memberProfile) {
    const { member, deposits, loans, shareTransactions } = memberProfile;
    return (
      <div className="space-y-4">
        <Button size="sm" variant="outline" onClick={() => setProfile(null)}><ArrowLeft className="h-4 w-4 mr-1" />Back to Members</Button>
        <div className="grid md:grid-cols-3 gap-3 text-sm">
          <Card><CardContent className="p-4"><p className="font-bold text-base">{member?.name}</p><p className="text-muted-foreground">{member?.member_number}</p><p>{member?.phone}</p><p className="text-xs mt-1">{member?.city}, {member?.state}</p><Badge className={`mt-2 ${KYC_COLOR[member?.kyc_status]||""}`}>{member?.kyc_status}</Badge></CardContent></Card>
          <Card><CardContent className="p-4 space-y-1"><p className="font-semibold text-xs text-muted-foreground uppercase mb-2">Share Holding</p><p className="font-bold text-lg">₹{fmt(member?.total_share_amount)}</p><p className="text-xs">{member?.shares_held} shares × ₹{member?.share_value}</p></CardContent></Card>
          <Card><CardContent className="p-4 space-y-1"><p className="font-semibold text-xs text-muted-foreground uppercase mb-2">Summary</p><p className="text-xs">Deposits: <strong>{deposits?.length}</strong></p><p className="text-xs">Loans: <strong>{loans?.length}</strong></p><p className="text-xs">Member since: <strong>{fmtD(member?.membership_date)}</strong></p></CardContent></Card>
        </div>
        <Tabs defaultValue="deposits">
          <TabsList><TabsTrigger value="deposits">Deposits ({deposits?.length})</TabsTrigger><TabsTrigger value="loans">Loans ({loans?.length})</TabsTrigger><TabsTrigger value="shares">Shares</TabsTrigger></TabsList>
          <TabsContent value="deposits">
            <table className="w-full text-sm border rounded overflow-hidden">
              <thead className="bg-muted text-xs text-muted-foreground"><tr>{["Account #","Type","Principal","Rate","Balance","Maturity","Status"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{(deposits || []).map((d: any) => <tr key={d.id} className="border-t text-xs"><td className="px-3 py-1.5 font-medium">{d.account_number}</td><td className="px-3 py-1.5">{d.deposit_type.toUpperCase()}</td><td className="px-3 py-1.5">₹{fmt(d.principal_amount)}</td><td className="px-3 py-1.5">{d.interest_rate}%</td><td className="px-3 py-1.5 font-bold">₹{fmt(d.current_balance)}</td><td className="px-3 py-1.5">{fmtD(d.maturity_date)}</td><td className="px-3 py-1.5"><Badge variant="outline">{d.status}</Badge></td></tr>)}</tbody>
            </table>
          </TabsContent>
          <TabsContent value="loans">
            <table className="w-full text-sm border rounded overflow-hidden">
              <thead className="bg-muted text-xs text-muted-foreground"><tr>{["Loan #","Type","Principal","Outstanding","EMI","Next EMI","Status"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{(loans || []).map((l: any) => <tr key={l.id} className="border-t text-xs"><td className="px-3 py-1.5 font-medium text-blue-600">{l.loan_number}</td><td className="px-3 py-1.5">{l.loan_type}</td><td className="px-3 py-1.5">₹{fmt(l.principal_amount)}</td><td className="px-3 py-1.5 font-bold text-red-600">₹{fmt(l.outstanding_principal)}</td><td className="px-3 py-1.5">₹{fmt(l.emi_amount)}</td><td className="px-3 py-1.5">{fmtD(l.next_emi_date)}</td><td className="px-3 py-1.5"><Badge variant={l.status==="npa"?"destructive":"outline"}>{l.status}</Badge></td></tr>)}</tbody>
            </table>
          </TabsContent>
          <TabsContent value="shares">
            <table className="w-full text-sm border rounded overflow-hidden">
              <thead className="bg-muted text-xs text-muted-foreground"><tr>{["Date","Type","Shares","Value","Total","Mode","Cert #"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{(shareTransactions || []).map((s: any) => <tr key={s.id} className="border-t text-xs"><td className="px-3 py-1.5">{fmtD(s.transaction_date)}</td><td className="px-3 py-1.5">{s.transaction_type}</td><td className="px-3 py-1.5">{s.shares_count}</td><td className="px-3 py-1.5">₹{fmt(s.share_value)}</td><td className="px-3 py-1.5 font-bold">₹{fmt(s.total_amount)}</td><td className="px-3 py-1.5">{s.payment_mode}</td><td className="px-3 py-1.5">{s.certificate_number||"—"}</td></tr>)}</tbody>
            </table>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search name, phone, member #…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => { setEditing(null); setForm({ gender: "male", kyc_status: "pending", status: "active", state: "Andhra Pradesh" }); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" />Add Member</Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-xs"><tr>{["Member #","Name","Phone","City","Shares","Deposits","Loans","KYC","Status",""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{(members as any[]).map((m: any) => (
            <tr key={m.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setProfile(m)}>
              <td className="px-3 py-2 font-medium text-blue-600">{m.member_number}</td>
              <td className="px-3 py-2 font-medium">{m.name}</td>
              <td className="px-3 py-2 text-xs">{m.phone||"—"}</td>
              <td className="px-3 py-2 text-xs">{m.city||"—"}</td>
              <td className="px-3 py-2 text-xs">{m.shares_held} (₹{fmt(m.total_share_amount)})</td>
              <td className="px-3 py-2 text-xs">{m.active_deposits||0} accts</td>
              <td className="px-3 py-2 text-xs">{m.active_loans||0} loans</td>
              <td className="px-3 py-2"><Badge className={KYC_COLOR[m.kyc_status]||""} variant="outline">{m.kyc_status}</Badge></td>
              <td className="px-3 py-2"><Badge variant={m.status==="active"?"default":"secondary"}>{m.status}</Badge></td>
              <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(m); setForm({ ...m }); setShowForm(true); }}><Pencil className="h-3 w-3" /></Button>
              </td>
            </tr>
          ))}{members.length === 0 && <tr><td colSpan={10} className="px-3 py-4 text-center text-muted-foreground text-xs">No members found</td></tr>}</tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Member" : "Register Member"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <FL label="Full Name *"><Input value={form.name||""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></FL>
            <FL label="Father's Name"><Input value={form.father_name||""} onChange={e => setForm((p: any) => ({ ...p, father_name: e.target.value }))} /></FL>
            <FL label="Date of Birth"><Input type="date" value={form.date_of_birth||""} onChange={e => setForm((p: any) => ({ ...p, date_of_birth: e.target.value }))} /></FL>
            <FL label="Gender"><Select value={form.gender||"male"} onValueChange={v => setForm((p: any) => ({ ...p, gender: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["male","female","other"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></FL>
            <FL label="Phone *"><Input value={form.phone||""} onChange={e => setForm((p: any) => ({ ...p, phone: e.target.value }))} /></FL>
            <FL label="Alternate Phone"><Input value={form.alternate_phone||""} onChange={e => setForm((p: any) => ({ ...p, alternate_phone: e.target.value }))} /></FL>
            <FL label="Email" full><Input value={form.email||""} onChange={e => setForm((p: any) => ({ ...p, email: e.target.value }))} /></FL>
            <FL label="Address" full><Textarea value={form.address||""} onChange={e => setForm((p: any) => ({ ...p, address: e.target.value }))} rows={2} /></FL>
            <FL label="City"><Input value={form.city||""} onChange={e => setForm((p: any) => ({ ...p, city: e.target.value }))} /></FL>
            <FL label="State"><Input value={form.state||"Andhra Pradesh"} onChange={e => setForm((p: any) => ({ ...p, state: e.target.value }))} /></FL>
            <FL label="Pincode"><Input value={form.pincode||""} onChange={e => setForm((p: any) => ({ ...p, pincode: e.target.value }))} maxLength={6} /></FL>
            <FL label="Aadhaar"><Input value={form.aadhar_number||""} onChange={e => setForm((p: any) => ({ ...p, aadhar_number: e.target.value }))} maxLength={12} /></FL>
            <FL label="PAN"><Input value={form.pan_number||""} onChange={e => setForm((p: any) => ({ ...p, pan_number: e.target.value.toUpperCase() }))} maxLength={10} /></FL>
            <FL label="KYC Status"><Select value={form.kyc_status||"pending"} onValueChange={v => setForm((p: any) => ({ ...p, kyc_status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["pending","verified","rejected"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FL>
            <FL label="Nominee Name"><Input value={form.nominee_name||""} onChange={e => setForm((p: any) => ({ ...p, nominee_name: e.target.value }))} /></FL>
            <FL label="Nominee Relation"><Input value={form.nominee_relation||""} onChange={e => setForm((p: any) => ({ ...p, nominee_relation: e.target.value }))} /></FL>
            <FL label="Membership Date"><Input type="date" value={form.membership_date||""} onChange={e => setForm((p: any) => ({ ...p, membership_date: e.target.value }))} /></FL>
            <FL label="Initial Shares"><Input type="number" value={form.shares_held||1} onChange={e => setForm((p: any) => ({ ...p, shares_held: e.target.value }))} /></FL>
            <FL label="Senior Citizen"><Select value={String(form.is_senior_citizen||0)} onValueChange={v => setForm((p: any) => ({ ...p, is_senior_citizen: Number(v) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">No</SelectItem><SelectItem value="1">Yes</SelectItem></SelectContent></Select></FL>
            <FL label="Introduced By"><Input value={form.introduced_by||""} onChange={e => setForm((p: any) => ({ ...p, introduced_by: e.target.value }))} /></FL>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.name || save.isPending}>Save</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── DEPOSITS TAB ──────────────────────────────────────────────────────────────
function DepositsTab() {
  const { toast } = useToast();
  const [depType, setDepType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ deposit_type: "fd", interest_payout: "on_maturity", payment_mode: "cash" });
  const [txnDlg, setTxnDlg] = useState<any>(null);
  const [txnForm, setTxnForm] = useState<any>({ type: "withdraw" });
  const [memberSearch, setMemberSearch] = useState("");

  const { data: deposits = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/deposits", depType], queryFn: () => fetch(`/api/nidhi/deposits${depType !== "all" ? `?deposit_type=${depType}` : ""}`).then(r => r.json()) });
  const { data: members = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/members", memberSearch], queryFn: () => fetch(`/api/nidhi/members?search=${encodeURIComponent(memberSearch)}`).then(r => r.json()), enabled: memberSearch.length > 1 });
  const { data: rates = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/interest-rates"] });
  const { data: txns = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/deposit-txns", txnDlg?.id], queryFn: () => txnDlg ? fetch(`/api/nidhi/deposits/${txnDlg.id}`).then(r => r.json()).then(d => d.transactions) : Promise.resolve([]), enabled: !!txnDlg });

  const createDep = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/nidhi/deposits", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/deposits"] }); queryClient.invalidateQueries({ queryKey: ["/api/nidhi/stats"] }); setShowForm(false); toast({ title: "Account opened" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const doTxn = useMutation({
    mutationFn: ({ endpoint, data }: any) => apiRequest("POST", endpoint, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/deposits"] }); queryClient.invalidateQueries({ queryKey: ["/api/nidhi/deposit-txns", txnDlg?.id] }); toast({ title: "Done" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const DEP_LABELS: Record<string,string> = { fd: "Fixed Deposit", rd: "Recurring Deposit", savings: "Savings", mis: "MIS", daily_pigmy: "Daily Pigmy" };
  const depRateForType = rates.filter((r: any) => r.rate_type === "deposit" && r.deposit_type === form.deposit_type && r.is_active);
  const autoRate = depRateForType[0]?.interest_rate;

  // Calc maturity preview
  const calcMaturityPreview = () => {
    const p = Number(form.principal_amount || 0);
    const r = Number(form.interest_rate || 0);
    const m = Number(form.tenure_months || 0);
    if (!p || !r || !m) return null;
    if (form.deposit_type === "fd") return Math.round(p * Math.pow(1 + r/400, m/3) * 100)/100;
    if (form.deposit_type === "rd") { const monthly = Number(form.monthly_installment || p); const rate = r/12/100; return Math.round(monthly * ((Math.pow(1+rate,m)-1)/rate) * (1+rate) * 100)/100; }
    return null;
  };
  const maturityPreview = calcMaturityPreview();

  const today = new Date().toISOString().slice(0,10);
  const STATUS_COLOR: Record<string,string> = { active: "bg-green-100 text-green-700", matured: "bg-blue-100 text-blue-700", closed: "bg-gray-100 text-gray-600", premature_closed: "bg-orange-100 text-orange-700" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {["all","savings","fd","rd","mis","daily_pigmy"].map(t => <Button key={t} size="sm" variant={depType===t?"default":"outline"} onClick={() => setDepType(t)}>{t==="all"?"All":DEP_LABELS[t]||t}</Button>)}
        </div>
        <Button onClick={() => { setForm({ deposit_type: depType === "all" ? "fd" : depType, interest_payout: "on_maturity", payment_mode: "cash" }); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" />Open Account</Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-xs"><tr>{["Account #","Member","Type","Principal","Rate","Balance","Maturity","Status",""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{(deposits as any[]).map((d: any) => {
            const isNearMaturity = d.maturity_date && d.maturity_date <= new Date(Date.now() + 7*86400000).toISOString().slice(0,10);
            return (
              <tr key={d.id} className={`border-t hover:bg-muted/30 text-xs ${isNearMaturity ? "bg-orange-50" : ""}`}>
                <td className="px-3 py-2 font-medium">{d.account_number}{isNearMaturity && <Badge variant="destructive" className="ml-1 text-xs">Maturing</Badge>}</td>
                <td className="px-3 py-2"><p>{d.member_name}</p><p className="text-muted-foreground">{d.member_number}</p></td>
                <td className="px-3 py-2">{d.deposit_type.toUpperCase()}</td>
                <td className="px-3 py-2">₹{fmt(d.principal_amount)}</td>
                <td className="px-3 py-2">{d.interest_rate}%</td>
                <td className="px-3 py-2 font-bold">₹{fmt(d.current_balance)}</td>
                <td className="px-3 py-2">{fmtD(d.maturity_date)}</td>
                <td className="px-3 py-2"><Badge className={STATUS_COLOR[d.status]||""}>{d.status}</Badge></td>
                <td className="px-3 py-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setTxnDlg(d); setTxnForm({ type: d.deposit_type === "rd" ? "rd-installment" : d.deposit_type === "daily_pigmy" ? "credit" : "withdraw" }); }}>Manage</Button>
                </td>
              </tr>
            );
          })}{deposits.length === 0 && <tr><td colSpan={9} className="px-3 py-4 text-center text-muted-foreground">No deposits</td></tr>}</tbody>
        </table>
      </div>

      {/* Open Account */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Open {DEP_LABELS[form.deposit_type] || "Deposit"} Account</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <FL label="Member (search)" full>
              <Input placeholder="Type name or phone…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
              {members.length > 0 && !form.member_id && (
                <div className="border rounded mt-1 max-h-32 overflow-y-auto">
                  {(members as any[]).map((m: any) => <div key={m.id} className="px-2 py-1.5 text-sm hover:bg-muted cursor-pointer" onClick={() => { setForm((p: any) => ({ ...p, member_id: m.id })); setMemberSearch(m.name); }}>{m.name} <span className="text-muted-foreground text-xs">({m.member_number})</span></div>)}
                </div>
              )}
              {form.member_id && <p className="text-xs text-green-600 mt-1">✓ Member selected</p>}
            </FL>
            <FL label="Deposit Type"><Select value={form.deposit_type} onValueChange={v => { setForm((p: any) => ({ ...p, deposit_type: v, interest_rate: "" })); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["savings","fd","rd","mis","daily_pigmy"].map(t => <SelectItem key={t} value={t}>{DEP_LABELS[t]||t}</SelectItem>)}</SelectContent></Select></FL>
            <FL label="Principal Amount *"><Input type="number" value={form.principal_amount||""} onChange={e => setForm((p: any) => ({ ...p, principal_amount: e.target.value }))} /></FL>
            <FL label={`Interest Rate % ${autoRate ? `(Suggested: ${autoRate}%)` : ""}`}><Input type="number" step="0.01" value={form.interest_rate||autoRate||""} onChange={e => setForm((p: any) => ({ ...p, interest_rate: e.target.value }))} /></FL>
            {["fd","rd","mis"].includes(form.deposit_type) && <FL label="Tenure (months)"><Input type="number" value={form.tenure_months||""} onChange={e => setForm((p: any) => ({ ...p, tenure_months: e.target.value }))} /></FL>}
            {form.deposit_type === "rd" && <FL label="Monthly Installment"><Input type="number" value={form.monthly_installment||""} onChange={e => setForm((p: any) => ({ ...p, monthly_installment: e.target.value }))} /></FL>}
            <FL label="Opening Date"><Input type="date" value={form.opening_date||today} onChange={e => setForm((p: any) => ({ ...p, opening_date: e.target.value }))} /></FL>
            <FL label="Interest Payout"><Select value={form.interest_payout||"on_maturity"} onValueChange={v => setForm((p: any) => ({ ...p, interest_payout: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["on_maturity","monthly","quarterly"].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></FL>
            <FL label="Payment Mode"><Select value={form.payment_mode||"cash"} onValueChange={v => setForm((p: any) => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash","cheque","upi","neft"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FL>
            <FL label="Nominee"><Input value={form.nominee_name||""} onChange={e => setForm((p: any) => ({ ...p, nominee_name: e.target.value }))} /></FL>
            {maturityPreview && <div className="col-span-2 bg-green-50 border border-green-200 rounded p-3"><p className="text-sm font-semibold text-green-700">Maturity Amount: ₹{fmt(maturityPreview)}</p></div>}
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => createDep.mutate(form)} disabled={!form.member_id || !form.principal_amount || !form.interest_rate || createDep.isPending}>Open Account</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Account */}
      <Dialog open={!!txnDlg} onOpenChange={v => { if (!v) setTxnDlg(null); }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Manage — {txnDlg?.account_number} ({txnDlg?.member_name})</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-2 text-sm mb-4">
            <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Principal</p><p className="font-bold">₹{fmt(txnDlg?.principal_amount)}</p></div>
            <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Balance</p><p className="font-bold text-green-600">₹{fmt(txnDlg?.current_balance)}</p></div>
            <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Maturity</p><p className="font-bold">{fmtD(txnDlg?.maturity_date)}</p></div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <FL label="Action"><Select value={txnForm.type} onValueChange={v => setTxnForm((p: any) => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {txnDlg?.deposit_type === "savings" && <><SelectItem value="credit">Credit</SelectItem><SelectItem value="withdraw">Withdraw</SelectItem></>}
                {txnDlg?.deposit_type === "rd" && <SelectItem value="rd-installment">RD Installment</SelectItem>}
                {txnDlg?.deposit_type === "daily_pigmy" && <SelectItem value="credit">Daily Credit</SelectItem>}
                {txnDlg?.deposit_type === "mis" && <SelectItem value="interest">Post Interest</SelectItem>}
                <SelectItem value="close">Close Account</SelectItem>
              </SelectContent>
            </Select></FL>
            {txnForm.type !== "interest" && txnForm.type !== "close" && <FL label="Amount"><Input type="number" value={txnForm.amount||""} onChange={e => setTxnForm((p: any) => ({ ...p, amount: e.target.value }))} /></FL>}
            <FL label="Payment Mode"><Select value={txnForm.payment_mode||"cash"} onValueChange={v => setTxnForm((p: any) => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash","upi","neft","cheque"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FL>
            <FL label="Reference"><Input value={txnForm.reference_number||""} onChange={e => setTxnForm((p: any) => ({ ...p, reference_number: e.target.value }))} /></FL>
          </div>
          <Button size="sm" onClick={() => {
            const ep = txnForm.type === "withdraw" ? `/api/nidhi/deposits/${txnDlg.id}/withdraw`
              : txnForm.type === "credit" ? `/api/nidhi/deposits/${txnDlg.id}/credit`
              : txnForm.type === "rd-installment" ? `/api/nidhi/deposits/${txnDlg.id}/rd-installment`
              : txnForm.type === "interest" ? `/api/nidhi/deposits/${txnDlg.id}/interest`
              : `/api/nidhi/deposits/${txnDlg.id}/close`;
            doTxn.mutate({ endpoint: ep, data: txnForm });
          }}>Execute</Button>
          <div className="mt-4 rounded border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted"><tr>{["Date","Type","Amount","Balance","Mode"].map(h => <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>{(txns as any[]).map((t: any) => <tr key={t.id} className="border-t"><td className="px-2 py-1">{fmtD(t.transaction_date)}</td><td className="px-2 py-1"><Badge variant="outline" className="text-xs">{t.transaction_type}</Badge></td><td className="px-2 py-1">₹{fmt(t.amount)}</td><td className="px-2 py-1">₹{fmt(t.balance_after)}</td><td className="px-2 py-1">{t.payment_mode}</td></tr>)}{txns.length === 0 && <tr><td colSpan={5} className="px-2 py-3 text-center text-muted-foreground">No transactions</td></tr>}</tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── LOANS TAB ─────────────────────────────────────────────────────────────────
function LoansTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ loan_type: "gold_loan", tenure_months: 12, payment_mode: "cash" });
  const [loanDlg, setLoanDlg] = useState<any>(null);
  const [emiForm, setEmiForm] = useState<any>({ payment_mode: "cash" });
  const [memberSearch, setMemberSearch] = useState("");

  const { data: loans = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/loans"] });
  const { data: members = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/members-search", memberSearch], queryFn: () => fetch(`/api/nidhi/members?search=${encodeURIComponent(memberSearch)}`).then(r => r.json()), enabled: memberSearch.length > 1 });
  const { data: rates = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/interest-rates"] });
  const { data: goldRates = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/gold-rates"] });
  const { data: loanDetail } = useQuery<any>({ queryKey: ["/api/nidhi/loan-detail", loanDlg?.id], queryFn: () => fetch(`/api/nidhi/loans/${loanDlg.id}`).then(r => r.json()), enabled: !!loanDlg });
  const { data: schedule = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/emi-schedule", loanDlg?.id], queryFn: () => fetch(`/api/nidhi/loans/${loanDlg.id}/emi-schedule`).then(r => r.json()), enabled: !!loanDlg });

  const createLoan = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/nidhi/loans", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/loans"] }); queryClient.invalidateQueries({ queryKey: ["/api/nidhi/stats"] }); setShowForm(false); toast({ title: "Loan created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const collectEmi = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/nidhi/loans/${loanDlg?.id}/collect-emi`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/loans"] }); queryClient.invalidateQueries({ queryKey: ["/api/nidhi/loan-detail", loanDlg?.id] }); toast({ title: "EMI collected" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const markNpa = useMutation({
    mutationFn: ({ id, reason }: any) => apiRequest("PUT", `/api/nidhi/loans/${id}/mark-npa`, { reason }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/loans"] }); toast({ title: "Marked NPA" }); },
  });

  const loanRate = rates.find((r: any) => r.rate_type === "loan" && r.loan_type === form.loan_type && r.is_active);
  const autoRate = loanRate?.interest_rate;
  const todayGold = (goldRates as any[])[0];
  const calcEmi = (p: number, r: number, n: number) => { const rate = r/12/100; return rate === 0 ? p/n : Math.round(p*rate*Math.pow(1+rate,n)/(Math.pow(1+rate,n)-1)*100)/100; };
  const emiPreview = form.principal_amount && form.interest_rate && form.tenure_months ? calcEmi(Number(form.principal_amount), Number(form.interest_rate), Number(form.tenure_months)) : null;
  const goldEligible = form.loan_type === "gold_loan" && form.gold_weight_grams && form.gold_purity && todayGold ? Math.round(Number(form.gold_weight_grams) * (form.gold_purity==="24K"?1:form.gold_purity==="22K"?0.916:0.75) * Number(todayGold[`rate_${form.gold_purity?.toLowerCase()}`] || todayGold.rate_22k || 0) * 0.75) : null;

  const STATUS_COLOR: Record<string,string> = { active: "bg-green-100 text-green-700", closed: "bg-gray-100 text-gray-600", npa: "bg-red-100 text-red-700", written_off: "bg-red-200 text-red-800" };
  const nextSched = loanDlg && schedule.length > 0 ? schedule[Number(loanDlg.emis_paid) || 0] : null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />New Loan</Button></div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-xs"><tr>{["Loan #","Member","Type","Principal","Rate","EMI","Outstanding","Paid","Status",""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{(loans as any[]).map((l: any) => (
            <tr key={l.id} className="border-t hover:bg-muted/30 text-xs">
              <td className="px-3 py-2 font-medium text-blue-600">{l.loan_number}</td>
              <td className="px-3 py-2"><p>{l.member_name}</p><p className="text-muted-foreground">{l.member_phone}</p></td>
              <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{l.loan_type}</Badge></td>
              <td className="px-3 py-2">₹{fmt(l.principal_amount)}</td>
              <td className="px-3 py-2">{l.interest_rate}%</td>
              <td className="px-3 py-2">₹{fmt(l.emi_amount)}</td>
              <td className="px-3 py-2 font-bold text-red-600">₹{fmt(l.outstanding_principal)}</td>
              <td className="px-3 py-2">{l.emis_paid}/{l.total_emis}</td>
              <td className="px-3 py-2"><Badge className={STATUS_COLOR[l.status]||""}>{l.status}</Badge></td>
              <td className="px-3 py-2">
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setLoanDlg(l); setEmiForm({ payment_mode: "cash", principal_component: nextSched?.principal || "", interest_component: nextSched?.interest || "" }); }}>Manage</Button>
                  {l.status === "active" && <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600" onClick={() => markNpa.mutate({ id: l.id, reason: "Overdue" })}>NPA</Button>}
                </div>
              </td>
            </tr>
          ))}{loans.length === 0 && <tr><td colSpan={10} className="px-3 py-4 text-center text-muted-foreground">No loans</td></tr>}</tbody>
        </table>
      </div>

      {/* New Loan Form */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Loan</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <FL label="Member (search)" full>
              <Input placeholder="Type name…" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} />
              {(members as any[]).length > 0 && !form.member_id && (
                <div className="border rounded mt-1 max-h-28 overflow-y-auto">
                  {(members as any[]).map((m: any) => <div key={m.id} className="px-2 py-1.5 text-sm hover:bg-muted cursor-pointer" onClick={() => { setForm((p: any) => ({ ...p, member_id: m.id })); setMemberSearch(m.name); }}>{m.name} ({m.member_number})</div>)}
                </div>
              )}
              {form.member_id && <p className="text-xs text-green-600 mt-1">✓ Member selected</p>}
            </FL>
            <FL label="Loan Type"><Select value={form.loan_type} onValueChange={v => setForm((p: any) => ({ ...p, loan_type: v, interest_rate: "" }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["gold_loan","fd_loan","property_loan","vehicle_loan","personal_loan","group_loan"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FL>

            {form.loan_type === "gold_loan" && (
              <><FL label="Gold Weight (g)"><Input type="number" step="0.001" value={form.gold_weight_grams||""} onChange={e => setForm((p: any) => ({ ...p, gold_weight_grams: e.target.value }))} /></FL>
              <FL label="Gold Purity"><Select value={form.gold_purity||"22K"} onValueChange={v => setForm((p: any) => ({ ...p, gold_purity: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["24K","22K","18K"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></FL>
              {goldEligible && <div className="col-span-2 text-xs bg-yellow-50 border border-yellow-200 rounded p-2">Today's rate ({form.gold_purity}): ₹{fmt(todayGold?.[`rate_${form.gold_purity?.toLowerCase()}`] || todayGold?.rate_22k)}/g | Eligible amount (75%): <strong>₹{fmt(goldEligible)}</strong></div>}</>
            )}

            <FL label={`Principal Amount * ${goldEligible ? `(max ₹${fmt(goldEligible)})` : ""}`}><Input type="number" value={form.principal_amount||""} onChange={e => setForm((p: any) => ({ ...p, principal_amount: e.target.value }))} /></FL>
            <FL label={`Interest Rate % ${autoRate ? `(${autoRate}%)` : ""}`}><Input type="number" step="0.01" value={form.interest_rate||autoRate||""} onChange={e => setForm((p: any) => ({ ...p, interest_rate: e.target.value }))} /></FL>
            <FL label="Tenure (months)"><Input type="number" value={form.tenure_months||""} onChange={e => setForm((p: any) => ({ ...p, tenure_months: e.target.value }))} /></FL>
            <FL label="Disbursement Date"><Input type="date" value={form.disbursement_date||new Date().toISOString().slice(0,10)} onChange={e => setForm((p: any) => ({ ...p, disbursement_date: e.target.value }))} /></FL>
            <FL label="Security Type"><Select value={form.security_type||""} onValueChange={v => setForm((p: any) => ({ ...p, security_type: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{["gold","fd","property","vehicle","guarantor"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FL>
            <FL label="Security Value"><Input type="number" value={form.security_value||""} onChange={e => setForm((p: any) => ({ ...p, security_value: e.target.value }))} /></FL>
            <FL label="Notes" full><Textarea value={form.notes||""} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2} /></FL>
            {emiPreview && <div className="col-span-2 bg-blue-50 border border-blue-200 rounded p-3"><p className="text-sm font-semibold text-blue-700">Calculated EMI: ₹{fmt(emiPreview)}/month</p><p className="text-xs text-muted-foreground">Total payable: ₹{fmt(emiPreview * Number(form.tenure_months||0))}</p></div>}
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => createLoan.mutate(form)} disabled={!form.member_id || !form.principal_amount || !form.interest_rate || !form.tenure_months || createLoan.isPending}>Create Loan</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Loan */}
      <Dialog open={!!loanDlg} onOpenChange={v => { if (!v) setLoanDlg(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{loanDlg?.loan_number} — {loanDlg?.member_name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-4 gap-2 text-xs mb-3">
            {[["Principal","₹"+fmt(loanDlg?.principal_amount)],["Outstanding","₹"+fmt(loanDlg?.outstanding_principal)],["EMI","₹"+fmt(loanDlg?.emi_amount)],["EMIs",""+loanDlg?.emis_paid+"/"+loanDlg?.total_emis]].map(([l,v]) => <div key={l} className="bg-muted/50 rounded p-2"><p className="text-muted-foreground">{l}</p><p className="font-bold">{v}</p></div>)}
          </div>
          {loanDlg?.status === "active" && (
            <div className="border rounded p-3 bg-green-50 mb-3">
              <p className="text-sm font-semibold mb-2">Collect EMI #{Number(loanDlg?.emis_paid||0)+1}</p>
              {nextSched && <p className="text-xs text-muted-foreground mb-2">Schedule: Principal ₹{fmt(nextSched.principal)} + Interest ₹{fmt(nextSched.interest)} = ₹{fmt(nextSched.emi_amount)}</p>}
              <div className="grid grid-cols-3 gap-2">
                <FL label="Principal"><Input type="number" value={emiForm.principal_component||""} onChange={e => setEmiForm((p: any) => ({ ...p, principal_component: e.target.value }))} /></FL>
                <FL label="Interest"><Input type="number" value={emiForm.interest_component||""} onChange={e => setEmiForm((p: any) => ({ ...p, interest_component: e.target.value }))} /></FL>
                <FL label="Penalty"><Input type="number" value={emiForm.penalty_amount||""} onChange={e => setEmiForm((p: any) => ({ ...p, penalty_amount: e.target.value }))} /></FL>
                <FL label="Mode"><Select value={emiForm.payment_mode||"cash"} onValueChange={v => setEmiForm((p: any) => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash","upi","neft","cheque"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FL>
                <FL label="Reference"><Input value={emiForm.reference_number||""} onChange={e => setEmiForm((p: any) => ({ ...p, reference_number: e.target.value }))} /></FL>
              </div>
              <Button size="sm" className="mt-2" onClick={() => collectEmi.mutate({ ...emiForm, emi_number: Number(loanDlg?.emis_paid||0)+1 })} disabled={collectEmi.isPending}>Collect EMI</Button>
            </div>
          )}
          <Tabs defaultValue="schedule">
            <TabsList><TabsTrigger value="schedule">EMI Schedule</TabsTrigger><TabsTrigger value="txns">Payment History</TabsTrigger></TabsList>
            <TabsContent value="schedule">
              <div className="rounded border overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted sticky top-0"><tr>{["#","Due Date","Principal","Interest","EMI","Balance"].map(h => <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
                  <tbody>{(schedule as any[]).map((s: any, i: number) => <tr key={i} className={`border-t ${i < Number(loanDlg?.emis_paid||0) ? "bg-green-50 text-muted-foreground line-through" : ""}`}><td className="px-2 py-1">{s.emi_number}</td><td className="px-2 py-1">{s.due_date}</td><td className="px-2 py-1">₹{fmt(s.principal)}</td><td className="px-2 py-1">₹{fmt(s.interest)}</td><td className="px-2 py-1 font-medium">₹{fmt(s.emi_amount)}</td><td className="px-2 py-1">₹{fmt(s.balance_after)}</td></tr>)}</tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="txns">
              <div className="rounded border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted"><tr>{["Date","EMI#","Principal","Interest","Penalty","Total","Mode"].map(h => <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
                  <tbody>{(loanDetail?.transactions || []).map((t: any) => <tr key={t.id} className="border-t"><td className="px-2 py-1">{fmtD(t.payment_date)}</td><td className="px-2 py-1">{t.emi_number||"—"}</td><td className="px-2 py-1">₹{fmt(t.principal_component)}</td><td className="px-2 py-1">₹{fmt(t.interest_component)}</td><td className="px-2 py-1">{t.penalty_amount>0?`₹${fmt(t.penalty_amount)}`:"—"}</td><td className="px-2 py-1 font-bold">₹{fmt(t.total_amount)}</td><td className="px-2 py-1">{t.payment_mode}</td></tr>)}{!(loanDetail?.transactions?.length) && <tr><td colSpan={7} className="px-2 py-3 text-center text-muted-foreground">No payments</td></tr>}</tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── DAILY COLLECTION TAB ──────────────────────────────────────────────────────
function DailyCollectionTab() {
  const { toast } = useToast();
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [agent, setAgent] = useState("");
  const [form, setForm] = useState<any>({ collection_type: "emi", payment_mode: "cash" });

  const { data: collections = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/daily-collection", date, agent], queryFn: () => fetch(`/api/nidhi/daily-collection?date=${date}${agent?`&agent_name=${encodeURIComponent(agent)}`:""}`).then(r => r.json()) });

  const collect = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/nidhi/daily-collection", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/daily-collection"] }); setForm({ collection_type: "emi", payment_mode: "cash" }); toast({ title: "Collected" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const totals = (collections as any[]).reduce((acc: any, c: any) => { acc[c.collection_type] = (acc[c.collection_type]||0) + Number(c.amount); acc.total = (acc.total||0) + Number(c.amount); return acc; }, {});

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-end">
        <div><Label className="text-xs">Date</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" /></div>
        <div><Label className="text-xs">Agent</Label><Input placeholder="Agent name" value={agent} onChange={e => setAgent(e.target.value)} className="w-40" /></div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        {Object.entries(totals).filter(([k]) => k !== "total").map(([type, amt]: any) => <Card key={type}><CardContent className="p-3"><p className="text-xs text-muted-foreground capitalize">{type}</p><p className="font-bold">₹{fmt(amt)}</p></CardContent></Card>)}
        {totals.total > 0 && <Card className="border-blue-300"><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold text-blue-600">₹{fmt(totals.total)}</p></CardContent></Card>}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Quick Collection Entry</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FL label="Collection Type"><Select value={form.collection_type} onValueChange={v => setForm((p: any) => ({ ...p, collection_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["emi","rd_installment","pigmy","savings"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FL>
            <FL label="Member ID / Search"><Input placeholder="Member No." value={form.member_id||""} onChange={e => setForm((p: any) => ({ ...p, member_id: e.target.value }))} /></FL>
            <FL label="Amount *"><Input type="number" value={form.amount||""} onChange={e => setForm((p: any) => ({ ...p, amount: e.target.value }))} /></FL>
            <FL label="Mode"><Select value={form.payment_mode||"cash"} onValueChange={v => setForm((p: any) => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash","upi","cheque"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FL>
            <FL label="Agent Name"><Input value={form.agent_name||agent||""} onChange={e => setForm((p: any) => ({ ...p, agent_name: e.target.value }))} /></FL>
            <FL label="Receipt #"><Input value={form.receipt_number||""} onChange={e => setForm((p: any) => ({ ...p, receipt_number: e.target.value }))} /></FL>
          </div>
          <Button size="sm" className="mt-3" onClick={() => collect.mutate({ ...form, collection_date: date })} disabled={!form.amount || collect.isPending}>Add Collection</Button>
        </CardContent>
      </Card>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground text-xs"><tr>{["Member","Type","Amount","Mode","Receipt #","Agent","Time"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>{(collections as any[]).map((c: any) => <tr key={c.id} className="border-t text-xs"><td className="px-3 py-1.5">{c.member_name||c.member_id||"—"}</td><td className="px-3 py-1.5"><Badge variant="outline" className="text-xs">{c.collection_type}</Badge></td><td className="px-3 py-1.5 font-bold">₹{fmt(c.amount)}</td><td className="px-3 py-1.5">{c.payment_mode}</td><td className="px-3 py-1.5">{c.receipt_number||"—"}</td><td className="px-3 py-1.5">{c.agent_name||"—"}</td><td className="px-3 py-1.5">{new Date(c.created_at).toLocaleTimeString("en-IN")}</td></tr>)}{collections.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No collections for this date</td></tr>}</tbody>
        </table>
      </div>
    </div>
  );
}

// ── INTEREST RATES TAB ────────────────────────────────────────────────────────
function InterestRatesTab() {
  const { toast } = useToast();
  const [form, setForm] = useState<any>({ rate_type: "deposit", deposit_type: "fd", is_active: 1 });
  const [showForm, setShowForm] = useState(false);

  const { data: rates = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/interest-rates"] });

  const save = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/nidhi/interest-rates", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/interest-rates"] }); setShowForm(false); toast({ title: "Rate saved" }); },
  });
  const del = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/nidhi/interest-rates/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/nidhi/interest-rates"] }) });

  const depositRates = (rates as any[]).filter(r => r.rate_type === "deposit");
  const loanRates = (rates as any[]).filter(r => r.rate_type === "loan");
  const maxDepRate = depositRates.length ? Math.max(...depositRates.map(r => Number(r.interest_rate))) : 0;
  const loanCompliance = loanRates.filter(r => Number(r.interest_rate) > maxDepRate + 7.5);

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />Add Rate</Button></div>

      {loanCompliance.length > 0 && <Card className="border-red-300 bg-red-50"><CardContent className="p-3 text-sm text-red-700"><AlertTriangle className="h-4 w-4 inline mr-1" />{loanCompliance.length} loan rate(s) exceed deposit rate + 7.5% limit</CardContent></Card>}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Deposit Rates</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-xs">
              <thead className="text-muted-foreground"><tr>{["Type","Tenure","Rate","Sr. Rate",""].map(h => <th key={h} className="text-left pb-1.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>{depositRates.map((r: any) => <tr key={r.id} className="border-t"><td className="py-1 capitalize">{r.deposit_type}</td><td className="py-1">{r.min_tenure_months}–{r.max_tenure_months||"∞"} mo</td><td className="py-1 font-bold text-blue-600">{r.interest_rate}%</td><td className="py-1">{r.senior_citizen_rate ? r.senior_citizen_rate+"%" : "—"}</td><td className="py-1"><Button size="sm" variant="ghost" className="h-5 p-0" onClick={() => del.mutate(r.id)}><Trash2 className="h-3 w-3 text-red-600" /></Button></td></tr>)}{depositRates.length === 0 && <tr><td colSpan={5} className="py-3 text-center text-muted-foreground">No rates</td></tr>}</tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Loan Rates <span className="text-xs font-normal text-muted-foreground">(Max: deposit + 7.5%)</span></CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-xs">
              <thead className="text-muted-foreground"><tr>{["Loan Type","Rate","Limit",""].map(h => <th key={h} className="text-left pb-1.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>{loanRates.map((r: any) => { const over = Number(r.interest_rate) > maxDepRate + 7.5; return <tr key={r.id} className={`border-t ${over?"bg-red-50":""}`}><td className="py-1 capitalize">{r.loan_type||"All"}</td><td className={`py-1 font-bold ${over?"text-red-600":"text-blue-600"}`}>{r.interest_rate}%</td><td className="py-1">{maxDepRate+7.5}%{over&&<Badge variant="destructive" className="ml-1 text-xs">Over</Badge>}</td><td className="py-1"><Button size="sm" variant="ghost" className="h-5 p-0" onClick={() => del.mutate(r.id)}><Trash2 className="h-3 w-3 text-red-600" /></Button></td></tr>; })}{loanRates.length === 0 && <tr><td colSpan={4} className="py-3 text-center text-muted-foreground">No rates</td></tr>}</tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Interest Rate</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FL label="Rate Type"><Select value={form.rate_type} onValueChange={v => setForm((p: any) => ({ ...p, rate_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="deposit">Deposit</SelectItem><SelectItem value="loan">Loan</SelectItem></SelectContent></Select></FL>
            {form.rate_type === "deposit" ? <FL label="Deposit Type"><Select value={form.deposit_type||"fd"} onValueChange={v => setForm((p: any) => ({ ...p, deposit_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["savings","fd","rd","mis","daily_pigmy"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FL> : <FL label="Loan Type"><Select value={form.loan_type||"gold_loan"} onValueChange={v => setForm((p: any) => ({ ...p, loan_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["gold_loan","fd_loan","property_loan","vehicle_loan","personal_loan"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FL>}
            <div className="grid grid-cols-2 gap-2">
              <FL label="Min Tenure (mo)"><Input type="number" value={form.min_tenure_months||0} onChange={e => setForm((p: any) => ({ ...p, min_tenure_months: e.target.value }))} /></FL>
              <FL label="Max Tenure (mo)"><Input type="number" value={form.max_tenure_months||""} onChange={e => setForm((p: any) => ({ ...p, max_tenure_months: e.target.value }))} /></FL>
            </div>
            <FL label="Interest Rate % *"><Input type="number" step="0.01" value={form.interest_rate||""} onChange={e => setForm((p: any) => ({ ...p, interest_rate: e.target.value }))} /></FL>
            <FL label="Senior Citizen Rate %"><Input type="number" step="0.01" value={form.senior_citizen_rate||""} onChange={e => setForm((p: any) => ({ ...p, senior_citizen_rate: e.target.value }))} /></FL>
            <FL label="Effective From"><Input type="date" value={form.effective_from||""} onChange={e => setForm((p: any) => ({ ...p, effective_from: e.target.value }))} /></FL>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.interest_rate}>Save</Button><Button variant="outline" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── GOLD RATES TAB ────────────────────────────────────────────────────────────
function GoldRatesTab() {
  const { toast } = useToast();
  const [form, setForm] = useState<any>({ rate_date: new Date().toISOString().slice(0,10) });

  const { data: rates = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/gold-rates"] });
  const save = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/nidhi/gold-rates", data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/gold-rates"] }); setForm({ rate_date: new Date().toISOString().slice(0,10) }); toast({ title: "Rate saved" }); } });

  const today = (rates as any[])[0];

  return (
    <div className="space-y-5">
      {today && (
        <div className="grid grid-cols-3 gap-3">
          {[["24K", today.rate_24k, "bg-yellow-100 text-yellow-700"], ["22K", today.rate_22k, "bg-yellow-100 text-yellow-700"], ["18K", today.rate_18k, "bg-yellow-50 text-yellow-600"]].map(([purity, rate, cls]) => (
            <Card key={purity as string} className="border-yellow-200">
              <CardContent className="p-4 text-center">
                <p className="text-sm font-bold">{purity as string} Gold</p>
                <p className={`text-2xl font-bold mt-1 ${cls}`}>₹{fmt(rate)}</p>
                <p className="text-xs text-muted-foreground">per gram · {fmtD(today.rate_date)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-sm">Add Today's Rate</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <FL label="Date"><Input type="date" value={form.rate_date} onChange={e => setForm((p: any) => ({ ...p, rate_date: e.target.value }))} /></FL>
            <FL label="24K Rate (₹/g)"><Input type="number" value={form.rate_24k||""} onChange={e => setForm((p: any) => ({ ...p, rate_24k: e.target.value }))} /></FL>
            <FL label="22K Rate (₹/g)"><Input type="number" value={form.rate_22k||""} onChange={e => setForm((p: any) => ({ ...p, rate_22k: e.target.value }))} /></FL>
            <FL label="18K Rate (₹/g)"><Input type="number" value={form.rate_18k||""} onChange={e => setForm((p: any) => ({ ...p, rate_18k: e.target.value }))} /></FL>
          </div>
          <Button size="sm" className="mt-3" onClick={() => save.mutate(form)} disabled={!form.rate_22k && !form.rate_24k}>Save Rates</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Rate History (Last 30 Days)</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-xs"><tr>{["Date","24K","22K","18K"].map(h => <th key={h} className="text-left pb-1.5 font-medium">{h}</th>)}</tr></thead>
            <tbody>{(rates as any[]).map((r: any) => <tr key={r.id} className="border-t text-xs"><td className="py-1.5">{fmtD(r.rate_date)}</td><td className="py-1.5 font-bold">₹{fmt(r.rate_24k)}</td><td className="py-1.5 font-bold">₹{fmt(r.rate_22k)}</td><td className="py-1.5">₹{fmt(r.rate_18k)}</td></tr>)}{rates.length === 0 && <tr><td colSpan={4} className="py-3 text-center text-muted-foreground">No rates entered</td></tr>}</tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── COMPLIANCE TAB ────────────────────────────────────────────────────────────
function ComplianceTab() {
  const { toast } = useToast();
  const [ndh1Form, setNdh1Form] = useState<any>({ financial_year: "2024-25" });
  const [ndh3Form, setNdh3Form] = useState<any>({});

  const { data: nof = {} as any } = useQuery<any>({ queryKey: ["/api/nidhi/compliance/nof-ratio"] });
  const { data: unc = {} as any } = useQuery<any>({ queryKey: ["/api/nidhi/compliance/unencumbered-check"] });
  const { data: reports = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/compliance/reports"] });

  const genNdh1 = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/nidhi/compliance/ndh1", data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/compliance/reports"] }); toast({ title: "NDH-1 generated" }); } });
  const genNdh3 = useMutation({ mutationFn: (data: any) => apiRequest("POST", "/api/nidhi/compliance/ndh3", data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/compliance/reports"] }); toast({ title: "NDH-3 generated" }); } });

  const ratioVal = Number(nof.ratio || 0);
  const ratioWidth = Math.min((ratioVal / 20) * 100, 100);

  return (
    <div className="space-y-5">
      {/* NOF Gauge */}
      <Card className={nof.isCompliant ? "border-green-300" : "border-red-300"}>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" />NOF Compliance Ratio</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span>Ratio: <strong>1:{nof.ratio}</strong></span><span className={nof.isCompliant ? "text-green-600 font-bold" : "text-red-600 font-bold"}>{nof.isCompliant ? "✓ COMPLIANT" : "✗ NON-COMPLIANT"}</span></div>
            <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${ratioVal <= 20 ? "bg-green-500" : "bg-red-500"}`} style={{ width: `${ratioWidth}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm mt-3">
              <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Net Owned Funds</p><p className="font-bold">₹{fmt(nof.netOwnedFunds)}</p></div>
              <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Total Deposits</p><p className="font-bold">₹{fmt(nof.totalDeposits)}</p></div>
              <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Total Loans</p><p className="font-bold">₹{fmt(nof.totalLoans)}</p></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unencumbered */}
      <Card className={unc.isCompliant ? "border-green-300" : "border-yellow-300"}>
        <CardContent className="p-4 flex items-center gap-4">
          {unc.isCompliant ? <CheckCircle className="h-6 w-6 text-green-600" /> : <AlertTriangle className="h-6 w-6 text-yellow-600" />}
          <div>
            <p className="font-semibold">Unencumbered Term Deposits: {unc.percentage}%</p>
            <p className="text-sm text-muted-foreground">Term deposits: ₹{fmt(unc.termDeposits)} / Total: ₹{fmt(unc.totalDeposits)} (Required: ≥ 10%)</p>
          </div>
        </CardContent>
      </Card>

      {/* Generate Reports */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">NDH-1 Annual Return</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <FL label="Financial Year"><Input value={ndh1Form.financial_year||""} onChange={e => setNdh1Form((p: any) => ({ ...p, financial_year: e.target.value }))} placeholder="2024-25" /></FL>
            <div className="grid grid-cols-2 gap-2">
              <FL label="Period From"><Input type="date" value={ndh1Form.period_from||""} onChange={e => setNdh1Form((p: any) => ({ ...p, period_from: e.target.value }))} /></FL>
              <FL label="Period To"><Input type="date" value={ndh1Form.period_to||""} onChange={e => setNdh1Form((p: any) => ({ ...p, period_to: e.target.value }))} /></FL>
            </div>
            <Button onClick={() => genNdh1.mutate(ndh1Form)} disabled={genNdh1.isPending} className="w-full">Generate NDH-1</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">NDH-3 Half-Yearly Return</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <FL label="Financial Year"><Input value={ndh3Form.financial_year||""} onChange={e => setNdh3Form((p: any) => ({ ...p, financial_year: e.target.value }))} placeholder="2024-25" /></FL>
            <div className="grid grid-cols-2 gap-2">
              <FL label="Period From"><Input type="date" value={ndh3Form.period_from||""} onChange={e => setNdh3Form((p: any) => ({ ...p, period_from: e.target.value }))} /></FL>
              <FL label="Period To"><Input type="date" value={ndh3Form.period_to||""} onChange={e => setNdh3Form((p: any) => ({ ...p, period_to: e.target.value }))} /></FL>
            </div>
            <Button onClick={() => genNdh3.mutate(ndh3Form)} disabled={genNdh3.isPending} className="w-full">Generate NDH-3</Button>
          </CardContent>
        </Card>
      </div>

      {/* Report History */}
      {reports.length > 0 && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-muted-foreground text-xs"><tr>{["Report","FY","Members","Deposits","Loans","NOF","Ratio","Compliant","Generated"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{(reports as any[]).map((r: any) => <tr key={r.id} className="border-t text-xs"><td className="px-3 py-1.5 font-medium">{r.report_type}</td><td className="px-3 py-1.5">{r.financial_year||"—"}</td><td className="px-3 py-1.5">{r.total_members}</td><td className="px-3 py-1.5">₹{fmt(r.total_deposits)}</td><td className="px-3 py-1.5">₹{fmt(r.total_loans)}</td><td className="px-3 py-1.5">₹{fmt(r.net_owned_funds)}</td><td className="px-3 py-1.5">1:{r.deposit_to_nof_ratio}</td><td className="px-3 py-1.5"><Badge className={r.is_compliant?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}>{r.is_compliant?"Yes":"No"}</Badge></td><td className="px-3 py-1.5">{fmtD(r.generated_at)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── REPORTS TAB ───────────────────────────────────────────────────────────────
function ReportsTab() {
  const [activeReport, setActiveReport] = useState("pending-emis");
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10));
  const [to, setTo] = useState(new Date().toISOString().slice(0,10));
  const [agent, setAgent] = useState("");

  const { data: pendingEmis = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/reports/pending-emis"], enabled: activeReport === "pending-emis" });
  const { data: npaList = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/reports/npa-list"], enabled: activeReport === "npa-list" });
  const { data: maturity = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/reports/deposit-maturity", from, to], queryFn: () => fetch(`/api/nidhi/reports/deposit-maturity?from_date=${from}&to_date=${to}`).then(r => r.json()), enabled: activeReport === "deposit-maturity" });
  const { data: memberWise = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/reports/member-wise"], enabled: activeReport === "member-wise" });
  const { data: dailyColl = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/reports/daily-collection", from, to, agent], queryFn: () => fetch(`/api/nidhi/reports/daily-collection?from_date=${from}&to_date=${to}${agent?`&agent_name=${encodeURIComponent(agent)}`:""}`).then(r => r.json()), enabled: activeReport === "daily-collection" });

  const REPORTS = [
    { id: "pending-emis", label: "Pending EMIs" },
    { id: "npa-list", label: "NPA List" },
    { id: "deposit-maturity", label: "Deposit Maturity" },
    { id: "member-wise", label: "Member-Wise Summary" },
    { id: "daily-collection", label: "Daily Collection" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {REPORTS.map(r => <Button key={r.id} size="sm" variant={activeReport===r.id?"default":"outline"} onClick={() => setActiveReport(r.id)}>{r.label}</Button>)}
      </div>

      {(activeReport === "deposit-maturity" || activeReport === "daily-collection") && (
        <div className="flex gap-3 items-end flex-wrap">
          <div><Label className="text-xs">From</Label><Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" /></div>
          <div><Label className="text-xs">To</Label><Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" /></div>
          {activeReport === "daily-collection" && <div><Label className="text-xs">Agent</Label><Input value={agent} onChange={e => setAgent(e.target.value)} className="w-36" /></div>}
        </div>
      )}

      {activeReport === "pending-emis" && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs text-muted-foreground"><tr>{["Loan #","Member","Phone","Type","Outstanding","Days Overdue","Next EMI"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{(pendingEmis as any[]).map((l: any) => <tr key={l.id} className="border-t text-xs"><td className="px-3 py-2 font-medium text-blue-600">{l.loan_number}</td><td className="px-3 py-2">{l.member_name}</td><td className="px-3 py-2">{l.member_phone}</td><td className="px-3 py-2">{l.loan_type}</td><td className="px-3 py-2 font-bold text-red-600">₹{fmt(l.outstanding_principal)}</td><td className="px-3 py-2"><Badge variant="destructive">{l.days_overdue}d</Badge></td><td className="px-3 py-2">{fmtD(l.next_emi_date)}</td></tr>)}{pendingEmis.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No pending EMIs</td></tr>}</tbody>
          </table>
        </div>
      )}

      {activeReport === "npa-list" && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs text-muted-foreground"><tr>{["Loan #","Member","Phone","Type","Principal","Outstanding","NPA Date","Reason"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{(npaList as any[]).map((l: any) => <tr key={l.id} className="border-t text-xs"><td className="px-3 py-2 font-medium text-red-600">{l.loan_number}</td><td className="px-3 py-2">{l.member_name}</td><td className="px-3 py-2">{l.member_phone}</td><td className="px-3 py-2">{l.loan_type}</td><td className="px-3 py-2">₹{fmt(l.principal_amount)}</td><td className="px-3 py-2 font-bold text-red-600">₹{fmt(l.outstanding_principal)}</td><td className="px-3 py-2">{fmtD(l.npa_date)}</td><td className="px-3 py-2">{l.npa_reason||"—"}</td></tr>)}{npaList.length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">No NPA loans</td></tr>}</tbody>
          </table>
        </div>
      )}

      {activeReport === "deposit-maturity" && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs text-muted-foreground"><tr>{["Account #","Member","Phone","Type","Principal","Rate","Maturity Amount","Maturity Date"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{(maturity as any[]).map((d: any) => <tr key={d.id} className="border-t text-xs"><td className="px-3 py-2 font-medium">{d.account_number}</td><td className="px-3 py-2">{d.member_name}</td><td className="px-3 py-2">{d.member_phone}</td><td className="px-3 py-2">{d.deposit_type.toUpperCase()}</td><td className="px-3 py-2">₹{fmt(d.principal_amount)}</td><td className="px-3 py-2">{d.interest_rate}%</td><td className="px-3 py-2 font-bold text-green-600">₹{fmt(d.maturity_amount)}</td><td className="px-3 py-2">{fmtD(d.maturity_date)}</td></tr>)}{maturity.length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">No deposits maturing in this period</td></tr>}</tbody>
          </table>
        </div>
      )}

      {activeReport === "member-wise" && (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs text-muted-foreground"><tr>{["Member #","Name","Shares","Share Amt","Deposits","Total Dep","Loans","Total Loan"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{(memberWise as any[]).map((m: any) => <tr key={m.id} className="border-t text-xs"><td className="px-3 py-2 font-medium text-blue-600">{m.member_number}</td><td className="px-3 py-2">{m.name}</td><td className="px-3 py-2">{m.shares_held}</td><td className="px-3 py-2 font-bold">₹{fmt(m.total_share_amount)}</td><td className="px-3 py-2">{m.deposit_count}</td><td className="px-3 py-2 text-green-600 font-bold">₹{fmt(m.total_deposits)}</td><td className="px-3 py-2">{m.loan_count}</td><td className="px-3 py-2 text-red-600 font-bold">₹{fmt(m.total_outstanding)}</td></tr>)}{memberWise.length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">No members</td></tr>}</tbody>
          </table>
        </div>
      )}

      {activeReport === "daily-collection" && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Total: ₹{fmt((dailyColl as any[]).reduce((s, c: any) => s + Number(c.amount), 0))}</div>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted text-xs text-muted-foreground"><tr>{["Date","Member","Type","Amount","Mode","Agent","Receipt #"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>{(dailyColl as any[]).map((c: any) => <tr key={c.id} className="border-t text-xs"><td className="px-3 py-1.5">{fmtD(c.collection_date)}</td><td className="px-3 py-1.5">{c.member_name||c.member_id||"—"}</td><td className="px-3 py-1.5"><Badge variant="outline" className="text-xs">{c.collection_type}</Badge></td><td className="px-3 py-1.5 font-bold">₹{fmt(c.amount)}</td><td className="px-3 py-1.5">{c.payment_mode}</td><td className="px-3 py-1.5">{c.agent_name||"—"}</td><td className="px-3 py-1.5">{c.receipt_number||"—"}</td></tr>)}{dailyColl.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No collections</td></tr>}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function NidhiPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><Landmark className="h-6 w-6 text-emerald-600" /></div>
        <div><h1 className="text-2xl font-bold">Nidhi Company / NBFC ERP</h1><p className="text-sm text-muted-foreground">Members · Deposits · Loans · EMI · Compliance · Reports</p></div>
      </div>
      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap h-auto">
          {[["dashboard","Dashboard"],["members","Members"],["deposits","Deposits"],["loans","Loans"],["daily","Daily Collection"],["rates","Interest Rates"],["gold","Gold Rates"],["compliance","Compliance"],["reports","Reports"]].map(([val,label]) => <TabsTrigger key={val} value={val} className="text-xs">{label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="members"><MembersTab /></TabsContent>
        <TabsContent value="deposits"><DepositsTab /></TabsContent>
        <TabsContent value="loans"><LoansTab /></TabsContent>
        <TabsContent value="daily"><DailyCollectionTab /></TabsContent>
        <TabsContent value="rates"><InterestRatesTab /></TabsContent>
        <TabsContent value="gold"><GoldRatesTab /></TabsContent>
        <TabsContent value="compliance"><ComplianceTab /></TabsContent>
        <TabsContent value="reports"><ReportsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
