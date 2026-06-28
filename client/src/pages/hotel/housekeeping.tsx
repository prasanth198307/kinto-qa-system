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

export default function HotelHousekeepingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({ room_number: "", task_type: "", assigned_to: "" });

  const { data: tasks = [] } = useQuery({ queryKey: ["hotel-housekeeping"], queryFn: () => api("GET", "/api/hotel/housekeeping") });

  const addTask = useMutation({
    mutationFn: () => api("POST", "/api/hotel/housekeeping", form),
    onSuccess: () => { toast({ title: "Task added" }); qc.invalidateQueries({ queryKey: ["hotel-housekeeping"] }); setForm({ room_number: "", task_type: "", assigned_to: "" }); }
  });

  const markDone = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/hotel/housekeeping/${id}/done`, {}),
    onSuccess: () => { toast({ title: "Task completed" }); qc.invalidateQueries({ queryKey: ["hotel-housekeeping"] }); }
  });

  const taskList: any[] = Array.isArray(tasks) ? tasks : (tasks as any)?.tasks || [];

  const statusBadge = (s: string): "default" | "secondary" | "destructive" | "outline" => {
    if (s === "done" || s === "completed") return "default";
    if (s === "in-progress") return "secondary";
    if (s === "pending") return "outline";
    return "outline";
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Housekeeping</h1>
      <Card>
        <CardHeader><CardTitle>Add Task</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input placeholder="Room Number" value={form.room_number} onChange={e => setForm(p => ({ ...p, room_number: e.target.value }))} className="w-36" />
            <Select value={form.task_type} onValueChange={v => setForm(p => ({ ...p, task_type: v }))}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Task Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="checkout-clean">Checkout Clean</SelectItem>
                <SelectItem value="refresh">Refresh</SelectItem>
                <SelectItem value="deep-clean">Deep Clean</SelectItem>
                <SelectItem value="inspection">Inspection</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Assigned To" value={form.assigned_to} onChange={e => setForm(p => ({ ...p, assigned_to: e.target.value }))} className="w-40" />
            <Button onClick={() => addTask.mutate()}>Add Task</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Housekeeping Tasks</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room No</TableHead>
                <TableHead>Task Type</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Scheduled At</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskList.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-bold">{t.room_no || t.room_number}</TableCell>
                  <TableCell className="capitalize">{t.task_type}</TableCell>
                  <TableCell>{t.assigned_to}</TableCell>
                  <TableCell><Badge variant={statusBadge(t.status)}>{t.status}</Badge></TableCell>
                  <TableCell>{t.scheduled_at ? new Date(t.scheduled_at).toLocaleString() : "-"}</TableCell>
                  <TableCell>
                    {t.status !== "done" && t.status !== "completed" && (
                      <Button size="sm" onClick={() => markDone.mutate(t.id)}>Mark Done</Button>
                    )}
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
