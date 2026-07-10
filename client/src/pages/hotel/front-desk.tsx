import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BedDouble, CalendarCheck, CalendarX, TrendingUp, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const STATUS_COLOR: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-green-100 text-green-800",
  checked_out: "bg-gray-100 text-gray-600",
};

export default function HotelFrontDeskPage() {
  const qc = useQueryClient();
  const [, setLocation] = useLocation();
  const today = new Date().toISOString().slice(0, 10);

  const { data: stats } = useQuery({ queryKey: ["/api/hotel/stats"], queryFn: () => api("GET", "/api/hotel/stats") });
  const { data: reservations = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/reservations"], queryFn: () => api("GET", "/api/hotel/reservations") });
  const { data: rooms = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/rooms"], queryFn: () => api("GET", "/api/hotel/rooms") });

  const checkin = useMutation({ mutationFn: (id: number) => api("POST", `/api/hotel/reservations/${id}/checkin`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/reservations"] }) });
  const checkout = useMutation({ mutationFn: (id: number) => api("POST", `/api/hotel/reservations/${id}/checkout`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/reservations"] }) });

  const arr = Array.isArray(reservations) ? reservations : [];
  const roomsArr = Array.isArray(rooms) ? rooms : [];
  const todayArrivals = arr.filter((r: any) => r.check_in_date?.slice(0, 10) === today && r.status === "confirmed");
  const todayDepartures = arr.filter((r: any) => r.check_out_date?.slice(0, 10) === today && r.status === "checked_in");
  const inHouse = arr.filter((r: any) => r.status === "checked_in");
  const totalRooms = stats?.totalRooms ?? roomsArr.length;
  const availRooms = stats?.availableRooms ?? roomsArr.filter((r: any) => r.status === "available").length;
  const occupancyPct = totalRooms > 0 ? Math.round(((totalRooms - availRooms) / totalRooms) * 100) : 0;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Front Desk</h1>
      <p className="text-gray-500">{new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-3"><BedDouble className="w-8 h-8 text-blue-500" /><div><p className="text-xs text-gray-500">Available Rooms</p><p className="text-2xl font-bold text-green-600">{availRooms}</p><p className="text-xs text-gray-400">of {totalRooms} total</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><CalendarCheck className="w-8 h-8 text-green-500" /><div><p className="text-xs text-gray-500">Today's Arrivals</p><p className="text-2xl font-bold text-green-600">{todayArrivals.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><CalendarX className="w-8 h-8 text-orange-500" /><div><p className="text-xs text-gray-500">Today's Departures</p><p className="text-2xl font-bold text-orange-600">{todayDepartures.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-3"><TrendingUp className="w-8 h-8 text-purple-500" /><div><p className="text-xs text-gray-500">Occupancy</p><p className="text-2xl font-bold">{occupancyPct}%</p></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base text-green-700">Arrivals Today ({todayArrivals.length})</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setLocation("/hotel/checkin")}>Manage <ArrowRight className="w-3 h-3 ml-1" /></Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {todayArrivals.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <p className="font-medium text-sm">{r.guest_name ?? `Guest #${r.guest_id}`}</p>
                  <p className="text-xs text-gray-500">Room {r.room_number ?? r.room_id} · {r.adults ?? 1} adults</p>
                </div>
                <Button size="sm" onClick={() => checkin.mutate(r.id)}>Check In</Button>
              </div>
            ))}
            {todayArrivals.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No arrivals today.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base text-orange-700">Departures Today ({todayDepartures.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {todayDepartures.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <p className="font-medium text-sm">{r.guest_name ?? `Guest #${r.guest_id}`}</p>
                  <p className="text-xs text-gray-500">Room {r.room_number ?? r.room_id} · ₹{Number(r.total_amount ?? 0).toLocaleString("en-IN")}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setLocation("/hotel/folio")}>Folio</Button>
                  <Button size="sm" onClick={() => checkout.mutate(r.id)}>Check Out</Button>
                </div>
              </div>
            ))}
            {todayDepartures.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No departures today.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">In-House Guests ({inHouse.length})</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm border-collapse">
            <thead><tr className="bg-gray-50">{["Guest", "Room", "Check-in", "Check-out", "Status", "Actions"].map(h => <th key={h} className="text-left p-2 border">{h}</th>)}</tr></thead>
            <tbody>
              {inHouse.map((r: any) => (
                <tr key={r.id} className="border-b">
                  <td className="p-2 font-medium">{r.guest_name ?? `Guest #${r.guest_id}`}</td>
                  <td className="p-2">{r.room_number ?? `Room ${r.room_id}`}</td>
                  <td className="p-2">{r.check_in_date?.slice(0, 10)}</td>
                  <td className="p-2">{r.check_out_date?.slice(0, 10)}</td>
                  <td className="p-2"><Badge className={STATUS_COLOR[r.status] ?? "bg-gray-100"}>{r.status?.replace("_", " ")}</Badge></td>
                  <td className="p-2"><Button size="sm" onClick={() => checkout.mutate(r.id)}>Check Out</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {inHouse.length === 0 && <p className="text-center text-gray-400 py-6">No in-house guests.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Room Status Grid</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-8 gap-2">
            {roomsArr.map((r: any) => (
              <div key={r.id} className={`border-2 rounded p-2 text-center text-xs ${r.status === "available" ? "border-green-400 bg-green-50" : r.status === "occupied" ? "border-red-400 bg-red-50" : r.status === "maintenance" ? "border-yellow-400 bg-yellow-50" : "border-blue-300 bg-blue-50"}`}>
                <p className="font-bold">{r.room_number}</p>
                <p className="text-gray-500 capitalize">{r.status}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
