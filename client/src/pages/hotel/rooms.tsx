import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BedDouble, Plus, X } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const STATUS_COLOR: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  occupied: "bg-red-100 text-red-800",
  maintenance: "bg-yellow-100 text-yellow-800",
  housekeeping: "bg-blue-100 text-blue-800",
  reserved: "bg-purple-100 text-purple-800",
};

const EMPTY_TYPE = { name: "", description: "", max_occupancy: "2", amenities: "" };
const EMPTY_ROOM = { room_number: "", room_type_id: "", floor: "", view: "" };

export default function HotelRoomsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"rooms" | "types">("rooms");
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [editingType, setEditingType] = useState<any>(null);
  const [roomForm, setRoomForm] = useState({ ...EMPTY_ROOM });
  const [typeForm, setTypeForm] = useState({ ...EMPTY_TYPE });
  const [statusFilter, setStatusFilter] = useState("");

  const { data: rooms = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/rooms"], queryFn: () => api("GET", "/api/hotel/rooms") });
  const { data: roomTypes = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/room-types"], queryFn: () => api("GET", "/api/hotel/room-types") });

  const createRoom = useMutation({ mutationFn: (b: any) => api("POST", "/api/hotel/rooms", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hotel/rooms"] }); setShowRoomForm(false); setRoomForm({ ...EMPTY_ROOM }); } });
  const updateRoom = useMutation({ mutationFn: ({ id, b }: any) => api("PUT", `/api/hotel/rooms/${id}`, b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hotel/rooms"] }); setEditingRoom(null); setShowRoomForm(false); } });
  const deleteRoom = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/hotel/rooms/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/rooms"] }) });
  const createType = useMutation({ mutationFn: (b: any) => api("POST", "/api/hotel/room-types", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hotel/room-types"] }); setShowTypeForm(false); setTypeForm({ ...EMPTY_TYPE }); } });
  const updateType = useMutation({ mutationFn: ({ id, b }: any) => api("PUT", `/api/hotel/room-types/${id}`, b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hotel/room-types"] }); setEditingType(null); setShowTypeForm(false); } });
  const deleteType = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/hotel/room-types/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/room-types"] }) });

  const rf = (k: string, v: string) => setRoomForm(p => ({ ...p, [k]: v }));
  const tf = (k: string, v: string) => setTypeForm(p => ({ ...p, [k]: v }));

  const roomsArr = Array.isArray(rooms) ? rooms : [];
  const typesArr = Array.isArray(roomTypes) ? roomTypes : [];
  const filtered = statusFilter ? roomsArr.filter((r: any) => r.status === statusFilter) : roomsArr;

  const openEditRoom = (r: any) => { setEditingRoom(r); setRoomForm({ room_number: r.room_number || "", room_type_id: (r.room_type_id || "").toString(), floor: r.floor || "", view: r.view || "" }); setShowRoomForm(true); };
  const openEditType = (t: any) => { setEditingType(t); setTypeForm({ name: t.name || "", description: t.description || "", max_occupancy: (t.max_occupancy || 2).toString(), amenities: t.amenities || "" }); setShowTypeForm(true); };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><BedDouble className="w-6 h-6 text-blue-600" />Room Management</h1>

      <div className="grid grid-cols-5 gap-3">
        {["available", "occupied", "maintenance", "housekeeping", "reserved"].map(s => (
          <Card key={s} className="cursor-pointer" onClick={() => setStatusFilter(statusFilter === s ? "" : s)}>
            <CardContent className="pt-3">
              <p className="text-xs text-gray-500 capitalize">{s}</p>
              <p className="text-2xl font-bold">{roomsArr.filter((r: any) => r.status === s).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "rooms" ? "default" : "outline"} onClick={() => setTab("rooms")}>Rooms ({roomsArr.length})</Button>
        <Button variant={tab === "types" ? "default" : "outline"} onClick={() => setTab("types")}>Room Types ({typesArr.length})</Button>
      </div>

      {tab === "rooms" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                {["available", "occupied", "maintenance", "housekeeping", "reserved"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => { setEditingRoom(null); setRoomForm({ ...EMPTY_ROOM }); setShowRoomForm(true); }}><Plus className="w-4 h-4 mr-1" />Add Room</Button>
          </div>

          {showRoomForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{editingRoom ? "Edit Room" : "Add Room"}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => { setShowRoomForm(false); setEditingRoom(null); }}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="grid grid-cols-4 gap-3">
                <div><Label>Room Number</Label><Input value={roomForm.room_number} onChange={e => rf("room_number", e.target.value)} placeholder="101, 201A..." /></div>
                <div><Label>Room Type</Label>
                  <Select value={roomForm.room_type_id} onValueChange={v => rf("room_type_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{typesArr.map((t: any) => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Floor</Label><Input value={roomForm.floor} onChange={e => rf("floor", e.target.value)} placeholder="1, 2, Ground..." /></div>
                <div><Label>View</Label><Input value={roomForm.view} onChange={e => rf("view", e.target.value)} placeholder="Sea view, Garden..." /></div>
                <div className="col-span-4 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowRoomForm(false); setEditingRoom(null); }}>Cancel</Button>
                  <Button onClick={() => { const b = { ...roomForm, room_type_id: parseInt(roomForm.room_type_id) }; editingRoom ? updateRoom.mutate({ id: editingRoom.id, b }) : createRoom.mutate(b); }}>{editingRoom ? "Save" : "Add"}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-4 gap-3">
            {filtered.map((r: any) => (
              <div key={r.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-bold text-lg">{r.room_number}</p>
                  <Badge className={STATUS_COLOR[r.status] ?? "bg-gray-100"}>{r.status}</Badge>
                </div>
                <p className="text-xs text-gray-500">{r.room_type_name ?? `Type ${r.room_type_id}`}</p>
                {r.floor && <p className="text-xs text-gray-400">Floor: {r.floor}</p>}
                {r.view && <p className="text-xs text-gray-400">{r.view}</p>}
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="outline" className="text-xs h-6" onClick={() => openEditRoom(r)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-xs h-6 text-red-500" onClick={() => deleteRoom.mutate(r.id)}>Del</Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-gray-400 text-sm col-span-4 py-8 text-center">No rooms found.</p>}
          </div>
        </div>
      )}

      {tab === "types" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingType(null); setTypeForm({ ...EMPTY_TYPE }); setShowTypeForm(true); }}><Plus className="w-4 h-4 mr-1" />Add Room Type</Button>
          </div>

          {showTypeForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{editingType ? "Edit Room Type" : "Add Room Type"}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => { setShowTypeForm(false); setEditingType(null); }}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div><Label>Type Name</Label><Input value={typeForm.name} onChange={e => tf("name", e.target.value)} placeholder="Deluxe, Suite, Standard..." /></div>
                <div><Label>Max Occupancy</Label><Input type="number" value={typeForm.max_occupancy} onChange={e => tf("max_occupancy", e.target.value)} /></div>
                <div><Label>Amenities</Label><Input value={typeForm.amenities} onChange={e => tf("amenities", e.target.value)} placeholder="AC, TV, WiFi, Bathtub..." /></div>
                <div className="col-span-3"><Label>Description</Label><Input value={typeForm.description} onChange={e => tf("description", e.target.value)} /></div>
                <div className="col-span-3 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => { setShowTypeForm(false); setEditingType(null); }}>Cancel</Button>
                  <Button onClick={() => { const b = { ...typeForm, max_occupancy: parseInt(typeForm.max_occupancy || "2") }; editingType ? updateType.mutate({ id: editingType.id, b }) : createType.mutate(b); }}>{editingType ? "Save" : "Add"}</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-3 gap-3">
            {typesArr.map((t: any) => (
              <Card key={t.id}>
                <CardContent className="pt-4 flex items-start justify-between">
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-gray-500">Max occupancy: {t.max_occupancy}</p>
                    {t.amenities && <p className="text-xs text-gray-400 mt-1">{t.amenities}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEditType(t)}>Edit</Button>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteType.mutate(t.id)}>Del</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {typesArr.length === 0 && <p className="text-gray-400 text-sm col-span-3 py-8 text-center">No room types defined.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
