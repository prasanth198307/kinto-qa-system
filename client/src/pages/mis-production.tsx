import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Download, Info, CheckSquare, Square } from "lucide-react";
import { useState } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { exportToExcel, formatDateForExcel } from "@/lib/excel-export";
import { format } from "date-fns";

interface ProductionData {
  period: number;
  dailyTrend: Array<{ date: string; entries: number; produced: number; rejected: number; derivedUnits: number; yield: string }>;
  byProduct: Array<{ productName: string; entries: number; totalProduced: number; totalRejected: number; yield: string }>;
  bomVariance: Array<{ productName: string; reconciliationCount: number; avgVariance: string; minVariance: string; maxVariance: string }>;
  byShift: Array<{ shift: string; entries: number; totalProduced: number; totalRejected: number }>;
}

const SHIFT_COLORS = ['#16a34a', '#2563eb', '#7c3aed'];
const SHIFT_NAMES: Record<string, string> = { '1': 'Morning\n6AM–2PM', '2': 'Afternoon\n2PM–10PM', '3': 'Night\n10PM–6AM', morning: 'Morning\n6AM–2PM', afternoon: 'Afternoon\n2PM–10PM', night: 'Night\n10PM–6AM' };

function StatusBadge({ label, color }: { label: string; color: 'gray' | 'red' | 'orange' | 'green' | 'amber' }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  };
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide no-default-hover-elevate ${colors[color]}`}>{label}</span>;
}

function SparkLine({ data, color = '#16a34a' }: { data: number[]; color?: string }) {
  if (!data.length) return <span className="text-muted-foreground text-xs">—</span>;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 60},${20 - (v / max) * 18}`).join(' ');
  return (
    <svg width="60" height="20" viewBox="0 0 60 20">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => (
        <circle key={i} cx={(i / (data.length - 1)) * 60} cy={20 - (v / max) * 18} r="2" fill={color} />
      ))}
    </svg>
  );
}

