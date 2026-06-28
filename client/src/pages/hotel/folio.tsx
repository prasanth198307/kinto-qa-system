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

export default function HotelFolioPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ folio_id: "", charge_type: "", amount: "", description: "" });

  const { data: folios = [] } = useQuery({ queryKey: ["hotel-folios"], queryFn: () => api("GET", "/api/hotel/folios") });

  const addCharge = useMutation({
    mutationFn: () => api("POST", "/api/hotel/folios/charges", { ...form, amount: Number(form.amount) }),
    onSuccess: () => { toast({ title: "Charge added" }); qc.invalidateQueries({ queryKey: ["hotel-folios"] }); setForm({ folio_id: "", charge_type: "", amount: "", description: "" }); }
  });

  const settle = useMutation({
    mutationFn: ({ id, mode }: { id: number; mode: string }) => api("POST", `/api/hotel/folios/${id}/settle`, { payment_mode: mode }),
    onSuccess: () => { toast({ title: "Settlement done" }); qc.invalidateQueries({ queryKey: ["hotel-folios"] }); }
  });

  const folioList: any[] = Array.isArray(folios) ? folios : (folios as any)?.folios || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Folio and Billing</h1>
      <Card>
        <CardHeader><CardTitle>Add Charge</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Folio ID" value={form.folio_id} onChange={e => setForm(p => ({ ...p, folio_id: e.target.value }))} className="w-28" />
            <Select value={form.charge_type} onValueChange={v => setForm(p => ({ ...p, charge_type: v }))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Charge Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="room">Room</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="laundry">Laundry</SelectItem>
                <SelectItem value="minibar">Minibar</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Amount" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="w-32" />
            <Input placeholder="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="w-48" />
            <Button onClick={() => addCharge.mutate()}>Add Charge</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Active Folios</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking No</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Room Charges</TableHead>
                <TableHead>Extras</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Settle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {folioList.map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell className="font-mono">{f.booking_no || f.id}</TableCell>
                  <TableCell>{f.guest}</TableCell>
                  <TableCell>{f.room}</TableCell>
                  <TableCell>{f.check_in}</TableCell>
                  <TableCell>{f.check_out}</TableCell>
                  <TableCell>Rs {fmt(f.room_charges)}</TableCell>
                  <TableCell>Rs {fmt(f.extras)}</TableCell>
                  <TableCell>Rs {fmt(f.total)}</TableCell>
                  <TableCell>Rs {fmt(f.paid)}</TableCell>
                  <TableCell className="font-bold">Rs {fmt(f.balance)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {["Cash","Card","UPI"].map(m => (
                        <Button key={m} size="sm" variant="outline" className="text-xs px-2" onClick={() => settle.mutate({ id: f.id, mode: m.toLowerCase() })}>{m}</Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
