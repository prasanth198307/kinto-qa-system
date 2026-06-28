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

export default function NidhiDepositsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ member_id: "", deposit_type: "", amount: "", tenure_months: "", interest_rate: "" });

  const { data: deposits = [] } = useQuery({ queryKey: ["/api/nidhi/deposits"], queryFn: () => api("GET", "/api/nidhi/deposits") });

  const addMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/nidhi/deposits", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/nidhi/deposits"] }); setShowForm(false); toast({ title: "Deposit added" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const today = new Date(); const in30 = new Date(today.getTime() + 30*24*60*60*1000);
  const maturing = deposits.filter((d: any) => { const m = new Date(d.maturity_date); return m >= today && m <= in30; });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Deposits</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Deposit</Button>
      </div>

      {maturing.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardHeader><CardTitle className="text-yellow-800">Maturing in 30 Days ({maturing.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1">
              {maturing.map((d: any) => (
                <div key={d.id} className="text-sm">
                  <span className="font-medium">{d.member_name}</span> — {d.deposit_no} — ₹{fmt(d.maturity_amount)} due {d.maturity_date}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Deposit</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Deposit Type</label>
                <Select value={form.deposit_type} onValueChange={v => setForm(p => ({...p, deposit_type: v}))}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{["FD","RD","Savings"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {["member_id","amount","tenure_months","interest_rate"].map(k => (
                <div key={k}>
                  <label className="text-sm capitalize">{k.replace(/_/g," ")}</label>
                  <Input value={(form as any)[k]} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addMutation.mutate(form)}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>All Deposits</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deposit No</TableHead><TableHead>Member</TableHead><TableHead>Type</TableHead>
                <TableHead>Amount</TableHead><TableHead>Rate %</TableHead><TableHead>Start</TableHead>
                <TableHead>Maturity</TableHead><TableHead>Maturity Amount</TableHead><TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deposits.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell>{d.deposit_no}</TableCell>
                  <TableCell>{d.member_name}</TableCell>
                  <TableCell><Badge variant="outline">{d.deposit_type}</Badge></TableCell>
                  <TableCell>₹{fmt(d.amount)}</TableCell>
                  <TableCell>{d.interest_rate}%</TableCell>
                  <TableCell>{d.start_date}</TableCell>
                  <TableCell>{d.maturity_date}</TableCell>
                  <TableCell>₹{fmt(d.maturity_amount)}</TableCell>
                  <TableCell><Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status}</Badge></TableCell>
                </TableRow>
              ))}
              {deposits.length === 0 && <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground">No deposits found</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
