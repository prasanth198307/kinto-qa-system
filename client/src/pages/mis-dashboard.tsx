import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  DollarSign,
  Factory,
  Wallet,
  AlertCircle,
  Clock,
  FileWarning,
  ChevronRight,
  Activity,
  Download,
  ArrowLeft,
  AlertOctagon,
  Search,
  Eye,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { exportToExcel, formatCurrencyForExcel } from "@/lib/excel-export";
import { format } from "date-fns";

interface KPIData {
  period: number;
  startDate: string;
  kpis: {
    production: {
      totalEntries: number;
      totalProduced: number;
      totalRejected: number;
      totalDerivedUnits: number;
      yieldPercent: string;
    };
    sales: {
      totalInvoices: number;
      totalRevenue: number;
      totalWithTax: number;
      totalReceived: number;
      totalPending: number;
      collectionRate: string;
    };
    dispatch: {
      totalGatepasses: number;
      delivered: number;
      pending: number;
      inTransit: number;
      fulfillmentRate: string;
    };
    quality: {
      totalSubmissions: number;
      okCount: number;
      nokCount: number;
      complianceRate: string;
    };
    cash: {
      totalClosing: number;
      totalReceived: number;
      totalExpenses: number;
    };
    payments: Array<{
      method: string;
      count: number;
      amount: number;
    }>;
  };
}

interface Alert {
  type: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  amount?: number;
  daysOverdue?: number;
  daysPending?: number;
  daysToExpiry?: number;
}

interface AlertsData {
  totalAlerts: number;
  bySeverity: { high: number; medium: number; low: number };
  byType: Record<string, number>;
  alerts: Alert[];
}

function formatCurrency(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatCurrencyCompact(paise: number): string {
  const val = paise / 100;
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val.toLocaleString('en-IN')}`;
}

type StatusType = 'HEALTHY' | 'CRITICAL' | 'ALERT' | 'NO DATA';

const statusStyles: Record<StatusType, string> = {
  HEALTHY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  CRITICAL: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ALERT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'NO DATA': 'bg-muted text-muted-foreground',
};

const statusValueColors: Record<StatusType, string> = {
  HEALTHY: 'text-green-700 dark:text-green-400',
  CRITICAL: 'text-red-700 dark:text-red-400',
  ALERT: 'text-amber-700 dark:text-amber-400',
  'NO DATA': 'text-muted-foreground',
};

const statusUnderlineColors: Record<StatusType, string> = {
  HEALTHY: '',
  CRITICAL: 'bg-red-400',
  ALERT: 'bg-amber-400',
  'NO DATA': '',
};

function StatusBadge({ status }: { status: StatusType }) {
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

function KPICard({
  title, value, line1, line2, status, highlight
}: {
  title: string;
  value: string;
  line1?: string;
  line2?: string;
  status: StatusType;
  highlight?: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col gap-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground font-medium">{title}</span>
          <StatusBadge status={status} />
        </div>
        <p className={`text-2xl font-bold leading-tight ${statusValueColors[status]}`}>{value}</p>
        {line1 && <p className="text-xs text-muted-foreground">{line1}</p>}
        {line2 && (
          <p className={`text-xs font-semibold ${status === 'CRITICAL' ? 'text-red-600' : status === 'ALERT' ? 'text-amber-600' : 'text-muted-foreground'} underline underline-offset-2`}>
            {line2}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AlertItem({ alert }: { alert: Alert }) {
  const severityColors = {
    high: 'bg-destructive/10 text-destructive border-destructive/20',
    medium: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    low: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  };

  const typeIcons: Record<string, any> = {
    overdue_payment: DollarSign,
    low_stock: Package,
    pending_dispatch: Truck,
    expiring_document: FileWarning,
    quality_issue: XCircle
  };

  const Icon = typeIcons[alert.type] || AlertCircle;

  const linkMap: Record<string, string> = {
    invoice: '/invoices',
    raw_material: '/raw-materials',
    gatepass: '/gatepasses',
    document: '/documents',
    checklist_submission: '/checklist-assignments'
  };

  const link = linkMap[alert.entityType] || '/';

  return (
    <div className={`p-3 rounded-lg border ${severityColors[alert.severity]} flex items-start gap-3`}>
      <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{alert.title}</p>
        <p className="text-xs opacity-80 truncate">{alert.description}</p>
      </div>
      <Link href={link}>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </Link>
    </div>
  );
}

type PriorityLevel = 'IMMEDIATE' | 'INVESTIGATE' | 'VERIFY' | 'MONITOR';
const priorityStyles: Record<PriorityLevel, { label: string; badge: string; border: string }> = {
  IMMEDIATE: { label: 'IMMEDIATE', badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', border: 'border-red-200 dark:border-red-900' },
  INVESTIGATE: { label: 'INVESTIGATE', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900' },
  VERIFY: { label: 'VERIFY', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-900' },
  MONITOR: { label: 'MONITOR', badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', border: 'border-green-200 dark:border-green-900' },
};

function PriorityCard({ level, title, description }: { level: PriorityLevel; title: string; description: string }) {
  const s = priorityStyles[level];
  return (
    <Card className={`border ${s.border}`}>
      <CardContent className="p-4 space-y-2">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${s.badge}`}>{s.label}</span>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

