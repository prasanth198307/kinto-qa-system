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

const statusColor = (s: string): any => ({ pending: "outline", partial: "secondary", paid: "default" }[s] || "outline");

export default function LogisticsFreightPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ trip_id: "", client_name: "", freight_rate: "", distance_km: "", detention_hours: "", extra_charges: "" });

  const { data: bills = [] } = useQuery({ queryKey: ["/api/logistics/freight-bills"], queryFn: () => api("GET", "/api/logistics/freight-bills") });
  const { data: trips = [] } = useQuery({ queryKey: ["/api/logistics/trips"], queryFn: () => api("GET", "/api/logistics/trips") });

  const createBill = useMutation({
    mutationFn: (d: any) => api("POST", "/api/logistics/freight-bills", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/freight-bills"] }); setShowForm(false); toast({ title: "Freight bill created" }); }
  });

  const totalPending = bills.filter((b: any) => b.status === "pending").reduce((s: number, b: any) => s + Number(b.total || 0), 0);
  const totalPaid = bills.filter((b: any) => b.status === "paid").reduce((s: number, b: any) => s + Number(b.total || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Freight Billing</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Create Bill</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{bills.length}</div><div className="text-sm text-muted-foreground">Total Bills</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">₹{fmt(totalPending)}</div><div className="text-sm text-muted-foreground">Pending</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">₹{fmt(totalPaid)}</div><div className="text-sm text-muted-foreground">Collected</div></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Create Freight Bill</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Select value={form.trip_id} onValueChange={v => setForm({ ...form, trip_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Trip" /></SelectTrigger>
                <SelectContent>{trips.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.trip_no} - {t.origin} to {t.destination}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Client Name" value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} />
              <Input placeholder="Freight Rate (₹/km)" type="number" value={form.freight_rate} onChange={e => setForm({ ...form, freight_rate: e.target.value })} />
              <Input placeholder="Distance (km)" type="number" value={form.distance_km} onChange={e => setForm({ ...form, distance_km: e.target.value })} />
              <Input placeholder="Detention Hours" type="number" value={form.detention_hours} onChange={e => setForm({ ...form, detention_hours: e.target.value })} />
              <Input placeholder="Extra Charges" type="number" value={form.extra_charges} onChange={e => setForm({ ...form, extra_charges: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={() => createBill.mutate(form)}>Create Bill</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Freight Bills</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill No</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Trip No</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Distance (km)</TableHead>
                <TableHead>Freight</TableHead>
                <TableHead>Detention</TableHead>
                <TableHead>Extra</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.bill_no}</TableCell>
                  <TableCell>{b.client_name}</TableCell>
                  <TableCell>{b.trip_no}</TableCell>
                  <TableCell>{b.origin || b.from}</TableCell>
                  <TableCell>{b.destination || b.to}</TableCell>
                  <TableCell>{b.distance_km}</TableCell>
                  <TableCell>₹{fmt(b.freight_charges)}</TableCell>
                  <TableCell>₹{fmt(b.detention)}</TableCell>
                  <TableCell>₹{fmt(b.extra_charges)}</TableCell>
                  <TableCell className="font-bold">₹{fmt(b.total)}</TableCell>
                  <TableCell><Badge variant={statusColor(b.status)}>{b.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
