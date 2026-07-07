import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Home } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

export default function HostelPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"rooms" | "allotments">("rooms");
  const [showForm, setShowForm] = useState(false);
  const [roomForm, setRoomForm] = useState({ room_no: "", block: "", capacity: "4", room_type: "shared" });
  const [allotForm, setAllotForm] = useState({ student_id: "", room_id: "", allotted_date: new Date().toISOString().slice(0,10) });

  const { data: rooms = [] } = useQuery<any[]>({ queryKey: ["/api/education/hostel/rooms"], queryFn: () => api("GET", "/api/education/hostel/rooms") });
  const { data: allotments = [] } = useQuery<any[]>({ queryKey: ["/api/education/hostel/allotments"], queryFn: () => api("GET", "/api/education/hostel/allotments") });
  const { data: students = [] } = useQuery<any[]>({ queryKey: ["/api/education/students"], queryFn: () => api("GET", "/api/education/students") });

  const createRoom = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/hostel/rooms", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/hostel/rooms"] }); setShowForm(false); } });
  const allot = useMutation({ mutationFn: (b: any) => api("POST", "/api/education/hostel/allot", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/hostel/allotments"] }); qc.invalidateQueries({ queryKey: ["/api/education/hostel/rooms"] }); setShowForm(false); } });

  const roomArr = Array.isArray(rooms) ? rooms : [];
  const alotArr = Array.isArray(allotments) ? allotments : [];
  const stdArr = Array.isArray(students) ? students : [];

  const occupied = roomArr.reduce((s: number, r: any) => s + (r.occupied ?? 0), 0);
  const totalCap = roomArr.reduce((s: number, r: any) => s + (r.capacity ?? 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hostel Management</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />{tab === "rooms" ? "Add Room" : "Allot Room"}</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex gap-2 items-center"><Home className="w-6 h-6 text-blue-500" /><div><p className="text-sm text-gray-500">Total Rooms</p><p className="text-xl font-bold">{roomArr.length}</p></div></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Occupancy</p><p className="text-xl font-bold">{occupied}/{totalCap}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-sm text-gray-500">Vacant Beds</p><p className="text-xl font-bold text-green-600">{totalCap - occupied}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 border-b pb-1">
        {(["rooms","allotments"] as const).map(t => <button key={t} onClick={() => { setTab(t); setShowForm(false); }} className={`px-4 py-1.5 text-sm font-medium rounded-t ${tab === t ? "bg-white border border-b-white -mb-px text-blue-600" : "text-gray-500"}`}>{t === "rooms" ? "Rooms" : "Allotments"}</button>)}
      </div>

      {showForm && tab === "rooms" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">New Room</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-4 gap-3">
            <div><Label>Room No</Label><Input value={roomForm.room_no} onChange={e => setRoomForm(p => ({ ...p, room_no: e.target.value }))} /></div>
            <div><Label>Block</Label><Input value={roomForm.block} onChange={e => setRoomForm(p => ({ ...p, block: e.target.value }))} /></div>
            <div><Label>Capacity</Label><Input type="number" value={roomForm.capacity} onChange={e => setRoomForm(p => ({ ...p, capacity: e.target.value }))} /></div>
            <div><Label>Type</Label><Select value={roomForm.room_type} onValueChange={v => setRoomForm(p => ({ ...p, room_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["shared","private","dormitory"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            <div className="col-span-4 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => createRoom.mutate({ ...roomForm, capacity: parseInt(roomForm.capacity) })}>Add</Button></div>
          </CardContent>
        </Card>
      )}

      {showForm && tab === "allotments" && (
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-base">Allot Room</CardTitle><Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button></CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Student</Label><Select value={allotForm.student_id} onValueChange={v => setAllotForm(p => ({ ...p, student_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{stdArr.map((s: any) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Room</Label><Select value={allotForm.room_id} onValueChange={v => setAllotForm(p => ({ ...p, room_id: v }))}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{roomArr.map((r: any) => <SelectItem key={r.id} value={r.id.toString()}>{r.room_no} ({r.block})</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Date</Label><Input type="date" value={allotForm.allotted_date} onChange={e => setAllotForm(p => ({ ...p, allotted_date: e.target.value }))} /></div>
            <div className="col-span-3 flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button onClick={() => allot.mutate({ ...allotForm, student_id: parseInt(allotForm.student_id), room_id: parseInt(allotForm.room_id) })}>Allot</Button></div>
          </CardContent>
        </Card>
      )}

      {tab === "rooms" && <div className="grid grid-cols-3 gap-3">{roomArr.map((r: any) => <Card key={r.id}><CardContent className="pt-4"><p className="font-semibold">{r.room_no} — {r.block}</p><p className="text-sm text-gray-500">{r.room_type} · {r.occupied ?? 0}/{r.capacity} occupied</p></CardContent></Card>)}{roomArr.length === 0 && <p className="text-gray-400 text-sm col-span-3 py-4 text-center">No rooms yet.</p>}</div>}

      {tab === "allotments" && <div className="space-y-2">{alotArr.map((a: any) => <Card key={a.id}><CardContent className="pt-4 flex justify-between"><div><p className="font-semibold">{a.student_name ?? `Student #${a.student_id}`}</p><p className="text-sm text-gray-500">Room {a.room_no ?? a.room_id} · Since {a.allotted_date?.slice(0,10)}</p></div><Badge className="bg-blue-100 text-blue-800">Active</Badge></CardContent></Card>)}{alotArr.length === 0 && <p className="text-center text-gray-400 py-8">No allotments yet.</p>}</div>}
    </div>
  );
}
