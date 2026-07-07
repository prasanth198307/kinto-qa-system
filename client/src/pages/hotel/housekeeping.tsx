import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Plus, X, CheckCircle } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  inspected: "bg-purple-100 text-purple-800",
};

const PRIORITY_COLOR: Record<string, string> = { high: "bg-red-100 text-red-800", normal: "bg-gray-100 text-gray-700", low: "bg-blue-50 text-blue-700" };
const TASK_TYPES = ["Full Cleaning", "Turndown", "Linen Change", "Bathroom", "Minibar Restock", "Maintenance Check", "Deep Clean"];
const EMPTY = { room_id: "", task_type: "Full Cleaning", assigned_to: "", priority: "normal", notes: "" };

export default function HotelHousekeepingPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [statusFilter, setStatusFilter] = useState("");

  const { data: tasks = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/housekeeping"], queryFn: () => api("GET", "/api/hotel/housekeeping") });
  const { data: rooms = [] } = useQuery<any[]>({ queryKey: ["/api/hotel/rooms"], queryFn: () => api("GET", "/api/hotel/rooms") });

  const create = useMutation({ mutationFn: (b: any) => api("POST", "/api/hotel/housekeeping", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/hotel/housekeeping"] }); setShowForm(false); setForm({ ...EMPTY }); } });
  const updateStatus = useMutation({ mutationFn: ({ id, status }: any) => api("PUT", `/api/hotel/housekeeping/${id}`, { status }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/housekeeping"] }) });
  const deleteTask = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/hotel/housekeeping/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/hotel/housekeeping"] }) });

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const tasksArr = Array.isArray(tasks) ? tasks : [];
  const roomsArr = Array.isArray(rooms) ? rooms : [];
  const filtered = statusFilter ? tasksArr.filter((t: any) => t.status === statusFilter) : tasksArr;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="w-6 h-6 text-blue-500" />Housekeeping</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4 mr-1" />Assign Task</Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {["pending", "in_progress", "completed", "inspected"].map(s => (
          <Card key={s} className="cursor-pointer" onClick={() => setStatusFilter(statusFilter === s ? "" : s)}>
            <CardContent className="pt-3">
              <p className="text-xs text-gray-500 capitalize">{s.replace("_", " ")}</p>
              <p className="text-2xl font-bold">{tasksArr.filter((t: any) => t.status === s).length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 items-center">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {["pending", "in_progress", "completed", "inspected"].map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Assign Housekeeping Task</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <div><Label>Room</Label>
              <Select value={form.room_id} onValueChange={v => f("room_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>{roomsArr.map((r: any) => <SelectItem key={r.id} value={r.id.toString()}>Room {r.room_number} ({r.status})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Task Type</Label>
              <Select value={form.task_type} onValueChange={v => f("task_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Assigned To</Label><Input value={form.assigned_to} onChange={e => f("assigned_to", e.target.value)} placeholder="Housekeeper name..." /></div>
            <div><Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => f("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Notes</Label><Input value={form.notes} onChange={e => f("notes", e.target.value)} /></div>
            <div className="col-span-3 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={() => create.mutate({ ...form, room_id: parseInt(form.room_id) })}>Assign</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        {filtered.map((t: any) => (
          <Card key={t.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold">Room {t.room_number ?? t.room_id}</p>
                  <p className="text-sm text-gray-600">{t.task_type}</p>
                  {t.assigned_to && <p className="text-xs text-gray-500">Assigned to: {t.assigned_to}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={STATUS_COLOR[t.status] ?? "bg-gray-100"}>{t.status?.replace("_", " ")}</Badge>
                  <Badge className={PRIORITY_COLOR[t.priority] ?? ""}>{t.priority}</Badge>
                </div>
              </div>
              {t.notes && <p className="text-xs text-gray-400 mb-2">{t.notes}</p>}
              <div className="flex gap-1 flex-wrap">
                {t.status === "pending" && <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus.mutate({ id: t.id, status: "in_progress" })}>Start</Button>}
                {t.status === "in_progress" && <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus.mutate({ id: t.id, status: "completed" })}><CheckCircle className="w-3 h-3 mr-1" />Complete</Button>}
                {t.status === "completed" && <Button size="sm" variant="outline" className="text-xs" onClick={() => updateStatus.mutate({ id: t.id, status: "inspected" })}>Inspect ✓</Button>}
                <Button size="sm" variant="ghost" className="text-xs text-red-500" onClick={() => deleteTask.mutate(t.id)}>Del</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-gray-400 text-sm col-span-2 py-8 text-center">No tasks found.</p>}
      </div>
    </div>
  );
}
