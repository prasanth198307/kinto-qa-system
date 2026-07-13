import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const fmt = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const EMPTY = { bill_no: "", trip_id: "", amount: "", gst_rate: "18", status: "unpaid", notes: "" };

export default function FreightPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [glNote, setGlNote] = useState<Record<number, string>>({});

  const { data: bills = [] } = useQuery({ queryKey: ["/api/logistics/freight-bills"], queryFn: () => api("GET", "/api/logistics/freight-bills") });
  const { data: trips = [] } = useQuery({ queryKey: ["/api/logistics/trips"], queryFn: () => api("GET", "/api/logistics/trips") });

  const saveMut = useMutation({
    mutationFn: (data: any) => editing
      ? api("PUT", `/api/logistics/freight-bills/${editing.id}`, data)
      : api("POST", "/api/logistics/freight-bills", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/logistics/freight-bills"] }); setShowForm(false); toast({ title: "Freight bill saved" }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/logistics/freight-bills/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/logistics/freight-bills"] }),
  });

  const postGlMut = useMutation({
    mutationFn: (id: number) => api("POST", `/api/logistics/freight-bills/${id}/post-gl`),
    onSuccess: (_, id) => {
      setGlNote(prev => ({ ...prev, [id]: "GL posted: DR Accounts Receivable / CR Freight Revenue" }));
      qc.invalidateQueries({ queryKey: ["/api/logistics/freight-bills"] });
      toast({ title: "GL entry posted successfully" });
    },
    onError: () => toast({ title: "GL post failed", variant: "destructive" }),
  });

  function openAdd() { setEditing(null); setForm(EMPTY); setShowForm(true); }
  function openEdit(b: any) { setEditing(b); setForm({ ...b }); setShowForm(true); }
  const set = (k: string) => (e: any) => setForm((f: any) => ({ ...f, [k]: e.target?.value ?? e }));

  const tripMap = Object.fromEntries((Array.isArray(trips) ? trips : []).map((t: any) => [t.id, t.trip_no]));
  const list = Array.isArray(bills) ? bills : [];

  const totalAmount = list.reduce((s: number, b: any) => s + (Number(b.amount) || 0), 0);
  const totalGst = list.reduce((s: number, b: any) => s + (Number(b.gst_amount) || 0), 0);
  const totalPaid = list.filter((b: any) => b.status === "paid").reduce((s: number, b: any) => s + (Number(b.amount) || 0) + (Number(b.gst_amount) || 0), 0);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Freight Bills</h1>
        <Button onClick={openAdd}>+ New Bill</Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <Card><CardContent style={{ paddingTop: 20 }}><div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(totalAmount)}</div><div style={{ color: "#6b7280", fontSize: 13 }}>Total Freight</div></CardContent></Card>
        <Card><CardContent style={{ paddingTop: 20 }}><div style={{ fontSize: 22, fontWeight: 700 }}>{fmt(totalGst)}</div><div style={{ color: "#6b7280", fontSize: 13 }}>Total GST</div></CardContent></Card>
        <Card><CardContent style={{ paddingTop: 20 }}><div style={{ fontSize: 22, fontWeight: 700, color: "#22c55e" }}>{fmt(totalPaid)}</div><div style={{ color: "#6b7280", fontSize: 13 }}>Collected</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Freight Bills ({list.length})</CardTitle></CardHeader>
        <CardContent>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb", background: "#f9fafb" }}>
                  {["Bill No", "Trip", "Amount", "GST Rate", "GST Amt", "Total", "Status", "Actions"].map(h => (
                    <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((b: any) => {
                  const gstAmt = b.gst_amount ?? (Number(b.amount) * Number(b.gst_rate || 0) / 100);
                  const total = (Number(b.amount) || 0) + gstAmt;
                  return (
                    <tr key={b.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>{b.bill_no}</td>
                      <td style={{ padding: "8px 12px" }}>{tripMap[b.trip_id] || b.trip_id || "—"}</td>
                      <td style={{ padding: "8px 12px" }}>{fmt(b.amount)}</td>
                      <td style={{ padding: "8px 12px" }}>{b.gst_rate}%</td>
                      <td style={{ padding: "8px 12px" }}>{fmt(gstAmt)}</td>
                      <td style={{ padding: "8px 12px", fontWeight: 600 }}>{fmt(total)}</td>
                      <td style={{ padding: "8px 12px" }}>
                        <Badge variant={b.status === "paid" ? "default" : "secondary"}>{b.status}</Badge>
                      </td>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ display: "flex", gap: 4 }}>
                          <Button size="sm" variant="outline" onClick={() => openEdit(b)}>Edit</Button>
                          {b.status !== "gl_posted" && (
                            <Button size="sm" variant="outline" style={{ borderColor: "#6366f1", color: "#6366f1" }}
                              onClick={() => postGlMut.mutate(b.id)} disabled={postGlMut.isPending}>
                              Post GL
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => deleteMut.mutate(b.id)}>Del</Button>
                        </div>
                        {glNote[b.id] && <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4 }}>{glNote[b.id]}</div>}
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && <tr><td colSpan={8} style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>No freight bills found.</td></tr>}
              </tbody>
            </table>
          </div>
          <Alert style={{ marginTop: 12, borderColor: "#6366f1", background: "#f5f3ff" }}>
            <AlertDescription style={{ fontSize: 12 }}>
              GL Posting: Post GL fires <strong>DR Accounts Receivable / CR Freight Revenue</strong> in the accounting ledger.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent style={{ maxWidth: 480 }}>
          <DialogHeader><DialogTitle>{editing ? "Edit Freight Bill" : "New Freight Bill"}</DialogTitle></DialogHeader>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Label>Bill No</Label><Input value={form.bill_no} onChange={set("bill_no")} /></div>
            <div><Label>Amount (${sym})</Label><Input type="number" value={form.amount} onChange={set("amount")} /></div>
            <div>
              <Label>Trip</Label>
              <Select value={String(form.trip_id || "")} onValueChange={v => setForm((f: any) => ({ ...f, trip_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select trip" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {(Array.isArray(trips) ? trips : []).map((t: any) => <SelectItem key={t.id} value={String(t.id)}>{t.trip_no}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>GST Rate (%)</Label>
              <Select value={String(form.gst_rate || "18")} onValueChange={v => setForm((f: any) => ({ ...f, gst_rate: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["0", "5", "12", "18"].map(r => <SelectItem key={r} value={r}>{r}%</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm((f: any) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["unpaid", "paid", "cancelled"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div style={{ gridColumn: "1/-1" }}><Label>Notes</Label><Input value={form.notes} onChange={set("notes")} /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
