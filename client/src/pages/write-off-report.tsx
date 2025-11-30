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
import { XCircle, Search, ChevronLeft, ChevronRight, Filter, X, IndianRupee, Eye, Download } from "lucide-react";
import { Link } from "wouter";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface WriteOff {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  remarks: string | null;
  recordedBy: string | null;
  recordedByName: string;
  createdAt: string;
  invoiceNumber: string;
  invoiceDate: string;
  buyerName: string;
  totalAmount: number;
}

interface PaginatedResponse {
  data: WriteOff[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  aggregateStats: {
    totalWriteOffAmount: number;
    totalCount: number;
  };
}

export default function WriteOffReport() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
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
    queryKey: ['/api/reports/write-offs', page, pageSize, appliedFilters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (appliedFilters.buyerName) params.append('buyerName', appliedFilters.buyerName);
      if (appliedFilters.dateFrom) params.append('dateFrom', appliedFilters.dateFrom);
      if (appliedFilters.dateTo) params.append('dateTo', appliedFilters.dateTo);
      
      const res = await fetch(`/api/reports/write-offs?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch write-off report');
      return res.json();
    },
  });

  const writeOffs = data?.data || [];
  const meta = data?.meta;
  const aggregateStats = data?.aggregateStats;

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

  const formatCurrency = (paise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(paise / 100);
  };

  const handleExportCSV = () => {
    if (!writeOffs.length) return;
    
    const headers = ['Invoice Number', 'Invoice Date', 'Buyer Name', 'Invoice Amount', 'Write-Off Amount', 'Write-Off Date', 'Recorded By', 'Remarks'];
    const rows = writeOffs.map(wo => [
      wo.invoiceNumber,
      format(new Date(wo.invoiceDate), 'dd/MM/yyyy'),
      wo.buyerName,
      (wo.totalAmount / 100).toFixed(2),
      (wo.amount / 100).toFixed(2),
      format(new Date(wo.paymentDate), 'dd/MM/yyyy'),
      wo.recordedByName,
      wo.remarks || '',
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `write-off-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />
      <div className="p-6 mt-16">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Link href="/" className="text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <span className="text-muted-foreground">/</span>
            <span>Write-Off Report</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <XCircle className="h-8 w-8 text-destructive" />
                Write-Off Report
              </h1>
              <p className="text-muted-foreground mt-2">
                View history of outstanding balances written off for audit trail and reconciliation
              </p>
            </div>
            {writeOffs.length > 0 && (
              <Button 
                variant="outline" 
                onClick={handleExportCSV}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            )}
          </div>
        </div>

        {aggregateStats && (
          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">Total Write-Offs</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-write-off-count">
                  {aggregateStats.totalCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Invoices with balances written off
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
                <CardTitle className="text-sm font-medium">Total Amount Written Off</CardTitle>
                <IndianRupee className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive" data-testid="text-total-write-off-amount">
                  {formatCurrency(aggregateStats.totalWriteOffAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Outstanding balances written off
                </p>
              </CardContent>
            </Card>
          </div>
        )}

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
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              Write-Off History
              {meta && (
                <Badge variant="secondary" className="ml-2">
                  {meta.total} total
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Invoices with outstanding balances that have been written off
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
                <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Failed to load write-off report</p>
              </div>
            ) : writeOffs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No write-offs found</p>
                {hasActiveFilters && (
                  <p className="text-sm mt-2">Try adjusting your filters</p>
                )}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Invoice Date</TableHead>
                        <TableHead>Buyer</TableHead>
                        <TableHead className="text-right">Invoice Amount</TableHead>
                        <TableHead className="text-right">Write-Off Amount</TableHead>
                        <TableHead>Write-Off Date</TableHead>
                        <TableHead>Recorded By</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {writeOffs.map((writeOff) => (
                        <TableRow key={writeOff.id} data-testid={`row-write-off-${writeOff.id}`}>
                          <TableCell className="font-medium">
                            <Link href={`/invoice/${writeOff.invoiceId}`}>
                              <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                                {writeOff.invoiceNumber}
                              </Badge>
                            </Link>
                          </TableCell>
                          <TableCell>
                            {format(new Date(writeOff.invoiceDate), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>{writeOff.buyerName}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(writeOff.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right text-destructive font-semibold">
                            {formatCurrency(writeOff.amount)}
                          </TableCell>
                          <TableCell>
                            {format(new Date(writeOff.paymentDate), 'dd MMM yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {writeOff.recordedByName}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={writeOff.remarks || ''}>
                            {writeOff.remarks || '-'}
                          </TableCell>
                          <TableCell>
                            <Link href={`/invoice/${writeOff.invoiceId}`}>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                data-testid={`button-view-invoice-${writeOff.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {meta && meta.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-muted-foreground">
                      Showing {((meta.page - 1) * meta.pageSize) + 1} to {Math.min(meta.page * meta.pageSize, meta.total)} of {meta.total} entries
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
                        Page {meta.page} of {meta.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
                        disabled={page >= meta.totalPages}
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
