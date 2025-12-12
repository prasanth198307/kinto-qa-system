import { useQuery } from "@tanstack/react-query";
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
  Activity
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

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

function KPICard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  color = 'primary'
}: { 
  title: string; 
  value: string | number; 
  subtitle?: string;
  icon: any;
  trend?: string;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
}) {
  const colorClasses = {
    primary: 'text-primary',
    success: 'text-green-600',
    warning: 'text-amber-600',
    destructive: 'text-destructive'
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-full bg-muted ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {trend && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </div>
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

export default function MISDashboard() {
  const [period, setPeriod] = useState('30');

  const { data: kpiData, isLoading: kpiLoading } = useQuery<KPIData>({
    queryKey: ['/api/mis/kpi-dashboard', period],
  });

  const { data: alertsData, isLoading: alertsLoading } = useQuery<AlertsData>({
    queryKey: ['/api/mis/alerts'],
  });

  const kpis = kpiData?.kpis;

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="mis-dashboard-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Executive Dashboard</h1>
          <p className="text-muted-foreground">Key performance indicators and business health overview</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]" data-testid="select-period">
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

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList data-testid="tabs-dashboard">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Activity className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Alerts
            {alertsData && alertsData.totalAlerts > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {alertsData.totalAlerts}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {kpiLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                  title="Total Revenue"
                  value={formatCurrency(kpis?.sales.totalRevenue || 0)}
                  subtitle={`${kpis?.sales.totalInvoices || 0} invoices`}
                  icon={DollarSign}
                  color="success"
                />
                <KPICard
                  title="Collection Rate"
                  value={`${kpis?.sales.collectionRate || 0}%`}
                  subtitle={formatCurrency(kpis?.sales.totalReceived || 0) + ' collected'}
                  icon={Wallet}
                  color={parseFloat(kpis?.sales.collectionRate || '0') >= 80 ? 'success' : 'warning'}
                />
                <KPICard
                  title="Pending Payments"
                  value={formatCurrency(kpis?.sales.totalPending || 0)}
                  subtitle="Outstanding receivables"
                  icon={Clock}
                  color={kpis?.sales.totalPending && kpis.sales.totalPending > 0 ? 'warning' : 'success'}
                />
                <KPICard
                  title="Production Output"
                  value={(kpis?.production.totalProduced || 0).toLocaleString()}
                  subtitle={`${kpis?.production.totalEntries || 0} entries`}
                  icon={Factory}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                  title="Production Yield"
                  value={`${kpis?.production.yieldPercent || 100}%`}
                  subtitle={`${kpis?.production.totalRejected || 0} rejected`}
                  icon={CheckCircle2}
                  color={parseFloat(kpis?.production.yieldPercent || '100') >= 95 ? 'success' : 'warning'}
                />
                <KPICard
                  title="Dispatches"
                  value={kpis?.dispatch.totalGatepasses || 0}
                  subtitle={`${kpis?.dispatch.delivered || 0} delivered`}
                  icon={Truck}
                />
                <KPICard
                  title="Delivery Rate"
                  value={`${kpis?.dispatch.fulfillmentRate || 0}%`}
                  subtitle={`${kpis?.dispatch.inTransit || 0} in transit`}
                  icon={TrendingUp}
                  color={parseFloat(kpis?.dispatch.fulfillmentRate || '0') >= 80 ? 'success' : 'warning'}
                />
                <KPICard
                  title="Quality Compliance"
                  value={`${kpis?.quality.complianceRate || 100}%`}
                  subtitle={`${kpis?.quality.nokCount || 0} issues`}
                  icon={kpis?.quality.nokCount && kpis.quality.nokCount > 0 ? XCircle : CheckCircle2}
                  color={parseFloat(kpis?.quality.complianceRate || '100') >= 95 ? 'success' : 'destructive'}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cash Position</CardTitle>
                    <CardDescription>Period summary</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Received</span>
                        <span className="font-medium text-green-600">{formatCurrency(kpis?.cash.totalReceived || 0)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Expenses</span>
                        <span className="font-medium text-destructive">{formatCurrency(kpis?.cash.totalExpenses || 0)}</span>
                      </div>
                      <div className="border-t pt-4 flex justify-between items-center">
                        <span className="font-medium">Net Cash Flow</span>
                        <span className={`font-bold ${(kpis?.cash.totalReceived || 0) - (kpis?.cash.totalExpenses || 0) >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                          {formatCurrency((kpis?.cash.totalReceived || 0) - (kpis?.cash.totalExpenses || 0))}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Payment Methods</CardTitle>
                    <CardDescription>Collections by method</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {kpis?.payments && kpis.payments.length > 0 ? (
                        kpis.payments.map((p, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{p.method || 'Unknown'}</Badge>
                              <span className="text-muted-foreground text-sm">{p.count} payments</span>
                            </div>
                            <span className="font-medium">{formatCurrency(p.amount)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-muted-foreground text-sm">No payment data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href="/mis/production">
                  <Button variant="outline" data-testid="link-production-analytics">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Production Analytics
                  </Button>
                </Link>
                <Link href="/mis/inventory">
                  <Button variant="outline" data-testid="link-inventory-analytics">
                    <Package className="w-4 h-4 mr-2" />
                    Inventory Intelligence
                  </Button>
                </Link>
                <Link href="/mis/sales">
                  <Button variant="outline" data-testid="link-sales-analytics">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Sales Analysis
                  </Button>
                </Link>
                <Link href="/mis/delivery">
                  <Button variant="outline" data-testid="link-delivery-analytics">
                    <Truck className="w-4 h-4 mr-2" />
                    Delivery Performance
                  </Button>
                </Link>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          {alertsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : alertsData && alertsData.alerts.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-4">
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
                  <CardTitle className="text-lg">Exception Alerts</CardTitle>
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
