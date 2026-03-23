import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowLeft, TrendingUp, TrendingDown, Wallet, Receipt,
  Users, CalendarDays, ArrowUpRight, ArrowDownRight,
  Zap, Info, ChevronDown, ChevronRight
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";

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

// Amounts are stored as integers in RUPEES — no division needed
function fmtCurr(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}
function fmtCurrFull(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmtBucket(b: string, type: 'daily' | 'monthly'): string {
  try {
    if (type === 'monthly') return format(parseISO(`${b}-01`), "MMM yy");
    return format(parseISO(b), "dd MMM");
  } catch { return b; }
}

function TrendChip({ pct, invert = false }: { pct: number | null; invert?: boolean }) {
  if (pct === null) return null;
  const isPositive = invert ? pct < 0 : pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? "text-green-600" : "text-destructive"}`}>
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(pct)}% vs prev
    </span>
  );
}

function KPICard({ title, value, subtitle, icon: Icon, color = "default", pctChange, invertChange }: {
  title: string; value: string; subtitle?: string; icon: any;
  color?: "default" | "success" | "danger" | "warning";
  pctChange?: number | null; invertChange?: boolean;
}) {
  const colorMap = { default: "text-foreground", success: "text-green-600 dark:text-green-400", danger: "text-destructive", warning: "text-amber-600 dark:text-amber-400" };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className={`text-xl font-bold truncate ${colorMap[color]}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            {pctChange !== undefined && <div className="mt-1"><TrendChip pct={pctChange ?? null} invert={invertChange} /></div>}
          </div>
          <div className={`p-2 rounded-full bg-muted shrink-0 ${colorMap[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrendChart({ data, bucketType }: {
  data: Array<{ bucket: string; received: number; expenses: number; netFlow: number }>;
  bucketType: 'daily' | 'monthly';
}) {
  const maxVal = Math.max(...data.flatMap(d => [d.received, d.expenses]), 1);
  const count = data.length;
  if (count === 0) return <p className="text-muted-foreground text-sm py-8 text-center">No data for this period</p>;

  return (
    <div className="space-y-3">
      <div className="relative h-32">
        <svg width="100%" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${count * 3} 100`}>
          {data.map((d, i) => {
            const recH = (d.received / maxVal) * 90;
            const expH = (d.expenses / maxVal) * 90;
            return (
              <g key={i}>
                <rect x={i * 3} y={100 - recH} width={1.3} height={recH} className="fill-green-500 opacity-80" />
                <rect x={i * 3 + 1.5} y={100 - expH} width={1.3} height={expH} className="fill-destructive opacity-70" />
              </g>
            );
          })}
        </svg>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{bucketType === 'monthly' ? 'Month' : 'Date'}</TableHead>
              <TableHead className="text-right text-green-600">Cash In</TableHead>
              <TableHead className="text-right text-destructive">Expenses</TableHead>
              <TableHead className="text-right">Net</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...data].reverse().map((row, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm font-medium">{fmtBucket(row.bucket, bucketType)}</TableCell>
                <TableCell className="text-right text-green-600 font-medium">{fmtCurrFull(row.received)}</TableCell>
                <TableCell className="text-right text-destructive font-medium">{fmtCurrFull(row.expenses)}</TableCell>
                <TableCell className={`text-right font-semibold ${row.netFlow >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {row.netFlow >= 0 ? "+" : ""}{fmtCurrFull(row.netFlow)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Horizontal bar chart for expense items / categories
function HBarChart({ items, colorClass }: {
  items: Array<{ label: string; amount: number; share?: number }>;
  colorClass: string;
}) {
  const maxAmt = Math.max(...items.map(i => i.amount), 1);
  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const pct = Math.round((item.amount / maxAmt) * 100);
        return (
          <div key={idx} className="space-y-0.5">
            <div className="flex items-center justify-between text-sm gap-2">
              <span className="truncate font-medium text-foreground">{item.label}</span>
              <div className="flex items-center gap-2 shrink-0">
                {item.share !== undefined && (
                  <Badge variant="outline" className="text-xs">{item.share}%</Badge>
                )}
                <span className="font-semibold tabular-nums">{fmtCurrFull(item.amount)}</span>
              </div>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  if (confidence >= 98) return null;
  const color = confidence >= 80
    ? "text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30"
    : "text-orange-600 border-orange-300 bg-orange-50 dark:bg-orange-950/30";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={`text-xs px-1.5 py-0 ${color}`}>
          <Info className="w-2.5 h-2.5 mr-0.5" />{confidence}% match
        </Badge>
      </TooltipTrigger>
      <TooltipContent><p className="text-xs">Labels were fuzzy-matched. Confidence: {confidence}%</p></TooltipContent>
    </Tooltip>
  );
}

function ExpenseItemDetail({ item }: { item: CashAnalytics['topExpenseItems'][0] }) {
  const [expanded, setExpanded] = useState(false);
  const hasVariants = item.variants.length > 1;
  return (
    <div className={`space-y-1 p-2 rounded-md ${item.isHighImpact ? "bg-destructive/5 border border-destructive/20" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {item.isHighImpact && (
            <Tooltip>
              <TooltipTrigger><Zap className="w-3.5 h-3.5 text-destructive shrink-0" /></TooltipTrigger>
              <TooltipContent><p className="text-xs">High impact — {item.sharePct}% of total</p></TooltipContent>
            </Tooltip>
          )}
          <span className="font-medium text-sm truncate">{item.label}</span>
          <ConfidenceBadge confidence={item.confidence} />
          {hasVariants && (
            <button onClick={() => setExpanded(e => !e)} className="text-muted-foreground hover:text-foreground shrink-0" data-testid={`toggle-variants-${item.label}`}>
              {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-xs">{item.sharePct}%</Badge>
          <span className="text-sm font-semibold tabular-nums">{fmtCurrFull(item.amount)}</span>
        </div>
      </div>
      {hasVariants && expanded && (
        <div className="pl-5 flex flex-wrap gap-1">
          {item.variants.map((v, i) => <Badge key={i} variant="secondary" className="text-xs font-normal">{v}</Badge>)}
        </div>
      )}
    </div>
  );
}

export default function MISCash() {
  const [periodType, setPeriodType] = useState("this-year");
  const [itemsView, setItemsView] = useState<'chart' | 'list'>('chart');

  const { data, isLoading } = useQuery<CashAnalytics>({
    queryKey: ["/api/mis/cash-analytics", { periodType }],
  });

  const kpis = data?.kpis;
  const maxCat = Math.max(...(data?.expensesByCategory.map(c => c.amount) ?? [1]));
  const maxSrc = Math.max(...(data?.sourceTypes.map(s => s.amount) ?? [1]));
  const maxPerson = Math.max(...(data?.expensesByPerson.map(p => p.received) ?? [1]));
  const totalSrc = data?.sourceTypes.reduce((s, r) => s + r.amount, 0) || 1;
  const totalExpItems = data?.topExpenseItems.reduce((s, r) => s + r.amount, 0) || 1;

  const selectedLabel = PERIOD_OPTIONS.flatMap(g => g.options).find(o => o.value === periodType)?.label ?? "Full Year";

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/mis">
            <Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Cash Register Analytics</h1>
            <p className="text-muted-foreground text-sm">{data?.periodLabel ?? "All amounts in ₹ (Rupees)"}</p>
          </div>
        </div>
        <Select value={periodType} onValueChange={setPeriodType}>
          <SelectTrigger className="w-[180px]" data-testid="select-period">
            <SelectValue placeholder="Select period">{selectedLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(group => (
              <div key={group.group}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.group}</div>
                {group.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-7 w-28" /></CardContent></Card>)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard title="Total Cash In" value={fmtCurr(kpis?.totalReceived ?? 0)} subtitle={fmtCurrFull(kpis?.totalReceived ?? 0)} icon={Wallet} color="success" pctChange={kpis?.receivedChange} />
          <KPICard title="Total Expenses" value={fmtCurr(kpis?.totalExpenses ?? 0)} subtitle={fmtCurrFull(kpis?.totalExpenses ?? 0)} icon={Receipt} color="danger" pctChange={kpis?.expensesChange} invertChange />
          <KPICard title="Net Cash Flow" value={fmtCurr(kpis?.netCashFlow ?? 0)} subtitle={(kpis?.netCashFlow ?? 0) >= 0 ? "Surplus" : "Deficit"} icon={(kpis?.netCashFlow ?? 0) >= 0 ? TrendingUp : TrendingDown} color={(kpis?.netCashFlow ?? 0) >= 0 ? "success" : "danger"} pctChange={kpis?.netChange} />
          <KPICard title="Active Days" value={String(kpis?.activeDays ?? 0)} subtitle="Days with register data" icon={CalendarDays} />
          <KPICard title="Avg Daily In" value={fmtCurr(kpis?.avgDailyReceived ?? 0)} subtitle="Per active day" icon={ArrowUpRight} color="success" />
          <KPICard title="Avg Daily Expense" value={fmtCurr(kpis?.avgDailyExpenses ?? 0)} subtitle="Per active day" icon={ArrowDownRight} color="warning" />
        </div>
      )}

      {/* Trend */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Cash Flow Trend</CardTitle>
              <CardDescription>{data?.bucketType === 'monthly' ? "Monthly aggregation" : "Daily view"} — {selectedLabel}</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 opacity-80 inline-block" />Cash In</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-destructive opacity-70 inline-block" />Expenses</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-40 w-full" /> : <TrendChart data={data?.trend ?? []} bucketType={data?.bucketType ?? 'daily'} />}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Expense Items — chart + detail list */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Top Expense Items
                  <Tooltip>
                    <TooltipTrigger><Info className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">Similar labels are fuzzy-matched and grouped. High impact = more than 12% of total. Click arrow to expand variants.</TooltipContent>
                  </Tooltip>
                </CardTitle>
                <CardDescription>Amounts in ₹ — fuzzy-grouped by label</CardDescription>
              </div>
              <div className="flex rounded-md border overflow-hidden">
                <button onClick={() => setItemsView('chart')} className={`px-2.5 py-1 text-xs font-medium transition-colors ${itemsView === 'chart' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`} data-testid="btn-items-chart">Chart</button>
                <button onClick={() => setItemsView('list')} className={`px-2.5 py-1 text-xs font-medium transition-colors ${itemsView === 'list' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`} data-testid="btn-items-list">Detail</button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : data?.topExpenseItems && data.topExpenseItems.length > 0 ? (
              itemsView === 'chart' ? (
                <HBarChart
                  colorClass="bg-amber-500"
                  items={data.topExpenseItems.map(item => ({
                    label: item.isHighImpact ? `⚡ ${item.label}` : item.label,
                    amount: item.amount,
                    share: item.sharePct,
                  }))}
                />
              ) : (
                <div className="space-y-2">
                  {data.topExpenseItems.map((item, i) => <ExpenseItemDetail key={i} item={item} />)}
                </div>
              )
            ) : (
              <p className="text-muted-foreground text-sm py-6 text-center">No expense items found for this period</p>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expenses by Category</CardTitle>
            <CardDescription>Amounts in ₹ — breakdown by assigned category</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : data?.expensesByCategory && data.expensesByCategory.length > 0 ? (
              <HBarChart
                colorClass="bg-destructive/80"
                items={data.expensesByCategory.map(cat => ({
                  label: cat.category,
                  amount: cat.amount,
                  share: Math.round((cat.amount / (data.expensesByCategory.reduce((s,c)=>s+c.amount,0)||1)) * 100),
                }))}
              />
            ) : (
              <p className="text-muted-foreground text-sm py-6 text-center">No category data for this period</p>
            )}
          </CardContent>
        </Card>

        {/* Cash In by Source */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cash Received by Source</CardTitle>
            <CardDescription>Amounts in ₹ — how cash is coming in</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : data?.sourceTypes && data.sourceTypes.length > 0 ? (
              <HBarChart
                colorClass="bg-green-500/80"
                items={data.sourceTypes.map(src => ({
                  label: src.sourceType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase()),
                  amount: src.amount,
                  share: Math.round((src.amount / totalSrc) * 100),
                }))}
              />
            ) : (
              <p className="text-muted-foreground text-sm py-6 text-center">No source data for this period</p>
            )}
          </CardContent>
        </Card>

        {/* By Salesperson */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Salesperson</CardTitle>
            <CardDescription>Amounts in ₹ — individual cash performance</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-40 w-full" /> : data?.expensesByPerson && data.expensesByPerson.length > 0 ? (
              <div className="space-y-4">
                {data.expensesByPerson.map((p, i) => (
                  <div key={i} className="space-y-1.5" data-testid={`row-person-${i}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{p.salesperson || "Unknown"}</span>
                        <Badge variant="outline" className="text-xs">{p.daysCount}d</Badge>
                      </div>
                      <span className={`text-sm font-semibold tabular-nums ${p.net >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {p.net >= 0 ? "+" : ""}{fmtCurrFull(p.net)}
                      </span>
                    </div>
                    <div className="flex gap-1 h-2">
                      <div className="h-full rounded-l-full bg-green-500 opacity-80" style={{ width: `${maxPerson > 0 ? (p.received / maxPerson) * 50 : 0}%` }} />
                      <div className="h-full rounded-r-full bg-destructive opacity-70" style={{ width: `${maxPerson > 0 ? (p.expenses / maxPerson) * 50 : 0}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="text-green-600">In: {fmtCurrFull(p.received)}</span>
                      <span className="text-destructive">Out: {fmtCurrFull(p.expenses)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-6 text-center">No salesperson data for this period</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
