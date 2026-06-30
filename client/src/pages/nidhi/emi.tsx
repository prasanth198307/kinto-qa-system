import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { IndianRupee, Calendar } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

export default function EMICollectionPage() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [agentName, setAgentName] = useState("");
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ penalty: "", payment_mode: "cash", reference_number: "", collected_by: "" });
  const qc = useQueryClient();

  const { data: loans = [] } = useQuery({
    queryKey: ["nidhi-active-loans"],
    queryFn: () => api("GET", "/api/nidhi-company/loans?status=active"),
  });

  const { data: summary } = useQuery({
    queryKey: ["nidhi-emi-summary", date],
    queryFn: () => api("GET", `/api/nidhi-company/emi-collections/summary?date=${date}`),
  });

  const collectMutation = useMutation({
    mutationFn: (payload: any) => api("POST", "/api/nidhi-company/emi-collections", payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["nidhi-emi-summary"] }); setOpen(false); },
  });

  const filtered = agentName ? loans.filter((l: any) => l.agent_name?.toLowerCase().includes(agentName.toLowerCase())) : loans;

  function openDialog(loan: any) {
    setSelected(loan);
    setForm({ penalty: "0", payment_mode: "cash", reference_number: "", collected_by: agentName });
    setOpen(true);
  }

  function submit() {
    collectMutation.mutate({
      loan_id: selected.loan_id,
      loan_number: selected.loan_number,
      collection_date: date,
      principal: selected.principal_component,
      interest: selected.interest_component,
      penalty: Number(form.penalty),
      payment_mode: form.payment_mode,
      reference_number: form.reference_number,
      collected_by: form.collected_by,
    });
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">EMI Collection</h1>
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          </div>
          <Input placeholder="Filter by agent name" value={agentName} onChange={(e) => setAgentName(e.target.value)} className="w-48" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Collected</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-1 text-2xl font-bold">
            <IndianRupee className="w-5 h-5" />{(summary?.total_collected ?? 0).toLocaleString("en-IN")}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">EMIs Collected</CardTitle></CardHeader>
          <CardContent className="text-2xl font-bold">{summary?.count ?? 0}</CardContent>
        </Card>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Loan No.</TableHead>
            <TableHead>Member</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>EMI Amount</TableHead>
            <TableHead>Overdue Days</TableHead>
            <TableHead>Next EMI Date</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((loan: any) => (
            <TableRow key={loan.loan_id}>
              <TableCell className="font-mono">{loan.loan_number}</TableCell>
              <TableCell>{loan.member_name}</TableCell>
              <TableCell>{loan.phone}</TableCell>
              <TableCell>₹{Number(loan.emi_amount).toLocaleString("en-IN")}</TableCell>
              <TableCell>
                {loan.overdue_days > 0 ? <Badge variant="destructive">{loan.overdue_days}d</Badge> : <Badge variant="outline">0</Badge>}
              </TableCell>
              <TableCell>{loan.next_emi_date}</TableCell>
              <TableCell>
                <Button size="sm" onClick={() => openDialog(loan)}>Collect EMI</Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Collect EMI — {selected?.loan_number}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Principal</Label><Input value={selected?.principal_component ?? ""} disabled /></div>
              <div><Label>Interest</Label><Input value={selected?.interest_component ?? ""} disabled /></div>
            </div>
            <div><Label>Penalty</Label><Input value={form.penalty} onChange={(e) => setForm({ ...form, penalty: e.target.value })} /></div>
            <div>
              <Label>Payment Mode</Label>
              <Select value={form.payment_mode} onValueChange={(v) => setForm({ ...form, payment_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["cash", "upi", "neft", "cheque"].map((m) => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference Number</Label><Input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })} /></div>
            <div><Label>Collected By</Label><Input value={form.collected_by} onChange={(e) => setForm({ ...form, collected_by: e.target.value })} /></div>
            <Button className="w-full" onClick={submit} disabled={collectMutation.isPending}>
              {collectMutation.isPending ? "Saving..." : "Confirm Collection"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
