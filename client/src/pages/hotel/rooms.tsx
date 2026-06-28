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

export default function HotelRoomsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ room_number: "", floor: "", room_type: "", capacity: "", base_rate: "" });

  const { data: rooms = [] } = useQuery({ queryKey: ["hotel-rooms"], queryFn: () => api("GET", "/api/hotel/rooms") });

  const addRoom = useMutation({
    mutationFn: () => api("POST", "/api/hotel/rooms", { ...form, floor: Number(form.floor), capacity: Number(form.capacity), base_rate: Number(form.base_rate) }),
    onSuccess: () => { toast({ title: "Room added" }); qc.invalidateQueries({ queryKey: ["hotel-rooms"] }); setForm({ room_number: "", floor: "", room_type: "", capacity: "", base_rate: "" }); }
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api("PUT", `/api/hotel/rooms/${id}/status`, { status }),
    onSuccess: () => { toast({ title: "Status updated" }); qc.invalidateQueries({ queryKey: ["hotel-rooms"] }); }
  });

  const roomList: any[] = Array.isArray(rooms) ? rooms : (rooms as any)?.rooms || [];

  const types = ["standard", "deluxe", "suite"];
  const typeSummary = types.map(t => ({ type: t, count: roomList.filter(r => r.room_type === t).length }));

  const statusBadge = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "available") return "default";
    if (s === "occupied") return "secondary";
    if (s === "maintenance" || s === "cleaning") return "destructive";
    return "outline";
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Room Management</h1>
      <div className="grid grid-cols-3 gap-4">
        {typeSummary.map(t => (
          <Card key={t.type}><CardContent className="pt-4"><div className="text-2xl font-bold">{t.count}</div><div className="text-gray-500 text-sm capitalize">{t.type} Rooms</div></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Add Room</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Room Number" value={form.room_number} onChange={e => setForm(p => ({ ...p, room_number: e.target.value }))} className="w-36" />
            <Input placeholder="Floor" type="number" value={form.floor} onChange={e => setForm(p => ({ ...p, floor: e.target.value }))} className="w-24" />
            <Select value={form.room_type} onValueChange={v => setForm(p => ({ ...p, room_type: v }))}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Room Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="deluxe">Deluxe</SelectItem>
                <SelectItem value="suite">Suite</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Capacity" type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} className="w-24" />
            <Input placeholder="Base Rate" type="number" value={form.base_rate} onChange={e => setForm(p => ({ ...p, base_rate: e.target.value }))} className="w-32" />
            <Button onClick={() => addRoom.mutate()}>Add Room</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>All Rooms</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room No</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Rate/Night</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Cleaned</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roomList.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-bold">{r.room_number}</TableCell>
                  <TableCell>{r.floor}</TableCell>
                  <TableCell className="capitalize">{r.room_type}</TableCell>
                  <TableCell>{r.capacity}</TableCell>
                  <TableCell>Rs {fmt(r.base_rate)}</TableCell>
                  <TableCell><Badge variant={statusBadge(r.status)}>{r.status}</Badge></TableCell>
                  <TableCell>{r.last_cleaned ? new Date(r.last_cleaned).toLocaleDateString() : "-"}</TableCell>
                  <TableCell>
                    <Select onValueChange={v => updateStatus.mutate({ id: r.id, status: v })}>
                      <SelectTrigger className="w-32 h-7 text-xs"><SelectValue placeholder="Change Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="cleaning">Cleaning</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