const barColors = ['bg-blue-500', 'bg-green-500', 'bg-amber-500', 'bg-violet-500', 'bg-pink-500'];

export default function MISDashboard() {
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState('30');
  const [isExporting, setIsExporting] = useState(false);

  const { data: kpiData, isLoading: kpiLoading } = useQuery<KPIData>({
    queryKey: ['/api/mis/kpi-dashboard', { period }],
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery<AlertsData>({
    queryKey: ['/api/mis/alerts'],
  });

  const kpis = kpiData?.kpis;

  const collectionRate = parseFloat(kpis?.sales.collectionRate || '0');
  const deliveryRate = parseFloat(kpis?.dispatch.fulfillmentRate || '0');
  const yieldRate = parseFloat(kpis?.production.yieldPercent || '100');
  const qualityRate = parseFloat(kpis?.quality.complianceRate || '100');
  const totalRevenue = kpis?.sales.totalRevenue || 0;
  const totalPending = kpis?.sales.totalPending || 0;
  const totalDispatches = kpis?.dispatch.totalGatepasses || 0;
  const totalDelivered = kpis?.dispatch.delivered || 0;
  const inTransit = kpis?.dispatch.inTransit || 0;
  const totalPaymentsCollected = (kpis?.payments || []).reduce((s, p) => s + p.amount, 0);
  const pendingAsPercentOfRevenue = totalRevenue > 0 ? Math.round((totalPending / totalRevenue) * 100) : 0;
  const trackingGap = totalDispatches - totalDelivered - inTransit;

  const revenueStatus: StatusType = totalRevenue === 0 ? 'NO DATA' : 'HEALTHY';
  const collectionStatus: StatusType = collectionRate < 50 ? 'CRITICAL' : collectionRate < 80 ? 'ALERT' : 'HEALTHY';
  const pendingStatus: StatusType = pendingAsPercentOfRevenue > 80 ? 'ALERT' : totalPending > 0 ? 'ALERT' : 'HEALTHY';
  const productionStatus: StatusType = kpis?.production.totalEntries === 0 ? 'NO DATA' : 'HEALTHY';
  const yieldStatus: StatusType = yieldRate >= 95 ? 'HEALTHY' : 'ALERT';
  const dispatchStatus: StatusType = totalDispatches === 0 ? 'NO DATA' : trackingGap > 0 ? 'ALERT' : 'HEALTHY';
  const deliveryStatus: StatusType = totalDispatches > 0 && deliveryRate < 10 ? 'CRITICAL' : deliveryRate < 80 ? 'ALERT' : 'HEALTHY';
  const qualityStatus: StatusType = qualityRate >= 95 ? 'HEALTHY' : 'ALERT';

  const criticalIssues: string[] = [];
  if (collectionStatus === 'CRITICAL') criticalIssues.push(`Collection Rate only ${collectionRate.toFixed(1)}%`);
  if (deliveryStatus === 'CRITICAL' && totalDispatches > 0) criticalIssues.push(`Delivery Rate ${deliveryRate.toFixed(1)}% despite ${totalDispatches} dispatches`);
  if (pendingAsPercentOfRevenue > 80) criticalIssues.push(`Pending receivables ${formatCurrencyCompact(totalPending)} almost equals total revenue`);

  const paymentTotal = totalPaymentsCollected;
  const paymentMaxBar = Math.max(...(kpis?.payments || []).map(p => p.amount), 1);

  const priorityActions: Array<{ level: PriorityLevel; title: string; description: string }> = [];
  if (collectionStatus === 'CRITICAL' || collectionStatus === 'ALERT') {
    priorityActions.push({
      level: 'IMMEDIATE',
      title: 'Chase receivables urgently',
      description: `${formatCurrencyCompact(totalPending)} outstanding${pendingAsPercentOfRevenue > 80 ? ' nearly equals revenue' : ''}. Assign dedicated collection calls for top overdue invoices today.`,
    });
  }
  if (deliveryStatus === 'CRITICAL') {
    priorityActions.push({
      level: 'INVESTIGATE',
      title: 'Fix delivery tracking system',
      description: `${totalDispatches} dispatches show ${deliveryRate.toFixed(1)}% delivery rate — this is a data entry gap, not real non-delivery. Update dispatch-to-delivery workflow.`,
    });
  }
  if (paymentTotal > 0 && totalPending > 0 && Math.abs(paymentTotal - (totalRevenue - totalPending)) > totalRevenue * 0.05) {
    priorityActions.push({
      level: 'VERIFY',
      title: 'Reconcile payment vs invoice data',
      description: `${formatCurrencyCompact(paymentTotal)} collected across transactions but invoice system shows different pending amount — investigate system reconciliation error.`,
    });
  }
  if (yieldStatus === 'HEALTHY' && productionStatus !== 'NO DATA') {
    priorityActions.push({
      level: 'MONITOR',
      title: `Production yield at ${yieldRate.toFixed(0)}%`,
      description: `Quality and yield metrics are healthy. Ensure production output entries are being logged — currently showing ${kpis?.production.totalEntries || 0} entries.`,
    });
  } else if (productionStatus === 'NO DATA') {
    priorityActions.push({
      level: 'MONITOR',
      title: 'No production entries logged',
      description: `Production output shows 0 entries for this period. Verify that production data is being entered in the system.`,
    });
  }

  const handleExportExcel = async () => {
    if (!kpis) return;
    setIsExporting(true);
    try {
      const kpiSheet = [
        ['Executive Dashboard KPIs'],
        ['Period', `Last ${period} days`],
        ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
        [''],
        ['Sales Metrics'],
        ['Total Revenue', formatCurrencyForExcel(kpis.sales.totalRevenue)],
        ['Total with Tax', formatCurrencyForExcel(kpis.sales.totalWithTax)],
        ['Total Received', formatCurrencyForExcel(kpis.sales.totalReceived)],
        ['Total Pending', formatCurrencyForExcel(kpis.sales.totalPending)],
        ['Total Invoices', kpis.sales.totalInvoices],
        ['Collection Rate', kpis.sales.collectionRate],
        [''],
        ['Production Metrics'],
        ['Total Entries', kpis.production.totalEntries],
        ['Total Produced', kpis.production.totalProduced],
        ['Total Rejected', kpis.production.totalRejected],
        ['Yield Percent', kpis.production.yieldPercent],
        [''],
        ['Dispatch Metrics'],
        ['Total Gatepasses', kpis.dispatch.totalGatepasses],
        ['Delivered', kpis.dispatch.delivered],
        ['Pending', kpis.dispatch.pending],
        ['In Transit', kpis.dispatch.inTransit],
        ['Fulfillment Rate', kpis.dispatch.fulfillmentRate],
        [''],
        ['Quality Metrics'],
        ['Total Submissions', kpis.quality.totalSubmissions],
        ['OK Count', kpis.quality.okCount],
        ['NOK Count', kpis.quality.nokCount],
        ['Compliance Rate', kpis.quality.complianceRate],
        [''],
        ['Cash Metrics'],
        ['Total Received', formatCurrencyForExcel(kpis.cash.totalReceived)],
        ['Total Expenses', formatCurrencyForExcel(kpis.cash.totalExpenses)],
        ['Net Cash Flow', formatCurrencyForExcel(kpis.cash.totalReceived - kpis.cash.totalExpenses)],
      ];
      const paymentSheet = [
        ['Payment Methods'],
        ['Method', 'Count', 'Amount'],
        ...kpis.payments.map(p => [p.method, p.count, formatCurrencyForExcel(p.amount)])
      ];
      const alertSheet = alertsData ? [
        ['Active Alerts'],
        ['Severity', 'Type', 'Title', 'Description'],
        ...alertsData.alerts.map(a => [a.severity, a.type, a.title, a.description])
      ] : [['No alerts']];
      await exportToExcel({
        filename: `mis-dashboard-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [
          { name: 'KPIs', data: kpiSheet },
          { name: 'Payment Methods', data: paymentSheet },
          { name: 'Alerts', data: alertSheet },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="mis-dashboard-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/?tab=overview')} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Executive Dashboard</h1>
            <p className="text-sm text-muted-foreground">Key performance indicators and business health overview</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isExporting || kpiLoading} data-testid="button-export-excel">
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[140px]" data-testid="select-period">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList data-testid="tabs-dashboard">
          <TabsTrigger value="overview" data-testid="tab-overview" className="gap-1.5">
            <Activity className="w-3.5 h-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts" className="gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Alerts
            {alertsData && alertsData.totalAlerts > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                {alertsData.totalAlerts}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ===== OVERVIEW TAB ===== */}
        <TabsContent value="overview" className="space-y-4">
          {/* Critical issues banner */}
          {!kpiLoading && criticalIssues.length > 0 && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-4 py-3">
              <AlertOctagon className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {criticalIssues.length} Critical Issue{criticalIssues.length > 1 ? 's' : ''} Require Attention:
                </p>
                <p className="text-xs text-red-600 dark:text-red-400/80 mt-0.5">
                  {criticalIssues.join(' · ')}
                </p>
              </div>
            </div>
          )}

          {/* KPI Cards Row 1 */}
          {kpiLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-4 w-24 mb-2" /><Skeleton className="h-8 w-20" /></CardContent></Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard
                  title="Total Revenue"
                  value={formatCurrency(totalRevenue)}
                  line1={`${kpis?.sales.totalInvoices || 0} invoices`}
                  status={revenueStatus}
                />
                <KPICard
                  title="Collection Rate"
                  value={`${collectionRate.toFixed(1)}%`}
                  line1={`${formatCurrency(kpis?.sales.totalReceived || 0)} collected`}
                  line2={collectionStatus !== 'HEALTHY' ? `${formatCurrency(kpis?.sales.totalPending || 0)} uncollected` : undefined}
                  status={collectionStatus}
                />
                <KPICard
                  title="Pending Payments"
                  value={formatCurrency(totalPending)}
                  line1="Outstanding recv."
                  line2={totalRevenue > 0 ? `${pendingAsPercentOfRevenue}% of revenue` : undefined}
                  status={pendingStatus}
                />
                <KPICard
                  title="Production Output"
                  value={(kpis?.production.totalProduced || 0).toLocaleString()}
                  line1={`${kpis?.production.totalEntries || 0} entries`}
                  line2={productionStatus === 'NO DATA' ? 'No data logged' : undefined}
                  status={productionStatus}
                />
              </div>

              {/* KPI Cards Row 2 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <KPICard
                  title="Production Yield"
                  value={`${yieldRate.toFixed(0)}%`}
                  line1={`${kpis?.production.totalRejected || 0} rejected`}
                  status={yieldStatus}
                />
                <KPICard
                  title="Dispatches"
                  value={String(totalDispatches)}
                  line1={`${totalDelivered} delivered`}
                  line2={trackingGap > 0 ? `${trackingGap} in transit` : undefined}
                  status={dispatchStatus}
                />
                <KPICard
                  title="Delivery Rate"
                  value={`${deliveryRate.toFixed(1)}%`}
                  line1={`${inTransit} in transit`}
                  line2={deliveryStatus === 'CRITICAL' ? `${trackingGap} untracked` : undefined}
                  status={deliveryStatus}
                />
                <KPICard
                  title="Quality Compliance"
                  value={`${qualityRate.toFixed(0)}%`}
                  line1={`${kpis?.quality.nokCount || 0} issues`}
                  status={qualityStatus}
                />
              </div>

              {/* Cash Position + Payment Methods */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Cash Position */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Cash Position</CardTitle>
                    <CardDescription className="text-xs">Period summary — Last {period} days</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {kpis?.cash.totalReceived === 0 && kpis?.cash.totalExpenses === 0 && (
                      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-md px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Cash register data shows ₹0 for this period — verify data source or date filter
                        </p>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1.5 border-b">
                      <span className="text-sm text-muted-foreground">Total Received</span>
                      <div className="flex items-center gap-2">
                        {kpis?.cash.totalReceived === 0 && <span className="text-xs text-muted-foreground italic">No data</span>}
                        <span className={`font-medium text-sm ${kpis?.cash.totalReceived === 0 ? 'text-muted-foreground' : 'text-green-600'}`}>
                          {formatCurrency(kpis?.cash.totalReceived || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b">
                      <span className="text-sm text-muted-foreground">Total Expenses</span>
                      <div className="flex items-center gap-2">
                        {kpis?.cash.totalExpenses === 0 && <span className="text-xs text-muted-foreground italic">No data</span>}
                        <span className={`font-medium text-sm ${kpis?.cash.totalExpenses === 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
                          {formatCurrency(kpis?.cash.totalExpenses || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-sm font-medium">Net Cash Flow</span>
                      <div className="flex items-center gap-2">
                        {kpis?.cash.totalReceived === 0 && <span className="text-xs text-muted-foreground italic">No data</span>}
                        <span className={`font-semibold text-sm ${
                          (kpis?.cash.totalReceived || 0) - (kpis?.cash.totalExpenses || 0) >= 0
                            ? 'text-green-600'
                            : 'text-destructive'
                        }`}>
                          {formatCurrency((kpis?.cash.totalReceived || 0) - (kpis?.cash.totalExpenses || 0))}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Methods */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Payment Methods</CardTitle>
                    <CardDescription className="text-xs">Collections by method — Last {period} days</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {kpis?.payments && kpis.payments.length > 0 ? (
                      <>
                        {kpis.payments.map((p, idx) => {
                          const pct = paymentMaxBar > 0 ? Math.round((p.amount / paymentMaxBar) * 100) : 0;
                          const totalPct = paymentTotal > 0 ? Math.round((p.amount / paymentTotal) * 100) : 0;
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="text-sm font-medium">{p.method || 'Unknown'}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{p.count} payments</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-semibold">{formatCurrency(p.amount)}</span>
                                  <span className="text-xs text-muted-foreground ml-1">{totalPct}%</span>
                                </div>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${barColors[idx % barColors.length]}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                        <div className="pt-1 border-t flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total Collected</span>
                          <span className="text-sm font-semibold">{formatCurrency(paymentTotal)}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-sm">No payment data available for this period</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Receivables Risk Analysis */}
              {totalRevenue > 0 && (
                <Card className="border-muted">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <CardTitle className="text-base">Receivables Risk Analysis</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      {formatCurrency(totalPending)} outstanding — {pendingAsPercentOfRevenue > 80 ? 'requires immediate follow-up' : 'monitor closely'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* High Risk */}
                      <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 p-4 space-y-2">
                        <p className="text-xs text-muted-foreground">Invoiced but Uncollected</p>
                        <p className="text-2xl font-bold text-red-700 dark:text-red-400">{formatCurrency(totalPending)}</p>
                        <p className="text-xs text-muted-foreground">of total revenue</p>
                        <div className="pt-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300 uppercase tracking-wide">HIGH RISK</span>
                        </div>
                        <div className="h-1.5 bg-red-200 dark:bg-red-900 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(pendingAsPercentOfRevenue, 100)}%` }} />
                        </div>
                      </div>

                      {/* Received */}
                      <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20 p-4 space-y-2">
                        <p className="text-xs text-muted-foreground">Collected (Payments)</p>
                        <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(paymentTotal || kpis.sales.totalReceived)}</p>
                        <p className="text-xs text-muted-foreground">of total revenue</p>
                        <div className="pt-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300 uppercase tracking-wide">RECEIVED</span>
                        </div>
                        <div className="h-1.5 bg-green-200 dark:bg-green-900 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(totalRevenue > 0 ? Math.round(((paymentTotal || kpis.sales.totalReceived) / totalRevenue) * 100) : 0, 100)}%` }} />
                        </div>
                      </div>

                      {/* Gap */}
                      <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-4 space-y-2">
                        <p className="text-xs text-muted-foreground">Gap (Invoice vs Collection)</p>
                        <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(Math.abs(totalPending - (paymentTotal || 0)))}</p>
                        <p className="text-xs text-muted-foreground">of total revenue</p>
                        <div className="pt-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-300 uppercase tracking-wide">UNRESOLVED</span>
                        </div>
                        <div className="h-1.5 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${totalRevenue > 0 ? Math.min(Math.round((Math.abs(totalPending - (paymentTotal || 0)) / totalRevenue) * 100), 100) : 0}%` }} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Delivery Tracking Discrepancy */}
              {totalDispatches > 0 && trackingGap > 0 && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/30 dark:bg-amber-950/10 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="font-semibold text-sm text-amber-800 dark:text-amber-300">Delivery Tracking Discrepancy</span>
                  </div>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {totalDispatches} units dispatched but {totalDelivered} delivered recorded. Likely a tracking/system gap, not actual non-delivery.
                  </p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Dispatched', value: `${totalDispatches} units` },
                      { label: 'Delivered (recorded)', value: `${totalDelivered} units`, dim: totalDelivered === 0 },
                      { label: 'In Transit (recorded)', value: `${inTransit} units`, dim: inTransit === 0 },
                      { label: 'Tracking Gap', value: `${trackingGap} units`, bold: true },
                    ].map((stat) => (
                      <div key={stat.label}>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className={`text-base font-semibold ${stat.bold ? 'text-amber-700 dark:text-amber-400' : stat.dim ? 'text-muted-foreground' : ''}`}>
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analytics Navigation */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { href: '/mis/production', label: 'Production Analytics', icon: BarChart3 },
                  { href: '/mis/inventory', label: 'Inventory Intelligence', icon: Package },
                  { href: '/mis/sales', label: 'Sales Analysis', icon: TrendingUp },
                  { href: '/mis/delivery', label: 'Delivery Performance', icon: Truck },
                  { href: '/mis/cash', label: 'Cash Analytics', icon: Wallet },
                ].map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href}>
                    <Button variant="outline" size="sm" data-testid={`link-${label.toLowerCase().replace(/ /g, '-')}`}>
                      <Icon className="w-3.5 h-3.5 mr-1.5" />
                      {label}
                    </Button>
                  </Link>
                ))}
              </div>

              {/* Priority Actions */}
              {priorityActions.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">Priority Actions</h2>
                    <span className="text-sm text-muted-foreground">· Based on current period data</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {priorityActions.map((action, idx) => (
                      <PriorityCard
                        key={idx}
                        level={action.level}
                        title={action.title}
                        description={action.description}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ===== ALERTS TAB ===== */}
        <TabsContent value="alerts" className="space-y-4">
          {alertsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : alertsData && alertsData.alerts.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Card className="bg-destructive/5 border-destructive/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-destructive">{alertsData.bySeverity.high}</p>
                    <p className="text-sm text-muted-foreground">High Priority</p>
                  </CardContent>
                </Card>
                <Card className="bg-amber-500/5 border-amber-500/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-amber-600">{alertsData.bySeverity.medium}</p>
                    <p className="text-sm text-muted-foreground">Medium Priority</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-500/5 border-blue-500/20">
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{alertsData.bySeverity.low}</p>
                    <p className="text-sm text-muted-foreground">Low Priority</p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Exception Alerts</CardTitle>
                  <CardDescription>Items requiring attention, sorted by priority</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-3">
                      {alertsData.alerts.map((alert, idx) => (
                        <AlertItem key={idx} alert={alert} />
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-4" />
                <h3 className="text-lg font-medium">All Clear!</h3>
                <p className="text-muted-foreground">No alerts or exceptions to report</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
