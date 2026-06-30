import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const ROOM_EMPTY = { room_number: "", block: "", capacity: "", amenities: "" };
const RESIDENT_EMPTY = { student_id: "", room_id: "", check_in: "", monthly_fee: "", status: "active" };

export default function HostelPage() {
  const qc = useQueryClient();
  const [roomOpen, setRoomOpen] = useState(false);
  const [residentOpen, setResidentOpen] = useState(false);
  const [roomForm, setRoomForm] = useState<any>(ROOM_EMPTY);
  const [residentForm, setResidentForm] = useState<any>(RESIDENT_EMPTY);

  const { data: rooms = [] } = useQuery({ queryKey: ["edu-hostel-rooms"], queryFn: () => api("GET", "/api/education/hostel/rooms") });
  const { data: residents = [] } = useQuery({ queryKey: ["edu-hostel-residents"], queryFn: () => api("GET", "/api/education/hostel/residents") });

  const addRoom = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/hostel/rooms", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-hostel-rooms"] }); setRoomOpen(false); setRoomForm(ROOM_EMPTY); },
  });

  const addResident = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/hostel/residents", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["edu-hostel-residents"] }); setResidentOpen(false); setResidentForm(RESIDENT_EMPTY); },
  });

  const roomList = Array.isArray(rooms) ? rooms : [];
  const residentList = Array.isArray(residents) ? residents : [];
  const setR = (k: string, v: string) => setRoomForm((f: any) => ({ ...f, [k]: v }));
  const setRes = (k: string, v: string) => setResidentForm((f: any) => ({ ...f, [k]: v }));

  const occupancyColor = (r: any) => Number(r.occupied) >= Number(r.capacity) ? "destructive" : "default";

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Hostel Management</h1>

      <Tabs defaultValue="rooms">
        <TabsList><TabsTrigger value="rooms">Rooms</TabsTrigger><TabsTrigger value="residents">Residents</TabsTrigger></TabsList>

        <TabsContent value="rooms" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-4 text-sm">
              <span>Total Rooms: <strong>{roomList.length}</strong></span>
              <span>Total Capacity: <strong>{roomList.reduce((s: number, r: any) => s + Number(r.capacity || 0), 0)}</strong></span>
              <span>Occupied: <strong>{roomList.reduce((s: number, r: any) => s + Number(r.occupied || 0), 0)}</strong></span>
            </div>
            <Button onClick={() => { setRoomForm(ROOM_EMPTY); setRoomOpen(true); }}><Plus className="w-4 h-4 mr-2" />Add Room</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Room No.</TableHead><TableHead>Block</TableHead><TableHead>Capacity</TableHead>
                  <TableHead>Occupied</TableHead><TableHead>Amenities</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {roomList.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.room_number}</TableCell>
                      <TableCell>{r.block}</TableCell>
                      <TableCell>{r.capacity}</TableCell>
                      <TableCell><Badge variant={occupancyColor(r)}>{r.occupied || 0}/{r.capacity}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.amenities}</TableCell>
                      <TableCell><Badge variant={Number(r.occupied) >= Number(r.capacity) ? "destructive" : "secondary"}>{Number(r.occupied) >= Number(r.capacity) ? "Full" : "Available"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="residents" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={() => { setResidentForm(RESIDENT_EMPTY); setResidentOpen(true); }}><Plus className="w-4 h-4 mr-2" />Assign Student</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Student</TableHead><TableHead>Room</TableHead><TableHead>Check In</TableHead>
                  <TableHead>Monthly Fee</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {residentList.map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.student_name || r.student_id}</TableCell>
                      <TableCell>{r.room_number}</TableCell>
                      <TableCell>{r.check_in}</TableCell>
                      <TableCell>₹{Number(r.monthly_fee).toLocaleString()}</TableCell>
                      <TableCell><Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={roomOpen} onOpenChange={setRoomOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Room</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Room Number" value={roomForm.room_number} onChange={(e) => setR("room_number", e.target.value)} />
            <Input placeholder="Block (e.g. A, B, Boys)" value={roomForm.block} onChange={(e) => setR("block", e.target.value)} />
            <Input placeholder="Capacity" type="number" value={roomForm.capacity} onChange={(e) => setR("capacity", e.target.value)} />
            <Input placeholder="Amenities (comma separated)" value={roomForm.amenities} onChange={(e) => setR("amenities", e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomOpen(false)}>Cancel</Button>
            <Button onClick={() => addRoom.mutate(roomForm)} disabled={addRoom.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={residentOpen} onOpenChange={setResidentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Student to Hostel</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Student ID" value={residentForm.student_id} onChange={(e) => setRes("student_id", e.target.value)} />
            <Select value={residentForm.room_id} onValueChange={(v) => setRes("room_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select Room" /></SelectTrigger>
              <SelectContent>{roomList.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>Room {r.room_number} — {r.block} ({r.occupied || 0}/{r.capacity})</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Check-in Date" type="date" value={residentForm.check_in} onChange={(e) => setRes("check_in", e.target.value)} />
            <Input placeholder="Monthly Fee" type="number" value={residentForm.monthly_fee} onChange={(e) => setRes("monthly_fee", e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResidentOpen(false)}>Cancel</Button>
            <Button onClick={() => addResident.mutate(residentForm)} disabled={addResident.isPending}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
