import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Activity, CheckCircle, AlertTriangle, XCircle, Package, ArrowUpCircle, ArrowDownCircle, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportToExcel } from "@/lib/excel-export";
import { format } from "date-fns";

interface EmptyBottlesPeriod {
  totalOpening: number;
  totalProduced: number;
  totalUsed: number;
  totalPending: number;
  entriesWithData: number;
}

interface EmptyBottlesTotals extends EmptyBottlesPeriod {
  utilizationRate: number;
  netChange: number;
}

interface PeriodAnalytics {
  period: string;
  avgVariance: number;
  avgEfficiency: number;
  avgYield: number;
  reconciliationCount: number;
  goodCount: number;
  warningCount: number;
  criticalCount: number;
  periodIndex: number;
  emptyBottles?: EmptyBottlesPeriod;
}

interface TopMaterial {
  materialId: string;
  materialName: string;
  avgVariance: number;
  totalVariance: number;
  occurrences: number;
}

interface AnalyticsResponse {
  analytics: PeriodAnalytics[];
  totals: {
    totalReconciliations: number;
    avgVariance: number;
    avgEfficiency: number;
    avgYield: number;
    totalGood: number;
    totalWarning: number;
    totalCritical: number;
    emptyBottles?: EmptyBottlesTotals;
  };
  topMaterials: TopMaterial[];
  year: number;
  period: string;
}

