import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Search, Plus, Edit2, Trash2, AlertTriangle, RefreshCw, CheckCircle } from "lucide-react";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, body: b ? JSON.stringify(b) : undefined, credentials: "include" }).then(r => r.json());

const TABS = ["Warehouses", "Stock Levels", "Fulfillment Zones"];

const badge = (label: string, color: string) => (
  <span style={{ background: color, color: "#fff", borderRadius: 3, fontSize: 11, padding: "1px 7px", fontWeight: 600 }}>{label}</span>
);

export default function WarehousesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [tab, setTab] = useState(0);
  const [modal, setModal] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [filterWh, setFilterWh] = useState("");
  const [suggest, setSuggest] = useState<any>(null);
  const [suggestPin, setSuggestPin] = useState("");
  const [suggestSku, setSuggestSku] = useState("");

  const { data: warehouses = [] } = useQuery<any[]>({ queryKey: ["/api/ecommerce/warehouses"], queryFn: () => api("GET", "/api/ecommerce/warehouses") });
  const { data: zones = [] } = useQuery<any[]>({ queryKey: ["/api/ecommerce/warehouse-zones"], queryFn: () => api("GET", "/api/ecommerce/warehouse-zones") });
  const { data: stock = [] } = useQuery<any[]>({ queryKey: ["/api/ecommerce/warehouse-stock"], queryFn: () => api("GET", "/api/ecommerce/warehouse-stock") });
  const { data: alerts = [] } = useQuery<any[]>({ queryKey: ["/api/ecommerce/warehouse-stock/alerts"], queryFn: () => api("GET", "/api/ecommerce/warehouse-stock/alerts") });
  const { data: tokenStatus } = useQuery<any>({ queryKey: ["/api/ecommerce/amazon/token-status"], queryFn: () => api("GET", "/api/ecommerce/amazon/token-status") });

  const save = useMutation({
    mutationFn: (p: any) => p.id ? api("PUT", `/api/ecommerce/${p._type}/${p.id}`, p) : api("POST", `/api/ecommerce/${p._type}`, p),
    onSuccess: (_, p) => { qc.invalidateQueries({ queryKey: ["/api/ecommerce/warehouses"] }); qc.invalidateQueries({ queryKey: ["/api/ecommerce/warehouse-zones"] }); qc.invalidateQueries({ queryKey: ["/api/ecommerce/warehouse-stock"] }); setModal(null); toast({ title: "Saved" }); },
  });
  const del = useMutation({
    mutationFn: (p: any) => api("DELETE", `/api/ecommerce/${p._type}/${p.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/ecommerce/warehouses"] }); qc.invalidateQueries({ queryKey: ["/api/ecommerce/warehouse-zones"] }); qc.invalidateQueries({ queryKey: ["/api/ecommerce/warehouse-stock"] }); },
  });
  const refreshToken = useMutation({
    mutationFn: () => api("POST", "/api/ecommerce/amazon/refresh-token"),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ["/api/ecommerce/amazon/token-status"] }); toast({ title: d.success ? `Token refreshed — expires in ${d.expires_in_minutes} min` : "Failed", variant: d.success ? "default" : "destructive" }); },
  });

  const open = (type: string, item?: any) => { setModal({ type }); setForm(item ? { ...item, _type: type } : { _type: type, is_active: true }); };

  async function findWarehouse() {
    if (!suggestPin || !suggestSku) return;
    const r = await api("GET", `/api/ecommerce/fulfillment/suggest?pin_code=${suggestPin}&sku=${suggestSku}`);
    setSuggest(r);
  }

  const filteredStock = filterWh ? stock.filter((s: any) => s.warehouse_id === Number(filterWh)) : stock;

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Warehouse & Fulfillment</h2>
          <p style={{ fontSize: 13, color: "#666", marginTop: 3 }}>Multi-warehouse inventory routing by PIN code</p>
        </div>
        {tokenStatus && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0f4ff", border: "1px solid #c3d0f5", borderRadius: 6, padding: "6px 12px", fontSize: 12 }}>
            <span style={{ fontWeight: 600 }}>Amazon SP-API:</span>
            {tokenStatus.configured ? badge("Configured", "#166534") : badge("Not Set", "#888")}
            {tokenStatus.token_cached && badge("Token Cached", "#1e40af")}
            <button onClick={() => refreshToken.mutate()} style={{ background: "#1a56db", color: "#fff", border: "none", borderRadius: 4, padding: "3px 10px", cursor: "pointer", fontSize: 11 }}>
              <RefreshCw size={11} style={{ marginRight: 4 }} />Refresh Token
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "2px solid #e5e7eb", marginBottom: 20 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} style={{ padding: "8px 20px", border: "none", background: "none", fontWeight: tab === i ? 700 : 400, borderBottom: tab === i ? "2px solid #1a56db" : "none", color: tab === i ? "#1a56db" : "#555", cursor: "pointer", fontSize: 13 }}>
            {t}
            {t === "Stock Levels" && alerts.length > 0 && <span style={{ marginLeft: 6, background: "#ef4444", color: "#fff", borderRadius: 10, fontSize: 10, padding: "1px 5px" }}>{alerts.length}</span>}
          </button>
        ))}
      </div>

      {/* Tab 0: Warehouses */}
      {tab === 0 && (
        <div>
          <button onClick={() => open("warehouses")} style={{ background: "#1a56db", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={14} />Add Warehouse
          </button>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {(warehouses as any[]).map(w => (
              <div key={w.id} style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{w.name}</div>
                  {w.is_active ? badge("Active", "#166534") : badge("Inactive", "#888")}
                </div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 6 }}>{w.address}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12 }}>
                  <MapPin size={12} color="#1a56db" />{w.city}, {w.state} — PIN {w.pin_code}
                </div>
                {w.contact_name && <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>📞 {w.contact_name} {w.contact_phone}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => open("warehouses", w)} style={{ flex: 1, padding: "5px 0", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", fontSize: 12 }}><Edit2 size={11} /> Edit</button>
                  <button onClick={() => del.mutate({ _type: "warehouses", id: w.id })} style={{ flex: 1, padding: "5px 0", border: "1px solid #fca5a5", background: "#fef2f2", borderRadius: 4, cursor: "pointer", fontSize: 12, color: "#dc2626" }}><Trash2 size={11} /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 1: Stock Levels */}
      {tab === 1 && (
        <div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            <select value={filterWh} onChange={e => setFilterWh(e.target.value)} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 13 }}>
              <option value="">All Warehouses</option>
              {(warehouses as any[]).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <button onClick={() => open("warehouse-stock")} style={{ background: "#1a56db", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", cursor: "pointer", fontSize: 13 }}><Plus size={13} /> Add Stock</button>
          </div>
          {alerts.length > 0 && <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 6, padding: "8px 12px", fontSize: 12, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle size={14} color="#ea580c" /><strong>{alerts.length} items</strong> below reorder level</div>}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ background: "#f0f4ff" }}>{["Warehouse", "SKU", "Product", "Available", "Reserved", "Reorder Level", "Status", ""].map(h => <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, fontSize: 12 }}>{h}</th>)}</tr></thead>
            <tbody>
              {filteredStock.map((s: any) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "6px 10px" }}>{s.warehouse_name}</td>
                  <td style={{ padding: "6px 10px", fontFamily: "monospace", fontSize: 11 }}>{s.sku}</td>
                  <td style={{ padding: "6px 10px" }}>{s.product_name}</td>
                  <td style={{ padding: "6px 10px", fontWeight: 600 }}>{s.available_qty}</td>
                  <td style={{ padding: "6px 10px", color: "#666" }}>{s.reserved_qty}</td>
                  <td style={{ padding: "6px 10px", color: "#666" }}>{s.reorder_level}</td>
                  <td style={{ padding: "6px 10px" }}>{s.available_qty <= s.reorder_level ? badge("Low Stock", "#dc2626") : badge("OK", "#166534")}</td>
                  <td style={{ padding: "6px 10px" }}><button onClick={() => open("warehouse-stock", s)} style={{ border: "1px solid #d1d5db", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Fulfillment Zones */}
      {tab === 2 && (
        <div>
          <button onClick={() => open("warehouse-zones")} style={{ background: "#1a56db", color: "#fff", border: "none", borderRadius: 6, padding: "8px 14px", cursor: "pointer", fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <Plus size={13} />Add Zone
          </button>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 24 }}>
            <thead><tr style={{ background: "#f0f4ff" }}>{["Warehouse", "Zone Name", "PIN Range", "Courier", "Priority", ""].map(h => <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, fontSize: 12 }}>{h}</th>)}</tr></thead>
            <tbody>
              {(zones as any[]).map(z => (
                <tr key={z.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "6px 10px" }}>{z.warehouse_name}</td>
                  <td style={{ padding: "6px 10px", fontWeight: 600 }}>{z.zone_name}</td>
                  <td style={{ padding: "6px 10px", fontFamily: "monospace" }}>{z.pin_from} – {z.pin_to}</td>
                  <td style={{ padding: "6px 10px" }}>{z.courier_partner || "—"}</td>
                  <td style={{ padding: "6px 10px" }}>{z.priority}</td>
                  <td style={{ padding: "6px 10px", display: "flex", gap: 6 }}>
                    <button onClick={() => open("warehouse-zones", z)} style={{ border: "1px solid #d1d5db", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>Edit</button>
                    <button onClick={() => del.mutate({ _type: "warehouse-zones", id: z.id })} style={{ border: "1px solid #fca5a5", background: "#fef2f2", borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontSize: 11, color: "#dc2626" }}>Del</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Routing Tester */}
          <div style={{ background: "#f8faff", border: "1px solid #c3d0f5", borderRadius: 8, padding: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#1a56db" }}>🎯 Fulfillment Routing Tester</h4>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div><label style={{ fontSize: 11, color: "#555" }}>Delivery PIN Code</label><br /><input value={suggestPin} onChange={e => setSuggestPin(e.target.value)} placeholder="400001" maxLength={6} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 13, width: 110 }} /></div>
              <div><label style={{ fontSize: 11, color: "#555" }}>SKU</label><br /><input value={suggestSku} onChange={e => setSuggestSku(e.target.value)} placeholder="SKU-123" style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", fontSize: 13, width: 150 }} /></div>
              <button onClick={findWarehouse} style={{ background: "#1a56db", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 13 }}><Search size={13} /> Find Best Warehouse</button>
            </div>
            {suggest?.suggestions && (
              <div style={{ marginTop: 12 }}>
                {suggest.suggestions.length === 0 ? <div style={{ color: "#dc2626", fontSize: 13 }}>No warehouse has stock for SKU {suggestSku}</div> :
                  suggest.suggestions.map((s: any, i: number) => (
                    <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: "1px solid #e5e7eb", fontSize: 13 }}>
                      <span style={{ fontWeight: 700, minWidth: 20 }}>#{i + 1}</span>
                      <span style={{ flex: 1 }}>{s.name} — {s.city}</span>
                      <span>Qty: <strong>{s.available_qty}</strong></span>
                      {s.serves_zone ? <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#166534", fontSize: 11, fontWeight: 600 }}><CheckCircle size={12} />Serves Zone</span> : <span style={{ color: "#888", fontSize: 11 }}>Outside Zone</span>}
                      {s.courier_partner && badge(s.courier_partner, "#1e40af")}
                    </div>
                  ))
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: 24, width: 480, maxHeight: "80vh", overflow: "auto" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>{form.id ? "Edit" : "Add"} {modal.type === "warehouses" ? "Warehouse" : modal.type === "warehouse-zones" ? "Fulfillment Zone" : "Stock Record"}</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {modal.type === "warehouses" && (<>
                <input placeholder="Warehouse Name *" value={form.name || ""} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                <textarea placeholder="Address" value={form.address || ""} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} rows={2} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13, resize: "vertical" }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input placeholder="City" value={form.city || ""} onChange={e => setForm((f: any) => ({ ...f, city: e.target.value }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                  <input placeholder="State" value={form.state || ""} onChange={e => setForm((f: any) => ({ ...f, state: e.target.value }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                  <input placeholder="PIN Code (6-digit)" maxLength={6} value={form.pin_code || ""} onChange={e => setForm((f: any) => ({ ...f, pin_code: e.target.value }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                  <input placeholder="Contact Name" value={form.contact_name || ""} onChange={e => setForm((f: any) => ({ ...f, contact_name: e.target.value }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                  <input placeholder="Contact Phone" value={form.contact_phone || ""} onChange={e => setForm((f: any) => ({ ...f, contact_phone: e.target.value }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><input type="checkbox" checked={!!form.is_active} onChange={e => setForm((f: any) => ({ ...f, is_active: e.target.checked })) } />Active</label>
                </div>
              </>)}
              {modal.type === "warehouse-zones" && (<>
                <select value={form.warehouse_id || ""} onChange={e => setForm((f: any) => ({ ...f, warehouse_id: Number(e.target.value) }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }}>
                  <option value="">Select Warehouse *</option>
                  {(warehouses as any[]).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <input placeholder="Zone Name (e.g. Mumbai Metro)" value={form.zone_name || ""} onChange={e => setForm((f: any) => ({ ...f, zone_name: e.target.value }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input type="number" placeholder="PIN From (e.g. 400001)" value={form.pin_from || ""} onChange={e => setForm((f: any) => ({ ...f, pin_from: Number(e.target.value) }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                  <input type="number" placeholder="PIN To (e.g. 400099)" value={form.pin_to || ""} onChange={e => setForm((f: any) => ({ ...f, pin_to: Number(e.target.value) }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                  <input placeholder="Courier Partner" value={form.courier_partner || ""} onChange={e => setForm((f: any) => ({ ...f, courier_partner: e.target.value }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                  <input type="number" placeholder="Priority (1=highest)" min={1} max={10} value={form.priority || 1} onChange={e => setForm((f: any) => ({ ...f, priority: Number(e.target.value) }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                </div>
              </>)}
              {modal.type === "warehouse-stock" && (<>
                <select value={form.warehouse_id || ""} onChange={e => setForm((f: any) => ({ ...f, warehouse_id: Number(e.target.value) }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }}>
                  <option value="">Select Warehouse *</option>
                  {(warehouses as any[]).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <input placeholder="SKU *" value={form.sku || ""} onChange={e => setForm((f: any) => ({ ...f, sku: e.target.value }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                <input placeholder="Product Name" value={form.product_name || ""} onChange={e => setForm((f: any) => ({ ...f, product_name: e.target.value }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                  <input type="number" placeholder="Available Qty" min={0} value={form.available_qty ?? ""} onChange={e => setForm((f: any) => ({ ...f, available_qty: Number(e.target.value) }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                  <input type="number" placeholder="Reserved Qty" min={0} value={form.reserved_qty ?? ""} onChange={e => setForm((f: any) => ({ ...f, reserved_qty: Number(e.target.value) }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                  <input type="number" placeholder="Reorder Level" min={0} value={form.reorder_level ?? 10} onChange={e => setForm((f: any) => ({ ...f, reorder_level: Number(e.target.value) }))} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
                </div>
              </>)}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button onClick={() => setModal(null)} style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 18px", cursor: "pointer", fontSize: 13 }}>Cancel</button>
              <button onClick={() => save.mutate(form)} disabled={save.isPending} style={{ background: "#1a56db", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", cursor: "pointer", fontSize: 13 }}>
                {save.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
