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

const statusColor = (s: string): any => ({ booked: "default", "agreement-signed": "secondary", registered: "outline", cancelled: "destructive" }[s] || "outline");

export default function RealEstateBookingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ customer_name: "", phone: "", project_id: "", unit_id: "", total_value: "", booking_amount: "", payment_plan: "" });

  const { data: bookings = [] } = useQuery({ queryKey: ["/api/real-estate/bookings"], queryFn: () => api("GET", "/api/real-estate/bookings") });
  const { data: projects = [] } = useQuery({ queryKey: ["/api/real-estate/projects"], queryFn: () => api("GET", "/api/real-estate/projects") });
  const { data: units = [] } = useQuery({ queryKey: ["/api/real-estate/units", form.project_id], queryFn: () => api("GET", "/api/real-estate/units?project_id=" + form.project_id), enabled: !!form.project_id });

  const addBooking = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/bookings", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/bookings"] }); setShowForm(false); toast({ title: "Booking created" }); }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Bookings</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ New Booking</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>New Booking</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input placeholder="Customer Name" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} />
              <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <Select value={form.project_id} onValueChange={v => setForm({ ...form, project_id: v, unit_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Select Project" /></SelectTrigger>
                <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.project_name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={form.unit_id} onValueChange={v => setForm({ ...form, unit_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Unit" /></SelectTrigger>
                <SelectContent>{units.filter((u: any) => u.status === "available").map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.unit_no} - {u.type}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Total Value" type="number" value={form.total_value} onChange={e => setForm({ ...form, total_value: e.target.value })} />
              <Input placeholder="Booking Amount" type="number" value={form.booking_amount} onChange={e => setForm({ ...form, booking_amount: e.target.value })} />
              <Input placeholder="Payment Plan (e.g. 30:40:30)" value={form.payment_plan} onChange={e => setForm({ ...form, payment_plan: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={() => addBooking.mutate(form)}>Save Booking</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Bookings</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking No</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Unit No</TableHead>
                <TableHead>Area (sqft)</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Booking Amt</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.booking_no}</TableCell>
                  <TableCell>{b.customer_name}</TableCell>
                  <TableCell>{b.project_name}</TableCell>
                  <TableCell>{b.unit_no}</TableCell>
                  <TableCell>{b.area_sqft}</TableCell>
                  <TableCell>₹{fmt(b.total_value)}</TableCell>
                  <TableCell>₹{fmt(b.booking_amount)}</TableCell>
                  <TableCell>{b.created_at ? new Date(b.created_at).toLocaleDateString("en-IN") : "-"}</TableCell>
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
