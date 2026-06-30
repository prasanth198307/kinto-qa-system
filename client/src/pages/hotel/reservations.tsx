import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit2, XCircle, Search } from "lucide-react";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => r.json());

const STATUS_COLORS: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-green-100 text-green-800",
  checked_out: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

type Reservation = {
  id: number;
  reservation_number: string;
  guest_name: string;
  room_type_name: string;
  check_in_date: string;
  check_out_date: string;
  total_nights: number;
  adults: number;
  children: number;
  rate_per_night: number;
  total_amount: number;
  advance_paid: number;
  balance_amount: number;
  status: string;
  guest_id: number;
  room_type_id: number;
  source: string;
  special_requests: string;
};

type Guest = { id: number; name: string; phone: string; email: string; id_type: string; id_number: string };
type RoomType = { id: number; name: string; base_price: number; max_occupancy: number };

const emptyForm = {
  guest_id: "",
  new_guest_name: "",
  new_guest_phone: "",
  new_guest_email: "",
  new_guest_id_type: "aadhar",
  new_guest_id_number: "",
  create_new_guest: false,
  room_type_id: "",
  check_in_date: "",
  check_out_date: "",
  adults: 1,
  children: 0,
  rate_per_night: "",
  source: "walk_in",
  special_requests: "",
};

function calcNights(cin: string, cout: string) {
  if (!cin || !cout) return 0;
  const diff = new Date(cout).getTime() - new Date(cin).getTime();
  return Math.max(0, Math.round(diff / 86400000));
}

