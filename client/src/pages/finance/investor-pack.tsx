import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const api = (method: string, path: string, body?: any) =>
  fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); });

const fmt = (n: number, currency = true) => currency
  ? `${sym}${(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`
  : String((n || 0).toFixed(1));

const pct = (n: number) => `${(n || 0).toFixed(1)}%`;

const KPI = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) => (
  <Card><CardContent className="pt-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-xl font-bold mt-1 ${color || ""}`}>{value}</p>
    {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
  </CardContent></Card>
);

export default function InvestorPackPage() {
  const { toast } = useToast();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;

  const [cohortMonths, setCohortMonths] = useState("6");
  const [calculating, setCalculating] = useState(false);

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ["investor-summary"],
    queryFn: () => fetch("/api/finance-erp/investor/summary").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const { data: ebitda } = useQuery({
    queryKey: ["investor-ebitda"],
    queryFn: () => fetch("/api/finance-erp/investor/ebitda").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const { data: burnData } = useQuery({
    queryKey: ["investor-burn"],
    queryFn: () => fetch("/api/finance-erp/investor/burn-rate").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const { data: mrrData } = useQuery({
    queryKey: ["investor-mrr"],
    queryFn: () => fetch("/api/finance-erp/investor/mrr-arr").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const { data: ltvData } = useQuery({
    queryKey: ["investor-ltv"],
    queryFn: () => fetch("/api/finance-erp/investor/ltv-cac").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const { data: cohortData } = useQuery({
    queryKey: ["investor-cohort", cohortMonths],
    queryFn: () => fetch(`/api/finance-erp/investor/cohort?months=${cohortMonths}`).then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const { data: metrics } = useQuery({
    queryKey: ["investor-metrics"],
    queryFn: () => fetch("/api/investor/metrics?limit=1").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const { data: runway } = useQuery({
    queryKey: ["investor-runway"],
    queryFn: () => fetch("/api/investor/runway").then(async r => { if (!r.ok) throw new Error(await r.text().catch(()=>r.statusText)); return r.json(); }),
  });

  const calcMetrics = useMutation({
    mutationFn: () => api("POST", "/api/investor/metrics/auto-calculate", {}),
    onSuccess: () => { toast({ title: "Metrics recalculated" }); },
  });

  const exportPDF = () => window.open("/api/investor/report/pdf", "_blank");

  const m = Array.isArray(metrics) ? metrics[0] : metrics;
  const r = runway || {};
  const s = summary || {};
  const eb = ebitda || {};
  const br = burnData || {};
  const mr = mrrData || {};
  const lv = ltvData || {};

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PE/VC Investor Reporting Pack</h1>
          <p className="text-sm text-muted-foreground">EBITDA · Burn Rate · MRR/ARR Waterfall · Cohort Analysis · LTV:CAC · Runway</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => calcMetrics.mutate()} disabled={calcMetrics.isPending}>
            {calcMetrics.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
            Recalculate
          </Button>
          <Button size="sm" onClick={exportPDF}><Download className="h-3 w-3 mr-1" />Export Pack</Button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <KPI label="Revenue (FY)" value={fmt(s.revenue)} />
        <KPI label="EBITDA" value={fmt(eb.ebitda)} sub={pct(eb.ebitda_margin_pct) + " margin"} color={eb.ebitda >= 0 ? "text-green-600" : "text-red-600"} />
        <KPI label="Cash Burn/mo" value={fmt(br.avg_monthly_burn)} color="text-red-600" />
        <KPI label="Runway" value={`${r.runway_months || m?.runway_months || "—"} mo`} color={(r.runway_months || m?.runway_months || 0) < 6 ? "text-red-600" : "text-green-600"} />
        <KPI label="MRR" value={fmt(mr.mrr || m?.mrr)} sub={`ARR: ${fmt(mr.arr || m?.arr)}`} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <KPI label="Gross Margin" value={pct(m?.gross_margin_pct)} />
        <KPI label="LTV" value={fmt(lv.ltv)} />
        <KPI label="CAC" value={fmt(lv.cac)} />
        <KPI label="LTV:CAC Ratio" value={(lv.ltv_cac_ratio || m?.ltv_cac_ratio || 0).toFixed(2) + "x"} color={(lv.ltv_cac_ratio || m?.ltv_cac_ratio || 0) >= 3 ? "text-green-600" : "text-amber-600"} />
      </div>

      <Tabs defaultValue="ebitda">
        <TabsList>
          <TabsTrigger value="ebitda">EBITDA Bridge</TabsTrigger>
          <TabsTrigger value="mrr">MRR Waterfall</TabsTrigger>
          <TabsTrigger value="burn">Burn Analysis</TabsTrigger>
          <TabsTrigger value="cohort">Cohort MRR</TabsTrigger>
          <TabsTrigger value="runway">Runway</TabsTrigger>
        </TabsList>

        <TabsContent value="ebitda">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">EBITDA Breakdown</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {[
                      { label: "Revenue", value: eb.revenue, positive: true },
                      { label: "COGS", value: -(eb.cogs || 0), positive: false },
                      { label: "Gross Profit", value: eb.gross_profit, positive: true },
                      { label: "Operating Expenses", value: -(eb.opex || 0), positive: false },
                      { label: "EBITDA", value: eb.ebitda, positive: (eb.ebitda || 0) >= 0, bold: true },
                      { label: "EBITDA Margin", value: null, label2: pct(eb.ebitda_margin_pct), bold: true },
                    ].map((row, i) => (
                      <TableRow key={i} className={row.bold ? "font-bold border-t-2" : ""}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell className={`text-right ${row.value !== null ? (row.positive ? "text-green-700" : "text-red-700") : ""}`}>
                          {row.value !== null ? fmt(row.value) : row.label2}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">FY Summary</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {[
                      ["FY", s.fy || "2025-2026"],
                      ["As of", s.as_of || "—"],
                      ["Revenue", fmt(s.revenue)],
                      ["Total Expenses", fmt(s.total_expenses)],
                      ["EBITDA", fmt(s.ebitda)],
                      ["Cash & Bank", fmt(s.cash_and_bank)],
                      ["Active Customers", (s.active_customers || 0).toLocaleString()],
                      ["Invoices Raised", (s.invoices_raised || 0).toLocaleString()],
                    ].map(([k, v], i) => (
                      <TableRow key={i}><TableCell className="text-muted-foreground">{k}</TableCell><TableCell className="font-medium text-right">{v}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="mrr">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">MRR Waterfall</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {[
                      { label: "Opening MRR", value: mr.opening_mrr || m?.opening_mrr },
                      { label: "+ New MRR", value: mr.new_mrr || m?.new_mrr },
                      { label: "+ Expansion MRR", value: mr.expansion_mrr || m?.expansion_mrr },
                      { label: "- Churn MRR", value: -(mr.churned_mrr || m?.churn_mrr || 0) },
                      { label: "= Closing MRR", value: mr.mrr || m?.closing_mrr, bold: true },
                    ].map((row, i) => (
                      <TableRow key={i} className={row.bold ? "font-bold border-t-2" : ""}>
                        <TableCell>{row.label}</TableCell>
                        <TableCell className={`text-right ${(row.value || 0) < 0 ? "text-red-600" : "text-green-700"}`}>{fmt(row.value || 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">ARR Metrics</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {[
                      ["MRR", fmt(mr.mrr || m?.mrr)],
                      ["ARR", fmt(mr.arr || m?.arr)],
                      ["Churn Rate", pct(mr.churn_rate)],
                      ["Revenue Retention", pct(mr.net_revenue_retention)],
                      ["Paying Customers", (mr.paying_customers || 0).toLocaleString()],
                      ["ARPU", fmt(mr.arpu)],
                    ].map(([k, v], i) => (
                      <TableRow key={i}><TableCell className="text-muted-foreground">{k}</TableCell><TableCell className="font-medium text-right">{v}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="burn">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-sm">Cash Burn Analysis</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableBody>
                    {[
                      ["Cash In-flows", fmt(br.total_inflows)],
                      ["Cash Out-flows", fmt(br.total_outflows)],
                      ["Net Cash Flow", fmt(br.net_cash_flow)],
                      ["Avg Monthly Burn", fmt(br.avg_monthly_burn)],
                      ["Gross Burn", fmt(br.gross_burn)],
                      ["Net Burn", fmt(br.net_burn)],
                    ].map(([k, v], i) => (
                      <TableRow key={i}><TableCell className="text-muted-foreground">{k}</TableCell><TableCell className={`font-medium text-right ${(i === 2 || i === 3 || i === 5) ? "text-red-600" : ""}`}>{v}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Monthly Burn Trend</CardTitle></CardHeader>
              <CardContent>
                {(br.monthly_breakdown || []).slice(0, 6).map((mo: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1 border-b last:border-0">
                    <span className="text-sm">{mo.month}</span>
                    <div className="flex gap-2 text-sm">
                      <span className="text-green-700">{fmt(mo.inflows)}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className={mo.net >= 0 ? "text-green-700" : "text-red-700"}>{fmt(mo.net)}</span>
                    </div>
                  </div>
                ))}
                {!(br.monthly_breakdown?.length) && <p className="text-center text-muted-foreground py-4">No monthly data available</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cohort" className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Lookback Period</Label>
            <Select value={cohortMonths} onValueChange={setCohortMonths}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="3">3 months</SelectItem><SelectItem value="6">6 months</SelectItem><SelectItem value="12">12 months</SelectItem></SelectContent>
            </Select>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-sm">Cohort MRR Retention</CardTitle></CardHeader>
            <CardContent>
              {cohortData?.cohorts?.length > 0 ? (
                <Table>
                  <TableHeader><TableRow><TableHead>Cohort Month</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Customers</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {cohortData.cohorts.slice(0, 30).map((c: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs">{c.cohort_month ? new Date(c.cohort_month).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}</TableCell>
                        <TableCell>M+{c.period}</TableCell>
                        <TableCell className="text-right">{c.customers}</TableCell>
                        <TableCell className="text-right">{fmt(Number(c.revenue || 0))}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : <p className="text-center text-muted-foreground py-6">No cohort data — requires historical invoice records</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runway">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <KPI label="Cash Balance" value={fmt(r.cash_balance)} />
            <KPI label="Avg Monthly Burn" value={fmt(r.avg_monthly_burn)} color="text-red-600" />
            <KPI label="Estimated Runway" value={`${r.runway_months || 0} months`} color={(r.runway_months || 0) < 6 ? "text-red-600" : "text-green-600"} sub={(r.runway_months || 0) < 6 ? "⚠ < 6 months — fundraising urgent" : "Healthy runway"} />
          </div>
          <Card>
            <CardContent className="pt-4">
              <div className="bg-gray-100 rounded-full h-4 relative overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${(r.runway_months || 0) < 6 ? "bg-red-500" : (r.runway_months || 0) < 12 ? "bg-amber-500" : "bg-green-500"}`}
                  style={{ width: `${Math.min(100, ((r.runway_months || 0) / 24) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>0</span><span>6 mo</span><span>12 mo</span><span>18 mo</span><span>24 mo</span></div>
              <p className="text-sm text-muted-foreground mt-3">
                At current burn rate of {fmt(r.avg_monthly_burn)}/month, cash will last until approximately{" "}
                {r.runway_months ? new Date(Date.now() + r.runway_months * 30 * 86400000).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "—"}.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
