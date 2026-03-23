import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Download, TrendingUp, TrendingDown, Minus, BookOpen, Scale, Landmark, FileWarning } from "lucide-react";
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, Cell
} from "recharts";
import { format } from "date-fns";

interface FinancialData {
  fy: string;
  fyStart: string;
  fyEnd: string;
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

const INR = (paise: number) =>
  `₹${Math.abs(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const INR_K = (paise: number) => {
  const abs = Math.abs(paise / 100);
  if (abs >= 10000000) return `₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `₹${(abs / 1000).toFixed(1)}K`;
  return `₹${abs.toLocaleString("en-IN")}`;
};

function KpiBadge({ label, color }: { label: string; color: "gray" | "green" | "amber" | "red" | "blue" }) {
  const cls = {
    gray: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    green: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  }[color];
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${cls}`}>{label}</span>;
}

function AgingBar({ outstanding, total }: { outstanding: number; total: number }) {
  const pct = total > 0 ? Math.min((outstanding / total) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-red-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
    </div>
  );
}

const MONTH_FMT = (m: string) => {
  const [y, mo] = m.split("-");
  return new Date(parseInt(y), parseInt(mo) - 1, 1).toLocaleDateString("en-IN", { month: "short" });
};

const INSIGHT_COLORS = { P1: "red", P2: "amber", P3: "blue" } as const;
const INSIGHT_BG = {
  P1: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
  P2: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
  P3: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
};

export default function MISFinancial() {
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useQuery<FinancialData>({
    queryKey: ["/api/mis/financial-analytics"],
  });

  const kpis = data?.kpis;
  const netProfit = kpis?.netProfit ?? 0;
  const netMargin = kpis?.netMargin ?? 0;
  const isProfitable = netProfit >= 0;
  const marginStatus = netMargin >= 15 ? "green" : netMargin >= 5 ? "amber" : "red";
  const marginLabel = netMargin >= 15 ? "HEALTHY" : netMargin >= 5 ? "THIN" : "LOSS";
  const totalAging = (data?.receivablesAging ?? []).reduce((s, r) => s + r.outstanding, 0);

  const chartData = (data?.monthlyTrend ?? []).map((m) => ({
    name: MONTH_FMT(m.month),
    Revenue: Math.round(m.revenue / 100),
    Expenses: Math.round(m.expenses / 100),
  }));

  const trialByType: Record<string, { debit: number; credit: number }> = {};
  for (const g of data?.trialGroups ?? []) {
    const t = g.accountType?.toLowerCase() ?? "other";
    if (!trialByType[t]) trialByType[t] = { debit: 0, credit: 0 };
    trialByType[t].debit += g.totalDebit;
    trialByType[t].credit += g.totalCredit;
  }

  const flaggedJournals = (data?.recentJournals ?? []).filter((j) => j.flags.length > 0);

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="mis-financial-page">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            Financial Analytics
          </h1>
          <p className="text-muted-foreground text-sm">
            Formal Ledger MIS — {data?.fy ?? "Current FY"} · Managed by Accountant / CA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            {data?.fy ?? "—"}
          </Badge>
          <Button variant="outline" size="sm" disabled={isExporting || isLoading} data-testid="button-export-excel">
            <Download className="w-4 h-4 mr-2" />Export Report
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          <Skeleton className="h-64" />
        </div>
      ) : data ? (
        <>
          {/* ── KPI Bar ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Gross Revenue</p>
                  <KpiBadge label="INCOME" color="green" />
                </div>
                <p className="text-xl font-bold">{INR_K(kpis!.plRevenue)}</p>
                <p className="text-xs text-muted-foreground mt-1">Journal-based FY total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Net Profit / Loss</p>
                  <KpiBadge label={marginLabel} color={marginStatus} />
                </div>
                <p className={`text-xl font-bold ${isProfitable ? "text-green-600" : "text-red-600"}`}>
                  {isProfitable ? "" : "−"}{INR_K(Math.abs(netProfit))}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{netMargin.toFixed(1)}% margin</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Outstanding / Aging</p>
                  <KpiBadge label={kpis!.overdueCount > 0 ? "CRITICAL" : "LOW"} color={kpis!.overdueCount > 0 ? "red" : "green"} />
                </div>
                <p className="text-xl font-bold">{INR_K(kpis!.totalOutstanding)}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpis!.overdueCount} overdue 30d+</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-xs text-muted-foreground">Bank / Cash Stock</p>
                  <KpiBadge label={kpis!.unreconciledCount > 0 ? "UNRESOLVED" : "CLEAR"} color={kpis!.unreconciledCount > 0 ? "amber" : "green"} />
                </div>
                <p className="text-xl font-bold">{INR_K(kpis!.cashBalance + kpis!.bankBalance)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis!.unreconciledCount > 0 ? `${kpis!.unreconciledCount} unreconciled` : "All reconciled"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── P&L + Monthly Chart ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Profit & Loss Statement
                </CardTitle>
                <CardDescription>Monthly revenue vs expenses — {data.fy}</CardDescription>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} width={50} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v}`} />
                      <Tooltip formatter={(v: number, name: string) => [`₹${v.toLocaleString("en-IN")}`, name]} />
                      <Legend />
                      <Bar dataKey="Revenue" fill="#16a34a" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Expenses" fill="#dc2626" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground text-center px-4">
                    No journal entries posted yet for this period. Post invoices, payments, and expense vouchers to see P&L.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="w-4 h-4 text-blue-600" />
                  FY Summary
                </CardTitle>
                <CardDescription>Key financial metrics — {data.fyStart} to {data.fyEnd}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Gross Revenue", value: INR(kpis!.plRevenue), color: "text-green-600", pct: "100%" },
                    { label: "Total Expenses", value: INR(kpis!.plExpenses), color: "text-red-600", pct: kpis!.plRevenue > 0 ? `${((kpis!.plExpenses / kpis!.plRevenue) * 100).toFixed(1)}%` : "—" },
                    { label: "Net Profit", value: INR(netProfit), color: isProfitable ? "text-green-700 font-bold" : "text-red-700 font-bold", pct: `${netMargin.toFixed(1)}%` },
                    { label: "Total Billed (FY)", value: INR(kpis!.totalBilled), color: "", pct: "" },
                    { label: "Outstanding", value: INR(kpis!.totalOutstanding), color: "text-amber-600", pct: kpis!.totalBilled > 0 ? `${((kpis!.totalOutstanding / kpis!.totalBilled) * 100).toFixed(1)}%` : "—" },
                    { label: "Cash Position", value: INR(kpis!.cashBalance), color: "", pct: "" },
                    { label: "Bank Balance", value: INR(kpis!.bankBalance), color: "", pct: "" },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                      <span className="text-sm">{row.label}</span>
                      <div className="flex items-center gap-3">
                        {row.pct && <span className="text-xs text-muted-foreground">{row.pct}</span>}
                        <span className={`text-sm font-medium ${row.color}`}>{row.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Trial Balance Group Summary ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                Trial Balance — Group Summary
              </CardTitle>
              <CardDescription>Account group totals with debit/credit per group · Source: Journal Entries</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Group</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Net Balance</TableHead>
                    <TableHead>Signal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.trialGroups.length > 0 ? (
                    data.trialGroups.slice(0, 12).map((g, i) => {
                      const net = g.netBalance;
                      const acctType = (g.accountType || "").toLowerCase();
                      const isNormal = acctType.includes("asset") || acctType.includes("expense") ? net >= 0 : net <= 0;
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-sm font-medium">{g.groupName || g.accountType}</TableCell>
                          <TableCell>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${
                              acctType.includes("revenue") ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" :
                              acctType.includes("expense") ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" :
                              acctType.includes("asset") ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" :
                              "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            }`}>
                              {(g.accountType || "").toUpperCase()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-sm">{INR(g.totalDebit)}</TableCell>
                          <TableCell className="text-right text-sm">{INR(g.totalCredit)}</TableCell>
                          <TableCell className={`text-right text-sm font-semibold ${net < 0 ? "text-red-600" : ""}`}>
                            {net >= 0 ? "" : "−"}{INR(Math.abs(net))}
                          </TableCell>
                          <TableCell>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${
                              isNormal ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" :
                              "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                            }`}>
                              {isNormal ? "NORMAL" : "REVIEW"}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6 text-sm">
                        No journal entries posted for this FY. Post invoices and expense vouchers to populate.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* ── Receivables Aging + Top Debtors ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Receivables Aging Analysis
                </CardTitle>
                <CardDescription>Outstanding by age — Source: Invoices · Recovery probability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.receivablesAging.length > 0 ? (
                  <>
                    {data.receivablesAging.map((bucket, i) => {
                      const recProb = bucket.bucket === "0-30" ? "High" : bucket.bucket === "31-60" ? "Medium" : bucket.bucket === "61-90" ? "Low" : "Critical";
                      const bucketColor = bucket.bucket === "0-30" ? "text-green-600" : bucket.bucket === "31-60" ? "text-amber-600" : bucket.bucket === "61-90" ? "text-orange-600" : "text-red-600";
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="text-sm font-medium">{bucket.bucket} days</span>
                              <span className="text-xs text-muted-foreground ml-2">· {bucket.count} invoice{bucket.count !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium ${bucketColor}`}>Recovery: {recProb}</span>
                              <span className="text-sm font-bold">{INR(bucket.outstanding)}</span>
                            </div>
                          </div>
                          <AgingBar outstanding={bucket.outstanding} total={totalAging} />
                        </div>
                      );
                    })}
                    <div className="mt-3 pt-3 border-t flex justify-between items-center">
                      <span className="text-sm font-semibold">Total Outstanding</span>
                      <span className="text-base font-bold text-red-600">{INR(totalAging)}</span>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    No outstanding receivables — all invoices paid or no data yet
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top Debtors — Collection Health</CardTitle>
                <CardDescription>Customers with highest outstanding balances</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Billed</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Coll. %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topDebtors.length > 0 ? (
                      data.topDebtors.slice(0, 8).map((d, i) => {
                        const collPct = d.totalBilled > 0 ? ((d.totalCollected / d.totalBilled) * 100) : 0;
                        const isRisk = collPct < 50;
                        return (
                          <TableRow key={i} className={isRisk ? "bg-red-50/40 dark:bg-red-900/10" : ""}>
                            <TableCell>
                              <p className="text-sm font-medium leading-tight">{d.customer}</p>
                              <p className="text-xs text-muted-foreground">{d.invoiceCount} inv</p>
                            </TableCell>
                            <TableCell className="text-right text-sm">{INR(d.totalBilled)}</TableCell>
                            <TableCell className={`text-right text-sm font-semibold ${isRisk ? "text-red-600" : "text-amber-600"}`}>
                              {INR(d.outstanding)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${
                                collPct >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" :
                                collPct >= 50 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" :
                                "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                              }`}>
                                {collPct.toFixed(0)}%
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">No outstanding receivables</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* ── Balance Sheet + Bank Reconciliation ── */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Scale className="w-4 h-4 text-blue-600" />
                  Balance Sheet — Financial Position
                </CardTitle>
                <CardDescription>Snapshot as of {data.fyEnd}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase text-muted-foreground tracking-wide">Assets</p>
                    <p className="text-2xl font-bold text-blue-600">{INR(data.balanceSheet.assets)}</p>
                    <p className="text-xs text-muted-foreground">Sundry Debtors + Inventory + Cash + Bank + Other</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase text-muted-foreground tracking-wide">Liabilities</p>
                    <p className="text-2xl font-bold text-red-600">{INR(data.balanceSheet.liabilities)}</p>
                    <p className="text-xs text-muted-foreground">Accounts Payable + Accruals + Other Liabilities</p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground tracking-wide">Total Equity</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Net Profit FY + Capital</p>
                    </div>
                    <p className="text-xl font-bold text-green-600">{INR(data.balanceSheet.equity + netProfit)}</p>
                  </div>
                </div>
                {data.balanceSheet.assets > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-xs">
                    {Math.abs(data.balanceSheet.assets - data.balanceSheet.liabilities - data.balanceSheet.equity - netProfit) < 1 ? (
                      <span className="text-green-600 font-semibold">Balance sheet balances ✓</span>
                    ) : (
                      <span className="text-amber-600 font-semibold">Check journal entries — Balance sheet may not balance</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-green-600" />
                  Bank Reconciliation Statement
                </CardTitle>
                <CardDescription>Reconcile bank balance to book balance · Source: Bank Statements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${data.bankReconciliation.unreconciledCount > 0 ? "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800" : "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {data.bankReconciliation.unreconciledCount > 0 ? (
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      )}
                      <p className={`text-sm font-semibold ${data.bankReconciliation.unreconciledCount > 0 ? "text-amber-800 dark:text-amber-300" : "text-green-800 dark:text-green-300"}`}>
                        {data.bankReconciliation.unreconciledCount > 0
                          ? `${data.bankReconciliation.unreconciledCount} Unreconciled Items`
                          : "All Bank Transactions Reconciled"}
                      </p>
                    </div>
                    {data.bankReconciliation.unreconciledCount > 0 && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        {INR(data.bankReconciliation.unreconciledAmount)} in unreconciled transactions — Go to Bank Statements → Reconcile
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank Balance (Statement)</span>
                      <span className="font-medium">{INR(kpis!.bankBalance)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cash in Hand</span>
                      <span className="font-medium">{INR(kpis!.cashBalance)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-semibold">
                      <span>Total Liquid Position</span>
                      <span className="text-green-600">{INR(kpis!.cashBalance + kpis!.bankBalance)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Journal Entries Anomaly Detection ── */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-red-500" />
                Journal Entries — Day Book & Anomaly Detection
              </CardTitle>
              <CardDescription>
                All postings reviewed for narration, duplicates, round figures · Source: Journal Entries
                {flaggedJournals.length > 0 && (
                  <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                    {flaggedJournals.length} FLAGGED
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Flag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentJournals.length > 0 ? (
                    data.recentJournals.map((j, i) => (
                      <TableRow key={i} className={j.flags.length > 0 ? "bg-amber-50/40 dark:bg-amber-900/10" : ""}>
                        <TableCell className="text-sm">
                          {j.date ? new Date(j.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{j.reference || "—"}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{j.narration || <span className="text-muted-foreground italic">No narration</span>}</TableCell>
                        <TableCell>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            {(j.sourceType || "MANUAL").toUpperCase().replace(/_/g, " ")}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">{INR(j.amount)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {j.flags.length === 0 ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">VERIFIED</span>
                            ) : j.flags.map((flag, fi) => (
                              <span key={fi} className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">{flag}</span>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6 text-sm">No journal entries found</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* ── AI-Driven Insights ── */}
          {data.insights.length > 0 && (
            <div>
              <div className="mb-3">
                <h2 className="text-base font-semibold">Financial Insights — {data.insights.length} Actions Required</h2>
                <p className="text-sm text-muted-foreground">All {data.insights.length} accounting menu items · {data.insights.filter(i => i.priority === "P1").length} actionable decisions</p>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {data.insights.map((ins, i) => (
                  <div key={i} className={`p-4 rounded-lg border ${INSIGHT_BG[ins.priority as keyof typeof INSIGHT_BG] || "bg-muted border-border"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-${INSIGHT_COLORS[ins.priority as keyof typeof INSIGHT_COLORS] ?? "gray"}-100 text-${INSIGHT_COLORS[ins.priority as keyof typeof INSIGHT_COLORS] ?? "gray"}-700`}>
                        {ins.priority} — {ins.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold mb-1">{ins.title}</p>
                    <p className="text-xs text-muted-foreground">{ins.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.insights.length === 0 && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10">
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">No immediate financial actions required</p>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-0.5">Post more journal entries and invoices to unlock AI-driven financial insights</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Failed to load financial analytics data</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
