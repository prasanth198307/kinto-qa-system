import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Package, DollarSign, ShoppingCart, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface PeriodAnalytics {
  period: string;
  revenue: number;
  quantity: number;
  invoiceCount: number;
  avgOrderValue: number;
}

interface SalesAnalytics {
  analytics: PeriodAnalytics[];
  totals: {
    totalRevenue: number;
    totalQuantity: number;
    totalInvoices: number;
    avgOrderValue: number;
  };
  year: number;
  period: string;
}

export default function SalesDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<string>("monthly");
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());

  const { data: salesData, isLoading } = useQuery<SalesAnalytics>({
    queryKey: ['/api/sales-analytics', { period: selectedPeriod, year: selectedYear }],
  });

  const formatCurrency = (amountInPaise: number) => {
    return `₹${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatQuantity = (qty: number) => {
    return qty.toLocaleString('en-IN');
  };

  // Generate year options (current year and past 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Sales Dashboard</h2>
            <p className="text-muted-foreground">Track your sales performance and revenue</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold" data-testid="heading-sales-dashboard">Sales Dashboard</h2>
          <p className="text-muted-foreground">Track your sales performance and revenue</p>
        </div>

        <div className="flex gap-3 flex-wrap">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40" data-testid="select-period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly" data-testid="option-monthly">Monthly</SelectItem>
              <SelectItem value="quarterly" data-testid="option-quarterly">Quarterly</SelectItem>
              <SelectItem value="half-yearly" data-testid="option-half-yearly">Half-Yearly</SelectItem>
              <SelectItem value="yearly" data-testid="option-yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32" data-testid="select-year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map(year => (
                <SelectItem key={year} value={year.toString()} data-testid={`option-year-${year}`}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              {formatCurrency(salesData?.totals.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Turnover for {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-quantity">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Goods Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-quantity">
              {formatQuantity(salesData?.totals.totalQuantity || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total units sold
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-invoices">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-invoices">
              {formatQuantity(salesData?.totals.totalInvoices || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total invoices generated
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-order-value">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-order-value">
              {formatCurrency(salesData?.totals.avgOrderValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Per invoice
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period-wise Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} Breakdown
          </CardTitle>
          <CardDescription>
            Detailed sales metrics for {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {salesData?.analytics && salesData.analytics.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-period">Period</TableHead>
                    <TableHead data-testid="header-revenue" className="text-right">Revenue</TableHead>
                    <TableHead data-testid="header-quantity" className="text-right">Goods Sold</TableHead>
                    <TableHead data-testid="header-orders" className="text-right">Orders</TableHead>
                    <TableHead data-testid="header-avg-value" className="text-right">Avg Order Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesData.analytics.map((period, index) => (
                    <TableRow key={index} data-testid={`row-period-${period.period}`}>
                      <TableCell className="font-medium" data-testid={`cell-period-${period.period}`}>
                        {period.period}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-revenue-${period.period}`}>
                        {formatCurrency(period.revenue)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-quantity-${period.period}`}>
                        {formatQuantity(period.quantity)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-orders-${period.period}`}>
                        {formatQuantity(period.invoiceCount)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-avg-${period.period}`}>
                        {formatCurrency(period.avgOrderValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-muted/50">
                    <TableCell data-testid="cell-total-label">Total</TableCell>
                    <TableCell className="text-right" data-testid="cell-total-revenue">
                      {formatCurrency(salesData.totals.totalRevenue)}
                    </TableCell>
                    <TableCell className="text-right" data-testid="cell-total-quantity">
                      {formatQuantity(salesData.totals.totalQuantity)}
                    </TableCell>
                    <TableCell className="text-right" data-testid="cell-total-invoices">
                      {formatQuantity(salesData.totals.totalInvoices)}
                    </TableCell>
                    <TableCell className="text-right" data-testid="cell-total-avg">
                      {formatCurrency(salesData.totals.avgOrderValue)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground" data-testid="no-sales-data">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No Sales Data</p>
              <p className="text-sm mt-1">No invoices found for {selectedYear}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
