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

export default function RealEstateBrokersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedBroker, setSelectedBroker] = useState<number | null>(null);
  const [form, setForm] = useState({ broker_name: "", firm_name: "", phone: "", email: "", rera_number: "", commission_pct: "" });

  const { data: brokers = [] } = useQuery({ queryKey: ["/api/real-estate/brokers"], queryFn: () => api("GET", "/api/real-estate/brokers") });
  const { data: ledger = [] } = useQuery({ queryKey: ["/api/real-estate/brokers", selectedBroker, "ledger"], queryFn: () => api("GET", "/api/real-estate/brokers/" + selectedBroker + "/ledger"), enabled: !!selectedBroker });

  const addBroker = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/brokers", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/brokers"] }); setShowForm(false); toast({ title: "Broker added" }); }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Broker Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Broker</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Broker</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input placeholder="Broker Name" value={form.broker_name} onChange={e => setForm({ ...form, broker_name: e.target.value })} />
              <Input placeholder="Firm Name" value={form.firm_name} onChange={e => setForm({ ...form, firm_name: e.target.value })} />
              <Input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              <Input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <Input placeholder="RERA Number" value={form.rera_number} onChange={e => setForm({ ...form, rera_number: e.target.value })} />
              <Input placeholder="Commission %" type="number" value={form.commission_pct} onChange={e => setForm({ ...form, commission_pct: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={() => addBroker.mutate(form)}>Save Broker</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Brokers</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Broker Name</TableHead>
                <TableHead>Firm</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>RERA No</TableHead>
                <TableHead>Leads Sent</TableHead>
                <TableHead>Bookings</TableHead>
                <TableHead>Commission Earned</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ledger</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brokers.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.broker_name}</TableCell>
                  <TableCell>{b.firm_name}</TableCell>
                  <TableCell>{b.phone}</TableCell>
                  <TableCell>{b.rera_no || b.rera_number}</TableCell>
                  <TableCell>{b.leads_sent || 0}</TableCell>
                  <TableCell>{b.bookings || 0}</TableCell>
                  <TableCell>₹{fmt(b.commission_earned)}</TableCell>
                  <TableCell><Badge variant={b.status === "active" ? "default" : "secondary"}>{b.status}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => setSelectedBroker(b.id === selectedBroker ? null : b.id)}>View</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedBroker && (
        <Card>
          <CardHeader><CardTitle>Commission Ledger</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking Ref</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Sale Value</TableHead>
                  <TableHead>Commission %</TableHead>
                  <TableHead>Commission Amt</TableHead>
                  <TableHead>Paid Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledger.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.booking_ref}</TableCell>
                    <TableCell>{l.unit_no}</TableCell>
                    <TableCell>₹{fmt(l.sale_value)}</TableCell>
                    <TableCell>{l.commission_pct}%</TableCell>
                    <TableCell>₹{fmt(l.commission_amount)}</TableCell>
                    <TableCell><Badge variant={l.paid_status === "paid" ? "default" : "secondary"}>{l.paid_status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
