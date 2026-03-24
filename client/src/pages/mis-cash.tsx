import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, AlertTriangle, Calendar } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer,
} from "recharts";

interface CashAnalytics {
  periodType: string;
  bucketType: 'daily' | 'monthly';
  periodLabel: string;
  kpis: {
    totalReceived: number; totalExpenses: number; netCashFlow: number; activeDays: number;
    avgDailyReceived: number; avgDailyExpenses: number;
    prevReceived: number; prevExpenses: number;
    receivedChange: number | null; expensesChange: number | null; netChange: number | null;
  };
  trend: Array<{ bucket: string; received: number; expenses: number; netFlow: number }>;
  expensesByCategory: Array<{ category: string; amount: number; count: number }>;
  expensesByPerson: Array<{ salesperson: string; received: number; expenses: number; net: number; daysCount: number }>;
  topExpenseItems: Array<{
    label: string; amount: number; count: number;
    confidence: number; isHighImpact: boolean; variants: string[]; sharePct: number;
  }>;
  sourceTypes: Array<{ sourceType: string; amount: number; count: number }>;
}

const PERIOD_OPTIONS = [
  { group: "Rolling", options: [
    { value: "last-7", label: "Last 7 Days" },
    { value: "last-30", label: "Last 30 Days" },
    { value: "last-60", label: "Last 60 Days" },
    { value: "last-90", label: "Last 90 Days" },
  ]},
  { group: "This FY (Apr–Mar)", options: [
    { value: "this-q1", label: "Q1 (Apr–Jun)" },
    { value: "this-q2", label: "Q2 (Jul–Sep)" },
    { value: "this-q3", label: "Q3 (Oct–Dec)" },
    { value: "this-q4", label: "Q4 (Jan–Mar)" },
    { value: "this-h1", label: "H1 (Apr–Sep)" },
    { value: "this-h2", label: "H2 (Oct–Mar)" },
    { value: "this-year", label: "Full Year" },
  ]},
  { group: "Last FY", options: [
    { value: "last-q1", label: "Q1 (Apr–Jun)" },
    { value: "last-q2", label: "Q2 (Jul–Sep)" },
    { value: "last-q3", label: "Q3 (Oct–Dec)" },
    { value: "last-q4", label: "Q4 (Jan–Mar)" },
    { value: "last-h1", label: "H1 (Apr–Sep)" },
    { value: "last-h2", label: "H2 (Oct–Mar)" },
    { value: "last-year", label: "Full Year" },
  ]},
];

function fmtCurr(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function fmtL(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  return fmtCurr(n);
}
function fmtBucket(b: string, type: 'daily' | 'monthly'): string {
  try {
    if (type === 'monthly') return format(parseISO(`${b}-01`), "MMM yy");
    return format(parseISO(b), "dd MMM");
  } catch { return b; }
}

function PosChip({ children }: { children: React.ReactNode }) {
  return <span style={{ background: '#EAF3DE', color: '#3B6D11', fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4 }}>{children}</span>;
}
function NegChip({ children }: { children: React.ReactNode }) {
  return <span style={{ background: '#FCEBEB', color: '#A32D2D', fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4 }}>{children}</span>;
}
function WarnChip({ children }: { children: React.ReactNode }) {
  return <span style={{ background: '#FAEEDA', color: '#854F0B', fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4 }}>{children}</span>;
}

function KPICard({ label, value, meta, chip, valueColor }: {
  label: string; value: string; meta?: string;
  chip?: React.ReactNode; valueColor?: string;
}) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'hsl(var(--muted)/0.5)' }}>
      <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: '0 0 6px', letterSpacing: '0.02em', textTransform: 'uppercase' }} className="text-muted-foreground">{label}</p>
      <p style={{ fontSize: 22, fontWeight: 500, margin: '0 0 4px', color: valueColor ?? 'inherit' }}>{value}</p>
      <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }} className="text-muted-foreground">
        {meta && <span>{meta}</span>}
        {chip}
      </div>
    </div>
  );
}