export default function ReservationsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editReservation, setEditReservation] = useState<Reservation | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [guestSearch, setGuestSearch] = useState("");

  const params = new URLSearchParams();
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (search) params.set("search", search);
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);

  const { data: reservations = [] } = useQuery<Reservation[]>({
    queryKey: ["hotel-reservations", statusFilter, search, dateFrom, dateTo],
    queryFn: () => api("GET", `/api/hotel/reservations?${params}`),
  });

  const { data: guests = [] } = useQuery<Guest[]>({
    queryKey: ["hotel-guests"],
    queryFn: () => api("GET", "/api/hotel/guests"),
  });

  const { data: roomTypes = [] } = useQuery<RoomType[]>({
    queryKey: ["hotel-room-types"],
    queryFn: () => api("GET", "/api/hotel/room-types"),
  });

  const createMutation = useMutation({
    mutationFn: (data: unknown) => api("POST", "/api/hotel/reservations", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hotel-reservations"] }); setDialogOpen(false); setForm({ ...emptyForm }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) => api("PUT", `/api/hotel/reservations/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hotel-reservations"] }); setDialogOpen(false); setEditReservation(null); setForm({ ...emptyForm }); },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/hotel/reservations/${id}`, { status: "cancelled" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hotel-reservations"] }),
  });

  const nights = calcNights(form.check_in_date, form.check_out_date);
  const totalAmount = nights * Number(form.rate_per_night || 0);

  function openNew() {
    setEditReservation(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(r: Reservation) {
    setEditReservation(r);
    setForm({
      guest_id: String(r.guest_id),
      new_guest_name: "",
      new_guest_phone: "",
      new_guest_email: "",
      new_guest_id_type: "aadhar",
      new_guest_id_number: "",
      create_new_guest: false,
      room_type_id: String(r.room_type_id),
      check_in_date: r.check_in_date?.slice(0, 10) ?? "",
      check_out_date: r.check_out_date?.slice(0, 10) ?? "",
      adults: r.adults,
      children: r.children,
      rate_per_night: String(r.rate_per_night),
      source: r.source,
      special_requests: r.special_requests ?? "",
    });
    setDialogOpen(true);
  }

  function handleRoomTypeChange(id: string) {
    const rt = roomTypes.find((r) => String(r.id) === id);
    setForm((f) => ({ ...f, room_type_id: id, rate_per_night: rt ? String(rt.base_price) : f.rate_per_night }));
  }

  function handleSubmit() {
    const payload: Record<string, unknown> = {
      room_type_id: Number(form.room_type_id),
      check_in_date: form.check_in_date,
      check_out_date: form.check_out_date,
      total_nights: nights,
      adults: form.adults,
      children: form.children,
      rate_per_night: Number(form.rate_per_night),
      total_amount: totalAmount,
      source: form.source,
      special_requests: form.special_requests,
    };
    if (form.create_new_guest) {
      payload.new_guest = {
        name: form.new_guest_name,
        phone: form.new_guest_phone,
        email: form.new_guest_email,
        id_type: form.new_guest_id_type,
        id_number: form.new_guest_id_number,
      };
    } else {
      payload.guest_id = Number(form.guest_id);
    }
    if (editReservation) {
      updateMutation.mutate({ id: editReservation.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const filteredGuests = guests.filter((g) =>
    !guestSearch || g.name.toLowerCase().includes(guestSearch.toLowerCase()) || g.phone.includes(guestSearch)
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reservations</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />New Reservation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editReservation ? "Edit Reservation" : "New Reservation"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {!editReservation && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="newGuest" checked={form.create_new_guest}
                    onChange={(e) => setForm((f) => ({ ...f, create_new_guest: e.target.checked }))} />
                  <Label htmlFor="newGuest">Create new guest</Label>
                </div>
              )}
              {form.create_new_guest ? (
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Name</Label><Input value={form.new_guest_name} onChange={(e) => setForm((f) => ({ ...f, new_guest_name: e.target.value }))} /></div>
                  <div><Label>Phone</Label><Input value={form.new_guest_phone} onChange={(e) => setForm((f) => ({ ...f, new_guest_phone: e.target.value }))} /></div>
                  <div><Label>Email</Label><Input value={form.new_guest_email} onChange={(e) => setForm((f) => ({ ...f, new_guest_email: e.target.value }))} /></div>
                  <div>
                    <Label>ID Type</Label>
                    <Select value={form.new_guest_id_type} onValueChange={(v) => setForm((f) => ({ ...f, new_guest_id_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aadhar">Aadhar</SelectItem>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="driving_license">Driving License</SelectItem>
                        <SelectItem value="voter_id">Voter ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2"><Label>ID Number</Label><Input value={form.new_guest_id_number} onChange={(e) => setForm((f) => ({ ...f, new_guest_id_number: e.target.value }))} /></div>
                </div>
              ) : (
                <div>
                  <Label>Guest</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                    <Input className="pl-8" placeholder="Search guest..." value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} />
                  </div>
                  <div className="border rounded mt-1 max-h-40 overflow-y-auto">
                    {filteredGuests.slice(0, 20).map((g) => (
                      <div key={g.id} className={`px-3 py-2 cursor-pointer hover:bg-gray-50 ${String(g.id) === form.guest_id ? "bg-blue-50" : ""}`}
                        onClick={() => setForm((f) => ({ ...f, guest_id: String(g.id) }))}>
                        <span className="font-medium">{g.name}</span>
                        <span className="text-gray-500 text-sm ml-2">{g.phone}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Room Type</Label>
                  <Select value={form.room_type_id} onValueChange={handleRoomTypeChange}>
                    <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                    <SelectContent>
                      {roomTypes.map((rt) => <SelectItem key={rt.id} value={String(rt.id)}>{rt.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk_in">Walk In</SelectItem>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="ota">OTA</SelectItem>
                      <SelectItem value="corporate">Corporate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Check-In Date</Label>
                  <Input type="date" value={form.check_in_date} onChange={(e) => setForm((f) => ({ ...f, check_in_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Check-Out Date</Label>
                  <Input type="date" value={form.check_out_date} onChange={(e) => setForm((f) => ({ ...f, check_out_date: e.target.value }))} />
                </div>
                <div>
                  <Label>Adults</Label>
                  <Input type="number" min={1} value={form.adults} onChange={(e) => setForm((f) => ({ ...f, adults: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Children</Label>
                  <Input type="number" min={0} value={form.children} onChange={(e) => setForm((f) => ({ ...f, children: Number(e.target.value) }))} />
                </div>
                <div>
                  <Label>Rate / Night (₹)</Label>
                  <Input type="number" value={form.rate_per_night} onChange={(e) => setForm((f) => ({ ...f, rate_per_night: e.target.value }))} />
                </div>
                <div className="flex flex-col justify-end">
                  <Label>Total ({nights} nights)</Label>
                  <div className="font-semibold text-lg">₹{totalAmount.toLocaleString()}</div>
                </div>
              </div>
              <div>
                <Label>Special Requests</Label>
                <Textarea value={form.special_requests} onChange={(e) => setForm((f) => ({ ...f, special_requests: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                  {editReservation ? "Update" : "Create"} Reservation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="checked_in">Checked In</SelectItem>
            <SelectItem value="checked_out">Checked Out</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Input className="w-48" placeholder="Search guest / reservation..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <Input type="date" className="w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" className="w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      <div className="rounded border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reservation #</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Room Type</TableHead>
              <TableHead>Check-In</TableHead>
              <TableHead>Check-Out</TableHead>
              <TableHead>Nights</TableHead>
              <TableHead>Pax</TableHead>
              <TableHead className="text-right">Rate/Night</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Advance</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm">{r.reservation_number}</TableCell>
                <TableCell>{r.guest_name}</TableCell>
                <TableCell>{r.room_type_name}</TableCell>
                <TableCell>{r.check_in_date?.slice(0, 10)}</TableCell>
                <TableCell>{r.check_out_date?.slice(0, 10)}</TableCell>
                <TableCell>{r.total_nights}</TableCell>
                <TableCell>{r.adults}A {r.children > 0 ? `${r.children}C` : ""}</TableCell>
                <TableCell className="text-right">₹{Number(r.rate_per_night).toLocaleString()}</TableCell>
                <TableCell className="text-right">₹{Number(r.total_amount).toLocaleString()}</TableCell>
                <TableCell className="text-right">₹{Number(r.advance_paid).toLocaleString()}</TableCell>
                <TableCell className="text-right">₹{Number(r.balance_amount).toLocaleString()}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[r.status] ?? "bg-gray-100"}`}>
                    {r.status?.replace("_", " ")}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {r.status !== "cancelled" && r.status !== "checked_out" && (
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Edit2 className="w-4 h-4" /></Button>
                    )}
                    {r.status === "confirmed" && (
                      <Button size="icon" variant="ghost" className="text-red-500" onClick={() => cancelMutation.mutate(r.id)}>
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {reservations.length === 0 && (
              <TableRow><TableCell colSpan={13} className="text-center text-gray-400 py-8">No reservations found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
