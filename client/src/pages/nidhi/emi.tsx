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
import { IndianRupee, CheckCircle, AlertTriangle } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());

const fmt = (n: any) => `${sym}${Number(n || 0).toLocaleString("en-IN")}`;

export default function NidhiEMIPage() {
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const [collectOpen, setCollectOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [cForm, setCForm] = useState({ principal_component: "", interest_component: "", penalty_amount: "0", payment_mode: "cash", reference_number: "", collected_by: "" });

  const { data: dueLoans = [] } = useQuery<any[]>({
    queryKey: ["nidhi-pending-emis"],
    queryFn: () => api("GET", "/api/nidhi/reports/pending-emis"),
  });

  const collectMut = useMutation({
    mutationFn: ({ id, ...payload }: any) => api("POST", `/api/nidhi/loans/${id}/collect-emi`, payload),
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ["nidhi-pending-emis"] });
      setCollectOpen(false);
      toast({ title: `EMI collected · Outstanding: ${fmt(d.outstanding_after)}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const reminderMut = useMutation({
    mutationFn: () => api("POST", "/api/nidhi/emi-reminders/send", {}),
    onSuccess: (d: any) => toast({ title: `Sent ${d.reminders_sent} WhatsApp reminders` }),
  });

  const openCollect = (loan: any) => {
    const rate = Number(loan.interest_rate) / 12 / 100;
    const interest = Math.round(Number(loan.outstanding_principal) * rate * 100) / 100;
    const principal = Math.round((Number(loan.emi_amount) - interest) * 100) / 100;
    setSelected(loan);
    setCForm({ principal_component: String(Math.max(0, principal)), interest_component: String(interest), penalty_amount: "0", payment_mode: "cash", reference_number: "", collected_by: "" });
    setCollectOpen(true);
  };

  const overdueCount = dueLoans.filter((l: any) => Number(l.days_overdue) > 0).length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">EMI Collection</h1>
          <p className="text-sm text-muted-foreground">{dueLoans.length} due · {overdueCount} overdue</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => reminderMut.mutate()} disabled={reminderMut.isPending}>
          Send WhatsApp Reminders
        </Button>
      </div>

      {overdueCount > 0 && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4" />{overdueCount} overdue EMIs — collect immediately to prevent NPA
        </div>
      )}

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Loan No.</TableHead><TableHead>Member</TableHead><TableHead>Phone</TableHead>
            <TableHead>EMI Amount</TableHead><TableHead>Outstanding</TableHead>
            <TableHead>Due Date</TableHead><TableHead>Overdue</TableHead><TableHead>Action</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {dueLoans.map((l: any) => (
              <TableRow key={l.id} className={Number(l.days_overdue) > 0 ? "bg-red-50" : ""}>
                <TableCell className="font-mono text-sm">{l.loan_number}</TableCell>
                <TableCell className="font-medium">{l.member_name}</TableCell>
                <TableCell>{l.member_phone}</TableCell>
                <TableCell className="font-semibold">{fmt(l.emi_amount)}</TableCell>
                <TableCell>{fmt(l.outstanding_principal)}</TableCell>
                <TableCell>{l.next_emi_date}</TableCell>
                <TableCell>
                  {Number(l.days_overdue) > 0 ? <Badge variant="destructive">{l.days_overdue} days</Badge> : <Badge variant="outline">Due today</Badge>}
                </TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => openCollect(l)}>
                    <IndianRupee className="w-3 h-3 mr-1" />Collect
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!dueLoans.length && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />All EMIs up to date!
            </TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={collectOpen} onOpenChange={setCollectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Collect EMI — {selected?.loan_number}</DialogTitle></DialogHeader>
          <div className="space-y-1 text-sm mb-3 bg-muted rounded p-3">
            <div>Member: <strong>{selected?.member_name}</strong></div>
            <div>Outstanding: <strong>{fmt(selected?.outstanding_principal)}</strong></div>
            <div>EMI Amount: <strong>{fmt(selected?.emi_amount)}</strong></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Principal Component (₹)</Label><Input type="number" value={cForm.principal_component} onChange={e => setCForm(p => ({ ...p, principal_component: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Interest Component (₹)</Label><Input type="number" value={cForm.interest_component} onChange={e => setCForm(p => ({ ...p, interest_component: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Penalty (₹)</Label><Input type="number" value={cForm.penalty_amount} onChange={e => setCForm(p => ({ ...p, penalty_amount: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Payment Mode</Label>
              <Select value={cForm.payment_mode} onValueChange={v => setCForm(p => ({ ...p, payment_mode: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{["cash","cheque","neft","upi"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label className="text-xs">Ref / Cheque No.</Label><Input value={cForm.reference_number} onChange={e => setCForm(p => ({ ...p, reference_number: e.target.value }))} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Collected By</Label><Input value={cForm.collected_by} onChange={e => setCForm(p => ({ ...p, collected_by: e.target.value }))} className="h-8 text-sm" /></div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setCollectOpen(false)}>Cancel</Button>
            <Button onClick={() => collectMut.mutate({ id: selected.id, ...cForm })} disabled={collectMut.isPending}>Collect EMI + GL Post</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
