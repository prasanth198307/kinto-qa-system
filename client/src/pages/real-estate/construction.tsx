import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Pencil } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const STATUS_COLORS: Record<string, any> = { pending: "secondary", "in-progress": "default", completed: "outline", delayed: "destructive" };
const emptyForm = { milestone_name: "", planned_date: "", actual_date: "", completion_percent: "", status: "pending" };

export default function ConstructionPage() {
  const qc = useQueryClient();
  const [projectId, setProjectId] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data: projects } = useQuery({ queryKey: ["re-projects"], queryFn: () => api("GET", "/api/real-estate/projects") });
  const projectList = Array.isArray(projects) ? projects : [];

  const { data, isLoading, isError } = useQuery({
    queryKey: ["re-construction", projectId],
    queryFn: () => api("GET", `/api/real-estate/construction?project_id=${projectId}`),
    enabled: !!projectId,
  });

  const milestones = Array.isArray(data) ? data : [];
  const overallProgress = milestones.length ? Math.round(milestones.reduce((a: number, m: any) => a + Number(m.completion_percent || 0), 0) / milestones.length) : 0;

  const save = useMutation({
    mutationFn: (payload: any) =>
      editing
        ? api("PUT", `/api/real-estate/construction/${editing.id}`, payload)
        : api("POST", "/api/real-estate/construction", { ...payload, project_id: Number(projectId) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["re-construction"] }); setOpen(false); },
  });

  function openAdd() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(m: any) { setEditing(m); setForm({ milestone_name: m.milestone_name, planned_date: m.planned_date, actual_date: m.actual_date || "", completion_percent: m.completion_percent, status: m.status }); setOpen(true); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Construction Progress</h1>
        <Button onClick={openAdd} disabled={!projectId}><Plus className="w-4 h-4 mr-2" />Add Milestone</Button>
      </div>

      <div className="flex gap-4 items-center">
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select Project" /></SelectTrigger>
          <SelectContent>{projectList.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.project_name}</SelectItem>)}</SelectContent>
        </Select>
        {projectId && milestones.length > 0 && (
          <Card className="flex-1">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Overall Progress</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              <Progress value={overallProgress} className="h-3" />
              <p className="text-sm font-semibold">{overallProgress}% Complete</p>
            </CardContent>
          </Card>
        )}
      </div>

      {!projectId && <div className="p-12 text-center text-muted-foreground">Select a project to view milestones.</div>}

      {projectId && (
        <Card>
          <CardContent className="p-0">
            {isLoading && <div className="p-8 text-center text-muted-foreground">Loading...</div>}
            {isError && <div className="p-8 text-center text-destructive">Failed to load milestones.</div>}
            {!isLoading && !isError && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Milestone</TableHead>
                    <TableHead>Planned Date</TableHead>
                    <TableHead>Actual Date</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milestones.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No milestones yet.</TableCell></TableRow>}
                  {milestones.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.milestone_name}</TableCell>
                      <TableCell>{m.planned_date}</TableCell>
                      <TableCell>{m.actual_date || "—"}</TableCell>
                      <TableCell className="w-48">
                        <div className="space-y-1">
                          <Progress value={Number(m.completion_percent || 0)} className="h-2" />
                          <span className="text-xs text-muted-foreground">{m.completion_percent}%</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={STATUS_COLORS[m.status] ?? "secondary"}>{m.status}</Badge></TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(m)}><Pencil className="w-4 h-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Update Milestone" : "Add Milestone"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Milestone Name" value={form.milestone_name} onChange={(e) => setForm({ ...form, milestone_name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div><label className="text-xs text-muted-foreground">Planned Date</label><Input type="date" value={form.planned_date} onChange={(e) => setForm({ ...form, planned_date: e.target.value })} /></div>
              <div><label className="text-xs text-muted-foreground">Actual Date</label><Input type="date" value={form.actual_date} onChange={(e) => setForm({ ...form, actual_date: e.target.value })} /></div>
            </div>
            <div><label className="text-xs text-muted-foreground">Completion %</label><Input type="number" min={0} max={100} value={form.completion_percent} onChange={(e) => setForm({ ...form, completion_percent: e.target.value })} /></div>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate({ ...form, completion_percent: Number(form.completion_percent) })} disabled={save.isPending}>
              {save.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
