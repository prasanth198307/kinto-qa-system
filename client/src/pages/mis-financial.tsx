import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Calendar, Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";
import { exportToExcel, formatDateForExcel } from "@/lib/excel-export";
import { format } from "date-fns";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

/* ─── API shape ──────────────────────────────────────────────────────── */
interface FinancialData {
  fy: string; fyStart: string; fyEnd: string;
  kpis: {
    plRevenue: number; plExpenses: number; netProfit: number; netMargin: number;
    totalBilled: number; totalOutstanding: number; overdueCount: number;
    cashBalance: number; bankBalance: number;
    unreconciledCount: number; unreconciledAmount: number;
  };
  monthlyTrend: Array<{ month: string; revenue: number; expenses: number }>;
  receivablesAging: Array<{ bucket: string; count: number; outstanding: number }>;
  topDebtors: Array<{ customer: string; invoiceCount: number; totalBilled: number; totalCollected: number; outstanding: number; latestInvoice: string }>;
  trialGroups: Array<{ groupName: string; accountType: string; totalDebit: number; totalCredit: number; netBalance: number; accountCount: number }>;
  balanceSheet: { assets: number; liabilities: number; equity: number };
  bankReconciliation: { unreconciledCount: number; unreconciledAmount: number };
  recentJournals: Array<{ id: string; date: string; reference: string; narration: string; sourceType: string; amount: number; lineCount: number; flags: string[] }>;
  insights: Array<{ priority: string; label: string; title: string; body: string }>;
}

/* ─── Period options ─────────────────────────────────────────────────── */
const PERIOD_GROUPS = [
  {
    group: "This FY (Apr–Mar)",
    options: [
      { value: "full_year", label: "Full Year" },
      { value: "h1",        label: "H1 (Apr–Sep)" },
      { value: "h2",        label: "H2 (Oct–Mar)" },
      { value: "q1",        label: "Q1 (Apr–Jun)" },
      { value: "q2",        label: "Q2 (Jul–Sep)" },
      { value: "q3",        label: "Q3 (Oct–Dec)" },
      { value: "q4",        label: "Q4 (Jan–Mar)" },
    ],
  },
  {
    group: "Custom",
    options: [{ value: "custom", label: "Custom Range" }],
  },
];

function buildFyOptions() {
  const cur = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  return [cur, cur - 1, cur - 2].map((y) => ({ value: String(y), label: `FY ${y}–${String(y + 1).slice(2)}` }));
}
const FY_OPTIONS = buildFyOptions();

