import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, credentials: "include", body: b ? JSON.stringify(b) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });


const STATUS_COLOR: Record<string, [string, string]> = {
  planning: ["#dbeafe", "#1e40af"], under_construction: ["#fef9c3", "#713f12"],
  ready_to_move: ["#dcfce7", "#166534"], completed: ["#f0fdf4", "#15803d"],
};

export default function ProjectsPage() {
  const fmt = (n: any) => n != null ? `${sym}${Number(n).toLocaleString("en-IN")}` : "—";
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showUnits, setShowUnits] = useState<number | null>(null);
  const [unitForm, setUnitForm] = useState(false);
  const [form, setForm] = useState<any>({});
  const [uForm, setUForm] = useState<any>({});

  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/projects"], queryFn: () => api("GET", "/api/real-estate/projects") });
  const { data: stats } = useQuery<any>({ queryKey: ["/api/real-estate/stats"], queryFn: () => api("GET", "/api/real-estate/stats") });
  const { data: units = [] } = useQuery<any[]>({
    queryKey: ["/api/real-estate/units", showUnits],
    queryFn: () => api("GET", `/api/real-estate/units?project_id=${showUnits}`),
    enabled: showUnits != null,
  });

  const saveProject = useMutation({
    mutationFn: (d: any) => editId ? api("PUT", `/api/real-estate/projects/${editId}`, d) : api("POST", "/api/real-estate/projects", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/projects"] }); qc.invalidateQueries({ queryKey: ["/api/real-estate/stats"] }); setShowForm(false); setEditId(null); setForm({}); toast({ title: editId ? "Project updated" : "Project created" }); },
  });

  const saveUnit = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/units", { ...d, project_id: showUnits }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/units", showUnits] }); setUnitForm(false); setUForm({}); toast({ title: "Unit added" }); },
  });

  const blockUnit = useMutation({
    mutationFn: ({ id }: any) => api("POST", `/api/real-estate/units/${id}/block`, { reason: "Admin hold" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/units", showUnits] }); toast({ title: "Unit blocked" }); },
  });

  function startEdit(p: any) {
    setForm({ name: p.name, location: p.location, project_type: p.project_type, total_units: p.total_units, total_area_sqft: p.total_area_sqft, start_date: p.start_date?.slice(0, 10), completion_date: p.completion_date?.slice(0, 10), status: p.status, description: p.description });
    setEditId(p.id); setShowForm(true);
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Real Estate Projects</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>Projects, units, RERA and construction tracking</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm({}); }}>+ New Project</Button>
      </div>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
          {[{ label: "Projects", value: stats.totalProjects ?? 0 }, { label: "Total Units", value: stats.totalUnits ?? 0 }, { label: "Booked", value: stats.bookedUnits ?? 0 }, { label: "Revenue", value: fmt(stats.totalRevenue) }].map(s => (
            <Card key={s.label}><CardContent style={{ padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a56db" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{s.label}</div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>{editId ? "Edit Project" : "New Project"}</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[{ key: "name", label: "Project Name" }, { key: "location", label: "Location" }, { key: "project_type", label: "Type (Residential/Commercial)" }, { key: "total_units", label: "Total Units", type: "number" }, { key: "total_area_sqft", label: "Total Area sqft", type: "number" }, { key: "start_date", label: "Start Date", type: "date" }, { key: "completion_date", label: "Completion Date", type: "date" }, { key: "status", label: "Status" }].map(f => (
                <div key={f.key}>
                  <Label style={{ fontSize: 11 }}>{f.label}</Label>
                  <Input type={f.type || "text"} value={form[f.key] ?? ""} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                </div>
              ))}
              <div style={{ gridColumn: "1/-1" }}>
                <Label style={{ fontSize: 11 }}>Description</Label>
                <Input value={form.description ?? ""} onChange={e => setForm((p: any) => ({ ...p, description: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Button size="sm" onClick={() => saveProject.mutate(form)} disabled={saveProject.isPending}>{saveProject.isPending ? "Saving…" : "Save"}</Button>
              <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card style={{ marginBottom: 16 }}>
        <CardContent style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "#eef2ff" }}>{["Project", "Location", "Type", "Units", "Status", "Actions"].map(h => <th key={h} style={{ padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #d0daf5", fontWeight: 600 }}>{h}</th>)}</tr></thead>
            <tbody>
              {projects.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#888" }}>No projects yet</td></tr>}
              {projects.map((p: any, i) => {
                const [bg, color] = STATUS_COLOR[p.status] || ["#f1f0ec", "#666"];
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
                    <td style={{ padding: "8px 12px", fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: "8px 12px" }}>{p.location}</td>
                    <td style={{ padding: "8px 12px" }}>{p.project_type}</td>
                    <td style={{ padding: "8px 12px" }}>{p.total_units} units · {p.total_area_sqft?.toLocaleString()} sqft</td>
                    <td style={{ padding: "8px 12px" }}><Badge style={{ background: bg, color, fontSize: 11 }}>{p.status?.replace(/_/g, " ")}</Badge></td>
                    <td style={{ padding: "8px 12px", display: "flex", gap: 4 }}>
                      <Button size="sm" variant="outline" style={{ fontSize: 11 }} onClick={() => { setShowUnits(p.id); setUnitForm(false); }}>Units</Button>
                      <Button size="sm" variant="outline" style={{ fontSize: 11 }} onClick={() => startEdit(p)}>Edit</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {showUnits != null && (
        <Card>
          <CardHeader style={{ paddingBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <CardTitle style={{ fontSize: 14 }}>Units — {projects.find((p: any) => p.id === showUnits)?.name}</CardTitle>
              <div style={{ display: "flex", gap: 6 }}>
                <Button size="sm" onClick={() => setUnitForm(v => !v)}>+ Add Unit</Button>
                <Button size="sm" variant="outline" onClick={() => setShowUnits(null)}>Close</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {unitForm && (
              <div style={{ background: "#f8faff", border: "1px solid #d0daf5", borderRadius: 6, padding: 12, marginBottom: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 8 }}>
                  {[{ key: "unit_no", label: "Unit No" }, { key: "unit_type", label: "Type (1BHK/2BHK/Shop)" }, { key: "floor_no", label: "Floor", type: "number" }, { key: "area_sqft", label: "Area sqft", type: "number" }, { key: "base_price", label: "Base Price ${sym}", type: "number" }, { key: "current_price", label: "Current Price ${sym}", type: "number" }, { key: "facing", label: "Facing (N/S/E/W)" }].map(f => (
                    <div key={f.key}>
                      <Label style={{ fontSize: 11 }}>{f.label}</Label>
                      <Input type={f.type || "text"} value={uForm[f.key] ?? ""} onChange={e => setUForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button size="sm" onClick={() => saveUnit.mutate(uForm)} disabled={saveUnit.isPending}>{saveUnit.isPending ? "Saving…" : "Add Unit"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setUnitForm(false)}>Cancel</Button>
                </div>
              </div>
            )}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "#eef2ff" }}>{["Unit No", "Type", "Floor", "Area sqft", "Base Price", "Current Price", "Facing", "Status", ""].map(h => <th key={h} style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #d0daf5" }}>{h}</th>)}</tr></thead>
              <tbody>
                {units.length === 0 && <tr><td colSpan={9} style={{ padding: 16, textAlign: "center", color: "#888" }}>No units</td></tr>}
                {units.map((u: any, i) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
                    <td style={{ padding: "6px 8px", fontWeight: 500 }}>{u.unit_no}</td>
                    <td style={{ padding: "6px 8px" }}>{u.unit_type}</td>
                    <td style={{ padding: "6px 8px" }}>{u.floor_no}</td>
                    <td style={{ padding: "6px 8px" }}>{u.area_sqft}</td>
                    <td style={{ padding: "6px 8px" }}>{fmt(u.base_price)}</td>
                    <td style={{ padding: "6px 8px" }}>{fmt(u.current_price)}</td>
                    <td style={{ padding: "6px 8px" }}>{u.facing}</td>
                    <td style={{ padding: "6px 8px" }}>
                      <Badge style={{ fontSize: 10, background: u.status === "available" ? "#dcfce7" : u.status === "booked" ? "#fef9c3" : "#fde0e0", color: u.status === "available" ? "#166534" : u.status === "booked" ? "#713f12" : "#991b1b" }}>{u.status}</Badge>
                    </td>
                    <td style={{ padding: "6px 8px" }}>
                      {u.status === "available" && <Button size="sm" variant="outline" style={{ fontSize: 10 }} onClick={() => blockUnit.mutate({ id: u.id })}>Block</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
