import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());
const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function NidhiDailyCollectionPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [form, setForm] = useState({ member_id: "", product_type: "", amount: "", payment_mode: "" });

  const { data: collections = [] } = useQuery({
    queryKey: ["/api/nidhi/daily-collections", date],
    queryFn: () => api("GET", `/api/nidhi/daily-collections?date=${date}`),
  });

  const addMutation = useMutation({
    mutationFn: (data: any) => api("POST", "/api/nidhi/daily-collections", { ...data, date }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/nidhi/daily-collections", date] }); toast({ title: "Collection added" }); setForm({ member_id: "", product_type: "", amount: "", payment_mode: "" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const total = collections.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const emiTotal = collections.filter((c: any) => c.product === "EMI" || c.product_type === "EMI").reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const depTotal = collections.filter((c: any) => ["RD","FD"].includes(c.product || c.product_type)).reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const savTotal = collections.filter((c: any) => c.product === "Savings" || c.product_type === "Savings").reduce((s: number, c: any) => s + Number(c.amount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Daily Collection</h1>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Date</label>
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">₹{fmt(total)}</div><div className="text-sm text-muted-foreground">Total Collected</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">₹{fmt(emiTotal)}</div><div className="text-sm text-muted-foreground">EMI</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">₹{fmt(depTotal)}</div><div className="text-sm text-muted-foreground">Deposits</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">₹{fmt(savTotal)}</div><div className="text-sm text-muted-foreground">Savings</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Add Collection</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm">Product Type</label>
              <Select value={form.product_type} onValueChange={v => setForm(p => ({...p, product_type: v}))}>
                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                <SelectContent>{["EMI","RD","Savings","FD","Loan Repayment"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Payment Mode</label>
              <Select value={form.payment_mode} onValueChange={v => setForm(p => ({...p, payment_mode: v}))}>
                <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
                <SelectContent>{["cash","upi","cheque"].map(m => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm">Member ID</label>
              <Input value={form.member_id} onChange={e => setForm(p => ({...p, member_id: e.target.value}))} />
            </div>
            <div>
              <label className="text-sm">Amount</label>
              <Input value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} />
            </div>
          </div>
          <Button className="mt-3" onClick={() => addMutation.mutate(form)}>Add Collection</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Collections for {date}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead><TableHead>Product</TableHead><TableHead>Amount</TableHead>
                <TableHead>Payment Mode</TableHead><TableHead>Time</TableHead><TableHead>Collected By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell>{c.member_name || c.member_id}</TableCell>
                  <TableCell>{c.product || c.product_type}</TableCell>
                  <TableCell>₹{fmt(c.amount)}</TableCell>
                  <TableCell>{c.payment_mode}</TableCell>
                  <TableCell>{c.time || c.created_at}</TableCell>
                  <TableCell>{c.collected_by}</TableCell>
                </TableRow>
              ))}
              {collections.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No collections for this date</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
