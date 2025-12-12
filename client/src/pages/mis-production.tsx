import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Factory, TrendingUp, TrendingDown, AlertTriangle, Download } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { exportToExcel, formatDateForExcel } from "@/lib/excel-export";
import { format } from "date-fns";

interface ProductionData {
  period: number;
  dailyTrend: Array<{
    date: string;
    entries: number;
    produced: number;
    rejected: number;
    derivedUnits: number;
    yield: string;
  }>;
  byProduct: Array<{
    productName: string;
    entries: number;
    totalProduced: number;
    totalRejected: number;
    yield: string;
  }>;
  bomVariance: Array<{
    productName: string;
    reconciliationCount: number;
    avgVariance: string;
    minVariance: string;
    maxVariance: string;
  }>;
  byShift: Array<{
    shift: string;
    entries: number;
    totalProduced: number;
    totalRejected: number;
  }>;
}

export default function MISProduction() {
  const [period, setPeriod] = useState('30');
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useQuery<ProductionData>({
    queryKey: ['/api/mis/production-analytics', { period }],
  });

  const formatNumber = (n: number) => n.toLocaleString('en-IN');

  const handleExportExcel = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      const dailySheet = [
        ['Daily Production Trend'],
        ['Date', 'Entries', 'Produced', 'Rejected', 'Derived Units', 'Yield %'],
        ...data.dailyTrend.map(d => [
          formatDateForExcel(d.date),
          d.entries,
          d.produced,
          d.rejected,
          d.derivedUnits,
          d.yield
        ])
      ];

      const productSheet = [
        ['Production by Product'],
        ['Product Name', 'Entries', 'Total Produced', 'Total Rejected', 'Yield %'],
        ...data.byProduct.map(p => [
          p.productName,
          p.entries,
          p.totalProduced,
          p.totalRejected,
          p.yield
        ])
      ];

      const shiftSheet = [
        ['Production by Shift'],
        ['Shift', 'Entries', 'Total Produced', 'Total Rejected'],
        ...data.byShift.map(s => [
          `Shift ${s.shift}`,
          s.entries,
          s.totalProduced,
          s.totalRejected
        ])
      ];

      const varianceSheet = [
        ['BOM Variance Analysis'],
        ['Product Name', 'Reconciliation Count', 'Avg Variance', 'Min Variance', 'Max Variance'],
        ...data.bomVariance.map(v => [
          v.productName,
          v.reconciliationCount,
          v.avgVariance,
          v.minVariance,
          v.maxVariance
        ])
      ];

      await exportToExcel({
        filename: `mis-production-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [
          { name: 'Daily Trend', data: dailySheet },
          { name: 'By Product', data: productSheet },
          { name: 'By Shift', data: shiftSheet },
          { name: 'BOM Variance', data: varianceSheet },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="mis-production-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/mis">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Production Analytics</h1>
            <p className="text-muted-foreground">Efficiency, yield, and variance analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting || isLoading}
            data-testid="button-export-excel"
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>
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
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : data ? (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Factory className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Production</p>
                    <p className="text-2xl font-bold">
                      {formatNumber(data.byProduct.reduce((sum, p) => sum + p.totalProduced, 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Rejected</p>
                    <p className="text-2xl font-bold text-destructive">
                      {formatNumber(data.byProduct.reduce((sum, p) => sum + p.totalRejected, 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/10">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Daily Output</p>
                    <p className="text-2xl font-bold">
                      {formatNumber(Math.round(data.dailyTrend.reduce((sum, d) => sum + d.produced, 0) / (data.dailyTrend.length || 1)))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Production by Shift</CardTitle>
                <CardDescription>Output distribution across shifts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.byShift.map((shift, idx) => {
                    const total = data.byShift.reduce((sum, s) => sum + s.totalProduced, 0);
                    const percentage = total > 0 ? (shift.totalProduced / total * 100) : 0;
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">Shift {shift.shift}</Badge>
                            <span className="text-sm text-muted-foreground">{shift.entries} entries</span>
                          </div>
                          <span className="font-medium">{formatNumber(shift.totalProduced)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {data.byShift.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">No shift data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">BOM Variance Analysis</CardTitle>
                <CardDescription>Material consumption variance by product</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Avg Variance</TableHead>
                      <TableHead className="text-right">Range</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.bomVariance.map((v, idx) => {
                      const variance = parseFloat(v.avgVariance);
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{v.productName}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={variance > 5 ? 'destructive' : variance > 2 ? 'secondary' : 'outline'}>
                              {variance > 0 ? '+' : ''}{v.avgVariance}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {v.minVariance}% to {v.maxVariance}%
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {data.bomVariance.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          No variance data available
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Production by Product</CardTitle>
              <CardDescription>Top products by output volume</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Entries</TableHead>
                    <TableHead className="text-right">Produced</TableHead>
                    <TableHead className="text-right">Rejected</TableHead>
                    <TableHead className="text-right">Yield</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byProduct.map((product, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{product.productName}</TableCell>
                      <TableCell className="text-right">{product.entries}</TableCell>
                      <TableCell className="text-right">{formatNumber(product.totalProduced)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatNumber(product.totalRejected)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={parseFloat(product.yield) >= 95 ? 'default' : 'destructive'}>
                          {product.yield}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.byProduct.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                        No production data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Daily Production Trend</CardTitle>
              <CardDescription>Day-by-day production output</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Entries</TableHead>
                    <TableHead className="text-right">Produced</TableHead>
                    <TableHead className="text-right">Rejected</TableHead>
                    <TableHead className="text-right">Yield</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.dailyTrend.slice(0, 14).map((day, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">
                        {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </TableCell>
                      <TableCell className="text-right">{day.entries}</TableCell>
                      <TableCell className="text-right">{formatNumber(day.produced)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatNumber(day.rejected)}</TableCell>
                      <TableCell className="text-right">
                        <span className={parseFloat(day.yield) >= 95 ? 'text-green-600' : 'text-destructive'}>
                          {day.yield}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.dailyTrend.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                        No daily data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Failed to load production analytics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
