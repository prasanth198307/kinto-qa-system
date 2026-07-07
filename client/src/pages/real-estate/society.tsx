import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, credentials: "include", body: b ? JSON.stringify(b) : undefined }).then(r => r.json());

const fmt = (n: any) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; };

export default function SocietyPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [month, setMonth] = useState(thisMonth());
  const [genForm, setGenForm] = useState<any>({});
  const [showGenForm, setShowGenForm] = useState(false);

  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/projects"], queryFn: () => api("GET", "/api/real-estate/projects") });
  const { data: charges = [] } = useQuery<any[]>({
    queryKey: ["/api/real-estate/society/charges", selectedProject, month],
    queryFn: () => api("GET", `/api/real-estate/society/charges/${selectedProject}/${month}`),
    enabled: !!selectedProject,
  });

  const generateCharges = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/society/charges/generate", { ...d, project_id: selectedProject, month }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/society/charges", selectedProject, month] }); setShowGenForm(false); setGenForm({}); toast({ title: "Society charges generated for all units" }); },
  });

  const markPaid = useMutation({
    mutationFn: (id: number) => api("POST", `/api/real-estate/society/charges/${id}/mark-paid`, { paid_date: new Date().toISOString().slice(0, 10), payment_mode: "UPI" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/society/charges", selectedProject, month] }); toast({ title: "Charge marked paid" }); },
  });

  const totalBilled = charges.reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);
  const totalPaid = charges.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + (Number(c.amount) || 0), 0);
  const pendingCount = charges.filter((c: any) => c.status !== "paid").length;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1000 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Society Management</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>Monthly maintenance charges — generate, track, collect from unit owners</p>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div>
          <Label style={{ fontSize: 12 }}>Project</Label>
          <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={{ width: 260, border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 13, marginTop: 4 }}>
            <option value="">— Select project —</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <Label style={{ fontSize: 12 }}>Month</Label>
          <Input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ fontSize: 13, marginTop: 4, width: 160 }} />
        </div>
        {selectedProject && <Button size="sm" onClick={() => setShowGenForm(v => !v)}>Generate Charges</Button>}
      </div>

      {selectedProject && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          {[{ label: "Total Billed", value: fmt(totalBilled), color: "#1e40af", bg: "#dbeafe" }, { label: "Collected", value: fmt(totalPaid), color: "#166534", bg: "#dcfce7" }, { label: "Pending Units", value: pendingCount, color: "#991b1b", bg: "#fde0e0" }].map(s => (
            <Card key={s.label}><CardContent style={{ padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#555" }}>{s.label}</div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {showGenForm && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>Generate Monthly Charges for {month}</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[{ key: "maintenance_amount", label: "Maintenance Charge ₹ per unit", type: "number" }, { key: "sinking_fund", label: "Sinking Fund ₹ per unit", type: "number" }, { key: "parking_charge", label: "Parking Charge ₹", type: "number" }, { key: "due_date", label: "Due Date", type: "date" }, { key: "late_fee_per_day", label: "Late Fee ₹ / day", type: "number" }].map(f => (
                <div key={f.key}>
                  <Label style={{ fontSize: 11 }}>{f.label}</Label>
                  <Input type={f.type || "text"} value={genForm[f.key] ?? ""} onChange={e => setGenForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Button size="sm" onClick={() => generateCharges.mutate(genForm)} disabled={generateCharges.isPending}>{generateCharges.isPending ? "Generating…" : "Generate for All Units"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowGenForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedProject && (
        <Card>
          <CardContent style={{ padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "#eef2ff" }}>{["Unit No", "Owner", "Maintenance", "Sinking Fund", "Parking", "Total", "Due Date", "Status", "Action"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #d0daf5", fontWeight: 600 }}>{h}</th>)}</tr></thead>
              <tbody>
                {charges.length === 0 && <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: "#888" }}>No charges for this month. Click "Generate Charges" to create.</td></tr>}
                {charges.map((c: any, i) => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
                    <td style={{ padding: "8px 10px", fontWeight: 500 }}>{c.unit_no || `Unit ${c.unit_id}`}</td>
                    <td style={{ padding: "8px 10px" }}>{c.owner_name || "—"}</td>
                    <td style={{ padding: "8px 10px" }}>{fmt(c.maintenance_amount)}</td>
                    <td style={{ padding: "8px 10px" }}>{fmt(c.sinking_fund)}</td>
                    <td style={{ padding: "8px 10px" }}>{fmt(c.parking_charge)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{fmt(c.amount)}</td>
                    <td style={{ padding: "8px 10px", color: c.status !== "paid" && c.due_date && new Date(c.due_date) < new Date() ? "#dc2626" : undefined }}>
                      {c.due_date ? new Date(c.due_date).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <Badge style={{ fontSize: 10, background: c.status === "paid" ? "#dcfce7" : c.status === "overdue" ? "#fde0e0" : "#fef9c3", color: c.status === "paid" ? "#166534" : c.status === "overdue" ? "#991b1b" : "#713f12" }}>{c.status}</Badge>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {c.status !== "paid" && <Button size="sm" style={{ fontSize: 10 }} onClick={() => markPaid.mutate(c.id)} disabled={markPaid.isPending}>Mark Paid</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {!selectedProject && <Card><CardContent style={{ padding: 32, textAlign: "center", color: "#888" }}>Select a project to manage society charges</CardContent></Card>}
    </div>
  );
}
