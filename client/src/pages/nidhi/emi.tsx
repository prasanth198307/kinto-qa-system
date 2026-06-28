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

export default function NidhiEMIPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [collectForm, setCollectForm] = useState({ loan_id: "", amount: "", payment_mode: "", receipt_no: "" });

  const { data: collections = [] } = useQuery({ queryKey: ["/api/nidhi/emi-collections"], queryFn: () => api("GET", "/api/nidhi/emi-collections") });

  const collectMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/nidhi/emi-collections", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/nidhi/emi-collections"] }); toast({ title: "EMI collected" }); setCollectForm({ loan_id: "", amount: "", payment_mode: "", receipt_no: "" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const today = new Date().toISOString().split("T")[0];
  const todayCollections = collections.filter((c: any) => (c.collection_date || c.date || "").startsWith(today));
  const overdueList = collections.filter((c: any) => c.days_overdue > 0);
  const pending = collections.filter((c: any) => c.due_date === today && c.status === "pending");
  const totalToday = todayCollections.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">EMI Collection</h1>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">₹{fmt(totalToday)}</div><div className="text-sm text-muted-foreground">Collected Today</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{pending.length}</div><div className="text-sm text-muted-foreground">Due Today</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">{overdueList.length}</div><div className="text-sm text-muted-foreground">Overdue</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Collect EMI</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {["loan_id","amount","receipt_no"].map(k => (
              <div key={k}>
                <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                <Input value={(collectForm as any)[k]} onChange={e => setCollectForm(p => ({...p,[k]:e.target.value}))} />
              </div>
            ))}
            <div>
              <label className="text-sm">Payment Mode</label>
              <Select value={collectForm.payment_mode} onValueChange={v => setCollectForm(p => ({...p, payment_mode: v}))}>
                <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
                <SelectContent>{["cash","upi","cheque","neft"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button className="mt-3" onClick={() => collectMutation.mutate(collectForm)}>Collect EMI</Button>
        </CardContent>
      </Card>

      {pending.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Due Today</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Loan No</TableHead><TableHead>EMI Amount</TableHead><TableHead>Due Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {pending.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.member_name}</TableCell><TableCell>{p.loan_no}</TableCell>
                    <TableCell>₹{fmt(p.emi_amount || p.amount)}</TableCell><TableCell>{p.due_date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Collected Today</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Loan No</TableHead><TableHead>Amount</TableHead><TableHead>Receipt No</TableHead><TableHead>Time</TableHead></TableRow></TableHeader>
            <TableBody>
              {todayCollections.map((c: any) => (
                <TableRow key={c.id}><TableCell>{c.member_name}</TableCell><TableCell>{c.loan_no}</TableCell><TableCell>₹{fmt(c.amount)}</TableCell><TableCell>{c.receipt_no}</TableCell><TableCell>{c.time || c.created_at}</TableCell></TableRow>
              ))}
              {todayCollections.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No collections today</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {overdueList.length > 0 && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-red-700">Overdue</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Loan No</TableHead><TableHead>Amount</TableHead><TableHead>Days Overdue</TableHead><TableHead>Penalty</TableHead></TableRow></TableHeader>
              <TableBody>
                {overdueList.map((o: any) => (
                  <TableRow key={o.id}><TableCell>{o.member_name}</TableCell><TableCell>{o.loan_no}</TableCell><TableCell>₹{fmt(o.amount)}</TableCell><TableCell className="text-red-600">{o.days_overdue}</TableCell><TableCell>₹{fmt(o.penalty)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
