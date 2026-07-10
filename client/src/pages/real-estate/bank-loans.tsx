import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const api = (m: string, u: string, b?: any) =>
  fetch(u, { method: m, headers: { "Content-Type": "application/json" }, credentials: "include", body: b ? JSON.stringify(b) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const fmt = (n: any) => n != null ? `₹${Number(n).toLocaleString("en-IN")}` : "—";
const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-IN") : "—";

export default function BankLoansPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<any>({});
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [drawForm, setDrawForm] = useState<any>({});
  const [showDrawForm, setShowDrawForm] = useState(false);
  const [repayForm, setRepayForm] = useState<any>({});
  const [showRepayForm, setShowRepayForm] = useState(false);

  const { data: loans = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/construction-loans"], queryFn: () => api("GET", "/api/real-estate/construction-loans") });
  const { data: summary } = useQuery<any>({ queryKey: ["/api/real-estate/loans/summary"], queryFn: () => api("GET", "/api/real-estate/loans/summary") });
  const { data: projects = [] } = useQuery<any[]>({ queryKey: ["/api/real-estate/projects"], queryFn: () => api("GET", "/api/real-estate/projects") });
  const { data: drawdowns = [] } = useQuery<any[]>({
    queryKey: ["/api/real-estate/construction-loans/drawdowns", selectedLoan?.id],
    queryFn: () => api("GET", `/api/real-estate/construction-loans/${selectedLoan.id}/drawdowns`),
    enabled: !!selectedLoan,
  });

  const createLoan = useMutation({
    mutationFn: (d: any) => api("POST", "/api/real-estate/construction-loans", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/construction-loans"] }); qc.invalidateQueries({ queryKey: ["/api/real-estate/loans/summary"] }); setShowForm(false); setForm({}); toast({ title: "Construction loan created" }); },
  });

  const addDrawdown = useMutation({
    mutationFn: (d: any) => api("POST", `/api/real-estate/construction-loans/${selectedLoan.id}/drawdowns`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/construction-loans/drawdowns", selectedLoan?.id] }); setShowDrawForm(false); setDrawForm({}); toast({ title: "Drawdown recorded — GL posted: Dr Cash / Cr Loan Payable" }); },
  });

  const addRepayment = useMutation({
    mutationFn: (d: any) => api("POST", `/api/real-estate/loans/${selectedLoan.id}/repayment`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/real-estate/construction-loans"] }); setShowRepayForm(false); setRepayForm({}); toast({ title: "Repayment recorded — GL posted: Dr Loan Payable / Cr Cash" }); },
  });

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Construction Finance — Bank Loans</h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>Track construction loans, drawdown tranches, repayments. GL auto-posts on each transaction.</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setForm({}); }}>+ New Loan</Button>
      </div>

      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
          {[{ label: "Total Sanctioned", value: fmt(summary.total_sanctioned) }, { label: "Total Drawn", value: fmt(summary.total_drawn) }, { label: "Total Repaid", value: fmt(summary.total_repaid) }, { label: "Outstanding Balance", value: fmt(summary.outstanding) }].map(s => (
            <Card key={s.label}><CardContent style={{ padding: 14, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a56db" }}>{s.value}</div>
              <div style={{ fontSize: 12, color: "#555" }}>{s.label}</div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {showForm && (
        <Card style={{ marginBottom: 16 }}>
          <CardHeader style={{ paddingBottom: 8 }}><CardTitle style={{ fontSize: 14 }}>New Construction Loan</CardTitle></CardHeader>
          <CardContent>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <Label style={{ fontSize: 11 }}>Project</Label>
                <select value={form.project_id ?? ""} onChange={e => setForm((p: any) => ({ ...p, project_id: e.target.value }))} style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 12, marginTop: 2 }}>
                  <option value="">Select project</option>
                  {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              {[{ key: "bank_name", label: "Bank / Lender" }, { key: "loan_account_no", label: "Loan Account No" }, { key: "sanctioned_amount", label: "Sanctioned Amount ₹", type: "number" }, { key: "interest_rate", label: "Interest Rate % p.a.", type: "number" }, { key: "sanction_date", label: "Sanction Date", type: "date" }, { key: "disbursement_start_date", label: "Disbursement Start", type: "date" }, { key: "maturity_date", label: "Maturity Date", type: "date" }, { key: "loan_type", label: "Type (Term Loan/OD/CC)" }].map(f => (
                <div key={f.key}>
                  <Label style={{ fontSize: 11 }}>{f.label}</Label>
                  <Input type={f.type || "text"} value={form[f.key] ?? ""} onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <Button size="sm" onClick={() => createLoan.mutate(form)} disabled={createLoan.isPending}>{createLoan.isPending ? "Saving…" : "Save"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: selectedLoan ? "1fr 420px" : "1fr", gap: 16 }}>
        <Card>
          <CardContent style={{ padding: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead><tr style={{ background: "#eef2ff" }}>{["Bank / Lender", "Account No", "Sanctioned", "Drawn", "Repaid", "Outstanding", "Rate", "Status", ""].map(h => <th key={h} style={{ padding: "8px 10px", textAlign: "left", borderBottom: "1px solid #d0daf5", fontWeight: 600 }}>{h}</th>)}</tr></thead>
              <tbody>
                {loans.length === 0 && <tr><td colSpan={9} style={{ padding: 24, textAlign: "center", color: "#888" }}>No loans yet</td></tr>}
                {loans.map((l: any, i) => (
                  <tr key={l.id} style={{ borderBottom: "1px solid #e2e8f0", background: selectedLoan?.id === l.id ? "#eef2ff" : i % 2 ? "#f8faff" : "#fff", cursor: "pointer" }} onClick={() => setSelectedLoan(l)}>
                    <td style={{ padding: "8px 10px", fontWeight: 500 }}>{l.bank_name}</td>
                    <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11 }}>{l.loan_account_no}</td>
                    <td style={{ padding: "8px 10px" }}>{fmt(l.sanctioned_amount)}</td>
                    <td style={{ padding: "8px 10px" }}>{fmt(l.drawn_amount)}</td>
                    <td style={{ padding: "8px 10px" }}>{fmt(l.repaid_amount)}</td>
                    <td style={{ padding: "8px 10px", fontWeight: 600 }}>{fmt((Number(l.drawn_amount) || 0) - (Number(l.repaid_amount) || 0))}</td>
                    <td style={{ padding: "8px 10px" }}>{l.interest_rate}%</td>
                    <td style={{ padding: "8px 10px" }}>
                      <Badge style={{ fontSize: 10, background: l.status === "active" ? "#dcfce7" : l.status === "closed" ? "#f1f0ec" : "#fef9c3", color: l.status === "active" ? "#166534" : l.status === "closed" ? "#666" : "#713f12" }}>{l.status}</Badge>
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <Button size="sm" variant="outline" style={{ fontSize: 10 }} onClick={e => { e.stopPropagation(); setSelectedLoan(l); }}>Drawdowns</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {selectedLoan && (
          <Card style={{ height: "fit-content" }}>
            <CardHeader style={{ paddingBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <CardTitle style={{ fontSize: 13 }}>{selectedLoan.bank_name} — Drawdowns</CardTitle>
                <Button size="sm" variant="outline" style={{ fontSize: 10 }} onClick={() => setSelectedLoan(null)}>Close</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <Button size="sm" style={{ fontSize: 11 }} onClick={() => { setShowDrawForm(v => !v); setShowRepayForm(false); }}>+ Drawdown</Button>
                <Button size="sm" variant="outline" style={{ fontSize: 11 }} onClick={() => { setShowRepayForm(v => !v); setShowDrawForm(false); }}>+ Repayment</Button>
              </div>
              {showDrawForm && (
                <div style={{ background: "#f0f4ff", borderRadius: 6, padding: 10, marginBottom: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    {[{ key: "drawdown_date", label: "Drawdown Date", type: "date" }, { key: "amount", label: "Amount ₹", type: "number" }, { key: "bank_reference", label: "Bank Ref / UTR" }, { key: "purpose", label: "Purpose (Civil Work/MEP/Finishing)" }].map(f => (
                      <div key={f.key}>
                        <Label style={{ fontSize: 11 }}>{f.label}</Label>
                        <Input type={f.type || "text"} value={drawForm[f.key] ?? ""} onChange={e => setDrawForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#dbeafe", borderRadius: 4, padding: "4px 8px", fontSize: 11, color: "#1e40af", marginBottom: 8 }}>GL: Dr Cash/Bank · Cr Construction Loan Payable</div>
                  <Button size="sm" onClick={() => addDrawdown.mutate(drawForm)} disabled={addDrawdown.isPending}>{addDrawdown.isPending ? "Saving…" : "Record Drawdown"}</Button>
                </div>
              )}
              {showRepayForm && (
                <div style={{ background: "#f0fdf4", borderRadius: 6, padding: 10, marginBottom: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    {[{ key: "payment_date", label: "Payment Date", type: "date" }, { key: "principal_amount", label: "Principal ₹", type: "number" }, { key: "interest_amount", label: "Interest ₹", type: "number" }, { key: "bank_reference", label: "Bank Ref / UTR" }].map(f => (
                      <div key={f.key}>
                        <Label style={{ fontSize: 11 }}>{f.label}</Label>
                        <Input type={f.type || "text"} value={repayForm[f.key] ?? ""} onChange={e => setRepayForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12, marginTop: 2 }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#dcfce7", borderRadius: 4, padding: "4px 8px", fontSize: 11, color: "#166534", marginBottom: 8 }}>GL: Dr Construction Loan Payable + Interest Expense · Cr Cash/Bank</div>
                  <Button size="sm" onClick={() => addRepayment.mutate(repayForm)} disabled={addRepayment.isPending}>{addRepayment.isPending ? "Saving…" : "Record Repayment"}</Button>
                </div>
              )}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead><tr style={{ background: "#f0f4ff" }}>{["Date", "Amount", "Type", "Reference"].map(h => <th key={h} style={{ padding: "5px 8px", textAlign: "left", borderBottom: "1px solid #d0daf5" }}>{h}</th>)}</tr></thead>
                <tbody>
                  {drawdowns.length === 0 && <tr><td colSpan={4} style={{ padding: 12, textAlign: "center", color: "#888" }}>No drawdowns yet</td></tr>}
                  {drawdowns.map((d: any, i: number) => (
                    <tr key={d.id} style={{ borderBottom: "1px solid #e2e8f0", background: i % 2 ? "#f8faff" : "#fff" }}>
                      <td style={{ padding: "5px 8px" }}>{fmtDate(d.drawdown_date)}</td>
                      <td style={{ padding: "5px 8px", fontWeight: 600 }}>{fmt(d.amount)}</td>
                      <td style={{ padding: "5px 8px" }}><Badge style={{ fontSize: 9, background: "#dbeafe", color: "#1e40af" }}>Drawdown</Badge></td>
                      <td style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: 10 }}>{d.bank_reference || "—"}</td>
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
