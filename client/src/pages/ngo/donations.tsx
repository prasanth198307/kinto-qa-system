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

export default function NGODonationsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ donor_id: "", amount: "", donation_date: "", payment_mode: "cash", purpose: "", project_id: "" });

  const { data: donations = [] } = useQuery({ queryKey: ["/api/ngo/donations"], queryFn: () => api("GET", "/api/ngo/donations") });

  const addMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/ngo/donations", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ngo/donations"] }); setShowForm(false); toast({ title: "Donation recorded" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  const total = donations.reduce((s: number, d: any) => s + Number(d.amount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Donations</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Record Donation</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">₹{fmt(total)}</div><div className="text-sm text-muted-foreground">Total Donations</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{donations.length}</div><div className="text-sm text-muted-foreground">Total Transactions</div></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Record Donation</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Donor ID</label>
                <Input value={form.donor_id} onChange={e => setForm(p => ({...p, donor_id: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Amount</label>
                <Input type="number" value={form.amount} onChange={e => setForm(p => ({...p, amount: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={form.donation_date} onChange={e => setForm(p => ({...p, donation_date: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Payment Mode</label>
                <Select value={form.payment_mode} onValueChange={v => setForm(p => ({...p, payment_mode: v}))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="neft">NEFT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Purpose</label>
                <Input value={form.purpose} onChange={e => setForm(p => ({...p, purpose: e.target.value}))} />
              </div>
              <div>
                <label className="text-sm font-medium">Project ID</label>
                <Input value={form.project_id} onChange={e => setForm(p => ({...p, project_id: e.target.value}))} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => addMutation.mutate(form)} disabled={addMutation.isPending}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Donation Records</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt No</TableHead><TableHead>Donor</TableHead><TableHead>Date</TableHead>
                <TableHead>Amount</TableHead><TableHead>Mode</TableHead><TableHead>Purpose</TableHead><TableHead>80G</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell>{d.receipt_no}</TableCell>
                  <TableCell>{d.donor_name}</TableCell>
                  <TableCell>{d.date}</TableCell>
                  <TableCell>₹{fmt(d.amount)}</TableCell>
                  <TableCell><Badge variant="secondary">{d.payment_mode}</Badge></TableCell>
                  <TableCell>{d.purpose}</TableCell>
                  <TableCell><Badge variant={d["80g_issued"] ? "default" : "secondary"}>{d["80g_issued"] ? "Issued" : "Pending"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