export default function MISProduction() {
  const [period, setPeriod] = useState('30');
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useQuery<ProductionData>({ queryKey: ['/api/mis/production-analytics', { period }] });

  const fmt = (n: number) => n.toLocaleString('en-IN');
  const totalProduced = data?.byProduct.reduce((s, p) => s + p.totalProduced, 0) || 0;
  const totalRejected = data?.byProduct.reduce((s, p) => s + p.totalRejected, 0) || 0;
  const avgDaily = data?.dailyTrend.length ? Math.round(data.dailyTrend.reduce((s, d) => s + d.produced, 0) / data.dailyTrend.length) : 0;
  const yieldRate = totalProduced > 0 ? (((totalProduced - totalRejected) / totalProduced) * 100).toFixed(1) : null;
  const hasData = totalProduced > 0;

  const handleExportExcel = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      await exportToExcel({
        filename: `mis-production-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [
          { name: 'Daily Trend', data: [['Date', 'Entries', 'Produced', 'Rejected', 'Yield %'], ...data.dailyTrend.map(d => [formatDateForExcel(d.date), d.entries, d.produced, d.rejected, d.yield])] },
          { name: 'By Product', data: [['Product', 'Entries', 'Produced', 'Rejected', 'Yield %'], ...data.byProduct.map(p => [p.productName, p.entries, p.totalProduced, p.totalRejected, p.yield])] },
          { name: 'By Shift', data: [['Shift', 'Entries', 'Produced', 'Rejected'], ...data.byShift.map(s => [`Shift ${s.shift}`, s.entries, s.totalProduced, s.totalRejected])] },
          { name: 'BOM Variance', data: [['Product', 'Count', 'Avg Variance', 'Min', 'Max'], ...data.bomVariance.map(v => [v.productName, v.reconciliationCount, v.avgVariance, v.minVariance, v.maxVariance])] },
        ],
      });
    } finally { setIsExporting(false); }
  };

  const shiftChartData = (data?.byShift || []).map((s, i) => ({
    name: SHIFT_NAMES[s.shift] || `Shift ${s.shift}`,
    produced: s.totalProduced,
    color: SHIFT_COLORS[i % SHIFT_COLORS.length],
  }));

  const areaChartData = (data?.dailyTrend || []).slice().reverse().map(d => ({
    date: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    produced: d.produced,
    rejected: d.rejected,
  }));

  const checklistItems = [
    { done: false, text: 'Create shift schedule (Morning / Afternoon / Night) in Settings → Shifts' },
    { done: false, text: 'Assign operators to each shift in Settings → Employees' },
    { done: false, text: 'Define products with BOM (Bill of Materials) in Inventory → Products' },
    { done: false, text: 'Train operators to log production entry at end of each shift' },
    { done: false, text: 'Set daily production targets per product (e.g. 1L bottle: 720 units/shift)' },
    { done: true, text: 'Export Excel button is live — will auto-populate once data is entered' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="mis-production-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Production Analytics</h1>
          <p className="text-muted-foreground text-sm">Efficiency, yield, and variance analysis — Inmoisture Pvt. Ltd.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isExporting || isLoading} data-testid="button-export-excel">
            <Download className="w-4 h-4 mr-2" />{isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[160px]" data-testid="select-period"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4"><div className="grid md:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="h-64" /></div>
      ) : data ? (
        <>
          {!hasData && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-900/20 dark:border-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300">Production entries not logged for this period</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">No shift entries found in last {period} days. This is a data entry gap — ensure operators log production at end of shift. See setup checklist below.</p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { label: 'Total Production', value: fmt(totalProduced), sub: 'Bottles produced', action: 'Log shift entries', badge: <StatusBadge label="NO DATA" color="gray" />, show: !hasData },
              { label: 'Total Rejected', value: fmt(totalRejected), sub: 'Quality rejects', action: 'Awaiting data', badge: <StatusBadge label="NO DATA" color="gray" />, show: !hasData },
              { label: 'Avg Daily Output', value: fmt(avgDaily), sub: 'Units/day', action: 'Target: 2,400/day', badge: avgDaily === 0 ? <StatusBadge label="BELOW TARGET" color="orange" /> : <StatusBadge label="ON TARGET" color="green" />, show: true },
              { label: 'Yield Rate', value: yieldRate ? `${yieldRate}%` : '—', sub: 'Accepted/Produced', action: 'Target: ≥98%', badge: yieldRate === null ? <StatusBadge label="UNMEASURED" color="gray" /> : parseFloat(yieldRate) >= 98 ? <StatusBadge label="ON TARGET" color="green" /> : <StatusBadge label="BELOW TARGET" color="orange" />, show: true },
            ].map((kpi, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    {kpi.badge}
                  </div>
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">{kpi.action}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {!hasData && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <p className="text-sm text-blue-700 dark:text-blue-300">Below: what this dashboard looks like with real data — use this as your target state once production entries are logged</p>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Production by Shift</CardTitle><CardDescription>Output distribution across shifts</CardDescription></CardHeader>
              <CardContent>
                {shiftChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={shiftChartData} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={v => v.split('\n')[0]} />
                      <YAxis hide />
                      <Tooltip formatter={(v: number) => [fmt(v), 'Produced']} />
                      <Bar dataKey="produced" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11, fontWeight: 'bold' }}>
                        {shiftChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No shift data — log production entries to see output by shift</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">BOM Variance Analysis</CardTitle><CardDescription>Material consumption vs standard — sample</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Avg Variance</TableHead>
                      <TableHead className="text-right">Range</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.bomVariance.map((v, i) => {
                      const variance = parseFloat(v.avgVariance);
                      const isHigh = variance > 5;
                      return (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-sm">{v.productName}</TableCell>
                          <TableCell className="text-right font-semibold text-sm">{variance > 0 ? '+' : ''}{v.avgVariance}%</TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">{v.minVariance}–{v.maxVariance}%</TableCell>
                          <TableCell className="text-right">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${isHigh ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'}`}>
                              {isHigh ? 'HIGH' : 'NORMAL'}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {data.bomVariance.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6 text-sm">No variance data — complete production reconciliations to see BOM analysis</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Production by Product</CardTitle><CardDescription>Top products by output volume — sample data (your target view)</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Entries</TableHead>
                    <TableHead className="text-right">Produced</TableHead>
                    <TableHead className="text-right">Rejected</TableHead>
                    <TableHead className="text-right">Yield</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byProduct.map((p, i) => {
                    const yld = parseFloat(p.yield);
                    const trend = data.dailyTrend.slice(-7).map(d => d.produced);
                    const isLow = yld < 95;
                    return (
                      <TableRow key={i} className={isLow ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                        <TableCell className="font-medium text-sm">{p.productName}</TableCell>
                        <TableCell className="text-right text-sm">{p.entries}</TableCell>
                        <TableCell className="text-right font-bold text-sm">{fmt(p.totalProduced)}</TableCell>
                        <TableCell className={`text-right text-sm ${isLow ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>{fmt(p.totalRejected)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`text-sm font-semibold ${yld >= 98 ? 'text-green-600' : yld >= 95 ? 'text-amber-600' : 'text-red-600'}`}>{p.yield}%</span>
                        </TableCell>
                        <TableCell className="text-right"><SparkLine data={trend} color={isLow ? '#dc2626' : '#16a34a'} /></TableCell>
                      </TableRow>
                    );
                  })}
                  {data.byProduct.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6 text-sm">No production data logged for this period</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Daily Production Trend</CardTitle><CardDescription>Day-by-day production output — sample 30-day view</CardDescription></CardHeader>
            <CardContent>
              {areaChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={areaChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 10 }} width={40} />
                    <Tooltip />
                    <Area type="monotone" dataKey="produced" stroke="#16a34a" strokeWidth={2} fill="url(#prodGrad)" name="Daily Output" />
                    <Area type="monotone" dataKey="rejected" stroke="#dc2626" strokeWidth={1.5} fill="none" strokeDasharray="4 2" name="Rejected Units" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No daily data available for this period</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="bg-blue-50/50 dark:bg-blue-900/20 rounded-t-lg">
              <CardTitle className="text-base text-blue-800 dark:text-blue-300">Setup Checklist — Required to activate this dashboard</CardTitle>
              <CardDescription className="text-blue-600 dark:text-blue-400">Complete these steps to start seeing real production data</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {checklistItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  {item.done ? (
                    <CheckSquare className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <p className={`text-sm ${item.done ? 'text-green-700 dark:text-green-400 font-medium' : 'text-foreground'}`}>{item.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground">Failed to load production analytics</p></CardContent></Card>
      )}
    </div>
  );
}
