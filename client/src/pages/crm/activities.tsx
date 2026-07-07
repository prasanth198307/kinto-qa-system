import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Plus, X, CheckCircle, Clock } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const ACTIVITY_TYPES = ["Call", "Email", "Meeting", "Demo", "Follow-up", "WhatsApp", "Site Visit", "Proposal Sent", "Contract Signed", "Note"];
const TASK_TYPES = ["Call", "Email", "Meeting", "Follow-up", "Send Proposal", "Send Invoice", "Other"];
const PRIORITY = ["Low", "Normal", "High", "Urgent"];
const EMPTY_ACT = { type: "Call", contact_id: "", description: "", outcome: "", activity_date: new Date().toISOString().slice(0, 10) };
const EMPTY_TASK = { type: "Call", contact_id: "", title: "", due_date: "", priority: "Normal", notes: "" };

export default function CRMActivitiesPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"activities" | "tasks">("activities");
  const [showActForm, setShowActForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [actForm, setActForm] = useState({ ...EMPTY_ACT });
  const [taskForm, setTaskForm] = useState({ ...EMPTY_TASK });

  const { data: activities = [] } = useQuery<any[]>({ queryKey: ["/api/crm/activities"], queryFn: () => api("GET", "/api/crm/activities") });
  const { data: tasks = [] } = useQuery<any[]>({ queryKey: ["/api/crm/tasks"], queryFn: () => api("GET", "/api/crm/tasks") });
  const { data: contacts = [] } = useQuery<any[]>({ queryKey: ["/api/crm/contacts"], queryFn: () => api("GET", "/api/crm/contacts") });

  const createAct = useMutation({ mutationFn: (b: any) => api("POST", "/api/crm/activities", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/activities"] }); setShowActForm(false); setActForm({ ...EMPTY_ACT }); } });
  const deleteAct = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/crm/activities/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/crm/activities"] }) });
  const createTask = useMutation({ mutationFn: (b: any) => api("POST", "/api/crm/tasks", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/crm/tasks"] }); setShowTaskForm(false); setTaskForm({ ...EMPTY_TASK }); } });
  const completeTask = useMutation({ mutationFn: (id: number) => api("PUT", `/api/crm/tasks/${id}`, { status: "completed" }), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/crm/tasks"] }) });
  const deleteTask = useMutation({ mutationFn: (id: number) => api("DELETE", `/api/crm/tasks/${id}`, {}), onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/crm/tasks"] }) });

  const af = (k: string, v: string) => setActForm(p => ({ ...p, [k]: v }));
  const tf = (k: string, v: string) => setTaskForm(p => ({ ...p, [k]: v }));

  const actsArr = Array.isArray(activities) ? activities : [];
  const tasksArr = Array.isArray(tasks) ? tasks : [];
  const contactsArr = Array.isArray(contacts) ? contacts : [];

  const today = new Date().toISOString().slice(0, 10);
  const overdue = tasksArr.filter((t: any) => t.status !== "completed" && t.due_date?.slice(0, 10) < today);
  const due_today = tasksArr.filter((t: any) => t.status !== "completed" && t.due_date?.slice(0, 10) === today);

  const ACT_COLOR: Record<string, string> = { Call: "bg-blue-100 text-blue-800", Email: "bg-green-100 text-green-800", Meeting: "bg-purple-100 text-purple-800", Demo: "bg-orange-100 text-orange-800", WhatsApp: "bg-emerald-100 text-emerald-800", Note: "bg-gray-100 text-gray-700" };
  const PRI_COLOR: Record<string, string> = { Low: "bg-gray-100 text-gray-600", Normal: "bg-blue-50 text-blue-700", High: "bg-orange-100 text-orange-700", Urgent: "bg-red-100 text-red-800" };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="w-6 h-6 text-blue-600" />Activities & Tasks</h1>

      <div className="grid grid-cols-4 gap-3">
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Total Activities</p><p className="text-2xl font-bold">{actsArr.length}</p></CardContent></Card>
        <Card><CardContent className="pt-3"><p className="text-xs text-gray-500">Open Tasks</p><p className="text-2xl font-bold">{tasksArr.filter((t: any) => t.status !== "completed").length}</p></CardContent></Card>
        <Card className="border-red-200"><CardContent className="pt-3"><p className="text-xs text-red-500">Overdue</p><p className="text-2xl font-bold text-red-600">{overdue.length}</p></CardContent></Card>
        <Card className="border-orange-200"><CardContent className="pt-3"><p className="text-xs text-orange-500">Due Today</p><p className="text-2xl font-bold text-orange-600">{due_today.length}</p></CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "activities" ? "default" : "outline"} onClick={() => setTab("activities")}>Activities Log ({actsArr.length})</Button>
        <Button variant={tab === "tasks" ? "default" : "outline"} onClick={() => setTab("tasks")}>Tasks ({tasksArr.filter((t: any) => t.status !== "completed").length} open)</Button>
      </div>

      {tab === "activities" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setShowActForm(true)}><Plus className="w-4 h-4 mr-1" />Log Activity</Button>
          </div>
          {showActForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Log Activity</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowActForm(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div><Label>Type</Label>
                  <Select value={actForm.type} onValueChange={v => af("type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{ACTIVITY_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Contact</Label>
                  <Select value={actForm.contact_id} onValueChange={v => af("contact_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select contact" /></SelectTrigger>
                    <SelectContent>{contactsArr.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Date</Label><Input type="date" value={actForm.activity_date} onChange={e => af("activity_date", e.target.value)} /></div>
                <div className="col-span-2"><Label>Description</Label><Input value={actForm.description} onChange={e => af("description", e.target.value)} placeholder="What happened..." /></div>
                <div><Label>Outcome</Label><Input value={actForm.outcome} onChange={e => af("outcome", e.target.value)} placeholder="Result..." /></div>
                <div className="col-span-3 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowActForm(false)}>Cancel</Button>
                  <Button onClick={() => createAct.mutate({ ...actForm, contact_id: actForm.contact_id ? parseInt(actForm.contact_id) : undefined })}>Log</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="space-y-2">
            {actsArr.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <Badge className={ACT_COLOR[a.type] ?? "bg-gray-100"}>{a.type}</Badge>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.contact_name ?? `Contact #${a.contact_id}`}</p>
                  {a.description && <p className="text-sm text-gray-600">{a.description}</p>}
                  {a.outcome && <p className="text-xs text-green-600 mt-1">→ {a.outcome}</p>}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{a.activity_date?.slice(0, 10)}</p>
                  <Button size="sm" variant="ghost" className="text-red-400 text-xs mt-1" onClick={() => deleteAct.mutate(a.id)}>Del</Button>
                </div>
              </div>
            ))}
            {actsArr.length === 0 && <p className="text-center text-gray-400 py-8">No activities logged.</p>}
          </div>
        </div>
      )}

      {tab === "tasks" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setShowTaskForm(true)}><Plus className="w-4 h-4 mr-1" />Add Task</Button>
          </div>
          {showTaskForm && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">New Task</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowTaskForm(false)}><X className="w-4 h-4" /></Button>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-3">
                <div><Label>Title</Label><Input value={taskForm.title} onChange={e => tf("title", e.target.value)} /></div>
                <div><Label>Type</Label>
                  <Select value={taskForm.type} onValueChange={v => tf("type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TASK_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Contact</Label>
                  <Select value={taskForm.contact_id} onValueChange={v => tf("contact_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>{contactsArr.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Due Date</Label><Input type="date" value={taskForm.due_date} onChange={e => tf("due_date", e.target.value)} /></div>
                <div><Label>Priority</Label>
                  <Select value={taskForm.priority} onValueChange={v => tf("priority", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITY.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Notes</Label><Input value={taskForm.notes} onChange={e => tf("notes", e.target.value)} /></div>
                <div className="col-span-3 flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowTaskForm(false)}>Cancel</Button>
                  <Button onClick={() => createTask.mutate({ ...taskForm, contact_id: taskForm.contact_id ? parseInt(taskForm.contact_id) : undefined })}>Create</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="space-y-2">
            {tasksArr.filter((t: any) => t.status !== "completed").map((t: any) => {
              const isOverdue = t.due_date?.slice(0, 10) < today;
              const isToday = t.due_date?.slice(0, 10) === today;
              return (
                <div key={t.id} className={`flex items-start gap-3 p-3 border rounded-lg ${isOverdue ? "border-red-300 bg-red-50" : isToday ? "border-orange-300 bg-orange-50" : ""}`}>
                  <Clock className={`w-4 h-4 mt-0.5 ${isOverdue ? "text-red-500" : "text-gray-400"}`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-gray-500">{t.type}{t.contact_name ? ` · ${t.contact_name}` : ""}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={PRI_COLOR[t.priority] ?? ""}>{t.priority}</Badge>
                    <p className="text-xs text-gray-400">{t.due_date?.slice(0, 10)}</p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="text-xs h-6" onClick={() => completeTask.mutate(t.id)}><CheckCircle className="w-3 h-3 mr-1" />Done</Button>
                      <Button size="sm" variant="ghost" className="text-xs h-6 text-red-500" onClick={() => deleteTask.mutate(t.id)}>Del</Button>
                    </div>
                  </div>
                </div>
              );
            })}
            {tasksArr.filter((t: any) => t.status !== "completed").length === 0 && <p className="text-center text-gray-400 py-8">No open tasks.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
