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

export default function BrokersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});
  const [selectedBroker, setSelectedBroker] = useState<any>(null);

  const { data: brokers = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/brokers"], queryFn: () => api("GET", "/api/real-estate/brokers") });
  const { data: commReport } = useQuery<any>({
    queryKey: ["/api/real-estate/brokers/commission-report", selectedBroker?.id],
    queryFn: () => api("GET", `/api/real-estate/brokers/${selectedBroker.id}/commission-report`),
    enabled: !!selectedBroker,
  });

  const saveBroker = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/brokers", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/brokers"] }); setShowForm(false); setForm({}); toast({ title: "Broker added" }); },
  });

  const markPaid = useMutation({
    mutationFn: ({ brokerId, saleId }: any) => api("POST", `/api/real-estate/brokers/${brokerId}/mark-commission-paid`, { sale_id: saleId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/brokers/commission-report", selectedBroker?.id] }); toast({ title: "Commission marked paid — GL posted" }); },
  });

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Broker Management</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>Channel partners, commissions earned and paid, GL auto-posting</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setForm({}); }}>+ Add Broker</Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>New Broker / Channel Partner</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[{ key: "name", label: "Broker Name / Firm" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email" }, { key: "rera_no", label: "RERA Registration No" }, { key: "pan_no", label: "PAN" }, { key: "commission_rate", label: "Default Commission %", type: "number" }, { key: "bank_name", label: "Bank Name" }, { key: "bank_account", label: "Account No" }, { key: "bank_ifsc", label: "IFSC" }].map(f => (
                <div key={f.key}>
                  <Label style={{ fontSize: 11 }}>{f.label}</Label>
                  <Input type={f.type || "text"} value={form[f.key] ?? ""} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Button size="sm" onClick={() => saveBroker.mutate(form)} disabled={saveBroker.isPending}>{saveBroker.isPending ? "Saving…" : "Save"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selectedBroker ? "1fr 1fr" : "1fr", gap: 16 }}>
        <Card>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>Channel Partners</CardTitle></CardHeader>
          <CardContent style={{ padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "#eef2ff" }}>{["Name", "Phone", "RERA No", "PAN", "Comm%", "Status", ""].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #d0daf5", fontWeight: 600 }}>{h}</th>)}</tr></thead>
              <tbody>
                {brokers.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#888" }}>No brokers yet</td></tr>}
                {brokers.map((b: any, i) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #e2e8f0", background: selectedBroker?.id === b.id ? "#eef2ff" : i % 2 ? "#f8faff" : "#fff", cursor: "pointer" }} onClick={() => setSelectedBroker(b)}>
                    <td style={{ padding: "8px 10px", fontWeight: 500 }}>{b.name}</td>
                    <td style={{ padding: "8px 10px" }}>{b.phone}</td>
                    <td style={{ padding: "8px 10px" }}>{b.rera_no || "—"}</td>
                    <td style={{ padding: "8px 10px" }}>{b.pan_no || "—"}</td>
                    <td style={{ padding: "8px 10px" }}>{b.commission_rate}%</td>
                    <td style={{ padding: "8px 10px" }}>
                      <Badge style={{ fontSize: 10, background: b.status === "active" ? "#dcfce7" : "#fde0e0", color: b.status === "active" ? "#166534" : "#991b1b" }}>{b.status}</Badge>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <Button size="sm" variant="outline" style={{ fontSize: 10 }} onClick={e => { e.stopPropagation(); setSelectedBroker(b); }}>Commission</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {selectedBroker && commReport && (
          <Card>
            <CardHeader style={{ paddingBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <CardTitle style={{ fontSize: 14 }}>{selectedBroker.name} — Commission Report</CardTitle>
                  <p style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Total Earned: {fmt(commReport.total_earned)} · Paid: {fmt(commReport.total_paid)} · Pending: {fmt(commReport.pending_amount)}</p>
                </div>
                <Button size="sm" variant="outline" style={{ fontSize: 11 }} onClick={() => setSelectedBroker(null)}>Close</Button>
              </div>
            </CardHeader>
            <CardContent style={{ padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ background: "#f0f4ff" }}>{["Unit / Booking", "Sale Amount", "Commission", "Status", "Action"].map(h => <th key={h} style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #d0daf5" }}>{h}</th>)}</tr></thead>
                <tbody>
                  {(commReport.sales || []).length === 0 && <tr><td colSpan={5} style={{ padding: 12, textAlign: "center", color: "#888" }}>No sales yet</td></tr>}
                  {(commReport.sales || []).map((s: any, i: number) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
                      <td style={{ padding: "6px 8px" }}>{s.unit_no || `Unit ${s.unit_id}`}<div style={{ fontSize: 10, color: "#666" }}>{s.customer_name}</div></td>
                      <td style={{ padding: "6px 8px" }}>{fmt(s.total_amount)}</td>
                      <td style={{ padding: "6px 8px", fontWeight: 500 }}>{fmt(s.broker_commission)}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <Badge style={{ fontSize: 10, background: s.commission_paid ? "#dcfce7" : "#fef9c3", color: s.commission_paid ? "#166534" : "#713f12" }}>{s.commission_paid ? "Paid" : "Pending"}</Badge>
                      </td>
                      <td style={{ padding: "6px 8px" }}>
                        {!s.commission_paid && (
                          <Button size="sm" style={{ fontSize: 10 }} onClick={() => markPaid.mutate({ brokerId: selectedBroker.id, saleId: s.id })} disabled={markPaid.isPending}>Mark Paid</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
