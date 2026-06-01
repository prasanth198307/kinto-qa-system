import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ArrowLeft, Download, Factory, IndianRupee, TrendingUp, TrendingDown,
  Package, Wallet, BarChart3, Tag, CheckCircle, AlertCircle, Boxes, CreditCard
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { exportToExcel, formatCurrencyForExcel } from "@/lib/excel-export";
import { format, subMonths } from "date-fns";

interface ManufacturingSalesData {
  month: string;
  prevMonth: string;
  salesSummary: {
    invoiceCount: number;
    totalSales: number;
    totalWithGst: number;
    totalCollected: number;
    totalPending: number;
    collectionPct: number;
  };
  prevMonthSummary: {
    invoiceCount: number;
    totalSales: number;
    totalWithGst: number;
    totalCollected: number;
  };
  stockOrigin: {
    currentMonth: { qty: number; byProduct: Array<{ productName: string; qty: number }> };
    prevMonth:    { qty: number; byProduct: Array<{ productName: string; qty: number }> };
    older:        { qty: number; byProduct: Array<{ productName: string; qty: number }> };
    totalQty: number;
  };
  pricingStrategy: Array<{
    productName: string;
    qtySold: number;
    avgUnitPrice: number;
    minUnitPrice: number;
    maxUnitPrice: number;
    totalRevenue: number;
    invoiceCount: number;
  }>;
  dailyCollection: Array<{ date: string; collected: number }>;
  collectionByMethod: Array<{ method: string; count: number; amount: number }>;
  cashRegister: {
    totalCollected: number;
    daily: Array<{ date: string; collected: number }>;
    bySource: Array<{ sourceType: string; count: number; amount: number }>;
  };
}

function formatCurrency(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatUnit(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function buildMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = subMonths(now, i);
    opts.push({ value: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy') });
  }
  return opts;
}

function GrowthBadge({ current, prev }: { current: number; prev: number }) {
  if (prev === 0) return null;
  const change = ((current - prev) / prev) * 100;
  const up = change >= 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 ${up ? 'text-green-600' : 'text-red-500'}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(change).toFixed(1)}% vs prev
    </span>
  );
}