export default function VarianceAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [isExporting, setIsExporting] = useState(false);

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery<AnalyticsResponse>({
    queryKey: ['/api/analytics/variance', selectedPeriod, selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/variance?period=${selectedPeriod}&year=${selectedYear}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      return res.json();
    },
  });

  const analytics = analyticsData?.analytics || [];
  const totals = analyticsData?.totals;
  const topMaterials = analyticsData?.topMaterials || [];

  // Generate year options (current year and 2 years back)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  const handleExportExcel = async () => {
    if (!analyticsData) return;
    setIsExporting(true);
    try {
      const summarySheet = [
        ['Variance Analytics Report'],
        ['Period', selectedPeriod],
        ['Year', selectedYear],
        ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
        [''],
        ['Summary'],
        ['Total Reconciliations', totals?.totalReconciliations || 0],
        ['Average Variance (%)', totals?.avgVariance?.toFixed(2) || 0],
        ['Average Efficiency (%)', totals?.avgEfficiency?.toFixed(2) || 0],
        ['Average Yield (%)', totals?.avgYield?.toFixed(2) || 0],
        ['Good Status', totals?.totalGood || 0],
        ['Warning Status', totals?.totalWarning || 0],
        ['Critical Status', totals?.totalCritical || 0],
      ];

      const periodSheet = [
        ['Period Analysis'],
        ['Period', 'Avg Variance (%)', 'Avg Efficiency (%)', 'Avg Yield (%)', 'Reconciliations', 'Good', 'Warning', 'Critical'],
        ...analytics.map(a => [
          a.period,
          a.avgVariance?.toFixed(2) || 0,
          a.avgEfficiency?.toFixed(2) || 0,
          a.avgYield?.toFixed(2) || 0,
          a.reconciliationCount,
          a.goodCount,
          a.warningCount,
          a.criticalCount
        ])
      ];

      const materialsSheet = [
        ['Top Materials by Variance'],
        ['Material Name', 'Avg Variance (%)', 'Total Variance', 'Occurrences'],
        ...topMaterials.map(m => [
          m.materialName,
          m.avgVariance?.toFixed(2) || 0,
          m.totalVariance?.toFixed(2) || 0,
          m.occurrences
        ])
      ];

      await exportToExcel({
        filename: `variance-analytics-${selectedYear}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [
          { name: 'Summary', data: summarySheet },
          { name: 'Period Analysis', data: periodSheet },
          { name: 'Top Materials', data: materialsSheet },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Variance Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Analyze production variance trends and efficiency metrics over time
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={isExporting || isLoading}
            data-testid="button-export-excel"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Period Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period">Time Period</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger id="period" data-testid="select-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly" data-testid="period-option-weekly">Weekly</SelectItem>
                    <SelectItem value="monthly" data-testid="period-option-monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly" data-testid="period-option-quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly" data-testid="period-option-yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger id="year" data-testid="select-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(year => (
                      <SelectItem key={year} value={year.toString()} data-testid={`year-option-${year}`}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center h-64" data-testid="loading-indicator">
            <div className="text-muted-foreground">Loading analytics...</div>
          </div>
        ) : analytics.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <p>No data available for the selected period.</p>
                <p className="text-sm mt-2">Try selecting a different time range.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reconciliations</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="total-reconciliations">{totals?.totalReconciliations || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} analysis
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Variance</CardTitle>
                  {totals && totals.avgVariance <= 2 ? (
                    <TrendingDown className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-red-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="avg-variance">
                    {totals?.avgVariance.toFixed(2)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totals && totals.avgVariance <= 2 ? "Within acceptable range" : "Needs attention"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Efficiency</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="avg-efficiency">
                    {totals?.avgEfficiency.toFixed(2)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Production efficiency
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Yield</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="avg-yield">
                    {totals?.avgYield.toFixed(2)}%
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Production yield
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Status Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Good</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600" data-testid="total-good">
                    {totals?.totalGood || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Variance ≤ 2%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Warning</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600" data-testid="total-warning">
                    {totals?.totalWarning || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Variance 2-5%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Critical</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600" data-testid="total-critical">
                    {totals?.totalCritical || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Variance &gt; 5%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Empty Bottles Tracking Section */}
            {totals?.emptyBottles && totals.emptyBottles.entriesWithData > 0 && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Empty Bottles Tracking
                    </CardTitle>
                    <CardDescription>
                      Overview of empty bottle production and utilization across {totals.emptyBottles.entriesWithData} production entries
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold" data-testid="bottles-produced">
                          {totals.emptyBottles.totalProduced.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Total Produced</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold" data-testid="bottles-used">
                          {totals.emptyBottles.totalUsed.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Total Used</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className={`text-2xl font-bold ${totals.emptyBottles.netChange >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="bottles-net-change">
                          {totals.emptyBottles.netChange >= 0 ? '+' : ''}{totals.emptyBottles.netChange.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">Net Change</p>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold" data-testid="bottles-utilization">
                          {totals.emptyBottles.utilizationRate.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">Utilization Rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Empty Bottles Trend by Period */}
                <Card>
                  <CardHeader>
                    <CardTitle>Empty Bottles Trend</CardTitle>
                    <CardDescription>Produced vs Used bottles over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.filter(a => a.emptyBottles && a.emptyBottles.entriesWithData > 0)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => value.toLocaleString()}
                        />
                        <Legend />
                        <Bar dataKey="emptyBottles.totalProduced" fill="#10b981" name="Produced" />
                        <Bar dataKey="emptyBottles.totalUsed" fill="#3b82f6" name="Used" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Empty Bottles Period Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Empty Bottles by Period</CardTitle>
                    <CardDescription>Detailed breakdown of empty bottle tracking</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead className="text-right">Opening</TableHead>
                          <TableHead className="text-right">Produced</TableHead>
                          <TableHead className="text-right">Used</TableHead>
                          <TableHead className="text-right">Pending</TableHead>
                          <TableHead className="text-right">Net Change</TableHead>
                          <TableHead className="text-right">Entries</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics
                          .filter(a => a.emptyBottles && a.emptyBottles.entriesWithData > 0)
                          .map(a => {
                            const netChange = (a.emptyBottles?.totalProduced || 0) - (a.emptyBottles?.totalUsed || 0);
                            return (
                              <TableRow key={a.period}>
                                <TableCell className="font-medium">{a.period}</TableCell>
                                <TableCell className="text-right">{a.emptyBottles?.totalOpening.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-green-600">+{a.emptyBottles?.totalProduced.toLocaleString()}</TableCell>
                                <TableCell className="text-right text-red-600">-{a.emptyBottles?.totalUsed.toLocaleString()}</TableCell>
                                <TableCell className="text-right font-medium">{a.emptyBottles?.totalPending.toLocaleString()}</TableCell>
                                <TableCell className={`text-right ${netChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {netChange >= 0 ? <ArrowUpCircle className="inline h-4 w-4 mr-1" /> : <ArrowDownCircle className="inline h-4 w-4 mr-1" />}
                                  {netChange >= 0 ? '+' : ''}{netChange.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-right">{a.emptyBottles?.entriesWithData}</TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Variance Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Variance Trend</CardTitle>
                <CardDescription>Average variance percentage over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avgVariance" stroke="#ef4444" name="Avg Variance %" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Efficiency & Yield Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Efficiency & Yield Trends</CardTitle>
                <CardDescription>Production performance metrics over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avgEfficiency" stroke="#3b82f6" name="Efficiency %" strokeWidth={2} />
                    <Line type="monotone" dataKey="avgYield" stroke="#10b981" name="Yield %" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Status Distribution</CardTitle>
                <CardDescription>Good, Warning, and Critical reconciliations by period</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="goodCount" fill="#10b981" name="Good" stackId="a" />
                    <Bar dataKey="warningCount" fill="#f59e0b" name="Warning" stackId="a" />
                    <Bar dataKey="criticalCount" fill="#ef4444" name="Critical" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Materials with Highest Variance */}
            {topMaterials.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Materials with Highest Variance</CardTitle>
                  <CardDescription>Materials requiring attention for improved accuracy</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topMaterials} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="materialName" type="category" width={150} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgVariance" fill="#ef4444" name="Avg Variance" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
