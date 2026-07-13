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
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-IN") : "—";

export default function SubcontractorsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [tab, setTab] = useState<"vendors" | "work_orders" | "bills">("vendors");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});
  const [projects] = [useQuery<any[]>({ queryKey: ["/api/real-estate/projects"], queryFn: () => api("GET", "/api/real-estate/projects") })];

  const { data: subcontractors = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/subcontractors"], queryFn: () => api("GET", "/api/real-estate/subcontractors") });
  const { data: workOrders = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/subcontract-work-orders"], queryFn: () => api("GET", "/api/real-estate/subcontract-work-orders") });
  const { data: bills = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/subcontract-bills"], queryFn: () => api("GET", "/api/real-estate/subcontract-bills") });

  const saveVendor = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/subcontractors", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/subcontractors"] }); setShowForm(false); setForm({}); toast({ title: "Subcontractor added" }); },
  });

  const saveWorkOrder = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/subcontract-work-orders", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/subcontract-work-orders"] }); setShowForm(false); setForm({}); toast({ title: "Work order created" }); },
  });

  const saveBill = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/subcontract-bills", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/subcontract-bills"] }); setShowForm(false); setForm({}); toast({ title: "Bill recorded" }); },
  });

  const payBill = useMutation({
    mutationFn: ({ id }: any) => api("POST", `/api/real-estate/subcontract-bills/${id}/pay`, { payment_date: new Date().toISOString().slice(0, 10), payment_mode: "NEFT" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/subcontract-bills"] }); toast({ title: "Bill paid — GL posted: Dr Subcontractor Expense / Cr Cash" }); },
  });

  const completeWO = useMutation({
    mutationFn: (id: number) => api("PUT", `/api/real-estate/subcontractor-contracts/${id}/complete`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/subcontract-work-orders"] }); toast({ title: "Work order completed" }); },
  });

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Subcontractor Management</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>Vendors, work orders, bills and GL-posted payments for construction subcontractors</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["vendors", "work_orders", "bills"] as const).map(t => (
          <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => { setTab(t); setShowForm(false); setForm({}); }} style={{ textTransform: "capitalize" }}>
            {t.replace(/_/g, " ")} <Badge style={{ marginLeft: 6, fontSize: 9, background: "rgba(255,255,255,0.2)" }}>{t === "vendors" ? subcontractors.length : t === "work_orders" ? workOrders.length : bills.length}</Badge>
          </Button>
        ))}
        <Button size="sm" variant="outline" onClick={() => { setShowForm(v => !v); setForm({}); }}>
          + {tab === "vendors" ? "Add Vendor" : tab === "work_orders" ? "New Work Order" : "Record Bill"}
        </Button>
      </div>

      {showForm && tab === "vendors" && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>Add Subcontractor</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {[{ key: "name", label: "Firm / Name" }, { key: "contact_person", label: "Contact Person" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email" }, { key: "specialization", label: "Specialization (Civil/MEP/Tiles/Paint)" }, { key: "gstin", label: "GSTIN" }, { key: "pan", label: "PAN" }, { key: "bank_name", label: "Bank Name" }, { key: "bank_account", label: "Account No" }, { key: "bank_ifsc", label: "IFSC" }].map(f => (
                <div key={f.key}>
                  <Label style={{ fontSize: 11 }}>{f.label}</Label>
                  <Input value={form[f.key] ?? ""} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Button size="sm" onClick={() => saveVendor.mutate(form)} disabled={saveVendor.isPending}>{saveVendor.isPending ? "Saving…" : "Save"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && tab === "work_orders" && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>New Work Order</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <Label style={{ fontSize: 11 }}>Project</Label>
                <select value={form.project_id ?? ""} onChange={e => setForm((p: any) => ({ ...p, project_id: e.target.value }))} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 12, marginTop: 2 }}>
                  <option value="">Select project</option>
                  {projects.data?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <Label style={{ fontSize: 11 }}>Subcontractor</Label>
                <select value={form.subcontractor_id ?? ""} onChange={e => setForm((p: any) => ({ ...p, subcontractor_id: e.target.value }))} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 12, marginTop: 2 }}>
                  <option value="">Select subcontractor</option>
                  {subcontractors.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.specialization})</option>)}
                </select>
              </div>
              {[{ key: "work_description", label: "Work Description" }, { key: "start_date", label: "Start Date", type: "date" }, { key: "end_date", label: "End Date", type: "date" }, { key: "contract_value", label: "Contract Value ₹", type: "number" }, { key: "work_order_no", label: "Work Order No" }].map(f => (
                <div key={f.key}>
                  <Label style={{ fontSize: 11 }}>{f.label}</Label>
                  <Input type={f.type || "text"} value={form[f.key] ?? ""} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Button size="sm" onClick={() => saveWorkOrder.mutate(form)} disabled={saveWorkOrder.isPending}>{saveWorkOrder.isPending ? "Saving…" : "Create Work Order"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showForm && tab === "bills" && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>Record Subcontractor Bill</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <Label style={{ fontSize: 11 }}>Work Order</Label>
                <select value={form.work_order_id ?? ""} onChange={e => setForm((p: any) => ({ ...p, work_order_id: e.target.value }))} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 12, marginTop: 2 }}>
                  <option value="">Select work order</option>
                  {workOrders.map((w: any) => <option key={w.id} value={w.id}>{w.work_order_no} — {w.work_description?.slice(0, 40)}</option>)}
                </select>
              </div>
              {[{ key: "bill_no", label: "Bill / Invoice No" }, { key: "bill_date", label: "Bill Date", type: "date" }, { key: "bill_amount", label: "Bill Amount ₹", type: "number" }, { key: "gst_amount", label: "GST Amount ${sym}", type: "number" }, { key: "tds_amount", label: "TDS Amount ${sym}", type: "number" }, { key: "milestone", label: "Milestone (e.g. Slab 1 Complete)" }, { key: "due_date", label: "Due Date", type: "date" }].map(f => (
                <div key={f.key}>
                  <Label style={{ fontSize: 11 }}>{f.label}</Label>
                  <Input type={f.type || "text"} value={form[f.key] ?? ""} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Button size="sm" onClick={() => saveBill.mutate(form)} disabled={saveBill.isPending}>{saveBill.isPending ? "Saving…" : "Record Bill"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "vendors" && (
        <Card><CardContent style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ background: "#eef2ff" }}>{["Name", "Specialization", "Phone", "GSTIN", "PAN", "Status"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #d0daf5", fontWeight: 600 }}>{h}</th>)}</tr></thead>
            <tbody>
              {subcontractors.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#888" }}>No subcontractors yet</td></tr>}
              {subcontractors.map((s: any, i) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 500 }}>{s.name}<div style={{ fontSize: 10, color: "#666" }}>{s.contact_person}</div></td>
                  <td style={{ padding: "8px 10px" }}><Badge style={{ fontSize: 10, background: "#eef2ff", color: "#1e40af" }}>{s.specialization}</Badge></td>
                  <td style={{ padding: "8px 10px" }}>{s.phone}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11 }}>{s.gstin || "—"}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11 }}>{s.pan || "—"}</td>
                  <td style={{ padding: "8px 10px" }}><Badge style={{ fontSize: 10, background: s.status === "active" ? "#dcfce7" : "#fde0e0", color: s.status === "active" ? "#166534" : "#991b1b" }}>{s.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {tab === "work_orders" && (
        <Card><CardContent style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ background: "#eef2ff" }}>{["WO No", "Subcontractor", "Description", "Start", "End", "Value", "Status", ""].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #d0daf5", fontWeight: 600 }}>{h}</th>)}</tr></thead>
            <tbody>
              {workOrders.length === 0 && <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: "#888" }}>No work orders yet</td></tr>}
              {workOrders.map((w: any, i) => (
                <tr key={w.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
                  <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11 }}>{w.work_order_no}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 500 }}>{w.subcontractor_name || `Sub ${w.subcontractor_id}`}</td>
                  <td style={{ padding: "8px 10px" }}>{w.work_description?.slice(0, 50)}{w.work_description?.length > 50 ? "…" : ""}</td>
                  <td style={{ padding: "8px 10px" }}>{fmtDate(w.start_date)}</td>
                  <td style={{ padding: "8px 10px" }}>{fmtDate(w.end_date)}</td>
                  <td style={{ padding: "8px 10px", fontWeight: 600 }}>{fmt(w.contract_value)}</td>
                  <td style={{ padding: "8px 10px" }}><Badge style={{ fontSize: 10, background: w.status === "completed" ? "#dcfce7" : w.status === "active" ? "#dbeafe" : "#fef9c3", color: w.status === "completed" ? "#166534" : w.status === "active" ? "#1e40af" : "#713f12" }}>{w.status}</Badge></td>
                  <td style={{ padding: "8px 10px" }}>
                    {w.status === "active" && <Button size="sm" variant="outline" style={{ fontSize: 10 }} onClick={() => completeWO.mutate(w.id)}>Complete</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      )}

      {tab === "bills" && (
        <Card><CardContent style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ background: "#eef2ff" }}>{["Bill No", "Subcontractor", "Milestone", "Bill Date", "Amount", "GST", "TDS", "Net Payable", "Status", ""].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #d0daf5", fontWeight: 600 }}>{h}</th>)}</tr></thead>
            <tbody>
              {bills.length === 0 && <tr><td colSpan={10} style={{ padding: 24, textAlign: "center", color: "#888" }}>No bills yet</td></tr>}
              {bills.map((b: any, i) => {
                const netPayable = (Number(b.bill_amount) || 0) + (Number(b.gst_amount) || 0) - (Number(b.tds_amount) || 0);
                return (
                  <tr key={b.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11 }}>{b.bill_no}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 500 }}>{b.subcontractor_name || `Sub ${b.subcontractor_id}`}</td>
                    <td style={{ padding: "8px 10px" }}>{b.milestone}</td>
                    <td style={{ padding: "8px 10px" }}>{fmtDate(b.bill_date)}</td>
                    <td style={{ padding: "8px 10px" }}>{fmt(b.bill_amount)}</td>
                    <td style={{ padding: "8px 10px" }}>{fmt(b.gst_amount)}</td>
                    <td style={{ padding: "8px 10px" }}>{fmt(b.tds_amount)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{fmt(netPayable)}</td>
                    <td style={{ padding: "8px 10px" }}><Badge style={{ fontSize: 10, background: b.status === "paid" ? "#dcfce7" : b.status === "approved" ? "#dbeafe" : "#fef9c3", color: b.status === "paid" ? "#166534" : b.status === "approved" ? "#1e40af" : "#713f12" }}>{b.status}</Badge></td>
                    <td style={{ padding: "8px 10px" }}>
                      {b.status === "approved" && <Button size="sm" style={{ fontSize: 10 }} onClick={() => payBill.mutate({ id: b.id })} disabled={payBill.isPending}>Pay</Button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}
