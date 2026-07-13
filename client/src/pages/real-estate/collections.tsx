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

export default function CollectionsPage() {
  const fmt = (n: any) => n != null ? `${sym}${Number(n).toLocaleString("en-IN")}` : "—";
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [selectedSched, setSelectedSched] = useState<any>(null);
  const [payForm, setPayForm] = useState<any>({});
  const [filter, setFilter] = useState("pending");

  const { data: schedules = [] } = useQuery<any[]>({
    queryKey: ["/api/real-estate/payment-schedules"],
    queryFn: () => api("GET", "/api/real-estate/payment-schedules"),
  });

  const recordPayment = useMutation({
    mutationFn: ({ id, data }: any) => api("POST", `/api/real-estate/payment-schedules/${id}/record-payment`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/real-estate/payment-schedules"] });
      setSelectedSched(null); setPayForm({});
      toast({ title: "Payment recorded", description: "GL journal entry posted automatically" });
    },
    onError: () => toast({ title: "Error recording payment", variant: "destructive" }),
  });

  const filtered = schedules.filter((s: any) => filter === "all" ? true : filter === "overdue" ? s.status === "overdue" : filter === "paid" ? s.status === "paid" : s.status === "pending" || s.status === "overdue");

  const totalPending = schedules.filter((s: any) => s.status !== "paid").reduce((sum: number, s: any) => sum + (Number(s.amount) || 0), 0);
  const totalCollected = schedules.filter((s: any) => s.status === "paid").reduce((sum: number, s: any) => sum + (Number(s.paid_amount) || 0), 0);
  const overdueCount = schedules.filter((s: any) => s.status === "overdue").length;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Collections — Payment Recovery</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>Record payments against milestones — auto GL journal post on each collection</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[{ label: "Total Collected", value: fmt(totalCollected), color: "#166534", bg: "#dcfce7" }, { label: "Pending", value: fmt(totalPending), color: "#713f12", bg: "#fef9c3" }, { label: "Overdue Milestones", value: overdueCount, color: "#991b1b", bg: "#fde0e0" }, { label: "Total Milestones", value: schedules.length, color: "#1e40af", bg: "#dbeafe" }].map(s => (
          <Card key={s.label}><CardContent style={{ padding: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#555" }}>{s.label}</div>
          </CardContent></Card>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        {["pending", "overdue", "paid", "all"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} style={{ textTransform: "capitalize" }}>{f}</Button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selectedSched ? "1fr 360px" : "1fr", gap: 16 }}>
        <Card>
          <CardContent style={{ padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "#eef2ff" }}>{["Booking / Customer", "Milestone", "Due Date", "Amount", "Paid", "Status", "Action"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #d0daf5", fontWeight: 600 }}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "#888" }}>No records</td></tr>}
                {filtered.map((s: any, i) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #e2e8f0", background: selectedSched?.id === s.id ? "#eef2ff" : i % 2 ? "#f8faff" : "#fff" }}>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ fontWeight: 500 }}>{s.customer_name || `Booking #${s.booking_id}`}</div>
                      <div style={{ fontSize: 10, color: "#666" }}>{s.unit_no || ""}</div>
                    </td>
                    <td style={{ padding: "8px 10px" }}>{s.milestone}</td>
                    <td style={{ padding: "8px 10px", color: s.status === "overdue" ? "#dc2626" : undefined }}>{fmtDate(s.due_date)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 500 }}>{fmt(s.amount)}</td>
                    <td style={{ padding: "8px 10px" }}>{fmt(s.paid_amount)}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <Badge style={{ fontSize: 10, background: s.status === "paid" ? "#dcfce7" : s.status === "overdue" ? "#fde0e0" : "#fef9c3", color: s.status === "paid" ? "#166534" : s.status === "overdue" ? "#991b1b" : "#713f12" }}>{s.status}</Badge>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      {s.status !== "paid" && (
                        <Button size="sm" style={{ fontSize: 11 }} onClick={() => { setSelectedSched(s); setPayForm({ paid_date: new Date().toISOString().slice(0, 10), paid_amount: s.amount, payment_mode: "NEFT" }); }}>
                          Collect
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {selectedSched && (
          <Card style={{ height: "fit-content" }}>
            <CardHeader style={{ paddingBottom: 8 }}>
              <CardTitle style={{ fontSize: 14 }}>Record Payment</CardTitle>
              <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>{selectedSched.milestone} — {fmt(selectedSched.amount)}</p>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[{ key: "paid_date", label: "Payment Date", type: "date" }, { key: "paid_amount", label: "Amount Received ${sym}", type: "number" }].map(f => (
                  <div key={f.key}>
                    <Label style={{ fontSize: 11 }}>{f.label}</Label>
                    <Input type={f.type || "text"} value={payForm[f.key] ?? ""} onChange={e => setPayForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                  </div>
                ))}
                <div>
                  <Label style={{ fontSize: 11 }}>Payment Mode</Label>
                  <select value={payForm.payment_mode ?? "NEFT"} onChange={e => setPayForm((p: any) => ({ ...p, payment_mode: e.target.value }))} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 12, marginTop: 2 }}>
                    {["NEFT", "RTGS", "Cheque", "Cash", "UPI", "DD"].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <Label style={{ fontSize: 11 }}>Reference / UTR No</Label>
                  <Input value={payForm.notes ?? ""} onChange={e => setPayForm((p: any) => ({ ...p, notes: e.target.value }))} placeholder="UTR / Cheque no" style={{ fontSize: 12, marginTop: 2 }} />
                </div>
                <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 4, padding: "6px 10px", fontSize: 11, color: "#166534" }}>
                  ✓ GL journal will be auto-posted: Dr Receivables / Cr Revenue
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button size="sm" onClick={() => recordPayment.mutate({ id: selectedSched.id, data: payForm })} disabled={recordPayment.isPending}>
                    {recordPayment.isPending ? "Posting…" : "Record & Post GL"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedSched(null)}>Cancel</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
