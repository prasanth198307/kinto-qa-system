import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { usePermissions } from "@/hooks/use-permissions";
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
  AlertCircle,
  AlertTriangle,
  Users
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
  const { hasPermission } = usePermissions();
  const canViewPayments = hasPermission('payments', 'view');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("ledger");
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});
  const [txnFilter, setTxnFilter] = useState("all");
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});

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
    enabled: !!vendorId && (activeTab === 'transactions' || activeTab === 'unpaid'),
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

  // ── Unpaid tab derived data ────────────────────────────────────────────────
  const unpaidInvoices = useMemo(() =>
    (txnData?.invoices || []).filter(inv => inv.outstanding > 0)
      .sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()),
  [txnData]);

  const unpaidByCluster = useMemo(() => {
    const map = new Map<string, InvoiceTransaction[]>();
    unpaidInvoices.forEach(inv => {
      const key = inv.buyerName;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(inv);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [unpaidInvoices]);

  // Only real payments + advance applications (NOT debit note adjustments)
  const paymentsByDate = useMemo(() => {
    const map = new Map<string, { total: number; entries: Array<{ invoice: string; amount: number; method: string; ref: string }> }>();
    (txnData?.invoices || []).forEach(inv => {
      inv.allocations.filter(a => a.type === 'payment' || a.type === 'advance_application').forEach(a => {
        const dk = a.date.substring(0, 10);
        if (!map.has(dk)) map.set(dk, { total: 0, entries: [] });
        const g = map.get(dk)!;
        g.total += a.amount;
        g.entries.push({ invoice: inv.invoiceNumber, amount: a.amount, method: a.method || (a.type === 'advance_application' ? 'Advance Applied' : 'Cash'), ref: a.reference || a.advanceNumber || '' });
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [txnData]);

  // Debit note adjustments — separated out from payments
  const dnAdjByDate = useMemo(() => {
    const map = new Map<string, { total: number; entries: Array<{ invoice: string; amount: number; noteNumber: string; reason: string }> }>();
    (txnData?.invoices || []).forEach(inv => {
      inv.allocations.filter(a => a.type === 'debit_note_adjustment').forEach(a => {
        const dk = a.date.substring(0, 10);
        if (!map.has(dk)) map.set(dk, { total: 0, entries: [] });
        const g = map.get(dk)!;
        g.total += a.amount;
        g.entries.push({ invoice: inv.invoiceNumber, amount: a.amount, noteNumber: a.noteNumber || a.reference || '', reason: a.reason || a.remarks || '' });
      });
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [txnData]);

  const handleExportUnpaidExcel = async () => {
    if (!data || !txnData) return;
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'KINTO Ops';
    wb.created = new Date();

    // Fetch company info from default template
    let companyName = 'KINTO Smart Ops', companyAddress = '', companyGstin = '', companyPhone = '', companyEmail = '';
    try {
      const tmplRes = await fetch('/api/invoice-templates/default', { credentials: 'include' });
      if (tmplRes.ok) {
        const t = await tmplRes.json();
        companyName    = t.defaultSellerName    || companyName;
        companyAddress = t.defaultSellerAddress || '';
        companyGstin   = t.defaultSellerGstin   || '';
        companyPhone   = t.defaultSellerPhone   || '';
        companyEmail   = t.defaultSellerEmail   || '';
      }
    } catch (_) {}

    const NAVY = 'FF1E3A5F', BLUE = 'FF2563AA', LBLUE = 'FFD6E4F7', WHITE = 'FFFFFFFF', LGREY = 'FFF5F7FA', DGREY = 'FF555555', ORANGE = 'FFEA580C';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addHeaderBlock = (ws: any, cols: number, reportTitle: string) => {
      const merge = (n: number) => ws.mergeCells(n, 1, n, cols);
      const r1 = ws.addRow([companyName]); r1.height = 32;
      r1.getCell(1).font = { bold: true, size: 16, color: { argb: WHITE } };
      r1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
      r1.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
      merge(ws.rowCount);
      if (companyAddress) {
        const r2 = ws.addRow([companyAddress]); r2.height = 16;
        r2.getCell(1).font = { size: 9, color: { argb: WHITE } };
        r2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        r2.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
        merge(ws.rowCount);
      }
      const meta = [companyGstin ? `GSTIN: ${companyGstin}` : '', companyPhone ? `Ph: ${companyPhone}` : '', companyEmail ? `Email: ${companyEmail}` : ''].filter(Boolean).join('   |   ');
      if (meta) {
        const r3 = ws.addRow([meta]); r3.height = 14;
        r3.getCell(1).font = { size: 8, color: { argb: WHITE } };
        r3.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        r3.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
        merge(ws.rowCount);
      }
      ws.addRow([]); merge(ws.rowCount);
      const rt = ws.addRow([reportTitle]); rt.height = 22;
      rt.getCell(1).font = { bold: true, size: 12, color: { argb: WHITE } };
      rt.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
      rt.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
      merge(ws.rowCount);
      const rd = ws.addRow([`Vendor: ${data.vendor.vendorName}   |   Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`]); rd.height = 14;
      rd.getCell(1).font = { italic: true, size: 8, color: { argb: DGREY } };
      rd.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LGREY } };
      rd.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
      merge(ws.rowCount);
      ws.addRow([]); merge(ws.rowCount);
    };

    // Sheet 1 – Unpaid Invoices by Cluster
    const ws1 = wb.addWorksheet('Unpaid Invoices');
    ws1.columns = [
      { key: 'c1', width: 20 }, { key: 'c2', width: 18 }, { key: 'c3', width: 30 },
      { key: 'c4', width: 18 }, { key: 'c5', width: 18 }, { key: 'c6', width: 18 },
    ];
    addHeaderBlock(ws1, 6, 'UNPAID INVOICES — CLUSTER WISE');
    const h1 = ws1.addRow(['Invoice #', 'Date', 'Cluster / Buyer', 'Invoice Amount', 'Settled', 'Outstanding']); h1.height = 20;
    h1.eachCell(c => { c.font = { bold: true, size: 10, color: { argb: WHITE } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }; c.alignment = { vertical: 'middle', indent: 1 }; });
    [4,5,6].forEach(i => { h1.getCell(i).alignment = { vertical: 'middle', horizontal: 'right' }; });

    const grandOutstanding = txnData.summary.totalOutstanding;
    unpaidByCluster.forEach(([cluster, invs]) => {
      const clusterTotal = invs.reduce((s, i) => s + i.outstanding, 0);
      const cr = ws1.addRow([`Cluster: ${cluster}`, '', '', '', '', clusterTotal / 100]);
      cr.height = 18; ws1.mergeCells(cr.number, 1, cr.number, 3);
      cr.eachCell(c => { c.font = { bold: true, size: 10, color: { argb: NAVY } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LBLUE } }; c.alignment = { vertical: 'middle', indent: 1 }; });
      cr.getCell(6).numFmt = '₹#,##0.00'; cr.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
      invs.forEach(inv => {
        const dr = ws1.addRow([inv.invoiceNumber, new Date(inv.invoiceDate).toLocaleDateString('en-IN'), inv.buyerName, inv.effectiveTotal / 100, inv.totalSettled / 100, inv.outstanding / 100]);
        dr.height = 15; dr.eachCell(c => { c.font = { size: 9, color: { argb: DGREY } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; c.alignment = { vertical: 'middle', indent: 1 }; });
        [4,5].forEach(i => { dr.getCell(i).numFmt = '₹#,##0.00'; dr.getCell(i).alignment = { vertical: 'middle', horizontal: 'right' }; });
        dr.getCell(6).numFmt = '₹#,##0.00'; dr.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' }; dr.getCell(6).font = { bold: true, size: 9, color: { argb: ORANGE } };
      });
    });
    const gr1 = ws1.addRow(['', '', '', '', 'TOTAL OUTSTANDING', grandOutstanding / 100]); gr1.height = 22;
    gr1.eachCell(c => { c.font = { bold: true, size: 11, color: { argb: WHITE } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }; c.alignment = { vertical: 'middle', indent: 1 }; });
    gr1.getCell(6).numFmt = '₹#,##0.00'; gr1.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };

    // Sheet 2 – Payments by Date
    const ws2 = wb.addWorksheet('Payments by Date');
    ws2.columns = [
      { key: 'c1', width: 18 }, { key: 'c2', width: 26 }, { key: 'c3', width: 16 }, { key: 'c4', width: 26 }, { key: 'c5', width: 18 },
    ];
    addHeaderBlock(ws2, 5, 'PAYMENTS RECEIVED — DATE WISE');
    const h2 = ws2.addRow(['Date', 'Invoice #', 'Method / Ref', 'Details', 'Amount']); h2.height = 20;
    h2.eachCell(c => { c.font = { bold: true, size: 10, color: { argb: WHITE } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }; c.alignment = { vertical: 'middle', indent: 1 }; });
    h2.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };

    let grandPaid = 0;
    paymentsByDate.forEach(([dateKey, grp]) => {
      grandPaid += grp.total;
      const dr2 = ws2.addRow([new Date(dateKey + 'T00:00:00').toLocaleDateString('en-IN'), `${grp.entries.length} transaction(s)`, '', '', grp.total / 100]);
      dr2.height = 18; ws2.mergeCells(dr2.number, 2, dr2.number, 4);
      dr2.eachCell(c => { c.font = { bold: true, size: 10, color: { argb: NAVY } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LBLUE } }; c.alignment = { vertical: 'middle', indent: 1 }; });
      dr2.getCell(5).numFmt = '₹#,##0.00'; dr2.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
      grp.entries.forEach(e => {
        const sr = ws2.addRow(['', e.invoice, `${e.method}${e.ref ? ' / ' + e.ref : ''}`, '', e.amount / 100]);
        sr.height = 15; sr.eachCell(c => { c.font = { size: 9, color: { argb: DGREY } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }; c.alignment = { vertical: 'middle', indent: 1 }; });
        sr.getCell(5).numFmt = '₹#,##0.00'; sr.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
      });
    });
    const gr2 = ws2.addRow(['', '', '', 'TOTAL PAID', grandPaid / 100]); gr2.height = 22;
    gr2.eachCell(c => { c.font = { bold: true, size: 11, color: { argb: WHITE } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }; c.alignment = { vertical: 'middle', indent: 1 }; });
    gr2.getCell(5).numFmt = '₹#,##0.00'; gr2.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${data.vendor.vendorName.replace(/[^a-zA-Z0-9]/g, '_')}_Unpaid_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click(); URL.revokeObjectURL(url);
  };

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
    { value: 'all', label: 'All Transactions' },
    { value: 'invoice', label: 'Invoices' },
    { value: 'payment', label: 'Payments' },
    { value: 'advance', label: 'Advances' },
    { value: 'credit_note', label: 'Credit Notes' },
    { value: 'debit_note', label: 'Debit Notes' },
    { value: 'vendor_debit_note_adjustment', label: 'DN Adjustments' },
  ];

  const toggleFilter = (value: string) => {
    if (value === 'all') {
      setSelectedFilters([]);
      return;
    }
    setSelectedFilters(prev => {
      const updated = prev.includes(value) ? prev.filter(f => f !== value) : [...prev, value];
      return updated;
    });
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

  const handlePrintTransactions = () => {
    if (!data || !txnData) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const getAllocTypeLabel = (type: string) => {
      switch (type) {
        case 'payment': return 'Payment';
        case 'debit_note_adjustment': return 'DN Adjustment';
        case 'advance_application': return 'Advance';
        case 'credit_note': return 'Credit Note';
        case 'debit_note': return 'Debit Note';
        default: return type;
      }
    };

    const invoiceRows = filteredTxnInvoices.map(inv => {
      const allocRows = inv.allocations.map(alloc => {
        const isAddition = alloc.type === 'debit_note';
        const detail = alloc.type === 'payment' 
          ? `${alloc.method || 'Cash'}${alloc.bankName ? ' - ' + alloc.bankName : ''}${alloc.payerName ? ' (Paid by: ' + alloc.payerName + ')' : ''}`
          : alloc.type === 'advance_application' ? `From: ${alloc.advanceNumber || ''}`
          : alloc.type === 'debit_note_adjustment' ? `Vendor DN: ${alloc.reference || ''}`
          : `${alloc.noteNumber || ''}${alloc.reason ? ' - ' + alloc.reason : ''}`;
        return `<tr style="background: #fafafa;">
          <td style="padding: 4px 8px; font-size: 12px;">${formatDate(alloc.date)}</td>
          <td style="padding: 4px 8px; font-size: 12px;">${getAllocTypeLabel(alloc.type)}</td>
          <td style="padding: 4px 8px; font-size: 12px; font-family: monospace;">${alloc.reference || alloc.advanceNumber || alloc.noteNumber || '-'}</td>
          <td style="padding: 4px 8px; font-size: 12px;">${detail}</td>
          <td style="padding: 4px 8px; font-size: 12px; text-align: right; color: ${isAddition ? '#ea580c' : '#16a34a'};">${isAddition ? '+' : '-'}${formatCurrency(alloc.amount)}</td>
        </tr>`;
      }).join('');

      const statusColor = inv.outstanding <= 0 ? '#16a34a' : inv.totalSettled > 0 ? '#ca8a04' : '#dc2626';

      return `
        <tr style="border-top: 2px solid #e5e5e5;">
          <td style="padding: 8px; font-weight: 600; font-family: monospace;">${inv.invoiceNumber}</td>
          <td style="padding: 8px;">${formatDate(inv.invoiceDate)}</td>
          <td style="padding: 8px;">${inv.buyerName}${inv.isChildVendor ? ' (Child)' : ''}</td>
          <td style="padding: 8px; text-align: right;">${formatCurrency(inv.effectiveTotal)}</td>
          <td style="padding: 8px; text-align: right; color: #16a34a;">${formatCurrency(inv.totalSettled)}</td>
          <td style="padding: 8px; text-align: right; font-weight: 600; color: ${statusColor};">${inv.outstanding > 0 ? formatCurrency(inv.outstanding) : 'Settled'}</td>
        </tr>
        ${inv.allocations.length > 0 ? `
        <tr><td colspan="6" style="padding: 0 0 8px 30px;">
          <table style="width: calc(100% - 30px); border-collapse: collapse;">
            <tr style="background: #f3f4f6;">
              <th style="padding: 4px 8px; text-align: left; font-size: 11px;">Date</th>
              <th style="padding: 4px 8px; text-align: left; font-size: 11px;">Type</th>
              <th style="padding: 4px 8px; text-align: left; font-size: 11px;">Reference</th>
              <th style="padding: 4px 8px; text-align: left; font-size: 11px;">Details</th>
              <th style="padding: 4px 8px; text-align: right; font-size: 11px;">Amount</th>
            </tr>
            ${allocRows}
          </table>
        </td></tr>` : ''}
      `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice Transactions - ${data.vendor.vendorName}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #ea580c; }
          .header h1 { font-size: 24px; color: #ea580c; margin-bottom: 5px; }
          .header p { color: #666; font-size: 14px; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
          .summary-item { font-size: 13px; }
          .summary-item .label { color: #666; }
          .summary-item .value { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          th { background: #f3f4f6; padding: 10px 8px; text-align: left; font-size: 12px; font-weight: 600; border-bottom: 2px solid #e5e5e5; }
          .footer { display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #e5e5e5; font-size: 13px; }
          .print-date { text-align: right; font-size: 11px; color: #888; margin-top: 20px; }
          @media print { body { padding: 10px; } @page { margin: 1cm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>KINTO Smart Ops</h1>
          <p>Invoice Transactions Report</p>
        </div>
        <h2 style="font-size: 18px; margin-bottom: 15px;">${data.vendor.vendorName} (${data.vendor.vendorCode})</h2>
        <div class="summary">
          <div class="summary-item"><span class="label">Invoices: </span><span class="value">${filteredTxnInvoices.length}</span></div>
          <div class="summary-item"><span class="label">Total: </span><span class="value">${formatCurrency(txnData.summary.totalInvoiceAmount)}</span></div>
          <div class="summary-item"><span class="label">Settled: </span><span class="value" style="color: #16a34a;">${formatCurrency((txnData.summary.totalPayments || 0) + (txnData.summary.totalDnAdjustments || 0) + (txnData.summary.totalAdvances || 0))}</span></div>
          <div class="summary-item"><span class="label">Outstanding: </span><span class="value" style="color: #ea580c;">${formatCurrency(txnData.summary.totalOutstanding)}</span></div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Customer</th>
              <th style="text-align: right;">Total</th>
              <th style="text-align: right;">Settled</th>
              <th style="text-align: right;">Outstanding</th>
            </tr>
          </thead>
          <tbody>${invoiceRows}</tbody>
        </table>
        <div class="footer">
          <span>${filteredTxnInvoices.length} invoice(s)</span>
          <span>Total Outstanding: <strong style="color: #ea580c;">${formatCurrency(txnData.summary.totalOutstanding)}</strong></span>
        </div>
        <div class="print-date">Printed on: ${new Date().toLocaleString('en-IN')}</div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportTransactionsExcel = async () => {
    if (!data || !txnData) return;

    const getAllocTypeLabel = (type: string) => {
      switch (type) {
        case 'payment': return 'Payment';
        case 'debit_note_adjustment': return 'DN Adjustment';
        case 'advance_application': return 'Advance';
        case 'credit_note': return 'Credit Note';
        case 'debit_note': return 'Debit Note';
        default: return type;
      }
    };

    const rows: any[][] = [
      ['Invoice Transactions Report'],
      [],
      ['Vendor', data.vendor.vendorName],
      ['Code', data.vendor.vendorCode],
      [],
      ['Invoice #', 'Date', 'Customer', 'Total', 'Settled', 'Outstanding', 'Status'],
    ];

    filteredTxnInvoices.forEach(inv => {
      rows.push([
        inv.invoiceNumber,
        formatDateForExcel(inv.invoiceDate),
        inv.buyerName + (inv.isChildVendor ? ' (Child)' : ''),
        formatCurrencyForExcel(inv.effectiveTotal),
        formatCurrencyForExcel(inv.totalSettled),
        formatCurrencyForExcel(inv.outstanding),
        inv.outstanding <= 0 ? 'Settled' : inv.totalSettled > 0 ? 'Partial' : 'Unpaid',
      ]);
      if (inv.allocations.length > 0) {
        rows.push(['', 'Date', 'Type', 'Reference', 'Details', 'Amount']);
        inv.allocations.forEach(alloc => {
          const isAddition = alloc.type === 'debit_note';
          const detail = alloc.type === 'payment'
            ? `${alloc.method || 'Cash'}${alloc.bankName ? ' - ' + alloc.bankName : ''}${alloc.payerName ? ' (Paid by: ' + alloc.payerName + ')' : ''}`
            : alloc.type === 'advance_application' ? `From: ${alloc.advanceNumber || ''}`
            : alloc.type === 'debit_note_adjustment' ? `Vendor DN: ${alloc.reference || ''}`
            : `${alloc.noteNumber || ''}${alloc.reason ? ' - ' + alloc.reason : ''}`;
          rows.push([
            '',
            formatDateForExcel(alloc.date),
            getAllocTypeLabel(alloc.type),
            alloc.reference || alloc.advanceNumber || alloc.noteNumber || '-',
            detail,
            `${isAddition ? '+' : '-'}${formatCurrencyForExcel(alloc.amount)}`,
          ]);
        });
        rows.push([]);
      }
    });

    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Total Invoices', filteredTxnInvoices.length]);
    rows.push(['Total Amount', formatCurrencyForExcel(txnData.summary.totalInvoiceAmount)]);
    rows.push(['Total Settled', formatCurrencyForExcel((txnData.summary.totalPayments || 0) + (txnData.summary.totalDnAdjustments || 0) + (txnData.summary.totalAdvances || 0))]);
    rows.push(['Total Outstanding', formatCurrencyForExcel(txnData.summary.totalOutstanding)]);

    const filename = `${data.vendor.vendorName.replace(/[^a-zA-Z0-9]/g, '_')}_Invoice_Transactions_${new Date().toISOString().split('T')[0]}.xlsx`;

    await exportToExcel({
      filename,
      sheets: [{ name: 'Invoice Transactions', data: rows }],
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
        <TabsList className={`grid w-full ${canViewPayments ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <TabsTrigger value="ledger" className="gap-2" data-testid="tab-ledger">
            <Calendar className="h-4 w-4" />
            Transaction Ledger
          </TabsTrigger>
          <TabsTrigger value="transactions" className="gap-2" data-testid="tab-transactions">
            <FileText className="h-4 w-4" />
            Invoice Transactions
          </TabsTrigger>
          {canViewPayments && (
            <TabsTrigger value="unpaid" className="gap-2" data-testid="tab-unpaid-invoices">
              <AlertTriangle className="h-4 w-4" />
              Unpaid Invoices
            </TabsTrigger>
          )}
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
                <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={isLoading || !data} className="gap-1" data-testid="button-export-vendor-ledger">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Excel</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrint} disabled={isLoading || !data} className="gap-1" data-testid="button-print-vendor-ledger">
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
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
                      {FILTER_OPTIONS.map((option, idx) => (
                        <label
                          key={option.value}
                          className={`flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer hover-elevate ${idx === 0 ? 'border-b pb-2 mb-1' : ''}`}
                          data-testid={`filter-option-${option.value}`}
                        >
                          <Checkbox
                            checked={option.value === 'all' ? selectedFilters.length === 0 : selectedFilters.includes(option.value)}
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
                <Button variant="outline" size="sm" onClick={handleExportTransactionsExcel} disabled={txnLoading || !txnData} className="gap-1" data-testid="button-export-transactions">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Excel</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handlePrintTransactions} disabled={txnLoading || !txnData} className="gap-1" data-testid="button-print-transactions">
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
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

        {/* Unpaid Invoices Tab */}
        {canViewPayments && (
          <TabsContent value="unpaid">
            <div className="space-y-4">
              {/* Summary bar */}
              {txnLoading ? (
                <Card><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Unpaid Invoices</p>
                    <p className="text-2xl font-bold text-orange-600">{unpaidInvoices.length}</p>
                  </CardContent></Card>
                  <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Net Outstanding</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(txnData?.summary.totalOutstanding ?? 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Credit balances netted</p>
                  </CardContent></Card>
                  <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Clusters Affected</p>
                    <p className="text-2xl font-bold">{unpaidByCluster.length}</p>
                  </CardContent></Card>
                  <Card><CardContent className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">Partial Payments</p>
                    <p className="text-2xl font-bold text-yellow-600">{unpaidInvoices.filter(i => i.totalSettled > 0).length}</p>
                  </CardContent></Card>
                </div>
              )}

              {/* Section 1: Unpaid invoices by cluster */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Users className="h-5 w-5" />
                    Unpaid Invoices — Cluster Wise
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={handleExportUnpaidExcel} disabled={txnLoading || !txnData} className="gap-1" data-testid="button-export-unpaid">
                    <Download className="h-4 w-4" />
                    <span className="hidden sm:inline">Excel</span>
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  {txnLoading ? (
                    <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
                  ) : unpaidByCluster.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                      <CheckCircle className="h-12 w-12 text-green-400" />
                      <p className="font-medium">All invoices are settled!</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Cluster / Buyer</TableHead>
                          <TableHead className="text-right">Invoice Amt</TableHead>
                          <TableHead className="text-right">Settled</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unpaidByCluster.map(([cluster, invs]) => {
                          const clusterOutstanding = invs.reduce((s, i) => s + i.outstanding, 0);
                          const isOpen = expandedClusters[cluster] !== false; // default open
                          return (
                            <>
                              {/* Cluster header row */}
                              <TableRow key={`cluster-${cluster}`} className="bg-blue-50 dark:bg-blue-950/20 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-950/30" onClick={() => setExpandedClusters(prev => ({ ...prev, [cluster]: !isOpen }))}>
                                <TableCell>
                                  {isOpen ? <ChevronDown className="h-4 w-4 text-blue-600" /> : <ChevronRight className="h-4 w-4 text-blue-600" />}
                                </TableCell>
                                <TableCell colSpan={3} className="font-semibold text-blue-700 dark:text-blue-400">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4" />
                                    {cluster}
                                    <Badge variant="outline" className="text-xs">{invs.length} invoice{invs.length !== 1 ? 's' : ''}</Badge>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right font-medium">{formatCurrency(invs.reduce((s, i) => s + i.effectiveTotal, 0))}</TableCell>
                                <TableCell className="text-right text-green-600 font-medium">{formatCurrency(invs.reduce((s, i) => s + i.totalSettled, 0))}</TableCell>
                                <TableCell className="text-right font-bold text-orange-600">{formatCurrency(clusterOutstanding)}</TableCell>
                                <TableCell></TableCell>
                              </TableRow>
                              {/* Invoice rows */}
                              {isOpen && invs.map(inv => (
                                <TableRow key={inv.invoiceId} className="text-sm">
                                  <TableCell></TableCell>
                                  <TableCell className="font-mono font-medium">{inv.invoiceNumber}</TableCell>
                                  <TableCell className="text-muted-foreground">{formatDate(inv.invoiceDate)}</TableCell>
                                  <TableCell className="text-muted-foreground">{inv.buyerName}{inv.isChildVendor && <Badge variant="outline" className="ml-1 text-xs">Child</Badge>}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(inv.effectiveTotal)}</TableCell>
                                  <TableCell className="text-right text-green-600">{formatCurrency(inv.totalSettled)}</TableCell>
                                  <TableCell className="text-right font-bold text-orange-600">{formatCurrency(inv.outstanding)}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className={inv.totalSettled > 0 ? 'text-yellow-600 border-yellow-300' : 'text-red-600 border-red-300'}>
                                      {inv.totalSettled > 0 ? 'Partial' : 'Unpaid'}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </>
                          );
                        })}
                        {/* Grand total */}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell></TableCell>
                          <TableCell colSpan={5} className="text-right">Net Outstanding</TableCell>
                          <TableCell className="text-right text-orange-600">{formatCurrency(txnData?.summary.totalOutstanding ?? 0)}</TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Section 2: Payments received by date (cash + advance only) */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    Payments Received — Date Wise
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Cash payments and advance applications only · Debit note adjustments shown separately below</p>
                </CardHeader>
                <CardContent className="p-0">
                  {txnLoading ? (
                    <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                  ) : paymentsByDate.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                      <Clock className="h-8 w-8" />
                      <p>No payments recorded yet</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Invoice / Mode</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentsByDate.map(([dateKey, grp]) => {
                          const isOpen = expandedClusters[`pmt-${dateKey}`] !== false;
                          return (
                            <>
                              <TableRow key={`pmt-${dateKey}`} className="bg-green-50 dark:bg-green-950/20 cursor-pointer hover:bg-green-100 dark:hover:bg-green-950/30" onClick={() => setExpandedClusters(prev => ({ ...prev, [`pmt-${dateKey}`]: !isOpen }))}>
                                <TableCell>{isOpen ? <ChevronDown className="h-4 w-4 text-green-600" /> : <ChevronRight className="h-4 w-4 text-green-600" />}</TableCell>
                                <TableCell className="font-semibold">{formatDate(dateKey + 'T00:00:00')}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{grp.entries.length} payment{grp.entries.length !== 1 ? 's' : ''}</TableCell>
                                <TableCell className="text-right font-bold text-green-600">{formatCurrency(grp.total)}</TableCell>
                              </TableRow>
                              {isOpen && grp.entries.map((e, ei) => (
                                <TableRow key={`${dateKey}-${ei}`} className="text-sm">
                                  <TableCell></TableCell>
                                  <TableCell className="text-muted-foreground text-xs">{formatDate(dateKey + 'T00:00:00')}</TableCell>
                                  <TableCell>
                                    <span className="font-mono text-xs mr-2">{e.invoice}</span>
                                    <Badge variant="outline" className="text-xs">{e.method}</Badge>
                                    {e.ref && <span className="text-xs text-muted-foreground ml-2">{e.ref}</span>}
                                  </TableCell>
                                  <TableCell className="text-right text-green-600">{formatCurrency(e.amount)}</TableCell>
                                </TableRow>
                              ))}
                            </>
                          );
                        })}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell></TableCell>
                          <TableCell colSpan={2} className="text-right">Total Cash Payments</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(paymentsByDate.reduce((s, [, g]) => s + g.total, 0))}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Section 3: Debit note adjustments — separated from payments */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <TrendingUp className="h-5 w-5 text-purple-600" />
                        Debit Note Adjustments — Date Wise
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">Vendor debit notes applied against invoices · These reduce the payable amount but are not cash payments</p>
                    </div>
                    {dnAdjByDate.length > 0 && (
                      <Badge variant="outline" className="text-purple-600 border-purple-300 text-xs">
                        Total: {formatCurrency(dnAdjByDate.reduce((s, [, g]) => s + g.total, 0))}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {txnLoading ? (
                    <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                  ) : dnAdjByDate.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                      <AlertCircle className="h-8 w-8" />
                      <p>No debit note adjustments found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Invoice / Debit Note</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead className="text-right">Amount Adjusted</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dnAdjByDate.map(([dateKey, grp]) => {
                          const isOpen = expandedClusters[`dn-${dateKey}`] !== false;
                          return (
                            <>
                              <TableRow key={`dn-${dateKey}`} className="bg-purple-50 dark:bg-purple-950/20 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-950/30" onClick={() => setExpandedClusters(prev => ({ ...prev, [`dn-${dateKey}`]: !isOpen }))}>
                                <TableCell>{isOpen ? <ChevronDown className="h-4 w-4 text-purple-600" /> : <ChevronRight className="h-4 w-4 text-purple-600" />}</TableCell>
                                <TableCell className="font-semibold">{formatDate(dateKey + 'T00:00:00')}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">{grp.entries.length} adjustment{grp.entries.length !== 1 ? 's' : ''}</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-right font-bold text-purple-600">{formatCurrency(grp.total)}</TableCell>
                              </TableRow>
                              {isOpen && grp.entries.map((e, ei) => (
                                <TableRow key={`dn-${dateKey}-${ei}`} className="text-sm">
                                  <TableCell></TableCell>
                                  <TableCell className="text-muted-foreground text-xs">{formatDate(dateKey + 'T00:00:00')}</TableCell>
                                  <TableCell>
                                    <span className="font-mono text-xs mr-2">{e.invoice}</span>
                                    {e.noteNumber && <Badge variant="outline" className="text-xs text-purple-600 border-purple-200">{e.noteNumber}</Badge>}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">{e.reason || '—'}</TableCell>
                                  <TableCell className="text-right text-purple-600">{formatCurrency(e.amount)}</TableCell>
                                </TableRow>
                              ))}
                            </>
                          );
                        })}
                        <TableRow className="bg-muted/50 font-bold">
                          <TableCell></TableCell>
                          <TableCell colSpan={3} className="text-right">Total DN Adjustments</TableCell>
                          <TableCell className="text-right text-purple-600">{formatCurrency(dnAdjByDate.reduce((s, [, g]) => s + g.total, 0))}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
