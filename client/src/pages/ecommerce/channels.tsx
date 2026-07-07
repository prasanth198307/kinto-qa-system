import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const api = (path: string, opts?: RequestInit) =>
  fetch(path, { headers: { "Content-Type": "application/json" }, ...opts }).then(r => r.json());

const PLATFORM_META: Record<string, { emoji: string; label: string; help: Record<string, string> }> = {
  amazon:     { emoji: "📦", label: "Amazon",     help: { api_key: "SP-API Access Key from Seller Central", api_secret: "SP-API Secret Key", seller_id: "Seller ID (AXXXXX format)" } },
  flipkart:   { emoji: "🛒", label: "Flipkart",   help: { api_key: "API Key from Flipkart Seller Hub", api_secret: "API Secret from Seller Hub" } },
  meesho:     { emoji: "🛍️", label: "Meesho",     help: { api_key: "API Token from Meesho Partner Panel", api_secret: "App Secret from Partner Panel" } },
  shopify:    { emoji: "🏪", label: "Shopify",    help: { api_key: "Admin API Access Token", api_secret: "API Secret Key" } },
  woocommerce:{ emoji: "🛒", label: "WooCommerce",help: { api_key: "Consumer Key from WooCommerce REST API", api_secret: "Consumer Secret" } },
  direct:     { emoji: "⚡", label: "Direct",     help: { api_key: "Internal API Key", api_secret: "Internal Secret" } },
  manual:     { emoji: "✍️", label: "Manual",     help: { api_key: "Not required", api_secret: "Not required" } },
};

const PLATFORMS = Object.keys(PLATFORM_META);

const blank = { name: "", platform: "amazon", api_key: "", api_secret: "", seller_id: "", marketplace_id: "", is_active: true };

