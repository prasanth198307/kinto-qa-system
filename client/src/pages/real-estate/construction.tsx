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

const fmt = (n: any) => n != null ? `${sym}${Number(n).toLocaleString("en-IN")}` : "—";

export default function ConstructionPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [showCostForm, setShowCostForm] = useState(false);
  const [pForm, setPForm] = useState<any>({});
  const [cForm, setCForm] = useState<any>({});

  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/projects"], queryFn: () => api("GET", "/api/real-estate/projects") });
  const { data: progress = [] } = useQuery<any[]>({
    queryKey: ["/api/real-estate/construction-progress", selectedProject],
    queryFn: () => api("GET", `/api/real-estate/construction-progress?project_id=${selectedProject}`),
    enabled: !!selectedProject,
  });
  const { data: budgetActual } = useQuery<any>({
    queryKey: ["/api/real-estate/construction-costs/budget-actual", selectedProject],
    queryFn: () => api("GET", `/api/real-estate/construction-costs/budget-actual/${selectedProject}`),
    enabled: !!selectedProject,
  });
  const { data: costs = [] } = useQuery<any[]>({
    queryKey: ["/api/real-estate/construction-costs", selectedProject],
    queryFn: () => api("GET", `/api/real-estate/construction-costs/${selectedProject}`),
    enabled: !!selectedProject,
  });

  const addProgress = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/construction-progress", { ...d, project_id: selectedProject }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/construction-progress", selectedProject] }); setShowProgressForm(false); setPForm({}); toast({ title: "Progress entry saved" }); },
  });

  const addCost = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/construction-costs", { ...d, project_id: selectedProject }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/construction-costs", selectedProject] }); qc.invalidateQueries({ queryKey: ["/api/real-estate/construction-costs/budget-actual", selectedProject] }); setShowCostForm(false); setCForm({}); toast({ title: "Cost recorded" }); },
  });

  const latestProgress = progress[0];

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Construction Progress & Costs</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>Track physical completion %, budget vs actual cost by category</p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Label style={{ fontSize: 12 }}>Select Project</Label>
        <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={{ width: 320, border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 13, marginTop: 4 }}>
          <option value="">— Select project —</option>
          {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name} — {p.location}</option>)}
        </select>
      </div>

      {selectedProject && (
        <>
          {/* Progress gauge */}
          {latestProgress && (
            <Card style={{ marginBottom: 16 }}>
              <CardContent style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 36, fontWeight: 700, color: "#1a56db" }}>{latestProgress.completion_percentage}%</div>
                    <div style={{ fontSize: 12, color: "#666" }}>Overall Completion</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, background: "#e2e8f0", borderRadius: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${latestProgress.completion_percentage}%`, background: "#1a56db", borderRadius: 6, transition: "width 0.4s" }} />
                    </div>
                    <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
                      {[["Foundations", latestProgress.foundations_pct], ["Structure", latestProgress.structure_pct], ["Finishing", latestProgress.finishing_pct], ["MEP", latestProgress.mep_pct]].map(([label, val]) => (
                        <div key={label as string} style={{ textAlign: "center", background: "#f8faff", borderRadius: 4, padding: "6px 4px" }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>{val ?? "—"}%</div>
                          <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, color: "#555" }}>{latestProgress.notes}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Budget vs Actual */}
          {budgetActual && (
            <Card style={{ marginBottom: 16 }}>
              <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>Budget vs Actual</CardTitle></CardHeader>
              <CardContent style={{ padding: 0 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: "#eef2ff" }}>{["Category", "Budget", "Actual", "Variance", ""].map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid #d0daf5" }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {(budgetActual.rows || []).map((r: any, i: number) => {
                      const variance = (r.actual || 0) - (r.budget || 0);
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
                          <td style={{ padding: "6px 10px", fontWeight: 500 }}>{r.category}</td>
                          <td style={{ padding: "6px 10px" }}>{fmt(r.budget)}</td>
                          <td style={{ padding: "6px 10px" }}>{fmt(r.actual)}</td>
                          <td style={{ padding: "6px 10px", color: variance > 0 ? "#dc2626" : "#166534", fontWeight: 500 }}>{variance > 0 ? "+" : ""}{fmt(Math.abs(variance))} {variance > 0 ? "over" : "under"}</td>
                          <td style={{ padding: "6px 10px" }}>
                            <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, width: 80 }}>
                              <div style={{ height: "100%", width: `${Math.min(100, r.budget ? (r.actual / r.budget) * 100 : 0)}%`, background: variance > 0 ? "#dc2626" : "#1a56db", borderRadius: 3 }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <Button size="sm" onClick={() => setShowProgressForm(v => !v)}>+ Log Progress</Button>
            <Button size="sm" variant="outline" onClick={() => setShowCostForm(v => !v)}>+ Record Cost</Button>
          </div>

          {showProgressForm && (
            <Card style={{ marginBottom: 12 }}>
              <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 13 }}>Log Construction Progress</CardTitle></CardHeader>
              <CardContent>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                  {[{ key: "progress_date", label: "Date", type: "date" }, { key: "completion_percentage", label: "Overall %", type: "number" }, { key: "foundations_pct", label: "Foundations %", type: "number" }, { key: "structure_pct", label: "Structure %", type: "number" }, { key: "finishing_pct", label: "Finishing %", type: "number" }, { key: "mep_pct", label: "MEP %", type: "number" }].map(f => (
                    <div key={f.key}>
                      <Label style={{ fontSize: 11 }}>{f.label}</Label>
                      <Input type={f.type || "text"} value={pForm[f.key] ?? ""} onChange={e => setPForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                    </div>
                  ))}
                  <div style={{ gridColumn: "1/-1" }}>
                    <Label style={{ fontSize: 11 }}>Notes / Remarks</Label>
                    <Input value={pForm.notes ?? ""} onChange={e => setPForm((p: any) => ({ ...p, notes: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Button size="sm" onClick={() => addProgress.mutate(pForm)} disabled={addProgress.isPending}>{addProgress.isPending ? "Saving…" : "Save"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowProgressForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {showCostForm && (
            <Card style={{ marginBottom: 12 }}>
              <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 13 }}>Record Construction Cost</CardTitle></CardHeader>
              <CardContent>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                  {[{ key: "expense_date", label: "Date", type: "date" }, { key: "category", label: "Category (Civil/MEP/Finishing)" }, { key: "vendor_name", label: "Vendor / Contractor" }, { key: "description", label: "Description" }, { key: "budget_amount", label: "Budget ${sym}", type: "number" }, { key: "actual_amount", label: "Actual ${sym}", type: "number" }, { key: "invoice_no", label: "Invoice / Bill No" }].map(f => (
                    <div key={f.key}>
                      <Label style={{ fontSize: 11 }}>{f.label}</Label>
                      <Input type={f.type || "text"} value={cForm[f.key] ?? ""} onChange={e => setCForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Button size="sm" onClick={() => addCost.mutate(cForm)} disabled={addCost.isPending}>{addCost.isPending ? "Saving…" : "Save"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowCostForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>Cost Entries</CardTitle></CardHeader>
            <CardContent style={{ padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ background: "#eef2ff" }}>{["Date", "Category", "Vendor", "Description", "Budget", "Actual", "Invoice"].map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid #d0daf5" }}>{h}</th>)}</tr></thead>
                <tbody>
                  {costs.length === 0 && <tr><td colSpan={7} style={{ padding: 16, textAlign: "center", color: "#888" }}>No cost entries</td></tr>}
                  {costs.map((c: any, i) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
                      <td style={{ padding: "6px 10px" }}>{c.expense_date ? new Date(c.expense_date).toLocaleDateString("en-IN") : "—"}</td>
                      <td style={{ padding: "6px 10px" }}><Badge style={{ fontSize: 10, background: "#eef2ff", color: "#1e40af" }}>{c.category}</Badge></td>
                      <td style={{ padding: "6px 10px" }}>{c.vendor_name}</td>
                      <td style={{ padding: "6px 10px" }}>{c.description}</td>
                      <td style={{ padding: "6px 10px" }}>{fmt(c.budget_amount)}</td>
                      <td style={{ padding: "6px 10px", fontWeight: 500 }}>{fmt(c.actual_amount)}</td>
                      <td style={{ padding: "6px 10px", fontFamily: "monospace", fontSize: 11 }}>{c.invoice_no}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {!selectedProject && (
        <Card><CardContent style={{ padding: 32, textAlign: "center", color: "#888" }}>Select a project above to view construction details</CardContent></Card>
      )}
    </div>
  );
}
