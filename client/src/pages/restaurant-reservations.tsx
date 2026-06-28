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
const fmt = (n: any) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-800",
  seated: "bg-green-100 text-green-800",
  "no-show": "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  waitlist: "bg-orange-100 text-orange-800",
  pending: "bg-yellow-100 text-yellow-800",
};

const today = new Date().toISOString().split("T")[0];

export default function RestaurantReservationsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [date, setDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState("all");
  const [outletFilter, setOutletFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [seatReservationId, setSeatReservationId] = useState<number | null>(null);
  const [selectedTableId, setSelectedTableId] = useState("");

  const [form, setForm] = useState({
    customer_name: "", customer_phone: "", reservation_date: today,
    reservation_time: "19:00", covers: 2, outlet_id: "", notes: "",
  });

  const params = new URLSearchParams({ date });
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (outletFilter !== "all") params.set("outlet_id", outletFilter);

  const { data: reservations = [], isLoading } = useQuery({
    queryKey: ["/api/restaurant/reservations", date, statusFilter, outletFilter],
    queryFn: () => api("GET", `/api/restaurant/reservations?${params}`),
  });

  const { data: outlets = [] } = useQuery({
    queryKey: ["/api/restaurant/outlets"],
    queryFn: () => api("GET", "/api/restaurant/outlets"),
  });

  const { data: availableTables = [] } = useQuery({
    queryKey: ["/api/restaurant/tables", "available"],
    queryFn: () => api("GET", "/api/restaurant/tables?status=available"),
    enabled: !!seatReservationId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/restaurant/reservations"] });

  const createMut = useMutation({
    mutationFn: (data: any) => editId
      ? api("PUT", `/api/restaurant/reservations/${editId}`, data)
      : api("POST", "/api/restaurant/reservations", data),
    onSuccess: () => { toast({ title: editId ? "Reservation updated" : "Reservation created" }); invalidate(); resetForm(); },
    onError: () => toast({ title: "Error saving reservation", variant: "destructive" }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api("PUT", `/api/restaurant/reservations/${id}`, { status }),
    onSuccess: () => { toast({ title: "Status updated" }); invalidate(); },
  });

  const seatMut = useMutation({
    mutationFn: ({ id, table_id, table_number }: any) =>
      api("POST", `/api/restaurant/reservations/${id}/seat`, { table_id, table_number }),
    onSuccess: () => { toast({ title: "Guest seated successfully" }); invalidate(); setSeatReservationId(null); setSelectedTableId(""); },
    onError: () => toast({ title: "Error seating guest", variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/restaurant/reservations/${id}`),
    onSuccess: () => { toast({ title: "Reservation deleted" }); invalidate(); },
  });

  const resetForm = () => {
    setForm({ customer_name: "", customer_phone: "", reservation_date: today, reservation_time: "19:00", covers: 2, outlet_id: "", notes: "" });
    setShowForm(false); setEditId(null);
  };

  const startEdit = (r: any) => {
    setForm({
      customer_name: r.customer_name || "", customer_phone: r.customer_phone || "",
      reservation_date: r.reservation_date?.split("T")[0] || today,
      reservation_time: r.reservation_time || "19:00", covers: r.covers || 2,
      outlet_id: String(r.outlet_id || ""), notes: r.notes || "",
    });
    setEditId(r.id); setShowForm(true);
  };

  const counts = {
    total: reservations.length,
    confirmed: reservations.filter((r: any) => r.status === "confirmed").length,
    seated: reservations.filter((r: any) => r.status === "seated").length,
    noShow: reservations.filter((r: any) => r.status === "no-show").length,
    cancelled: reservations.filter((r: any) => r.status === "cancelled").length,
  };

  // Timeline: 8am-11pm slots
  const timeSlots = Array.from({ length: 16 }, (_, i) => {
    const h = i + 8;
    return `${h.toString().padStart(2, "0")}:00`;
  });

  const getReservationHour = (time: string) => parseInt(time?.split(":")[0] || "0");

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Reservations</h1>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>+ New Reservation</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: "Total Today", value: counts.total, color: "text-gray-800" },
          { label: "Confirmed", value: counts.confirmed, color: "text-blue-600" },
          { label: "Seated", value: counts.seated, color: "text-green-600" },
          { label: "No-Shows", value: counts.noShow, color: "text-red-600" },
          { label: "Cancelled", value: counts.cancelled, color: "text-gray-500" },
        ].map(c => (
          <Card key={c.label}>
            <CardContent className="pt-4">
              <p className="text-sm text-gray-500">{c.label}</p>
              <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-40" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="seated">Seated</SelectItem>
            <SelectItem value="no-show">No-Show</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="waitlist">Waitlist</SelectItem>
          </SelectContent>
        </Select>
        <Select value={outletFilter} onValueChange={setOutletFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Outlet" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Outlets</SelectItem>
            {outlets.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.outlet_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setDate(today)}>Today</Button>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Timeline View — {date}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="flex gap-1 min-w-max">
              {timeSlots.map(slot => {
                const slotHour = parseInt(slot.split(":")[0]);
                const slotRes = (reservations as any[]).filter(r => getReservationHour(r.reservation_time) === slotHour);
                return (
                  <div key={slot} className="flex flex-col items-center min-w-[60px]">
                    <div className="text-xs text-gray-400 mb-1">{slot}</div>
                    <div className="w-full min-h-[40px] rounded border border-gray-100 bg-gray-50 p-1 space-y-1">
                      {slotRes.map((r: any) => (
                        <div key={r.id} className={`text-xs px-1 rounded truncate ${STATUS_COLORS[r.status] || "bg-gray-100"}`}>
                          {r.customer_name} ({r.covers})
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seat Modal */}
      {seatReservationId && (
        <Card className="border-2 border-green-400">
          <CardHeader><CardTitle>Select Table to Seat Guest</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedTableId} onValueChange={setSelectedTableId}>
              <SelectTrigger><SelectValue placeholder="Select available table" /></SelectTrigger>
              <SelectContent>
                {availableTables.map((t: any) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    Table {t.table_number} — Capacity {t.capacity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={() => {
                const tbl = availableTables.find((t: any) => String(t.id) === selectedTableId);
                seatMut.mutate({ id: seatReservationId, table_id: selectedTableId, table_number: tbl?.table_number });
              }} disabled={!selectedTableId}>Confirm Seat</Button>
              <Button variant="outline" onClick={() => { setSeatReservationId(null); setSelectedTableId(""); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-2 border-blue-200">
          <CardHeader><CardTitle>{editId ? "Edit Reservation" : "New Reservation"}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium">Customer Name *</label>
                <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} placeholder="Customer name" /></div>
              <div><label className="text-sm font-medium">Phone</label>
                <Input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} placeholder="Phone number" /></div>
              <div><label className="text-sm font-medium">Date *</label>
                <Input type="date" value={form.reservation_date} onChange={e => setForm(f => ({ ...f, reservation_date: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Time *</label>
                <Input type="time" value={form.reservation_time} onChange={e => setForm(f => ({ ...f, reservation_time: e.target.value }))} /></div>
              <div><label className="text-sm font-medium">Covers</label>
                <Input type="number" min={1} max={20} value={form.covers} onChange={e => setForm(f => ({ ...f, covers: parseInt(e.target.value) || 2 }))} /></div>
              <div><label className="text-sm font-medium">Outlet</label>
                <Select value={form.outlet_id} onValueChange={v => setForm(f => ({ ...f, outlet_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select outlet" /></SelectTrigger>
                  <SelectContent>{outlets.map((o: any) => <SelectItem key={o.id} value={String(o.id)}>{o.outlet_name}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="col-span-2"><label className="text-sm font-medium">Notes</label>
                <textarea className="w-full border rounded p-2 text-sm" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Special requests, dietary needs..." /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => createMut.mutate(form)} disabled={!form.customer_name || !form.reservation_time || createMut.isPending}>
                {createMut.isPending ? "Saving..." : editId ? "Update" : "Create Reservation"}
              </Button>
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader><CardTitle>Reservations — {date} ({reservations.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-gray-400 py-8 text-center">Loading...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Covers</TableHead>
                  <TableHead>Outlet</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center text-gray-400">No reservations for this date</TableCell></TableRow>
                ) : reservations.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.customer_name}</TableCell>
                    <TableCell>{r.customer_phone || "—"}</TableCell>
                    <TableCell>{r.reservation_date?.split("T")[0]}</TableCell>
                    <TableCell>{r.reservation_time}</TableCell>
                    <TableCell>{r.covers}</TableCell>
                    <TableCell>{r.outlet_name || r.outlet_id || "—"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[r.status] || "bg-gray-100"}`}>{r.status}</span>
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate text-sm text-gray-500">{r.notes || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {r.status === "confirmed" && (
                          <>
                            <Button size="sm" variant="outline" className="text-green-700 border-green-300 text-xs"
                              onClick={() => setSeatReservationId(r.id)}>Seat</Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 text-xs"
                              onClick={() => statusMut.mutate({ id: r.id, status: "no-show" })}>No Show</Button>
                          </>
                        )}
                        {!["cancelled", "no-show"].includes(r.status) && (
                          <Button size="sm" variant="outline" className="text-gray-600 text-xs"
                            onClick={() => statusMut.mutate({ id: r.id, status: "cancelled" })}>Cancel</Button>
                        )}
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => startEdit(r)}>Edit</Button>
                        <Button size="sm" variant="ghost" className="text-red-600 text-xs"
                          onClick={() => { if (confirm("Delete this reservation?")) deleteMut.mutate(r.id); }}>Del</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
