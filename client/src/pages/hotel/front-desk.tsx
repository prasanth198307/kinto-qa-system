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

export default function HotelFrontDeskPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [checkinRoom, setCheckinRoom] = useState<any>(null);
  const [form, setForm] = useState({ guest_name: "", id_type: "", id_number: "", nights: "" });

  const { data: rooms = [] } = useQuery({ queryKey: ["hotel-rooms"], queryFn: () => api("GET", "/api/hotel/rooms") });

  const checkin = useMutation({
    mutationFn: () => api("POST", "/api/hotel/checkin", { ...form, room_id: checkinRoom?.id, nights: Number(form.nights) }),
    onSuccess: () => { toast({ title: "Check-in successful" }); qc.invalidateQueries({ queryKey: ["hotel-rooms"] }); setCheckinRoom(null); setForm({ guest_name: "", id_type: "", id_number: "", nights: "" }); }
  });

  const roomList: any[] = Array.isArray(rooms) ? rooms : (rooms as any)?.rooms || [];

  const statusColor = (s: string) =>
    s === "available" ? "bg-green-100 border-green-400" :
    s === "occupied" ? "bg-yellow-100 border-yellow-400" :
    s === "reserved" ? "bg-blue-100 border-blue-400" :
    "bg-red-100 border-red-400";

  const stats = {
    total: roomList.length,
    occupied: roomList.filter(r => r.status === "occupied").length,
    available: roomList.filter(r => r.status === "available").length,
  };

  const floors = [...new Set(roomList.map(r => r.floor))].sort();

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Front Desk</h1>
      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{stats.total}</div><div className="text-gray-500 text-sm">Total Rooms</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{stats.occupied}</div><div className="text-gray-500 text-sm">Occupied</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{stats.available}</div><div className="text-gray-500 text-sm">Available</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">-</div><div className="text-gray-500 text-sm">Revenue Today</div></CardContent></Card>
      </div>
      {checkinRoom && (
        <Card className="border-blue-300">
          <CardHeader><CardTitle>Check-in Room {checkinRoom.room_number}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3 flex-wrap">
              <Input placeholder="Guest Name" value={form.guest_name} onChange={e => setForm(p => ({ ...p, guest_name: e.target.value }))} className="w-40" />
              <Select value={form.id_type} onValueChange={v => setForm(p => ({ ...p, id_type: v }))}>
                <SelectTrigger className="w-36"><SelectValue placeholder="ID Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aadhaar">Aadhaar</SelectItem>
                  <SelectItem value="passport">Passport</SelectItem>
                  <SelectItem value="dl">Driving License</SelectItem>
                  <SelectItem value="voter">Voter ID</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="ID Number" value={form.id_number} onChange={e => setForm(p => ({ ...p, id_number: e.target.value }))} className="w-40" />
              <Input placeholder="Nights" type="number" value={form.nights} onChange={e => setForm(p => ({ ...p, nights: e.target.value }))} className="w-24" />
              <Button onClick={() => checkin.mutate()}>Confirm Check-in</Button>
              <Button variant="outline" onClick={() => setCheckinRoom(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="space-y-4">
        {floors.map(floor => (
          <div key={floor}>
            <div className="text-sm font-medium text-gray-500 mb-2">Floor {floor}</div>
            <div className="grid grid-cols-8 gap-2">
              {roomList.filter(r => r.floor === floor).map((room: any) => (
                <div key={room.id} className={`border-2 rounded-lg p-2 text-center cursor-pointer ${statusColor(room.status)}`}
                  onClick={() => room.status === "available" && setCheckinRoom(room)}>
                  <div className="font-bold text-sm">{room.room_number}</div>
                  <div className="text-xs">{room.room_type}</div>
                  <div className="text-xs text-gray-500">{room.status}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 text-sm font-medium">
        <span className="text-green-600">Green = Available</span>
        <span className="text-yellow-600">Yellow = Occupied</span>
        <span className="text-blue-600">Blue = Reserved</span>
        <span className="text-red-600">Red = Maintenance</span>
      </div>
    </div>
  );
}
