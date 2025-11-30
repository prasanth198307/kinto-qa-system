import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  IndianRupee,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Receipt,
  Calendar,
  Printer
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LedgerEntry {
  type: 'invoice' | 'credit_note' | 'debit_note' | 'payment';
  id: string;
  date: string;
  reference: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  status?: string;
  reason?: string;
  paymentMode?: string;
}

interface VendorDetailResponse {
  vendor: {
    id: string;
    vendorCode: string;
    vendorName: string;
    gstNumber: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    mobileNumber: string;
    email: string | null;
  };
  summary: {
    totalInvoiced: number;
    totalCredits: number;
    totalDebits: number;
    totalPayments: number;
    currentBalance: number;
    invoiceCount: number;
    creditNoteCount: number;
    debitNoteCount: number;
    paymentCount: number;
  };
  ledger: LedgerEntry[];
}

export default function VendorHistoryDetailPage() {
  const [, setLocation] = useLocation();
  const { vendorId } = useParams<{ vendorId: string }>();
  const [filterType, setFilterType] = useState("all");

  const { data, isLoading } = useQuery<VendorDetailResponse>({
    queryKey: ['/api/vendor-history', vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/vendor-history/${vendorId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch vendor details');
      return res.json();
    },
    enabled: !!vendorId,
  });

  const formatCurrency = (amount: number) => {
    return (amount / 100).toLocaleString('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      minimumFractionDigits: 2,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'invoice': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'credit_note': return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'debit_note': return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case 'payment': return <CreditCard className="h-4 w-4 text-green-600" />;
      default: return <Receipt className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'invoice':
        return <Badge variant="outline" className="text-blue-600 border-blue-200">Invoice</Badge>;
      case 'credit_note':
        return <Badge variant="outline" className="text-green-600 border-green-200">Credit Note</Badge>;
      case 'debit_note':
        return <Badge variant="outline" className="text-orange-600 border-orange-200">Debit Note</Badge>;
      case 'payment':
        return <Badge variant="outline" className="text-emerald-600 border-emerald-200">Payment</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const filteredLedger = data?.ledger.filter(entry => 
    filterType === 'all' || entry.type === filterType
  ) || [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setLocation('/vendor-history')}
            className="print:hidden"
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold print:text-xl" data-testid="text-page-title">
              {isLoading ? <Skeleton className="h-7 w-48" /> : data?.vendor.vendorName}
            </h1>
            <p className="text-muted-foreground print:text-sm">Transaction history and ledger</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => window.print()}
          className="print:hidden"
          data-testid="button-print-vendor-ledger"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Ledger
        </Button>
      </div>

      {/* Vendor Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Vendor Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Code:</span>{' '}
                  <span className="font-medium" data-testid="text-vendor-code">{data?.vendor.vendorCode}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">GST:</span>{' '}
                  <span className="font-medium" data-testid="text-vendor-gst">{data?.vendor.gstNumber || 'N/A'}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Phone:</span>{' '}
                  <span className="font-medium" data-testid="text-vendor-phone">{data?.vendor.mobileNumber}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Email:</span>{' '}
                  <span className="font-medium" data-testid="text-vendor-email">{data?.vendor.email || 'N/A'}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="text-muted-foreground">Location:</span>{' '}
                  <span className="font-medium" data-testid="text-vendor-location">
                    {[data?.vendor.address, data?.vendor.city, data?.vendor.state].filter(Boolean).join(', ') || 'N/A'}
                  </span>
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div className="text-xl font-bold" data-testid="text-summary-invoiced">
                  {formatCurrency(data?.summary.totalInvoiced || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data?.summary.invoiceCount} invoices
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div className="text-xl font-bold text-green-600" data-testid="text-summary-payments">
                  {formatCurrency(data?.summary.totalPayments || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data?.summary.paymentCount} payments
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Notes</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div className="text-xl font-bold text-green-600" data-testid="text-summary-credits">
                  {formatCurrency(data?.summary.totalCredits || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data?.summary.creditNoteCount} notes
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Debit Notes</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div className="text-xl font-bold text-orange-600" data-testid="text-summary-debits">
                  {formatCurrency(data?.summary.totalDebits || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data?.summary.debitNoteCount} notes
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div 
                  className={`text-xl font-bold ${(data?.summary.currentBalance || 0) > 0 ? 'text-orange-600' : (data?.summary.currentBalance || 0) < 0 ? 'text-green-600' : ''}`}
                  data-testid="text-summary-balance"
                >
                  {formatCurrency(data?.summary.currentBalance || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(data?.summary.currentBalance || 0) > 0 ? 'Outstanding' : (data?.summary.currentBalance || 0) < 0 ? 'Credit Balance' : 'Settled'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ledger Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 print:hidden" />
            Transaction Ledger
          </CardTitle>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] print:hidden" data-testid="select-filter-type">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="invoice">Invoices Only</SelectItem>
              <SelectItem value="payment">Payments Only</SelectItem>
              <SelectItem value="credit_note">Credit Notes Only</SelectItem>
              <SelectItem value="debit_note">Debit Notes Only</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[110px]">Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredLedger.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLedger.map((entry, index) => (
                    <TableRow key={`${entry.type}-${entry.id}`} data-testid={`row-ledger-${index}`}>
                      <TableCell className="text-sm">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(entry.type)}
                          {getTypeBadge(entry.type)}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.reference}
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                        {entry.description}
                        {entry.reason && (
                          <span className="block text-xs">Reason: {entry.reason}</span>
                        )}
                        {entry.paymentMode && (
                          <span className="block text-xs">Mode: {entry.paymentMode}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {entry.debit > 0 ? (
                          <span className="text-red-600">{formatCurrency(entry.debit)}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {entry.credit > 0 ? (
                          <span className="text-green-600">{formatCurrency(entry.credit)}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <span className={entry.balance > 0 ? 'text-orange-600' : entry.balance < 0 ? 'text-green-600' : ''}>
                          {formatCurrency(entry.balance)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Balance Summary Footer */}
          {!isLoading && filteredLedger.length > 0 && (
            <div className="border-t px-4 py-3 bg-muted/30">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">
                  Showing {filteredLedger.length} transactions
                </span>
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">Closing Balance: </span>
                  <span 
                    className={`font-bold ${(data?.summary.currentBalance || 0) > 0 ? 'text-orange-600' : (data?.summary.currentBalance || 0) < 0 ? 'text-green-600' : ''}`}
                    data-testid="text-closing-balance"
                  >
                    {formatCurrency(data?.summary.currentBalance || 0)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