/* ─── Formatters ─────────────────────────────────────────────────────── */
function fmtCurrSymbol(paise: number, sym: string): string {
  const n = Math.abs(paise / 100);
  if (n >= 10000000) return `${sym}${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000)   return `${sym}${(n / 100000).toFixed(2)}L`;
  if (n >= 1000)     return `${sym}${(n / 1000).toFixed(1)}K`;
  return `${sym}${Math.round(n).toLocaleString()}`;
}
function pct(n: number, d: number) { return d > 0 ? Math.round((n / d) * 100) : 0; }
function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

/* ─── Tiny chips ─────────────────────────────────────────────────────── */
function GreenChip({ children }: { children: React.ReactNode }) {
  return <span style={{ background: "#EAF3DE", color: "#3B6D11", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>{children}</span>;
}
function RedChip({ children }: { children: React.ReactNode }) {
  return <span style={{ background: "#FCEBEB", color: "#A32D2D", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>{children}</span>;
}
function AmberChip({ children }: { children: React.ReactNode }) {
  return <span style={{ background: "#FAEEDA", color: "#854F0B", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>{children}</span>;
}
function BlueChip({ children }: { children: React.ReactNode }) {
  return <span style={{ background: "#E6F1FB", color: "#185FA5", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>{children}</span>;
}
function PurpleChip({ children }: { children: React.ReactNode }) {
  return <span style={{ background: "#EEEDFE", color: "#534AB7", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>{children}</span>;
}
function GrayChip({ children }: { children: React.ReactNode }) {
  return <span className="border" style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, whiteSpace: "nowrap" }}>{children}</span>;
}

/* ─── KPI Card ───────────────────────────────────────────────────────── */
function KpiCard({ label, value, meta, chip, valueColor, bg }: {
  label: string; value: string; meta?: string;
  chip?: React.ReactNode; valueColor?: string; bg?: string;
}) {
  return (
    <div className="rounded-lg p-3" style={{ background: bg ?? "hsl(var(--muted)/0.5)" }}>
      <p className="text-muted-foreground" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px", color: valueColor ?? "inherit" }}>{value}</p>
      <div style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }} className="text-muted-foreground">
        {meta && <span>{meta}</span>}
        {chip}
      </div>
    </div>
  );
}

/* ─── Section heading ────────────────────────────────────────────────── */
function SectionHd({ title, sub, right }: { title: string; sub: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      {right}
    </div>
  );
}

/* ─── Mini progress bar ──────────────────────────────────────────────── */
function MiniBar({ pct: p, color }: { pct: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, background: "hsl(var(--muted))", borderRadius: 3, height: 6, overflow: "hidden", minWidth: 50 }}>
        <div style={{ width: `${Math.min(p, 100)}%`, height: 6, background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color, minWidth: 28 }}>{Math.round(p)}%</span>
    </div>
  );
}

/* ─── Chart tooltip ──────────────────────────────────────────────────── */
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-background p-2 shadow text-xs space-y-1">
      <p className="font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {fmtCurr(p.value * 100)}</p>
      ))}
    </div>
  );
}

const CHART_IN  = "#97C459";
const CHART_OUT = "#F09595";
const CHART_NET = "#378ADD";

/* ═══════════════════════════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════════════════════════ */
export default function MISFinancial() {
  const tenantConfig = useTenantConfig();
  const fmtCurr = (paise: number) => fmtCurrSymbol(paise, tenantConfig.currency_symbol);
  const fmtFull = (paise: number) => fmtCur(Math.abs(paise / 100), tenantConfig);
  const curFy = new Date().getMonth() >= 3 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const [period, setPeriod]       = useState("full_year");
  const [fy, setFy]               = useState(String(curFy));
  const [customFrom, setCustomFrom] = useState(format(new Date(curFy, 3, 1), "yyyy-MM-dd"));
  const [customTo, setCustomTo]   = useState(format(new Date(), "yyyy-MM-dd"));
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const isCustom = period === "custom";
  const customReady = isCustom && appliedFrom && appliedTo;

  const qParams: Record<string, string> = { period, fy };
  if (customReady) { qParams.from = appliedFrom; qParams.to = appliedTo; }

  const { data, isLoading } = useQuery<FinancialData>({
    queryKey: ["/api/mis/financial-analytics", qParams],
    enabled: !isCustom || !!customReady,
    queryFn: async () => {
      const qs = new URLSearchParams(qParams).toString();
      const res = await fetch(`/api/mis/financial-analytics?${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const kpis      = data?.kpis;
  const netProfit = kpis?.netProfit ?? 0;
  const netMargin = kpis?.netMargin ?? 0;
  const totalAging = useMemo(() => (data?.receivablesAging ?? []).reduce((s, r) => s + r.outstanding, 0), [data]);

  const chartData = useMemo(() =>
    (data?.monthlyTrend ?? []).map((m) => ({
      name: monthLabel(m.month),
      Revenue: Math.round(m.revenue / 100),
      Expenses: Math.round(m.expenses / 100),
      Net: Math.round((m.revenue - m.expenses) / 100),
    })), [data]);

  const expRatio = kpis?.plRevenue ? pct(kpis.plExpenses, kpis.plRevenue) : 0;
  const fyLabel  = data?.fy ?? FY_OPTIONS.find(o => o.value === fy)?.label ?? "FY 2025–26";
  const periodLabel = PERIOD_GROUPS.flatMap(g => g.options).find(o => o.value === period)?.label ?? "Full Year";
  const selectedLabel = isCustom && appliedFrom && appliedTo ? `${appliedFrom} → ${appliedTo}` : `${fyLabel} · ${periodLabel}`;

  const handleExport = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      await exportToExcel({
        filename: `financial-mis-${fy}-${period}-${format(new Date(), "yyyy-MM-dd")}.xlsx`,
        sheets: [
          { name: "KPI Summary", data: [
            ["Metric", "Value"],
            ["Period", selectedLabel],
            ["Total Revenue ", Math.round((kpis?.plRevenue ?? 0) / 100)],
            ["Total Expenses ", Math.round((kpis?.plExpenses ?? 0) / 100)],
            ["Net Profit/Loss ", Math.round(netProfit / 100)],
            ["Net Margin (%)", kpis?.netMargin ?? 0],
            ["Total Outstanding AR ", Math.round((kpis?.totalOutstanding ?? 0) / 100)],
            ["Overdue Invoices", kpis?.overdueCount ?? 0],
            ["Cash/Bank Balance ", Math.round((kpis?.cashBalance ?? 0) / 100)],
            ["Unreconciled Entries", kpis?.unreconciledCount ?? 0],
          ]},
          { name: "Monthly Trend", data: [
            ["Month", "Revenue ", "Expenses ", "Net "],
            ...(data.monthlyTrend ?? []).map(m => [m.month, Math.round(m.revenue / 100), Math.round(m.expenses / 100), Math.round((m.revenue - m.expenses) / 100)]),
          ]},
          { name: "Trial Balance Groups", data: [
            ["Account Group", "Type", "Debit ", "Credit ", "Net "],
            ...(data.trialGroups ?? []).map(g => [g.groupName, g.accountType, Math.round(g.totalDebit), Math.round(g.totalCredit), Math.round(g.netBalance ?? (g.totalDebit - g.totalCredit))]),
          ]},
          { name: "Aging", data: [
            ["Bucket", "Count", "Outstanding "],
            ...(data.receivablesAging ?? []).map(r => [r.bucket, r.count, Math.round(r.outstanding / 100)]),
          ]},
          { name: "Top Debtors", data: [
            ["Customer", "Invoices", "Billed ", "Collected ", "Outstanding "],
            ...(data.topDebtors ?? []).map(d => [d.customer, d.invoiceCount, Math.round(d.totalBilled / 100), Math.round(d.totalCollected / 100), Math.round(d.outstanding / 100)]),
          ]},
          { name: "Journal Entries", data: [
            ["Date", "Reference", "Type", "Amount ", "Narration", "Flags"],
            ...(data.recentJournals ?? []).map(j => [formatDateForExcel(j.date), j.reference || j.id, j.sourceType, Math.round(j.amount / 100), j.narration ?? "", (j.flags ?? []).join(", ")]),
          ]},
        ],
      });
    } finally { setIsExporting(false); }
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-medium">Financial Accounting — Ledger MIS</p>
          <p className="text-xs text-muted-foreground">{selectedLabel} · Accountant / CA decision view</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Active period badge */}
          <span className="text-xs text-muted-foreground border rounded-md px-2.5 py-1">{selectedLabel}</span>

          {/* FY selector */}
          <Select value={fy} onValueChange={setFy}>
            <SelectTrigger className="w-[130px]" data-testid="select-fy"><SelectValue placeholder="FY" /></SelectTrigger>
            <SelectContent>
              {FY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Period selector */}
          <Select value={period} onValueChange={(v) => { setPeriod(v); if (v !== "custom") { setAppliedFrom(""); setAppliedTo(""); } }}>
            <SelectTrigger className="w-[160px]" data-testid="select-period"><SelectValue placeholder="Period" /></SelectTrigger>
            <SelectContent>
              {PERIOD_GROUPS.map(g => (
                <div key={g.group}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{g.group}</div>
                  {g.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </div>
              ))}
            </SelectContent>
          </Select>

          {/* Custom date pickers */}
          {isCustom && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-9 w-[140px] text-sm" data-testid="input-from" />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-9 w-[140px] text-sm" data-testid="input-to" />
              </div>
              <Button size="sm" onClick={() => { if (customFrom && customTo) { setAppliedFrom(customFrom); setAppliedTo(customTo); } }} disabled={!customFrom || !customTo} data-testid="button-apply">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />Apply
              </Button>
            </div>
          )}

          {/* Export buttons */}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting || !data} data-testid="button-export-excel">
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            {isExporting ? "Exporting…" : "Excel"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="button-export-pdf">
            <FileText className="w-3.5 h-3.5 mr-1.5" />PDF
          </Button>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="Total Revenue" value={fmtCurr(kpis?.plRevenue ?? 0)} valueColor="#3B6D11"
            meta={fmtFull(kpis?.plRevenue ?? 0)} chip={<GreenChip>INCOME</GreenChip>}
            bg="#EAF3DE"
          />
          <KpiCard
            label="Total Expenses" value={fmtCurr(kpis?.plExpenses ?? 0)} valueColor="#A32D2D"
            meta={fmtFull(kpis?.plExpenses ?? 0)} chip={<RedChip>{expRatio}% of revenue</RedChip>}
            bg={expRatio > 90 ? "#FCEBEB" : undefined}
          />
          <KpiCard
            label="Net Profit / Loss"
            value={`${netProfit < 0 ? "−" : ""}${fmtCurr(Math.abs(netProfit))}`}
            valueColor={netProfit >= 0 ? "#3B6D11" : "#A32D2D"}
            meta={`${Math.abs(netMargin).toFixed(1)}% margin`}
            chip={netMargin >= 15 ? <GreenChip>HEALTHY</GreenChip> : netMargin >= 5 ? <AmberChip>THIN</AmberChip> : <RedChip>LOSS</RedChip>}
          />
          <KpiCard
            label="Sundry Debtors (AR)" value={fmtCurr(kpis?.totalOutstanding ?? 0)} valueColor="#A32D2D"
            meta={`${kpis?.overdueCount ?? 0} invoices o/s`} chip={<RedChip>CRITICAL</RedChip>}
            bg="#FCEBEB"
          />
          <KpiCard
            label="Cash / Bank Balance" value={fmtCurr(kpis?.cashBalance ?? 0)}
            valueColor={(kpis?.cashBalance ?? 0) < 10000000 ? "#854F0B" : "#3B6D11"}
            meta="Per ledger"
            chip={(kpis?.cashBalance ?? 0) < 10000000 ? <AmberChip>LOW</AmberChip> : <GreenChip>OK</GreenChip>}
          />
          <KpiCard
            label="Bank Recon Gap" value={fmtCurr(kpis?.unreconciledAmount ?? 0)}
            valueColor={(kpis?.unreconciledCount ?? 0) > 0 ? "#A32D2D" : "#3B6D11"}
            meta={`${kpis?.unreconciledCount ?? 0} unreconciled`}
            chip={(kpis?.unreconciledCount ?? 0) > 0 ? <RedChip>UNRESOLVED</RedChip> : <GreenChip>CLEAR</GreenChip>}
          />
        </div>
      )}

      {/* ── P&L Chart + FY Summary ── */}
      <div className="grid md:grid-cols-[1.4fr_1fr] gap-4">
        {/* Chart */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <SectionHd
            title="Monthly P&L — Revenue vs Expenses"
            sub="Revenue (green) · Expenses (red) · Net line (blue)"
            right={<PurpleChip>P&L MODULE</PurpleChip>}
          />
          {isLoading ? (
            <Skeleton className="h-52 w-full" />
          ) : chartData.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">No data for this period</p>
          ) : (
            <>
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.12)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#888" }} axisLine={false} tickLine={false} width={52}
                      tickFormatter={v => fmtCurrSymbol(v * 100, tenantConfig.currency_symbol)}
                    />
                    <RTooltip content={<ChartTip />} />
                    <Bar dataKey="Revenue" name="Revenue" fill={CHART_IN} radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="Expenses" name="Expenses" fill={CHART_OUT} radius={[3, 3, 0, 0]} maxBarSize={20} />
                    <Line dataKey="Net" name="Net" type="monotone" stroke={CHART_NET} strokeWidth={2} dot={{ r: 3, fill: CHART_NET }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex gap-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: CHART_IN }} />Revenue</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: CHART_OUT }} />Expenses</span>
                <span className="flex items-center gap-1.5"><span className="w-8 inline-block border-b-2" style={{ borderColor: CHART_NET }} />Net (line)</span>
              </div>
            </>
          )}
        </div>

        {/* FY Summary */}
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <SectionHd title="FY Summary" sub="Income statement condensed · Source: P&L" />
            <div className="mt-3 space-y-1">
              {[
                { label: "Gross Revenue",    val: fmtFull(kpis?.plRevenue ?? 0),     color: "#3B6D11", bold: true },
                { label: "Total Expenses",   val: fmtFull(kpis?.plExpenses ?? 0),    color: "#A32D2D", bold: false },
                { label: "Gross Profit",     val: fmtFull((kpis?.plRevenue ?? 0) - (kpis?.plExpenses ?? 0)), color: netProfit >= 0 ? "#3B6D11" : "#A32D2D", bold: true },
              ].map(({ label, val, color, bold }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b last:border-0 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span style={{ fontFamily: "monospace", fontWeight: bold ? 600 : 400, color }}>{val}</span>
                </div>
              ))}
              {(data?.trialGroups ?? []).filter(g => (g.accountType ?? "").toLowerCase().includes("expense")).slice(0, 4).map((g) => (
                <div key={g.groupName} className="flex justify-between items-center py-1 text-xs pl-3">
                  <span className="text-muted-foreground">{g.groupName}</span>
                  <span style={{ fontFamily: "monospace", color: "#A32D2D" }}>{fmtFull(Math.abs(g.netBalance ?? (g.totalDebit - g.totalCredit)) * 100)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4">
            <SectionHd title="Outstanding Summary" sub="AR position · Invoice ledger" />
            <div className="mt-3 space-y-1">
              {[
                { label: "Total Billed (FY)",   val: fmtFull(kpis?.totalBilled ?? 0),      color: "#185FA5" },
                { label: "Total Outstanding",    val: fmtFull(kpis?.totalOutstanding ?? 0), color: "#A32D2D" },
                { label: "Collection Rate",      val: `${kpis?.totalBilled ? pct((kpis.totalBilled - kpis.totalOutstanding), kpis.totalBilled) : 0}%`, color: "#3B6D11" },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex justify-between items-center py-1.5 border-b last:border-0 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span style={{ fontFamily: "monospace", fontWeight: 500, color }}>{val}</span>
                </div>
              ))}
            </div>
            {(kpis?.totalOutstanding ?? 0) > 0 && (
              <div className="mt-3 rounded-md p-2.5 text-xs" style={{ background: "#FCEBEB", color: "#A32D2D" }}>
                <strong>Billed not collected: </strong>{fmtCurr(kpis?.totalOutstanding ?? 0)} — critical business risk
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Trial Balance ── */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <SectionHd
          title="Trial Balance & Group Summary"
          sub="All account groups with Dr/Cr balances · DSS signal per group"
          right={<PurpleChip>TRIAL BALANCE</PurpleChip>}
        />
        {isLoading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr className="border-b">
                  {["Account Group", "Category", "Debit (Dr)", "Credit (Cr)", "Net Balance", "% of Rev", "Signal"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }} className="text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.trialGroups ?? []).map((g) => {
                  const t = (g.accountType ?? "").toLowerCase();
                  const isInc = t === "income" || t === "revenue";
                  const isExp = t.includes("expense");
                  const isAss = t.includes("asset");
                  const net   = Math.abs(g.netBalance ?? (g.totalDebit - g.totalCredit));
                  const netPaise = net * 100;
                  const revPct   = kpis?.plRevenue ? pct(netPaise, kpis.plRevenue) : 0;
                  const rowBg    = isInc ? "#EAF3DE" : (isExp && revPct > 50) ? "#FCEBEB" : (isExp && revPct > 25) ? "#FAEEDA" : undefined;
                  return (
                    <tr key={g.groupName} style={{ background: rowBg }} className="border-b last:border-0">
                      <td style={{ padding: "8px 8px", fontWeight: (isInc || revPct > 50) ? 600 : 400 }}>{g.groupName}</td>
                      <td style={{ padding: "8px 8px" }}>
                        {isInc ? <GreenChip>Income</GreenChip> : isExp ? <RedChip>Expense</RedChip> : isAss ? <BlueChip>Asset</BlueChip> : <GrayChip>Other</GrayChip>}
                      </td>
                      <td style={{ padding: "8px 8px", fontFamily: "monospace", color: g.totalDebit > 0 ? (isExp ? "#A32D2D" : "inherit") : "var(--muted-foreground)" }}>{g.totalDebit > 0 ? fmtFull(g.totalDebit * 100) : "—"}</td>
                      <td style={{ padding: "8px 8px", fontFamily: "monospace", color: g.totalCredit > 0 ? (isInc ? "#3B6D11" : "inherit") : "var(--muted-foreground)" }}>{g.totalCredit > 0 ? fmtFull(g.totalCredit * 100) : "—"}</td>
                      <td style={{ padding: "8px 8px", fontFamily: "monospace", fontWeight: 600, color: isInc ? "#3B6D11" : revPct > 50 ? "#A32D2D" : revPct > 25 ? "#854F0B" : "inherit" }}>{fmtFull(netPaise)}</td>
                      <td style={{ padding: "8px 8px", color: revPct > 50 ? "#A32D2D" : revPct > 25 ? "#854F0B" : undefined }} className="text-muted-foreground">{revPct}%</td>
                      <td style={{ padding: "8px 8px" }}>
                        {isInc ? <GreenChip>INCOME</GreenChip> : revPct > 50 ? <RedChip>HIGH RISK</RedChip> : revPct > 25 ? <AmberChip>REVIEW</AmberChip> : <GrayChip>NORMAL</GrayChip>}
                      </td>
                    </tr>
                  );
                })}
                {(data?.trialGroups ?? []).length === 0 && (
                  <tr><td colSpan={7} className="text-muted-foreground text-sm text-center py-8">No trial balance data available</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Aging + Top Debtors ── */}
      <div className="grid md:grid-cols-[1fr_1.2fr] gap-4">
        {/* Aging buckets */}
        <div className="rounded-lg border bg-card p-4 space-y-3" style={{ borderColor: "#E24B4A", borderWidth: 1.5 }}>
          <SectionHd
            title={`Receivables Aging — ${fmtCurr(totalAging)} Total AR`}
            sub="Outstanding grouped by overdue days · Source: AR module"
            right={<RedChip>OUTSTANDING</RedChip>}
          />
          {isLoading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : (
            <div className="space-y-2">
              {[
                { key: "0-30",  bg: "#EAF3DE", color: "#3B6D11", bar: CHART_IN,  sub: "High recovery probability", chip: <GreenChip>COLLECT NORMALLY</GreenChip> },
                { key: "31-60", bg: "#FAEEDA", color: "#854F0B", bar: "#EF9F27", sub: "Medium risk — follow up", chip: <AmberChip>FOLLOW UP NOW</AmberChip> },
                { key: "61-90", bg: "#FAECE7", color: "#993C1D", bar: "#D85A30", sub: "Escalating risk", chip: <AmberChip>ESCALATE</AmberChip> },
                { key: "90+",   bg: "#FCEBEB", color: "#A32D2D", bar: "#E24B4A", sub: "LARGEST BUCKET — legal action", chip: <RedChip>LEGAL ACTION</RedChip> },
              ].map(({ key, bg, color, bar, sub, chip }) => {
                const row = (data?.receivablesAging ?? []).find(r => r.bucket === key);
                const amt = row?.outstanding ?? 0;
                const cnt = row?.count ?? 0;
                const p   = totalAging > 0 ? pct(amt, totalAging) : 0;
                return (
                  <div key={key} style={{ background: bg, borderRadius: 8, padding: "10px 12px" }}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span style={{ fontSize: 12, fontWeight: 600, color }}>
                        {key} days <span style={{ fontWeight: 400, color: "#888" }}>· {cnt} invoices</span>
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color }}>{fmtCurr(amt)}</span>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.08)", borderRadius: 3, height: 6, overflow: "hidden" }}>
                      <div style={{ width: `${p}%`, height: 6, background: bar, borderRadius: 3 }} />
                    </div>
                    <div className="flex justify-between items-center mt-1.5">
                      <span style={{ fontSize: 10, color: "#666" }}>{p}% of total · {sub}</span>
                      {chip}
                    </div>
                  </div>
                );
              })}
              {(data?.insights ?? []).filter(i => i.priority === "P1").map(ins => (
                <div key={ins.title} className="rounded-md p-2.5 text-xs flex gap-2 items-start" style={{ background: "#FCEBEB", color: "#A32D2D", border: "1.5px solid #F7C1C1" }}>
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span><strong>DSS:</strong> {ins.body}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top debtors */}
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <SectionHd title="Top Debtors — Collection Health" sub="Sorted by pending amount · Source: Outstanding/Aging" />
          {isLoading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr className="border-b">
                    {["Customer", "Inv.", "Billed", "Pending", "Collected %", "Risk"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "5px 6px", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }} className="text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.topDebtors ?? []).slice(0, 8).map((d, i) => {
                    const cp = d.totalBilled > 0 ? pct(d.totalCollected, d.totalBilled) : 0;
                    const rowBg = cp === 0 ? "#FCEBEB" : cp < 25 ? "#FAEEDA" : undefined;
                    return (
                      <tr key={i} style={{ background: rowBg }} className="border-b last:border-0">
                        <td style={{ padding: "7px 6px", fontWeight: 500, maxWidth: 120 }} className="truncate">{d.customer}</td>
                        <td style={{ padding: "7px 6px" }} className="text-muted-foreground">{d.invoiceCount}</td>
                        <td style={{ padding: "7px 6px", fontFamily: "monospace" }} className="text-muted-foreground">{fmtCurr(d.totalBilled)}</td>
                        <td style={{ padding: "7px 6px", fontFamily: "monospace", fontWeight: 600, color: cp < 25 ? "#A32D2D" : "#854F0B" }}>{fmtCurr(d.outstanding)}</td>
                        <td style={{ padding: "7px 6px", minWidth: 90 }}><MiniBar pct={cp} color={cp < 25 ? "#E24B4A" : "#97C459"} /></td>
                        <td style={{ padding: "7px 6px" }}>{cp === 0 ? <RedChip>CRITICAL</RedChip> : cp < 25 ? <AmberChip>HIGH RISK</AmberChip> : <GreenChip>OK</GreenChip>}</td>
                      </tr>
                    );
                  })}
                  {(data?.topDebtors ?? []).length === 0 && (
                    <tr><td colSpan={6} className="text-muted-foreground text-sm text-center py-6">No debtor data</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Balance Sheet ── */}
      <div className="rounded-lg border bg-card p-4 space-y-3" style={{ borderColor: "#B5D4F4", borderWidth: 1.5 }}>
        <SectionHd
          title="Balance Sheet — Financial Position"
          sub="Assets · Liabilities · Equity as at end of period"
          right={<BlueChip>BALANCE SHEET</BlueChip>}
        />
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 rounded-lg" />)}</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "ASSETS", bg: "#E6F1FB", titleColor: "#185FA5", rows: [
                { label: "Sundry Debtors (AR)", val: fmtFull(kpis?.totalOutstanding ?? 0), color: "#A32D2D" },
                { label: "Cash / Bank",          val: fmtFull(kpis?.cashBalance ?? 0),       color: "#854F0B" },
                { label: "Other Assets",          val: "—" },
              ], total: fmtFull(data?.balanceSheet?.assets ?? 0), totalColor: "#185FA5", note: "⚠ Most assets = uncollected AR. Accelerate collections.", noteColor: "#A32D2D" },
              { title: "LIABILITIES", bg: "#FCEBEB", titleColor: "#A32D2D", rows: [
                { label: "Accounts Payable", val: "—" },
                { label: "GST Payable",      val: "—" },
                { label: "Other",            val: `${tenantConfig.currency_symbol}0` },
              ], total: fmtFull(data?.balanceSheet?.liabilities ?? 0), totalColor: "#A32D2D", note: "Settle payables on time to avoid penalties.", noteColor: "#854F0B" },
              { title: "EQUITY", bg: "#EAF3DE", titleColor: "#3B6D11", rows: [
                { label: "Net Profit FY", val: `${netProfit < 0 ? "−" : ""}${fmtFull(Math.abs(netProfit))}`, color: netProfit >= 0 ? "#3B6D11" : "#A32D2D" },
                { label: "Retained Earnings", val: fmtFull(data?.balanceSheet?.equity ?? 0), color: "#854F0B" },
                { label: "Equity Base", val: fmtFull(data?.balanceSheet?.equity ?? 0) },
              ], total: fmtFull(data?.balanceSheet?.equity ?? 0), totalColor: "#854F0B", note: "Collect AR urgently to strengthen the equity base.", noteColor: "#854F0B" },
            ].map(({ title, bg, titleColor, rows, total, totalColor, note, noteColor }) => (
              <div key={title} style={{ borderRadius: 10, padding: 14, background: bg }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 10, color: titleColor }}>{title}</p>
                {rows.map((r, i) => (
                  <div key={i} className="flex justify-between py-1.5 border-b last:border-0 text-sm" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                    <span className="text-muted-foreground">{r.label}</span>
                    <span style={{ fontFamily: "monospace", color: r.color ?? undefined }}>{r.val}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 mt-1 text-sm font-semibold" style={{ borderTop: "1px solid rgba(0,0,0,0.1)" }}>
                  <span style={{ color: titleColor }}>Total {title}</span>
                  <span style={{ fontFamily: "monospace", color: totalColor }}>{total}</span>
                </div>
                <p style={{ fontSize: 9, marginTop: 6, color: noteColor }}>{note}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bank Reconciliation ── */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <SectionHd
          title="Bank Reconciliation"
          sub="Book balance vs bank statement · Identify uncleared items"
          right={<BlueChip>BANK STATEMENTS</BlueChip>}
        />
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <>
            {(kpis?.unreconciledCount ?? 0) > 0 ? (
              <div className="rounded-md border-l-4 p-3 text-sm" style={{ background: "#FCEBEB", borderLeftColor: "#E24B4A", color: "#A32D2D" }}>
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <AlertTriangle className="w-4 h-4" />
                  {kpis?.unreconciledCount} unreconciled entries — {fmtCurr(kpis?.unreconciledAmount ?? 0)} gap
                </div>
                <p className="text-xs">Run full bank reconciliation. Match every journal entry to bank statement line. Post all unposted entries before month-end close.</p>
              </div>
            ) : (
              <div className="rounded-md p-3 text-sm" style={{ background: "#EAF3DE", color: "#3B6D11" }}>
                All entries reconciled — no gaps found
              </div>
            )}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr className="border-b">
                  {["Item", "Status", "Entries", "Amount", "Type", "Action"].map(h => (
                    <th key={h} style={{ padding: "5px 8px", textAlign: "left", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }} className="text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(kpis?.unreconciledCount ?? 0) > 0 ? (
                  <>
                    <tr style={{ background: "#FCEBEB" }} className="border-b">
                      <td style={{ padding: "8px 8px", fontWeight: 600 }}>Unreconciled journal entries</td>
                      <td style={{ padding: "8px 8px" }}><RedChip>GAP</RedChip></td>
                      <td style={{ padding: "8px 8px" }} className="text-muted-foreground">{kpis?.unreconciledCount}</td>
                      <td style={{ padding: "8px 8px", fontFamily: "monospace", fontWeight: 600, color: "#A32D2D" }}>{fmtCurr(kpis?.unreconciledAmount ?? 0)}</td>
                      <td style={{ padding: "8px 8px" }}><RedChip>URGENT</RedChip></td>
                      <td style={{ padding: "8px 8px", fontSize: 11, color: "#A32D2D" }}>Post missing entries & match bank statement</td>
                    </tr>
                  </>
                ) : (
                  <tr style={{ background: "#EAF3DE" }}>
                    <td style={{ padding: "8px 8px", fontWeight: 600 }}>All entries matched</td>
                    <td style={{ padding: "8px 8px" }}><GreenChip>MATCH</GreenChip></td>
                    <td style={{ padding: "8px 8px" }} className="text-muted-foreground">0</td>
                    <td style={{ padding: "8px 8px", fontFamily: "monospace", color: "#3B6D11" }}>{tenantConfig.currency_symbol}0</td>
                    <td style={{ padding: "8px 8px" }}><GreenChip>CLEAR</GreenChip></td>
                    <td style={{ padding: "8px 8px", fontSize: 11 }} className="text-muted-foreground">No action needed</td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* ── Journal Anomalies ── */}
      <div className="rounded-lg border bg-card p-4 space-y-3" style={{ borderColor: "#FAC775", borderWidth: 1.5 }}>
        <SectionHd
          title="Journal Entries — Anomaly Detection"
          sub="Recent postings reviewed for narration gaps, duplicates, round figures"
          right={<AmberChip>JOURNAL / DAY BOOK</AmberChip>}
        />
        {isLoading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr className="border-b">
                    {["Date", "Reference", "Type", "Amount", "Narration", "Lines", "Flag"].map(h => (
                      <th key={h} style={{ padding: "5px 8px", textAlign: "left", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }} className="text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentJournals ?? []).map((j) => {
                    const flags     = j.flags ?? [];
                    const noNarr    = flags.includes("NO_NARR");
                    const isRound   = flags.includes("ROUND");
                    const isDup     = flags.includes("DUPLICATE");
                    const hasFlag   = flags.length > 0;
                    const rowBg     = (noNarr || isRound) ? "#FCEBEB" : hasFlag ? "#FAEEDA" : "#EAF3DE";
                    const flagLabel = noNarr && isRound ? "ROUND / NO NARR" : isDup ? "DUPLICATE?" : noNarr ? "NO NARRATION" : isRound ? "ROUND FIGURE" : hasFlag ? flags.join(", ") : "VERIFIED";
                    return (
                      <tr key={j.id} style={{ background: rowBg }} className="border-b last:border-0">
                        <td style={{ padding: "7px 8px" }} className="text-muted-foreground whitespace-nowrap">
                          {new Date(j.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                        </td>
                        <td style={{ padding: "7px 8px", fontFamily: "monospace", color: "#185FA5", fontWeight: hasFlag ? 600 : 400 }}>{j.reference || `JV-${j.id}`}</td>
                        <td style={{ padding: "7px 8px" }} className="text-muted-foreground">{j.sourceType}</td>
                        <td style={{ padding: "7px 8px", fontFamily: "monospace", fontWeight: isRound ? 600 : 400, color: j.amount < 0 ? "#A32D2D" : "#3B6D11" }}>
                          {j.amount < 0 ? "−" : "+"}{fmtCurr(Math.abs(j.amount))}
                        </td>
                        <td style={{ padding: "7px 8px", fontSize: 11, color: noNarr ? "#A32D2D" : undefined }} className={noNarr ? "" : "text-muted-foreground"}>
                          {noNarr ? "⚠ MISSING" : (j.narration || "—")}
                        </td>
                        <td style={{ padding: "7px 8px" }} className="text-muted-foreground">{j.lineCount}</td>
                        <td style={{ padding: "7px 8px" }}>
                          {hasFlag
                            ? ((noNarr || isRound) ? <RedChip>{flagLabel}</RedChip> : <AmberChip>{flagLabel}</AmberChip>)
                            : <GreenChip>VERIFIED</GreenChip>
                          }
                        </td>
                      </tr>
                    );
                  })}
                  {(data?.recentJournals ?? []).length === 0 && (
                    <tr><td colSpan={7} className="text-muted-foreground text-sm text-center py-6">No recent journal entries</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="rounded-md p-2.5 text-xs flex gap-2 items-start" style={{ background: "#EEEDFE", color: "#534AB7", border: "1px solid #AFA9EC" }}>
              <span className="shrink-0">ℹ</span>
              <span><strong>Fix rules:</strong> (1) Narration mandatory on all entries · (2) Bill/invoice attachment required for every cash expense · (3) Flag all ₹1L+ round-figure postings · (4) Resolve any duplicate entries before month-end</span>
            </div>
          </>
        )}
      </div>

      {/* ── DSS Decisions ── */}
      <div className="rounded-lg border bg-card p-4 space-y-3" style={{ borderColor: "#E24B4A", borderWidth: 1.5 }}>
        <SectionHd
          title="DSS Master Decision Panel"
          sub="Priority decisions derived from all accounting modules · Act on these in order"
          right={<RedChip>ALL MODULES</RedChip>}
        />
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>
        ) : (data?.insights ?? []).length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No priority decisions generated — data may be insufficient</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(data?.insights ?? []).map((ins, i) => {
              const isPrio12 = ins.priority === "P1" || ins.priority === "P2";
              const isPrio34 = ins.priority === "P3" || ins.priority === "P4";
              const isPrio5  = ins.priority === "P5";
              const bg    = isPrio12 ? "#FCEBEB" : isPrio34 ? "#FAEEDA" : isPrio5 ? "#EEEDFE" : "#E6F1FB";
              const chip  = isPrio12 ? <RedChip>{ins.priority} — {ins.label}</RedChip>
                          : isPrio34 ? <AmberChip>{ins.priority} — {ins.label}</AmberChip>
                          : isPrio5  ? <PurpleChip>{ins.priority} — {ins.label}</PurpleChip>
                          : <BlueChip>{ins.priority} — {ins.label}</BlueChip>;
              return (
                <div key={i} style={{ background: bg, borderRadius: 10, padding: 14, border: "1px solid rgba(0,0,0,0.06)" }}>
                  {chip}
                  <p style={{ fontSize: 12, fontWeight: 600, margin: "8px 0 4px" }}>{ins.title}</p>
                  <p style={{ fontSize: 11, lineHeight: 1.6 }} className="text-muted-foreground">{ins.body}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
