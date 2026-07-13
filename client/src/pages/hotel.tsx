import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, BedDouble, Users, Calendar, Receipt, Sparkles, Pencil, Trash2, LogIn, LogOut, X, FileText, RefreshCw } from "lucide-react";
import { useTenantConfig } from "@/hooks/use-tenant-config";

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  occupied: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  maintenance: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  cleaning: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  checked_in: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  checked_out: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  paid: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  partial: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
};

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function FieldRow({ label, children }: any) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────────
function OverviewTab() {
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { data: stats } = useQuery<any>({ queryKey: ["/api/hotel/stats"] });
  const occupancy = stats?.totalRooms ? Math.round(((stats.totalRooms - stats.availableRooms) / stats.totalRooms) * 100) : 0;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Rooms" value={stats?.totalRooms ?? 0} icon={BedDouble} color="bg-blue-100 text-blue-600" />
        <StatCard title="Available" value={stats?.availableRooms ?? 0} icon={BedDouble} color="bg-green-100 text-green-600" />
        <StatCard title="Checked In" value={stats?.checkedIn ?? 0} icon={Users} color="bg-orange-100 text-orange-600" />
        <StatCard title="Monthly Revenue" value={`${sym}${fmt(stats?.monthlyRevenue)}`} icon={Receipt} color="bg-purple-100 text-purple-600" />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Occupancy Rate</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold">{occupancy}%</div>
            <div className="flex-1 bg-muted rounded-full h-4">
              <div className="bg-blue-500 h-4 rounded-full transition-all" style={{ width: `${occupancy}%` }} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{stats?.pendingReservations ?? 0} pending reservations</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Rooms Tab ─────────────────────────────────────────────────────────────────
function RoomsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: rooms = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/rooms"] });
  const { data: roomTypes = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/room-types"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PUT", `/api/hotel/rooms/${editing.id}`, data)
      : apiRequest("POST", "/api/hotel/rooms", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hotel/rooms"] }); queryClient.invalidateQueries({ queryKey: ["/api/hotel/stats"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/hotel/rooms/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hotel/rooms"] }); toast({ title: "Deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = rooms.filter(r => r.room_number?.toLowerCase().includes(search.toLowerCase()) || r.room_type_name?.toLowerCase().includes(search.toLowerCase()));
  const openForm = (r?: any) => { setEditing(r || null); setForm(r ? { ...r } : { status: "available" }); setShowForm(true); };
  const { currency_symbol: sym } = useTenantConfig();

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search rooms…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Room</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {filtered.map(r => (
          <Card key={r.id} className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="text-xl font-bold">{r.room_number}</div>
                <Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{r.room_type_name || "—"}</p>
              <p className="text-xs text-muted-foreground">Floor: {r.floor || "—"}</p>
              <p className="text-sm font-medium mt-1">{sym}{fmt(r.base_price)}/night</p>
              <div className="flex gap-1 mt-3">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openForm(r)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" className="flex-1 text-red-600" onClick={() => deleteMutation.mutate(r.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center py-8 text-muted-foreground">No rooms found</div>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Room" : "Add Room"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <FieldRow label="Room Number *"><Input value={form.room_number || ""} onChange={e => setForm((p: any) => ({ ...p, room_number: e.target.value }))} /></FieldRow>
            <FieldRow label="Room Type">
              <Select value={form.room_type_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, room_type_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>{roomTypes.map((rt: any) => <SelectItem key={rt.id} value={rt.id.toString()}>{rt.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Floor"><Input value={form.floor || ""} onChange={e => setForm((p: any) => ({ ...p, floor: e.target.value }))} /></FieldRow>
            <FieldRow label="Status">
              <Select value={form.status || "available"} onValueChange={v => setForm((p: any) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["available", "occupied", "maintenance", "cleaning"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2} /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => saveMutation.mutate(form)} disabled={!form.room_number}>Save</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Room Types sub-section */}
      <RoomTypesSection />
    </div>
  );
}

function RoomTypesSection() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: roomTypes = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/room-types"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PUT", `/api/hotel/room-types/${editing.id}`, data)
      : apiRequest("POST", "/api/hotel/room-types", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hotel/room-types"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/hotel/room-types/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/hotel/room-types"] }),
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openForm = (rt?: any) => { setEditing(rt || null); setForm(rt ? { ...rt } : {}); setShowForm(true); };
  const { currency_symbol: sym } = useTenantConfig();

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Room Types</h3>
        <Button size="sm" onClick={() => openForm()}><Plus className="h-3 w-3 mr-1" />Add Type</Button>
      </div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>{["Name", "Base Price", "Max Occupancy", "Amenities", ""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {roomTypes.map((rt: any) => (
              <tr key={rt.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-medium">{rt.name}</td>
                <td className="px-3 py-2">{sym}{fmt(rt.base_price)}</td>
                <td className="px-3 py-2">{rt.max_occupancy}</td>
                <td className="px-3 py-2 max-w-[200px] truncate">{rt.amenities || "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openForm(rt)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteMutation.mutate(rt.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {roomTypes.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">No room types</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Room Type" : "Add Room Type"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <FieldRow label="Name *"><Input value={form.name || ""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></FieldRow>
            <FieldRow label="Base Price"><Input type="number" value={form.base_price || ""} onChange={e => setForm((p: any) => ({ ...p, base_price: e.target.value }))} /></FieldRow>
            <FieldRow label="Max Occupancy"><Input type="number" value={form.max_occupancy || ""} onChange={e => setForm((p: any) => ({ ...p, max_occupancy: e.target.value }))} /></FieldRow>
            <FieldRow label="Amenities"><Textarea value={form.amenities || ""} onChange={e => setForm((p: any) => ({ ...p, amenities: e.target.value }))} rows={2} placeholder="AC, TV, WiFi…" /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => saveMutation.mutate(form)} disabled={!form.name}>Save</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Reservations Tab ──────────────────────────────────────────────────────────
function ReservationsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: reservations = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/reservations"] });
  const { data: guests = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/guests"] });
  const { data: rooms = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/rooms"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PUT", `/api/hotel/reservations/${editing.id}`, data)
      : apiRequest("POST", "/api/hotel/reservations", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hotel/reservations"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const checkinMutation = useMutation({
    mutationFn: (id: any) => apiRequest("POST", `/api/hotel/reservations/${id}/checkin`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hotel/reservations"] }); queryClient.invalidateQueries({ queryKey: ["/api/hotel/rooms"] }); queryClient.invalidateQueries({ queryKey: ["/api/hotel/stats"] }); toast({ title: "Checked In" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const checkoutMutation = useMutation({
    mutationFn: (id: any) => apiRequest("POST", `/api/hotel/reservations/${id}/checkout`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hotel/reservations"] }); queryClient.invalidateQueries({ queryKey: ["/api/hotel/rooms"] }); queryClient.invalidateQueries({ queryKey: ["/api/hotel/stats"] }); toast({ title: "Checked Out" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = reservations.filter(r =>
    r.guest_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.reservation_no?.toLowerCase().includes(search.toLowerCase()) ||
    r.room_number?.toLowerCase().includes(search.toLowerCase())
  );

  const openForm = (r?: any) => { setEditing(r || null); setForm(r ? { ...r } : { adults: 1, children: 0 }); setShowForm(true); };
  const { currency_symbol: sym } = useTenantConfig();

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search reservations…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />New Reservation</Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>{["Res. No", "Guest", "Room", "Check-In", "Check-Out", "Amount", "Status", "Actions"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{r.reservation_no}</td>
                <td className="px-3 py-2"><div>{r.guest_name}</div><div className="text-xs text-muted-foreground">{r.guest_phone}</div></td>
                <td className="px-3 py-2">{r.room_number} <span className="text-xs text-muted-foreground">{r.room_type_name}</span></td>
                <td className="px-3 py-2">{r.check_in_date}</td>
                <td className="px-3 py-2">{r.check_out_date}</td>
                <td className="px-3 py-2">{sym}{fmt(r.total_amount)}</td>
                <td className="px-3 py-2"><Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge></td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    {r.status === 'confirmed' && <Button size="sm" variant="outline" onClick={() => checkinMutation.mutate(r.id)} title="Check In"><LogIn className="h-3 w-3" /></Button>}
                    {r.status === 'checked_in' && <Button size="sm" variant="outline" onClick={() => checkoutMutation.mutate(r.id)} title="Check Out"><LogOut className="h-3 w-3" /></Button>}
                    <Button size="sm" variant="ghost" onClick={() => openForm(r)}><Pencil className="h-3 w-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">No reservations found</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Reservation" : "New Reservation"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldRow label="Guest *">
                <Select value={form.guest_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, guest_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select guest" /></SelectTrigger>
                  <SelectContent>{guests.map((g: any) => <SelectItem key={g.id} value={g.id.toString()}>{g.name} — {g.phone}</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
            </div>
            <div className="col-span-2">
              <FieldRow label="Room *">
                <Select value={form.room_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, room_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent>{rooms.filter((r: any) => r.status === 'available' || r.id.toString() === form.room_id?.toString()).map((r: any) => <SelectItem key={r.id} value={r.id.toString()}>{r.room_number} — {r.room_type_name} ({sym}{fmt(r.base_price)}/night)</SelectItem>)}</SelectContent>
                </Select>
              </FieldRow>
            </div>
            <FieldRow label="Check-In *"><Input type="date" value={form.check_in_date || ""} onChange={e => setForm((p: any) => ({ ...p, check_in_date: e.target.value }))} /></FieldRow>
            <FieldRow label="Check-Out *"><Input type="date" value={form.check_out_date || ""} onChange={e => setForm((p: any) => ({ ...p, check_out_date: e.target.value }))} /></FieldRow>
            <FieldRow label="Adults"><Input type="number" value={form.adults || 1} onChange={e => setForm((p: any) => ({ ...p, adults: e.target.value }))} /></FieldRow>
            <FieldRow label="Children"><Input type="number" value={form.children || 0} onChange={e => setForm((p: any) => ({ ...p, children: e.target.value }))} /></FieldRow>
            <FieldRow label="Rate/Night"><Input type="number" value={form.rate_per_night || ""} onChange={e => setForm((p: any) => ({ ...p, rate_per_night: e.target.value }))} /></FieldRow>
            <FieldRow label="Total Amount"><Input type="number" value={form.total_amount || ""} onChange={e => setForm((p: any) => ({ ...p, total_amount: e.target.value }))} /></FieldRow>
            <FieldRow label="Advance Paid"><Input type="number" value={form.advance_paid || ""} onChange={e => setForm((p: any) => ({ ...p, advance_paid: e.target.value }))} /></FieldRow>
            <FieldRow label="Source">
              <Select value={form.source || "direct"} onValueChange={v => setForm((p: any) => ({ ...p, source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["direct", "booking.com", "airbnb", "makemytrip", "agoda", "walk-in"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <div className="col-span-2">
              <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2} /></FieldRow>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => saveMutation.mutate(form)} disabled={!form.guest_id || !form.room_id}>Save</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Check-in/out Tab ──────────────────────────────────────────────────────────
function CheckInOutTab() {
  const { currency_symbol: sym } = useTenantConfig();
  const { data: reservations = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/reservations"] });
  const { toast } = useToast();

  const checkinMutation = useMutation({
    mutationFn: (id: any) => apiRequest("POST", `/api/hotel/reservations/${id}/checkin`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hotel/reservations"] }); queryClient.invalidateQueries({ queryKey: ["/api/hotel/rooms"] }); queryClient.invalidateQueries({ queryKey: ["/api/hotel/stats"] }); toast({ title: "Checked In" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const checkoutMutation = useMutation({
    mutationFn: (id: any) => apiRequest("POST", `/api/hotel/reservations/${id}/checkout`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hotel/reservations"] }); queryClient.invalidateQueries({ queryKey: ["/api/hotel/rooms"] }); queryClient.invalidateQueries({ queryKey: ["/api/hotel/stats"] }); toast({ title: "Checked Out" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const arrivals = reservations.filter(r => r.status === 'confirmed');
  const inhouse = reservations.filter(r => r.status === 'checked_in');

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2"><LogIn className="h-4 w-4 text-green-600" />Arrivals ({arrivals.length})</h3>
        <div className="space-y-2">
          {arrivals.map(r => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">Room {r.room_number} · {r.check_in_date} → {r.check_out_date}</p>
                    <p className="text-xs text-muted-foreground">{r.adults} adult{r.adults > 1 ? "s" : ""}{r.children > 0 ? `, ${r.children} children` : ""}</p>
                  </div>
                  <Button size="sm" onClick={() => checkinMutation.mutate(r.id)}><LogIn className="h-3 w-3 mr-1" />Check In</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {arrivals.length === 0 && <p className="text-muted-foreground text-sm">No arrivals</p>}
        </div>
      </div>
      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2"><LogOut className="h-4 w-4 text-orange-600" />In-House ({inhouse.length})</h3>
        <div className="space-y-2">
          {inhouse.map(r => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.guest_name}</p>
                    <p className="text-xs text-muted-foreground">Room {r.room_number} · Due out: {r.check_out_date}</p>
                    <p className="text-xs text-muted-foreground">{sym}{fmt(r.total_amount)} total</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => checkoutMutation.mutate(r.id)}><LogOut className="h-3 w-3 mr-1" />Check Out</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {inhouse.length === 0 && <p className="text-muted-foreground text-sm">No guests in-house</p>}
        </div>
      </div>
    </div>
  );
}

// ── Folios Tab ────────────────────────────────────────────────────────────────
function FoliosTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({ items: [] });
  const [editing, setEditing] = useState<any>(null);

  const { data: folios = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/folios"] });
  const { data: guests = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/guests"] });
  const { data: rooms = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/rooms"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PUT", `/api/hotel/folios/${editing.id}`, data)
      : apiRequest("POST", "/api/hotel/folios", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hotel/folios"] }); queryClient.invalidateQueries({ queryKey: ["/api/hotel/stats"] }); setShowForm(false); setEditing(null); setForm({ items: [] }); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = folios.filter(f => f.guest_name?.toLowerCase().includes(search.toLowerCase()) || f.folio_number?.toLowerCase().includes(search.toLowerCase()));

  const addItem = () => setForm((p: any) => ({ ...p, items: [...(p.items || []), { description: "", quantity: 1, rate: 0, amount: 0, category: "room" }] }));
  const removeItem = (i: number) => setForm((p: any) => ({ ...p, items: p.items.filter((_: any, idx: number) => idx !== i) }));
  const updateItem = (i: number, field: string, val: any) => setForm((p: any) => {
  const { currency_symbol: sym } = useTenantConfig();
    const items = [...p.items];
    items[i] = { ...items[i], [field]: val };
    if (field === "quantity" || field === "rate") items[i].amount = (Number(items[i].quantity) || 0) * (Number(items[i].rate) || 0);
    return { ...p, items, total_amount: items.reduce((s: number, it: any) => s + Number(it.amount || 0), 0) };
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search folios…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => { setEditing(null); setForm({ items: [] }); setShowForm(true); }}><Plus className="h-4 w-4 mr-1" />New Folio</Button>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>{["Folio No", "Guest", "Room", "Total", "Paid", "Balance", "Status", "PDF"].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(f => (
              <tr key={f.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{f.folio_number}</td>
                <td className="px-3 py-2">{f.guest_name || "—"}</td>
                <td className="px-3 py-2">{f.room_number || "—"}</td>
                <td className="px-3 py-2">{sym}{fmt(f.total_amount)}</td>
                <td className="px-3 py-2">{sym}{fmt(f.paid_amount)}</td>
                <td className="px-3 py-2">{sym}{fmt(f.balance_amount)}</td>
                <td className="px-3 py-2"><Badge className={STATUS_COLORS[f.status] || ""}>{f.status}</Badge></td>
                <td className="px-3 py-2">
                  <Button size="sm" variant="ghost" onClick={() => window.open(`/api/hotel/enterprise/folios/${f.id}/pdf`, "_blank")} title="Download Folio PDF">
                    <FileText className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-4 text-center text-muted-foreground">No folios found</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Folio</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Guest">
              <Select value={form.guest_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, guest_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select guest" /></SelectTrigger>
                <SelectContent>{guests.map((g: any) => <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Room">
              <Select value={form.room_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, room_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>{rooms.map((r: any) => <SelectItem key={r.id} value={r.id.toString()}>{r.room_number}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium">Line Items</Label>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add</Button>
            </div>
            {(form.items || []).map((it: any, i: number) => (
              <div key={i} className="flex gap-2 mb-2">
                <Input className="flex-1" placeholder="Description" value={it.description} onChange={e => updateItem(i, "description", e.target.value)} />
                <Input className="w-16" type="number" placeholder="Qty" value={it.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} />
                <Input className="w-24" type="number" placeholder="Rate" value={it.rate} onChange={e => updateItem(i, "rate", e.target.value)} />
                <Input className="w-24" readOnly value={it.amount} />
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => removeItem(i)}><X className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FieldRow label="Total"><Input type="number" readOnly value={form.total_amount || 0} /></FieldRow>
            <FieldRow label="Paid"><Input type="number" value={form.paid_amount || ""} onChange={e => setForm((p: any) => ({ ...p, paid_amount: e.target.value }))} /></FieldRow>
            <FieldRow label="Payment Mode">
              <Select value={form.payment_mode || ""} onValueChange={v => setForm((p: any) => ({ ...p, payment_mode: v }))}>
                <SelectTrigger><SelectValue placeholder="Mode" /></SelectTrigger>
                <SelectContent>{["cash", "card", "upi", "bank_transfer"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => saveMutation.mutate(form)}>Save Folio</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Housekeeping Tab ──────────────────────────────────────────────────────────
function HousekeepingTab() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: tasks = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/housekeeping"] });
  const { data: rooms = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/rooms"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PUT", `/api/hotel/housekeeping/${editing.id}`, data)
      : apiRequest("POST", "/api/hotel/housekeeping", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hotel/housekeeping"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/hotel/housekeeping/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hotel/housekeeping"] }); toast({ title: "Deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openForm = (t?: any) => { setEditing(t || null); setForm(t ? { ...t } : { task_type: "cleaning", status: "pending" }); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Task</Button>
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
        {tasks.map((t: any) => (
          <Card key={t.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium">Room {t.room_number}</p>
                  <p className="text-sm text-muted-foreground capitalize">{t.task_type}</p>
                </div>
                <Badge className={STATUS_COLORS[t.status] || ""}>{t.status}</Badge>
              </div>
              {t.assigned_to && <p className="text-xs text-muted-foreground">Assigned: {t.assigned_to}</p>}
              {t.scheduled_date && <p className="text-xs text-muted-foreground">Date: {t.scheduled_date}</p>}
              <div className="flex gap-1 mt-3">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openForm(t)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" className="flex-1 text-red-600" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {tasks.length === 0 && <div className="col-span-full text-center py-8 text-muted-foreground">No tasks</div>}
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Task" : "Add Task"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <FieldRow label="Room *">
              <Select value={form.room_id?.toString() || ""} onValueChange={v => setForm((p: any) => ({ ...p, room_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>{rooms.map((r: any) => <SelectItem key={r.id} value={r.id.toString()}>{r.room_number}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Task Type">
              <Select value={form.task_type || "cleaning"} onValueChange={v => setForm((p: any) => ({ ...p, task_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["cleaning", "inspection", "maintenance", "turndown"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Assigned To"><Input value={form.assigned_to || ""} onChange={e => setForm((p: any) => ({ ...p, assigned_to: e.target.value }))} /></FieldRow>
            <FieldRow label="Scheduled Date"><Input type="date" value={form.scheduled_date || ""} onChange={e => setForm((p: any) => ({ ...p, scheduled_date: e.target.value }))} /></FieldRow>
            <FieldRow label="Status">
              <Select value={form.status || "pending"} onValueChange={v => setForm((p: any) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["pending", "in_progress", "completed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="Notes"><Textarea value={form.notes || ""} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} rows={2} /></FieldRow>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => saveMutation.mutate(form)} disabled={!form.room_id}>Save</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Guests Tab ────────────────────────────────────────────────────────────────
function GuestsTab() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const { data: guests = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/guests"] });

  const saveMutation = useMutation({
    mutationFn: (data: any) => editing
      ? apiRequest("PUT", `/api/hotel/guests/${editing.id}`, data)
      : apiRequest("POST", "/api/hotel/guests", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hotel/guests"] }); setShowForm(false); setEditing(null); setForm({}); toast({ title: "Saved" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: any) => apiRequest("DELETE", `/api/hotel/guests/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/hotel/guests"] }); toast({ title: "Deleted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = guests.filter(g => g.name?.toLowerCase().includes(search.toLowerCase()) || g.phone?.includes(search));
  const openForm = (g?: any) => { setEditing(g || null); setForm(g ? { ...g } : {}); setShowForm(true); };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search guests…" className="pl-8" value={search} onChange={e => setSearch(e.target.value)} /></div>
        <Button onClick={() => openForm()}><Plus className="h-4 w-4 mr-1" />Add Guest</Button>
      </div>
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>{["Code", "Name", "Phone", "Email", "ID Type", "Nationality", ""].map(h => <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(g => (
              <tr key={g.id} className="border-t hover:bg-muted/30">
                <td className="px-3 py-2 font-mono text-xs">{g.guest_code}</td>
                <td className="px-3 py-2 font-medium">{g.name}</td>
                <td className="px-3 py-2">{g.phone || "—"}</td>
                <td className="px-3 py-2">{g.email || "—"}</td>
                <td className="px-3 py-2">{g.id_type ? `${g.id_type}: ${g.id_number}` : "—"}</td>
                <td className="px-3 py-2">{g.nationality || "—"}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openForm(g)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => deleteMutation.mutate(g.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">No guests</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={showForm} onOpenChange={v => { if (!v) { setShowForm(false); setEditing(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Guest" : "Add Guest"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><FieldRow label="Name *"><Input value={form.name || ""} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} /></FieldRow></div>
            <FieldRow label="Phone"><Input value={form.phone || ""} onChange={e => setForm((p: any) => ({ ...p, phone: e.target.value }))} /></FieldRow>
            <FieldRow label="Email"><Input value={form.email || ""} onChange={e => setForm((p: any) => ({ ...p, email: e.target.value }))} /></FieldRow>
            <FieldRow label="ID Type">
              <Select value={form.id_type || ""} onValueChange={v => setForm((p: any) => ({ ...p, id_type: v }))}>
                <SelectTrigger><SelectValue placeholder="ID Type" /></SelectTrigger>
                <SelectContent>{["Aadhaar", "Passport", "PAN", "Driving License", "Voter ID"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </FieldRow>
            <FieldRow label="ID Number"><Input value={form.id_number || ""} onChange={e => setForm((p: any) => ({ ...p, id_number: e.target.value }))} /></FieldRow>
            <FieldRow label="Nationality"><Input value={form.nationality || ""} onChange={e => setForm((p: any) => ({ ...p, nationality: e.target.value }))} /></FieldRow>
            <div className="col-span-2"><FieldRow label="Address"><Textarea value={form.address || ""} onChange={e => setForm((p: any) => ({ ...p, address: e.target.value }))} rows={2} /></FieldRow></div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => saveMutation.mutate(form)} disabled={!form.name}>Save</Button>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}><X className="h-4 w-4" /></Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Channel Manager Tab ───────────────────────────────────────────────────────
function ChannelManagerTab() {
  const { toast } = useToast();
  const [syncing, setSyncing] = useState(false);
  const { data: rates = [], refetch } = useQuery<any[]>({ queryKey: ["/api/hotel/enterprise/channels/rates"] });

  const handleSync = async () => {
  const { currency_symbol: sym } = useTenantConfig();
    setSyncing(true);
    try {
      const r = await apiRequest("POST", "/api/hotel/enterprise/channels/sync");
      toast({ title: "Sync Complete", description: `${(r as any).synced ?? 0} rates synced from ${(r as any).source ?? ""}` });
      refetch();
    } catch (e: any) {
      toast({ title: "Sync Failed", description: e.message, variant: "destructive" });
    } finally { setSyncing(false); }
  };

  const channels = [...new Set(rates.map((r: any) => r.channel))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">OTA Channel Rates</h2>
        <Button onClick={handleSync} disabled={syncing} size="sm">
          <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Rates"}
        </Button>
      </div>

      {channels.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No channel rates found. Click "Sync Rates" to fetch.
          </CardContent>
        </Card>
      ) : (
        channels.map(channel => (
          <Card key={channel}>
            <CardHeader><CardTitle className="text-base">{channel}</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      {["Room Type", "Date", "Rate", "Available Rooms", "Last Synced"].map(h =>
                        <th key={h} className="text-left px-3 py-2 font-medium">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rates.filter((r: any) => r.channel === channel).map((r: any, i: number) => (
                      <tr key={i} className="border-t hover:bg-muted/30">
                        <td className="px-3 py-2">{r.room_type_name || r.room_type_id || "—"}</td>
                        <td className="px-3 py-2">{r.rate_date ? new Date(r.rate_date).toLocaleDateString("en-IN") : "—"}</td>
                        <td className="px-3 py-2">{sym}{Number(r.rate_amount || 0).toLocaleString()}</td>
                        <td className="px-3 py-2">{r.available_rooms}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {r.last_synced ? new Date(r.last_synced).toLocaleString("en-IN") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HotelPage() {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
          <BedDouble className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Hotel ERP</h1>
          <p className="text-sm text-muted-foreground">Property management system</p>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="guests">Guests</TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          <TabsTrigger value="checkinout">Check-in/out</TabsTrigger>
          <TabsTrigger value="folios">Folios</TabsTrigger>
          <TabsTrigger value="housekeeping">Housekeeping</TabsTrigger>
          <TabsTrigger value="channels">Channel Manager</TabsTrigger>
        </TabsList>
        <TabsContent value="overview"><OverviewTab /></TabsContent>
        <TabsContent value="rooms"><RoomsTab /></TabsContent>
        <TabsContent value="guests"><GuestsTab /></TabsContent>
        <TabsContent value="reservations"><ReservationsTab /></TabsContent>
        <TabsContent value="checkinout"><CheckInOutTab /></TabsContent>
        <TabsContent value="folios"><FoliosTab /></TabsContent>
        <TabsContent value="housekeeping"><HousekeepingTab /></TabsContent>
        <TabsContent value="channels"><ChannelManagerTab /></TabsContent>
      </Tabs>
    </div>
  );
}
