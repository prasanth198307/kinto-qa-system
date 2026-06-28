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

export default function RestaurantReservationsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ guest_name: "", phone: "", date: "", time: "", covers: "", special_requests: "" });

  const { data: reservations = [] } = useQuery({ queryKey: ["restaurant-reservations"], queryFn: () => api("GET", "/api/restaurant/reservations") });

  const addReservation = useMutation({
    mutationFn: () => api("POST", "/api/restaurant/reservations", { ...form, covers: Number(form.covers) }),
    onSuccess: () => { toast({ title: "Reservation added" }); qc.invalidateQueries({ queryKey: ["restaurant-reservations"] }); setForm({ guest_name: "", phone: "", date: "", time: "", covers: "", special_requests: "" }); }
  });

  const resList: any[] = Array.isArray(reservations) ? reservations : (reservations as any)?.reservations || [];

  const statusBadge = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "confirmed") return "default";
    if (s === "pending") return "secondary";
    if (s === "cancelled") return "destructive";
    return "outline";
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Reservations</h1>
      <Card>
        <CardHeader><CardTitle>New Reservation</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Guest Name" value={form.guest_name} onChange={e => setForm(p => ({ ...p, guest_name: e.target.value }))} className="w-40" />
            <Input placeholder="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-36" />
            <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="w-36" />
            <Input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} className="w-32" />
            <Input placeholder="Covers" type="number" value={form.covers} onChange={e => setForm(p => ({ ...p, covers: e.target.value }))} className="w-24" />
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
                <TableHead>Guest</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Covers</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resList.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>{r.guest_name}</TableCell>
                  <TableCell>{r.phone}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.time}</TableCell>
                  <TableCell>{r.covers}</TableCell>
                  <TableCell>{r.table || "-"}</TableCell>
                  <TableCell><Badge variant={statusBadge(r.status)}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