export default function MISManufacturing() {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [isExporting, setIsExporting] = useState(false);
  const monthOptions = buildMonthOptions();

  const { data, isLoading } = useQuery<ManufacturingSalesData>({
    queryKey: ['/api/mis/manufacturing-sales-analysis', { month }],
  });

  const handleExport = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      const summarySheet = [
        ['Manufacturing Sales Analysis', data.month],
        [],
        ['Metric', 'Current Month', 'Previous Month'],
        ['Invoice Count', data.salesSummary.invoiceCount, data.prevMonthSummary.invoiceCount],
        ['Total Sales (excl GST)', formatCurrencyForExcel(data.salesSummary.totalSales), formatCurrencyForExcel(data.prevMonthSummary.totalSales)],
        ['Total with GST', formatCurrencyForExcel(data.salesSummary.totalWithGst), formatCurrencyForExcel(data.prevMonthSummary.totalWithGst)],
        ['Total Collected', formatCurrencyForExcel(data.salesSummary.totalCollected), formatCurrencyForExcel(data.prevMonthSummary.totalCollected)],
        ['Outstanding', formatCurrencyForExcel(data.salesSummary.totalPending), ''],
        ['Collection %', `${data.salesSummary.collectionPct}%`, ''],
      ];

      const stockSheet = [
        ['Stock Origin Analysis'],
        ['Origin', 'Qty (Cases)', '% of Total'],
        ['Current Month Production', data.stockOrigin.currentMonth.qty, `${pct(data.stockOrigin.currentMonth.qty, data.stockOrigin.totalQty)}%`],
        ['Previous Month Production', data.stockOrigin.prevMonth.qty, `${pct(data.stockOrigin.prevMonth.qty, data.stockOrigin.totalQty)}%`],
        ['Older Stock', data.stockOrigin.older.qty, `${pct(data.stockOrigin.older.qty, data.stockOrigin.totalQty)}%`],
        ['Total Dispatched', data.stockOrigin.totalQty, '100%'],
      ];

      const pricingSheet = [
        ['Pricing Strategy — Product-wise'],
        ['Product', 'Qty Sold', 'Avg Unit Price', 'Min Unit Price', 'Max Unit Price', 'Price Spread', 'Total Revenue', 'Invoices'],
        ...data.pricingStrategy.map(p => [
          p.productName,
          p.qtySold,
          formatCurrencyForExcel(p.avgUnitPrice),
          formatCurrencyForExcel(p.minUnitPrice),
          formatCurrencyForExcel(p.maxUnitPrice),
          formatCurrencyForExcel(p.maxUnitPrice - p.minUnitPrice),
          formatCurrencyForExcel(p.totalRevenue),
          p.invoiceCount,
        ]),
      ];

      const collectionSheet = [
        ['Daily Collection'],
        ['Date', 'Amount Collected'],
        ...data.dailyCollection.map(d => [d.date, formatCurrencyForExcel(d.collected)]),
      ];

      const methodSheet = [
        ['Collection by Payment Method'],
        ['Method', 'Payments', 'Amount'],
        ...data.collectionByMethod.map(m => [m.method || 'Unknown', m.count, formatCurrencyForExcel(m.amount)]),
      ];

      const crSheet = [
        ['Cash Register Collections'],
        [],
        ['Total Cash Register Collected', formatCurrencyForExcel(data.cashRegister.totalCollected)],
        [],
        ['Daily Cash Register'],
        ['Date', 'Amount'],
        ...data.cashRegister.daily.map(d => [d.date, formatCurrencyForExcel(d.collected)]),
        [],
        ['By Source Type'],
        ['Source', 'Transactions', 'Amount'],
        ...data.cashRegister.bySource.map(s => [s.sourceType, s.count, formatCurrencyForExcel(s.amount)]),
      ];

      await exportToExcel({
        filename: `mfg-sales-analysis-${data.month}.xlsx`,
        sheets: [
          { name: 'Summary', data: summarySheet },
          { name: 'Stock Origin', data: stockSheet },
          { name: 'Pricing Strategy', data: pricingSheet },
          { name: 'Daily Collection', data: collectionSheet },
          { name: 'Payment Methods', data: methodSheet },
          { name: 'Cash Register', data: crSheet },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="mis-manufacturing-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/mis">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Manufacturing Sales Analysis</h1>
            <p className="text-muted-foreground text-sm">Sales, stock origin, collection &amp; pricing</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting || isLoading} data-testid="button-export">
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting…' : 'Export Excel'}
          </Button>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[150px]" data-testid="select-month">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(o => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : data ? (
        <>
          {/* ── KPI Cards ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Factory className="w-4 h-4 text-blue-500 shrink-0" />
                    <p className="text-xs text-muted-foreground">Invoices</p>
                  </div>
                  <p className="text-2xl font-bold" data-testid="kpi-invoice-count">{data.salesSummary.invoiceCount}</p>
                  <GrowthBadge current={data.salesSummary.invoiceCount} prev={data.prevMonthSummary.invoiceCount} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-green-500 shrink-0" />
                    <p className="text-xs text-muted-foreground">Sales (excl. GST)</p>
                  </div>
                  <p className="text-xl font-bold text-green-600" data-testid="kpi-total-sales">{formatCurrency(data.salesSummary.totalSales)}</p>
                  <GrowthBadge current={data.salesSummary.totalSales} prev={data.prevMonthSummary.totalSales} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-500 shrink-0" />
                    <p className="text-xs text-muted-foreground">With GST</p>
                  </div>
                  <p className="text-xl font-bold" data-testid="kpi-total-gst">{formatCurrency(data.salesSummary.totalWithGst)}</p>
                  <GrowthBadge current={data.salesSummary.totalWithGst} prev={data.prevMonthSummary.totalWithGst} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-teal-500 shrink-0" />
                    <p className="text-xs text-muted-foreground">Collected</p>
                  </div>
                  <p className="text-xl font-bold text-teal-600" data-testid="kpi-collected">{formatCurrency(data.salesSummary.totalCollected)}</p>
                  <GrowthBadge current={data.salesSummary.totalCollected} prev={data.prevMonthSummary.totalCollected} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                  </div>
                  <p className="text-xl font-bold text-amber-600" data-testid="kpi-pending">{formatCurrency(data.salesSummary.totalPending)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                    <p className="text-xs text-muted-foreground">Collection %</p>
                  </div>
                  <p className={`text-2xl font-bold ${data.salesSummary.collectionPct >= 80 ? 'text-emerald-600' : data.salesSummary.collectionPct >= 50 ? 'text-amber-600' : 'text-red-500'}`} data-testid="kpi-collection-pct">
                    {data.salesSummary.collectionPct}%
                  </p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${data.salesSummary.collectionPct >= 80 ? 'bg-emerald-500' : data.salesSummary.collectionPct >= 50 ? 'bg-amber-400' : 'bg-red-500'}`}
                      style={{ width: `${data.salesSummary.collectionPct}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-orange-500 shrink-0" />
                    <p className="text-xs text-muted-foreground">Cash Register</p>
                  </div>
                  <p className="text-xl font-bold text-orange-600" data-testid="kpi-cash-register">{formatCurrency(data.cashRegister?.totalCollected ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">collected this month</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Stock Origin + Sale vs Collection ── */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Stock Origin */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-blue-500" />
                  Stock Origin — Dispatched This Month
                </CardTitle>
                <CardDescription>Which production batch was used to fulfil this month's sales</CardDescription>
              </CardHeader>
              <CardContent>
                {data.stockOrigin.totalQty === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No gatepass dispatch data linked to invoices this month</p>
                ) : (
                  <div className="space-y-5">
                    {[
                      { label: 'Current Month Production', qty: data.stockOrigin.currentMonth.qty, color: 'bg-blue-500', textColor: 'text-blue-600', byProduct: data.stockOrigin.currentMonth.byProduct },
                      { label: 'Previous Month Production', qty: data.stockOrigin.prevMonth.qty, color: 'bg-amber-400', textColor: 'text-amber-600', byProduct: data.stockOrigin.prevMonth.byProduct },
                      { label: 'Older Stock', qty: data.stockOrigin.older.qty, color: 'bg-muted-foreground', textColor: 'text-muted-foreground', byProduct: data.stockOrigin.older.byProduct },
                    ].map((origin) => {
                      const percentage = pct(origin.qty, data.stockOrigin.totalQty);
                      return (
                        <div key={origin.label} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <div className={`w-2.5 h-2.5 rounded-full ${origin.color}`} />
                              <span className="text-sm font-medium">{origin.label}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-sm ${origin.textColor}`}>{origin.qty.toLocaleString()} cases</span>
                              <Badge variant="outline" className="text-xs">{percentage}%</Badge>
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full ${origin.color} rounded-full transition-all`} style={{ width: `${percentage}%` }} />
                          </div>
                          {origin.byProduct.length > 0 && (
                            <div className="pl-4 space-y-1">
                              {origin.byProduct.slice(0, 4).map((bp, idx) => (
                                <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                                  <span className="truncate max-w-[200px]">{bp.productName}</span>
                                  <span>{bp.qty.toLocaleString()}</span>
                                </div>
                              ))}
                              {origin.byProduct.length > 4 && (
                                <p className="text-xs text-muted-foreground">+{origin.byProduct.length - 4} more products</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="border-t pt-3 flex justify-between text-sm font-medium">
                      <span>Total Dispatched</span>
                      <span>{data.stockOrigin.totalQty.toLocaleString()} cases</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sale vs Collection Comparison */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Sale vs Collection Comparison
                </CardTitle>
                <CardDescription>Current month vs previous month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      label: 'Sales (excl. GST)',
                      curr: data.salesSummary.totalSales,
                      prev: data.prevMonthSummary.totalSales,
                      color: 'bg-blue-500',
                    },
                    {
                      label: 'Collections',
                      curr: data.salesSummary.totalCollected,
                      prev: data.prevMonthSummary.totalCollected,
                      color: 'bg-emerald-500',
                    },
                    {
                      label: 'Sales with GST',
                      curr: data.salesSummary.totalWithGst,
                      prev: data.prevMonthSummary.totalWithGst,
                      color: 'bg-purple-500',
                    },
                  ].map((row) => {
                    const maxVal = Math.max(row.curr, row.prev, 1);
                    return (
                      <div key={row.label} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{row.label}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs w-20 text-muted-foreground shrink-0">Current</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full ${row.color} rounded-full`} style={{ width: `${pct(row.curr, maxVal)}%` }} />
                            </div>
                            <span className="text-xs font-medium w-24 text-right">{formatCurrency(row.curr)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs w-20 text-muted-foreground shrink-0">Prev Month</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full ${row.color} rounded-full opacity-40`} style={{ width: `${pct(row.prev, maxVal)}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-24 text-right">{formatCurrency(row.prev)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="border-t pt-4 grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded p-3">
                      <p className="text-xs text-muted-foreground mb-1">Invoiced this month</p>
                      <p className="font-semibold">{data.salesSummary.invoiceCount} invoices</p>
                    </div>
                    <div className="bg-muted/50 rounded p-3">
                      <p className="text-xs text-muted-foreground mb-1">GST on Sales</p>
                      <p className="font-semibold">{formatCurrency(data.salesSummary.totalWithGst - data.salesSummary.totalSales)}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-3">
                      <p className="text-xs text-muted-foreground mb-1">Collection Efficiency</p>
                      <p className={`font-semibold ${data.salesSummary.collectionPct >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{data.salesSummary.collectionPct}%</p>
                    </div>
                    <div className="bg-muted/50 rounded p-3">
                      <p className="text-xs text-muted-foreground mb-1">Outstanding</p>
                      <p className="font-semibold text-amber-600">{formatCurrency(data.salesSummary.totalPending)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Pricing Strategy ── */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4 text-purple-500" />
                Pricing Strategy — Product-wise
              </CardTitle>
              <CardDescription>Unit price range, average selling price, and revenue contribution per product</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Avg Unit Price</TableHead>
                    <TableHead className="text-right">Min Price</TableHead>
                    <TableHead className="text-right">Max Price</TableHead>
                    <TableHead className="text-right">Price Spread</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.pricingStrategy.map((p, idx) => {
                    const spread = p.maxUnitPrice - p.minUnitPrice;
                    const spreadPct = p.avgUnitPrice > 0 ? (spread / p.avgUnitPrice * 100) : 0;
                    return (
                      <TableRow key={idx} data-testid={`row-pricing-${idx}`}>
                        <TableCell className="font-medium max-w-[200px] truncate">{p.productName}</TableCell>
                        <TableCell className="text-right">{p.qtySold.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-semibold">{formatUnit(p.avgUnitPrice)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatUnit(p.minUnitPrice)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatUnit(p.maxUnitPrice)}</TableCell>
                        <TableCell className="text-right">
                          {spread > 0 ? (
                            <span className="text-amber-600 flex items-center justify-end gap-1">
                              {formatUnit(spread)}
                              <Badge variant="outline" className="text-xs">{spreadPct.toFixed(0)}%</Badge>
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-green-600 text-xs">Fixed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(p.totalRevenue)}</TableCell>
                        <TableCell className="text-right">{p.invoiceCount}</TableCell>
                      </TableRow>
                    );
                  })}
                  {data.pricingStrategy.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-6">No invoice data for this month</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* ── Cash Register Collections ── */}
          {(data.cashRegister?.totalCollected ?? 0) > 0 && (
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-orange-500" />
                    Cash Register — Daily Collections
                  </CardTitle>
                  <CardDescription>Cash received in the cash register each day (not via invoice payment)</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Cash Received</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.cashRegister.daily.map((d, idx) => (
                        <TableRow key={idx} data-testid={`row-cr-daily-${idx}`}>
                          <TableCell>{d.date}</TableCell>
                          <TableCell className="text-right font-semibold text-orange-600">{formatCurrency(d.collected)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-semibold bg-muted/30">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right text-orange-700">
                          {formatCurrency(data.cashRegister.totalCollected)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="w-4 h-4 text-orange-400" />
                    Cash Register — By Source Type
                  </CardTitle>
                  <CardDescription>Breakdown by how cash was received in the register</CardDescription>
                </CardHeader>
                <CardContent>
                  {data.cashRegister.bySource.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-8">No source breakdown available</p>
                  ) : (
                    <div className="space-y-3">
                      {(() => {
                        const total = data.cashRegister.bySource.reduce((s, m) => s + m.amount, 0);
                        return data.cashRegister.bySource.map((m, idx) => {
                          const percentage = pct(m.amount, total);
                          const label = m.sourceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                          return (
                            <div key={idx} className="space-y-1" data-testid={`row-cr-source-${idx}`}>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{label}</Badge>
                                  <span className="text-xs text-muted-foreground">{m.count} txns</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{formatCurrency(m.amount)}</span>
                                  <Badge variant="secondary" className="text-xs">{percentage}%</Badge>
                                </div>
                              </div>
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-orange-400 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Daily Collection + Payment Methods ── */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-teal-500" />
                  Daily Collection
                </CardTitle>
                <CardDescription>Payments received day-by-day this month</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount Collected</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dailyCollection.map((d, idx) => (
                      <TableRow key={idx} data-testid={`row-daily-${idx}`}>
                        <TableCell>{d.date}</TableCell>
                        <TableCell className="text-right font-semibold text-teal-600">{formatCurrency(d.collected)}</TableCell>
                      </TableRow>
                    ))}
                    {data.dailyCollection.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-6">No collections recorded this month</TableCell>
                      </TableRow>
                    )}
                    {data.dailyCollection.length > 0 && (
                      <TableRow className="font-semibold bg-muted/30">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right text-teal-700">
                          {formatCurrency(data.dailyCollection.reduce((s, d) => s + d.collected, 0))}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-500" />
                  Collection by Payment Mode
                </CardTitle>
                <CardDescription>How collections were received this month</CardDescription>
              </CardHeader>
              <CardContent>
                {data.collectionByMethod.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-8">No payment data this month</p>
                ) : (
                  <div className="space-y-3">
                    {(() => {
                      const total = data.collectionByMethod.reduce((s, m) => s + m.amount, 0);
                      return data.collectionByMethod.map((m, idx) => {
                        const percentage = pct(m.amount, total);
                        return (
                          <div key={idx} className="space-y-1" data-testid={`row-method-${idx}`}>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{m.method || 'Unknown'}</Badge>
                                <span className="text-xs text-muted-foreground">{m.count} payments</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">{formatCurrency(m.amount)}</span>
                                <Badge variant="secondary" className="text-xs">{percentage}%</Badge>
                              </div>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Failed to load manufacturing sales analysis</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
