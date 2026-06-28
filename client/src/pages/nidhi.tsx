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
import { Plus, Search, Users, Landmark, TrendingUp, AlertTriangle, CheckCircle, FileText, Pencil, Trash2, X, IndianRupee, Calendar, Shield, BarChart3 } from "lucide-react";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-IN") : "—";

function StatCard({ title, value, icon: Icon, color, sub, alert }: any) {
  return (
    <Card className={alert ? "border-red-300" : ""}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
        <div><p className="text-sm text-muted-foreground">{title}</p><p className={`text-xl font-bold ${alert ? "text-red-600" : ""}`}>{value}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
      </CardContent>
    </Card>
  );
}

function FieldRow({ label, children, col2 }: any) {
  return <div className={`space-y-1 ${col2 ? "col-span-2" : ""}`}><Label className="text-xs">{label}</Label>{children}</div>;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function DashboardTab() {
  const { data: stats } = useQuery<any>({ queryKey: ["/api/nidhi/stats"] });
  const { data: maturityDue = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/deposits/due/maturity"] });
  const { data: overdue = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/loans/due/overdue"] });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Members" value={stats?.totalMembers ?? 0} icon={Users} color="bg-blue-100 text-blue-600" sub={`${stats?.kycPending ?? 0} KYC pending`} alert={stats?.kycPending > 0} />
        <StatCard title="Total Deposits" value={`₹${fmt(stats?.totalDeposits)}`} icon={Landmark} color="bg-green-100 text-green-600" sub={`${stats?.totalDepositAccounts ?? 0} accounts`} />
        <StatCard title="Total Loans" value={`₹${fmt(stats?.totalOutstanding)}`} icon={TrendingUp} color="bg-purple-100 text-purple-600" sub={`${stats?.totalLoans ?? 0} active loans`} />
        <StatCard title="NPA" value={`₹${fmt(stats?.npaAmount)}`} icon={AlertTriangle} color="bg-red-100 text-red-600" sub={`${stats?.npaCount ?? 0} accounts`} alert={stats?.npaCount > 0} />
      </div>

      {/* NOF Compliance Banner */}
      <Card className={stats?.isCompliant ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}>
        <CardContent className="p-4 flex items-center gap-4">
          {stats?.isCompliant ? <CheckCircle className="h-6 w-6 text-green-600" /> : <AlertTriangle className="h-6 w-6 text-red-600" />}
          <div>
            <p className="font-semibold">{stats?.isCompliant ? "NOF Compliance: COMPLIANT" : "NOF Compliance: NON-COMPLIANT"}</p>
            <p className="text-sm text-muted-foreground">
              Net Owned Funds: ₹{fmt(stats?.netOwnedFunds)} | Total Deposits: ₹{fmt(stats?.totalDeposits)} |
              Ratio: {fmt(stats?.depositToNofRatio)}x (Max 20x allowed)
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {maturityDue.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" />Maturing in 30 Days ({maturityDue.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {maturityDue.slice(0, 5).map((d: any) => (
                <div key={d.id} className="flex items-center justify-between text-sm border rounded p-2">
                  <div><p className="font-medium">{d.account_number}</p><p className="text-xs text-muted-foreground">{d.member_name} · {d.deposit_type.toUpperCase()}</p></div>
                  <div className="text-right"><p className="font-bold text-green-600">₹{fmt(d.maturity_amount || d.principal_amount)}</p><p className="text-xs text-muted-foreground">{fmtDate(d.maturity_date)}</p></div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        {overdue.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2 text-red-600"><AlertTriangle className="h-4 w-4" />Overdue EMIs ({overdue.length})</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {overdue.slice(0, 5).map((l: any) => (
                <div key={l.id} className="flex items-center justify-between text-sm border border-red-200 rounded p-2">
                  <div><p className="font-medium">{l.loan_number}</p><p className="text-xs text-muted-foreground">{l.member_name} · {l.loan_type}</p></div>
                  <div className="text-right"><p className="font-bold text-red-600">₹{fmt(l.outstanding_principal)}</p><p className="text-xs">{l.emis_pending} EMIs due</p></div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Members Tab ───────────────────────────────────────────────────────────────
function MembersTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [showShare, setShowShare] = useState<any>(null);
  const [shareForm, setShareForm] = useState<any>({ shares_count: 1, share_value: 10, payment_mode: "cash" });

  const { data: members = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/members"] });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/nidhi/members/${editing.id}`, data) : apiRequest("POST", "/api/nidhi/members", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/members"] }); queryClient.invalidateQueries({ queryKey: ["/api/nidhi/stats"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const del = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/nidhi/members/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/members"] }); toast({ title: "Deleted" }); },
  });
  const allotShares = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("POST", `/api/nidhi/members/${id}/shares`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/members"] }); setShowShare(null); toast({ title: "Shares allotted" }); },
  });

  const filtered = members.filter((m: any) => !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.member_number?.includes(search) || m.phone?.includes(search));
  const openForm = (m?: any) => { setEditing(m || null); setForm(m ? { ...m } : { gender: "male", kyc_status: "pending", status: "active" }); setShowForm(true); };

  const KYC_COLOR: Record<string, string> = { verified: "bg-green-100 text-green-700", pending: "bg-yellow-100 text-yellow-700", rejected: "bg-red-100 text-red-700" };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name, member #, phone…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Register Member</Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Member #", "Name", "Phone", "City", "Shares", "KYC", "Status", ""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((m: any) => (
              <tr key={m.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium text-blue-600">{m.member_number}</td>
                <td className="px-3 py-2"><p className="font-medium">{m.name}</p><p className="text-xs text-muted-foreground">{m.father_name ? `S/o ${m.father_name}` : ""}</p></td>
                <td className="px-3 py-2">{m.phone || "—"}</td>
                <td className="px-3 py-2">{m.city || "—"}</td>
                <td className="px-3 py-2">{m.shares_held} × ₹{m.share_value} = <span className="font-bold">₹{fmt(m.total_share_amount)}</span></td>
                <td className="px-3 py-2"><Badge className={KYC_COLOR[m.kyc_status] || ""}>{m.kyc_status}</Badge></td>
                <td className="px-3 py-2"><Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge></td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setShowShare(m); setShareForm({ shares_count: 1, share_value: 10, payment_mode: "cash" }); }}>+Shares</Button>
                    <Button size="sm" variant="ghost" onClick={() => openForm(m)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => del.mutate(m.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">No members</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Member Form */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Member" : "Register Member"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Full Name *"><Input value={form.name || ""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></FieldRow>
            <FieldRow label="Father's Name"><Input value={form.father_name || ""} onChange={e => setForm((p: any) => ({ ...p, father_name: e.target.value }))} /></FieldRow>
            <FieldRow label="Date of Birth"><Input type="date" value={form.date_of_birth || ""} onChange={e => setForm((p: any) => ({ ...p, date_of_birth: e.target.value }))} /></FieldRow>
            <FieldRow label="Gender"><Select value={form.gender || "male"} onValueChange={v => setForm((p: any) => ({ ...p, gender: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["male","female","other"].map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Phone *"><Input value={form.phone || ""} onChange={e => setForm((p: any) => ({ ...p, phone: e.target.value }))} /></FieldRow>
            <FieldRow label="Alternate Phone"><Input value={form.alternate_phone || ""} onChange={e => setForm((p: any) => ({ ...p, alternate_phone: e.target.value }))} /></FieldRow>
            <FieldRow label="Email" col2><Input value={form.email || ""} onChange={e => setForm((p: any) => ({ ...p, email: e.target.value }))} /></FieldRow>
            <FieldRow label="Address" col2><Textarea value={form.address || ""} onChange={e => setForm((p: any) => ({ ...p, address: e.target.value }))} rows={2} /></FieldRow>
            <FieldRow label="City"><Input value={form.city || ""} onChange={e => setForm((p: any) => ({ ...p, city: e.target.value }))} /></FieldRow>
            <FieldRow label="State"><Input value={form.state || ""} onChange={e => setForm((p: any) => ({ ...p, state: e.target.value }))} /></FieldRow>
            <FieldRow label="Pincode"><Input value={form.pincode || ""} onChange={e => setForm((p: any) => ({ ...p, pincode: e.target.value }))} /></FieldRow>
            <FieldRow label="KYC Status"><Select value={form.kyc_status || "pending"} onValueChange={v => setForm((p: any) => ({ ...p, kyc_status: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["pending","verified","rejected"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Aadhaar Number"><Input value={form.aadhar_number || ""} onChange={e => setForm((p: any) => ({ ...p, aadhar_number: e.target.value }))} maxLength={12} /></FieldRow>
            <FieldRow label="PAN Number"><Input value={form.pan_number || ""} onChange={e => setForm((p: any) => ({ ...p, pan_number: e.target.value.toUpperCase() }))} maxLength={10} /></FieldRow>
            <FieldRow label="Nominee Name"><Input value={form.nominee_name || ""} onChange={e => setForm((p: any) => ({ ...p, nominee_name: e.target.value }))} /></FieldRow>
            <FieldRow label="Nominee Relation"><Input value={form.nominee_relation || ""} onChange={e => setForm((p: any) => ({ ...p, nominee_relation: e.target.value }))} /></FieldRow>
            <FieldRow label="Membership Date"><Input type="date" value={form.membership_date || ""} onChange={e => setForm((p: any) => ({ ...p, membership_date: e.target.value }))} /></FieldRow>
            <FieldRow label="Initial Shares"><Input type="number" value={form.shares_held || 1} onChange={e => setForm((p: any) => ({ ...p, shares_held: e.target.value }))} /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.name}>Save</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Allotment */}
      <Dialog open={!!showShare} onOpenChange={v => { if (!v) setShowShare(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Allot Shares — {showShare?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Shares Count"><Input type="number" value={shareForm.shares_count} onChange={e => setShareForm((p: any) => ({ ...p, shares_count: e.target.value }))} /></FieldRow>
            <FieldRow label="Share Value (₹)"><Input type="number" value={shareForm.share_value} onChange={e => setShareForm((p: any) => ({ ...p, share_value: e.target.value }))} /></FieldRow>
            <FieldRow label="Certificate #"><Input value={shareForm.certificate_number || ""} onChange={e => setShareForm((p: any) => ({ ...p, certificate_number: e.target.value }))} /></FieldRow>
            <FieldRow label="Payment Mode"><Select value={shareForm.payment_mode} onValueChange={v => setShareForm((p: any) => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash","cheque","upi","neft"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FieldRow>
            <p className="text-sm font-medium">Total: ₹{fmt(Number(shareForm.shares_count || 0) * Number(shareForm.share_value || 0))}</p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => allotShares.mutate({ id: showShare.id, data: shareForm })}>Allot</Button>
            <Button variant="outline" onClick={() => setShowShare(null)}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Deposits Tab ──────────────────────────────────────────────────────────────
function DepositsTab() {
  const { toast } = useToast();
  const [depType, setDepType] = useState("fd");
  const [showForm, setShowForm] = useState(false);
  const [showTxn, setShowTxn] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [txnForm, setTxnForm] = useState<any>({ transaction_type: "withdrawal", payment_mode: "cash" });

  const { data: deposits = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/deposits", depType], queryFn: () => fetch(`/api/nidhi/deposits?deposit_type=${depType}`).then(r => r.json()) });
  const { data: members = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/members"] });
  const { data: rates = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/interest-rates"] });
  const { data: txns = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/deposit-txns", showTxn?.id], queryFn: () => showTxn ? fetch(`/api/nidhi/deposits/${showTxn.id}/transactions`).then(r => r.json()) : Promise.resolve([]), enabled: !!showTxn });

  const createDeposit = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/nidhi/deposits", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/deposits", depType] }); queryClient.invalidateQueries({ queryKey: ["/api/nidhi/stats"] }); setShowForm(false); setForm({}); toast({ title: "Account opened" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const createTxn = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/nidhi/deposits/${showTxn?.id}/transaction`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/deposit-txns", showTxn?.id] }); queryClient.invalidateQueries({ queryKey: ["/api/nidhi/deposits", depType] }); queryClient.invalidateQueries({ queryKey: ["/api/nidhi/stats"] }); toast({ title: "Transaction recorded" }); },
  });

  const DEP_LABELS: Record<string, string> = { fd: "Fixed Deposit", rd: "Recurring Deposit", savings: "Savings Account", mis: "Monthly Income Scheme", daily: "Daily Deposit" };
  const depRates = rates.filter((r: any) => r.deposit_type === depType && r.is_active);
  const STATUS_COLOR: Record<string, string> = { active: "bg-green-100 text-green-700", matured: "bg-blue-100 text-blue-700", closed: "bg-gray-100 text-gray-600", premature_closed: "bg-orange-100 text-orange-700" };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2">
          {["fd","rd","savings","mis","daily"].map(t => <Button key={t} size="sm" variant={depType === t ? "default" : "outline"} onClick={() => setDepType(t)}>{DEP_LABELS[t] || t}</Button>)}
        </div>
        <Button onClick={() => { setForm({ deposit_type: depType, interest_payout: "on_maturity" }); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" />Open Account</Button>
      </div>

      {depRates.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {depRates.map((r: any) => <Badge key={r.id} variant="outline" className="text-xs">{r.min_tenure_months}–{r.max_tenure_months || "∞"} months: <span className="font-bold ml-1">{r.interest_rate}%</span></Badge>)}
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Account #", "Member", "Principal", "Rate", "Tenure", "Maturity Date", "Maturity Amount", "Status", ""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {deposits.map((d: any) => (
              <tr key={d.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium text-blue-600">{d.account_number}</td>
                <td className="px-3 py-2"><p>{d.member_name}</p><p className="text-xs text-muted-foreground">{d.member_number}</p></td>
                <td className="px-3 py-2">₹{fmt(d.principal_amount)}</td>
                <td className="px-3 py-2">{d.interest_rate}%</td>
                <td className="px-3 py-2">{d.tenure_months ? `${d.tenure_months}m` : "—"}</td>
                <td className="px-3 py-2">{fmtDate(d.maturity_date)}</td>
                <td className="px-3 py-2 font-bold text-green-600">{d.maturity_amount ? `₹${fmt(d.maturity_amount)}` : "—"}</td>
                <td className="px-3 py-2"><Badge className={STATUS_COLOR[d.status] || ""}>{d.status}</Badge></td>
                <td className="px-3 py-2"><Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setShowTxn(d)}>Txns</Button></td>
              </tr>
            ))}
            {deposits.length === 0 && <tr><td colSpan={9} className="px-3 py-4 text-center text-muted-foreground">No {DEP_LABELS[depType]} accounts</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Open Deposit */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Open {DEP_LABELS[depType]}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Member *"><Select value={form.member_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, member_id: v }))}><SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger><SelectContent>{members.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name} ({m.member_number})</SelectItem>)}</SelectContent></Select></FieldRow></div>
            <FieldRow label="Principal Amount *"><Input type="number" value={form.principal_amount || ""} onChange={e => setForm((p: any) => ({ ...p, principal_amount: e.target.value }))} /></FieldRow>
            <FieldRow label="Interest Rate (% p.a.) *"><Input type="number" step="0.1" value={form.interest_rate || ""} onChange={e => setForm((p: any) => ({ ...p, interest_rate: e.target.value }))} /></FieldRow>
            <FieldRow label="Tenure (months)"><Input type="number" value={form.tenure_months || ""} onChange={e => setForm((p: any) => ({ ...p, tenure_months: e.target.value }))} /></FieldRow>
            <FieldRow label="Opening Date"><Input type="date" value={form.opening_date || ""} onChange={e => setForm((p: any) => ({ ...p, opening_date: e.target.value }))} /></FieldRow>
            <FieldRow label="Interest Payout"><Select value={form.interest_payout || "on_maturity"} onValueChange={v => setForm((p: any) => ({ ...p, interest_payout: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["on_maturity","monthly","quarterly"].map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Nominee"><Input value={form.nominee_name || ""} onChange={e => setForm((p: any) => ({ ...p, nominee_name: e.target.value }))} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2} /></FieldRow></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => createDeposit.mutate({ ...form, deposit_type: depType })} disabled={!form.member_id || !form.principal_amount || !form.interest_rate}>Open Account</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transactions */}
      <Dialog open={!!showTxn} onOpenChange={v => { if (!v) setShowTxn(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Transactions — {showTxn?.account_number} ({showTxn?.member_name})</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <FieldRow label="Type"><Select value={txnForm.transaction_type} onValueChange={v => setTxnForm((p: any) => ({ ...p, transaction_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["credit","interest_credit","withdrawal","closure","premature_closure","penalty"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Amount"><Input type="number" value={txnForm.amount || ""} onChange={e => setTxnForm((p: any) => ({ ...p, amount: e.target.value }))} /></FieldRow>
            <FieldRow label="Mode"><Select value={txnForm.payment_mode || "cash"} onValueChange={v => setTxnForm((p: any) => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash","upi","neft","cheque"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FieldRow>
          </div>
          <div className="flex gap-2 mb-4">
            <Button size="sm" onClick={() => createTxn.mutate(txnForm)} disabled={!txnForm.amount}>Record Transaction</Button>
          </div>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr>{["Date","Type","Amount","Interest","Balance","Mode","Ref"].map(h => <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {txns.map((t: any) => (
                  <tr key={t.id} className="border-t">
                    <td className="px-2 py-1.5">{fmtDate(t.transaction_date)}</td>
                    <td className="px-2 py-1.5"><Badge variant="outline" className="text-xs">{t.transaction_type}</Badge></td>
                    <td className={`px-2 py-1.5 font-medium ${t.transaction_type.includes('withdrawal') || t.transaction_type.includes('closure') ? 'text-red-600' : 'text-green-600'}`}>₹{fmt(t.amount)}</td>
                    <td className="px-2 py-1.5">{t.interest_amount > 0 ? `₹${fmt(t.interest_amount)}` : "—"}</td>
                    <td className="px-2 py-1.5">₹{fmt(t.balance_after)}</td>
                    <td className="px-2 py-1.5">{t.payment_mode}</td>
                    <td className="px-2 py-1.5">{t.reference_number || "—"}</td>
                  </tr>
                ))}
                {txns.length === 0 && <tr><td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">No transactions</td></tr>}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Loans Tab ─────────────────────────────────────────────────────────────────
function LoansTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ loan_type: "gold_loan", tenure_months: 12 });
  const [showLoan, setShowLoan] = useState<any>(null);
  const [showEmi, setShowEmi] = useState<any>(null);
  const [emiForm, setEmiForm] = useState<any>({ payment_mode: "cash" });

  const { data: loans = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/loans"] });
  const { data: members = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/members"] });
  const { data: loanTxns = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/loan-txns", showLoan?.id], queryFn: () => showLoan ? fetch(`/api/nidhi/loans/${showLoan.id}/transactions`).then(r => r.json()) : Promise.resolve([]), enabled: !!showLoan });
  const { data: schedule = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/emi-schedule", showLoan?.id], queryFn: () => showLoan ? fetch(`/api/nidhi/loans/${showLoan.id}/emi-schedule`).then(r => r.json()) : Promise.resolve([]), enabled: !!showLoan });

  const createLoan = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/nidhi/loans", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/loans"] }); queryClient.invalidateQueries({ queryKey: ["/api/nidhi/stats"] }); setShowForm(false); setForm({ loan_type: "gold_loan", tenure_months: 12 }); toast({ title: "Loan created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const collectEmi = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/api/nidhi/loans/${showLoan?.id}/collect-emi`, data),
    onSuccess: (d: any) => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/loans"] }); queryClient.invalidateQueries({ queryKey: ["/api/nidhi/loan-txns", showLoan?.id] }); queryClient.invalidateQueries({ queryKey: ["/api/nidhi/stats"] }); toast({ title: `EMI Collected — Outstanding: ₹${fmt(d?.outstanding_after)}` }); },
  });
  const markNpa = useMutation({
    mutationFn: (id: any) => apiRequest("PUT", `/api/nidhi/loans/${id}/mark-npa`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/loans"] }); toast({ title: "Marked as NPA" }); },
  });

  const STATUS_COLOR: Record<string, string> = { active: "bg-green-100 text-green-700", closed: "bg-gray-100 text-gray-600", npa: "bg-red-100 text-red-700", written_off: "bg-red-200 text-red-800" };

  // Pre-fill EMI from schedule
  const nextEmi = showLoan ? schedule[showLoan.emis_paid] : null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" />New Loan</Button></div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Loan #", "Member", "Type", "Principal", "Rate", "EMI", "Outstanding", "EMIs", "Status", ""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {loans.map((l: any) => (
              <tr key={l.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium text-blue-600">{l.loan_number}</td>
                <td className="px-3 py-2"><p>{l.member_name}</p><p className="text-xs text-muted-foreground">{l.member_number}</p></td>
                <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{l.loan_type}</Badge></td>
                <td className="px-3 py-2">₹{fmt(l.principal_amount)}</td>
                <td className="px-3 py-2">{l.interest_rate}%</td>
                <td className="px-3 py-2">₹{fmt(l.emi_amount)}</td>
                <td className="px-3 py-2 font-bold text-red-600">₹{fmt(l.outstanding_principal)}</td>
                <td className="px-3 py-2">{l.emis_paid}/{l.total_emis}</td>
                <td className="px-3 py-2"><Badge className={STATUS_COLOR[l.status] || ""}>{l.status}</Badge></td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => { setShowLoan(l); setEmiForm({ payment_mode: "cash", principal_component: 0, interest_component: 0 }); }}>Manage</Button>
                    {l.status === "active" && <Button size="sm" variant="ghost" className="text-red-600 text-xs h-7" onClick={() => markNpa.mutate(l.id)}>NPA</Button>}
                  </div>
                </td>
              </tr>
            ))}
            {loans.length === 0 && <tr><td colSpan={10} className="px-3 py-4 text-center text-muted-foreground">No loans</td></tr>}
          </tbody>
        </table>
      </div>

      {/* New Loan Form */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Loan</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Member *"><Select value={form.member_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, member_id: v }))}><SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger><SelectContent>{members.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.name} ({m.member_number})</SelectItem>)}</SelectContent></Select></FieldRow></div>
            <FieldRow label="Loan Type"><Select value={form.loan_type || "gold_loan"} onValueChange={v => setForm((p: any) => ({ ...p, loan_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["gold_loan","fd_loan","property_loan","vehicle_loan","personal_loan"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Principal Amount *"><Input type="number" value={form.principal_amount || ""} onChange={e => setForm((p: any) => ({ ...p, principal_amount: e.target.value }))} /></FieldRow>
            <FieldRow label="Interest Rate (% p.a.) *"><Input type="number" step="0.1" value={form.interest_rate || ""} onChange={e => setForm((p: any) => ({ ...p, interest_rate: e.target.value }))} /></FieldRow>
            <FieldRow label="Tenure (months) *"><Input type="number" value={form.tenure_months || ""} onChange={e => setForm((p: any) => ({ ...p, tenure_months: e.target.value }))} /></FieldRow>
            <FieldRow label="Disbursement Date"><Input type="date" value={form.disbursement_date || ""} onChange={e => setForm((p: any) => ({ ...p, disbursement_date: e.target.value }))} /></FieldRow>
            <FieldRow label="First EMI Date"><Input type="date" value={form.first_emi_date || ""} onChange={e => setForm((p: any) => ({ ...p, first_emi_date: e.target.value }))} /></FieldRow>
            <FieldRow label="Security Type"><Select value={form.security_type || ""} onValueChange={v => setForm((p: any) => ({ ...p, security_type: v }))}><SelectTrigger><SelectValue placeholder="Security" /></SelectTrigger><SelectContent>{["gold","fd","property","vehicle","guarantor"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Security Value"><Input type="number" value={form.security_value || ""} onChange={e => setForm((p: any) => ({ ...p, security_value: e.target.value }))} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Security Description"><Textarea value={form.security_description || ""} onChange={e => setForm((p: any) => ({ ...p, security_description: e.target.value }))} rows={2} /></FieldRow></div>
            {form.principal_amount && form.interest_rate && form.tenure_months && (
              <div className="col-span-2 bg-muted/50 rounded p-3">
                <p className="text-sm font-medium">Calculated EMI: <span className="text-blue-600 font-bold">₹{fmt(
                  (() => { const r = Number(form.interest_rate)/12/100; const n = Number(form.tenure_months); const p = Number(form.principal_amount); return r === 0 ? p/n : Math.round(p*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1)*100)/100; })()
                )}</span></p>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => createLoan.mutate(form)} disabled={!form.member_id || !form.principal_amount || !form.interest_rate || !form.tenure_months}>Create Loan</Button>
            <Button variant="outline" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loan Management */}
      <Dialog open={!!showLoan} onOpenChange={v => { if (!v) setShowLoan(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Loan: {showLoan?.loan_number} — {showLoan?.member_name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-4 gap-2 text-sm mb-4">
            <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Principal</p><p className="font-bold">₹{fmt(showLoan?.principal_amount)}</p></div>
            <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">Outstanding</p><p className="font-bold text-red-600">₹{fmt(showLoan?.outstanding_principal)}</p></div>
            <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">EMI</p><p className="font-bold">₹{fmt(showLoan?.emi_amount)}</p></div>
            <div className="bg-muted/50 rounded p-2"><p className="text-xs text-muted-foreground">EMIs Paid/Total</p><p className="font-bold">{showLoan?.emis_paid}/{showLoan?.total_emis}</p></div>
          </div>
          {/* Collect EMI */}
          {showLoan?.status === "active" && (
            <div className="border rounded p-3 mb-4 bg-green-50">
              <p className="text-sm font-semibold mb-2">Collect EMI #{(showLoan?.emis_paid || 0) + 1}</p>
              <div className="grid grid-cols-3 gap-2">
                <FieldRow label="Principal"><Input type="number" value={emiForm.principal_component || ""} onChange={e => setEmiForm((p: any) => ({ ...p, principal_component: e.target.value }))} /></FieldRow>
                <FieldRow label="Interest"><Input type="number" value={emiForm.interest_component || ""} onChange={e => setEmiForm((p: any) => ({ ...p, interest_component: e.target.value }))} /></FieldRow>
                <FieldRow label="Penalty"><Input type="number" value={emiForm.penalty_amount || ""} onChange={e => setEmiForm((p: any) => ({ ...p, penalty_amount: e.target.value }))} /></FieldRow>
                <FieldRow label="Mode"><Select value={emiForm.payment_mode} onValueChange={v => setEmiForm((p: any) => ({ ...p, payment_mode: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["cash","upi","neft","cheque"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></FieldRow>
                <FieldRow label="Reference"><Input value={emiForm.reference_number || ""} onChange={e => setEmiForm((p: any) => ({ ...p, reference_number: e.target.value }))} /></FieldRow>
              </div>
              {nextEmi && <p className="text-xs text-muted-foreground mt-1">Suggested: Principal ₹{fmt(nextEmi.principal)} + Interest ₹{fmt(nextEmi.interest)} = ₹{fmt(nextEmi.emi_amount)}</p>}
              <Button size="sm" className="mt-2" onClick={() => collectEmi.mutate({ ...emiForm, emi_number: (showLoan?.emis_paid || 0) + 1 })}>Collect EMI</Button>
            </div>
          )}
          <Tabs defaultValue="schedule">
            <TabsList><TabsTrigger value="schedule">EMI Schedule</TabsTrigger><TabsTrigger value="history">Payment History</TabsTrigger></TabsList>
            <TabsContent value="schedule">
              <div className="rounded border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted"><tr>{["#","Due Date","Principal","Interest","EMI","Balance"].map(h => <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
                  <tbody>
                    {schedule.map((s: any) => (
                      <tr key={s.emi_number} className={`border-t ${s.emi_number <= (showLoan?.emis_paid || 0) ? "bg-green-50 text-muted-foreground line-through" : ""}`}>
                        <td className="px-2 py-1">{s.emi_number}</td>
                        <td className="px-2 py-1">{s.due_date}</td>
                        <td className="px-2 py-1">₹{fmt(s.principal)}</td>
                        <td className="px-2 py-1">₹{fmt(s.interest)}</td>
                        <td className="px-2 py-1 font-medium">₹{fmt(s.emi_amount)}</td>
                        <td className="px-2 py-1">₹{fmt(s.balance_after)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
            <TabsContent value="history">
              <div className="rounded border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted"><tr>{["Date","Type","Principal","Interest","Penalty","Total","Mode"].map(h => <th key={h} className="text-left px-2 py-1.5 font-medium">{h}</th>)}</tr></thead>
                  <tbody>
                    {loanTxns.map((t: any) => (
                      <tr key={t.id} className="border-t">
                        <td className="px-2 py-1">{fmtDate(t.payment_date)}</td>
                        <td className="px-2 py-1"><Badge variant="outline" className="text-xs">{t.transaction_type}</Badge></td>
                        <td className="px-2 py-1">₹{fmt(t.principal_component)}</td>
                        <td className="px-2 py-1">₹{fmt(t.interest_component)}</td>
                        <td className="px-2 py-1">{t.penalty_amount > 0 ? `₹${fmt(t.penalty_amount)}` : "—"}</td>
                        <td className="px-2 py-1 font-bold">₹{fmt(t.total_amount)}</td>
                        <td className="px-2 py-1">{t.payment_mode}</td>
                      </tr>
                    ))}
                    {loanTxns.length === 0 && <tr><td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">No transactions</td></tr>}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Interest Rates Tab ────────────────────────────────────────────────────────
function InterestRatesTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ deposit_type: "fd", is_active: 1 });

  const { data: rates = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/interest-rates"] });

  const save = useMutation({
    mutationFn: (data: any) => editing ? apiRequest("PUT", `/api/nidhi/interest-rates/${editing.id}`, data) : apiRequest("POST", "/api/nidhi/interest-rates", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/interest-rates"] }); setShowForm(false); setEditing(null); toast({ title: "Saved" }); },
  });
  const del = useMutation({ mutationFn: (id: any) => apiRequest("DELETE", `/api/nidhi/interest-rates/${id}`), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/nidhi/interest-rates"] }) });

  const openForm = (r?: any) => { setEditing(r || null); setForm(r ? { ...r } : { deposit_type: "fd", is_active: 1 }); setShowForm(true); };
  const grouped = rates.reduce((acc: any, r: any) => { if (!acc[r.deposit_type]) acc[r.deposit_type] = []; acc[r.deposit_type].push(r); return acc; }, {});

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Rate</Button></div>
      {Object.entries(grouped).map(([type, rateList]: any) => (
        <Card key={type}>
          <CardHeader><CardTitle className="text-sm capitalize">{type.replace(/_/g, ' ')} Rates</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-muted-foreground"><tr>{["Tenure (months)","Rate (%)","Effective From","Active",""].map(h => <th key={h} className="text-left pb-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {rateList.map((r: any) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-1.5">{r.min_tenure_months}–{r.max_tenure_months || "∞"} months</td>
                    <td className="py-1.5 font-bold text-blue-600">{r.interest_rate}%</td>
                    <td className="py-1.5">{fmtDate(r.effective_from)}</td>
                    <td className="py-1.5"><Badge className={r.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}>{r.is_active ? "Active" : "Inactive"}</Badge></td>
                    <td className="py-1.5"><div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => openForm(r)}><Pencil className="h-3 w-3" /></Button><Button size="sm" variant="ghost" className="text-red-600" onClick={() => del.mutate(r.id)}><Trash2 className="h-3 w-3" /></Button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ))}
      {Object.keys(grouped).length === 0 && <div className="text-center py-8 text-muted-foreground">No interest rates configured</div>}

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? "Edit Rate" : "Add Rate"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <FieldRow label="Deposit Type"><Select value={form.deposit_type || "fd"} onValueChange={v => setForm((p: any) => ({ ...p, deposit_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["savings","fd","rd","mis","daily"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FieldRow>
            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="Min Tenure (months)"><Input type="number" value={form.min_tenure_months || ""} onChange={e => setForm((p: any) => ({ ...p, min_tenure_months: e.target.value }))} /></FieldRow>
              <FieldRow label="Max Tenure (months)"><Input type="number" value={form.max_tenure_months || ""} onChange={e => setForm((p: any) => ({ ...p, max_tenure_months: e.target.value }))} /></FieldRow>
            </div>
            <FieldRow label="Interest Rate (% p.a.) *"><Input type="number" step="0.01" value={form.interest_rate || ""} onChange={e => setForm((p: any) => ({ ...p, interest_rate: e.target.value }))} /></FieldRow>
            <FieldRow label="Effective From"><Input type="date" value={form.effective_from || ""} onChange={e => setForm((p: any) => ({ ...p, effective_from: e.target.value }))} /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2"><Button className="flex-1" onClick={() => save.mutate(form)} disabled={!form.interest_rate}>Save</Button><Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Compliance Tab ────────────────────────────────────────────────────────────
function ComplianceTab() {
  const { toast } = useToast();
  const [form, setForm] = useState<any>({ report_type: "NDH-1", financial_year: "2025-26" });

  const { data: reports = [] } = useQuery<any[]>({ queryKey: ["/api/nidhi/compliance"] });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/nidhi/stats"] });

  const generate = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/nidhi/compliance/generate", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/nidhi/compliance"] }); toast({ title: "Report generated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Generate Compliance Report</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <FieldRow label="Report Type"><Select value={form.report_type} onValueChange={v => setForm((p: any) => ({ ...p, report_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["NDH-1","NDH-3","NDH-4"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></FieldRow>
            <FieldRow label="Financial Year"><Input value={form.financial_year || ""} onChange={e => setForm((p: any) => ({ ...p, financial_year: e.target.value }))} placeholder="2025-26" /></FieldRow>
            <div className="grid grid-cols-2 gap-2">
              <FieldRow label="Period From"><Input type="date" value={form.period_from || ""} onChange={e => setForm((p: any) => ({ ...p, period_from: e.target.value }))} /></FieldRow>
              <FieldRow label="Period To"><Input type="date" value={form.period_to || ""} onChange={e => setForm((p: any) => ({ ...p, period_to: e.target.value }))} /></FieldRow>
            </div>
            <Button onClick={() => generate.mutate(form)} disabled={generate.isPending} className="w-full">Generate {form.report_type}</Button>
          </CardContent>
        </Card>

        <Card className={stats?.isCompliant ? "border-green-300" : "border-red-300"}>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Current Compliance Status</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm"><span>Net Owned Funds (NOF)</span><span className="font-bold">₹{fmt(stats?.netOwnedFunds)}</span></div>
            <div className="flex justify-between text-sm"><span>Total Deposits</span><span className="font-bold">₹{fmt(stats?.totalDeposits)}</span></div>
            <div className="flex justify-between text-sm"><span>Deposit/NOF Ratio</span><span className={`font-bold ${stats?.depositToNofRatio > 20 ? "text-red-600" : "text-green-600"}`}>{fmt(stats?.depositToNofRatio)}x <span className="text-xs">(Max: 20x)</span></span></div>
            <div className="flex justify-between text-sm"><span>Total Loans</span><span className="font-bold">₹{fmt(stats?.totalOutstanding)}</span></div>
            <div className="flex justify-between text-sm"><span>NPA Amount</span><span className={`font-bold ${stats?.npaAmount > 0 ? "text-red-600" : ""}`}>₹{fmt(stats?.npaAmount)}</span></div>
            <div className={`text-center py-2 rounded font-semibold ${stats?.isCompliant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {stats?.isCompliant ? "✓ COMPLIANT" : "✗ NON-COMPLIANT"}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Report","FY","Members","Deposits","Loans","NOF","Ratio","Status","Generated"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {reports.map((r: any) => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{r.report_type}</td>
                <td className="px-3 py-2">{r.financial_year || "—"}</td>
                <td className="px-3 py-2">{r.total_members}</td>
                <td className="px-3 py-2">₹{fmt(r.total_deposits)}</td>
                <td className="px-3 py-2">₹{fmt(r.total_loans)}</td>
                <td className="px-3 py-2">₹{fmt(r.net_owned_funds)}</td>
                <td className="px-3 py-2">{r.deposit_to_nof_ratio}x</td>
                <td className="px-3 py-2"><Badge className={r.is_compliant ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>{r.is_compliant ? "Compliant" : "Non-Compliant"}</Badge></td>
                <td className="px-3 py-2">{fmtDate(r.generated_at)}</td>
              </tr>
            ))}
            {reports.length === 0 && <tr><td colSpan={9} className="px-3 py-4 text-center text-muted-foreground">No reports generated</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Transactions Tab ──────────────────────────────────────────────────────────
function TransactionsTab() {
  const [from, setFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const { data: txns = [], refetch } = useQuery<any[]>({ queryKey: ["/api/nidhi/transactions", from, to], queryFn: () => fetch(`/api/nidhi/transactions?from_date=${from}&to_date=${to}`).then(r => r.json()) });

  const totalCredit = txns.filter((t: any) => t.ledger_type === "deposit" && (t.transaction_type === "credit" || t.transaction_type === "interest_credit")).reduce((s, t: any) => s + Number(t.amount || 0), 0);
  const totalDebit = txns.filter((t: any) => t.ledger_type === "deposit" && (t.transaction_type === "withdrawal" || t.transaction_type === "closure")).reduce((s, t: any) => s + Number(t.amount || 0), 0);
  const totalEmi = txns.filter((t: any) => t.ledger_type === "loan" && t.transaction_type === "emi").reduce((s, t: any) => s + Number(t.total_amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        <FieldRow label="From"><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></FieldRow>
        <FieldRow label="To"><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></FieldRow>
        <Button size="sm" className="mt-5" onClick={() => refetch()}>Apply</Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Deposit Credits</p><p className="font-bold text-green-600">₹{fmt(totalCredit)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Deposit Withdrawals</p><p className="font-bold text-red-600">₹{fmt(totalDebit)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">EMI Collections</p><p className="font-bold text-blue-600">₹{fmt(totalEmi)}</p></CardContent></Card>
      </div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground"><tr>{["Date","Type","Account","Member","Amount","Mode","Narration"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {txns.slice(0, 100).map((t: any) => (
              <tr key={t.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2">{fmtDate(t.transaction_date || t.payment_date)}</td>
                <td className="px-3 py-2"><div className="flex gap-1"><Badge variant="outline" className="text-xs">{t.ledger_type}</Badge><Badge variant="outline" className="text-xs">{t.transaction_type}</Badge></div></td>
                <td className="px-3 py-2">{t.account_number || t.loan_number || "—"}</td>
                <td className="px-3 py-2">{t.member_name || "—"}</td>
                <td className="px-3 py-2 font-bold">₹{fmt(t.amount || t.total_amount)}</td>
                <td className="px-3 py-2">{t.payment_mode || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{t.narration || "—"}</td>
              </tr>
            ))}
            {txns.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No transactions</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NidhiPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg"><Landmark className="h-6 w-6 text-emerald-600" /></div>
        <div><h1 className="text-2xl font-bold">Nidhi Company / NBFC ERP</h1><p className="text-sm text-muted-foreground">Members, deposits, loans & compliance</p></div>
      </div>
      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="deposits">Deposits</TabsTrigger>
          <TabsTrigger value="loans">Loans</TabsTrigger>
          <TabsTrigger value="rates">Interest Rates</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard"><DashboardTab /></TabsContent>
        <TabsContent value="members"><MembersTab /></TabsContent>
        <TabsContent value="deposits"><DepositsTab /></TabsContent>
        <TabsContent value="loans"><LoansTab /></TabsContent>
        <TabsContent value="rates"><InterestRatesTab /></TabsContent>
        <TabsContent value="compliance"><ComplianceTab /></TabsContent>
        <TabsContent value="transactions"><TransactionsTab /></TabsContent>
      </Tabs>
    </div>
  );
}
