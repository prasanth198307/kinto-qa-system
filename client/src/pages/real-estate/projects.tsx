import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Home, CheckSquare, Package, Plus, Pencil } from "lucide-react";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

const STATUS_COLORS: Record<string, string> = {
  planning: "secondary",
  "under-construction": "default",
  ready: "outline",
};

const emptyForm = { project_name: "", project_code: "", location: "", total_units: "", status: "planning" };

export default function ProjectsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyForm);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["re-projects"],
    queryFn: () => api("GET", "/api/real-estate/projects"),
  });

  const projects = Array.isArray(data) ? data : [];

  const kpis = {
    total: projects.length,
    units: projects.reduce((a: number, p: any) => a + (p.total_units || 0), 0),
    sold: projects.reduce((a: number, p: any) => a + (p.sold_units || 0), 0),
    available: projects.reduce((a: number, p: any) => a + (p.available_units || 0), 0),
  };

  const save = useMutation({
    mutationFn: (payload: any) =>
      editing
        ? api("PUT", `/api/real-estate/projects/${editing.id}`, payload)
        : api("POST", "/api/real-estate/projects", payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["re-projects"] }); setOpen(false); },
  });

  function openAdd() { setEditing(null); setForm(emptyForm); setOpen(true); }
  function openEdit(p: any) { setEditing(p); setForm({ project_name: p.project_name, project_code: p.project_code, location: p.location, total_units: p.total_units, status: p.status }); setOpen(true); }
  function handleSubmit() { save.mutate({ ...form, total_units: Number(form.total_units) }); }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Add Project</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Projects", value: kpis.total, icon: Building2 },
          { label: "Total Units", value: kpis.units, icon: Home },
          { label: "Sold Units", value: kpis.sold, icon: CheckSquare },
          { label: "Available Units", value: kpis.available, icon: Package },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading && <div className="p-8 text-center text-muted-foreground">Loading...</div>}
          {isError && <div className="p-8 text-center text-destructive">Failed to load projects.</div>}
          {!isLoading && !isError && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">Total Units</TableHead>
                  <TableHead className="text-right">Sold</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No projects found.</TableCell></TableRow>
                )}
                {projects.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.project_name}</TableCell>
                    <TableCell>{p.project_code}</TableCell>
                    <TableCell>{p.location}</TableCell>
                    <TableCell className="text-right">{p.total_units}</TableCell>
                    <TableCell className="text-right">{p.sold_units ?? 0}</TableCell>
                    <TableCell className="text-right">{p.available_units ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_COLORS[p.status] as any ?? "secondary"}>{p.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => openEdit(p)}><Pencil className="w-4 h-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Project" : "Add Project"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Project Name" value={form.project_name} onChange={(e) => setForm({ ...form, project_name: e.target.value })} />
            <Input placeholder="Project Code" value={form.project_code} onChange={(e) => setForm({ ...form, project_code: e.target.value })} />
            <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <Input type="number" placeholder="Total Units" value={form.total_units} onChange={(e) => setForm({ ...form, total_units: e.target.value })} />
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="under-construction">Under Construction</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={save.isPending}>{save.isPending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
