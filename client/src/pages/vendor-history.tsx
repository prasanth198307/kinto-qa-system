import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Search, 
  Users, 
  IndianRupee, 
  TrendingUp, 
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  Printer,
  Download,
  ArrowLeft,
  Layers
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToExcel, formatCurrencyForExcel, formatDateForExcel } from "@/lib/excel-export";
import { format } from "date-fns";

interface VendorSummary {
  id: string;
  vendorCode: string;
  vendorName: string;
  gstNumber: string | null;
  mobileNumber: string;
  city: string | null;
  state: string | null;
  invoiceCount: number;
  creditNoteCount: number;
  debitNoteCount: number;
  totalInvoiced: number;
  totalReceived: number;
  totalCredits: number;
  totalDebits: number;
  outstanding: number;
  lastTransactionDate: string | null;
  isGroup: boolean;
  subVendorCount: number;
}

interface VendorHistoryResponse {
  vendors: VendorSummary[];
  totals: {
    totalVendors: number;
    totalInvoiced: number;
    totalReceived: number;
    totalOutstanding: number;
    vendorsWithBalance: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export default function VendorHistoryPage() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("outstanding");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isExporting, setIsExporting] = useState(false);

  const { data, isLoading } = useQuery<VendorHistoryResponse>({
    queryKey: ['/api/vendor-history', { search, page, pageSize, sortBy, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
      });
      const res = await fetch(`/api/vendor-history?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch vendor history');
      return res.json();
    },
  });

  const formatCurrency = (amount: number) => {
    return (amount / 100).toLocaleString('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 2,
    });
  };

  const handleExportExcel = async () => {
    if (!data?.vendors.length) return;
    setIsExporting(true);
    try {
      const summarySheet = [
        ['Vendor History Report'],
        ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
        [''],
        ['Summary'],
        ['Total Vendors', data.totals.totalVendors],
        ['Total Invoiced', formatCurrencyForExcel(data.totals.totalInvoiced)],
        ['Total Received', formatCurrencyForExcel(data.totals.totalReceived)],
        ['Total Outstanding', formatCurrencyForExcel(data.totals.totalOutstanding)],
        ['Vendors with Balance', data.totals.vendorsWithBalance],
      ];

      const vendorsSheet = [
        ['Vendors'],
        ['Vendor Code', 'Vendor Name', 'GST Number', 'City', 'State', 'Invoices', 'Credit Notes', 'Debit Notes', 'Total Invoiced', 'Total Received', 'Outstanding', 'Last Transaction'],
        ...data.vendors.map(v => [
          v.vendorCode,
          v.vendorName,
          v.gstNumber || '',
          v.city || '',
          v.state || '',
          v.invoiceCount,
          v.creditNoteCount,
          v.debitNoteCount,
          formatCurrencyForExcel(v.totalInvoiced),
          formatCurrencyForExcel(v.totalReceived),
          formatCurrencyForExcel(v.outstanding),
          v.lastTransactionDate ? formatDateForExcel(v.lastTransactionDate) : ''
        ])
      ];

      await exportToExcel({
        filename: `vendor-history-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [
          { name: 'Summary', data: summarySheet },
          { name: 'Vendors', data: vendorsSheet },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleViewDetails = (vendor: VendorSummary) => {
    if (vendor.isGroup && vendor.subVendorCount > 1) {
      setLocation(`/vendor-group/${encodeURIComponent(vendor.vendorName)}`);
    } else {
      setLocation(`/vendor-history/${vendor.id}`);
    }
  };

  const navigate = (path: string) => setLocation(path);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/?tab=invoices')}
            className="print:hidden"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold print:text-xl" data-testid="text-page-title">Vendor History</h1>
            <p className="text-muted-foreground print:text-sm">View complete transaction history and balances for all vendors</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={isExporting || isLoading}
            className="print:hidden"
            data-testid="button-export-excel"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </Button>
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="print:hidden"
            data-testid="button-print-vendor-history"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-vendors">
                {data?.totals.totalVendors || 0}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {data?.totals.vendorsWithBalance || 0} with balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-invoiced">
                {formatCurrency(data?.totals.totalInvoiced || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Received</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className="text-2xl font-bold text-green-600" data-testid="text-total-received">
                {formatCurrency(data?.totals.totalReceived || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-28" />
            ) : (
              <div className="text-2xl font-bold text-orange-600" data-testid="text-total-outstanding">
                {formatCurrency(data?.totals.totalOutstanding || 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters - Hidden in Print */}
      <Card className="print:hidden">
        <CardContent className="pt-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by vendor name, GST, or code..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
                data-testid="input-vendor-search"
              />
            </div>
            <Select value={pageSize.toString()} onValueChange={(val) => setPageSize(parseInt(val))}>
              <SelectTrigger className="w-[130px]" data-testid="select-page-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="20">20 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vendor Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('vendorName')}
                      className="flex items-center gap-1 -ml-3"
                      data-testid="button-sort-name"
                    >
                      Vendor Name
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead className="text-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('invoiceCount')}
                      className="flex items-center gap-1"
                      data-testid="button-sort-invoices"
                    >
                      Invoices
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('totalInvoiced')}
                      className="flex items-center gap-1 ml-auto"
                      data-testid="button-sort-invoiced"
                    >
                      Total Invoiced
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-center">Adjustments</TableHead>
                  <TableHead className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('outstanding')}
                      className="flex items-center gap-1 ml-auto"
                      data-testid="button-sort-outstanding"
                    >
                      Outstanding
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-center">Last Transaction</TableHead>
                  <TableHead className="w-[80px] print:hidden">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : data?.vendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No vendors found
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.vendors.map((vendor) => (
                    <TableRow 
                      key={vendor.id} 
                      className="cursor-pointer hover-elevate"
                      onClick={() => handleViewDetails(vendor)}
                      data-testid={`row-vendor-${vendor.id}`}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium flex items-center gap-2" data-testid={`text-vendor-name-${vendor.id}`}>
                            {vendor.vendorName}
                            {vendor.isGroup && vendor.subVendorCount > 1 && (
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 flex items-center gap-1">
                                <Layers className="h-3 w-3" />
                                {vendor.subVendorCount} sub-dealers
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{vendor.vendorCode}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {vendor.gstNumber || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" data-testid={`badge-invoices-${vendor.id}`}>
                          {vendor.invoiceCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(vendor.totalInvoiced)}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(vendor.totalReceived)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {vendor.creditNoteCount > 0 && (
                            <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                              CN: {vendor.creditNoteCount}
                            </Badge>
                          )}
                          {vendor.debitNoteCount > 0 && (
                            <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs">
                              DN: {vendor.debitNoteCount}
                            </Badge>
                          )}
                          {vendor.creditNoteCount === 0 && vendor.debitNoteCount === 0 && !vendor.isGroup && (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${vendor.outstanding > 0 ? 'text-orange-600' : vendor.outstanding < 0 ? 'text-green-600' : ''}`}>
                          {formatCurrency(vendor.outstanding)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {formatDate(vendor.lastTransactionDate)}
                      </TableCell>
                      <TableCell className="print:hidden">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetails(vendor);
                          }}
                          data-testid={`button-view-${vendor.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination - Hidden in Print */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t print:hidden">
              <div className="text-sm text-muted-foreground">
                Showing {((data.pagination.page - 1) * data.pagination.pageSize) + 1} to{' '}
                {Math.min(data.pagination.page * data.pagination.pageSize, data.pagination.totalItems)} of{' '}
                {data.pagination.totalItems} vendors
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page >= data.pagination.totalPages}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
