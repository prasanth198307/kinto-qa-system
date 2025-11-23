import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { IndianRupee, AlertCircle, Eye, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DataTablePagination } from "@/components/DataTablePagination";
import { PaginationMeta } from "@shared/schema";

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string | Date;
  buyerName: string;
  totalAmount: number;
}

interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentDate: string | Date;
  recordStatus: number;
}

interface InvoiceWithBalance extends Invoice {
  totalPaid: number;
  outstandingBalance: number;
  isOverpaid: boolean;
}

interface PendingPaymentsDashboardProps {
  customerFilter?: string | null;
}

export default function PendingPaymentsDashboard({ customerFilter }: PendingPaymentsDashboardProps) {
  const { toast } = useToast();
  const search = useSearch();
  const [, setLocation] = useLocation();
  
  // Extract pagination params from URL
  const params = new URLSearchParams(search);
  const currentPage = parseInt(params.get('page') || '1');
  const currentPageSize = parseInt(params.get('pageSize') || '25');
  
  // Build query params including customer filter
  const queryParams = new URLSearchParams({
    page: currentPage.toString(),
    pageSize: currentPageSize.toString(),
  });
  if (customerFilter) {
    queryParams.set('customer', customerFilter);
  }
  
  // Fetch pending payments with pagination
  const { data: pendingPaymentsData, isLoading } = useQuery<{ data: InvoiceWithBalance[], meta: PaginationMeta & { aggregateStats: { totalOutstanding: number, totalCount: number } } }>({
    queryKey: ['/api/pending-payments', currentPage, currentPageSize, customerFilter],
    queryFn: async () => {
      const response = await fetch(`/api/pending-payments?${queryParams}`);
      if (!response.ok) throw new Error('Failed to fetch pending payments');
      return response.json();
    },
  });

  const writeOffMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return await apiRequest('POST', '/api/invoice-payments/write-off', {
        invoiceId,
        remarks: 'Outstanding balance written off from Pending Payments dashboard',
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Payment Written Off",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Write-off Failed",
        description: error.message || "Failed to write off payment",
        variant: "destructive",
      });
    },
  });
  
  // Pagination handlers - preserve existing query params
  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(search);
    newParams.set('page', newPage.toString());
    if (!newParams.has('pageSize')) {
      newParams.set('pageSize', currentPageSize.toString());
    }
    setLocation(`?${newParams.toString()}`);
  };
  
  const handlePageSizeChange = (newPageSize: number) => {
    const newParams = new URLSearchParams(search);
    newParams.set('page', '1');
    newParams.set('pageSize', newPageSize.toString());
    setLocation(`?${newParams.toString()}`);
  };

  // Extract data from paginated response
  const pendingInvoices = pendingPaymentsData?.data || [];
  const paginationMeta = pendingPaymentsData?.meta;
  const totalOutstanding = paginationMeta?.aggregateStats?.totalOutstanding || 0;
  const totalPendingCount = paginationMeta?.aggregateStats?.totalCount || 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <IndianRupee className="w-5 h-5" />
                Pending Payments
              </CardTitle>
              <CardDescription>Invoice-wise outstanding payments</CardDescription>
            </div>
            <div className="text-right">
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-8 w-40" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="w-5 h-5" />
              Pending Payments
            </CardTitle>
            <CardDescription>
              {customerFilter 
                ? `${totalPendingCount} invoice${totalPendingCount !== 1 ? 's' : ''} with outstanding payments for ${customerFilter}`
                : `${totalPendingCount} invoice${totalPendingCount !== 1 ? 's' : ''} with outstanding payments`
              }
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground" data-testid="text-total-outstanding-label">Total Outstanding</p>
            <p className="text-2xl font-bold text-destructive" data-testid="text-total-outstanding-amount">
              ₹{(totalOutstanding / 100).toFixed(2)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {pendingInvoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No pending payments</p>
            <p className="text-sm">All invoices are fully paid</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvoices.map((invoice) => {
                  const percentagePaid = (invoice.totalPaid / invoice.totalAmount) * 100;
                  
                  return (
                    <TableRow key={invoice.id} data-testid={`row-pending-invoice-${invoice.id}`}>
                      <TableCell className="font-medium" data-testid={`text-invoice-number-${invoice.id}`}>
                        {invoice.invoiceNumber}
                      </TableCell>
                      <TableCell data-testid={`text-invoice-date-${invoice.id}`}>
                        {format(new Date(invoice.invoiceDate), "dd-MMM-yyyy")}
                      </TableCell>
                      <TableCell data-testid={`text-customer-${invoice.id}`}>
                        {invoice.buyerName}
                      </TableCell>
                      <TableCell className="text-right" data-testid={`text-total-${invoice.id}`}>
                        ₹{(invoice.totalAmount / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-green-600" data-testid={`text-paid-${invoice.id}`}>
                        ₹{(invoice.totalPaid / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-destructive" data-testid={`text-outstanding-${invoice.id}`}>
                        ₹{(invoice.outstandingBalance / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={percentagePaid > 0 ? "default" : "destructive"}
                          data-testid={`badge-status-${invoice.id}`}
                        >
                          {percentagePaid > 0 ? `${percentagePaid.toFixed(0)}% Paid` : 'Unpaid'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/invoice/${invoice.id}`}>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              data-testid={`button-view-invoice-${invoice.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={writeOffMutation.isPending}
                                data-testid={`button-write-off-${invoice.id}`}
                                title="Write off outstanding balance"
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Write Off Outstanding Balance?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will create a write-off payment entry for{" "}
                                  <strong>₹{(invoice.outstandingBalance / 100).toFixed(2)}</strong>{" "}
                                  on invoice <strong>{invoice.invoiceNumber}</strong> from{" "}
                                  <strong>{invoice.buyerName}</strong>.
                                  <br /><br />
                                  This action cannot be undone. The invoice will be marked as fully paid.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel 
                                  data-testid="button-cancel-write-off"
                                  disabled={writeOffMutation.isPending}
                                >
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => writeOffMutation.mutate(invoice.id)}
                                  data-testid="button-confirm-write-off"
                                  className="bg-destructive hover:bg-destructive/90"
                                  disabled={writeOffMutation.isPending}
                                >
                                  {writeOffMutation.isPending ? 'Writing off...' : 'Confirm Write-off'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        
        {/* Pagination Controls */}
        {paginationMeta && pendingInvoices.length > 0 && (
          <div className="mt-4">
            <DataTablePagination
              currentPage={paginationMeta.page}
              pageSize={paginationMeta.pageSize}
              totalItems={paginationMeta.totalItems}
              totalPages={paginationMeta.totalPages}
              hasNextPage={paginationMeta.hasNextPage}
              hasPreviousPage={paginationMeta.hasPreviousPage}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
