import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingUp, DollarSign, Users, FileSpreadsheet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface VendorAnalytic {
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  city: string | null;
  state: string | null;
  mobileNumber: string;
  primaryType: string | null;
  allTypes: string[];
  totalRevenue: number;
  totalQuantity: number;
  totalOrders: number;
  totalPaid: number;
  outstandingBalance: number;
  avgOrderValue: number;
}

interface VendorAnalyticsResponse {
  vendors: VendorAnalytic[];
  summary: {
    totalVendors: number;
    activeVendors: number;
    totalRevenue: number;
    totalOutstanding: number;
    totalOrders: number;
  };
  typeBreakdown: Array<{
    type: string;
    count: number;
    revenue: number;
  }>;
}

export default function VendorAnalytics() {
  const { toast } = useToast();

  const { data: analyticsData, isLoading } = useQuery<VendorAnalyticsResponse>({
    queryKey: ['/api/vendor-analytics'],
  });

  const formatCurrency = (amountInPaise: number) => {
    return `₹${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatQuantity = (qty: number) => {
    return qty.toLocaleString('en-IN');
  };

  // Export to Excel function
  const handleExportToExcel = async () => {
    if (!analyticsData || !analyticsData.vendors || analyticsData.vendors.length === 0) {
      toast({
        title: "No Data to Export",
        description: "There is no vendor data available to export.",
        variant: "destructive",
      });
      return;
    }

    // Dynamic import for Mac compatibility
    const XLSX = await import('xlsx');

    // Prepare data for Excel
    const excelData = analyticsData.vendors.map(vendor => ({
      'Vendor Code': vendor.vendorCode,
      'Vendor Name': vendor.vendorName,
      'Primary Type': vendor.primaryType || 'N/A',
      'City': vendor.city || 'N/A',
      'State': vendor.state || 'N/A',
      'Mobile': vendor.mobileNumber,
      'Total Orders': vendor.totalOrders,
      'Total Revenue (₹)': (vendor.totalRevenue / 100).toFixed(2),
      'Quantity Sold': vendor.totalQuantity,
      'Total Paid (₹)': (vendor.totalPaid / 100).toFixed(2),
      'Outstanding (₹)': (vendor.outstandingBalance / 100).toFixed(2),
      'Avg Order Value (₹)': (vendor.avgOrderValue / 100).toFixed(2),
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 12 }, // Vendor Code
      { wch: 25 }, // Vendor Name
      { wch: 15 }, // Primary Type
      { wch: 15 }, // City
      { wch: 15 }, // State
      { wch: 15 }, // Mobile
      { wch: 12 }, // Total Orders
      { wch: 18 }, // Total Revenue
      { wch: 15 }, // Quantity Sold
      { wch: 18 }, // Total Paid
      { wch: 18 }, // Outstanding
      { wch: 20 }, // Avg Order Value
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Vendor Analytics');

    // Generate filename
    const filename = `Vendor_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);

    toast({
      title: "Export Successful",
      description: `Vendor analytics report downloaded as ${filename}`,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold" data-testid="heading-vendor-analytics-loading">Vendor Analytics</h2>
            <p className="text-muted-foreground" data-testid="description-vendor-analytics-loading">Track vendor performance and sales</p>
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
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold" data-testid="heading-vendor-analytics">Vendor Analytics</h2>
          <p className="text-muted-foreground" data-testid="description-vendor-analytics">Track vendor performance and sales</p>
        </div>

        <Button 
          onClick={handleExportToExcel}
          disabled={!analyticsData || analyticsData.vendors.length === 0}
          variant="outline"
          className="gap-2"
          data-testid="button-export-vendor-excel"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-vendors">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="title-total-vendors">Total Vendors</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-vendors">
              {analyticsData?.summary.totalVendors || 0}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-active-vendors">
              {analyticsData?.summary.activeVendors || 0} active
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="title-total-revenue">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-vendor-total-revenue">
              {formatCurrency(analyticsData?.summary.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-total-orders">
              From {analyticsData?.summary.totalOrders || 0} orders
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-outstanding">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="title-outstanding">Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-outstanding">
              {formatCurrency(analyticsData?.summary.totalOutstanding || 0)}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-pending-payments-label">
              Pending payments
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-vendor-types">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="title-vendor-types">Vendor Types</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-vendor-types-count">
              {analyticsData?.typeBreakdown.length || 0}
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-classifications-label">
              Classifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Vendor Type Breakdown */}
      {analyticsData && analyticsData.typeBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle data-testid="title-type-breakdown">Vendor Type Breakdown</CardTitle>
            <CardDescription data-testid="description-type-breakdown">Sales by vendor classification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3" data-testid="vendor-type-breakdown">
              {analyticsData.typeBreakdown.map((type) => (
                <Card key={type.type} className="p-4" data-testid={`card-type-${type.type.toLowerCase().replace(/\s+/g, '-')}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold" data-testid={`text-type-name-${type.type.toLowerCase().replace(/\s+/g, '-')}`}>
                        {type.type}
                      </h3>
                      <p className="text-sm text-muted-foreground" data-testid={`text-type-count-${type.type.toLowerCase().replace(/\s+/g, '-')}`}>
                        {type.count} vendors
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" data-testid={`text-type-revenue-${type.type.toLowerCase().replace(/\s+/g, '-')}`}>
                        {formatCurrency(type.revenue)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vendor Table */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="title-vendor-performance">Vendor Performance</CardTitle>
          <CardDescription data-testid="description-vendor-performance">Detailed vendor analytics and payment status</CardDescription>
        </CardHeader>
        <CardContent>
          {analyticsData?.vendors && analyticsData.vendors.length > 0 ? (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-vendor-code">Code</TableHead>
                    <TableHead data-testid="header-vendor-name">Vendor Name</TableHead>
                    <TableHead data-testid="header-type">Type</TableHead>
                    <TableHead data-testid="header-location">Location</TableHead>
                    <TableHead className="text-right" data-testid="header-orders">Orders</TableHead>
                    <TableHead className="text-right" data-testid="header-vendor-revenue">Revenue</TableHead>
                    <TableHead className="text-right" data-testid="header-paid">Paid</TableHead>
                    <TableHead className="text-right" data-testid="header-vendor-outstanding">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analyticsData.vendors.map((vendor) => (
                    <TableRow key={vendor.vendorId} data-testid={`row-vendor-${vendor.vendorId}`}>
                      <TableCell className="font-medium" data-testid={`cell-code-${vendor.vendorId}`}>
                        {vendor.vendorCode}
                      </TableCell>
                      <TableCell data-testid={`cell-name-${vendor.vendorId}`}>
                        <div>
                          <div className="font-medium">{vendor.vendorName}</div>
                          <div className="text-sm text-muted-foreground">{vendor.mobileNumber}</div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`cell-type-${vendor.vendorId}`}>
                        {vendor.primaryType ? (
                          <Badge variant="secondary" data-testid={`badge-type-${vendor.vendorId}`}>{vendor.primaryType}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm" data-testid={`text-type-na-${vendor.vendorId}`}>N/A</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`cell-location-${vendor.vendorId}`}>
                        <div className="text-sm">
                          {vendor.city && <div data-testid={`text-city-${vendor.vendorId}`}>{vendor.city}</div>}
                          {vendor.state && <div className="text-muted-foreground" data-testid={`text-state-${vendor.vendorId}`}>{vendor.state}</div>}
                          {!vendor.city && !vendor.state && <span className="text-muted-foreground" data-testid={`text-location-na-${vendor.vendorId}`}>N/A</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-orders-${vendor.vendorId}`}>
                        {formatQuantity(vendor.totalOrders)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-revenue-${vendor.vendorId}`}>
                        {formatCurrency(vendor.totalRevenue)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-paid-${vendor.vendorId}`}>
                        {formatCurrency(vendor.totalPaid)}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`cell-outstanding-${vendor.vendorId}`}>
                        <span className={vendor.outstandingBalance > 0 ? "text-orange-600 font-medium" : ""}>
                          {formatCurrency(vendor.outstandingBalance)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground" data-testid="no-vendor-data">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" data-testid="icon-no-vendor-data" />
              <p className="text-lg font-medium" data-testid="text-no-vendor-title">No Vendor Data</p>
              <p className="text-sm mt-1" data-testid="text-no-vendor-message">No vendor sales data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
