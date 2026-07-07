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
import { Plus, Trash2 } from "lucide-react";

const api = (m: string, p: string, b?: any) =>
  fetch(p, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());

const BLANK = { rate_type: "deposit", deposit_type: "fd", loan_type: "", min_tenure_months: "1", max_tenure_months: "", interest_rate: "", senior_citizen_rate: "", effective_from: new Date().toISOString().slice(0, 10) };

export default function NidhiInterestRatesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(BLANK);

  const { data: rates = [] } = useQuery<any[]>({
    queryKey: ["nidhi-interest-rates"],
    queryFn: () => api("GET", "/api/nidhi/interest-rates"),
  });

  const createMut = useMutation({
    mutationFn: (p: any) => api("POST", "/api/nidhi/interest-rates", p),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-interest-rates"] }); setOpen(false); setForm(BLANK); toast({ title: "Rate added" }); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: any) => api("DELETE", `/api/nidhi/interest-rates/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-interest-rates"] }); toast({ title: "Rate deactivated" }); },
  });

  const f = (k: string, v: string) => setForm((p: any) => ({ ...p, [k]: v }));
  const depositRates = rates.filter((r: any) => r.rate_type === "deposit");
  const loanRates = rates.filter((r: any) => r.rate_type === "loan");

  const RateTable = ({ rows, title }: { rows: any[]; title: string }) => (
    <Card><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Type</TableHead><TableHead>Tenure</TableHead><TableHead>Rate %</TableHead>
            <TableHead>Senior %</TableHead><TableHead>From</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="uppercase text-sm">{r.deposit_type || r.loan_type || "—"}</TableCell>
                <TableCell className="text-sm">{r.min_tenure_months}–{r.max_tenure_months || "∞"} mo</TableCell>
                <TableCell className="font-semibold">{r.interest_rate}%</TableCell>
                <TableCell>{r.senior_citizen_rate ? `${r.senior_citizen_rate}%` : "—"}</TableCell>
                <TableCell className="text-sm">{r.effective_from}</TableCell>
                <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMut.mutate(r.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No rates configured</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Interest Rates</h1>
        <Button size="sm" onClick={() => { setForm(BLANK); setOpen(true); }}><Plus className="w-4 h-4 mr-1" />Add Rate Slab</Button>
      </div>

      <RateTable rows={depositRates} title="Deposit Rates" />
      <RateTable rows={loanRates} title="Loan Rates" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Interest Rate Slab</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs">Rate Type</Label>
              <Select value={form.rate_type} onValueChange={v => f("rate_type", v)}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="deposit">Deposit</SelectItem><SelectItem value="loan">Loan</SelectItem></SelectContent>
              </Select></div>
            {form.rate_type === "deposit" ? (
              <div><Label className="text-xs">Deposit Type</Label>
                <Select value={form.deposit_type} onValueChange={v => f("deposit_type", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["savings","fd","rd","mis","pigmy"].map(t => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select></div>
            ) : (
              <div><Label className="text-xs">Loan Type</Label>
                <Select value={form.loan_type} onValueChange={v => f("loan_type", v)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{["personal","gold_loan","fd_loan","property","vehicle","business"].map(t => <SelectItem key={t} value={t}>{t.replace("_"," ").toUpperCase()}</SelectItem>)}</SelectContent>
                </Select></div>
            )}
            <div><Label className="text-xs">Min Tenure (months)</Label><Input type="number" value={form.min_tenure_months} onChange={e => f("min_tenure_months", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Max Tenure (months)</Label><Input type="number" value={form.max_tenure_months} onChange={e => f("max_tenure_months", e.target.value)} className="h-8 text-sm" placeholder="Leave blank for open" /></div>
            <div><Label className="text-xs">Interest Rate %</Label><Input type="number" step="0.1" value={form.interest_rate} onChange={e => f("interest_rate", e.target.value)} className="h-8 text-sm" /></div>
            <div><Label className="text-xs">Senior Citizen Rate %</Label><Input type="number" step="0.1" value={form.senior_citizen_rate} onChange={e => f("senior_citizen_rate", e.target.value)} className="h-8 text-sm" /></div>
            <div className="col-span-2"><Label className="text-xs">Effective From</Label><Input type="date" value={form.effective_from} onChange={e => f("effective_from", e.target.value)} className="h-8 text-sm" /></div>
          </div>
          <div className="flex gap-2 justify-end mt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending}>Add Rate</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