const CHART_IN  = '#97C459';
const CHART_OUT = '#F09595';
const CHART_NET = '#378ADD';

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-background p-2 shadow text-xs space-y-1">
      <p className="font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {fmtL(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function MISCash() {
  const [periodType, setPeriodType] = useState("this-year");
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');

  const isCustom = periodType === 'custom';
  const customReady = isCustom && !!appliedFrom && !!appliedTo;

  const queryParams = customReady
    ? { periodType: 'custom', startDate: appliedFrom, endDate: appliedTo }
    : { periodType };

  const { data, isLoading } = useQuery<CashAnalytics>({
    queryKey: ["/api/mis/cash-analytics", queryParams],
    enabled: !isCustom || customReady,
  });

  const selectedLabel = isCustom && appliedFrom && appliedTo
    ? `${appliedFrom} → ${appliedTo}`
    : PERIOD_OPTIONS.flatMap(g => g.options).find(o => o.value === periodType)?.label ?? "Full Year";

  const kpis = data?.kpis;
  const trend = data?.trend ?? [];

  // Compute derived values
  const chartData = useMemo(() => trend.map(d => ({
    label: fmtBucket(d.bucket, data?.bucketType ?? 'monthly'),
    cashIn: d.received,
    expenses: d.expenses,
    net: d.netFlow,
  })), [trend, data?.bucketType]);

  const sortedByNet = useMemo(() =>
    [...trend].sort((a, b) => b.netFlow - a.netFlow),
  [trend]);

  const bestMonth = sortedByNet[0];
  const worstMonth = sortedByNet[sortedByNet.length - 1];
  const expPct = kpis ? Math.round((kpis.totalExpenses / (kpis.totalReceived || 1)) * 100) : 0;
  const avgExpPct = kpis ? Math.round((kpis.avgDailyExpenses / (kpis.avgDailyReceived || 1)) * 100) : 0;

  const cats = data?.expensesByCategory ?? [];
  const totalCatAmt = cats.reduce((s, c) => s + c.amount, 0);
  const maxCatAmt = Math.max(...cats.map(c => c.amount), 1);

  const uncatEntry = cats.find(c => c.category === 'Uncategorised' || c.category === 'Cash Register Expense');
  const uncatAmt = uncatEntry?.amount ?? 0;
  const uncatPct = totalCatAmt > 0 ? Math.round((uncatAmt / totalCatAmt) * 100) : 0;
  const showDataFlag = uncatPct >= 10;

  // DSS actions
  const dssActions = useMemo(() => {
    if (!data) return [];
    const actions: { level: 'CRITICAL' | 'REVIEW' | 'TARGET'; text: string }[] = [];
    const topCat = [...cats].filter(c => c.category !== 'Uncategorised').sort((a, b) => b.amount - a.amount)[0];
    if (topCat) {
      const pct = Math.round((topCat.amount / (totalCatAmt || 1)) * 100);
      if (pct >= 25) {
        actions.push({ level: 'CRITICAL', text: `${topCat.category} is ${pct}% of total cost — evaluate supplier rate lock or alternatives` });
      }
    }
    if (worstMonth && worstMonth.netFlow < 0) {
      actions.push({ level: 'REVIEW', text: `${fmtBucket(worstMonth.bucket, data.bucketType)} is a deficit month — check if collections are pending or demand dropped` });
    }
    if (bestMonth && bestMonth.netFlow > 0) {
      actions.push({ level: 'TARGET', text: `${fmtBucket(bestMonth.bucket, data.bucketType)} has best net (+${fmtCurr(bestMonth.netFlow)}) — replicate conditions in other months` });
    }
    if (expPct >= 95) {
      actions.push({ level: 'REVIEW', text: `Expenses are ${expPct}% of cash received — margin is critically thin` });
    }
    return actions;
  }, [data, cats, totalCatAmt, bestMonth, worstMonth, expPct]);

  const maxTrendAmt = Math.max(...trend.flatMap(d => [d.received, d.expenses]), 1);

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/mis">
            <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <p className="text-lg font-medium" data-testid="text-page-title">Cash Register Analytics — MIS</p>
            <p className="text-xs text-muted-foreground">{data?.periodLabel ?? "Amounts in ₹ · Decision Support View"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground border rounded-md px-2.5 py-1">{selectedLabel}</span>
          <Select value={periodType} onValueChange={(v) => { setPeriodType(v); if (v !== 'custom') { setAppliedFrom(''); setAppliedTo(''); } }}>
            <SelectTrigger className="w-[160px]" data-testid="select-period">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map(group => (
                <div key={group.group}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.group}</div>
                  {group.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </div>
              ))}
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Custom</div>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          {isCustom && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-9 w-[140px] text-sm" data-testid="input-custom-from" />
              </div>
              <div className="flex items-center gap-1.5">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-9 w-[140px] text-sm" data-testid="input-custom-to" />
              </div>
              <Button size="sm" onClick={() => { if (customFrom && customTo) { setAppliedFrom(customFrom); setAppliedTo(customTo); } }} disabled={!customFrom || !customTo} data-testid="button-apply-custom">
                <Calendar className="w-3.5 h-3.5 mr-1.5" />
                Apply
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Data quality flag */}
      {!isLoading && showDataFlag && (
        <div className="flex gap-2 items-start rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-3 text-xs">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span className="text-amber-800 dark:text-amber-300 leading-relaxed">
            <strong>Data quality flag:</strong> "{uncatEntry?.category}" is {fmtCurr(uncatAmt)} ({uncatPct}% of total spend) — use the <strong>Auto-Categorize</strong> button on the Expenses page to assign categories, or select a category when recording cash register expenses.
          </span>
        </div>
      )}

      {/* KPI grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <KPICard
            label="Total Cash In"
            value={fmtCurr(kpis?.totalReceived ?? 0)}
            meta={`₹${Math.round(kpis?.totalReceived ?? 0).toLocaleString('en-IN')}`}
            chip={<PosChip>{kpis?.activeDays ?? 0} active days</PosChip>}
            valueColor="#3B6D11"
          />
          <KPICard
            label="Total Expenses"
            value={fmtCurr(kpis?.totalExpenses ?? 0)}
            meta={`₹${Math.round(kpis?.totalExpenses ?? 0).toLocaleString('en-IN')}`}
            chip={<NegChip>{expPct}% of revenue</NegChip>}
            valueColor="#A32D2D"
          />
          <KPICard
            label="Net Cash Flow"
            value={fmtCurr(kpis?.netCashFlow ?? 0)}
            meta={(kpis?.netCashFlow ?? 0) >= 0 ? 'Surplus' : 'Deficit'}
            chip={(kpis?.netCashFlow ?? 0) >= 0
              ? <PosChip>{100 - expPct}% margin</PosChip>
              : <NegChip>Loss</NegChip>
            }
          />
          <KPICard
            label="Avg Daily Revenue"
            value={fmtCurr(kpis?.avgDailyReceived ?? 0)}
            meta="Per active day"
          />
          <KPICard
            label="Avg Daily Expense"
            value={fmtCurr(kpis?.avgDailyExpenses ?? 0)}
            meta="Per active day"
            chip={avgExpPct > 90 ? <WarnChip>{avgExpPct}% of daily in</WarnChip> : undefined}
          />
          <KPICard
            label="Best Month"
            value={bestMonth ? fmtBucket(bestMonth.bucket, data?.bucketType ?? 'monthly') : '—'}
            meta={bestMonth ? `+${fmtCurr(bestMonth.netFlow)} net` : 'No data'}
            chip={worstMonth && worstMonth.netFlow < 0
              ? <NegChip>vs {fmtBucket(worstMonth.bucket, data?.bucketType ?? 'monthly')} loss</NegChip>
              : undefined
            }
            valueColor="#3B6D11"
          />
        </div>
      )}

      {/* Monthly Cash Flow Trend */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">Monthly Cash Flow Trend</p>
          <p className="text-xs text-muted-foreground">Cash In vs Expenses · net surplus/deficit per period</p>
        </div>
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
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#888' }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : `₹${(v/1000).toFixed(0)}K`}
                    width={52}
                  />
                  <RTooltip content={<CustomTooltip />} />
                  <Bar dataKey="cashIn" name="Cash In" fill={CHART_IN} radius={[3, 3, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="expenses" name="Expenses" fill={CHART_OUT} radius={[3, 3, 0, 0]} maxBarSize={24} />
                  <Line dataKey="net" name="Net" type="monotone" stroke={CHART_NET} strokeWidth={2} dot={{ r: 3, fill: CHART_NET }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: CHART_IN }} />Cash In</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: CHART_OUT }} />Expenses</span>
              <span className="flex items-center gap-1.5"><span className="w-8 inline-block border-b-2" style={{ borderColor: CHART_NET }} />Net (line)</span>
            </div>
          </>
        )}
      </div>

      {/* Bottom two-column section */}
      <div className="grid md:grid-cols-[1.4fr_1fr] gap-4">
        {/* Monthly Performance Table */}
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">Monthly Performance Table</p>
          <p className="text-xs text-muted-foreground mb-3">Ranked by net — green = surplus, red = deficit</p>
          {isLoading ? (
            <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : sortedByNet.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">No data for this period</p>
          ) : (
            <div>
              {/* Header row */}
              <div className="grid gap-1.5 pb-2 border-b mb-1" style={{ gridTemplateColumns: '52px 1fr 76px 76px 66px', fontSize: 10, color: 'var(--muted-foreground)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                <span>Month</span><span>Trend</span>
                <span style={{ textAlign: 'right' }}>Cash In</span>
                <span style={{ textAlign: 'right' }}>Expenses</span>
                <span style={{ textAlign: 'right' }}>Net</span>
              </div>
              {sortedByNet.map((row, i) => {
                const isBest = i === 0 && row.netFlow > 0;
                const isWorst = i === sortedByNet.length - 1 && row.netFlow < 0;
                const inH = Math.round((row.received / maxTrendAmt) * 20);
                const expH = Math.round((row.expenses / maxTrendAmt) * 20);
                return (
                  <div
                    key={row.bucket}
                    className="grid gap-1.5 items-center py-1.5 border-b last:border-0"
                    style={{
                      gridTemplateColumns: '52px 1fr 76px 76px 66px',
                      fontSize: 12,
                      background: isBest ? '#EAF3DE' : isWorst ? '#FCEBEB' : undefined,
                      borderRadius: (isBest || isWorst) ? 4 : undefined,
                      padding: (isBest || isWorst) ? '6px 4px' : undefined,
                    }}
                    data-testid={`row-month-${row.bucket}`}
                  >
                    <span style={{ fontWeight: 500 }}>{fmtBucket(row.bucket, data?.bucketType ?? 'monthly')}</span>
                    {/* mini inline bar */}
                    <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 22 }}>
                      <div style={{ width: 7, height: inH, background: '#639922', borderRadius: '2px 2px 0 0' }} />
                      <div style={{ width: 7, height: expH, background: '#E24B4A', borderRadius: '2px 2px 0 0' }} />
                    </div>
                    <span style={{ textAlign: 'right' }} className="text-muted-foreground">{fmtL(row.received)}</span>
                    <span style={{ textAlign: 'right' }} className="text-muted-foreground">{fmtL(row.expenses)}</span>
                    <span style={{ textAlign: 'right', fontWeight: 500, color: row.netFlow >= 0 ? '#3B6D11' : '#A32D2D' }}>
                      {row.netFlow >= 0 ? '+' : ''}{fmtCurr(row.netFlow)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Expenses by Category */}
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-medium">Expenses by Category</p>
            <p className="text-xs text-muted-foreground mb-3">Breakdown by assigned category</p>
            {isLoading ? (
              <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
            ) : cats.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No expense data</p>
            ) : (
              <div className="space-y-2">
                {cats.map((cat, i) => {
                  const pct = Math.round((cat.amount / (totalCatAmt || 1)) * 100);
                  const fillPct = Math.round((cat.amount / maxCatAmt) * 100);
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }} data-testid={`cat-row-${i}`}>
                      <span style={{ width: 110, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={cat.category}>{cat.category}</span>
                      <div style={{ flex: 1, background: 'hsl(var(--muted))', borderRadius: 2, height: 6, overflow: 'hidden' }}>
                        <div style={{ width: `${fillPct}%`, height: 6, background: '#E24B4A', borderRadius: 2 }} />
                      </div>
                      <span style={{ width: 30, textAlign: 'right' }} className="text-muted-foreground">{pct}%</span>
                      <span style={{ width: 70, textAlign: 'right', fontWeight: 500 }}>{fmtCurr(cat.amount)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DSS Actions */}
          <div className="rounded-lg border bg-card p-4">
            <p className="text-sm font-medium">DSS Actions</p>
            <p className="text-xs text-muted-foreground mb-3">Suggested decisions based on data</p>
            {isLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : dssActions.length === 0 ? (
              <p className="text-muted-foreground text-xs py-4 text-center">No significant signals detected for this period</p>
            ) : (
              <div className="space-y-2">
                {dssActions.map((action, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12 }}>
                    {action.level === 'CRITICAL' && (
                      <span style={{ background: '#FCEBEB', color: '#A32D2D', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 500, flexShrink: 0 }}>CRITICAL</span>
                    )}
                    {action.level === 'REVIEW' && (
                      <span style={{ background: '#FAEEDA', color: '#854F0B', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 500, flexShrink: 0 }}>REVIEW</span>
                    )}
                    {action.level === 'TARGET' && (
                      <span style={{ background: '#EAF3DE', color: '#3B6D11', padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 500, flexShrink: 0 }}>TARGET</span>
                    )}
                    <span className="text-muted-foreground leading-relaxed">{action.text}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
