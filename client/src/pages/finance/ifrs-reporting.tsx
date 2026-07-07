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
import { Plus, Play, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function IFRSReportingPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [assetOpen, setAssetOpen] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const [impairOpen, setImpairOpen] = useState<number | null>(null);
  const [period, setPeriod] = useState({ month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()) });
  const [assetForm, setAssetForm] = useState({ asset_name: "", asset_code: "", asset_class: "PPE", acquisition_date: "", acquisition_cost: "", useful_life_months: "60", residual_value: "0", depreciation_method: "straight_line" });
  const [contractForm, setContractForm] = useState({ contract_no: "", customer_name: "", contract_date: "", total_contract_value: "", standard: "IFRS15" });

  const { data: assets = [] } = useQuery<any[]>({ queryKey: ["ifrs-assets"], queryFn: () => fetch("/api/ifrs/fixed-assets").then(r => r.json()) });
  const { data: schedule } = useQuery({ queryKey: ["ifrs-schedule"], queryFn: () => fetch("/api/ifrs/fixed-assets/schedule").then(r => r.json()) });
  const { data: contracts = [] } = useQuery<any[]>({ queryKey: ["ifrs-contracts"], queryFn: () => fetch("/api/ifrs/revenue-contracts").then(r => r.json()) });
  const { data: contractSummary } = useQuery({ queryKey: ["ifrs-contract-summary"], queryFn: () => fetch("/api/ifrs/revenue-contracts/summary").then(r => r.json()) });
  const { data: deferred } = useQuery({ queryKey: ["ifrs-deferred"], queryFn: () => fetch("/api/ifrs/revenue-contracts/deferred-waterfall").then(r => r.json()) });
  const { data: forexRates = [] } = useQuery<any[]>({ queryKey: ["forex-rates"], queryFn: () => fetch("/api/ifrs/forex/rates").then(r => r.json()) });
  const { data: periodClose = [] } = useQuery<any[]>({ queryKey: ["period-close", period.year], queryFn: () => fetch(`/api/ifrs/period-close?year=${period.year}`).then(r => r.json()) });

  const addAsset = useMutation({
    mutationFn: (d: any) => api("POST", "/api/ifrs/fixed-assets", { ...d, acquisition_cost: Number(d.acquisition_cost), useful_life_months: Number(d.useful_life_months), residual_value: Number(d.residual_value) }),
    onSuccess: () => { toast({ title: "Asset added" }); qc.invalidateQueries({ queryKey: ["ifrs-assets"] }); setAssetOpen(false); },
  });

  const depreciate = useMutation({
    mutationFn: (id: number) => api("POST", `/api/ifrs/fixed-assets/${id}/depreciate`, {}),
    onSuccess: (d) => { toast({ title: `Depreciation: ${fmt(d.monthly_charge || 0)} · NBV: ${fmt(d.new_nbv || 0)}` }); qc.invalidateQueries({ queryKey: ["ifrs-assets"] }); },
  });

  const runAllDepreciation = useMutation({
    mutationFn: () => api("POST", "/api/ifrs/fixed-assets/run-depreciation", {}),
    onSuccess: (d) => { toast({ title: `${d.processed} assets depreciated` }); qc.invalidateQueries({ queryKey: ["ifrs-assets"] }); },
  });

  const impairAsset = useMutation({
    mutationFn: ({ id, recoverable_amount }: any) => api("POST", `/api/ifrs/fixed-assets/${id}/impair`, { recoverable_amount: Number(recoverable_amount), reason: "Market impairment test" }),
    onSuccess: (d) => { toast({ title: `IAS 36 Impairment loss: ${fmt(d.impairment_loss || 0)}` }); qc.invalidateQueries({ queryKey: ["ifrs-assets"] }); setImpairOpen(null); },
  });

  const addContract = useMutation({
    mutationFn: (d: any) => api("POST", "/api/ifrs/revenue-contracts", { ...d, total_contract_value: Number(d.total_contract_value), performance_obligations: [{ id: 1, description: "Primary obligation", standalone_selling_price: Number(d.total_contract_value), completion_pct: 0, status: "pending", remaining_months: 12 }] }),
    onSuccess: () => { toast({ title: "Contract added" }); qc.invalidateQueries({ queryKey: ["ifrs-contracts"] }); setContractOpen(false); },
  });

  const runPeriodClose = useMutation({
    mutationFn: () => api("POST", "/api/ifrs/period-close/run", { period_month: Number(period.month), period_year: Number(period.year) }),
    onSuccess: (d) => { toast({ title: `Period close: ${d.steps?.filter((s: any) => s.status === "done").length}/${d.steps?.length} steps done` }); qc.invalidateQueries({ queryKey: ["period-close"] }); },
  });

  const STATUS_COLOR: Record<string, string> = { active: "bg-green-100 text-green-700", impaired: "bg-red-100 text-red-700", disposed: "bg-gray-100 text-gray-700" };
  const STEP_COLOR: Record<string, string> = { done: "bg-green-100 text-green-700", error: "bg-red-100 text-red-700", in_progress: "bg-blue-100 text-blue-700" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">IFRS / GAAP Reporting</h1>
          <p className="text-sm text-muted-foreground">IAS 16 Fixed Assets · IAS 36 Impairment · IFRS 15 / ASC 606 Revenue · Period Close</p>
        </div>
        <div className="flex gap-2">
          <Select value={period.month} onValueChange={v => setPeriod(p => ({ ...p, month: v }))}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>{["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => <SelectItem key={i} value={String(i+1)}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={period.year} onValueChange={v => setPeriod(p => ({ ...p, year: v }))}>
            <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
            <SelectContent>{["2024","2025","2026"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {contractSummary && (
        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Contract Value</p><p className="text-xl font-bold">{fmt(Number(contractSummary.total_value))}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Revenue Recognized</p><p className="text-xl font-bold text-green-600">{fmt(Number(contractSummary.recognized))}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Deferred Revenue</p><p className="text-xl font-bold text-amber-600">{fmt(Number(contractSummary.deferred))}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Contract Asset (Unbilled)</p><p className="text-xl font-bold">{fmt(Number(contractSummary.unbilled))}</p></CardContent></Card>
        </div>
      )}

      <Tabs defaultValue="ias16">
        <TabsList>
          <TabsTrigger value="ias16">IAS 16 — Fixed Assets</TabsTrigger>
          <TabsTrigger value="ifrs15">IFRS 15 / ASC 606 — Revenue</TabsTrigger>
          <TabsTrigger value="forex">Forex Rates</TabsTrigger>
          <TabsTrigger value="period-close">Period Close</TabsTrigger>
        </TabsList>

        <TabsContent value="ias16" className="space-y-3">
          <div className="flex justify-between items-center">
            <Button size="sm" variant="outline" onClick={() => runAllDepreciation.mutate()} disabled={runAllDepreciation.isPending}>
              {runAllDepreciation.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Run All Depreciation
            </Button>
            <Button size="sm" onClick={() => setAssetOpen(true)}><Plus className="h-3 w-3 mr-1" />Add Asset</Button>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Asset</TableHead><TableHead>Class</TableHead><TableHead className="text-right">Cost</TableHead><TableHead className="text-right">Acc. Depr.</TableHead><TableHead className="text-right">NBV</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {(assets as any[]).map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.asset_name}<div className="text-xs text-muted-foreground">{a.asset_code}</div></TableCell>
                  <TableCell>{a.asset_class}</TableCell>
                  <TableCell className="text-right">{fmt(Number(a.acquisition_cost))}</TableCell>
                  <TableCell className="text-right text-red-600">{fmt(Number(a.accumulated_depreciation))}</TableCell>
                  <TableCell className="text-right font-semibold">{fmt(Number(a.net_book_value))}</TableCell>
                  <TableCell className="text-xs">{a.depreciation_method}</TableCell>
                  <TableCell><Badge className={`text-xs ${STATUS_COLOR[a.status] || ""}`}>{a.status}</Badge></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => depreciate.mutate(a.id)} className="text-xs h-7 px-2">Depreciate</Button>
                      <Button size="sm" variant="outline" onClick={() => setImpairOpen(a.id)} className="text-xs h-7 px-2 text-amber-700"><AlertTriangle className="h-3 w-3" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(assets as any[]).length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No fixed assets. Add assets to begin IAS 16 depreciation tracking.</TableCell></TableRow>}
            </TableBody>
          </Table>
          {schedule?.assets?.length > 0 && (
            <Card><CardHeader><CardTitle className="text-sm">Depreciation Schedule</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table><TableHeader><TableRow><TableHead>Asset</TableHead><TableHead className="text-right">Monthly Charge</TableHead><TableHead className="text-right">Remaining Months</TableHead><TableHead>Fully Depreciated</TableHead></TableRow></TableHeader>
                  <TableBody>{schedule.assets.map((a: any, i: number) => (
                    <TableRow key={i}><TableCell>{a.name}</TableCell><TableCell className="text-right">{fmt(a.monthly_charge)}</TableCell><TableCell className="text-right">{a.remaining_months}</TableCell><TableCell className="text-xs">{a.projected_fully_depreciated_date}</TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ifrs15" className="space-y-3">
          <div className="flex justify-end"><Button size="sm" onClick={() => setContractOpen(true)}><Plus className="h-3 w-3 mr-1" />Add Contract</Button></div>
          <Table>
            <TableHeader><TableRow><TableHead>Contract No</TableHead><TableHead>Customer</TableHead><TableHead>Standard</TableHead><TableHead className="text-right">Contract Value</TableHead><TableHead className="text-right">Recognized</TableHead><TableHead className="text-right">Deferred</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {(contracts as any[]).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.contract_no}</TableCell>
                  <TableCell>{c.customer_name}</TableCell>
                  <TableCell><Badge variant="outline">{c.standard}</Badge></TableCell>
                  <TableCell className="text-right">{fmt(Number(c.total_contract_value))}</TableCell>
                  <TableCell className="text-right text-green-700">{fmt(Number(c.revenue_recognized))}</TableCell>
                  <TableCell className="text-right text-amber-700">{fmt(Number(c.deferred_revenue))}</TableCell>
                  <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                </TableRow>
              ))}
              {(contracts as any[]).length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No revenue contracts. Add IFRS 15 / ASC 606 contracts.</TableCell></TableRow>}
            </TableBody>
          </Table>
          {deferred?.periods?.length > 0 && (
            <Card><CardHeader><CardTitle className="text-sm">Revenue Recognition Waterfall</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table><TableHeader><TableRow><TableHead>Month/Year</TableHead><TableHead className="text-right">To Recognize</TableHead></TableRow></TableHeader>
                  <TableBody>{deferred.periods.map((p: any, i: number) => (
                    <TableRow key={i}><TableCell>{p.month}/{p.year}</TableCell><TableCell className="text-right">{fmt(p.to_recognize)}</TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="forex" className="space-y-3">
          <p className="text-sm text-muted-foreground">Maintained forex rates used for multi-currency subsidiary consolidation and IAS 21 translation.</p>
          <Table>
            <TableHeader><TableRow><TableHead>From</TableHead><TableHead>To</TableHead><TableHead className="text-right">Rate</TableHead><TableHead>Date</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
            <TableBody>
              {(forexRates as any[]).slice(0, 30).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono font-bold">{r.from_currency}</TableCell>
                  <TableCell className="font-mono">{r.to_currency}</TableCell>
                  <TableCell className="text-right">{Number(r.rate).toFixed(4)}</TableCell>
                  <TableCell>{r.rate_date}</TableCell>
                  <TableCell><Badge variant="outline">{r.source}</Badge></TableCell>
                </TableRow>
              ))}
              {(forexRates as any[]).length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No forex rates. Rates are loaded from RBI/ECB APIs or entered manually.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="period-close" className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => runPeriodClose.mutate()} disabled={runPeriodClose.isPending}>
              {runPeriodClose.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              Run Period Close ({["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][Number(period.month)-1]} {period.year})
            </Button>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800 mb-3">
            Period close runs: (1) IAS 16 depreciation for all active assets, (2) Forex revaluation, (3) IFRS 15 revenue recognition check, (4) Consolidation run, (5) Lock period.
          </div>
          {runPeriodClose.data?.steps && (
            <div className="space-y-2">{runPeriodClose.data.steps.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded">
                <span className="font-medium">{s.name}</span>
                <div className="flex items-center gap-2">
                  {s.amount_impact > 0 && <span className="text-xs text-muted-foreground">{fmt(s.amount_impact / 100)}</span>}
                  {s.assets_processed !== undefined && <span className="text-xs text-muted-foreground">{s.assets_processed} assets</span>}
                  <Badge className={`text-xs ${STEP_COLOR[s.status] || ""}`}>{s.status}</Badge>
                </div>
              </div>
            ))}</div>
          )}
          <Table>
            <TableHeader><TableRow><TableHead>Period</TableHead><TableHead>Depreciation</TableHead><TableHead>Forex</TableHead><TableHead>Consolidation</TableHead><TableHead>Status</TableHead><TableHead>Closed By</TableHead></TableRow></TableHeader>
            <TableBody>
              {(periodClose as any[]).map((pc: any) => (
                <TableRow key={pc.id}>
                  <TableCell>{pc.period_month}/{pc.period_year}</TableCell>
                  <TableCell><Badge className={`text-xs ${pc.depreciation_posted ? "bg-green-100 text-green-700" : "bg-gray-100"}`}>{pc.depreciation_posted ? "✓" : "—"}</Badge></TableCell>
                  <TableCell><Badge className={`text-xs ${pc.forex_revaluation_posted ? "bg-green-100 text-green-700" : "bg-gray-100"}`}>{pc.forex_revaluation_posted ? "✓" : "—"}</Badge></TableCell>
                  <TableCell><Badge className={`text-xs ${pc.consolidation_run ? "bg-green-100 text-green-700" : "bg-gray-100"}`}>{pc.consolidation_run ? "✓" : "—"}</Badge></TableCell>
                  <TableCell><Badge variant={pc.status === "closed" ? "default" : "secondary"}>{pc.status}</Badge></TableCell>
                  <TableCell className="text-xs">{pc.closed_by || "—"}</TableCell>
                </TableRow>
              ))}
              {(periodClose as any[]).length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No period close history</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      <Dialog open={assetOpen} onOpenChange={setAssetOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Fixed Asset (IAS 16)</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Asset Name</Label><Input value={assetForm.asset_name} onChange={e => setAssetForm(f => ({ ...f, asset_name: e.target.value }))} /></div>
            <div><Label>Asset Code</Label><Input value={assetForm.asset_code} onChange={e => setAssetForm(f => ({ ...f, asset_code: e.target.value }))} placeholder="FA-001" /></div>
            <div><Label>Asset Class</Label>
              <Select value={assetForm.asset_class} onValueChange={v => setAssetForm(f => ({ ...f, asset_class: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["PPE","Intangible","CWIP","Investment Property","ROU Asset"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Acquisition Date</Label><Input type="date" value={assetForm.acquisition_date} onChange={e => setAssetForm(f => ({ ...f, acquisition_date: e.target.value }))} /></div>
            <div><Label>Cost (₹)</Label><Input type="number" value={assetForm.acquisition_cost} onChange={e => setAssetForm(f => ({ ...f, acquisition_cost: e.target.value }))} /></div>
            <div><Label>Residual Value (₹)</Label><Input type="number" value={assetForm.residual_value} onChange={e => setAssetForm(f => ({ ...f, residual_value: e.target.value }))} /></div>
            <div><Label>Useful Life (months)</Label><Input type="number" value={assetForm.useful_life_months} onChange={e => setAssetForm(f => ({ ...f, useful_life_months: e.target.value }))} /></div>
            <div><Label>Method</Label>
              <Select value={assetForm.depreciation_method} onValueChange={v => setAssetForm(f => ({ ...f, depreciation_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="straight_line">Straight Line</SelectItem><SelectItem value="declining_balance">Declining Balance</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssetOpen(false)}>Cancel</Button>
            <Button onClick={() => addAsset.mutate(assetForm)} disabled={!assetForm.asset_name || addAsset.isPending}>Add Asset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={contractOpen} onOpenChange={setContractOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Revenue Contract (IFRS 15 / ASC 606)</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Contract No</Label><Input value={contractForm.contract_no} onChange={e => setContractForm(f => ({ ...f, contract_no: e.target.value }))} placeholder="CON-2026-001" /></div>
            <div><Label>Standard</Label>
              <Select value={contractForm.standard} onValueChange={v => setContractForm(f => ({ ...f, standard: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="IFRS15">IFRS 15</SelectItem><SelectItem value="ASC606">ASC 606 (US GAAP)</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Customer</Label><Input value={contractForm.customer_name} onChange={e => setContractForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
            <div><Label>Contract Date</Label><Input type="date" value={contractForm.contract_date} onChange={e => setContractForm(f => ({ ...f, contract_date: e.target.value }))} /></div>
            <div><Label>Total Value (₹)</Label><Input type="number" value={contractForm.total_contract_value} onChange={e => setContractForm(f => ({ ...f, total_contract_value: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractOpen(false)}>Cancel</Button>
            <Button onClick={() => addContract.mutate(contractForm)} disabled={!contractForm.contract_no || addContract.isPending}>Add Contract</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {impairOpen !== null && (
        <ImpairDialog assetId={impairOpen} onClose={() => setImpairOpen(null)} onSubmit={(id, val) => impairAsset.mutate({ id, recoverable_amount: val })} pending={impairAsset.isPending} />
      )}
    </div>
  );
}

function ImpairDialog({ assetId, onClose, onSubmit, pending }: { assetId: number; onClose: () => void; onSubmit: (id: number, val: string) => void; pending: boolean }) {
  const [val, setVal] = useState("");
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>IAS 36 Impairment Test — Asset #{assetId}</DialogTitle></DialogHeader>
        <div><Label>Recoverable Amount (₹)</Label><Input type="number" value={val} onChange={e => setVal(e.target.value)} placeholder="Enter recoverable amount" /></div>
        <p className="text-xs text-muted-foreground">If recoverable amount &lt; NBV, impairment loss = NBV − Recoverable amount. GL: DR Impairment Loss / CR Accumulated Impairment.</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit(assetId, val)} disabled={!val || pending} className="bg-amber-600 hover:bg-amber-700">Record Impairment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
