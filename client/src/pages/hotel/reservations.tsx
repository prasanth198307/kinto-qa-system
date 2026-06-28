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

export default function HotelReservationsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ guest_name: "", phone: "", room_type: "", check_in: "", check_out: "", adults: "", children: "", special_requests: "" });

  const { data: reservations = [] } = useQuery({ queryKey: ["hotel-reservations"], queryFn: () => api("GET", "/api/hotel/reservations") });

  const addReservation = useMutation({
    mutationFn: () => api("POST", "/api/hotel/reservations", { ...form, adults: Number(form.adults), children: Number(form.children) }),
    onSuccess: () => { toast({ title: "Reservation added" }); qc.invalidateQueries({ queryKey: ["hotel-reservations"] }); setForm({ guest_name: "", phone: "", room_type: "", check_in: "", check_out: "", adults: "", children: "", special_requests: "" }); }
  });

  const resList: any[] = Array.isArray(reservations) ? reservations : (reservations as any)?.reservations || [];

  const statusBadge = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "confirmed" || s === "checked-in") return "default";
    if (s === "pending" || s === "checked-out") return "secondary";
    if (s === "cancelled") return "destructive";
    return "outline";
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Hotel Reservations</h1>
      <Card>
        <CardHeader><CardTitle>New Reservation</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Guest Name" value={form.guest_name} onChange={e => setForm(p => ({ ...p, guest_name: e.target.value }))} className="w-40" />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-36" />
            <Select value={form.room_type} onValueChange={v => setForm(p => ({ ...p, room_type: v }))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Room Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="deluxe">Deluxe</SelectItem>
                <SelectItem value="suite">Suite</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={form.check_in} onChange={e => setForm(p => ({ ...p, check_in: e.target.value }))} className="w-36" />
            <Input type="date" value={form.check_out} onChange={e => setForm(p => ({ ...p, check_out: e.target.value }))} className="w-36" />
            <Input placeholder="Adults" type="number" value={form.adults} onChange={e => setForm(p => ({ ...p, adults: e.target.value }))} className="w-20" />
            <Input placeholder="Children" type="number" value={form.children} onChange={e => setForm(p => ({ ...p, children: e.target.value }))} className="w-20" />
            <Input placeholder="Special Requests" value={form.special_requests} onChange={e => setForm(p => ({ ...p, special_requests: e.target.value }))} className="w-48" />
            <Button onClick={() => addReservation.mutate()}>Add Reservation</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Reservations</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Booking No</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room Type</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Nights</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resList.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.booking_no || r.id}</TableCell>
                  <TableCell>{r.guest_name}</TableCell>
                  <TableCell>{r.room_type}</TableCell>
                  <TableCell>{r.check_in}</TableCell>
                  <TableCell>{r.check_out}</TableCell>
                  <TableCell>{r.nights}</TableCell>
                  <TableCell><Badge variant={statusBadge(r.status)}>{r.status}</Badge></TableCell>
                  <TableCell>Rs {fmt(r.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
