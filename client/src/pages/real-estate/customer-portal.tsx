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

export default function CustomerPortalPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [createForm, setCreateForm] = useState<any>({});
  const [createdPortal, setCreatedPortal] = useState<any>(null);

  const { data: bookings = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/bookings"], queryFn: () => api("GET", "/api/real-estate/bookings") });

  const createPortal = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/customer-portal/create", d),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/real-estate/bookings"] });
      setCreatedPortal(data);
      toast({ title: "Customer portal link created", description: "Share the link with the buyer" });
    },
  });

  const activeBookings = bookings.filter((b: any) => b.status === "active");

  return (
    <div style={{ padding: "1.5rem", maxWidth: 900 }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Customer Self-Service Portal</h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>Generate secure portal links — buyers can track payments, download documents, view construction progress</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        {[{ label: "Active Bookings", value: activeBookings.length, color: "#1e40af", bg: "#dbeafe" }, { label: "Portal Links Created", value: bookings.filter((b: any) => b.portal_token).length, color: "#166534", bg: "#dcfce7" }].map(s => (
          <Card key={s.label}><CardContent style={{ padding: 14, textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#555" }}>{s.label}</div>
          </CardContent></Card>
        ))}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>Create Portal Access for Buyer</CardTitle></CardHeader>
        <CardContent>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            <div>
              <Label style={{ fontSize: 11 }}>Select Booking</Label>
              <select value={createForm.booking_id ?? ""} onChange={e => setCreateForm((p: any) => ({ ...p, booking_id: e.target.value }))} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 12, marginTop: 2 }}>
                <option value="">— Select buyer —</option>
                {activeBookings.map((b: any) => <option key={b.id} value={b.id}>{b.customer_name} — Unit {b.unit_no || b.unit_id} ({fmt(b.total_amount)})</option>)}
              </select>
            </div>
            <div>
              <Label style={{ fontSize: 11 }}>Portal Expiry Date (optional)</Label>
              <Input type="date" value={createForm.expiry_date ?? ""} onChange={e => setCreateForm((p: any) => ({ ...p, expiry_date: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
            </div>
          </div>
          <div style={{ marginBottom: 10, background: "#f8faff", border: "1px solid #d0daf5", borderRadius: 6, padding: "8px 12px", fontSize: 12 }}>
            <strong>What the buyer sees in the portal:</strong>
            <ul style={{ margin: "4px 0 0 16px", color: "#555" }}>
              <li>Unit details — type, floor, area, facing</li>
              <li>Payment schedule with due dates and paid status</li>
              <li>Construction progress milestones</li>
              <li>Document list (OC, CC, RERA certificate)</li>
              <li>Demand letters (download PDF)</li>
            </ul>
          </div>
          <Button size="sm" onClick={() => createPortal.mutate(createForm)} disabled={createPortal.isPending || !createForm.booking_id}>
            {createPortal.isPending ? "Creating…" : "Create Portal Link"}
          </Button>
        </CardContent>
      </Card>

      {createdPortal && (
        <Card style={{ marginBottom: 16, border: "2px solid #86efac" }}>
          <CardContent style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 6, color: "#166534" }}>✓ Portal Created Successfully</div>
            <div style={{ fontSize: 13, marginBottom: 8 }}>Share this link with the buyer:</div>
            <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 6, padding: "8px 12px", fontFamily: "monospace", fontSize: 12, wordBreak: "break-all", marginBottom: 8 }}>
              {window.location.origin}/api/real-estate/customer-portal/{createdPortal.token}
            </div>
            <div style={{ fontSize: 12, color: "#555" }}>Token: <code style={{ background: "#f0fdf4", padding: "1px 4px", borderRadius: 3 }}>{createdPortal.token}</code></div>
            <Button size="sm" variant="outline" style={{ marginTop: 8 }} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/real-estate/customer-portal/${createdPortal.token}`); toast({ title: "Link copied to clipboard" }); }}>Copy Link</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>Active Buyer Portals</CardTitle></CardHeader>
        <CardContent style={{ padding: 0 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead><tr style={{ background: "#eef2ff" }}>{["Customer", "Unit", "Total Amount", "Booking Date", "Portal Status", "Link"].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #d0daf5", fontWeight: 600 }}>{h}</th>)}</tr></thead>
            <tbody>
              {activeBookings.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "#888" }}>No active bookings</td></tr>}
              {activeBookings.map((b: any, i) => (
                <tr key={b.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
                  <td style={{ padding: "8px 10px", fontWeight: 500 }}>{b.customer_name}<div style={{ fontSize: 10, color: "#666" }}>{b.customer_phone}</div></td>
                  <td style={{ padding: "8px 10px" }}>{b.unit_no || `Unit ${b.unit_id}`}</td>
                  <td style={{ padding: "8px 10px" }}>{fmt(b.total_amount)}</td>
                  <td style={{ padding: "8px 10px" }}>{fmtDate(b.booking_date)}</td>
                  <td style={{ padding: "8px 10px" }}>
                    <Badge style={{ fontSize: 10, background: b.portal_token ? "#dcfce7" : "#f1f0ec", color: b.portal_token ? "#166534" : "#666" }}>{b.portal_token ? "Active" : "Not created"}</Badge>
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    {b.portal_token && (
                      <Button size="sm" variant="outline" style={{ fontSize: 10 }} onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/api/real-estate/customer-portal/${b.portal_token}`); toast({ title: "Link copied" }); }}>Copy</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
