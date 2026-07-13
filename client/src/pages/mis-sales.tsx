import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, DollarSign, TrendingUp, Users, Package, Clock, Download } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { exportToExcel, formatCurrencyForExcel, formatDateForExcel } from "@/lib/excel-export";
import { format } from "date-fns";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

interface SalesData {
  period: number;
  dailyTrend: Array<{
    date: string;
    invoiceCount: number;
    revenue: number;
    totalWithTax: number;
    collected: number;
  }>;
  topCustomers: Array<{
    buyerName: string;
    invoiceCount: number;
    totalRevenue: number;
    totalCollected: number;
    pending: number;
  }>;
  topProducts: Array<{
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    amount: number;
  }>;
  receivablesAging: Array<{
    bucket: string;
    invoiceCount: number;
    pendingAmount: number;
  }>;
}

export default function MISSales() {
  const tenantConfig = useTenantConfig();
  const formatCurrency = (paise: number): string => fmtCur(paise / 100, tenantConfig);
  const [period, setPeriod] = useState('30');
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useQuery<SalesData>({
    queryKey: ['/api/mis/sales-analytics', { period }],
  });

  const totalRevenue = data?.dailyTrend.reduce((sum, d) => sum + d.revenue, 0) || 0;
  const totalCollected = data?.dailyTrend.reduce((sum, d) => sum + d.collected, 0) || 0;
  const totalInvoices = data?.dailyTrend.reduce((sum, d) => sum + d.invoiceCount, 0) || 0;

  const handleExportExcel = async () => {
    if (!data) return;
    setIsExporting(true);
    try {
      const dailySheet = [
        ['Daily Sales Trend'],
        ['Date', 'Invoice Count', 'Revenue', 'Total with Tax', 'Collected'],
        ...data.dailyTrend.map(d => [
          formatDateForExcel(d.date),
          d.invoiceCount,
          formatCurrencyForExcel(d.revenue),
          formatCurrencyForExcel(d.totalWithTax),
          formatCurrencyForExcel(d.collected)
        ])
      ];

      const customersSheet = [
        ['Top Customers'],
        ['Buyer Name', 'Invoice Count', 'Total Revenue', 'Total Collected', 'Pending'],
        ...data.topCustomers.map(c => [
          c.buyerName,
          c.invoiceCount,
          formatCurrencyForExcel(c.totalRevenue),
          formatCurrencyForExcel(c.totalCollected),
          formatCurrencyForExcel(c.pending)
        ])
      ];

      const productsSheet = [
        ['Top Products'],
        ['Product Name', 'Total Quantity', 'Total Revenue'],
        ...data.topProducts.map(p => [
          p.productName,
          p.totalQuantity,
          formatCurrencyForExcel(p.totalRevenue)
        ])
      ];

      const paymentsSheet = [
        ['Payment Methods'],
        ['Method', 'Count', 'Amount'],
        ...data.paymentMethods.map(p => [
          p.method,
          p.count,
          formatCurrencyForExcel(p.amount)
        ])
      ];

      const agingSheet = [
        ['Receivables Aging'],
        ['Bucket', 'Invoice Count', 'Pending Amount'],
        ...data.receivablesAging.map(r => [
          r.bucket,
          r.invoiceCount,
          formatCurrencyForExcel(r.pendingAmount)
        ])
      ];

      await exportToExcel({
        filename: `mis-sales-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [
          { name: 'Daily Trend', data: dailySheet },
          { name: 'Top Customers', data: customersSheet },
          { name: 'Top Products', data: productsSheet },
          { name: 'Payment Methods', data: paymentsSheet },
          { name: 'Receivables Aging', data: agingSheet },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="mis-sales-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/mis">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Sales & Margin Analysis</h1>
            <p className="text-muted-foreground">Revenue, customers, and receivables</p>
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
          <div className="grid md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : data ? (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-green-500/10">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Collected</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalCollected)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-amber-500/10">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {formatCurrency(data.receivablesAging.reduce((sum, r) => sum + r.pendingAmount, 0))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-blue-500/10">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Invoices</p>
                    <p className="text-2xl font-bold">{totalInvoices}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Receivables Aging</CardTitle>
                <CardDescription>Outstanding payments by age</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.receivablesAging.map((bucket, idx) => {
                    const total = data.receivablesAging.reduce((sum, r) => sum + r.pendingAmount, 0);
                    const percentage = total > 0 ? (bucket.pendingAmount / total * 100) : 0;
                    const colors: Record<string, string> = {
                      '0-30 days': 'bg-green-500',
                      '31-60 days': 'bg-amber-400',
                      '61-90 days': 'bg-orange-500',
                      '90+ days': 'bg-destructive'
                    };
                    return (
                      <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{bucket.bucket}</span>
                            <Badge variant="outline">{bucket.invoiceCount} invoices</Badge>
                          </div>
                          <span className="font-medium">{formatCurrency(bucket.pendingAmount)}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${colors[bucket.bucket] || 'bg-primary'} rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {data.receivablesAging.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">No pending receivables</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Methods</CardTitle>
                <CardDescription>Collections by payment type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.paymentMethods.map((pm, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-muted/50 rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{pm.method || 'Unknown'}</Badge>
                        <span className="text-sm text-muted-foreground">{pm.count} payments</span>
                      </div>
                      <span className="font-medium">{formatCurrency(pm.amount)}</span>
                    </div>
                  ))}
                  {data.paymentMethods.length === 0 && (
                    <p className="text-muted-foreground text-sm text-center py-4">No payment data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Customers</CardTitle>
              <CardDescription>Highest revenue customers</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Invoices</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Collected</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topCustomers.map((customer, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{customer.buyerName}</TableCell>
                      <TableCell className="text-right">{customer.invoiceCount}</TableCell>
                      <TableCell className="text-right">{formatCurrency(customer.totalRevenue)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(customer.totalCollected)}</TableCell>
                      <TableCell className="text-right">
                        {customer.pending > 0 ? (
                          <span className="text-amber-600">{formatCurrency(customer.pending)}</span>
                        ) : (
                          <Badge variant="outline" className="text-green-600">Paid</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.topCustomers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                        No customer data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top Products</CardTitle>
              <CardDescription>Best selling products by revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topProducts.map((product, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{product.productName}</TableCell>
                      <TableCell className="text-right">{product.totalQuantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(product.totalRevenue)}</TableCell>
                    </TableRow>
                  ))}
                  {data.topProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                        No product data
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
            <p className="text-muted-foreground">Failed to load sales analytics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
