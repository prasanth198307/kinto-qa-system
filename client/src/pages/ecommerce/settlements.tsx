import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const API = "/api/ecommerce";

type Settlement = { id: number; settlement_number: string; channel_name: string; settlement_date: string; period_from: string; period_to: string; gross_amount: number; commission: number; tds: number; other_deductions: number; net_amount: number; utr_number: string };
type Commission = { id: number; platform: string; period_month: number; period_year: number; gross_sales: number; commission_rate: number; commission_amount: number; shipping_charges: number; other_deductions: number; net_settlement: number; settlement_date: string; status: string };
type Summary = { platform: string; total_gross_sales: number; total_commission: number; total_net_settlement: number };

const inp = { border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 10px", width: "100%", fontSize: 14, boxSizing: "border-box" as const };
const th = { padding: "10px 12px", textAlign: "left" as const, fontSize: 12, fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb" };
const td = { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #f3f4f6" };
const PLATFORMS = ["amazon","flipkart","meesho","direct"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function Badge({ label, color }: { label: string; color: string }) {
  return <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 4, padding: "2px 8px", fontSize: 12, fontWeight: 600 }}>{label}</span>;
}

const emptyS = { channel_name: "", settlement_date: "", period_from: "", period_to: "", gross_amount: "", commission: "", tds: "", other_deductions: "", net_amount: "", utr_number: "" };
const emptyC = { platform: "amazon", period_month: "1", period_year: String(new Date().getFullYear()), gross_sales: "", commission_rate: "", commission_amount: "", shipping_charges: "", other_deductions: "", net_settlement: "", settlement_date: "" };

export default function SettlementsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [tab, setTab] = useState<"settlements"|"commissions">("settlements");
  const [sModal, setSModal] = useState(false);
  const [cModal, setCModal] = useState(false);
  const [sForm, setSForm] = useState({ ...emptyS });
  const [cForm, setCForm] = useState({ ...emptyC });
  const [summaryYear, setSummaryYear] = useState(String(new Date().getFullYear()));

  const { data: settlements = [] } = useQuery<Settlement[]>({ queryKey: ["ecom-settlements"], queryFn: () => fetch(`${API}/settlements`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: commissions = [] } = useQuery<Commission[]>({ queryKey: ["ecom-commissions"], queryFn: () => fetch(`${API}/commissions`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: summary = [] } = useQuery<Summary[]>({ queryKey: ["ecom-comm-summary", summaryYear], queryFn: () => fetch(`${API}/commissions/summary?year=${summaryYear}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });

  const invalidateAll = () => { qc.invalidateQueries({ queryKey: ["ecom-settlements"] }); qc.invalidateQueries({ queryKey: ["ecom-commissions"] }); qc.invalidateQueries({ queryKey: ["ecom-comm-summary"] }); };

  const addSettlement = useMutation({
    mutationFn: (body: object) => fetch(`${API}/settlements`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => { invalidateAll(); setSModal(false); toast({ title: "Settlement added" }); },
  });

  const addCommission = useMutation({
    mutationFn: (body: object) => fetch(`${API}/commissions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => { invalidateAll(); setCModal(false); toast({ title: "Commission record added" }); },
  });

  const settleCommission = useMutation({
    mutationFn: (id: number) => fetch(`${API}/commissions/${id}/settle`, { method: "PUT" }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
    onSuccess: () => { invalidateAll(); toast({ title: "GL Posted ✓ — commission marked settled" }); },
  });

  const sTotal = (k: keyof Settlement) => settlements.reduce((s, r) => s + Number(r[k] || 0), 0);

  const autoCalcComm = (rate: string, gross: string) => rate && gross ? String((Number(gross) * Number(rate)) / 100) : "";

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Settlement Reconciliation</h1>
          <p style={{ color: "#6b7280", margin: "4px 0 0", fontSize: 13 }}>Marketplace settlements & commission GL posting</p>
        </div>
        <button onClick={() => tab === "settlements" ? setSModal(true) : setCModal(true)} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>
          {tab === "settlements" ? "+ Add Settlement" : "+ Add Record"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "2px solid #e5e7eb" }}>
        {(["settlements","commissions"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 20px", border: "none", borderBottom: tab === t ? "2px solid #2563eb" : "none", marginBottom: -2, background: "none", cursor: "pointer", fontWeight: tab === t ? 700 : 400, color: tab === t ? "#2563eb" : "#6b7280", fontSize: 14 }}>
            {t === "settlements" ? "Settlements" : "Commission Reconciliation"}
          </button>
        ))}
      </div>

      {tab === "settlements" && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f9fafb" }}>
              <tr>{["Settlement #","Channel","Period","Gross","Commission","TDS","Other Deductions","Net Received","UTR","Date"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {settlements.map(s => (
                <tr key={s.id}>
                  <td style={td}><b>{s.settlement_number}</b></td>
                  <td style={td}>{s.channel_name}</td>
                  <td style={td}>{s.period_from} – {s.period_to}</td>
                  <td style={td}>{sym}{Number(s.gross_amount).toLocaleString("en-IN")}</td>
                  <td style={td}>{sym}{Number(s.commission).toLocaleString("en-IN")}</td>
                  <td style={td}>{sym}{Number(s.tds).toLocaleString("en-IN")}</td>
                  <td style={td}>{sym}{Number(s.other_deductions).toLocaleString("en-IN")}</td>
                  <td style={{ ...td, fontWeight: 600, color: "#16a34a" }}>{sym}{Number(s.net_amount).toLocaleString("en-IN")}</td>
                  <td style={td}>{s.utr_number}</td>
                  <td style={td}>{new Date(s.settlement_date).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
              {settlements.length === 0 && <tr><td colSpan={10} style={{ ...td, textAlign: "center", color: "#9ca3af", padding: 32 }}>No settlements</td></tr>}
              {settlements.length > 0 && (
                <tr style={{ background: "#f0fdf4", fontWeight: 700 }}>
                  <td style={td} colSpan={3}>TOTALS</td>
                  <td style={td}>{sym}{sTotal("gross_amount").toLocaleString("en-IN")}</td>
                  <td style={td}>{sym}{sTotal("commission").toLocaleString("en-IN")}</td>
                  <td style={td}>{sym}{sTotal("tds").toLocaleString("en-IN")}</td>
                  <td style={td}>{sym}{sTotal("other_deductions").toLocaleString("en-IN")}</td>
                  <td style={{ ...td, color: "#16a34a" }}>{sym}{sTotal("net_amount").toLocaleString("en-IN")}</td>
                  <td style={td} colSpan={2} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "commissions" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Year:</span>
            <select value={summaryYear} onChange={e => setSummaryYear(e.target.value)} style={{ ...inp, width: 100 }}>
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
            {summary.map((s: Summary) => (
              <div key={s.platform} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 18px" }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, textTransform: "capitalize" }}>{s.platform}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Gross Sales</div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{sym}{Number(s.total_gross_sales).toLocaleString("en-IN")}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Commission</div>
                <div style={{ fontWeight: 600, marginBottom: 4, color: "#ef4444" }}>{sym}{Number(s.total_commission).toLocaleString("en-IN")}</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>Net Settlement</div>
                <div style={{ fontWeight: 600, color: "#16a34a" }}>{sym}{Number(s.total_net_settlement).toLocaleString("en-IN")}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: "#f9fafb" }}>
                <tr>{["Platform","Month/Year","Gross Sales","Rate %","Commission","Net Settlement","Status","Actions"].map(h => <th key={h} style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {commissions.map(c => (
                  <tr key={c.id}>
                    <td style={{ ...td, textTransform: "capitalize", fontWeight: 600 }}>{c.platform}</td>
                    <td style={td}>{MONTHS[c.period_month - 1]} {c.period_year}</td>
                    <td style={td}>{sym}{Number(c.gross_sales).toLocaleString("en-IN")}</td>
                    <td style={td}>{c.commission_rate}%</td>
                    <td style={td}>{sym}{Number(c.commission_amount).toLocaleString("en-IN")}</td>
                    <td style={{ ...td, fontWeight: 600, color: "#16a34a" }}>{sym}{Number(c.net_settlement).toLocaleString("en-IN")}</td>
                    <td style={td}><Badge label={c.status} color={c.status === "settled" ? "#22c55e" : "#f59e0b"} /></td>
                    <td style={td}>
                      {c.status !== "settled" && (
                        <button onClick={() => settleCommission.mutate(c.id)} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 12 }}>Mark Settled</button>
                      )}
                      {c.status === "settled" && <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>GL Posted ✓</span>}
                    </td>
                  </tr>
                ))}
                {commissions.length === 0 && <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: "#9ca3af", padding: 32 }}>No commission records</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sModal && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 520, boxShadow: "0 20px 60px #0003", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Add Settlement</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {([["Channel","channel_name","text"],["UTR Number","utr_number","text"],["Settlement Date","settlement_date","date"],["Period From","period_from","date"],["Period To","period_to","date"],["Gross Amount","gross_amount","number"],["Commission","commission","number"],["TDS","tds","number"],["Other Deductions","other_deductions","number"],["Net Amount","net_amount","number"]] as [string,keyof typeof emptyS,string][]).map(([label,key,type]) => (
                <div key={key}>
                  <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>{label}</label>
                  <input type={type} value={sForm[key]} onChange={e => setSForm(f => ({ ...f, [key]: e.target.value }))} style={inp} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setSModal(false)} style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 16px", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => addSettlement.mutate({ ...sForm, gross_amount: Number(sForm.gross_amount), commission: Number(sForm.commission), tds: Number(sForm.tds), other_deductions: Number(sForm.other_deductions), net_amount: Number(sForm.net_amount) })} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>Add Settlement</button>
            </div>
          </div>
        </div>
      )}

      {cModal && (
        <div style={{ position: "fixed", inset: 0, background: "#0008", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 520, boxShadow: "0 20px 60px #0003", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 700 }}>Add Commission Record</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Platform</label>
                <select value={cForm.platform} onChange={e => setCForm(f => ({ ...f, platform: e.target.value }))} style={inp}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Month</label>
                <select value={cForm.period_month} onChange={e => setCForm(f => ({ ...f, period_month: e.target.value }))} style={inp}>
                  {MONTHS.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Year</label>
                <input type="number" value={cForm.period_year} onChange={e => setCForm(f => ({ ...f, period_year: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Gross Sales (${sym})</label>
                <input type="number" value={cForm.gross_sales} onChange={e => setCForm(f => ({ ...f, gross_sales: e.target.value, commission_amount: autoCalcComm(f.commission_rate, e.target.value) }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Commission Rate %</label>
                <input type="number" value={cForm.commission_rate} onChange={e => setCForm(f => ({ ...f, commission_rate: e.target.value, commission_amount: autoCalcComm(e.target.value, f.gross_sales) }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Commission Amount (${sym})</label>
                <input type="number" value={cForm.commission_amount} onChange={e => setCForm(f => ({ ...f, commission_amount: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Shipping Charges (${sym})</label>
                <input type="number" value={cForm.shipping_charges} onChange={e => setCForm(f => ({ ...f, shipping_charges: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Other Deductions (${sym})</label>
                <input type="number" value={cForm.other_deductions} onChange={e => setCForm(f => ({ ...f, other_deductions: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Net Settlement (${sym})</label>
                <input type="number" value={cForm.net_settlement} onChange={e => setCForm(f => ({ ...f, net_settlement: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, display: "block", marginBottom: 4 }}>Settlement Date</label>
                <input type="date" value={cForm.settlement_date} onChange={e => setCForm(f => ({ ...f, settlement_date: e.target.value }))} style={inp} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
              <button onClick={() => setCModal(false)} style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 6, padding: "8px 16px", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => addCommission.mutate({ ...cForm, period_month: Number(cForm.period_month), period_year: Number(cForm.period_year), gross_sales: Number(cForm.gross_sales), commission_rate: Number(cForm.commission_rate), commission_amount: Number(cForm.commission_amount), shipping_charges: Number(cForm.shipping_charges), other_deductions: Number(cForm.other_deductions), net_settlement: Number(cForm.net_settlement) })} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontWeight: 600 }}>Add Record</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
