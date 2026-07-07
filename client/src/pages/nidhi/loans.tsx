import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle } from "lucide-react";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());

const fmt = (n: any) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const STATUS_BADGE: Record<string, any> = { active: "default", closed: "secondary", npa: "destructive" };
const LOAN_TYPES = ["personal", "gold_loan", "fd_loan", "property", "vehicle", "business"];
const BLANK = { member_id: "", loan_type: "personal", principal_amount: "", interest_rate: "", tenure_months: "12", disbursement_date: new Date().toISOString().slice(0, 10), security_type: "", security_description: "", approved_by: "", notes: "" };

export default function NidhiLoansPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(BLANK);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");

  const { data: loans = [] } = useQuery<any[]>({
    queryKey: ["nidhi-loans", filterStatus],
    queryFn: () => api("GET", `/api/nidhi/loans${filterStatus ? `?status=${filterStatus}` : ""}`),
  });

  const createMut = useMutation({
    mutationFn: (p: any) => api("POST", "/api/nidhi/loans", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-loans"] }); setOpen(false); setForm(BLANK); toast({ title: "Loan created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const markNPAMut = useMutation({
    mutationFn: ({ id, reason }: any) => api("PUT", `/api/nidhi/loans/${id}/mark-npa`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-loans"] }); toast({ title: "Marked as NPA" }); },
  });
  const disburseMut = useMutation({
    mutationFn: (id: any) => api("POST", `/api/nidhi/loans/${id}/disburse`, {}),
    onSuccess: () => toast({ title: "Loan disbursed to savings account" }),
  });

  const viewSchedule = async (id: number) => {
    const s = await api("GET", `/api/nidhi/loans/${id}/emi-schedule`);
    setSchedule(s);
    setScheduleOpen(true);
  };

  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));

  const npa = loans.filter((l: any) => l.status === "npa");

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Loans</h1>
        <Button size="sm" onClick={() => { setForm(BLANK); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />New Loan</Button>
      </div>

      {npa.length > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4" />{npa.length} NPA loans · {fmt(npa.reduce((s: number, l: any) => s + Number(l.outstanding_principal || 0), 0))} at risk
        </div>
      )}

      <div className="flex gap-2 mb-2">
        {["", "active", "closed", "npa"].map(s => (
          <Button key={s} size="sm" variant={filterStatus === s ? "default" : "outline"} onClick={() => setFilterStatus(s)}>
            {s === "" ? "All" : s.toUpperCase()}
          </Button>
        ))}
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Loan No.</TableHead><TableHead>Member</TableHead><TableHead>Type</TableHead>
            <TableHead>Principal</TableHead><TableHead>Outstanding</TableHead><TableHead>EMI</TableHead>
            <TableHead>Next EMI</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {loans.map((l: any) => (
              <TableRow key={l.id} className={l.status === "npa" ? "bg-red-50" : ""}>
                <TableCell className="font-mono text-sm">{l.loan_number}</TableCell>
                <TableCell>{l.member_name}</TableCell>
                <TableCell className="text-xs uppercase">{l.loan_type?.replace("_", " ")}</TableCell>
                <TableCell>{fmt(l.principal_amount)}</TableCell>
                <TableCell className="font-semibold">{fmt(l.outstanding_principal)}</TableCell>
                <TableCell>{fmt(l.emi_amount)}</TableCell>
                <TableCell className={`text-sm ${new Date(l.next_emi_date) < new Date() ? "text-red-600 font-semibold" : ""}`}>{l.next_emi_date || "—"}</TableCell>
                <TableCell><Badge variant={STATUS_BADGE[l.status] ?? "secondary"}>{l.status}</Badge></TableCell>
                <TableCell><div className="flex gap-1 flex-wrap">
                  <Button size="sm" variant="ghost" onClick={() => viewSchedule(l.id)}>Schedule</Button>
                  {l.status === "active" && <Button size="sm" variant="outline" onClick={() => disburseMut.mutate(l.id)}>Disburse</Button>}
                  {l.status === "active" && <Button size="sm" variant="ghost" className="text-red-600" onClick={() => { const r = prompt("NPA reason?"); if (r) markNPAMut.mutate({ id: l.id, reason: r }); }}>NPA</Button>}
                </div></TableCell>
              </TableRow>
            ))}
            {!loans.length && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No loans</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Loan</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Member ID</Label><Input value={form.member_id} onChange={e => f("member_id", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Loan Type</Label>
              <Select value={form.loan_type} onValueChange={v => f("loan_type", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{LOAN_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace("_"," ").toUpperCase()}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Principal (₹)</Label><Input type="number" value={form.principal_amount} onChange={e => f("principal_amount", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Interest Rate % p.a.</Label><Input type="number" step="0.1" value={form.interest_rate} onChange={e => f("interest_rate", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Tenure (months)</Label><Input type="number" value={form.tenure_months} onChange={e => f("tenure_months", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Disbursement Date</Label><Input type="date" value={form.disbursement_date} onChange={e => f("disbursement_date", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Security Type</Label><Input value={form.security_type} onChange={e => f("security_type", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Security Description</Label><Input value={form.security_description} onChange={e => f("security_description", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Approved By</Label><Input value={form.approved_by} onChange={e => f("approved_by", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Notes</Label><Input value={form.notes} onChange={e => f("notes", e.target.value)} className="h-8 text-sm" /></div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending}>Create Loan</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader><DialogTitle>EMI Schedule</DialogTitle></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Due Date</TableHead><TableHead>EMI</TableHead><TableHead>Principal</TableHead><TableHead>Interest</TableHead><TableHead>Balance</TableHead></TableRow></TableHeader>
            <TableBody>
              {schedule.map((s: any) => (
                <TableRow key={s.emi_number}>
                  <TableCell>{s.emi_number}</TableCell>
                  <TableCell>{s.due_date}</TableCell>
                  <TableCell>{fmt(s.emi_amount)}</TableCell>
                  <TableCell>{fmt(s.principal)}</TableCell>
                  <TableCell>{fmt(s.interest)}</TableCell>
                  <TableCell>{fmt(s.balance_after)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>
    </div>
  );
}
