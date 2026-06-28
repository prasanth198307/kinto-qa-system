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

export default function EducationFeesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ student_id: "", fee_head: "", amount: "", payment_mode: "cash", receipt_no: "" });

  const { data: fees = [] } = useQuery({ queryKey: ["/api/education/fee-collections"], queryFn: () => api("GET", "/api/education/fee-collections") });
  const { data: structures = [] } = useQuery({ queryKey: ["/api/education/fee-structures"], queryFn: () => api("GET", "/api/education/fee-structures") });

  const collectMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/fee-collections", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/fee-collections"] }); setShowForm(false); toast({ title: "Fee collected" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const totalOutstanding = fees.reduce((s: number, f: any) => s + Number(f.balance || 0), 0);
  const totalCollected = fees.reduce((s: number, f: any) => s + Number(f.paid || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Fee Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Collect Fee</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">₹{fmt(totalCollected)}</div><div className="text-sm text-muted-foreground">Total Collected</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">₹{fmt(totalOutstanding)}</div><div className="text-sm text-muted-foreground">Outstanding</div></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Collect Fee</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Student ID</label>
                <Input value={form.student_id} onChange={e => setForm(p => ({...p, student_id: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Fee Head</label>
                <Input value={form.fee_head} onChange={e => setForm(p => ({...p, fee_head: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Amount</label>
                <Input type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Receipt No</label>
                <Input value={form.receipt_no} onChange={e => setForm(p => ({...p, receipt_no: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Payment Mode</label>
                <Select value={form.payment_mode} onValueChange={v => setForm(p => ({...p, payment_mode: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => collectMutation.mutate(form)} disabled={collectMutation.isPending}>Collect</Button>
              <Button variant="outline" onClick={() => window.print()}>Print Receipt</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Outstanding Fees</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Fee Head</TableHead>
                <TableHead>Amount</TableHead><TableHead>Due Date</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fees.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell>{f.student_name}</TableCell>
                  <TableCell>{f.class}</TableCell>
                  <TableCell>{f.fee_head}</TableCell>
                  <TableCell>₹{fmt(f.amount)}</TableCell>
                  <TableCell>{f.due_date}</TableCell>
                  <TableCell className="text-green-600">₹{fmt(f.paid)}</TableCell>
                  <TableCell className="text-red-600">₹{fmt(f.balance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
