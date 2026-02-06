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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft,
  Filter,
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
  Printer,
  Wallet,
  Download,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";
import { exportToExcel, formatCurrencyForExcel, formatDateForExcel } from "@/lib/excel-export";
import { Skeleton } from "@/components/ui/skeleton";

interface LedgerEntry {
  type: 'invoice' | 'credit_note' | 'debit_note' | 'payment' | 'advance' | 'vendor_debit_note_adjustment';
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
  availableBalance?: number;
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
    totalAdvances: number;
    vendorDebitNoteAdjustments: number;
    currentBalance: number;
    invoiceCount: number;
    creditNoteCount: number;
    debitNoteCount: number;
    advanceCount: number;
    paymentCount: number;
  };
  ledger: LedgerEntry[];
}

interface InvoiceTransaction {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  buyerName: string;
  shipToName: string | null;
  totalAmount: number;
  effectiveTotal: number;
  totalPayments: number;
  totalDnAdjustments: number;
  totalAdvances: number;
  totalCredits: number;
  totalDebits: number;
  totalSettled: number;
  outstanding: number;
  paymentStatus: string;
  isChildVendor: boolean;
  allocations: Array<{
    id: string;
    date: string;
    amount: number;
    type: 'payment' | 'debit_note_adjustment' | 'advance_application' | 'credit_note' | 'debit_note';
    method?: string;
    reference?: string;
    bankName?: string;
    paidBy?: string;
    payerName?: string;
    advanceNumber?: string;
    noteNumber?: string;
    reason?: string;
    remarks?: string;
  }>;
}

interface InvoiceTransactionsResponse {
  vendor: { id: string; vendorName: string; vendorCode: string };
  childVendors: Array<{ id: string; vendorName: string }>;
  summary: {
    totalInvoices: number;
    totalInvoiceAmount: number;
    totalPayments: number;
    totalDnAdjustments: number;
    totalAdvances: number;
    totalCredits: number;
    totalDebits: number;
    totalOutstanding: number;
  };
  invoices: InvoiceTransaction[];
}

