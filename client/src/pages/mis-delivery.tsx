import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Download, CheckSquare, Square, Truck, Clock } from "lucide-react";
import { useState } from "react";
import { exportToExcel, formatDateForExcel } from "@/lib/excel-export";
import { format } from "date-fns";

interface DeliveryData {
  period: number;
  summary: { totalDispatches: number; completed: number; inTransit: number; pending: number; otifRate: string; avgDeliveryHours: string };
  statusBreakdown: Array<{ status: string; count: number }>;
  dailyTrend: Array<{ date: string; totalDispatched: number; completed: number; completionRate: string }>;
  transporterPerformance: Array<{ transporter: string; totalDispatches: number; completed: number; pending: number; inTransit: number; completionRate: string }>;
}

function KpiBadge({ label, color }: { label: string; color: 'gray' | 'red' | 'orange' | 'green' | 'amber' | 'blue' }) {
  const cls = {
    gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  }[color];
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${cls}`}>{label}</span>;
}

const STATUS_DETAIL: Record<string, { label: string; sub: string; color: string }> = {
  generated: { label: 'Dispatched & Pending', sub: 'Awaiting delivery start', color: 'bg-amber-500' },
  vehicle_out: { label: 'In Transit', sub: 'Out for delivery — unconfirmed', color: 'bg-blue-500' },
  delivered: { label: 'Completed', sub: 'Awaiting system update', color: 'bg-green-500' },
  completed: { label: 'Completed', sub: 'Delivery confirmed', color: 'bg-green-600' },
};

export default function MISDelivery() {
  const [period, setPeriod] = useState('30');
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useQuery<DeliveryData>({ queryKey: ['/api/mis/delivery-performance', { period }] });

  const otif = parseFloat(data?.summary.otifRate as string || '0');
  const hasTrackingGap = (data?.summary.totalDispatches || 0) > 0 && otif === 0;

  const handleExportExcel = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      await exportToExcel({
        filename: `mis-delivery-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [
          { name: 'Summary', data: [['Total Dispatches', data.summary.totalDispatches], ['Completed', data.summary.completed], ['In Transit', data.summary.inTransit], ['Pending', data.summary.pending], ['OTIF Rate', data.summary.otifRate], ['Avg Delivery Hours', data.summary.avgDeliveryHours]] },
          { name: 'Daily Trend', data: [['Date', 'Dispatched', 'Completed', 'Rate'], ...data.dailyTrend.map(d => [formatDateForExcel(d.date), d.totalDispatched, d.completed, d.completionRate])] },
          { name: 'Transporter Performance', data: [['Transporter', 'Total', 'Completed', 'Pending', 'In Transit', 'Completion %'], ...data.transporterPerformance.map(t => [t.transporter, t.totalDispatches, t.completed, t.pending, t.inTransit || 0, t.completionRate])] },
        ],
      });
    } finally { setIsExporting(false); }
  };

  const checklistItems = [
    { done: false, text: 'Add "Delivered" status option in dispatch entry form' },
    { done: false, text: 'Train drivers / field staff to mark delivery on completion' },
    { done: false, text: 'Set up customer delivery confirmation (SMS / WhatsApp OTP)' },
    { done: true, text: 'Dispatch entry and date logging is working — this part is correct' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="mis-delivery-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Delivery Performance</h1>
          <p className="text-muted-foreground text-sm">OTIF tracking and dispatch analytics — MicroGrid.</p>
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
          {hasTrackingGap && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-900/20 dark:border-amber-800">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-300">Tracking Gap Detected: {data.summary.totalDispatches} dispatched, {data.summary.completed} completed recorded</p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">OTIF 0.0% is a system data gap, not actual failure. Update delivery confirmation workflow so drivers/customers mark deliveries complete.</p>
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm text-muted-foreground">Total Dispatches</p>
                  <KpiBadge label="ACTIVE" color="green" />
                </div>
                <p className="text-2xl font-bold">{data.summary.totalDispatches}</p>
                <p className="text-xs text-muted-foreground mt-1">This period</p>
                <p className="text-xs text-muted-foreground mt-1">Active fleet</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <KpiBadge label={data.summary.completed === 0 ? 'DATA GAP' : 'RECORDED'} color={data.summary.completed === 0 ? 'gray' : 'green'} />
                </div>
                <p className="text-2xl font-bold">{data.summary.completed}</p>
                <p className="text-xs text-muted-foreground mt-1">Not recorded</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">System gap</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm text-muted-foreground">OTIF Rate</p>
                  <KpiBadge label={otif === 0 ? 'DATA GAP' : otif >= 95 ? 'HEALTHY' : otif >= 80 ? 'ALERT' : 'CRITICAL'} color={otif === 0 ? 'gray' : otif >= 95 ? 'green' : otif >= 80 ? 'amber' : 'red'} />
                </div>
                <p className="text-2xl font-bold">{data.summary.otifRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">On-time in-full</p>
                <p className="text-xs text-muted-foreground mt-1">Target: 95%+</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm text-muted-foreground">Avg Delivery Time</p>
                  <KpiBadge label={parseFloat(data.summary.avgDeliveryHours) === 0 ? 'UNKNOWN' : 'MEASURED'} color={parseFloat(data.summary.avgDeliveryHours) === 0 ? 'gray' : 'green'} />
                </div>
                <p className="text-2xl font-bold">{data.summary.avgDeliveryHours}h</p>
                <p className="text-xs text-muted-foreground mt-1">No completion data</p>
                <p className="text-xs text-muted-foreground mt-1">Target: &lt;4h</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dispatch Status</CardTitle>
                <CardDescription>Current status breakdown — {data.summary.totalDispatches} total dispatches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.statusBreakdown.map((s, i) => {
                    const detail = STATUS_DETAIL[s.status] || { label: s.status, sub: '', color: 'bg-gray-400' };
                    const pct = data.summary.totalDispatches > 0 ? (s.count / data.summary.totalDispatches) * 100 : 0;
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium">{detail.label}</p>
                            <p className="text-xs text-muted-foreground">{detail.sub}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{s.count}</span>
                            <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${detail.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {data.statusBreakdown.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No dispatch data for this period</p>}
                </div>
                {hasTrackingGap && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-4">→ Add delivery confirmation step in dispatch workflow to fix OTIF tracking</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Pending &amp; In Transit</CardTitle><CardDescription>Dispatches requiring attention</CardDescription></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 bg-amber-50 border border-amber-200 rounded-lg text-center dark:bg-amber-900/20 dark:border-amber-800">
                    <Clock className="w-6 h-6 mx-auto text-amber-600 mb-2" />
                    <p className="text-4xl font-bold text-amber-700 dark:text-amber-300">{data.summary.pending}</p>
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mt-1">Pending Dispatch</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Awaiting loading</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-300 mt-2 inline-block">ACTION NEEDED</span>
                  </div>
                  <div className="p-5 bg-blue-50 border border-blue-200 rounded-lg text-center dark:bg-blue-900/20 dark:border-blue-800">
                    <Truck className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                    <p className="text-4xl font-bold text-blue-700 dark:text-blue-300">{data.summary.inTransit}</p>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mt-1">In Transit</p>
                    <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">No POD recorded</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300 mt-2 inline-block">AWAITING POD</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transporter Performance</CardTitle>
              <CardDescription>Delivery completion by transporter · Completion rate pending delivery confirmation</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transporter</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">In Transit</TableHead>
                    <TableHead className="text-right">Completion %</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transporterPerformance.map((t, i) => {
                    const rate = parseFloat(t.completionRate as string);
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          <p className="font-medium text-sm">{t.transporter}</p>
                          <p className="text-xs text-muted-foreground">{t.totalDispatches === data.summary.totalDispatches ? 'Own fleet' : '3rd party'}</p>
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">{t.totalDispatches}</TableCell>
                        <TableCell className="text-right text-sm text-green-600">{t.completed}</TableCell>
                        <TableCell className="text-right text-sm text-amber-600">{t.pending}</TableCell>
                        <TableCell className="text-right text-sm text-blue-600">{t.inTransit || 0}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{t.completionRate}%</TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${rate === 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' : rate >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                            {rate === 0 ? 'NO COMPLETION' : rate >= 80 ? 'ON TRACK' : 'LAGGING'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {data.transporterPerformance.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6 text-sm">No transporter data</TableCell></TableRow>}
                </TableBody>
              </Table>
              {hasTrackingGap && (
                <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted/50 rounded">→ Fix: Add 'Mark Delivered' button in driver app / dispatch entry form. Without this, OTIF will always show 0%</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Daily Dispatch Trend</CardTitle><CardDescription>Day-by-day dispatch vs completion activity — Last {period} days</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Dispatched</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead>OTIF Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dailyTrend.map((day, i) => {
                    const rate = parseFloat(day.completionRate as string);
                    const pending = day.totalDispatched - day.completed;
                    return (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-medium">
                          {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold">{day.totalDispatched}</TableCell>
                        <TableCell className="text-right text-sm text-green-600">{day.completed}</TableCell>
                        <TableCell className="text-right text-sm text-amber-600">{pending}</TableCell>
                        <TableCell>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${rate === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' : rate >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400'}`}>
                            {rate === 0 ? 'PENDING' : rate >= 80 ? 'ON TRACK' : 'LAGGING'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {data.dailyTrend.length > 0 && (
                    <TableRow className="bg-muted/30 font-semibold">
                      <TableCell className="text-sm"></TableCell>
                      <TableCell className="text-right text-sm">{data.dailyTrend.reduce((s, d) => s + d.totalDispatched, 0)}</TableCell>
                      <TableCell className="text-right text-sm text-green-600">{data.dailyTrend.reduce((s, d) => s + d.completed, 0)}</TableCell>
                      <TableCell className="text-right text-sm text-amber-600">{data.dailyTrend.reduce((s, d) => s + (d.totalDispatched - d.completed), 0)}</TableCell>
                      <TableCell>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400">
                          {otif.toFixed(0)}% OTIF
                        </span>
                      </TableCell>
                    </TableRow>
                  )}
                  {data.dailyTrend.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-sm">No daily data available</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="bg-blue-50/50 dark:bg-blue-900/20 rounded-t-lg">
              <CardTitle className="text-base text-blue-800 dark:text-blue-300">Delivery Tracking Fix — 4-Step Checklist</CardTitle>
              <CardDescription className="text-blue-600 dark:text-blue-400">Complete these to get accurate OTIF data</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {checklistItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  {item.done ? <CheckSquare className="w-4 h-4 text-green-600 mt-0.5 shrink-0" /> : <Square className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
                  <p className={`text-sm ${item.done ? 'text-green-700 dark:text-green-400 font-medium' : 'text-foreground'}`}>{item.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card><CardContent className="p-8 text-center"><p className="text-muted-foreground">Failed to load delivery performance</p></CardContent></Card>
      )}
    </div>
  );
}
