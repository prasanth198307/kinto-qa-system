import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Activity, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

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
  };
  topMaterials: TopMaterial[];
  year: number;
  period: string;
}

export default function VarianceAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

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

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Variance Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Analyze production variance trends and efficiency metrics over time
          </p>
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
