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

export default function RealEstateSocietyPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ member_id: "", month: "", year: new Date().getFullYear().toString(), amount: "", payment_mode: "online" });

  const { data: members = [] } = useQuery({ queryKey: ["/api/real-estate/society/members"], queryFn: () => api("GET", "/api/real-estate/society/members") });

  const recordMaintenance = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/society/maintenance", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/society/members"] }); setShowForm(false); toast({ title: "Maintenance recorded" }); }
  });

  const today = new Date();
  const defaulters = members.filter((m: any) => m.maintenance_due && Number(m.maintenance_due) > 0);
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Society Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Record Maintenance</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{members.length}</div><div className="text-sm text-muted-foreground">Total Members</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-red-600">{defaulters.length}</div><div className="text-sm text-muted-foreground">Defaulters</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{members.length - defaulters.length}</div><div className="text-sm text-muted-foreground">Paid Up</div></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Record Maintenance Payment</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Select value={form.member_id} onValueChange={v => setForm({ ...form, member_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Member" /></SelectTrigger>
                <SelectContent>{members.map((m: any) => <SelectItem key={m.id} value={String(m.id)}>{m.flat_no} - {m.owner_name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.month} onValueChange={v => setForm({ ...form, month: v })}>
                <SelectTrigger><SelectValue placeholder="Month" /></SelectTrigger>
                <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Year" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
              <Input placeholder="Amount" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              <Select value={form.payment_mode} onValueChange={v => setForm({ ...form, payment_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="mt-4" onClick={() => recordMaintenance.mutate(form)}>Record Payment</Button>
          </CardContent>
        </Card>
      )}

      {defaulters.length > 0 && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-red-600">Maintenance Defaulters</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Flat No</TableHead><TableHead>Owner</TableHead><TableHead>Phone</TableHead><TableHead>Due Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {defaulters.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.flat_no}</TableCell>
                    <TableCell>{m.owner_name}</TableCell>
                    <TableCell>{m.phone}</TableCell>
                    <TableCell className="text-red-600 font-bold">₹{fmt(m.maintenance_due)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Members</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flat No</TableHead>
                <TableHead>Owner Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Move-in Date</TableHead>
                <TableHead>Maintenance Due</TableHead>
                <TableHead>Last Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.flat_no}</TableCell>
                  <TableCell>{m.owner_name}</TableCell>
                  <TableCell>{m.phone}</TableCell>
                  <TableCell>{m.move_in_date ? new Date(m.move_in_date).toLocaleDateString("en-IN") : "-"}</TableCell>
                  <TableCell className={Number(m.maintenance_due) > 0 ? "text-red-600 font-bold" : ""}>{Number(m.maintenance_due) > 0 ? "₹" + fmt(m.maintenance_due) : "-"}</TableCell>
                  <TableCell>{m.last_paid ? new Date(m.last_paid).toLocaleDateString("en-IN") : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
