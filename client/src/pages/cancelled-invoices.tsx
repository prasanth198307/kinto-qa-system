import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { FileX, Search, ChevronLeft, ChevronRight, ExternalLink, Filter, X, IndianRupee, ArrowLeft, Download } from "lucide-react";
import { Link, useLocation } from "wouter";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { exportToExcel, formatCurrencyForExcel, formatDateForExcel } from "@/lib/excel-export";

interface CancelledInvoicesProps {
  showHeader?: boolean;
}

interface CancelledInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  buyerName: string;
  buyerGstin: string | null;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  cancellationDate: string;
  replacementInvoiceId: string | null;
  replacementInvoiceNumber: string | null;
}

interface PaginatedResponse {
  data: CancelledInvoice[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export default function CancelledInvoices({ showHeader = true }: CancelledInvoicesProps = {}) {
  const [, navigate] = useLocation();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [buyerNameFilter, setBuyerNameFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFilters, setAppliedFilters] = useState({
    buyerName: "",
    dateFrom: "",
    dateTo: "",
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/logout', {});
    },
    onSuccess: () => {
      window.location.href = '/auth';
    },
  });

  const { data, isLoading, isError } = useQuery<PaginatedResponse>({
    queryKey: ['/api/invoices/cancelled', page, pageSize, appliedFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (appliedFilters.buyerName) params.append('buyerName', appliedFilters.buyerName);
      if (appliedFilters.dateFrom) params.append('dateFrom', appliedFilters.dateFrom);
      if (appliedFilters.dateTo) params.append('dateTo', appliedFilters.dateTo);
      
      const res = await fetch(`/api/invoices/cancelled?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch cancelled invoices');
      return res.json();
    },
  });

  const cancelledInvoices = data?.data || [];
  const pagination = data?.pagination;

  const handleApplyFilters = () => {
    setAppliedFilters({
      buyerName: buyerNameFilter,
      dateFrom,
      dateTo,
    });
    setPage(1);
  };

  const handleClearFilters = () => {
    setBuyerNameFilter("");
    setDateFrom("");
    setDateTo("");
    setAppliedFilters({
      buyerName: "",
      dateFrom: "",
      dateTo: "",
    });
    setPage(1);
  };

  const hasActiveFilters = appliedFilters.buyerName || appliedFilters.dateFrom || appliedFilters.dateTo;
  const [isExporting, setIsExporting] = useState(false);

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(paise / 100);
  };

  const handleExportExcel = async () => {
    if (cancelledInvoices.length === 0) return;
    setIsExporting(true);
    try {
      const dataSheet = [
        ['Cancelled Invoices Report'],
        ['Generated', format(new Date(), 'yyyy-MM-dd HH:mm')],
        [''],
        ['Invoice #', 'Invoice Date', 'Buyer Name', 'Buyer GSTIN', 'Amount', 'Cancellation Date', 'Replacement Invoice #'],
        ...cancelledInvoices.map(inv => [
          inv.invoiceNumber,
          formatDateForExcel(inv.invoiceDate),
          inv.buyerName,
          inv.buyerGstin || '',
          formatCurrencyForExcel(inv.totalAmount),
          formatDateForExcel(inv.cancellationDate),
          inv.replacementInvoiceNumber || ''
        ])
      ];

      await exportToExcel({
        filename: `cancelled-invoices-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
        sheets: [{ name: 'Cancelled Invoices', data: dataSheet }],
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {showHeader && <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />}
      <div className={showHeader ? "p-4 sm:p-6 mt-16" : "p-4 sm:p-6"}>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/?tab=invoices')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {showHeader && (
            <div className="flex items-center gap-2 mb-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/production-management">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Production
                </Link>
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <span className="text-muted-foreground">/</span>
            <span>Cancelled Invoices</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileX className="h-8 w-8 text-destructive" />
            Cancelled Invoices Report
          </h1>
          <p className="text-muted-foreground mt-2">
            View history of cancelled invoices for audit trail and GST compliance
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="buyerName">Buyer Name</Label>
                <Input
                  id="buyerName"
                  data-testid="input-filter-buyer-name"
                  placeholder="Search by buyer..."
                  value={buyerNameFilter}
                  onChange={(e) => setBuyerNameFilter(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  data-testid="input-filter-date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  data-testid="input-filter-date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  onClick={handleApplyFilters}
                  data-testid="button-apply-filters"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Apply
                </Button>
                {hasActiveFilters && (
                  <Button 
                    variant="outline" 
                    onClick={handleClearFilters}
                    data-testid="button-clear-filters"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleExportExcel}
                  disabled={isExporting || isLoading || cancelledInvoices.length === 0}
                  data-testid="button-export-excel"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exporting...' : 'Export Excel'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileX className="h-5 w-5" />
              Cancelled Invoices
              {pagination && (
                <Badge variant="secondary" className="ml-2">
                  {pagination.totalItems} total
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Invoices that have been cancelled or reissued. Use this for audit purposes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : isError ? (
              <div className="text-center py-8 text-destructive">
                <FileX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Failed to load cancelled invoices</p>
              </div>
            ) : cancelledInvoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No cancelled invoices found</p>
                {hasActiveFilters && (
                  <p className="text-sm mt-2">Try adjusting your filters</p>
                )}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>GSTIN</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Cancelled On</TableHead>
                      <TableHead>Replacement</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cancelledInvoices.map((invoice) => (
                      <TableRow key={invoice.id} data-testid={`row-cancelled-invoice-${invoice.id}`}>
                        <TableCell className="font-medium">
                          <Badge variant="outline" className="text-destructive border-destructive">
                            {invoice.invoiceNumber}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>{invoice.buyerName}</TableCell>
                        <TableCell>
                          {invoice.buyerGstin ? (
                            <span className="text-xs font-mono">{invoice.buyerGstin}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="flex items-center justify-end gap-1">
                            <IndianRupee className="h-3 w-3" />
                            {formatCurrency(invoice.totalAmount).replace('₹', '')}
                          </span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.cancellationDate), 'dd MMM yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          {invoice.replacementInvoiceNumber ? (
                            <Link href={`/invoice/${invoice.replacementInvoiceId}`}>
                              <Badge 
                                variant="secondary" 
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                              >
                                {invoice.replacementInvoiceNumber}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Badge>
                            </Link>
                          ) : (
                            <span className="text-muted-foreground text-sm">No replacement</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link href={`/invoice/${invoice.id}?includeCancelled=true`}>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              data-testid={`button-view-cancelled-${invoice.id}`}
                            >
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                      {Math.min(pagination.page * pagination.pageSize, pagination.totalItems)} of{' '}
                      {pagination.totalItems} cancelled invoices
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page - 1)}
                        disabled={!pagination.hasPreviousPage}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(page + 1)}
                        disabled={!pagination.hasNextPage}
                        data-testid="button-next-page"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
