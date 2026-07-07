import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Plus, X, Search } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const STATUS_COLOR: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-green-100 text-green-800",
  checked_out: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-100 text-red-800",
  no_show: "bg-orange-100 text-orange-800",
  waitlist: "bg-yellow-100 text-yellow-800",
};

const SOURCES = ["Walk-in", "Phone", "Email", "MakeMyTrip", "Booking.com", "Goibibo", "Agoda", "Corporate", "Travel Agent", "Website"];
const EMPTY = { guest_id: "", room_id: "", check_in_date: "", check_out_date: "", adults: "1", children: "0", rate_per_night: "", total_amount: "", advance_paid: "0", payment_mode: "cash", source: "Walk-in", notes: "" };

export default function HotelReservationsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: reservations = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/reservations"], queryFn: () => api("GET", "/api/hotel/reservations") });
  const { data: guests = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/guests"], queryFn: () => api("GET", "/api/hotel/guests") });
  const { data: rooms = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/rooms"], queryFn: () => api("GET", "/api/hotel/rooms") });

  const create = useMutation({ mutationFn: (b: any) => api("POST", "/api/hotel/reservations", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hotel/reservations"] }); setShowForm(false); setForm({ ...EMPTY }); } });
  const checkin = useMutation({ mutationFn: (id: number) => api("POST", `/api/hotel/reservations/${id}/checkin`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/reservations"] }) });
  const checkout = useMutation({ mutationFn: (id: number) => api("POST", `/api/hotel/reservations/${id}/checkout`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/reservations"] }) });
  const cancel = useMutation({ mutationFn: (id: number) => api("PUT", `/api/hotel/reservations/${id}`, { status: "cancelled" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/reservations"] }) });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const arr = Array.isArray(reservations) ? reservations : [];
  const guestsArr = Array.isArray(guests) ? guests : [];
  const roomsArr = Array.isArray(rooms) ? rooms : [];

  const calcTotal = (updated: typeof form) => {
    if (updated.check_in_date && updated.check_out_date && updated.rate_per_night) {
      const nights = Math.max(1, Math.ceil((new Date(updated.check_out_date).getTime() - new Date(updated.check_in_date).getTime()) / 86400000));
      return (nights * parseFloat(updated.rate_per_night || "0")).toFixed(0);
    }
    return updated.total_amount;
  };

  const filtered = arr.filter((r: any) => {
    const ms = !search || (r.guest_name ?? "").toLowerCase().includes(search.toLowerCase()) || (r.room_number ?? "").includes(search);
    const mf = !statusFilter || r.status === statusFilter;
    return ms && mf;
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="w-6 h-6 text-blue-600" />Reservations</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />New Reservation</Button>
      </div>

      <div className="grid grid-cols-6 gap-3">
        {Object.entries(STATUS_COLOR).map(([s]) => (
          <Card key={s}><CardContent className="pt-3"><p className="text-xs text-gray-500 capitalize">{s.replace("_", " ")}</p><p className="text-2xl font-bold">{arr.filter((r: any) => r.status === s).length}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search guest or room..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {Object.keys(STATUS_COLOR).map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">New Reservation</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-4 gap-3">
            <div><Label>Guest</Label>
              <Select value={form.guest_id} onValueChange={v => f("guest_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select guest" /></SelectTrigger>
                <SelectContent>{guestsArr.map((g: any) => <SelectItem key={g.id} value={g.id.toString()}>{g.name} ({g.phone})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Room</Label>
              <Select value={form.room_id} onValueChange={v => f("room_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>{roomsArr.filter((r: any) => r.status === "available").map((r: any) => <SelectItem key={r.id} value={r.id.toString()}>Room {r.room_number} ({r.room_type_name})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Check-in</Label><Input type="date" value={form.check_in_date} onChange={e => { const u = { ...form, check_in_date: e.target.value }; setForm({ ...u, total_amount: calcTotal(u) }); }} /></div>
            <div><Label>Check-out</Label><Input type="date" value={form.check_out_date} onChange={e => { const u = { ...form, check_out_date: e.target.value }; setForm({ ...u, total_amount: calcTotal(u) }); }} /></div>
            <div><Label>Adults</Label><Input type="number" value={form.adults} onChange={e => f("adults", e.target.value)} /></div>
            <div><Label>Children</Label><Input type="number" value={form.children} onChange={e => f("children", e.target.value)} /></div>
            <div><Label>Rate/Night (₹)</Label><Input type="number" value={form.rate_per_night} onChange={e => { const u = { ...form, rate_per_night: e.target.value }; setForm({ ...u, total_amount: calcTotal(u) }); }} /></div>
            <div><Label>Total Amount (₹)</Label><Input type="number" value={form.total_amount} onChange={e => f("total_amount", e.target.value)} /></div>
            <div><Label>Advance Paid (₹)</Label><Input type="number" value={form.advance_paid} onChange={e => f("advance_paid", e.target.value)} /></div>
            <div><Label>Payment Mode</Label>
              <Select value={form.payment_mode} onValueChange={v => f("payment_mode", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["cash", "card", "upi", "bank_transfer", "credit"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Source</Label>
              <Select value={form.source} onValueChange={v => f("source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={e => f("notes", e.target.value)} /></div>
            <div className="col-span-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => create.mutate({ ...form, guest_id: parseInt(form.guest_id), room_id: parseInt(form.room_id), adults: parseInt(form.adults), children: parseInt(form.children), rate_per_night: parseFloat(form.rate_per_night || "0"), total_amount: parseFloat(form.total_amount || "0"), advance_paid: parseFloat(form.advance_paid || "0") })}>Book</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((r: any) => (
          <Card key={r.id}>
            <CardContent className="pt-4 flex items-start justify-between">
              <div>
                <p className="font-semibold">{r.guest_name ?? `Guest #${r.guest_id}`}</p>
                <p className="text-sm text-gray-600">Room {r.room_number ?? r.room_id} · {r.check_in_date?.slice(0, 10)} → {r.check_out_date?.slice(0, 10)}</p>
                <p className="text-xs text-gray-500">{r.adults ?? 1} adults · ₹{Number(r.rate_per_night ?? 0).toLocaleString("en-IN")}/night · Total ₹{Number(r.total_amount ?? 0).toLocaleString("en-IN")} · {r.source}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className={STATUS_COLOR[r.status] ?? "bg-gray-100"}>{r.status?.replace("_", " ")}</Badge>
                <div className="flex gap-1 flex-wrap justify-end">
                  {r.status === "confirmed" && <Button size="sm" onClick={() => checkin.mutate(r.id)}>Check In</Button>}
                  {r.status === "checked_in" && <Button size="sm" onClick={() => checkout.mutate(r.id)}>Check Out</Button>}
                  {["confirmed", "waitlist"].includes(r.status) && <Button size="sm" variant="ghost" className="text-red-500" onClick={() => cancel.mutate(r.id)}>Cancel</Button>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-gray-400 py-8">No reservations found.</p>}
      </div>
    </div>
  );
}
