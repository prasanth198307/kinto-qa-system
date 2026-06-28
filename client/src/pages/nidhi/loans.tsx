import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function NidhiLoansPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ member_id: "", loan_type: "", amount: "", interest_rate: "", tenure_months: "", collateral_type: "", collateral_value: "", purpose: "" });

  const { data: loans = [] } = useQuery({ queryKey: ["/api/nidhi/loans"], queryFn: () => api("GET", "/api/nidhi/loans") });

  const addMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/nidhi/loans", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/nidhi/loans"] }); setShowForm(false); toast({ title: "Loan application submitted" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const sanctionMutation = useMutation({
    mutationFn: (id: any) => api("POST", `/api/nidhi/loans/${id}/sanction`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/nidhi/loans"] }); toast({ title: "Loan sanctioned" }); },
  });

  const disburseMutation = useMutation({
    mutationFn: (id: any) => api("POST", `/api/nidhi/loans/${id}/disburse`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/nidhi/loans"] }); toast({ title: "Loan disbursed" }); },
  });

  const statusColor: Record<string,string> = { pending: "secondary", sanctioned: "outline", disbursed: "default", closed: "secondary", npa: "destructive" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Loans</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ New Loan</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Loan Application</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Loan Type</label>
                <Select value={form.loan_type} onValueChange={v => setForm(p => ({...p, loan_type: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{["Gold","FD","Personal","Housing"].map(t => <SelectItem key={t} value={t}>{t} Loan</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {["member_id","amount","interest_rate","tenure_months","collateral_type","collateral_value","purpose"].map(k => (
                <div key={k}>
                  <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                  <Input value={(form as any)[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addMutation.mutate(form)}>Submit</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>All Loans</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan No</TableHead><TableHead>Member</TableHead><TableHead>Type</TableHead>
                <TableHead>Amount</TableHead><TableHead>Rate %</TableHead><TableHead>Tenure</TableHead>
                <TableHead>EMI</TableHead><TableHead>Outstanding</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loans.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell>{l.loan_no}</TableCell>
                  <TableCell>{l.member_name}</TableCell>
                  <TableCell><Badge variant="outline">{l.loan_type}</Badge></TableCell>
                  <TableCell>₹{fmt(l.amount)}</TableCell>
                  <TableCell>{l.interest_rate}%</TableCell>
                  <TableCell>{l.tenure} mo</TableCell>
                  <TableCell>₹{fmt(l.emi)}</TableCell>
                  <TableCell>₹{fmt(l.outstanding)}</TableCell>
                  <TableCell><Badge variant={(statusColor[l.status] as any) || "secondary"}>{l.status}</Badge></TableCell>
                  <TableCell>
                    {l.status === "pending" && <Button size="sm" onClick={() => sanctionMutation.mutate(l.id)}>Sanction</Button>}
                    {l.status === "sanctioned" && <Button size="sm" onClick={() => disburseMutation.mutate(l.id)}>Disburse</Button>}
                  </TableCell>
                </TableRow>
              ))}
              {loans.length === 0 && <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No loans found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
