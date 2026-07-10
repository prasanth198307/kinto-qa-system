import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const api = (path: string, opts?: RequestInit) =>
  fetch(path, { headers: { "Content-Type": "application/json" }, ...opts }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const MARKETPLACES = [
  {
    key: "amazon", emoji: "📦", label: "Amazon",
    guide: [
      "Go to Seller Central → Apps & Services → App console.",
      "Create a new SP-API application and note your App ID.",
      "Generate an Access Key and Secret Key from IAM.",
      "Add a channel above with platform = amazon.",
      "Enter your Seller ID (format: AXXXXX) and Marketplace ID.",
    ],
  },
  {
    key: "flipkart", emoji: "🛒", label: "Flipkart",
    guide: [
      "Go to Flipkart Seller Hub → Settings → API Access.",
      "Click 'Generate API Key' and copy the key and secret.",
      "Add a channel above with platform = flipkart.",
      "Enter your Seller ID from your Flipkart seller profile.",
    ],
  },
  {
    key: "meesho", emoji: "🛍️", label: "Meesho",
    guide: [
      "Go to Meesho Partner Panel → Account → API Token.",
      "Generate a new token and copy it.",
      "Add a channel above with platform = meesho.",
      "Enter your Supplier ID from the partner dashboard.",
    ],
  },
];

const s: Record<string, any> = {
  page: { padding: 24, fontFamily: "sans-serif", background: "#f8f9fa", minHeight: "100vh" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  grid3: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16, marginBottom: 24 },
  card: { background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb" },
  sectionTitle: { fontWeight: 700, fontSize: 15, marginBottom: 12 },
  badge: (ok: boolean) => ({ display: "inline-block", padding: "3px 12px", borderRadius: 12, fontSize: 12, fontWeight: 600, background: ok ? "#dcfce7" : "#f1f5f9", color: ok ? "#166534" : "#6b7280" }),
  guideBtn: { marginTop: 10, fontSize: 12, background: "none", border: "1px solid #d1d5db", borderRadius: 5, padding: "4px 10px", cursor: "pointer", color: "#374151" },
  guideBox: { marginTop: 10, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: 12 },
  guideStep: { fontSize: 12, color: "#374151", marginBottom: 5, lineHeight: 1.5 },
  btn: { padding: "10px 20px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, background: "#2563eb", color: "#fff" },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
  infoBox: { background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 14 },
  syncResult: { background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 14, marginTop: 16 },
  logCard: { background: "#fff", borderRadius: 10, padding: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb", marginTop: 16 },
  table: { width: "100%", borderCollapse: "collapse" as const, fontSize: 13 },
  th: { padding: "8px 12px", textAlign: "left" as const, borderBottom: "2px solid #e5e7eb", fontWeight: 600, color: "#374151", background: "#f9fafb" },
  td: { padding: "8px 12px", borderBottom: "1px solid #f1f5f9" },
};

export default function MarketplaceConnectPage() {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);

  const { data: channels = [] } = useQuery<any[]>({
    queryKey: ["ecommerce-channels"],
    queryFn: () => api("/api/ecommerce/channels"),
  });

  const { data: syncStatus = [] } = useQuery<any[]>({
    queryKey: ["ecom-sync-status"],
    queryFn: () => api("/api/ecommerce/inventory/sync-status"),
  });

  const syncAll = useMutation({
    mutationFn: () => api("/api/ecommerce/marketplace/sync", { method: "POST" }),
    onSuccess: (data) => {
      setSyncResult(data);
      toast({ title: `Sync complete — ${data?.total ?? 0} orders fetched` });
    },
    onError: () => toast({ title: "Sync failed", variant: "destructive" }),
  });

  const isConnected = (platform: string) =>
    (channels as any[]).some((c: any) => c.platform === platform && c.is_active);

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>Marketplace Connections</h1>
        <button
          style={{ ...s.btn, ...(syncAll.isPending ? s.btnDisabled : {}) }}
          onClick={() => syncAll.mutate()}
          disabled={syncAll.isPending}
        >
          {syncAll.isPending ? "⏳ Syncing..." : "↻ Sync All Marketplaces"}
        </button>
      </div>

      <p style={{ color: "#6b7280", marginBottom: 20, fontSize: 14 }}>
        Connect your marketplace accounts to automatically import orders and sync inventory.
      </p>

      <div style={s.grid3}>
        {MARKETPLACES.map(mp => {
          const connected = isConnected(mp.key);
          const open = expanded === mp.key;
          return (
            <div key={mp.key} style={s.card}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 32 }}>{mp.emoji}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{mp.label}</div>
                  <span style={s.badge(connected)}>{connected ? "✓ Connected" : "Not Connected"}</span>
                </div>
              </div>
              <button style={s.guideBtn} onClick={() => setExpanded(open ? null : mp.key)}>
                {open ? "▲ Hide Setup Guide" : "▼ Setup Guide"}
              </button>
              {open && (
                <div style={s.guideBox}>
                  {mp.guide.map((step, i) => (
                    <div key={i} style={s.guideStep}><strong>{i + 1}.</strong> {step}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={s.sectionTitle}>Shipping Integrations</div>
      <div style={s.grid3}>
        {[{ emoji: "🚀", label: "Shiprocket" }, { emoji: "🏎️", label: "Delhivery" }].map(sh => (
          <div key={sh.label} style={s.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 28 }}>{sh.emoji}</span>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{sh.label}</div>
            </div>
            <div style={s.infoBox}>
              <p style={{ margin: 0, fontSize: 13, color: "#1e40af" }}>
                Configure credentials under <strong>Masters → Integration Credentials</strong>.
              </p>
            </div>
          </div>
        ))}
      </div>

      {syncResult && (
        <div style={s.syncResult}>
          <strong style={{ fontSize: 14 }}>✅ Last Sync Result</strong>
          <div style={{ display: "flex", gap: 24, marginTop: 8, fontSize: 13, flexWrap: "wrap" as const }}>
            {["amazon", "flipkart", "meesho"].map(k => (
              <span key={k}><strong style={{ textTransform: "capitalize" as const }}>{k}:</strong> {syncResult[k] ?? 0} orders</span>
            ))}
            <span><strong>Total:</strong> {syncResult.total ?? 0}</span>
          </div>
        </div>
      )}

      {(syncStatus as any[]).length > 0 && (
        <div style={s.logCard}>
          <div style={s.sectionTitle}>Last Sync Status</div>
          <table style={s.table}>
            <thead>
              <tr>
                {["Platform", "Last Synced", "Items", "Status"].map(h => <th key={h} style={s.th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {(syncStatus as any[]).map((row: any, i: number) => (
                <tr key={i}>
                  <td style={s.td}>{row.platform || row.channel || "—"}</td>
                  <td style={s.td}>{row.last_synced || row.updated_at || "—"}</td>
                  <td style={s.td}>{row.items_synced ?? row.total_products ?? "—"}</td>
                  <td style={s.td}>
                    <span style={{ color: row.sync_status === "synced" || row.status === "success" ? "#16a34a" : "#dc2626", fontWeight: 600 }}>
                      {row.sync_status || row.status || "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
