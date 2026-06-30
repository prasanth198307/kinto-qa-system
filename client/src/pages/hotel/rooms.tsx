import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BedDouble, Plus, Pencil } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const STATUSES = ["available", "occupied", "dirty", "maintenance", "checkout"];
const STATUS_COLOR: Record<string, string> = {
  available: "bg-green-100 text-green-800",
  occupied: "bg-red-100 text-red-800",
  dirty: "bg-yellow-100 text-yellow-800",
  maintenance: "bg-gray-200 text-gray-700",
  checkout: "bg-blue-100 text-blue-800",
};

const emptyRoom = { room_number: "", floor: "", room_type_id: "", is_active: true };
const emptyType = { name: "", description: "", base_price: "", max_occupancy: "", total_rooms: "", amenities: "" };

function RoomDialog({ open, onClose, roomTypes, initial, onSave }: { open: boolean; onClose: () => void; roomTypes: any[]; initial: any; onSave: (d: any) => void }) {
  const [f, setF] = useState(initial);
  const s = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial.id ? "Edit Room" : "Add Room"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <Input placeholder="Room Number" value={f.room_number} onChange={e => s("room_number", e.target.value)} />
          <Input placeholder="Floor" value={f.floor} onChange={e => s("floor", e.target.value)} />
          <Select value={String(f.room_type_id)} onValueChange={v => s("room_type_id", v)}>
            <SelectTrigger><SelectValue placeholder="Room Type" /></SelectTrigger>
            <SelectContent>{roomTypes.map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={f.is_active ? "true" : "false"} onValueChange={v => s("is_active", v === "true")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="true">Active</SelectItem><SelectItem value="false">Inactive</SelectItem></SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(f); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoomTypeDialog({ open, onClose, initial, onSave }: { open: boolean; onClose: () => void; initial: any; onSave: (d: any) => void }) {
  const [f, setF] = useState(initial);
  const s = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{initial.id ? "Edit Room Type" : "Add Room Type"}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <Input placeholder="Name" value={f.name} onChange={e => s("name", e.target.value)} />
          <Input placeholder="Description" value={f.description} onChange={e => s("description", e.target.value)} />
          <Input type="number" placeholder="Base Price" value={f.base_price} onChange={e => s("base_price", e.target.value)} />
          <Input type="number" placeholder="Max Occupancy" value={f.max_occupancy} onChange={e => s("max_occupancy", e.target.value)} />
          <Input type="number" placeholder="Total Rooms" value={f.total_rooms} onChange={e => s("total_rooms", e.target.value)} />
          <Input placeholder="Amenities (comma-separated)" value={f.amenities} onChange={e => s("amenities", e.target.value)} className="col-span-2" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(f); onClose(); }}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RoomsTab() {
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<any>(null);
  const { data: rooms = [] } = useQuery({ queryKey: ["/api/hotel/rooms"], queryFn: () => api("GET", "/api/hotel/rooms") });
  const { data: roomTypes = [] } = useQuery({ queryKey: ["/api/hotel/room-types"], queryFn: () => api("GET", "/api/hotel/room-types") });

  const refresh = () => qc.invalidateQueries({ queryKey: ["/api/hotel/rooms"] });
  const addRoom = useMutation({ mutationFn: (d: any) => api("POST", "/api/hotel/rooms", d), onSuccess: refresh });
  const editRoom = useMutation({ mutationFn: (d: any) => api("PUT", `/api/hotel/rooms/${d.id}`, d), onSuccess: refresh });
  const changeStatus = useMutation({ mutationFn: ({ id, status }: any) => api("PUT", `/api/hotel/rooms/${id}`, { status }), onSuccess: refresh });

  const save = (d: any) => d.id ? editRoom.mutate(d) : addRoom.mutate(d);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDlg({ ...emptyRoom })}><Plus size={14} className="mr-1" />Add Room</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room #</TableHead><TableHead>Floor</TableHead><TableHead>Type</TableHead>
                <TableHead>Status</TableHead><TableHead>Active</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rooms as any[]).length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-400">No rooms found</TableCell></TableRow>}
              {(rooms as any[]).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-semibold">{r.room_number}</TableCell>
                  <TableCell>{r.floor}</TableCell>
                  <TableCell>{r.room_type_name || r.room_type_id}</TableCell>
                  <TableCell>
                    <Select value={r.status} onValueChange={v => changeStatus.mutate({ id: r.id, status: v })}>
                      <SelectTrigger className={`h-7 w-32 text-xs ${STATUS_COLOR[r.status] || ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Badge variant={r.is_active ? "default" : "secondary"}>{r.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell><Button size="icon" variant="ghost" onClick={() => setDlg(r)}><Pencil size={14} /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {dlg && <RoomDialog open roomTypes={roomTypes as any[]} initial={dlg} onClose={() => setDlg(null)} onSave={save} />}
    </div>
  );
}

function RoomTypesTab() {
  const qc = useQueryClient();
  const [dlg, setDlg] = useState<any>(null);
  const { data: roomTypes = [] } = useQuery({ queryKey: ["/api/hotel/room-types"], queryFn: () => api("GET", "/api/hotel/room-types") });

  const refresh = () => qc.invalidateQueries({ queryKey: ["/api/hotel/room-types"] });
  const addType = useMutation({ mutationFn: (d: any) => api("POST", "/api/hotel/room-types", d), onSuccess: refresh });
  const editType = useMutation({ mutationFn: (d: any) => api("PUT", `/api/hotel/room-types/${d.id}`, d), onSuccess: refresh });

  const save = (d: any) => {
    const payload = { ...d, base_price: Number(d.base_price), max_occupancy: Number(d.max_occupancy), total_rooms: Number(d.total_rooms), amenities: typeof d.amenities === "string" ? d.amenities.split(",").map((s: string) => s.trim()).filter(Boolean) : d.amenities };
    d.id ? editType.mutate(payload) : addType.mutate(payload);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setDlg({ ...emptyType })}><Plus size={14} className="mr-1" />Add Room Type</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Base Price</TableHead>
                <TableHead className="text-right">Max Occ.</TableHead><TableHead className="text-right">Total Rooms</TableHead>
                <TableHead>Amenities</TableHead><TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(roomTypes as any[]).length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-400">No room types found</TableCell></TableRow>}
              {(roomTypes as any[]).map((t: any) => {
                const amenities = Array.isArray(t.amenities) ? t.amenities : (t.amenities ? String(t.amenities).split(",").map((s: string) => s.trim()).filter(Boolean) : []);
                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-semibold">{t.name}</TableCell>
                    <TableCell className="text-gray-500 text-sm max-w-[150px] truncate">{t.description}</TableCell>
                    <TableCell className="text-right">₹{Number(t.base_price || 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right">{t.max_occupancy}</TableCell>
                    <TableCell className="text-right">{t.total_rooms}</TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{amenities.slice(0, 3).map((a: string) => <Badge key={a} variant="secondary" className="text-[10px] px-1.5">{a}</Badge>)}{amenities.length > 3 && <Badge variant="outline" className="text-[10px]">+{amenities.length - 3}</Badge>}</div></TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => setDlg({ ...t, amenities: amenities.join(", ") })}><Pencil size={14} /></Button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {dlg && <RoomTypeDialog open initial={dlg} onClose={() => setDlg(null)} onSave={save} />}
    </div>
  );
}

export default function RoomsPage() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <BedDouble size={24} />
        <h1 className="text-2xl font-bold">Room Management</h1>
      </div>
      <Tabs defaultValue="rooms">
        <TabsList>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="types">Room Types</TabsTrigger>
        </TabsList>
        <TabsContent value="rooms" className="mt-4"><RoomsTab /></TabsContent>
        <TabsContent value="types" className="mt-4"><RoomTypesTab /></TabsContent>
      </Tabs>
    </div>
  );
}
