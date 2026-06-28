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

export default function RealEstateCollectionsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [showOverdue, setShowOverdue] = useState(false);
  const [form, setForm] = useState({ booking_id: "", milestone_name: "", amount: "", payment_date: "", payment_mode: "cheque", reference_no: "" });

  const { data: collections = [] } = useQuery({ queryKey: ["/api/real-estate/collections"], queryFn: () => api("GET", "/api/real-estate/collections") });
  const { data: bookings = [] } = useQuery({ queryKey: ["/api/real-estate/bookings"], queryFn: () => api("GET", "/api/real-estate/bookings") });

  const addPayment = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/collections", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/collections"] }); setShowForm(false); toast({ title: "Payment recorded" }); }
  });

  const today = new Date();
  const overdue = collections.filter((c: any) => new Date(c.due_date) < today && Number(c.amount_paid || 0) < Number(c.amount_due || 0));

  const statusColor = (c: any): any => {
    if (Number(c.amount_paid) >= Number(c.amount_due)) return "default";
    if (new Date(c.due_date) < today) return "destructive";
    return "secondary";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Payment Collections</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowOverdue(!showOverdue)}>Overdue ({overdue.length})</Button>
          <Button onClick={() => setShowForm(!showForm)}>+ Record Payment</Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Record Payment</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Select value={form.booking_id} onValueChange={v => setForm({ ...form, booking_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Booking" /></SelectTrigger>
                <SelectContent>{bookings.map((b: any) => <SelectItem key={b.id} value={String(b.id)}>{b.booking_no} - {b.customer_name}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Milestone Name" value={form.milestone_name} onChange={e => setForm({ ...form, milestone_name: e.target.value })} />
              <Input placeholder="Amount" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
              <Input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} />
              <Select value={form.payment_mode} onValueChange={v => setForm({ ...form, payment_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="neft">NEFT</SelectItem>
                  <SelectItem value="rtgs">RTGS</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Reference No" value={form.reference_no} onChange={e => setForm({ ...form, reference_no: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={() => addPayment.mutate(form)}>Record Payment</Button>
          </CardContent>
        </Card>
      )}

      {showOverdue && overdue.length > 0 && (
        <Card className="border-red-200">
          <CardHeader><CardTitle className="text-red-600">Overdue Payments ({overdue.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Customer</TableHead><TableHead>Project</TableHead><TableHead>Due Date</TableHead><TableHead>Due Amt</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead></TableRow></TableHeader>
              <TableBody>
                {overdue.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.customer_name}</TableCell>
                    <TableCell>{c.project_name}</TableCell>
                    <TableCell className="text-red-600">{new Date(c.due_date).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>₹{fmt(c.amount_due)}</TableCell>
                    <TableCell>₹{fmt(c.amount_paid)}</TableCell>
                    <TableCell className="text-red-600 font-bold">₹{fmt(Number(c.amount_due) - Number(c.amount_paid))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Collections</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount Due</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.receipt_no}</TableCell>
                  <TableCell>{c.customer_name}</TableCell>
                  <TableCell>{c.project_name}</TableCell>
                  <TableCell>{c.unit_no}</TableCell>
                  <TableCell>{c.due_date ? new Date(c.due_date).toLocaleDateString("en-IN") : "-"}</TableCell>
                  <TableCell>₹{fmt(c.amount_due)}</TableCell>
                  <TableCell>₹{fmt(c.amount_paid)}</TableCell>
                  <TableCell>₹{fmt(Number(c.amount_due) - Number(c.amount_paid))}</TableCell>
                  <TableCell><Badge variant={statusColor(c)}>{Number(c.amount_paid) >= Number(c.amount_due) ? "paid" : new Date(c.due_date) < today ? "overdue" : "pending"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