export default function ChannelsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [modal, setModal] = useState<{ open: boolean; editing: any | null }>({ open: false, editing: null });
  const [form, setForm] = useState({ ...blank });

  const { data: channels = [], isLoading } = useQuery<any[]>({
    queryKey: ["ecommerce-channels"],
    queryFn: () => api("/api/ecommerce/channels"),
  });

  const save = useMutation({
    mutationFn: (f: any) =>
      f.id
        ? api(`/api/ecommerce/channels/${f.id}`, { method: "PUT", body: JSON.stringify(f) })
        : api("/api/ecommerce/channels", { method: "POST", body: JSON.stringify(f) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ecommerce-channels"] }); closeModal(); toast({ title: "Channel saved" }); },
    onError: () => toast({ title: "Error saving channel", variant: "destructive" }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/api/ecommerce/channels/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ecommerce-channels"] }); toast({ title: "Channel deleted" }); },
  });

  const syncOrders = useMutation({
    mutationFn: (platform: string) => api(`/api/ecommerce/marketplace/orders?channel=${platform}`),
    onSuccess: (_, platform) => toast({ title: `Synced orders from ${platform}` }),
    onError: () => toast({ title: "Sync failed", variant: "destructive" }),
  });

  const openAdd = () => { setForm({ ...blank }); setModal({ open: true, editing: null }); };
  const openEdit = (ch: any) => { setForm({ ...ch }); setModal({ open: true, editing: ch }); };
  const closeModal = () => setModal({ open: false, editing: null });

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const meta = (p: string) => PLATFORM_META[p] || { emoji: "🔗", label: p, help: {} };

  const s: Record<string, any> = {
    page: { padding: 24, fontFamily: "sans-serif", background: "#f8f9fa", minHeight: "100vh" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    title: { margin: 0, fontSize: 22, fontWeight: 700 },
    btn: { padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 14 },
    btnPrimary: { background: "#2563eb", color: "#fff" },
    btnDanger: { background: "#ef4444", color: "#fff" },
    btnGhost: { background: "#e5e7eb", color: "#111" },
    btnSm: { padding: "4px 10px", fontSize: 12, borderRadius: 4, border: "none", cursor: "pointer" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 },
    card: { background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb" },
    badge: (active: boolean) => ({ display: "inline-block", padding: "2px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600, background: active ? "#dcfce7" : "#f1f5f9", color: active ? "#166534" : "#6b7280" }),
    connected: { fontSize: 12, color: "#16a34a", fontWeight: 600 },
    notconf: { fontSize: 12, color: "#9ca3af" },
    overlay: { position: "fixed" as const, inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" },
    dialog: { background: "#fff", borderRadius: 10, padding: 28, width: 480, maxHeight: "90vh", overflowY: "auto" as const, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" },
    label: { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4, color: "#374151" },
    input: { width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 14, boxSizing: "border-box" as const },
    help: { fontSize: 11, color: "#6b7280", marginTop: 3 },
    infoBox: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 14, marginTop: 32 },
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Marketplace Channels</h1>
        <button style={{ ...s.btn, ...s.btnPrimary }} onClick={openAdd}>+ Add Channel</button>
      </div>

      {isLoading && <p style={{ color: "#6b7280" }}>Loading channels...</p>}

      <div style={s.grid}>
        {channels.map((ch: any) => {
          const m = meta(ch.platform);
          return (
            <div key={ch.id} style={s.card}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>{m.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{ch.name}</div>
                  <span style={s.badge(ch.is_active)}>{ch.is_active ? "Active" : "Inactive"}</span>
                  {" "}
                  <span style={{ fontSize: 11, background: "#f1f5f9", padding: "2px 8px", borderRadius: 10, color: "#374151" }}>{m.label}</span>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                {ch.api_key
                  ? <span style={s.connected}>✓ Connected</span>
                  : <span style={s.notconf}>Not configured</span>}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                <button style={{ ...s.btnSm, background: "#2563eb", color: "#fff" }} onClick={() => openEdit(ch)}>Edit</button>
                <button style={{ ...s.btnSm, background: "#ef4444", color: "#fff" }} onClick={() => { if (confirm("Delete channel?")) del.mutate(ch.id); }}>Delete</button>
                <button style={{ ...s.btnSm, background: "#f3f4f6", color: "#111" }} onClick={() => syncOrders.mutate(ch.platform)} disabled={syncOrders.isPending}>
                  {syncOrders.isPending ? "Syncing..." : "↻ Sync Orders"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={s.infoBox}>
        <strong style={{ fontSize: 14 }}>🚚 Configure Shipping Integrations</strong>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#1e40af" }}>
          Shiprocket and Delhivery credentials are managed under <strong>Masters → Integration Credentials</strong>.
        </p>
      </div>

      {modal.open && (
        <div style={s.overlay} onClick={closeModal}>
          <div style={s.dialog} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18 }}>{modal.editing ? "Edit Channel" : "Add Channel"}</h2>
            {[
              { key: "name", label: "Channel Name", type: "text" },
            ].map(({ key, label, type }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={s.label}>{label}</label>
                <input style={s.input} type={type} value={(form as any)[key]} onChange={e => set(key, e.target.value)} />
              </div>
            ))}
            <div style={{ marginBottom: 14 }}>
              <label style={s.label}>Platform</label>
              <select style={s.input} value={form.platform} onChange={e => set("platform", e.target.value)}>
                {PLATFORMS.map(p => <option key={p} value={p}>{meta(p).label}</option>)}
              </select>
            </div>
            {(["api_key", "api_secret", "seller_id", "marketplace_id"] as const).map(key => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={s.label}>{key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</label>
                <input style={s.input} type={key.includes("secret") || key === "api_key" ? "password" : "text"}
                  value={(form as any)[key]} onChange={e => set(key, e.target.value)} />
                {meta(form.platform).help[key] && <div style={s.help}>{meta(form.platform).help[key]}</div>}
              </div>
            ))}
            <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set("is_active", e.target.checked)} />
              <label htmlFor="is_active" style={{ fontSize: 14 }}>Active</label>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={{ ...s.btn, ...s.btnGhost }} onClick={closeModal}>Cancel</button>
              <button style={{ ...s.btn, ...s.btnPrimary }} onClick={() => save.mutate(form)} disabled={save.isPending}>
                {save.isPending ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
