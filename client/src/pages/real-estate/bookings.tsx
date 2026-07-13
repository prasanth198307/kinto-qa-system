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

const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-IN") : "—";

export default function BookingsPage() {
  const fmt = (n: any) => n != null ? `${sym}${Number(n).toLocaleString("en-IN")}` : "—";
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [showForm, setShowForm] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [schedForm, setSchedForm] = useState<any>({});
  const [showSchedForm, setShowSchedForm] = useState(false);

  const { data: bookings = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/bookings"], queryFn: () => api("GET", "/api/real-estate/bookings") });
  const { data: units = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/units"], queryFn: () => api("GET", "/api/real-estate/units") });
  const { data: brokers = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/brokers"], queryFn: () => api("GET", "/api/real-estate/brokers") });
  const { data: schedules = [] } = useQuery<any[]>({
    queryKey: ["/api/real-estate/payment-schedules", selectedBooking?.id],
    queryFn: () => api("GET", `/api/real-estate/payment-schedules/${selectedBooking.id}`),
    enabled: !!selectedBooking,
  });

  const saveBooking = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/bookings", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/bookings"] }); setShowForm(false); setForm({}); toast({ title: "Booking created" }); },
  });

  const cancelBooking = useMutation({
    mutationFn: ({ id, reason }: any) => api("POST", `/api/real-estate/bookings/${id}/cancel`, { cancellation_reason: reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/bookings"] }); toast({ title: "Booking cancelled" }); },
  });

  const addSchedule = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/payment-schedules", { ...d, booking_id: selectedBooking.id }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/payment-schedules", selectedBooking?.id] }); setShowSchedForm(false); setSchedForm({}); toast({ title: "Payment milestone added" }); },
  });

  const availableUnits = units.filter((u: any) => u.status === "available" || u.status === "blocked");

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Bookings & Payment Schedules</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>Unit bookings, customer details, milestone payment tracking</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setForm({}); }}>+ New Booking</Button>
      </div>

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>New Booking</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <Label style={{ fontSize: 11 }}>Unit</Label>
                <select value={form.unit_id ?? ""} onChange={e => setForm((p: any) => ({ ...p, unit_id: e.target.value }))} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 12, marginTop: 2 }}>
                  <option value="">Select unit</option>
                  {availableUnits.map((u: any) => <option key={u.id} value={u.id}>{u.unit_no} — {u.unit_type} ({fmt(u.current_price)})</option>)}
                </select>
              </div>
              <div>
                <Label style={{ fontSize: 11 }}>Broker</Label>
                <select value={form.broker_id ?? ""} onChange={e => setForm((p: any) => ({ ...p, broker_id: e.target.value }))} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 12, marginTop: 2 }}>
                  <option value="">None</option>
                  {brokers.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              {[{ key: "customer_name", label: "Customer Name" }, { key: "customer_phone", label: "Phone" }, { key: "customer_email", label: "Email" }, { key: "customer_address", label: "Address" }, { key: "booking_date", label: "Booking Date", type: "date" }, { key: "total_amount", label: "Total Amount ${sym}", type: "number" }, { key: "booking_amount", label: "Booking Amount ${sym}", type: "number" }, { key: "loan_amount", label: "Loan Amount ${sym}", type: "number" }, { key: "bank_name", label: "Bank Name" }, { key: "broker_commission", label: "Broker Commission ${sym}", type: "number" }, { key: "agreement_date", label: "Agreement Date", type: "date" }, { key: "possession_date", label: "Possession Date", type: "date" }].map(f => (
                <div key={f.key}>
                  <Label style={{ fontSize: 11 }}>{f.label}</Label>
                  <Input type={f.type || "text"} value={form[f.key] ?? ""} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Button size="sm" onClick={() => saveBooking.mutate(form)} disabled={saveBooking.isPending}>{saveBooking.isPending ? "Saving…" : "Confirm Booking"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selectedBooking ? "1fr 1fr" : "1fr", gap: 16 }}>
        <Card>
          <CardContent style={{ padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "#eef2ff" }}>{["Customer", "Unit", "Booking Date", "Total", "Booking Amt", "Status", ""].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #d0daf5", fontWeight: 600 }}>{h}</th>)}</tr></thead>
              <tbody>
                {bookings.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#888" }}>No bookings yet</td></tr>}
                {bookings.map((b: any, i) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid #e2e8f0", background: selectedBooking?.id === b.id ? "#eef2ff" : i % 2 ? "#f8faff" : "#fff", cursor: "pointer" }} onClick={() => setSelectedBooking(b)}>
                    <td style={{ padding: "8px 10px", fontWeight: 500 }}>{b.customer_name}<div style={{ fontSize: 10, color: "#666" }}>{b.customer_phone}</div></td>
                    <td style={{ padding: "8px 10px" }}>{b.unit_no || `Unit ${b.unit_id}`}</td>
                    <td style={{ padding: "8px 10px" }}>{fmtDate(b.booking_date)}</td>
                    <td style={{ padding: "8px 10px" }}>{fmt(b.total_amount)}</td>
                    <td style={{ padding: "8px 10px" }}>{fmt(b.booking_amount)}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <Badge style={{ fontSize: 10, background: b.status === "active" ? "#dcfce7" : b.status === "cancelled" ? "#fde0e0" : "#fef9c3", color: b.status === "active" ? "#166534" : b.status === "cancelled" ? "#991b1b" : "#713f12" }}>{b.status}</Badge>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {b.status === "active" && <Button size="sm" variant="outline" style={{ fontSize: 10, color: "#dc2626" }} onClick={e => { e.stopPropagation(); if (confirm("Cancel booking?")) cancelBooking.mutate({ id: b.id, reason: "Customer request" }); }}>Cancel</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {selectedBooking && (
          <Card>
            <CardHeader style={{ paddingBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <CardTitle style={{ fontSize: 14 }}>Payment Schedule — {selectedBooking.customer_name}</CardTitle>
                <div style={{ display: "flex", gap: 6 }}>
                  <Button size="sm" style={{ fontSize: 11 }} onClick={() => setShowSchedForm(v => !v)}>+ Milestone</Button>
                  <Button size="sm" variant="outline" style={{ fontSize: 11 }} onClick={() => setSelectedBooking(null)}>Close</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showSchedForm && (
                <div style={{ background: "#f8faff", border: "1px solid #d0daf5", borderRadius: 6, padding: 10, marginBottom: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    {[{ key: "milestone", label: "Milestone" }, { key: "due_date", label: "Due Date", type: "date" }, { key: "amount", label: "Amount ${sym}", type: "number" }, { key: "notes", label: "Notes" }].map(f => (
                      <div key={f.key}>
                        <Label style={{ fontSize: 11 }}>{f.label}</Label>
                        <Input type={f.type || "text"} value={schedForm[f.key] ?? ""} onChange={e => setSchedForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                      </div>
                    ))}
                  </div>
                  <Button size="sm" onClick={() => addSchedule.mutate(schedForm)} disabled={addSchedule.isPending}>{addSchedule.isPending ? "Saving…" : "Add"}</Button>
                </div>
              )}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr style={{ background: "#f0f4ff" }}>{["Milestone", "Due Date", "Amount", "Paid", "Status"].map(h => <th key={h} style={{ padding: "6px 8px", textAlign: "left", borderBottom: "1px solid #d0daf5" }}>{h}</th>)}</tr></thead>
                <tbody>
                  {schedules.length === 0 && <tr><td colSpan={5} style={{ padding: 12, textAlign: "center", color: "#888" }}>No milestones</td></tr>}
                  {schedules.map((s: any, i) => (
                    <tr key={s.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
                      <td style={{ padding: "6px 8px" }}>{s.milestone}</td>
                      <td style={{ padding: "6px 8px" }}>{fmtDate(s.due_date)}</td>
                      <td style={{ padding: "6px 8px" }}>{fmt(s.amount)}</td>
                      <td style={{ padding: "6px 8px" }}>{fmt(s.paid_amount)}</td>
                      <td style={{ padding: "6px 8px" }}>
                        <Badge style={{ fontSize: 10, background: s.status === "paid" ? "#dcfce7" : s.status === "overdue" ? "#fde0e0" : "#fef9c3", color: s.status === "paid" ? "#166534" : s.status === "overdue" ? "#991b1b" : "#713f12" }}>{s.status}</Badge>
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
