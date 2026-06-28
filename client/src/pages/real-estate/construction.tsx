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

const statusColor = (s: string): any => ({ completed: "default", "in-progress": "secondary", pending: "outline", delayed: "destructive" }[s] || "outline");

export default function RealEstateConstructionPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [updateId, setUpdateId] = useState<number | null>(null);
  const [progress, setProgress] = useState({ completion_pct: 0, notes: "" });
  const [form, setForm] = useState({ project_id: "", milestone_name: "", planned_date: "", contractor: "", estimated_cost: "" });

  const { data: projects = [] } = useQuery({ queryKey: ["/api/real-estate/projects"], queryFn: () => api("GET", "/api/real-estate/projects") });
  const { data: milestones = [] } = useQuery({ queryKey: ["/api/real-estate/construction", selectedProject], queryFn: () => api("GET", "/api/real-estate/construction?project_id=" + selectedProject), enabled: !!selectedProject });

  const addMilestone = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/construction", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/construction"] }); setShowForm(false); toast({ title: "Milestone added" }); }
  });

  const updateProgress = useMutation({
    mutationFn: ({ id, d }: any) => api("PUT", "/api/real-estate/construction/" + id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/construction"] }); setUpdateId(null); toast({ title: "Progress updated" }); }
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Construction Progress</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Milestone</Button>
      </div>

      <div className="flex gap-4 items-center">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select Project" /></SelectTrigger>
          <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.project_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Milestone</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Select value={form.project_id} onValueChange={v => setForm({ ...form, project_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select Project" /></SelectTrigger>
                <SelectContent>{projects.map((p: any) => <SelectItem key={p.id} value={String(p.id)}>{p.project_name}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Milestone Name" value={form.milestone_name} onChange={e => setForm({ ...form, milestone_name: e.target.value })} />
              <Input type="date" placeholder="Planned Date" value={form.planned_date} onChange={e => setForm({ ...form, planned_date: e.target.value })} />
              <Input placeholder="Contractor" value={form.contractor} onChange={e => setForm({ ...form, contractor: e.target.value })} />
              <Input placeholder="Estimated Cost" type="number" value={form.estimated_cost} onChange={e => setForm({ ...form, estimated_cost: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={() => addMilestone.mutate(form)}>Save Milestone</Button>
          </CardContent>
        </Card>
      )}

      {selectedProject && (
        <Card>
          <CardHeader><CardTitle>Milestones</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Planned Date</TableHead>
                  <TableHead>Actual Date</TableHead>
                  <TableHead>Completion %</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Update</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones.map((m: any) => (
                  <>
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.milestone_name}</TableCell>
                      <TableCell>{m.planned_date ? new Date(m.planned_date).toLocaleDateString("en-IN") : "-"}</TableCell>
                      <TableCell>{m.actual_date ? new Date(m.actual_date).toLocaleDateString("en-IN") : "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2"><div className="bg-blue-600 h-2 rounded-full" style={{ width: (m.completion_pct || 0) + "%" }} /></div>
                          <span>{m.completion_pct || 0}%</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={statusColor(m.status)}>{m.status}</Badge></TableCell>
                      <TableCell>{m.notes}</TableCell>
                      <TableCell><Button size="sm" variant="outline" onClick={() => setUpdateId(m.id === updateId ? null : m.id)}>Update</Button></TableCell>
                    </TableRow>
                    {updateId === m.id && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <div className="flex gap-4 items-center p-2">
                            <div className="flex items-center gap-2">
                              <label className="text-sm">Progress %</label>
                              <input type="range" min={0} max={100} value={progress.completion_pct} onChange={e => setProgress({ ...progress, completion_pct: Number(e.target.value) })} className="w-32" />
                              <span>{progress.completion_pct}%</span>
                            </div>
                            <Input placeholder="Notes" value={progress.notes} onChange={e => setProgress({ ...progress, notes: e.target.value })} className="flex-1" />
                            <Button size="sm" onClick={() => updateProgress.mutate({ id: m.id, d: progress })}>Save</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
