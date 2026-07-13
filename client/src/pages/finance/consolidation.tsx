import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Play, Download, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const fmt = (n: number) => `${sym}${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;

export default function ConsolidationPage() {
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [elimOpen, setElimOpen] = useState(false);
  const [form, setForm] = useState({ company_name: "", member_tenant_id: "" });
  const [elim, setElim] = useState({ entity_a_id: "", entity_b_id: "", elimination_type: "intercompany_revenue", amount_paise: "", description: "", dr_account: "", cr_account: "" });
  const [period, setPeriod] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) });
  const [consolData, setConsolData] = useState<any>(null);
  const [consolidating, setConsolidating] = useState(false);

  const { data: group = [] } = useQuery<any[]>({ queryKey: ["company-group"], queryFn: () => fetch("/api/finance/company-group").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: pnl } = useQuery({ queryKey: ["consolidation-pnl", period.year], queryFn: () => fetch(`/api/finance/consolidation/pnl?year=${period.year}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: bs } = useQuery({ queryKey: ["consolidation-bs"], queryFn: () => fetch("/api/finance/consolidation/balance-sheet").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });
  const { data: eliminations = [] } = useQuery<any[]>({ queryKey: ["eliminations", period], queryFn: () => fetch(`/api/ifrs/eliminations?period_month=${period.month}&period_year=${period.year}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }) });

  const addCompany = useMutation({
    mutationFn: (d: any) => api("POST", "/api/finance/company-group", d),
    onSuccess: () => { toast({ title: "Company added to group" }); qc.invalidateQueries({ queryKey: ["company-group"] }); setAddOpen(false); setForm({ company_name: "", member_tenant_id: "" }); },
  });

  const removeCompany = useMutation({
    mutationFn: (id: number) => api("DELETE", `/api/finance/company-group/${id}`),
    onSuccess: () => { toast({ title: "Removed" }); qc.invalidateQueries({ queryKey: ["company-group"] }); },
  });

  const addElim = useMutation({
    mutationFn: (d: any) => api("POST", "/api/ifrs/eliminations", { ...d, period_month: Number(period.month), period_year: Number(period.year), amount_paise: Number(d.amount_paise) * 100 }),
    onSuccess: () => { toast({ title: "Elimination added" }); qc.invalidateQueries({ queryKey: ["eliminations"] }); setElimOpen(false); },
  });

  const runConsolidation = async () => {
    setConsolidating(true);
    try {
      const data = await api("POST", "/api/ifrs/consolidate", { period_month: Number(period.month), period_year: Number(period.year) });
      setConsolData(data);
      toast({ title: `Consolidated ${data.entities?.length || 0} entities` });
    } catch { toast({ title: "Consolidation failed", variant: "destructive" }); }
    setConsolidating(false);
  };

  const downloadPDF = () => window.open(`/api/ifrs/consolidation/report/pdf?month=${period.month}&year=${period.year}`, "_blank");

  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Multi-Company Consolidation</h1>
          <p className="text-sm text-muted-foreground">Group P&L + Balance Sheet · Intercompany eliminations · PDF financial statements</p>
        </div>
        <div className="flex gap-2">
          <Select value={period.month} onValueChange={v => setPeriod(p => ({ ...p, month: v }))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={period.year} onValueChange={v => setPeriod(p => ({ ...p, year: v }))}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>{["2024","2025","2026"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={downloadPDF}><Download className="h-4 w-4 mr-1" />PDF</Button>
          <Button onClick={runConsolidation} disabled={consolidating}>
            {consolidating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            Consolidate
          </Button>
        </div>
      </div>

      {pnl?.consolidated && (
        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Revenue</p><p className="text-xl font-bold text-green-600">{fmt(pnl.consolidated.total_revenue)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Expenses</p><p className="text-xl font-bold text-red-600">{fmt(pnl.consolidated.total_expenses)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Net Profit</p><p className={`text-xl font-bold ${pnl.consolidated.net_profit >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(pnl.consolidated.net_profit)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Assets</p><p className="text-xl font-bold">{bs?.consolidated ? fmt(bs.consolidated.total_assets) : "—"}</p></CardContent></Card>
        </div>
      )}

      <Tabs defaultValue="group">
        <TabsList>
          <TabsTrigger value="group">Group Companies</TabsTrigger>
          <TabsTrigger value="pnl">Consolidated P&L</TabsTrigger>
          <TabsTrigger value="bs">Consolidated Balance Sheet</TabsTrigger>
          <TabsTrigger value="eliminations">Intercompany Eliminations</TabsTrigger>
          {consolData && <TabsTrigger value="trial">Consolidated Trial Balance</TabsTrigger>}
        </TabsList>

        <TabsContent value="group">
          <div className="flex justify-end mb-3"><Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Company</Button></div>
          <Table>
            <TableHeader><TableRow><TableHead>Company Name</TableHead><TableHead>Tenant ID</TableHead><TableHead>Status</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              <TableRow className="bg-muted/30"><TableCell className="font-medium">Parent Entity (This Company)</TableCell><TableCell>—</TableCell><TableCell><Badge>Active</Badge></TableCell><TableCell></TableCell></TableRow>
              {(group as any[]).map((g: any) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.company_name}</TableCell>
                  <TableCell>{g.member_tenant_id}</TableCell>
                  <TableCell><Badge variant="outline">Subsidiary</Badge></TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => removeCompany.mutate(g.id)}><Trash2 className="h-3 w-3" /></Button></TableCell>
                </TableRow>
              ))}
              {(group as any[]).length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No subsidiaries added. Add companies to enable group consolidation.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="pnl">
          {pnl?.entities ? (
            <Table>
              <TableHeader><TableRow><TableHead>Entity</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead className="text-right">Expenses</TableHead><TableHead className="text-right">Net Profit</TableHead></TableRow></TableHeader>
              <TableBody>
                {pnl.entities.map((e: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{e.name}</TableCell>
                    <TableCell className="text-right text-green-700">{fmt(e.revenue)}</TableCell>
                    <TableCell className="text-right text-red-700">{fmt(e.expenses)}</TableCell>
                    <TableCell className={`text-right font-semibold ${e.net_profit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(e.net_profit)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-bold bg-muted/30">
                  <TableCell>Consolidated Total</TableCell>
                  <TableCell className="text-right text-green-700">{fmt(pnl.consolidated.total_revenue)}</TableCell>
                  <TableCell className="text-right text-red-700">{fmt(pnl.consolidated.total_expenses)}</TableCell>
                  <TableCell className={`text-right ${pnl.consolidated.net_profit >= 0 ? "text-green-700" : "text-red-700"}`}>{fmt(pnl.consolidated.net_profit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : <p className="text-center text-muted-foreground py-8">Click Consolidate to generate group P&L</p>}
        </TabsContent>

        <TabsContent value="bs">
          {bs?.entities ? (
            <Table>
              <TableHeader><TableRow><TableHead>Entity</TableHead><TableHead className="text-right">Assets</TableHead><TableHead className="text-right">Liabilities</TableHead><TableHead className="text-right">Equity</TableHead></TableRow></TableHeader>
              <TableBody>
                {bs.entities.map((e: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{e.tenant_id}</TableCell>
                    <TableCell className="text-right">{fmt(e.assets)}</TableCell>
                    <TableCell className="text-right">{fmt(e.liabilities)}</TableCell>
                    <TableCell className="text-right">{fmt(e.equity)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/30 border-t-2">
                  <TableCell>Consolidated</TableCell>
                  <TableCell className="text-right">{fmt(bs.consolidated.total_assets)}</TableCell>
                  <TableCell className="text-right">{fmt(bs.consolidated.total_liabilities)}</TableCell>
                  <TableCell className="text-right">{fmt(bs.consolidated.total_equity)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : <p className="text-center text-muted-foreground py-8">Balance sheet data loading…</p>}
        </TabsContent>

        <TabsContent value="eliminations">
          <div className="flex justify-end mb-3"><Button size="sm" onClick={() => setElimOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Elimination</Button></div>
          <Table>
            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>DR Account</TableHead><TableHead>CR Account</TableHead></TableRow></TableHeader>
            <TableBody>
              {(eliminations as any[]).map((e: any) => (
                <TableRow key={e.id}>
                  <TableCell><Badge variant="outline">{e.elimination_type}</Badge></TableCell>
                  <TableCell>{e.description}</TableCell>
                  <TableCell className="text-right">{fmt(Number(e.amount_paise) / 100)}</TableCell>
                  <TableCell className="font-mono text-xs">{e.dr_account}</TableCell>
                  <TableCell className="font-mono text-xs">{e.cr_account}</TableCell>
                </TableRow>
              ))}
              {(eliminations as any[]).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No eliminations for this period</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        {consolData && (
          <TabsContent value="trial">
            <Table>
              <TableHeader><TableRow><TableHead>Code</TableHead><TableHead>Account</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Total Debit</TableHead><TableHead className="text-right">Total Credit</TableHead></TableRow></TableHeader>
              <TableBody>
                {consolData.consolidated_trial_balance?.slice(0, 50).map((r: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono text-xs">{r.code}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.account_type}</Badge></TableCell>
                    <TableCell className="text-right">{r.total_debit.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.total_credit.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Company to Group</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Company Name</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Subsidiary Ltd." /></div>
            <div><Label>Tenant ID</Label><Input type="number" value={form.member_tenant_id} onChange={e => setForm(f => ({ ...f, member_tenant_id: e.target.value }))} placeholder="2" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addCompany.mutate(form)} disabled={!form.company_name || addCompany.isPending}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={elimOpen} onOpenChange={setElimOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Intercompany Elimination</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Elimination Type</Label>
              <Select value={elim.elimination_type} onValueChange={v => setElim(e => ({ ...e, elimination_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["intercompany_revenue","intercompany_expense","intercompany_loan","dividend_elimination","unrealised_profit"].map(t => <SelectItem key={t} value={t}>{t.replace(/_/g,' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Amount (${sym})</Label><Input type="number" value={elim.amount_paise} onChange={e => setElim(f => ({ ...f, amount_paise: e.target.value }))} /></div>
            <div><Label>DR Account</Label><Input value={elim.dr_account} onChange={e => setElim(f => ({ ...f, dr_account: e.target.value }))} placeholder="4001" /></div>
            <div><Label>CR Account</Label><Input value={elim.cr_account} onChange={e => setElim(f => ({ ...f, cr_account: e.target.value }))} placeholder="5001" /></div>
            <div className="col-span-2"><Label>Description</Label><Input value={elim.description} onChange={e => setElim(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setElimOpen(false)}>Cancel</Button>
            <Button onClick={() => addElim.mutate(elim)} disabled={addElim.isPending}>Add Elimination</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
