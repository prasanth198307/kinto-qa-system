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

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-800",
  seated: "bg-green-100 text-green-800",
  "no-show": "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-600",
};

const today = new Date().toISOString().split("T")[0];

export default function RestaurantReservationsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [date, setDate] = useState(today);
  const [status, setStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [seatId, setSeatId] = useState<number | null>(null);
  const [seatTable, setSeatTable] = useState("");
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", reservation_date: today, reservation_time: "19:00", covers: 2, notes: "", outlet_id: "" });

  const { data: reservations = [] } = useQuery({ queryKey: ["/api/restaurant/reservations", date, status], queryFn: () => api("GET", `/api/restaurant/reservations?date=${date}&status=${status}`) });
  const { data: outlets = [] } = useQuery({ queryKey: ["/api/restaurant/outlets"], queryFn: () => api("GET", "/api/restaurant/outlets"), enabled: showForm });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/restaurant/reservations"] });

  const addMut = useMutation({ mutationFn: (d: any) => api("POST", "/api/restaurant/reservations", d), onSuccess: () => { invalidate(); setShowForm(false); toast({ title: "Reservation added" }); } });
  const updateMut = useMutation({ mutationFn: ({ id, ...d }: any) => api("PUT", `/api/restaurant/reservations/${id}`, d), onSuccess: () => { invalidate(); toast({ title: "Updated" }); } });
  const seatMut = useMutation({ mutationFn: ({ id, table_number }: any) => api("POST", `/api/restaurant/reservations/${id}/seat`, { table_number }), onSuccess: () => { invalidate(); setSeatId(null); toast({ title: "Guest seated" }); } });

  const summary = { total: reservations.length, seated: reservations.filter((r: any) => r.status === "seated").length, noshow: reservations.filter((r: any) => r.status === "no-show").length };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reservations</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Reservation</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[["Total Booked", summary.total, "blue"], ["Seated", summary.seated, "green"], ["No-shows", summary.noshow, "red"]].map(([label, val, color]) => (
          <Card key={label as string}><CardContent className="pt-4 text-center"><div className={`text-3xl font-bold text-${color}-600`}>{val}</div><div className="text-sm text-gray-500">{label}</div></CardContent></Card>
        ))}
      </div>

      {showForm && (
        <Card><CardHeader><CardTitle>New Reservation</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[["customer_name", "Customer Name", "text"], ["customer_phone", "Phone", "text"], ["reservation_date", "Date", "date"], ["reservation_time", "Time", "time"]].map(([k, label, type]) => (
              <div key={k as string}><label className="text-sm font-medium">{label}</label>
                <Input type={type as string} value={(form as any)[k as string]} onChange={e => setForm(f => ({ ...f, [k as string]: e.target.value }))} /></div>
            ))}
            <div><label className="text-sm font-medium">Covers</label><Input type="number" value={form.covers} min={1} onChange={e => setForm(f => ({ ...f, covers: +e.target.value }))} /></div>
            <div><label className="text-sm font-medium">Outlet</label>
              <Select value={form.outlet_id} onValueChange={v => setForm(f => ({ ...f, outlet_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                <SelectContent>{outlets.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="col-span-2"><label className="text-sm font-medium">Notes</label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="col-span-2 flex gap-2">
              <Button onClick={() => addMut.mutate(form)} disabled={addMut.isPending}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent></Card>
      )}

      <div className="flex gap-3">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{["all", "confirmed", "seated", "no-show", "cancelled"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {seatId && (
        <Card><CardContent className="pt-4 flex gap-3 items-center">
          <span className="font-medium">Table #:</span>
          <Input value={seatTable} onChange={e => setSeatTable(e.target.value)} className="w-28" placeholder="e.g. T5" />
          <Button onClick={() => seatMut.mutate({ id: seatId, table_number: seatTable })}>Confirm Seat</Button>
          <Button variant="outline" onClick={() => setSeatId(null)}>Cancel</Button>
        </CardContent></Card>
      )}

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            {["Customer", "Phone", "Date", "Time", "Covers", "Table", "Status", "Actions"].map(h => <TableHead key={h}>{h}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {reservations.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.customer_name}</TableCell>
                <TableCell>{r.customer_phone}</TableCell>
                <TableCell>{r.reservation_date}</TableCell>
                <TableCell>{r.reservation_time}</TableCell>
                <TableCell>{r.covers}</TableCell>
                <TableCell>{r.table_number || "—"}</TableCell>
                <TableCell><Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge></TableCell>
                <TableCell className="space-x-1">
                  {r.status === "confirmed" && <Button size="sm" onClick={() => { setSeatId(r.id); setSeatTable(""); }}>Seat</Button>}
                  {r.status === "confirmed" && <Button size="sm" variant="outline" onClick={() => updateMut.mutate({ id: r.id, status: "no-show" })}>No Show</Button>}
                  {!["cancelled", "no-show", "seated"].includes(r.status) && <Button size="sm" variant="destructive" onClick={() => updateMut.mutate({ id: r.id, status: "cancelled" })}>Cancel</Button>}
                </TableCell>
              </TableRow>
            ))}
            {reservations.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">No reservations found</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}
