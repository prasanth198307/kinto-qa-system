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

export default function RealEstateProjectsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ project_name: "", developer_name: "", location: "", project_type: "residential", total_units: "", launch_date: "", possession_date: "" });

  const { data: projects = [] } = useQuery({ queryKey: ["/api/real-estate/projects"], queryFn: () => api("GET", "/api/real-estate/projects") });
  const { data: units = [] } = useQuery({ queryKey: ["/api/real-estate/units", selectedProject], queryFn: () => api("GET", "/api/real-estate/units?project_id=" + selectedProject), enabled: !!selectedProject });

  const addProject = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/projects", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/projects"] }); setShowForm(false); toast({ title: "Project added" }); }
  });

  const totalUnits = projects.reduce((s: number, p: any) => s + (p.total_units || 0), 0);
  const totalSold = projects.reduce((s: number, p: any) => s + (p.sold || 0), 0);
  const totalAvail = projects.reduce((s: number, p: any) => s + (p.available || 0), 0);

  const statusColor = (s: string) => s === "active" ? "default" : s === "completed" ? "secondary" : "outline";
  const unitStatusColor = (s: string) => s === "sold" ? "destructive" : s === "available" ? "default" : "secondary";

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Projects & Units</h1>
        <Button onClick={() => setShowForm(!showForm)}>+ Add Project</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{projects.length}</div><div className="text-sm text-muted-foreground">Total Projects</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold">{totalUnits}</div><div className="text-sm text-muted-foreground">Total Units</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-green-600">{totalSold}</div><div className="text-sm text-muted-foreground">Sold</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-blue-600">{totalAvail}</div><div className="text-sm text-muted-foreground">Available</div></CardContent></Card>
        <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-yellow-600">{totalUnits - totalSold - totalAvail}</div><div className="text-sm text-muted-foreground">Under Construction</div></CardContent></Card>
      </div>

      {showForm && (
        <Card>
          <CardHeader><CardTitle>Add Project</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Input placeholder="Project Name" value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} />
              <Input placeholder="Developer Name" value={form.developer_name} onChange={e => setForm({ ...form, developer_name: e.target.value })} />
              <Input placeholder="Location" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
              <Select value={form.project_type} onValueChange={v => setForm({ ...form, project_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Total Units" type="number" value={form.total_units} onChange={e => setForm({ ...form, total_units: e.target.value })} />
              <Input placeholder="Launch Date" type="date" value={form.launch_date} onChange={e => setForm({ ...form, launch_date: e.target.value })} />
              <Input placeholder="Possession Date" type="date" value={form.possession_date} onChange={e => setForm({ ...form, possession_date: e.target.value })} />
            </div>
            <Button className="mt-4" onClick={() => addProject.mutate(form)}>Save Project</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Projects</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Total Units</TableHead>
                <TableHead>Sold</TableHead>
                <TableHead>Available</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.project_name}</TableCell>
                  <TableCell>{p.location}</TableCell>
                  <TableCell className="capitalize">{p.project_type}</TableCell>
                  <TableCell>{p.total_units}</TableCell>
                  <TableCell>{p.sold || 0}</TableCell>
                  <TableCell>{p.available || 0}</TableCell>
                  <TableCell><Badge variant={statusColor(p.status)}>{p.status}</Badge></TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => setSelectedProject(p.id === selectedProject ? null : p.id)}>Units</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedProject && units.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Units</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {units.map((u: any) => (
                <div key={u.id} className="border rounded p-3 space-y-1">
                  <div className="font-bold">{u.unit_no}</div>
                  <div className="text-sm">Floor {u.floor} · {u.type}</div>
                  <div className="text-sm">{u.area_sqft} sqft</div>
                  <div className="text-sm font-medium">₹{fmt(u.price)}</div>
                  <Badge variant={unitStatusColor(u.status)}>{u.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
