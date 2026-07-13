import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, BarChart2, TrendingDown, Layers } from "lucide-react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const fmt = (n: any, d = 2) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: d });
const fmtWt = (n: any) => `${fmt(n, 3)} g`;
const fmtAmt = (n: any) => `${sym}${fmt(n)}`;
const today = () => new Date().toISOString().slice(0, 10);

function FL({ label, children }: any) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function SH({ title, action }: any) {
  return <div className="flex items-center justify-between gap-2 flex-wrap mb-4"><h2 className="text-lg font-semibold">{title}</h2>{action}</div>;
}

// ── Metal Finance ─────────────────────────────────────────────────────────────
export function MetalFinanceSection() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"accounts" | "journals" | "consolidation" | "loss">("accounts");
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [showAccForm, setShowAccForm] = useState(false);
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [showConsolidationForm, setShowConsolidationForm] = useState(false);
  const [showLossForm, setShowLossForm] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<any>(null);
  const [accForm, setAccForm] = useState<any>({ account_type: "stock", metal_type: "gold" });
  const [jForm, setJForm] = useState<any>({ txn_type: "issue", lines: [{ side: "debit", weight_gm: 0 }, { side: "credit", weight_gm: 0 }] });
  const [consForm, setConsForm] = useState<any>({ metal_type: "gold", branch: "main", snapshot_date: today() });
  const [lossForm, setLossForm] = useState<any>({ metal_type: "gold", period_from: today(), period_to: today() });

  const { data: accounts = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/metal-accounts"] });
  const { data: journals = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/metal-journals"] });
  const { data: lines = [] } = useQuery<any[]>({
    queryKey: ["/api/gold-erp/metal-journals", selectedJournal?.id, "lines"],
    queryFn: () => selectedJournal ? fetch(`/api/gold-erp/metal-journals/${selectedJournal.id}/lines`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) : Promise.resolve([]),
    enabled: !!selectedJournal,
  });
  const { data: consolidations = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/stock-consolidation"] });
  const { data: lossReports = [] } = useQuery<any[]>({ queryKey: ["/api/gold-erp/metal-loss-reports"] });

  const accMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/metal-accounts", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/metal-accounts"] }); setShowAccForm(false); setAccForm({ account_type: "stock", metal_type: "gold" }); toast({ title: "Account created" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const journalMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/metal-journals", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/metal-journals"] }); setShowJournalForm(false); setJForm({ txn_type: "issue", lines: [{ side: "debit", weight_gm: 0 }, { side: "credit", weight_gm: 0 }] }); toast({ title: "Journal entry posted" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const consMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/stock-consolidation", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/stock-consolidation"] }); setShowConsolidationForm(false); setConsForm({ metal_type: "gold", branch: "main", snapshot_date: today() }); toast({ title: "Snapshot recorded" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const lossMut = useMutation({
    mutationFn: (d: any) => apiRequest("POST", "/api/gold-erp/metal-loss-reports", d),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/gold-erp/metal-loss-reports"] }); setShowLossForm(false); setLossForm({ metal_type: "gold", period_from: today(), period_to: today() }); toast({ title: "Loss report generated" }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateJLine = (i: number, k: string, v: any) => setJForm((p: any) => ({ ...p, lines: p.lines.map((l: any, idx: number) => idx === i ? { ...l, [k]: v } : l) }));
  const addJLine = () => setJForm((p: any) => ({ ...p, lines: [...p.lines, { side: "debit", weight_gm: 0 }] }));

  const tabs = [["accounts","Metal Accounts",BookOpen],["journals","Metal Journals",Layers],["consolidation","Stock Snapshot",BarChart2],["loss","Loss Reports",TrendingDown]] as const;

  return (
    <>
      <SH title="Metal Finance & Accounting" action={
        tab === "accounts" ? <Button size="sm" onClick={() => setShowAccForm(true)}><Plus className="h-4 w-4 mr-1" />Add Account</Button>
          : tab === "journals" ? <Button size="sm" onClick={() => setShowJournalForm(true)}><Plus className="h-4 w-4 mr-1" />Post Journal</Button>
          : tab === "consolidation" ? <Button size="sm" onClick={() => setShowConsolidationForm(true)}><Plus className="h-4 w-4 mr-1" />Take Snapshot</Button>
          : <Button size="sm" onClick={() => setShowLossForm(true)}><Plus className="h-4 w-4 mr-1" />Generate Report</Button>
      } />

      <div className="flex border-b mb-4 gap-0 overflow-x-auto">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k as any)} className={`px-4 py-2 text-sm whitespace-nowrap ${tab === k ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}>{l}</button>
        ))}
      </div>

      {tab === "accounts" && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Code", "Account Name", "Type", "Metal", "Balance (g)", "Active"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {(accounts as any[]).map((a: any) => (
                <tr key={a.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 font-mono text-xs">{a.account_code}</td>
                  <td className="px-4 py-2 font-medium">{a.account_name}</td>
                  <td className="px-4 py-2 capitalize text-xs">{a.account_type}</td>
                  <td className="px-4 py-2 capitalize text-xs">{a.metal_type}</td>
                  <td className="px-4 py-2 font-semibold">{fmtWt(a.balance_gm)}</td>
                  <td className="px-4 py-2">{a.is_active ? "✓" : "—"}</td>
                </tr>
              ))}
              {accounts.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No metal accounts created</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "journals" && (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr>{["Journal No.", "Date", "Type", "Narration", "Total Debit", "Total Credit", "Gold Rate", ""].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
              <tbody>
                {(journals as any[]).map((j: any) => (
                  <tr key={j.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedJournal(j)}>
                    <td className="px-4 py-2 font-mono text-xs">{j.journal_no}</td>
                    <td className="px-4 py-2 text-xs">{j.txn_date}</td>
                    <td className="px-4 py-2 capitalize text-xs">{j.txn_type?.replace(/_/g, " ")}</td>
                    <td className="px-4 py-2 text-xs">{j.narration?.slice(0, 40) || "—"}</td>
                    <td className="px-4 py-2">{fmtWt(j.total_debit_gm)}</td>
                    <td className="px-4 py-2">{fmtWt(j.total_credit_gm)}</td>
                    <td className="px-4 py-2">{j.gold_rate_used ? fmtAmt(j.gold_rate_used) + "/g" : "—"}</td>
                    <td className="px-4 py-2 text-xs text-blue-600 underline">Lines</td>
                  </tr>
                ))}
                {journals.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No journal entries</td></tr>}
              </tbody>
            </table>
          </div>
          <Dialog open={!!selectedJournal} onOpenChange={v => !v && setSelectedJournal(null)}>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Journal Lines — {selectedJournal?.journal_no}</DialogTitle></DialogHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50"><tr>{["Account", "Side", "Weight (g)", "Rate/g", "Amount "].map(h => <th key={h} className="px-3 py-2 text-left">{h}</th>)}</tr></thead>
                  <tbody>
                    {(lines as any[]).map((l: any) => (
                      <tr key={l.id} className="border-t">
                        <td className="px-3 py-1.5">{l.account_name || "—"}</td>
                        <td className="px-3 py-1.5"><Badge className={`text-xs ${l.side === "debit" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>{l.side}</Badge></td>
                        <td className="px-3 py-1.5">{fmtWt(l.weight_gm)}</td>
                        <td className="px-3 py-1.5">{l.rate_per_gram ? fmtAmt(l.rate_per_gram) : "—"}</td>
                        <td className="px-3 py-1.5">{fmtAmt(l.amount_inr)}</td>
                      </tr>
                    ))}
                    {lines.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-center text-muted-foreground">No lines</td></tr>}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}

      {tab === "consolidation" && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr>{["Date", "Branch", "Metal", "Purity", "In Hand (g)", "With Karigar (g)", "In Transit (g)", "Total (g)", "Rate", "Value"].map(h => <th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
            <tbody>
              {(consolidations as any[]).map((c: any) => (
                <tr key={c.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-2 text-xs">{c.snapshot_date}</td>
                  <td className="px-4 py-2 text-xs">{c.branch}</td>
                  <td className="px-4 py-2 capitalize text-xs">{c.metal_type}</td>
                  <td className="px-4 py-2 text-xs">{c.purity_name || "—"}</td>
                  <td className="px-4 py-2">{fmtWt(c.stock_in_hand_gm)}</td>
                  <td className="px-4 py-2">{fmtWt(c.stock_with_karigar_gm)}</td>
                  <td className="px-4 py-2">{fmtWt(c.stock_in_transit_gm)}</td>
                  <td className="px-4 py-2 font-semibold">{fmtWt(c.total_gm)}</td>
                  <td className="px-4 py-2 text-xs">{fmtAmt(c.gold_rate)}/g</td>
                  <td className="px-4 py-2 font-bold">{fmtAmt(c.total_value_inr)}</td>
                </tr>
              ))}
              {consolidations.length === 0 && <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No snapshots recorded</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === "loss" && (
        <div className="space-y-3">
          {(lossReports as any[]).map((r: any) => (
            <Card key={r.id} className={Number(r.unaccounted_loss_gm) > 0 ? "border-red-200 dark:border-red-800" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold">{r.period_from} → {r.period_to} <span className="text-xs text-muted-foreground ml-2 capitalize">{r.metal_type}</span></p>
                    {r.created_by && <p className="text-xs text-muted-foreground">By {r.created_by}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-red-600">{fmtWt(r.unaccounted_loss_gm)}</p>
                    <p className="text-xs text-muted-foreground">Unaccounted loss</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-xs">
                  <div><span className="text-muted-foreground">Issued: </span>{fmtWt(r.gold_issued_gm)}</div>
                  <div><span className="text-muted-foreground">In Products: </span>{fmtWt(r.gold_in_products_gm)}</div>
                  <div><span className="text-muted-foreground">Wastage Coll.: </span>{fmtWt(r.wastage_collected_gm)}</div>
                  <div><span className="text-muted-foreground">Loss %: </span>{Number(r.loss_pct || 0).toFixed(3)}%</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Loss Value: </span><span className="font-semibold text-red-600">{fmtAmt(r.loss_value_inr)}</span></div>
                  <div><span className="text-muted-foreground">Gold Rate: </span>{fmtAmt(r.gold_rate_used)}/g</div>
                </div>
              </CardContent>
            </Card>
          ))}
          {lossReports.length === 0 && <p className="text-center text-muted-foreground py-8">No metal loss reports generated</p>}
        </div>
      )}

      {/* Account Form */}
      <Dialog open={showAccForm} onOpenChange={setShowAccForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Metal Account</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FL label="Account Code *"><Input value={accForm.account_code || ""} onChange={e => setAccForm((p: any) => ({ ...p, account_code: e.target.value.toUpperCase() }))} placeholder="AU-001" /></FL>
              <FL label="Account Name *"><Input value={accForm.account_name || ""} onChange={e => setAccForm((p: any) => ({ ...p, account_name: e.target.value }))} /></FL>
              <FL label="Account Type">
                <Select value={accForm.account_type || "stock"} onValueChange={v => setAccForm((p: any) => ({ ...p, account_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="stock">Stock</SelectItem><SelectItem value="karigar">Karigar</SelectItem><SelectItem value="customer">Customer</SelectItem><SelectItem value="refinery">Refinery</SelectItem><SelectItem value="vault">Vault</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Metal">
                <Select value={accForm.metal_type || "gold"} onValueChange={v => setAccForm((p: any) => ({ ...p, metal_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem><SelectItem value="platinum">Platinum</SelectItem></SelectContent>
                </Select>
              </FL>
            </div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowAccForm(false)}>Cancel</Button><Button onClick={() => accMut.mutate(accForm)} disabled={accMut.isPending}>Create</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Journal Form */}
      <Dialog open={showJournalForm} onOpenChange={setShowJournalForm}>
        <DialogContent className="max-w-lg max-h-[90dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Metal Journal Entry</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FL label="Date"><Input type="date" value={jForm.txn_date || today()} onChange={e => setJForm((p: any) => ({ ...p, txn_date: e.target.value }))} /></FL>
              <FL label="Type">
                <Select value={jForm.txn_type || "issue"} onValueChange={v => setJForm((p: any) => ({ ...p, txn_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="issue">Issue</SelectItem><SelectItem value="return">Return</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem><SelectItem value="transfer">Transfer</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Gold Rate Used (${sym}/g)" className="col-span-2"><Input type="number" value={jForm.gold_rate_used || ""} onChange={e => setJForm((p: any) => ({ ...p, gold_rate_used: e.target.value }))} /></FL>
            </div>
            <FL label="Narration"><Textarea value={jForm.narration || ""} onChange={e => setJForm((p: any) => ({ ...p, narration: e.target.value }))} rows={2} /></FL>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Journal Lines</p>
                <Button size="sm" variant="outline" onClick={addJLine}><Plus className="h-3 w-3 mr-1" />Add Line</Button>
              </div>
              <div className="space-y-2">
                {jForm.lines.map((l: any, i: number) => (
                  <div key={i} className="grid grid-cols-3 gap-2">
                    <FL label="Account">
                      <Select value={l.account_id?.toString() || ""} onValueChange={v => updateJLine(i, "account_id", parseInt(v))}>
                        <SelectTrigger className="text-xs"><SelectValue placeholder="Account" /></SelectTrigger>
                        <SelectContent>{(accounts as any[]).map((a: any) => <SelectItem key={a.id} value={a.id.toString()}>{a.account_code}</SelectItem>)}</SelectContent>
                      </Select>
                    </FL>
                    <FL label="Side">
                      <Select value={l.side || "debit"} onValueChange={v => updateJLine(i, "side", v)}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="debit">Dr</SelectItem><SelectItem value="credit">Cr</SelectItem></SelectContent>
                      </Select>
                    </FL>
                    <FL label="Weight (g)"><Input type="number" className="text-xs" value={l.weight_gm || ""} onChange={e => updateJLine(i, "weight_gm", e.target.value)} /></FL>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowJournalForm(false)}>Cancel</Button><Button onClick={() => journalMut.mutate(jForm)} disabled={journalMut.isPending}>Post Journal</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Consolidation Form */}
      <Dialog open={showConsolidationForm} onOpenChange={setShowConsolidationForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Take Stock Snapshot</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FL label="Date"><Input type="date" value={consForm.snapshot_date || today()} onChange={e => setConsForm((p: any) => ({ ...p, snapshot_date: e.target.value }))} /></FL>
              <FL label="Branch"><Input value={consForm.branch || "main"} onChange={e => setConsForm((p: any) => ({ ...p, branch: e.target.value }))} /></FL>
              <FL label="Metal">
                <Select value={consForm.metal_type || "gold"} onValueChange={v => setConsForm((p: any) => ({ ...p, metal_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Purity"><Input value={consForm.purity_name || ""} onChange={e => setConsForm((p: any) => ({ ...p, purity_name: e.target.value }))} placeholder="22K (916)" /></FL>
              <FL label="In Hand (g)"><Input type="number" value={consForm.stock_in_hand_gm || 0} onChange={e => setConsForm((p: any) => ({ ...p, stock_in_hand_gm: e.target.value }))} /></FL>
              <FL label="With Karigar (g)"><Input type="number" value={consForm.stock_with_karigar_gm || 0} onChange={e => setConsForm((p: any) => ({ ...p, stock_with_karigar_gm: e.target.value }))} /></FL>
              <FL label="In Transit (g)"><Input type="number" value={consForm.stock_in_transit_gm || 0} onChange={e => setConsForm((p: any) => ({ ...p, stock_in_transit_gm: e.target.value }))} /></FL>
              <FL label="Gold Rate (${sym}/g)"><Input type="number" value={consForm.gold_rate || ""} onChange={e => setConsForm((p: any) => ({ ...p, gold_rate: e.target.value }))} /></FL>
            </div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowConsolidationForm(false)}>Cancel</Button><Button onClick={() => consMut.mutate(consForm)} disabled={consMut.isPending}>Save Snapshot</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loss Report Form */}
      <Dialog open={showLossForm} onOpenChange={setShowLossForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Generate Metal Loss Report</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FL label="From"><Input type="date" value={lossForm.period_from || today()} onChange={e => setLossForm((p: any) => ({ ...p, period_from: e.target.value }))} /></FL>
              <FL label="To"><Input type="date" value={lossForm.period_to || today()} onChange={e => setLossForm((p: any) => ({ ...p, period_to: e.target.value }))} /></FL>
              <FL label="Metal">
                <Select value={lossForm.metal_type || "gold"} onValueChange={v => setLossForm((p: any) => ({ ...p, metal_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="gold">Gold</SelectItem><SelectItem value="silver">Silver</SelectItem></SelectContent>
                </Select>
              </FL>
              <FL label="Gold Rate Used (${sym}/g)"><Input type="number" value={lossForm.gold_rate_used || ""} onChange={e => setLossForm((p: any) => ({ ...p, gold_rate_used: e.target.value }))} /></FL>
              <FL label="Gold Issued (g)"><Input type="number" value={lossForm.gold_issued_gm || ""} onChange={e => setLossForm((p: any) => ({ ...p, gold_issued_gm: e.target.value }))} /></FL>
              <FL label="In Products (g)"><Input type="number" value={lossForm.gold_in_products_gm || ""} onChange={e => setLossForm((p: any) => ({ ...p, gold_in_products_gm: e.target.value }))} /></FL>
              <FL label="Wastage Collected (g)"><Input type="number" value={lossForm.wastage_collected_gm || ""} onChange={e => setLossForm((p: any) => ({ ...p, wastage_collected_gm: e.target.value }))} /></FL>
              <FL label="Refinery Sent (g)"><Input type="number" value={lossForm.refinery_sent_gm || ""} onChange={e => setLossForm((p: any) => ({ ...p, refinery_sent_gm: e.target.value }))} /></FL>
              <FL label="Refinery Received (g)"><Input type="number" value={lossForm.refinery_received_gm || ""} onChange={e => setLossForm((p: any) => ({ ...p, refinery_received_gm: e.target.value }))} /></FL>
              <FL label="Purity Loss (g)"><Input type="number" value={lossForm.purity_loss_gm || ""} onChange={e => setLossForm((p: any) => ({ ...p, purity_loss_gm: e.target.value }))} /></FL>
              <FL label="Prepared By"><Input value={lossForm.created_by || ""} onChange={e => setLossForm((p: any) => ({ ...p, created_by: e.target.value }))} /></FL>
            </div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={() => setShowLossForm(false)}>Cancel</Button><Button onClick={() => lossMut.mutate(lossForm)} disabled={lossMut.isPending}>Generate</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
