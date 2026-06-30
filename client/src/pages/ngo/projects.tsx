import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Users, MapPin, Calendar } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const fmt = (n: any) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const statusColor: Record<string, string> = { planning: "outline", active: "default", completed: "secondary", suspended: "destructive" };

const empty = { project_code: "", name: "", description: "", budget: "", start_date: "", end_date: "", location: "", status: "planning" };

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [costDialog, setCostDialog] = useState<{ id: number; actual_cost: string; beneficiary_count: string } | null>(null);

  const { data: projects = [] } = useQuery({ queryKey: ["ngo-projects"], queryFn: () => api("GET", "/api/ngo/projects") });

  const save = useMutation({
    mutationFn: (d: any) => editId ? api("PUT", `/api/ngo/projects/${editId}`, d) : api("POST", "/api/ngo/projects", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-projects"] }); setOpen(false); setEditId(null); setForm({ ...empty }); }
  });

  const updateCost = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api("PUT", `/api/ngo/projects/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ngo-projects"] }); setCostDialog(null); }
  });

  const active = projects.filter((p: any) => p.status === "active").length;
  const completed = projects.filter((p: any) => p.status === "completed").length;
  const totalBudget = projects.reduce((s: number, p: any) => s + Number(p.budget || 0), 0);
  const totalActual = projects.reduce((s: number, p: any) => s + Number(p.actual_cost || 0), 0);

  const openEdit = (p: any) => {
    setForm({ project_code: p.project_code, name: p.name, description: p.description || "", budget: p.budget, start_date: p.start_date?.slice(0, 10) || "", end_date: p.end_date?.slice(0, 10) || "", location: p.location || "", status: p.status });
    setEditId(p.id);
    setOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={() => { setForm({ ...empty }); setEditId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-2" />Add Project</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Projects", value: projects.length },
          { label: "Active", value: active },
          { label: "Completed", value: completed },
          { label: "Budget vs Actual", value: `₹${fmt(totalActual)} / ₹${fmt(totalBudget)}` },
        ].map(k => (
          <Card key={k.label}><CardContent className="pt-4"><div className="text-xs text-muted-foreground">{k.label}</div><div className="text-lg font-bold mt-1">{k.value}</div></CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p: any) => {
          const pct = p.budget > 0 ? Math.min(100, Math.round((p.actual_cost / p.budget) * 100)) : 0;
          const variance = Number(p.budget || 0) - Number(p.actual_cost || 0);
          return (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground font-mono">{p.project_code}</span>
                    <CardTitle className="text-base mt-0.5">{p.name}</CardTitle>
                  </div>
                  <Badge variant={statusColor[p.status] as any}>{p.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span>Budget</span><span className="font-medium">₹{fmt(p.budget)}</span></div>
                  <div className="flex justify-between text-sm"><span>Actual</span><span className="font-medium">₹{fmt(p.actual_cost)}</span></div>
                  <div className="flex justify-between text-sm"><span>Variance</span><span className={variance >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>₹{fmt(Math.abs(variance))} {variance >= 0 ? "under" : "over"}</span></div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-muted rounded-full h-2"><div className={`h-2 rounded-full ${pct > 100 ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                    <span className="text-xs">{pct}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {p.beneficiary_count > 0 && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{p.beneficiary_count}</span>}
                  {p.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</span>}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />{p.start_date?.slice(0, 10)} → {p.end_date?.slice(0, 10)}</div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Edit className="h-3 w-3 mr-1" />Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => setCostDialog({ id: p.id, actual_cost: p.actual_cost || "", beneficiary_count: p.beneficiary_count || "" })}>Update Costs</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Project" : "Add Project"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[["project_code","Project Code"],["name","Name"],["budget","Budget"],["start_date","Start Date"],["end_date","End Date"],["location","Location"]].map(([k,l]) => (
              <div key={k} className={k === "name" ? "col-span-2" : ""}>
                <Label>{l}</Label>
                <Input type={k.includes("date") ? "date" : k === "budget" ? "number" : "text"} value={(form as any)[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem><SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem><SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => save.mutate(form)} disabled={save.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!costDialog} onOpenChange={() => setCostDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Update Costs</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Actual Cost</Label><Input type="number" value={costDialog?.actual_cost || ""} onChange={e => setCostDialog(p => p ? { ...p, actual_cost: e.target.value } : null)} /></div>
            <div><Label>Beneficiary Count</Label><Input type="number" value={costDialog?.beneficiary_count || ""} onChange={e => setCostDialog(p => p ? { ...p, beneficiary_count: e.target.value } : null)} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setCostDialog(null)}>Cancel</Button><Button onClick={() => updateCost.mutate({ id: costDialog!.id, data: { actual_cost: costDialog!.actual_cost, beneficiary_count: costDialog!.beneficiary_count } })} disabled={updateCost.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