export default function VendorHistoryDetailPage() {
  const [, setLocation] = useLocation();
  const { vendorId } = useParams<{ vendorId: string }>();
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("ledger");
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});
  const [txnFilter, setTxnFilter] = useState("all");

  const { data, isLoading } = useQuery<VendorDetailResponse>({
    queryKey: ['/api/vendor-history', vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/vendor-history/${vendorId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch vendor details');
      return res.json();
    },
    enabled: !!vendorId,
  });

  const { data: txnData, isLoading: txnLoading } = useQuery<InvoiceTransactionsResponse>({
    queryKey: ['/api/vendor-invoice-transactions', vendorId],
    queryFn: async () => {
      const res = await fetch(`/api/vendor-invoice-transactions/${vendorId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch invoice transactions');
      return res.json();
    },
    enabled: !!vendorId && activeTab === 'transactions',
  });

  const toggleInvoiceExpanded = (invoiceId: string) => {
    setExpandedInvoices(prev => ({ ...prev, [invoiceId]: !prev[invoiceId] }));
  };

  const filteredTxnInvoices = txnData?.invoices.filter(inv => {
    if (txnFilter === 'all') return true;
    if (txnFilter === 'pending') return inv.outstanding > 0;
    if (txnFilter === 'settled') return inv.outstanding <= 0;
    return true;
  }) || [];

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
      case 'advance': return <Wallet className="h-4 w-4 text-blue-600" />;
      case 'vendor_debit_note_adjustment': return <TrendingUp className="h-4 w-4 text-purple-500" />;
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
      case 'advance':
        return <Badge variant="outline" className="text-blue-600 border-blue-200">Advance</Badge>;
      case 'vendor_debit_note_adjustment':
        return <Badge variant="outline" className="text-purple-600 border-purple-200">DN Adjustment</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const FILTER_OPTIONS = [
    { value: 'invoice', label: 'Invoices' },
    { value: 'payment', label: 'Payments' },
    { value: 'advance', label: 'Advances' },
    { value: 'credit_note', label: 'Credit Notes' },
    { value: 'debit_note', label: 'Debit Notes' },
    { value: 'vendor_debit_note_adjustment', label: 'DN Adjustments' },
  ];

  const toggleFilter = (value: string) => {
    setSelectedFilters(prev => 
      prev.includes(value) ? prev.filter(f => f !== value) : [...prev, value]
    );
  };

  const filteredLedger = data?.ledger.filter(entry => 
    selectedFilters.length === 0 || selectedFilters.includes(entry.type)
  ) || [];

  const filterLabel = selectedFilters.length === 0 
    ? 'All Transactions' 
    : selectedFilters.length === 1 
      ? FILTER_OPTIONS.find(o => o.value === selectedFilters[0])?.label || selectedFilters[0]
      : `${selectedFilters.length} types selected`;

  const hasFilters = selectedFilters.length > 0;
  const filteredSummary = hasFilters ? {
    totalInvoiced: filteredLedger.filter(e => e.type === 'invoice').reduce((sum, e) => sum + e.debit, 0),
    invoiceCount: filteredLedger.filter(e => e.type === 'invoice').length,
    totalPayments: filteredLedger.filter(e => e.type === 'payment').reduce((sum, e) => sum + e.credit, 0),
    paymentCount: filteredLedger.filter(e => e.type === 'payment').length,
    totalAdvances: filteredLedger.filter(e => e.type === 'advance').reduce((sum, e) => sum + e.credit, 0),
    advanceCount: filteredLedger.filter(e => e.type === 'advance').length,
    totalCredits: filteredLedger.filter(e => e.type === 'credit_note').reduce((sum, e) => sum + e.credit, 0),
    creditNoteCount: filteredLedger.filter(e => e.type === 'credit_note').length,
    totalDebits: filteredLedger.filter(e => e.type === 'debit_note').reduce((sum, e) => sum + e.debit, 0),
    debitNoteCount: filteredLedger.filter(e => e.type === 'debit_note').length,
    vendorDebitNoteAdjustments: filteredLedger.filter(e => e.type === 'vendor_debit_note_adjustment').reduce((sum, e) => sum + e.credit, 0),
  } : null;

  const s = filteredSummary || data?.summary;

  const handlePrint = () => {
    if (!data) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const getTypeLabel = (type: string) => {
      switch (type) {
        case 'invoice': return 'Invoice';
        case 'credit_note': return 'Credit Note';
        case 'debit_note': return 'Debit Note';
        case 'payment': return 'Payment';
        case 'advance': return 'Customer Advance';
        case 'vendor_debit_note_adjustment': return 'DN Adjustment';
        default: return type;
      }
    };
    
    const ledgerRows = filteredLedger.map(entry => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e5e5e5;">${formatDate(entry.date)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e5e5;">${getTypeLabel(entry.type)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; font-family: monospace;">${entry.reference}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e5e5;">${entry.description}${entry.reason ? `<br><small>Reason: ${entry.reason}</small>` : ''}${entry.paymentMode ? `<br><small>Mode: ${entry.paymentMode}</small>` : ''}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right; color: ${entry.debit > 0 ? '#dc2626' : '#666'};">${entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right; color: ${entry.credit > 0 ? '#16a34a' : '#666'};">${entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e5e5; text-align: right; font-weight: 600; color: ${entry.balance > 0 ? '#ea580c' : entry.balance < 0 ? '#16a34a' : '#333'};">${formatCurrency(entry.balance)}</td>
      </tr>
    `).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vendor Ledger - ${data.vendor.vendorName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #ea580c; }
          .header h1 { font-size: 24px; color: #ea580c; margin-bottom: 5px; }
          .header p { color: #666; font-size: 14px; }
          .vendor-info { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; }
          .vendor-info div { font-size: 13px; }
          .vendor-info label { color: #666; }
          .vendor-info span { font-weight: 500; }
          .summary { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { padding: 12px; border: 1px solid #e5e5e5; border-radius: 6px; text-align: center; }
          .summary-card .label { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
          .summary-card .value { font-size: 16px; font-weight: 600; }
          .summary-card .count { font-size: 11px; color: #888; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { background: #f3f4f6; padding: 10px 8px; text-align: left; font-size: 12px; font-weight: 600; border-bottom: 2px solid #e5e5e5; }
          th:nth-child(5), th:nth-child(6), th:nth-child(7) { text-align: right; }
          .footer { display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #e5e5e5; font-size: 13px; }
          .footer .balance { font-weight: 600; color: ${data.summary.currentBalance > 0 ? '#ea580c' : '#16a34a'}; }
          .print-date { text-align: right; font-size: 11px; color: #888; margin-top: 20px; }
          @media print { body { padding: 10px; } @page { margin: 1cm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>KINTO Smart Ops</h1>
          <p>Vendor Ledger Report</p>
        </div>
        
        <h2 style="font-size: 18px; margin-bottom: 15px;">${data.vendor.vendorName}</h2>
        
        <div class="vendor-info">
          <div><label>Code: </label><span>${data.vendor.vendorCode}</span></div>
          <div><label>GST: </label><span>${data.vendor.gstNumber || 'N/A'}</span></div>
          <div><label>Phone: </label><span>${data.vendor.mobileNumber}</span></div>
          <div><label>Email: </label><span>${data.vendor.email || 'N/A'}</span></div>
          <div style="grid-column: span 2;"><label>Location: </label><span>${[data.vendor.address, data.vendor.city, data.vendor.state].filter(Boolean).join(', ') || 'N/A'}</span></div>
        </div>
        
        <div class="summary">
          <div class="summary-card">
            <div class="label">Total Invoiced</div>
            <div class="value">${formatCurrency(data.summary.totalInvoiced)}</div>
            <div class="count">${data.summary.invoiceCount} invoices</div>
          </div>
          <div class="summary-card">
            <div class="label">Payments</div>
            <div class="value" style="color: #16a34a;">${formatCurrency(data.summary.totalPayments)}</div>
            <div class="count">${data.summary.paymentCount} payments</div>
          </div>
          <div class="summary-card">
            <div class="label">Advances</div>
            <div class="value" style="color: #2563eb;">${formatCurrency(data.summary.totalAdvances || 0)}</div>
            <div class="count">${data.summary.advanceCount || 0} advance(s)</div>
          </div>
          <div class="summary-card">
            <div class="label">Credit Notes</div>
            <div class="value" style="color: #16a34a;">${formatCurrency(data.summary.totalCredits)}</div>
            <div class="count">${data.summary.creditNoteCount} notes</div>
          </div>
          <div class="summary-card">
            <div class="label">Debit Notes</div>
            <div class="value" style="color: #ea580c;">${formatCurrency(data.summary.totalDebits)}</div>
            <div class="count">${data.summary.debitNoteCount} notes</div>
          </div>
          <div class="summary-card">
            <div class="label">DN Adjustments</div>
            <div class="value" style="color: #9333ea;">${formatCurrency(data.summary.vendorDebitNoteAdjustments || 0)}</div>
            <div class="count">Vendor claims</div>
          </div>
          <div class="summary-card" style="background: #fef3c7;">
            <div class="label">Current Balance</div>
            <div class="value" style="color: ${data.summary.currentBalance > 0 ? '#ea580c' : '#16a34a'};">${formatCurrency(data.summary.currentBalance)}</div>
            <div class="count">${data.summary.currentBalance > 0 ? 'Outstanding' : data.summary.currentBalance < 0 ? 'Credit Balance' : 'Settled'}</div>
          </div>
        </div>
        
        <h3 style="font-size: 14px; margin-bottom: 10px;">Transaction Ledger</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Reference</th>
              <th>Description</th>
              <th style="text-align: right;">Debit</th>
              <th style="text-align: right;">Credit</th>
              <th style="text-align: right;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${ledgerRows}
          </tbody>
        </table>
        
        <div class="footer">
          <span>Showing ${filteredLedger.length} transactions</span>
          <span>Closing Balance: <span class="balance">${formatCurrency(data.summary.currentBalance)}</span></span>
        </div>
        
        <div class="print-date">Printed on: ${new Date().toLocaleString('en-IN')}</div>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportExcel = async () => {
    if (!data) return;

    const getTypeLabel = (type: string) => {
      switch (type) {
        case 'invoice': return 'Invoice';
        case 'credit_note': return 'Credit Note';
        case 'debit_note': return 'Debit Note';
        case 'payment': return 'Payment';
        case 'advance': return 'Customer Advance';
        case 'vendor_debit_note_adjustment': return 'DN Adjustment';
        default: return type;
      }
    };

    const ledgerData = filteredLedger.map(entry => [
      formatDateForExcel(entry.date),
      getTypeLabel(entry.type),
      entry.reference,
      entry.description,
      entry.debit > 0 ? formatCurrencyForExcel(entry.debit) : '',
      entry.credit > 0 ? formatCurrencyForExcel(entry.credit) : '',
      formatCurrencyForExcel(entry.balance),
    ]);

    const summaryData = [
      ['Vendor Ledger Report'],
      [],
      ['Vendor Details'],
      ['Name', data.vendor.vendorName],
      ['Code', data.vendor.vendorCode],
      ['GST', data.vendor.gstNumber || 'N/A'],
      ['Phone', data.vendor.mobileNumber],
      ['Email', data.vendor.email || 'N/A'],
      ['Address', [data.vendor.address, data.vendor.city, data.vendor.state].filter(Boolean).join(', ') || 'N/A'],
      [],
      ['Summary'],
      ['Total Invoiced', formatCurrencyForExcel(data.summary.totalInvoiced)],
      ['Total Payments', formatCurrencyForExcel(data.summary.totalPayments)],
      ['Total Advances', formatCurrencyForExcel(data.summary.totalAdvances)],
      ['Total Credits', formatCurrencyForExcel(data.summary.totalCredits)],
      ['Total Debits', formatCurrencyForExcel(data.summary.totalDebits)],
      ['DN Adjustments', formatCurrencyForExcel(data.summary.vendorDebitNoteAdjustments || 0)],
      ['Current Balance', formatCurrencyForExcel(data.summary.currentBalance)],
      [],
      ['Transaction Ledger'],
      ['Date', 'Type', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'],
      ...ledgerData,
    ];

    const filename = `${data.vendor.vendorName.replace(/[^a-zA-Z0-9]/g, '_')}_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;

    await exportToExcel({
      filename,
      sheets: [{ name: 'Vendor Ledger', data: summaryData }],
    });
  };

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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={isLoading || !data}
            data-testid="button-export-vendor-ledger"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            disabled={isLoading || !data}
            data-testid="button-print-vendor-ledger"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Ledger
          </Button>
        </div>
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
      {hasFilters && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Showing filtered totals for: {selectedFilters.map(f => FILTER_OPTIONS.find(o => o.value === f)?.label).join(', ')}</span>
        </div>
      )}
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
                  {formatCurrency(s?.totalInvoiced || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {s?.invoiceCount} invoices
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
                  {formatCurrency(s?.totalPayments || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {s?.paymentCount} payments
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Advances</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div className="text-xl font-bold text-blue-600" data-testid="text-summary-advances">
                  {formatCurrency(s?.totalAdvances || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {s?.advanceCount || 0} advance(s)
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
                  {formatCurrency(s?.totalCredits || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {s?.creditNoteCount} notes
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
                  {formatCurrency(s?.totalDebits || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {s?.debitNoteCount} notes
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DN Adjustments</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div className="text-xl font-bold text-purple-600" data-testid="text-summary-dn-adjustments">
                  {formatCurrency(s?.vendorDebitNoteAdjustments || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Vendor claims applied
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
                {hasFilters ? (
                  <>
                    <div className="text-xl font-bold" data-testid="text-summary-balance">
                      {formatCurrency((s?.totalInvoiced || 0) + (s?.totalDebits || 0) - (s?.totalPayments || 0) - (s?.totalAdvances || 0) - (s?.totalCredits || 0) - (s?.vendorDebitNoteAdjustments || 0))}
                    </div>
                    <p className="text-xs text-muted-foreground">Filtered balance</p>
                  </>
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
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Ledger View + Invoice Transactions */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ledger" className="gap-2" data-testid="tab-ledger">
            <Calendar className="h-4 w-4" />
            Transaction Ledger
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2" data-testid="tab-transactions">
            <FileText className="h-4 w-4" />
            Invoice Transactions
          </TabsTrigger>
        </TabsList>

        {/* Ledger Tab - Existing View */}
        <TabsContent value="ledger">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 print:hidden" />
                Transaction Ledger
              </CardTitle>
              <div className="flex items-center gap-2 print:hidden">
                {selectedFilters.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFilters([])} data-testid="button-clear-filters">
                    Clear
                  </Button>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2 min-w-[180px] justify-between" data-testid="button-filter-type">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        <span className="text-sm">{filterLabel}</span>
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px] p-2" align="end">
                    <div className="space-y-1">
                      {FILTER_OPTIONS.map(option => (
                        <label
                          key={option.value}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover-elevate"
                          data-testid={`filter-option-${option.value}`}
                        >
                          <Checkbox
                            checked={selectedFilters.includes(option.value)}
                            onCheckedChange={() => toggleFilter(option.value)}
                          />
                          <span className="text-sm">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
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
        </TabsContent>

        {/* Invoice Transactions Tab - New View */}
        <TabsContent value="transactions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Transactions
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={txnFilter} onValueChange={setTxnFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-txn-filter">
                    <SelectValue placeholder="Filter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Invoices</SelectItem>
                    <SelectItem value="pending">Pending Only</SelectItem>
                    <SelectItem value="settled">Settled Only</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const allIds = filteredTxnInvoices.reduce((acc, inv) => {
                      acc[inv.invoiceId] = true;
                      return acc;
                    }, {} as Record<string, boolean>);
                    const allExpanded = filteredTxnInvoices.every(inv => expandedInvoices[inv.invoiceId]);
                    setExpandedInvoices(allExpanded ? {} : allIds);
                  }}
                  data-testid="button-expand-all"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {txnLoading ? (
                <div className="p-6 space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredTxnInvoices.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No invoices found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredTxnInvoices.map((inv) => {
                    const isExpanded = expandedInvoices[inv.invoiceId];
                    const statusIcon = inv.outstanding <= 0 
                      ? <CheckCircle className="h-4 w-4 text-green-500" />
                      : inv.totalSettled > 0 
                        ? <Clock className="h-4 w-4 text-yellow-500" /> 
                        : <AlertCircle className="h-4 w-4 text-red-500" />;
                    
                    return (
                      <div key={inv.invoiceId} data-testid={`txn-invoice-${inv.invoiceId}`}>
                        <div 
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover-elevate"
                          onClick={() => toggleInvoiceExpanded(inv.invoiceId)}
                          data-testid={`txn-row-${inv.invoiceId}`}
                        >
                          <div className="flex-shrink-0">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </div>
                          <div className="flex-shrink-0">{statusIcon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-medium text-sm">{inv.invoiceNumber}</span>
                              <span className="text-xs text-muted-foreground">{formatDate(inv.invoiceDate)}</span>
                              {inv.isChildVendor && (
                                <Badge variant="outline" className="text-xs">{inv.buyerName}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <div className="text-right">
                              <span className="text-muted-foreground">Total: </span>
                              <span className="font-medium">{formatCurrency(inv.effectiveTotal)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-muted-foreground">Settled: </span>
                              <span className="font-medium text-green-600">{formatCurrency(inv.totalSettled)}</span>
                            </div>
                            <div className="text-right min-w-[100px]">
                              <span className={`font-semibold ${inv.outstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                {inv.outstanding > 0 ? formatCurrency(inv.outstanding) : 'Settled'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {isExpanded && (
                          <div className="px-4 pb-4 pl-12">
                            {inv.allocations.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">No payments or adjustments recorded</p>
                            ) : (
                              <div className="border rounded-md overflow-hidden">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-muted/50">
                                      <TableHead className="text-xs py-2">Date</TableHead>
                                      <TableHead className="text-xs py-2">Type</TableHead>
                                      <TableHead className="text-xs py-2">Reference</TableHead>
                                      <TableHead className="text-xs py-2">Details</TableHead>
                                      <TableHead className="text-xs py-2 text-right">Amount</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {inv.allocations.map((alloc, idx) => {
                                      const getAllocBadge = () => {
                                        switch (alloc.type) {
                                          case 'payment':
                                            return <Badge variant="outline" className="text-xs text-green-600 border-green-200">Payment</Badge>;
                                          case 'debit_note_adjustment':
                                            return <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">DN Adjustment</Badge>;
                                          case 'advance_application':
                                            return <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">Advance</Badge>;
                                          case 'credit_note':
                                            return <Badge variant="outline" className="text-xs text-green-600 border-green-200">Credit Note</Badge>;
                                          case 'debit_note':
                                            return <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">Debit Note</Badge>;
                                          default:
                                            return <Badge variant="outline" className="text-xs">{alloc.type}</Badge>;
                                        }
                                      };
                                      
                                      const getDetails = () => {
                                        switch (alloc.type) {
                                          case 'payment':
                                            return (
                                              <div className="text-xs text-muted-foreground">
                                                <span>{alloc.method || 'Cash'}</span>
                                                {alloc.bankName && <span> - {alloc.bankName}</span>}
                                                {alloc.payerName && <span> (Paid by: {alloc.payerName})</span>}
                                              </div>
                                            );
                                          case 'debit_note_adjustment':
                                            return <span className="text-xs text-muted-foreground">Vendor DN: {alloc.reference}</span>;
                                          case 'advance_application':
                                            return <span className="text-xs text-muted-foreground">From: {alloc.advanceNumber}</span>;
                                          case 'credit_note':
                                            return (
                                              <div className="text-xs text-muted-foreground">
                                                {alloc.noteNumber}
                                                {alloc.reason && <span> - {alloc.reason}</span>}
                                              </div>
                                            );
                                          case 'debit_note':
                                            return (
                                              <div className="text-xs text-muted-foreground">
                                                {alloc.noteNumber}
                                                {alloc.reason && <span> - {alloc.reason}</span>}
                                              </div>
                                            );
                                          default:
                                            return null;
                                        }
                                      };

                                      const isAddition = alloc.type === 'debit_note';
                                      
                                      return (
                                        <TableRow key={`${alloc.type}-${alloc.id}-${idx}`} data-testid={`alloc-row-${alloc.id}`}>
                                          <TableCell className="text-xs py-2">{formatDate(alloc.date)}</TableCell>
                                          <TableCell className="py-2">{getAllocBadge()}</TableCell>
                                          <TableCell className="text-xs py-2 font-mono">
                                            {alloc.reference || alloc.advanceNumber || alloc.noteNumber || '-'}
                                          </TableCell>
                                          <TableCell className="py-2">{getDetails()}</TableCell>
                                          <TableCell className={`text-xs py-2 text-right font-medium ${isAddition ? 'text-orange-600' : 'text-green-600'}`}>
                                            {isAddition ? '+' : '-'}{formatCurrency(alloc.amount)}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                                <div className="border-t px-3 py-2 bg-muted/30 flex justify-between items-center text-xs">
                                  <span className="text-muted-foreground">
                                    Invoice Total: {formatCurrency(inv.totalAmount)}
                                    {inv.totalDebits > 0 && <span className="text-orange-600"> + DN {formatCurrency(inv.totalDebits)}</span>}
                                    {inv.totalCredits > 0 && <span className="text-green-600"> - CN {formatCurrency(inv.totalCredits)}</span>}
                                    {' = '}{formatCurrency(inv.effectiveTotal)}
                                  </span>
                                  <span className={`font-semibold ${inv.outstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                    Outstanding: {formatCurrency(inv.outstanding)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              
              {!txnLoading && filteredTxnInvoices.length > 0 && (
                <div className="border-t px-4 py-3 bg-muted/30">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">
                      {filteredTxnInvoices.length} invoice(s)
                    </span>
                    <div className="flex items-center gap-4 text-sm">
                      <span>
                        <span className="text-muted-foreground">Total: </span>
                        <span className="font-medium">{formatCurrency(txnData?.summary.totalInvoiceAmount || 0)}</span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Settled: </span>
                        <span className="font-medium text-green-600">
                          {formatCurrency((txnData?.summary.totalPayments || 0) + (txnData?.summary.totalDnAdjustments || 0) + (txnData?.summary.totalAdvances || 0))}
                        </span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Outstanding: </span>
                        <span className={`font-bold ${(txnData?.summary.totalOutstanding || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          {formatCurrency(txnData?.summary.totalOutstanding || 0)}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
