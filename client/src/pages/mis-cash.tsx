import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, TrendingUp, TrendingDown, Wallet, Receipt,
  Users, Tag, Download, CalendarDays, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";

interface CashAnalytics {
  period: number;
  kpis: {
    totalReceived: number;
    totalExpenses: number;
    netCashFlow: number;
    activeDays: number;
    avgDailyReceived: number;
    avgDailyExpenses: number;
  };
  dailyTrend: Array<{ date: string; received: number; expenses: number; netFlow: number }>;
  expensesByCategory: Array<{ category: string; amount: number; count: number }>;
  expensesByPerson: Array<{ salesperson: string; received: number; expenses: number; net: number; daysCount: number }>;
  topExpenseItems: Array<{ label: string; amount: number; count: number }>;
  sourceTypes: Array<{ sourceType: string; amount: number; count: number }>;
}

function formatCurrency(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(dateStr: string): string {
  try { return format(parseISO(dateStr), "dd MMM"); } catch { return dateStr; }
}

function KPICard({
  title, value, subtitle, icon: Icon, color = "default", trend
}: {
  title: string; value: string; subtitle?: string; icon: any;
  color?: "default" | "success" | "danger" | "warning"; trend?: "up" | "down";
}) {
  const colorMap = {
    default: "text-foreground",
    success: "text-green-600 dark:text-green-400",
    danger: "text-destructive",
    warning: "text-amber-600 dark:text-amber-400",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className={`text-xl font-bold truncate ${colorMap[color]}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-full bg-muted shrink-0 ${colorMap[color]}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        {trend && (
          <div className={`mt-2 flex items-center gap-1 text-xs ${trend === "up" ? "text-green-600" : "text-destructive"}`}>
            {trend === "up" ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            vs previous period
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BarChartRow({ label, value, maxValue, color, secondaryLabel }: {
  label: string; value: number; maxValue: number; color: string; secondaryLabel?: string;
}) {
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="truncate text-foreground font-medium max-w-[50%]">{label}</span>
        <div className="flex items-center gap-2">
          {secondaryLabel && <span className="text-xs text-muted-foreground">{secondaryLabel}</span>}
          <span className="text-sm font-semibold">{formatCurrency(value)}</span>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniBarChart({ data, height = 60 }: {
  data: Array<{ label: string; received: number; expenses: number }>;
  height?: number;
}) {
  const maxVal = Math.max(...data.flatMap(d => [d.received, d.expenses]), 1);
  const barW = 100 / Math.max(data.length * 2, 1);

  return (
    <div className="relative" style={{ height }}>
      <svg width="100%" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${data.length * 2} 100`}>
        {data.map((d, i) => {
          const recH = (d.received / maxVal) * 90;
          const expH = (d.expenses / maxVal) * 90;
          return (
            <g key={i}>
              <rect
                x={i * 2}
                y={100 - recH}
                width={0.85}
                height={recH}
                className="fill-green-500 opacity-80"
              />
              <rect
                x={i * 2 + 0.9}
                y={100 - expH}
                width={0.85}
                height={expH}
                className="fill-destructive opacity-70"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function MISCash() {
  const [period, setPeriod] = useState("30");

  const { data, isLoading } = useQuery<CashAnalytics>({
    queryKey: ["/api/mis/cash-analytics", { period }],
  });

  const kpis = data?.kpis;

  const maxCategoryAmount = Math.max(...(data?.expensesByCategory.map(c => c.amount) ?? [1]));
  const maxPersonReceived = Math.max(...(data?.expensesByPerson.map(p => p.received) ?? [1]));
  const maxItemAmount = Math.max(...(data?.topExpenseItems.map(i => i.amount) ?? [1]));
  const maxSourceAmount = Math.max(...(data?.sourceTypes.map(s => s.amount) ?? [1]));

  const totalSourceAmount = data?.sourceTypes.reduce((s, r) => s + r.amount, 0) || 1;

  const chartData = (data?.dailyTrend ?? []).slice(-30).map(d => ({
    label: formatDate(d.date),
    received: d.received,
    expenses: d.expenses,
  }));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/mis">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Cash Register Analytics</h1>
            <p className="text-muted-foreground text-sm">Cash received vs expenses from daily registers</p>
          </div>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[160px]" data-testid="select-period">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-20 mb-2" /><Skeleton className="h-7 w-28" /></CardContent></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <KPICard
            title="Total Cash In"
            value={formatCurrency(kpis?.totalReceived ?? 0)}
            subtitle={`${kpis?.activeDays ?? 0} active days`}
            icon={Wallet}
            color="success"
          />
          <KPICard
            title="Total Expenses"
            value={formatCurrency(kpis?.totalExpenses ?? 0)}
            subtitle="All cash spending"
            icon={Receipt}
            color="danger"
          />
          <KPICard
            title="Net Cash Flow"
            value={formatCurrency(kpis?.netCashFlow ?? 0)}
            subtitle="Received minus expenses"
            icon={(kpis?.netCashFlow ?? 0) >= 0 ? TrendingUp : TrendingDown}
            color={(kpis?.netCashFlow ?? 0) >= 0 ? "success" : "danger"}
          />
          <KPICard
            title="Active Days"
            value={String(kpis?.activeDays ?? 0)}
            subtitle={`in last ${period} days`}
            icon={CalendarDays}
          />
          <KPICard
            title="Avg Daily In"
            value={formatCurrency(kpis?.avgDailyReceived ?? 0)}
            subtitle="Per active day"
            icon={ArrowUpRight}
            color="success"
          />
          <KPICard
            title="Avg Daily Expense"
            value={formatCurrency(kpis?.avgDailyExpenses ?? 0)}
            subtitle="Per active day"
            icon={ArrowDownRight}
            color="warning"
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily Trend Chart */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Daily Cash Flow Trend</CardTitle>
                <CardDescription>Cash received vs expenses per day</CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-green-500 opacity-80" />
                  Cash Received
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-destructive opacity-70" />
                  Expenses
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : data?.dailyTrend && data.dailyTrend.length > 0 ? (
              <>
                <MiniBarChart data={chartData} height={120} />
                <div className="mt-2 overflow-x-auto">
                  <div className="min-w-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right text-green-600">Received</TableHead>
                          <TableHead className="text-right text-destructive">Expenses</TableHead>
                          <TableHead className="text-right">Net Flow</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...data.dailyTrend].reverse().slice(0, 14).map((row, i) => (
                          <TableRow key={i} data-testid={`row-daily-${i}`}>
                            <TableCell className="text-sm">{formatDate(row.date)}</TableCell>
                            <TableCell className="text-right text-green-600 font-medium">{formatCurrency(row.received)}</TableCell>
                            <TableCell className="text-right text-destructive font-medium">{formatCurrency(row.expenses)}</TableCell>
                            <TableCell className={`text-right font-semibold ${row.netFlow >= 0 ? "text-green-600" : "text-destructive"}`}>
                              {formatCurrency(row.netFlow)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm py-8 text-center">No daily data available for this period</p>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expenses by Category</CardTitle>
            <CardDescription>Where the cash goes</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : data?.expensesByCategory && data.expensesByCategory.length > 0 ? (
              <div className="space-y-4">
                {data.expensesByCategory.map((cat, i) => (
                  <BarChartRow
                    key={i}
                    label={cat.category}
                    value={cat.amount}
                    maxValue={maxCategoryAmount}
                    color="bg-destructive"
                    secondaryLabel={`${cat.count} txn`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">No category data available</p>
            )}
          </CardContent>
        </Card>

        {/* Cash In by Source Type */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Cash Received by Source</CardTitle>
            <CardDescription>How cash is coming in</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : data?.sourceTypes && data.sourceTypes.length > 0 ? (
              <div className="space-y-4">
                {data.sourceTypes.map((src, i) => {
                  const pct = Math.round((src.amount / totalSourceAmount) * 100);
                  return (
                    <BarChartRow
                      key={i}
                      label={src.sourceType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                      value={src.amount}
                      maxValue={maxSourceAmount}
                      color="bg-green-500"
                      secondaryLabel={`${pct}% · ${src.count} txn`}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">No source data available</p>
            )}
          </CardContent>
        </Card>

        {/* Top Expense Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Expense Items</CardTitle>
            <CardDescription>Highest spending by item label</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}</div>
            ) : data?.topExpenseItems && data.topExpenseItems.length > 0 ? (
              <div className="space-y-4">
                {data.topExpenseItems.map((item, i) => (
                  <BarChartRow
                    key={i}
                    label={item.label}
                    value={item.amount}
                    maxValue={maxItemAmount}
                    color="bg-amber-500"
                    secondaryLabel={`×${item.count}`}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">No item data available</p>
            )}
          </CardContent>
        </Card>

        {/* Salesperson Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">By Salesperson</CardTitle>
            <CardDescription>Individual cash performance</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : data?.expensesByPerson && data.expensesByPerson.length > 0 ? (
              <div className="space-y-4">
                {data.expensesByPerson.map((person, i) => (
                  <div key={i} className="space-y-1.5" data-testid={`row-person-${i}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="font-medium text-sm">{person.salesperson || "Unknown"}</span>
                        <Badge variant="outline" className="text-xs">{person.daysCount}d</Badge>
                      </div>
                      <span className={`text-sm font-semibold ${person.net >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {formatCurrency(person.net)}
                      </span>
                    </div>
                    <div className="flex gap-1 h-2">
                      <div
                        className="h-full rounded-l-full bg-green-500 opacity-80"
                        style={{ width: `${maxPersonReceived > 0 ? (person.received / maxPersonReceived) * 50 : 0}%` }}
                        title={`Received: ${formatCurrency(person.received)}`}
                      />
                      <div
                        className="h-full rounded-r-full bg-destructive opacity-70"
                        style={{ width: `${maxPersonReceived > 0 ? (person.expenses / maxPersonReceived) * 50 : 0}%` }}
                        title={`Expenses: ${formatCurrency(person.expenses)}`}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="text-green-600">In: {formatCurrency(person.received)}</span>
                      <span className="text-destructive">Out: {formatCurrency(person.expenses)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm py-4 text-center">No salesperson data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
