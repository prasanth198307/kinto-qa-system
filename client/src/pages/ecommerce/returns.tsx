import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const API = "/api/ecommerce";

const typeBadge: Record<string, string> = { return: "#f97316", rto: "#ef4444", exchange: "#3b82f6" };
const statusBadge: Record<string, string> = { pending: "#eab308", approved: "#3b82f6", rejected: "#ef4444", processed: "#8b5cf6", refunded: "#22c55e" };

type Return = { id: number; return_number: string; order_number: string; customer_name: string; channel_name: string; return_type: string; reason: string; amount: number; status: string; created_at: string };
type Order = { id: number; order_number: string; customer_name: string };

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>{label}</span>;
}

const empty = { order_id: "", return_type: "return", reason: "", amount: "", status: "pending" };

export default function ReturnsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Return | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [search, setSearch] = useState("");

  const { data: returns = [] } = useQuery<Return[]>({ queryKey: ["ecom-returns"], queryFn: () => fetch(`${API}/returns`).then(r => r.json()) });
  const { data: orders = [] } = useQuery<Order[]>({ queryKey: ["ecom-orders"], queryFn: () => fetch(`${API}/orders`).then(r => r.json()) });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["ecom-returns"] });

  const createMut = useMutation({
    mutationFn: (body: object) => fetch(`${API}/returns`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { invalidate(); setModal(false); toast({ title: "Return raised" }); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => fetch(`${API}/returns/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: (_, vars: any) => { invalidate(); setEditing(null); const msg = (vars.body as any).status === "approved" ? "Approved — GL posted ✓" : "Updated"; toast({ title: msg }); },
  });

  const filtered = returns.filter(r =>
    (!filterStatus || r.status === filterStatus) &&
    (!filterType || r.return_type === filterType) &&
    (!search || r.return_number.toLowerCase().includes(search.toLowerCase()) || r.customer_name.toLowerCase().includes(search.toLowerCase()))
  );

  const kpis = [
    { label: "Total Returns", value: returns.length },
    { label: "RTO Count", value: returns.filter(r => r.return_type === "rto").length },
    { label: "Pending Approval", value: returns.filter(r => r.status === "pending").length },
    { label: "Total Refund Value", value: "₹" + returns.filter(r => r.status === "refunded").reduce((s, r) => s + Number(r.amount), 0).toLocaleString("en-IN") },
  ];

  const openCreate = () => { setForm({ ...empty }); setEditing(null); setModal(true); };
  const openEdit = (r: Return) => { setEditing(r); setForm({ order_id: "", return_type: r.return_type, reason: r.reason, amount: String(r.amount), status: r.status }); setModal(true); };

  const submit = () => {
    if (editing) {
      updateMut.mutate({ id: editing.id, body: { return_type: form.return_type, reason: form.reason, amount: Number(form.amount), status: form.status } });
    } else {
      createMut.mutate({ order_id: Number(form.order_id), return_type: form.return_type, reason: form.reason, amount: Number(form.amount), status: form.status });
    }
  };

  const inp = { border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", width: "100%", fontSize: 14 };
  const th = { padding: "10px 12px", textAlign: "left" as const, fontSize: 12, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb" };
  const td = { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #f3f4f6" };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Returns & RTO</h1>
          <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 13 }}>RMA workflow — approve, process, refund</p>
        </div>
        <button onClick={openCreate} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>+ Raise Return</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "16px 20px" }}>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input placeholder="Search return # or customer…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, width: 240 }} />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inp, width: 140 }}>
          <option value="">All Statuses</option>
          {["pending","approved","rejected","processed","refunded"].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ ...inp, width: 140 }}>
          <option value="">All Types</option>
          {["return","rto","exchange"].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>{["Return #","Order #","Customer","Channel","Type","Reason","Amount","Status","Date","Actions"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id}>
                <td style={td}><b>{r.return_number}</b></td>
                <td style={td}>{r.order_number}</td>
                <td style={td}>{r.customer_name}</td>
                <td style={td}>{r.channel_name}</td>
                <td style={td}><Badge label={r.return_type.toUpperCase()} color={typeBadge[r.return_type] || "#6b7280"} /></td>
                <td style={{ ...td, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.reason}</td>
                <td style={td}>₹{Number(r.amount).toLocaleString("en-IN")}</td>
                <td style={td}><Badge label={r.status} color={statusBadge[r.status] || "#6b7280"} />{r.status === "approved" && <span style={{ fontSize: 11, color: "#22c55e", marginLeft: 6 }}>✓ GL posted</span>}</td>
                <td style={td}>{new Date(r.created_at).toLocaleDateString("en-IN")}</td>
                <td style={td}>
                  {r.status === "pending" && <button onClick={() => updateMut.mutate({ id: r.id, body: { return_type: r.return_type, reason: r.reason, amount: r.amount, status: "approved" } })} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12, marginRight: 4 }}>Approve</button>}
                  {r.status === "approved" && <button onClick={() => updateMut.mutate({ id: r.id, body: { return_type: r.return_type, reason: r.reason, amount: r.amount, status: "processed" } })} style={{ background: "#8b5cf6", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12, marginRight: 4 }}>Process Refund</button>}
                  <button onClick={() => openEdit(r)} style={{ background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Edit</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: "center", color: "#9ca3af", padding: 32 }}>No returns found</td></tr>}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 480, boxShadow: "0 20px 60px #0003" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>{editing ? "Edit Return" : "Raise Return"}</h2>
            <div style={{ display: "grid", gap: 14 }}>
              {!editing && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Order</label>
                  <select value={form.order_id} onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))} style={inp}>
                    <option value="">Select order…</option>
                    {orders.map(o => <option key={o.id} value={o.id}>{o.order_number} — {o.customer_name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Return Type</label>
                <select value={form.return_type} onChange={e => setForm(f => ({ ...f, return_type: e.target.value }))} style={inp}>
                  {["return","rto","exchange"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Reason</label>
                <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ ...inp, height: 72, resize: "vertical" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Amount (₹)</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inp}>
                  {["pending","approved","rejected","processed","refunded"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setModal(false)} style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 16px", cursor: "pointer" }}>Cancel</button>
              <button onClick={submit} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>
                {editing ? "Update" : "Raise Return"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
