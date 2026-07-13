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


const STAGES = ["new", "contacted", "site_visit_scheduled", "site_visit_done", "negotiation", "booked", "lost"];
const STAGE_COLOR: Record<string, [string, string]> = {
  new: ["#dbeafe", "#1e40af"], contacted: ["#e0e7ff", "#3730a3"],
  site_visit_scheduled: ["#fef9c3", "#713f12"], site_visit_done: ["#fde8d8", "#92400e"],
  negotiation: ["#fae8ff", "#701a75"], booked: ["#dcfce7", "#166534"], lost: ["#fde0e0", "#991b1b"],
};

export default function CrmPage() {
  const fmt = (n: any) => n != null ? `${sym}${Number(n).toLocaleString("en-IN")}` : "—";
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [showForm, setShowForm] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [visitForm, setVisitForm] = useState<any>({});
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [stageFilter, setStageFilter] = useState("all");

  const { data: pipeline } = useQuery<any>({ queryKey: ["/api/real-estate/leads/pipeline"], queryFn: () => api("GET", "/api/real-estate/leads/pipeline") });
  const { data: leads = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/leads"], queryFn: () => api("GET", "/api/real-estate/leads") });
  const { data: siteVisits = [] } = useQuery<any[]>({
    queryKey: ["/api/real-estate/site-visits", selectedLead?.id],
    queryFn: () => api("GET", `/api/real-estate/site-visits?lead_id=${selectedLead.id}`),
    enabled: !!selectedLead,
  });
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/projects"], queryFn: () => api("GET", "/api/real-estate/projects") });

  const addLead = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/leads", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/leads"] }); qc.invalidateQueries({ queryKey: ["/api/real-estate/leads/pipeline"] }); setShowForm(false); setForm({}); toast({ title: "Lead added" }); },
  });

  const updateStage = useMutation({
    mutationFn: ({ id, stage }: any) => api("PUT", `/api/real-estate/leads/${id}/stage`, { stage }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/leads"] }); qc.invalidateQueries({ queryKey: ["/api/real-estate/leads/pipeline"] }); toast({ title: "Stage updated" }); },
  });

  const scheduleVisit = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/site-visits", { ...d, lead_id: selectedLead.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/site-visits", selectedLead?.id] }); setShowVisitForm(false); setVisitForm({}); toast({ title: "Site visit scheduled" }); },
  });

  const filtered = stageFilter === "all" ? leads : leads.filter((l: any) => l.stage === stageFilter);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Real Estate CRM — Lead Pipeline</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>Lead management, site visits, conversion tracking, price escalations</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setForm({}); }}>+ New Lead</Button>
      </div>

      {/* Pipeline summary */}
      {pipeline && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
          {STAGES.map(stage => {
            const count = pipeline[stage] ?? 0;
            const [bg, color] = STAGE_COLOR[stage];
            return (
              <div key={stage} style={{ minWidth: 100, background: bg, borderRadius: 8, padding: "10px 14px", textAlign: "center", cursor: "pointer", border: stageFilter === stage ? "2px solid " + color : "2px solid transparent" }} onClick={() => setStageFilter(stageFilter === stage ? "all" : stage)}>
                <div style={{ fontSize: 20, fontWeight: 700, color }}>{count}</div>
                <div style={{ fontSize: 10, color, textTransform: "capitalize" }}>{stage.replace(/_/g, " ")}</div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>New Lead</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <Label style={{ fontSize: 11 }}>Project of Interest</Label>
                <select value={form.project_id ?? ""} onChange={e => setForm((p: any) => ({ ...p, project_id: e.target.value }))} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 12, marginTop: 2 }}>
                  <option value="">— Select project —</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {[{ key: "name", label: "Lead Name" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email" }, { key: "source", label: "Source (Walk-in/Website/Broker/Reference)" }, { key: "budget_min", label: "Budget Min ${sym}", type: "number" }, { key: "budget_max", label: "Budget Max ${sym}", type: "number" }, { key: "unit_type_preference", label: "Unit Type (1BHK/2BHK/3BHK)" }, { key: "notes", label: "Notes" }].map(f => (
                <div key={f.key}>
                  <Label style={{ fontSize: 11 }}>{f.label}</Label>
                  <Input type={f.type || "text"} value={form[f.key] ?? ""} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Button size="sm" onClick={() => addLead.mutate(form)} disabled={addLead.isPending}>{addLead.isPending ? "Saving…" : "Save"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selectedLead ? "1fr 360px" : "1fr", gap: 16 }}>
        <Card>
          <CardContent style={{ padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "#eef2ff" }}>{["Lead", "Source", "Budget", "Unit Pref", "Stage", "Move Stage", ""].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #d0daf5", fontWeight: 600 }}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#888" }}>No leads{stageFilter !== "all" ? ` in ${stageFilter}` : ""}</td></tr>}
                {filtered.map((l: any, i) => {
                  const [bg, color] = STAGE_COLOR[l.stage] || ["#f1f0ec", "#666"];
                  const stageIdx = STAGES.indexOf(l.stage);
                  return (
                    <tr key={l.id} style={{ borderBottom: "1px solid #e2e8f0", background: selectedLead?.id === l.id ? "#eef2ff" : i % 2 ? "#f8faff" : "#fff", cursor: "pointer" }} onClick={() => setSelectedLead(l)}>
                      <td style={{ padding: "8px 10px" }}>
                        <div style={{ fontWeight: 500 }}>{l.name}</div>
                        <div style={{ fontSize: 10, color: "#666" }}>{l.phone} · {l.email}</div>
                      </td>
                      <td style={{ padding: "8px 10px" }}>{l.source}</td>
                      <td style={{ padding: "8px 10px" }}>{fmt(l.budget_min)} – {fmt(l.budget_max)}</td>
                      <td style={{ padding: "8px 10px" }}>{l.unit_type_preference || "—"}</td>
                      <td style={{ padding: "8px 10px" }}><Badge style={{ background: bg, color, fontSize: 10 }}>{l.stage?.replace(/_/g, " ")}</Badge></td>
                      <td style={{ padding: "8px 10px", display: "flex", gap: 4 }}>
                        {stageIdx > 0 && l.stage !== "lost" && <Button size="sm" variant="outline" style={{ fontSize: 10 }} onClick={e => { e.stopPropagation(); updateStage.mutate({ id: l.id, stage: STAGES[stageIdx - 1] }); }}>◀</Button>}
                        {stageIdx < STAGES.length - 1 && l.stage !== "booked" && <Button size="sm" style={{ fontSize: 10 }} onClick={e => { e.stopPropagation(); updateStage.mutate({ id: l.id, stage: STAGES[stageIdx + 1] }); }}>▶</Button>}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <Button size="sm" variant="outline" style={{ fontSize: 10 }} onClick={e => { e.stopPropagation(); setSelectedLead(l); setShowVisitForm(true); }}>+ Visit</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {selectedLead && (
          <Card style={{ height: "fit-content" }}>
            <CardHeader style={{ paddingBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <CardTitle style={{ fontSize: 14 }}>{selectedLead.name} — Site Visits</CardTitle>
                <Button size="sm" variant="outline" style={{ fontSize: 11 }} onClick={() => setSelectedLead(null)}>Close</Button>
              </div>
            </CardHeader>
            <CardContent>
              {showVisitForm && (
                <div style={{ background: "#f8faff", border: "1px solid #d0daf5", borderRadius: 6, padding: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[{ key: "visit_date", label: "Visit Date", type: "date" }, { key: "visit_time", label: "Visit Time", type: "time" }, { key: "assigned_to", label: "Assigned Sales Person" }, { key: "notes", label: "Notes / Units to Show" }].map(f => (
                      <div key={f.key}>
                        <Label style={{ fontSize: 11 }}>{f.label}</Label>
                        <Input type={f.type || "text"} value={visitForm[f.key] ?? ""} onChange={e => setVisitForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <Button size="sm" onClick={() => scheduleVisit.mutate(visitForm)} disabled={scheduleVisit.isPending}>{scheduleVisit.isPending ? "Saving…" : "Schedule"}</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowVisitForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              {siteVisits.length === 0 && <p style={{ fontSize: 12, color: "#888", textAlign: "center", padding: 16 }}>No site visits yet</p>}
              {siteVisits.map((v: any) => (
                <div key={v.id} style={{ background: "#f0f4ff", borderRadius: 6, padding: "8px 10px", marginBottom: 6, fontSize: 12 }}>
                  <div style={{ fontWeight: 500 }}>{v.visit_date} {v.visit_time}</div>
                  <div style={{ color: "#555" }}>By: {v.assigned_to || "—"}</div>
                  <div style={{ color: "#555" }}>{v.notes}</div>
                  <div style={{ marginTop: 4 }}>
                    <Badge style={{ fontSize: 10, background: v.outcome === "booked" ? "#dcfce7" : v.outcome === "not_interested" ? "#fde0e0" : "#fef9c3", color: v.outcome === "booked" ? "#166534" : v.outcome === "not_interested" ? "#991b1b" : "#713f12" }}>{v.outcome || "pending"}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
