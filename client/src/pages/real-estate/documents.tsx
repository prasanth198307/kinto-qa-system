import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, credentials: "include", body: b ? JSON.stringify(b) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const DOC_TYPES = ["Sale Agreement", "Title Deed", "Encumbrance Certificate", "NOC", "RERA Certificate", "Possession Letter", "OC Certificate", "CC Certificate", "Building Plan", "Power of Attorney", "Loan Agreement", "Others"];

export default function DocumentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});

  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/projects"], queryFn: () => api("GET", "/api/real-estate/projects") });
  const { data: docs = [] } = useQuery<any[]>({
    queryKey: ["/api/real-estate/documents", selectedProject],
    queryFn: () => api("GET", `/api/real-estate/documents/${selectedProject}`),
    enabled: !!selectedProject,
  });

  const addDoc = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/documents", { ...d, project_id: selectedProject }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/documents", selectedProject] }); setShowForm(false); setForm({}); toast({ title: "Document record saved" }); },
  });

  const deleteDoc = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/real-estate/documents/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/documents", selectedProject] }); toast({ title: "Document removed" }); },
  });

  const docsByType = DOC_TYPES.reduce((acc: any, t) => {
    acc[t] = docs.filter((d: any) => d.document_type === t);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1000 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Document Management</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>Legal documents, certificates, agreements by project</p>
        </div>
        {selectedProject && <Button size="sm" onClick={() => { setShowForm(true); setForm({}); }}>+ Add Document</Button>}
      </div>

      <div style={{ marginBottom: 16 }}>
        <Label style={{ fontSize: 12 }}>Select Project</Label>
        <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} style={{ width: 320, border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 13, marginTop: 4 }}>
          <option value="">— Select project —</option>
          {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>Add Document Record</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <Label style={{ fontSize: 11 }}>Document Type</Label>
                <select value={form.document_type ?? ""} onChange={e => setForm((p: any) => ({ ...p, document_type: e.target.value }))} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 12, marginTop: 2 }}>
                  <option value="">Select type</option>
                  {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              {[{ key: "document_name", label: "Document Name / Title" }, { key: "document_no", label: "Document No / Reg No" }, { key: "issue_date", label: "Issue Date", type: "date" }, { key: "expiry_date", label: "Expiry Date", type: "date" }, { key: "issued_by", label: "Issued By" }, { key: "file_url", label: "File URL / DMS Link" }, { key: "notes", label: "Notes" }].map(f => (
                <div key={f.key}>
                  <Label style={{ fontSize: 11 }}>{f.label}</Label>
                  <Input type={f.type || "text"} value={form[f.key] ?? ""} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Button size="sm" onClick={() => addDoc.mutate(form)} disabled={addDoc.isPending}>{addDoc.isPending ? "Saving…" : "Save"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedProject && <Card><CardContent style={{ padding: 32, textAlign: "center", color: "#888" }}>Select a project to view documents</CardContent></Card>}

      {selectedProject && docs.length === 0 && !showForm && (
        <Card><CardContent style={{ padding: 32, textAlign: "center", color: "#888" }}>No documents yet. Click "+ Add Document" to start.</CardContent></Card>
      )}

      {selectedProject && docs.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {DOC_TYPES.filter(t => docsByType[t]?.length > 0).map(docType => (
            <Card key={docType}>
              <CardHeader style={{ paddingBottom: 8 }}>
                <CardTitle style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                  {docType}
                  <Badge style={{ background: "#dbeafe", color: "#1e40af", fontSize: 10 }}>{docsByType[docType].length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent style={{ padding: 0 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead><tr style={{ background: "#f8faff" }}>{["Name", "Doc No", "Issue Date", "Expiry", "Issued By", "Link", ""].map(h => <th key={h} style={{ padding: "6px 10px", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {docsByType[docType].map((d: any, i: number) => {
                      const expired = d.expiry_date && new Date(d.expiry_date) < new Date();
                      return (
                        <tr key={d.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
                          <td style={{ padding: "6px 10px", fontWeight: 500 }}>{d.document_name}</td>
                          <td style={{ padding: "6px 10px", fontFamily: "monospace", fontSize: 11 }}>{d.document_no || "—"}</td>
                          <td style={{ padding: "6px 10px" }}>{d.issue_date ? new Date(d.issue_date).toLocaleDateString("en-IN") : "—"}</td>
                          <td style={{ padding: "6px 10px", color: expired ? "#dc2626" : undefined }}>
                            {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString("en-IN") : "—"}
                            {expired && <Badge style={{ fontSize: 9, background: "#fde0e0", color: "#991b1b", marginLeft: 4 }}>Expired</Badge>}
                          </td>
                          <td style={{ padding: "6px 10px" }}>{d.issued_by || "—"}</td>
                          <td style={{ padding: "6px 10px" }}>
                            {d.file_url ? <a href={d.file_url} target="_blank" rel="noreferrer" style={{ color: "#1a56db", fontSize: 11 }}>View →</a> : "—"}
                          </td>
                          <td style={{ padding: "6px 10px" }}>
                            <Button size="sm" variant="outline" style={{ fontSize: 10, color: "#dc2626" }} onClick={() => { if (confirm("Delete document record?")) deleteDoc.mutate(d.id); }}>Delete</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
