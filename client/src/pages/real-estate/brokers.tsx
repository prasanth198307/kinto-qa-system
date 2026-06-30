import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Eye } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const emptyForm = { broker_name: "", firm_name: "", rera_number: "", phone: "", commission_rate: "" };

export default function BrokersPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);
  const [viewOpen, setViewOpen] = useState<any>(null);

  const { data, isLoading, isError } = useQuery({ queryKey: ["re-brokers"], queryFn: () => api("GET", "/api/real-estate/brokers") });
  const brokers = Array.isArray(data) ? data : [];

  const { data: brokerBookings } = useQuery({
    queryKey: ["re-broker-bookings", viewOpen?.id],
    queryFn: () => api("GET", `/api/real-estate/brokers/${viewOpen?.id}/bookings`),
    enabled: !!viewOpen?.id,
  });
  const bbList = Array.isArray(brokerBookings) ? brokerBookings : [];

  const save = useMutation({
    mutationFn: (payload: any) =>
      editing
        ? api("PUT", `/api/real-estate/brokers/${editing.id}`, payload)
        : api("POST", "/api/real-estate/brokers", payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["re-brokers"] }); setOpen(false); },
  });

  function openAdd() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(b: any) { setEditing(b); setForm({ broker_name: b.broker_name, firm_name: b.firm_name, rera_number: b.rera_number, phone: b.phone, commission_rate: b.commission_rate }); setOpen(true); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Brokers & Agents</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Broker</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="p-8 text-center text-muted-foreground">Loading...</div>}
          {isError && <div className="p-8 text-center text-destructive">Failed to load brokers.</div>}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Broker Name</TableHead>
                  <TableHead>Firm</TableHead>
                  <TableHead>RERA #</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Commission %</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Commission Earned</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {brokers.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No brokers found.</TableCell></TableRow>}
                {brokers.map((b: any) => {
                  const commissionEarned = (Number(b.total_booking_value || 0) * Number(b.commission_rate || 0)) / 100;
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.broker_name}</TableCell>
                      <TableCell>{b.firm_name}</TableCell>
                      <TableCell>{b.rera_number}</TableCell>
                      <TableCell>{b.phone}</TableCell>
                      <TableCell className="text-right">{b.commission_rate}%</TableCell>
                      <TableCell className="text-right">{b.total_bookings ?? 0}</TableCell>
                      <TableCell className="text-right font-medium">₹{(b.total_commission_earned ?? commissionEarned).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setViewOpen(b)}><Eye className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Broker" : "Add Broker"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Broker Name" value={form.broker_name} onChange={(e) => setForm({ ...form, broker_name: e.target.value })} />
            <Input placeholder="Firm Name" value={form.firm_name} onChange={(e) => setForm({ ...form, firm_name: e.target.value })} />
            <Input placeholder="RERA Number" value={form.rera_number} onChange={(e) => setForm({ ...form, rera_number: e.target.value })} />
            <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input type="number" placeholder="Commission Rate (%)" value={form.commission_rate} onChange={(e) => setForm({ ...form, commission_rate: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate({ ...form, commission_rate: Number(form.commission_rate) })} disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewOpen} onOpenChange={() => setViewOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Bookings — {viewOpen?.broker_name}</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead className="text-right">Booking Value</TableHead>
                <TableHead className="text-right">Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bbList.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No bookings for this broker.</TableCell></TableRow>}
              {bbList.map((bb: any) => (
                <TableRow key={bb.id}>
                  <TableCell>{bb.booking_number}</TableCell>
                  <TableCell>{bb.customer_name}</TableCell>
                  <TableCell>{bb.unit_number}</TableCell>
                  <TableCell className="text-right">₹{Number(bb.total_value || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right">₹{((Number(bb.total_value || 0) * Number(viewOpen?.commission_rate || 0)) / 100).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DialogFooter><Button variant="outline" onClick={() => setViewOpen(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
