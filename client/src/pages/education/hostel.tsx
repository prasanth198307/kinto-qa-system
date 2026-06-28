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

export default function EducationHostelPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ student_id: "", room_id: "", join_date: "" });

  const { data: rooms = [] } = useQuery({ queryKey: ["/api/education/hostel/rooms"], queryFn: () => api("GET", "/api/education/hostel/rooms") });
  const { data: allocations = [] } = useQuery({ queryKey: ["/api/education/hostel/allocations"], queryFn: () => api("GET", "/api/education/hostel/allocations") });

  const allotMutation = useMutation({
    mutationFn: (d: any) => api("POST", "/api/education/hostel/allocations", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/education/hostel/allocations"] }); setShowForm(false); toast({ title: "Room allotted" }); },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Hostel</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Allot Room</Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Allot Room</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-sm font-medium">Student ID</label><Input value={form.student_id} onChange={e => setForm(p => ({...p, student_id: e.target.value}))} /></div>
              <div><label className="text-sm font-medium">Room ID</label><Input value={form.room_id} onChange={e => setForm(p => ({...p, room_id: e.target.value}))} /></div>
              <div><label className="text-sm font-medium">Join Date</label><Input type="date" value={form.join_date} onChange={e => setForm(p => ({...p, join_date: e.target.value}))} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => allotMutation.mutate(form)} disabled={allotMutation.isPending}>Allot</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Room Grid</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-3">
            {rooms.map((r: any) => {
              const avail = r.capacity - r.occupied;
              return (
                <div key={r.id} className={`p-3 rounded border ${avail > 0 ? "border-green-400 bg-green-50" : "border-red-400 bg-red-50"}`}>
                  <div className="font-bold">{r.room_no}</div>
                  <div className="text-sm text-muted-foreground">Block {r.block}</div>
                  <div className="text-sm">{r.occupied}/{r.capacity} occupied</div>
                  <Badge variant={avail > 0 ? "default" : "destructive"} className="mt-1">{avail > 0 ? `${avail} available` : "Full"}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Allocations</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Student</TableHead><TableHead>Class</TableHead><TableHead>Room</TableHead><TableHead>Block</TableHead><TableHead>Join Date</TableHead><TableHead>Fee/Month</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {allocations.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>{a.student_name}</TableCell>
                  <TableCell>{a.class}</TableCell>
                  <TableCell>{a.room_no}</TableCell>
                  <TableCell>{a.block}</TableCell>
                  <TableCell>{a.join_date}</TableCell>
                  <TableCell>₹{fmt(a.fee_per_month)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
