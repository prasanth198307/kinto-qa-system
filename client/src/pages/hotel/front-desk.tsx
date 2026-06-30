import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BedDouble, LogIn, LogOut, Users, DoorOpen } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

const ROOM_STATUS_COLORS: Record<string, string> = {
  available: "bg-green-100 border-green-400 text-green-800",
  occupied: "bg-red-100 border-red-400 text-red-800",
  dirty: "bg-yellow-100 border-yellow-400 text-yellow-800",
  maintenance: "bg-gray-200 border-gray-400 text-gray-700",
  checkout: "bg-blue-100 border-blue-400 text-blue-800",
};

const STATUS_BADGE: Record<string, string> = {
  available: "bg-green-500",
  occupied: "bg-red-500",
  dirty: "bg-yellow-500",
  maintenance: "bg-gray-500",
  checkout: "bg-blue-500",
};

function RoomCard({ room }: { room: any }) {
  const cls = ROOM_STATUS_COLORS[room.status] || "bg-gray-100 border-gray-300";
  return (
    <div className={`border rounded p-2 text-xs flex flex-col gap-0.5 ${cls}`}>
      <div className="font-bold text-sm">{room.room_number}</div>
      <div className="truncate text-[10px] opacity-70">{room.room_type_name || room.room_type_id}</div>
      {room.guest_name && <div className="truncate font-medium">{room.guest_name}</div>}
      <span className={`mt-1 self-start text-white text-[9px] px-1.5 py-0.5 rounded-full ${STATUS_BADGE[room.status] || "bg-gray-400"}`}>{room.status}</span>
    </div>
  );
}

function KpiCards({ kpi }: { kpi: any }) {
  const cards = [
    { label: "Today's Arrivals", value: kpi.arrivals_today ?? 0, icon: <LogIn size={18} /> },
    { label: "Today's Departures", value: kpi.departures_today ?? 0, icon: <LogOut size={18} /> },
    { label: "Occupancy %", value: `${fmt(kpi.occupancy_pct)}%`, icon: <Users size={18} /> },
    { label: "Available Rooms", value: kpi.available_rooms ?? 0, icon: <DoorOpen size={18} /> },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map(c => (
        <Card key={c.label}>
          <CardContent className="pt-4 flex items-center gap-3">
            <div className="text-gray-400">{c.icon}</div>
            <div>
              <div className="text-xs text-gray-500">{c.label}</div>
              <div className="text-2xl font-bold">{c.value}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ArrivalsTable({ reservations, onCheckIn }: { reservations: any[]; onCheckIn: (id: number) => void }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><LogIn size={16} /> Today's Arrivals</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Res #</TableHead><TableHead>Guest</TableHead><TableHead>Room Type</TableHead>
              <TableHead>Pax</TableHead><TableHead className="text-right">Rate/Night</TableHead>
              <TableHead className="text-right">Advance</TableHead><TableHead className="text-right">Balance</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-6">No arrivals today</TableCell></TableRow>}
            {reservations.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.reservation_number}</TableCell>
                <TableCell>{r.guest_name}</TableCell>
                <TableCell>{r.room_type_name}</TableCell>
                <TableCell>{r.adults}A {r.children ? `${r.children}C` : ""}</TableCell>
                <TableCell className="text-right">₹{fmt(r.rate_per_night)}</TableCell>
                <TableCell className="text-right">₹{fmt(r.advance_paid)}</TableCell>
                <TableCell className="text-right">₹{fmt(r.balance_amount)}</TableCell>
                <TableCell><Button size="sm" onClick={() => onCheckIn(r.id)}>Check In</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DeparturesTable({ reservations, onCheckOut }: { reservations: any[]; onCheckOut: (id: number) => void }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><LogOut size={16} /> Today's Departures</CardTitle></CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Res #</TableHead><TableHead>Guest</TableHead><TableHead>Room</TableHead>
              <TableHead>Room Type</TableHead><TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Balance</TableHead><TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reservations.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-gray-400 py-6">No departures today</TableCell></TableRow>}
            {reservations.map(r => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.reservation_number}</TableCell>
                <TableCell>{r.guest_name}</TableCell>
                <TableCell>{r.room_number}</TableCell>
                <TableCell>{r.room_type_name}</TableCell>
                <TableCell className="text-right">₹{fmt(r.total_amount)}</TableCell>
                <TableCell className="text-right">₹{fmt(r.balance_amount)}</TableCell>
                <TableCell><Button size="sm" variant="outline" onClick={() => onCheckOut(r.id)}>Check Out</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function FrontDeskPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: kpi = {} } = useQuery({ queryKey: ["/api/hotel/kpi"], queryFn: () => api("GET", "/api/hotel/kpi") });
  const { data: rooms = [] } = useQuery({ queryKey: ["/api/hotel/rooms"], queryFn: () => api("GET", "/api/hotel/rooms") });
  const { data: arrivals = [] } = useQuery({ queryKey: ["/api/hotel/reservations", "confirmed", today], queryFn: () => api("GET", `/api/hotel/reservations?status=confirmed&date=${today}`) });
  const { data: departures = [] } = useQuery({ queryKey: ["/api/hotel/reservations", "checked_in"], queryFn: () => api("GET", "/api/hotel/reservations?status=checked_in") });

  const checkIn = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/hotel/reservations/${id}`, { status: "checked_in", actual_check_in: today }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hotel/reservations"] }); qc.invalidateQueries({ queryKey: ["/api/hotel/kpi"] }); qc.invalidateQueries({ queryKey: ["/api/hotel/rooms"] }); },
  });

  const checkOut = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/hotel/reservations/${id}/checkout`, { actual_check_out: today }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hotel/reservations"] }); qc.invalidateQueries({ queryKey: ["/api/hotel/kpi"] }); qc.invalidateQueries({ queryKey: ["/api/hotel/rooms"] }); },
  });

  const byType: Record<string, number> = {};
  (rooms as any[]).forEach((r: any) => { byType[r.room_type_name || r.room_type_id] = (byType[r.room_type_name || r.room_type_id] || 0) + 1; });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <BedDouble size={24} />
        <h1 className="text-2xl font-bold">Front Desk</h1>
        <Badge variant="outline" className="ml-auto">{today}</Badge>
      </div>

      <KpiCards kpi={kpi} />

      <div className="flex gap-6">
        <div className="flex-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Room Status Grid</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 text-[10px] mb-3">
                {Object.entries(STATUS_BADGE).map(([s, cls]) => <span key={s} className={`${cls} text-white px-2 py-0.5 rounded-full`}>{s}</span>)}
              </div>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                {(rooms as any[]).map((r: any) => <RoomCard key={r.id} room={r} />)}
                {rooms.length === 0 && <div className="col-span-10 text-center text-gray-400 py-8">No rooms configured</div>}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-52 shrink-0">
          <Card>
            <CardHeader><CardTitle className="text-sm">Rooms by Type</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(byType).map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate">{type}</span>
                  <span className="font-semibold ml-2">{count}</span>
                </div>
              ))}
              {Object.keys(byType).length === 0 && <div className="text-xs text-gray-400">No data</div>}
            </CardContent>
          </Card>
        </div>
      </div>

      <ArrivalsTable reservations={arrivals as any[]} onCheckIn={id => checkIn.mutate(id)} />
      <DeparturesTable reservations={departures as any[]} onCheckOut={id => checkOut.mutate(id)} />
    </div>
  );
}
