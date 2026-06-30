import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, User, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const api = (method: string, path: string, body?: unknown) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const today = new Date().toISOString().split("T")[0];

const priorityColor: Record<string, string> = { low: "bg-gray-100 text-gray-700", normal: "bg-blue-100 text-blue-700", high: "bg-orange-100 text-orange-700", urgent: "bg-red-100 text-red-700" };
const statusBorder: Record<string, string> = { pending: "border-yellow-400", in_progress: "border-blue-400", completed: "border-green-400" };

export default function HousekeepingPage() {
  const qc = useQueryClient();
  const [date, setDate] = useState(today);
  const [typeFilter, setTypeFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [form, setForm] = useState({ room_id: "", task_type: "clean", assigned_to: "", priority: "normal", notes: "", task_date: today });

  const { data: tasks = [] } = useQuery({ queryKey: ["hotel-housekeeping", date], queryFn: () => api("GET", `/api/hotel/housekeeping?date=${date}`) });
  const { data: rooms = [] } = useQuery({ queryKey: ["hotel-rooms"], queryFn: () => api("GET", "/api/hotel/rooms") });

  const createTask = useMutation({
    mutationFn: (d: typeof form) => api("POST", "/api/hotel/housekeeping", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hotel-housekeeping"] }); setAssignOpen(false); setForm({ room_id: "", task_type: "clean", assigned_to: "", priority: "normal", notes: "", task_date: today }); }
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api("PUT", `/api/hotel/housekeeping/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hotel-housekeeping"] })
  });

  const filtered = tasks.filter((t: any) =>
    (typeFilter === "all" || t.task_type === typeFilter) &&
    (!staffFilter || t.assigned_to?.toLowerCase().includes(staffFilter.toLowerCase()))
  );

  const grouped = {
    pending: filtered.filter((t: any) => t.status === "pending"),
    in_progress: filtered.filter((t: any) => t.status === "in_progress"),
    completed: filtered.filter((t: any) => t.status === "completed"),
  };

  const staffSummary = tasks.filter((t: any) => t.status === "completed").reduce((acc: Record<string, number>, t: any) => {
    acc[t.assigned_to] = (acc[t.assigned_to] || 0) + 1;
    return acc;
  }, {});

  const TaskCard = ({ task }: { task: any }) => (
    <Card className={`border-l-4 ${statusBorder[task.status]}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex justify-between items-start">
          <div>
            <p className="font-medium text-sm">Room {task.room_number || task.room_id}</p>
            <p className="text-xs text-gray-500 capitalize">{task.task_type}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor[task.priority]}`}>{task.priority}</span>
        </div>
        {task.assigned_to && <p className="text-xs text-gray-400 flex items-center gap-1"><User size={11} />{task.assigned_to}</p>}
        {task.notes && <p className="text-xs text-gray-400 italic">{task.notes}</p>}
        <div className="flex gap-1 pt-1">
          {task.status === "pending" && <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => updateStatus.mutate({ id: task.id, status: "in_progress" })}>Start</Button>}
          {task.status === "in_progress" && <Button size="sm" className="h-6 text-xs" onClick={() => updateStatus.mutate({ id: task.id, status: "completed" })}>Complete</Button>}
          {task.status === "completed" && <span className="text-xs text-green-600 font-medium">Done</span>}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Housekeeping</h1>
        <Button onClick={() => setAssignOpen(true)}><Plus size={16} className="mr-1" />Assign Task</Button>
      </div>

      <div className="flex gap-3 items-center">
        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-44" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Task Type" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Types</SelectItem>{["clean","inspect","turndown","oo_order"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Filter by staff..." value={staffFilter} onChange={e => setStaffFilter(e.target.value)} className="w-48" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(["pending", "in_progress", "completed"] as const).map(status => (
          <div key={status}>
            <h2 className="text-sm font-semibold uppercase text-gray-500 mb-2 flex items-center gap-1">
              {status === "pending" && <AlertCircle size={14} className="text-yellow-500" />}
              {status.replace("_", " ")} <Badge variant="secondary" className="ml-1">{grouped[status].length}</Badge>
            </h2>
            <div className="space-y-2">
              {grouped[status].map((t: any) => <TaskCard key={t.id} task={t} />)}
              {grouped[status].length === 0 && <p className="text-xs text-gray-400 text-center py-4">No tasks</p>}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(staffSummary).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Staff Performance Today</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-4 flex-wrap">
              {Object.entries(staffSummary).map(([staff, count]) => (
                <div key={staff} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-1">
                  <User size={14} className="text-gray-500" />
                  <span className="text-sm">{staff}</span>
                  <Badge>{count as number} done</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Room</Label>
              <Select value={form.room_id} onValueChange={v => setForm(p => ({ ...p, room_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>{rooms.map((r: any) => <SelectItem key={r.id} value={String(r.id)}>Room {r.room_number} (Floor {r.floor})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Task Type</Label>
              <Select value={form.task_type} onValueChange={v => setForm(p => ({ ...p, task_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["clean","inspect","turndown","oo_order"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Assigned To</Label><Input value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} /></div>
            <div><Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["low","normal","high","urgent"].map(pr => <SelectItem key={pr} value={pr}>{pr}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Task Date</Label><Input type="date" value={form.task_date} onChange={e => setForm(p => ({ ...p, task_date: e.target.value }))} /></div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={() => createTask.mutate(form)} disabled={createTask.isPending || !form.room_id}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
