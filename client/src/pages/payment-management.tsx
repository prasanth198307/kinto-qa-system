import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, X, FileText, Search, Filter, Check, ChevronsUpDown, Pencil, ChevronDown, ChevronRight, Link2, CircleCheck, AlertTriangle, CircleDashed, AlertCircle, ArrowLeft, Download } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import FIFOPaymentAllocation from "@/components/FIFOPaymentAllocation";

const editPaymentSchema = z.object({
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["Cash", "Cheque", "NEFT", "RTGS", "UPI", "Other"]),
  referenceNumber: z.string().optional(),
  bankName: z.string().optional(),
  remarks: z.string().optional(),
  amount: z.string().optional(),
  amountChangeReason: z.string().optional(),
});

type EditPaymentFormData = z.infer<typeof editPaymentSchema>;

// Payment Evidence Row Component - shows Payments.xlsx records linked to a VY- payment
function PaymentEvidenceRow({ paymentId }: { paymentId: string }) {
  const { data: evidence = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/payment-evidence', paymentId],
    enabled: !!paymentId,
  });

  if (isLoading) {
    return (
      <TableRow className="bg-muted/30" data-testid={`row-evidence-loading-${paymentId}`}>
        <TableCell colSpan={9} className="py-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading evidence...
          </div>
        </TableCell>
      </TableRow>
    );
  }

  if (evidence.length === 0) {
    return (
      <TableRow className="bg-muted/30" data-testid={`row-evidence-empty-${paymentId}`}>
        <TableCell colSpan={9} className="py-2">
          <div className="text-sm text-muted-foreground text-center">
            No Payments.xlsx records linked to this payment
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      {evidence.map((ev: any, idx: number) => {
        let sourceData: any = {};
        try { sourceData = ev.sourceRow ? JSON.parse(ev.sourceRow) : {}; } catch { sourceData = {}; }
        const ConfidenceIcon = ev.matchConfidence >= 80 ? CircleCheck : 
                               ev.matchConfidence >= 50 ? CircleDashed : AlertTriangle;
        const confidenceColor = ev.matchConfidence >= 80 ? 'text-green-600' : 
                                ev.matchConfidence >= 50 ? 'text-amber-500' : 'text-red-500';
        
        return (
          <TableRow 
            key={ev.id} 
            className="bg-muted/30 text-xs"
            data-testid={`row-evidence-${ev.id}`}
          >
            <TableCell className="pl-10">
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs" data-testid={`badge-evidence-${ev.id}`}>
                  Evidence {idx + 1}
                </Badge>
              </div>
            </TableCell>
            <TableCell colSpan={2} className="text-xs text-muted-foreground">
              {ev.receivedOn ? format(new Date(ev.receivedOn), 'dd MMM yyyy') : '-'}
            </TableCell>
            <TableCell className="text-xs" data-testid={`text-evidence-amount-${ev.id}`}>
              {(ev.amount / 100).toFixed(2)}
            </TableCell>
            <TableCell className="text-xs">{ev.paymentMode || '-'}</TableCell>
            <TableCell className="text-xs">{ev.referenceNumber || sourceData.reference || '-'}</TableCell>
            <TableCell>
              <Badge 
                variant={ev.matchStatus === 'matched' ? 'default' : 'secondary'} 
                className={cn(
                  "text-xs",
                  ev.matchStatus === 'matched' && "bg-green-600 hover:bg-green-700",
                  ev.matchStatus === 'orphan' && "bg-amber-500 hover:bg-amber-600"
                )}
                data-testid={`badge-evidence-status-${ev.id}`}
              >
                {ev.matchStatus === 'matched' ? 'Matched' : 'Orphan'}
              </Badge>
            </TableCell>
            <TableCell className="text-xs">
              <span 
                className="flex items-center gap-1"
                title={`Confidence: ${ev.matchConfidence}%`}
                data-testid={`text-evidence-confidence-${ev.id}`}
              >
                <ConfidenceIcon className={cn("w-3 h-3", confidenceColor)} />
                {ev.matchConfidence}%
              </span>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {sourceData.description || 'From Payments.xlsx'}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );
}

export default function PaymentManagement() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { hasPermission, role } = usePermissions();
  const canCreate = hasPermission('payments', 'create');
  const canEdit = hasPermission('payments', 'edit');
  const canDelete = hasPermission('payments', 'delete');
  const canViewPayments = hasPermission('payments', 'view');
  const canDownloadBulkReport = canViewPayments || hasPermission('bulk_payment_report', 'view');
  const canManagePayments = role === 'manager' || hasPermission('payment_management', 'edit');
  const showAdminTools = role === 'admin' || hasPermission('payment_management', 'delete');
  
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [cancelPaymentId, setCancelPaymentId] = useState<string | null>(null);
  const [cancellationRemarks, setCancellationRemarks] = useState("");
  
  // Edit payment state
  const [editPayment, setEditPayment] = useState<any>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  // Filters for payment history
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVendor, setFilterVendor] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, cancelled
  
  // Track expanded VY- payments to show evidence
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());
  // Track expanded bulk allocation rows
  const [expandedBulkAllocs, setExpandedBulkAllocs] = useState<Set<string>>(new Set());

  // Advance Payment (prepayment) state
  const [showAdvanceDialog, setShowAdvanceDialog] = useState(false);
  const [advVendorOpen, setAdvVendorOpen] = useState(false);
  const [advanceVendorFilter, setAdvanceVendorFilter] = useState("all");
  const [advanceStatusFilter, setAdvanceStatusFilter] = useState("all");
  const [showApplyAdvanceDialog, setShowApplyAdvanceDialog] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<any>(null);
  const [applyInvoiceId, setApplyInvoiceId] = useState("");
  const [applyAmount, setApplyAmount] = useState("");
  const [applyRemarks, setApplyRemarks] = useState("");

  // Advance form state (for creating new prepayment)
  const [advForm, setAdvForm] = useState({
    vendorId: "",
    receiptDate: new Date().toISOString().slice(0, 10),
    amount: "",
    paymentMethod: "Cash" as string,
    referenceNumber: "",
    remarks: "",
  });

  const { data: vendors = [] } = useQuery<any[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: paymentsData = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/invoice-payments/history'],
  });

  const [bulkPage, setBulkPage] = useState(1);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkVendorId, setBulkVendorId] = useState('');
  const BULK_PAGE_SIZE = 50;

  // Derive parent vendors + children count for the dropdown
  const parentVendors = (vendors as any[]).filter(v => !v.parentVendorId);
  const childCountMap = (vendors as any[]).reduce((acc: Record<string, number>, v: any) => {
    if (v.parentVendorId) acc[v.parentVendorId] = (acc[v.parentVendorId] || 0) + 1;
    return acc;
  }, {});

  // Customer vendors for advance payment — all active non-child vendors, sorted by name
  const customerVendors = (vendors as any[])
    .filter(v => !v.parentVendorId && v.isActive !== 0)
    .sort((a, b) => a.vendorName.localeCompare(b.vendorName));

  // Query for prepayment advances (advance payments from Payment Management)
  const { data: prepaymentData = [], isLoading: prepaymentLoading } = useQuery<any[]>({
    queryKey: ['/api/customer-advances', 'prepayment', advanceVendorFilter, advanceStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ advanceType: 'prepayment' });
      if (advanceVendorFilter !== 'all') params.append('vendorId', advanceVendorFilter);
      if (advanceStatusFilter !== 'all') params.append('status', advanceStatusFilter);
      const res = await fetch(`/api/customer-advances?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch advance payments');
      return res.json();
    },
  });

  // Fetch pending invoices for the selected advance's vendor (for applying)
  const { data: vendorPendingInvoices = [] } = useQuery<any[]>({
    queryKey: ['/api/invoices', selectedAdvance?.vendorId, 'pending-for-advance'],
    enabled: !!selectedAdvance?.vendorId && showApplyAdvanceDialog,
    queryFn: async () => {
      const res = await fetch(
        `/api/invoices?vendorId=${selectedAdvance.vendorId}&paymentStatus=pending&page=1&pageSize=200`,
        { credentials: 'include' }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : (data.invoices || data.data || []);
    },
  });

  // Create advance payment mutation
  const createAdvanceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/customer-advances', {
        vendorId: advForm.vendorId,
        receiptDate: advForm.receiptDate,
        amount: Math.round(parseFloat(advForm.amount) * 100),
        paymentMethod: advForm.paymentMethod,
        referenceNumber: advForm.referenceNumber || undefined,
        remarks: advForm.remarks || undefined,
        advanceType: 'prepayment',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create advance payment');
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Advance Payment Recorded', description: 'The advance payment has been recorded successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-advances', 'prepayment'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pending-payments'] });
      setShowAdvanceDialog(false);
      setAdvForm({ vendorId: '', receiptDate: new Date().toISOString().slice(0, 10), amount: '', paymentMethod: 'Cash', referenceNumber: '', remarks: '' });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // Apply advance payment to invoice mutation
  const applyAdvanceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', `/api/customer-advances/${selectedAdvance.id}/apply`, {
        invoiceId: applyInvoiceId,
        amount: Math.round(parseFloat(applyAmount) * 100),
        remarks: applyRemarks || `Applied advance ${selectedAdvance.advanceNumber} to invoice`,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to apply advance');
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Advance Applied', description: 'Advance payment applied to invoice successfully.' });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-advances', 'prepayment'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments'] });
      setShowApplyAdvanceDialog(false);
      setSelectedAdvance(null);
      setApplyInvoiceId('');
      setApplyAmount('');
      setApplyRemarks('');
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  // Cancel advance mutation
  const cancelAdvanceMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/customer-advances/${id}/cancel`, { remarks: 'Cancelled from Payment Management' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to cancel');
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Advance Cancelled', description: 'Advance payment has been cancelled.' });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-advances', 'prepayment'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pending-payments'] });
    },
    onError: (err: Error) => toast({ title: 'Error', description: err.message, variant: 'destructive' }),
  });

  const { data: bulkAllocsData, isLoading: bulkAllocsLoading } = useQuery<{ data: any[]; total: number }>({
    queryKey: ['/api/invoice-payments/bulk-allocations', bulkPage, bulkSearch, bulkVendorId],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(bulkPage), limit: String(BULK_PAGE_SIZE) });
      if (bulkSearch.trim()) params.set('search', bulkSearch.trim());
      if (bulkVendorId) params.set('vendorId', bulkVendorId);
      return fetch(`/api/invoice-payments/bulk-allocations?${params}`, { credentials: 'include' }).then(r => r.json());
    },
  });

  const repairBulkDatesMutation = useMutation({
    mutationFn: async () => apiRequest('POST', '/api/invoice-payments/repair-bulk-dates', {}),
    onSuccess: async (res: any) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments/bulk-allocations'] });
      toast({ title: 'Repair complete', description: data.message });
    },
    onError: () => toast({ title: 'Repair failed', variant: 'destructive' }),
  });

  const backfillMutation = useMutation({
    mutationFn: async () => apiRequest('POST', '/api/invoice-payments/backfill-bulk-ids', {}),
    onSuccess: async (res: any) => {
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments/bulk-allocations'] });
      toast({
        title: "Backfill complete",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Backfill failed", description: error.message, variant: "destructive" });
    },
  });

  const [isDownloading, setIsDownloading] = useState(false);

  const downloadBulkReport = async () => {
    setIsDownloading(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'KINTO Ops';
      wb.created = new Date();

      const headerStyle = { font: { bold: true, color: { argb: 'FFFFFFFF' } }, fill: { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1E3A5F' } }, alignment: { vertical: 'middle' as const } };

      if (bulkVendorId) {
        // Fetch company details from default template
        const [allocRes, tmplRes] = await Promise.all([
          fetch(`/api/invoice-payments/bulk-allocations?${new URLSearchParams({ page: '1', limit: '10000', vendorId: bulkVendorId })}`, { credentials: 'include' }),
          fetch('/api/invoice-templates/default', { credentials: 'include' }),
        ]);
        const allocJson = await allocRes.json();
        const groups: any[] = allocJson.data || [];
        const tmpl = tmplRes.ok ? await tmplRes.json() : null;

        const selectedVendor = (vendors as any[]).find(v => v.id === bulkVendorId);
        const vendorName = selectedVendor?.vendorName || 'Vendor';

        const companyName    = tmpl?.defaultSellerName    || 'KINTO Smart Ops';
        const companyAddress = tmpl?.defaultSellerAddress || '';
        const companyGstin   = tmpl?.defaultSellerGstin   || '';
        const companyPhone   = tmpl?.defaultSellerPhone   || '';
        const companyEmail   = tmpl?.defaultSellerEmail   || '';

        const NAVY  = 'FF1E3A5F';
        const BLUE  = 'FF2563AA';
        const LBLUE = 'FFD6E4F7';
        const WHITE = 'FFFFFFFF';
        const LGREY = 'FFF5F7FA';
        const DGREY = 'FF555555';

        const ws = wb.addWorksheet('Payment Report');
        ws.columns = [
          { key: 'c1', width: 18 },
          { key: 'c2', width: 32 },
          { key: 'c3', width: 14 },
          { key: 'c4', width: 26 },
          { key: 'c5', width: 18 },
        ];

        const COLS = 5;
        const mergeRow = (rowNum: number) => ws.mergeCells(rowNum, 1, rowNum, COLS);

        // ── Row 1: company name (large, navy background) ────────────────────
        const r1 = ws.addRow([companyName]);
        r1.height = 32;
        r1.getCell(1).font  = { bold: true, size: 16, color: { argb: WHITE } };
        r1.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        r1.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
        mergeRow(1);

        // ── Row 2: address ───────────────────────────────────────────────────
        if (companyAddress) {
          const r2 = ws.addRow([companyAddress]);
          r2.height = 16;
          r2.getCell(1).font  = { size: 9, color: { argb: WHITE } };
          r2.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
          r2.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
          mergeRow(2);
        }

        // ── Row 3: GSTIN | Phone | Email ─────────────────────────────────────
        const metaParts = [
          companyGstin ? `GSTIN: ${companyGstin}` : '',
          companyPhone ? `Ph: ${companyPhone}` : '',
          companyEmail ? `Email: ${companyEmail}` : '',
        ].filter(Boolean).join('   |   ');
        if (metaParts) {
          const r3 = ws.addRow([metaParts]);
          r3.height = 14;
          r3.getCell(1).font  = { size: 8, color: { argb: WHITE } };
          r3.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
          r3.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
          mergeRow(ws.rowCount);
        }

        // ── Spacer ───────────────────────────────────────────────────────────
        const spacer = ws.addRow([]);
        spacer.height = 6;
        mergeRow(ws.rowCount);

        // ── Report title row ─────────────────────────────────────────────────
        const rTitle = ws.addRow([`BULK PAYMENT REPORT — ${vendorName.toUpperCase()}`]);
        rTitle.height = 22;
        rTitle.getCell(1).font  = { bold: true, size: 12, color: { argb: WHITE } };
        rTitle.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
        rTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
        mergeRow(ws.rowCount);

        // ── Generated date ────────────────────────────────────────────────────
        const rDate = ws.addRow([`Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`]);
        rDate.height = 14;
        rDate.getCell(1).font  = { italic: true, size: 8, color: { argb: DGREY } };
        rDate.getCell(1).fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: LGREY } };
        rDate.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
        mergeRow(ws.rowCount);

        // ── Empty spacer ──────────────────────────────────────────────────────
        const spacer2 = ws.addRow([]);
        spacer2.height = 4;
        mergeRow(ws.rowCount);

        // ── Column header row ─────────────────────────────────────────────────
        const colHeaderRow = ws.addRow(['Date', 'Vendor / Payer', 'Method', 'Invoice', 'Amount (₹)']);
        colHeaderRow.height = 20;
        colHeaderRow.eachCell(cell => {
          cell.font      = { bold: true, size: 10, color: { argb: WHITE } };
          cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        });
        colHeaderRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };

        // ── Data rows ─────────────────────────────────────────────────────────
        let grandTotal = 0;
        for (const g of groups) {
          const date  = g.paymentDate ? parseISO(g.paymentDate).toLocaleDateString('en-IN') : '-';
          const total = Number((g.totalAmount / 100).toFixed(2));
          grandTotal += total;

          // Group total row (light blue, bold)
          const totalRow = ws.addRow([
            date,
            g.payerName || g.vendorName || '-',
            g.paymentMethod || '-',
            g.isIndividual ? 'Individual Payment' : `${g.splits.length} Invoice(s)`,
            total,
          ]);
          totalRow.height = 18;
          totalRow.eachCell(cell => {
            cell.font = { bold: true, size: 10, color: { argb: NAVY } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LBLUE } };
            cell.alignment = { vertical: 'middle', indent: 1 };
          });
          totalRow.getCell(5).numFmt    = '₹#,##0.00';
          totalRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };

          // Split rows (white, indented, smaller text)
          for (const s of g.splits) {
            const splitRow = ws.addRow([
              '',
              `      ${s.buyerName || '-'}`,
              '',
              s.invoiceNumber || '-',
              Number((s.amount / 100).toFixed(2)),
            ]);
            splitRow.height = 15;
            splitRow.eachCell(cell => {
              cell.font = { size: 9, color: { argb: DGREY } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
              cell.alignment = { vertical: 'middle', indent: 1 };
            });
            splitRow.getCell(5).numFmt    = '₹#,##0.00';
            splitRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
          }
        }

        // ── Grand total row ────────────────────────────────────────────────────
        const grandRow = ws.addRow(['', 'GRAND TOTAL', '', '', grandTotal]);
        grandRow.height = 22;
        grandRow.eachCell(cell => {
          cell.font = { bold: true, size: 11, color: { argb: WHITE } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
          cell.alignment = { vertical: 'middle', indent: 1 };
        });
        grandRow.getCell(5).numFmt    = '₹#,##0.00';
        grandRow.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };

        // Add thin border around data area
        const firstDataRow = ws.rowCount - groups.reduce((acc, g) => acc + 1 + g.splits.length, 0) - 1;
        for (let r = firstDataRow; r <= ws.rowCount; r++) {
          ws.getRow(r).eachCell({ includeEmpty: true }, cell => {
            cell.border = {
              top:    { style: 'thin', color: { argb: 'FFD0D9E8' } },
              bottom: { style: 'thin', color: { argb: 'FFD0D9E8' } },
              left:   { style: 'thin', color: { argb: 'FFD0D9E8' } },
              right:  { style: 'thin', color: { argb: 'FFD0D9E8' } },
            };
          });
        }

        const vendorSlug = vendorName.replace(/\s+/g, '-').toLowerCase();
        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments-${vendorSlug}-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // No vendor selected → all vendors overview with branded header
        const params = new URLSearchParams({ page: '1', limit: '10000' });
        if (bulkSearch.trim()) params.set('search', bulkSearch.trim());
        const [res, tmplRes] = await Promise.all([
          fetch(`/api/invoice-payments/bulk-allocations?${params}`, { credentials: 'include' }),
          fetch('/api/invoice-templates/default', { credentials: 'include' }),
        ]);
        const json   = await res.json();
        const groups: any[] = json.data || [];
        const tmpl   = tmplRes.ok ? await tmplRes.json() : null;

        const companyName    = tmpl?.defaultSellerName    || 'KINTO Smart Ops';
        const companyAddress = tmpl?.defaultSellerAddress || '';
        const companyGstin   = tmpl?.defaultSellerGstin   || '';
        const companyPhone   = tmpl?.defaultSellerPhone   || '';
        const companyEmail   = tmpl?.defaultSellerEmail   || '';

        const NAVY  = 'FF1E3A5F';
        const BLUE  = 'FF2563AA';
        const LGREY = 'FFF5F7FA';
        const WHITE = 'FFFFFFFF';
        const DGREY = 'FF555555';

        const COLS = 9;
        const ws = wb.addWorksheet('Bulk Payment Allocations');
        ws.columns = [
          { key: 'bulkId',    width: 32 },
          { key: 'date',      width: 14 },
          { key: 'vendor',    width: 30 },
          { key: 'method',    width: 14 },
          { key: 'reference', width: 20 },
          { key: 'total',     width: 16 },
          { key: 'invoice',   width: 20 },
          { key: 'buyer',     width: 30 },
          { key: 'split',     width: 16 },
        ];

        const mergeRow = (rowNum: number) => ws.mergeCells(rowNum, 1, rowNum, COLS);

        // ── Company name ──────────────────────────────────────────────────────
        const r1 = ws.addRow([companyName]);
        r1.height = 32;
        r1.getCell(1).font      = { bold: true, size: 16, color: { argb: WHITE } };
        r1.getCell(1).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
        r1.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
        mergeRow(1);

        // ── Address ───────────────────────────────────────────────────────────
        if (companyAddress) {
          const r2 = ws.addRow([companyAddress]);
          r2.height = 16;
          r2.getCell(1).font      = { size: 9, color: { argb: WHITE } };
          r2.getCell(1).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
          r2.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
          mergeRow(ws.rowCount);
        }

        // ── GSTIN | Phone | Email ─────────────────────────────────────────────
        const metaParts = [
          companyGstin ? `GSTIN: ${companyGstin}` : '',
          companyPhone ? `Ph: ${companyPhone}` : '',
          companyEmail ? `Email: ${companyEmail}` : '',
        ].filter(Boolean).join('   |   ');
        if (metaParts) {
          const r3 = ws.addRow([metaParts]);
          r3.height = 14;
          r3.getCell(1).font      = { size: 8, color: { argb: WHITE } };
          r3.getCell(1).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
          r3.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
          mergeRow(ws.rowCount);
        }

        // ── Spacer ────────────────────────────────────────────────────────────
        ws.addRow([]); mergeRow(ws.rowCount);

        // ── Report title ──────────────────────────────────────────────────────
        const rTitle = ws.addRow(['ALL VENDORS — BULK PAYMENT REPORT']);
        rTitle.height = 22;
        rTitle.getCell(1).font      = { bold: true, size: 12, color: { argb: WHITE } };
        rTitle.getCell(1).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
        rTitle.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
        mergeRow(ws.rowCount);

        // ── Generated date ────────────────────────────────────────────────────
        const rDate = ws.addRow([`Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`]);
        rDate.height = 14;
        rDate.getCell(1).font      = { italic: true, size: 8, color: { argb: DGREY } };
        rDate.getCell(1).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: LGREY } };
        rDate.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 2 };
        mergeRow(ws.rowCount);

        // ── Empty spacer ──────────────────────────────────────────────────────
        ws.addRow([]); mergeRow(ws.rowCount);

        // ── Column header row ─────────────────────────────────────────────────
        const hr = ws.addRow(['Bulk ID', 'Date', 'Vendor / Payer', 'Method', 'Reference', 'Total Paid (₹)', 'Invoice Number', 'Buyer Name', 'Split Amount (₹)']);
        hr.height = 20;
        hr.eachCell(cell => {
          cell.font      = { bold: true, size: 10, color: { argb: WHITE } };
          cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
          cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        });
        [6, 9].forEach(col => { hr.getCell(col).alignment = { vertical: 'middle', horizontal: 'right' }; });

        // ── Data rows ─────────────────────────────────────────────────────────
        let isOdd = true;
        for (const g of groups) {
          const date  = g.paymentDate ? parseISO(g.paymentDate).toLocaleDateString('en-IN') : '-';
          const total = Number((g.totalAmount / 100).toFixed(2));
          const rowBg = isOdd ? 'FFFFFFFF' : 'FFF0F4FA';
          isOdd = !isOdd;
          for (const s of g.splits) {
            const dr = ws.addRow([
              g.bulkAllocationId || '-', date,
              g.vendorName || g.payerName || '-',
              g.paymentMethod || '-', g.referenceNumber || '-',
              total, s.invoiceNumber || '-', s.buyerName || '-',
              Number((s.amount / 100).toFixed(2)),
            ]);
            dr.height = 15;
            dr.eachCell(cell => {
              cell.font = { size: 9, color: { argb: DGREY } };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
              cell.alignment = { vertical: 'middle', indent: 1 };
            });
            dr.getCell(6).numFmt    = '₹#,##0.00';
            dr.getCell(9).numFmt    = '₹#,##0.00';
            dr.getCell(6).alignment = { vertical: 'middle', horizontal: 'right' };
            dr.getCell(9).alignment = { vertical: 'middle', horizontal: 'right' };
          }
        }

        const buffer = await wb.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bulk-payment-allocations-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      toast({ title: 'Download failed', description: 'Could not export report', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  };

  const cancelMutation = useMutation({
    mutationFn: async ({ paymentId, remarks }: { paymentId: string; remarks: string }) => {
      await apiRequest('PATCH', `/api/invoice-payments/${paymentId}/cancel`, { cancellationRemarks: remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Success",
        description: "Payment cancelled successfully",
      });
      setCancelPaymentId(null);
      setCancellationRemarks("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit form
  const editForm = useForm<EditPaymentFormData>({
    resolver: zodResolver(editPaymentSchema),
    defaultValues: {
      paymentDate: "",
      paymentMethod: "Cash",
      referenceNumber: "",
      bankName: "",
      remarks: "",
      amount: "",
      amountChangeReason: "",
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: EditPaymentFormData & { paymentId: string; originalAmount: number }) => {
      const newAmount = data.amount ? Math.round(parseFloat(data.amount) * 100) : undefined;
      const payload: any = {
        paymentDate: parseISO(data.paymentDate).toISOString(),
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        bankName: data.bankName,
        remarks: data.remarks,
      };
      // Only include amount if it changed
      if (newAmount !== undefined && newAmount !== data.originalAmount) {
        payload.amount = newAmount;
        payload.amountChangeReason = data.amountChangeReason;
      }
      await apiRequest('PATCH', `/api/invoice-payments/${data.paymentId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments/history'] });
      toast({
        title: "Success",
        description: "Payment updated successfully",
      });
      setShowEditDialog(false);
      setEditPayment(null);
      editForm.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditPayment = (payment: any) => {
    setEditPayment(payment);
    editForm.reset({
      paymentDate: payment.paymentDate ? format(parseISO(payment.paymentDate), "yyyy-MM-dd") : "",
      paymentMethod: payment.paymentMethod || "Cash",
      referenceNumber: payment.referenceNumber || "",
      bankName: payment.bankName || "",
      remarks: payment.remarks || "",
      amount: (payment.amount / 100).toFixed(2),
      amountChangeReason: "",
    });
    setShowEditDialog(true);
  };

  // Check if payment is a VY- import (Vyapaar)
  const isVyapaarPayment = (payment: any) => {
    const refNum = payment?.referenceNumber || '';
    return refNum.startsWith('VY-');
  };

  // Toggle payment evidence visibility
  const togglePaymentEvidence = (paymentId: string) => {
    setExpandedPayments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(paymentId)) {
        newSet.delete(paymentId);
      } else {
        newSet.add(paymentId);
      }
      return newSet;
    });
  };

  const onEditSubmit = (data: EditPaymentFormData) => {
    if (editPayment) {
      editMutation.mutate({ ...data, paymentId: editPayment.id, originalAmount: editPayment.amount });
    }
  };

  const handleCancelPayment = () => {
    if (cancelPaymentId && cancellationRemarks.trim()) {
      cancelMutation.mutate({ paymentId: cancelPaymentId, remarks: cancellationRemarks });
    }
  };

  // Filter payments
  const filteredPayments = useMemo(() => {
    return paymentsData.filter((payment: any) => {
      const matchesSearch = !searchTerm || 
        payment.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesVendor = filterVendor === "all" || payment.vendorId === filterVendor;
      const matchesMethod = filterMethod === "all" || payment.paymentMethod === filterMethod;
      const matchesStatus = filterStatus === "all" || 
        (filterStatus === "active" && !payment.cancelledAt) ||
        (filterStatus === "cancelled" && payment.cancelledAt);
      
      return matchesSearch && matchesVendor && matchesMethod && matchesStatus;
    });
  }, [paymentsData, searchTerm, filterVendor, filterMethod, filterStatus]);

  const filtersActive = searchTerm || filterVendor !== "all" || filterMethod !== "all" || filterStatus !== "all";

  const clearFilters = () => {
    setSearchTerm("");
    setFilterVendor("all");
    setFilterMethod("all");
    setFilterStatus("all");
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/?tab=invoices')}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">Payment Management</h1>
          <p className="text-sm text-muted-foreground">FIFO payment entry and payment history</p>
        </div>
      </div>

      <Tabs defaultValue="history">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="history" data-testid="tab-payment-history">Payment History</TabsTrigger>
            {canViewPayments && (
              <TabsTrigger value="bulk" data-testid="tab-bulk-allocations">Bulk Allocations</TabsTrigger>
            )}
            {canViewPayments && (
              <TabsTrigger value="advance" data-testid="tab-advance-payments">Advance Payments</TabsTrigger>
            )}
          </TabsList>
          <div className="flex items-center gap-2">
            {canCreate && (
              <Button onClick={() => setShowPaymentDialog(true)} data-testid="button-add-payment">
                <Plus className="w-4 h-4 mr-2" />
                New Payment
              </Button>
            )}
            {showAdminTools && (
              <Button
                variant="outline"
                onClick={() => backfillMutation.mutate()}
                disabled={backfillMutation.isPending}
                data-testid="button-backfill-bulk-ids"
              >
                {backfillMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Link Old Payments
              </Button>
            )}
            {showAdminTools && (
              <Button
                variant="outline"
                onClick={() => repairBulkDatesMutation.mutate()}
                disabled={repairBulkDatesMutation.isPending}
                data-testid="button-repair-bulk-dates"
              >
                {repairBulkDatesMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Fix Date Groupings
              </Button>
            )}
          </div>
        </div>

        {/* Tab 1 — Payment History */}
        <TabsContent value="history" className="mt-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
          <div>
            <CardTitle className="text-base">Payment History</CardTitle>
            <CardDescription>All payments with linked invoices</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice, vendor, or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-payments"
              />
            </div>
            <Select value={filterVendor} onValueChange={setFilterVendor}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-filter-vendor">
                <SelectValue placeholder="All Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendors.map((vendor: any) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.vendorName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-method">
                <SelectValue placeholder="All Methods" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="NEFT">NEFT</SelectItem>
                <SelectItem value="RTGS">RTGS</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-filter-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            {filtersActive && (
              <Button variant="outline" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="w-4 h-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm text-muted-foreground">
                {filtersActive ? "No payments match the selected filters" : "No payment records found"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment: any) => {
                    const isVyapaar = isVyapaarPayment(payment);
                    const isExpanded = expandedPayments.has(payment.id);
                    
                    return (
                      <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            {isVyapaar && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => togglePaymentEvidence(payment.id)}
                                data-testid={`button-expand-evidence-${payment.id}`}
                                title="View Payments.xlsx evidence"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            {payment.paymentDate ? format(parseISO(payment.paymentDate), 'dd MMM yyyy') : '-'}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{payment.vendorName}</TableCell>
                        <TableCell className="text-sm font-medium">{payment.invoiceNumber}</TableCell>
                        <TableCell className="text-sm">₹{(payment.amount / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{payment.paymentMethod}</TableCell>
                        <TableCell className="text-sm">{payment.referenceNumber || '-'}</TableCell>
                        <TableCell className="text-sm">
                          <Badge 
                            variant={payment.cancelledAt ? "destructive" : "default"}
                            className={cn(
                              !payment.cancelledAt && "bg-green-600 hover:bg-green-700"
                            )}
                          >
                            {payment.cancelledAt ? "Cancelled" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {!payment.cancelledAt && (canEdit || canDelete) && (
                            <div className="flex items-center gap-2">
                              {canEdit && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleEditPayment(payment)}
                                  data-testid={`button-edit-payment-${payment.id}`}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => setCancelPaymentId(payment.id)}
                                  data-testid={`button-cancel-payment-${payment.id}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Tab 2 — Bulk Allocations */}
        <TabsContent value="bulk" className="mt-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Bulk Payment Allocations</CardTitle>
            <CardDescription>Each row is one payment split across multiple invoices. Click to expand the breakdown.</CardDescription>
          </div>
          {canDownloadBulkReport && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadBulkReport}
              disabled={isDownloading}
              data-testid="button-download-bulk-report"
            >
              {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              Download Excel
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Filters row */}
          <div className="flex flex-wrap gap-2">
            {/* Vendor selector */}
            <Select
              value={bulkVendorId || 'all'}
              onValueChange={(v) => { setBulkVendorId(v === 'all' ? '' : v); setBulkPage(1); }}
              data-testid="select-bulk-vendor"
            >
              <SelectTrigger className="w-60" data-testid="trigger-bulk-vendor">
                <SelectValue placeholder="All vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {parentVendors.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.vendorName}
                    {childCountMap[v.id] ? ` (+ ${childCountMap[v.id]} child${childCountMap[v.id] > 1 ? 'ren' : ''})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Text search */}
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by method, reference..."
                value={bulkSearch}
                onChange={(e) => { setBulkSearch(e.target.value); setBulkPage(1); }}
                className="pl-9"
                data-testid="input-search-bulk"
              />
              {bulkSearch && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => { setBulkSearch(''); setBulkPage(1); }}
                  data-testid="button-clear-bulk-search"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>

            {/* Clear all filters */}
            {(bulkVendorId || bulkSearch) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setBulkVendorId(''); setBulkSearch(''); setBulkPage(1); }}
                data-testid="button-clear-bulk-filters"
              >
                <X className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
          </div>
          {bulkAllocsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : !bulkAllocsData?.data?.length ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              {bulkSearch ? `No results for "${bulkSearch}"` : 'No bulk allocations yet. Use "New Payment" to split a payment across invoices.'}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor / Payer</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                    <TableHead className="text-center">Invoices</TableHead>
                  </TableRow>
                </TableHeader>
                {bulkAllocsData.data.map((alloc: any, allocIdx: number) => {
                    // Individual payments have no bulkAllocationId — use fallback unique key
                    const rowKey = alloc.bulkAllocationId || `individual-${alloc.splits[0]?.paymentId || allocIdx}`;
                    const isExpanded = expandedBulkAllocs.has(rowKey);
                    return (
                      <TableBody key={rowKey}>
                        <TableRow
                          className="cursor-pointer hover-elevate"
                          onClick={() => setExpandedBulkAllocs(prev => {
                            const next = new Set(prev);
                            next.has(rowKey) ? next.delete(rowKey) : next.add(rowKey);
                            return next;
                          })}
                          data-testid={`row-bulk-alloc-${rowKey}`}
                        >
                          <TableCell className="pl-3">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell className="text-sm">
                            {alloc.paymentDate ? format(parseISO(alloc.paymentDate), 'dd MMM yyyy') : '-'}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {alloc.payerName || alloc.vendorName || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            <Badge variant="secondary" className="text-xs">{alloc.paymentMethod}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {alloc.referenceNumber || '-'}
                          </TableCell>
                          <TableCell className="text-sm font-semibold text-right">
                            ₹{(alloc.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-center">
                            {alloc.isIndividual
                              ? <Badge variant="outline" className="text-xs text-muted-foreground">Indv</Badge>
                              : <Badge variant="outline" className="text-xs">{alloc.splits.length}</Badge>
                            }
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${rowKey}-detail`} className="bg-muted/30">
                            <TableCell colSpan={7} className="px-6 pb-3 pt-0">
                              <div className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Split Breakdown</div>
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-muted-foreground">
                                    <th className="text-left pb-1 font-medium">Invoice</th>
                                    <th className="text-left pb-1 font-medium">Buyer</th>
                                    <th className="text-right pb-1 font-medium">Amount Paid</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {alloc.splits.map((split: any, i: number) => (
                                    <tr key={split.paymentId} className={i < alloc.splits.length - 1 ? 'border-b border-border/50' : ''}>
                                      <td className="py-1 font-mono text-xs">{split.invoiceNumber}</td>
                                      <td className="py-1 text-muted-foreground">{split.buyerName}</td>
                                      <td className="py-1 text-right font-medium">₹{(split.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                  ))}
                                  <tr className="border-t-2 border-border font-semibold">
                                    <td colSpan={2} className="pt-2 text-xs uppercase tracking-wide text-muted-foreground">Total</td>
                                    <td className="pt-2 text-right">₹{(alloc.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                </tbody>
                              </table>
                              {alloc.remarks && (
                                <p className="text-xs text-muted-foreground mt-2">Remarks: {alloc.remarks}</p>
                              )}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    );
                  })}
              </Table>
            </div>
          )}
          {/* Pagination */}
          {bulkAllocsData && bulkAllocsData.total > BULK_PAGE_SIZE && (
            <div className="flex items-center justify-between pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {((bulkPage - 1) * BULK_PAGE_SIZE) + 1}–{Math.min(bulkPage * BULK_PAGE_SIZE, bulkAllocsData.total)} of {bulkAllocsData.total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkPage(p => Math.max(1, p - 1))}
                  disabled={bulkPage === 1}
                  data-testid="button-bulk-prev"
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {bulkPage} of {Math.ceil(bulkAllocsData.total / BULK_PAGE_SIZE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkPage(p => p + 1)}
                  disabled={bulkPage * BULK_PAGE_SIZE >= bulkAllocsData.total}
                  data-testid="button-bulk-next"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Tab 3 — Advance Payments */}
        <TabsContent value="advance" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
              <div>
                <CardTitle className="text-base">Advance Payments</CardTitle>
                <CardDescription>Record customer payments not linked to a specific invoice. Apply them to invoices later.</CardDescription>
              </div>
              {canCreate && (
                <Button onClick={() => setShowAdvanceDialog(true)} data-testid="button-record-advance">
                  <Plus className="w-4 h-4 mr-2" />
                  Record Advance Payment
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Filters */}
              <div className="flex flex-wrap gap-2">
                <Select value={advanceVendorFilter} onValueChange={setAdvanceVendorFilter} data-testid="select-advance-vendor">
                  <SelectTrigger className="w-52" data-testid="trigger-advance-vendor">
                    <SelectValue placeholder="All customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    {customerVendors.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>{v.vendorName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={advanceStatusFilter} onValueChange={setAdvanceStatusFilter} data-testid="select-advance-status">
                  <SelectTrigger className="w-40" data-testid="trigger-advance-status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="fully_used">Fully Used</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              {prepaymentLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (prepaymentData as any[]).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No advance payments recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ref #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Used</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(prepaymentData as any[]).map((adv: any) => {
                        const available = adv.amount - adv.usedAmount;
                        const statusColor = adv.status === 'active' ? 'default' :
                                            adv.status === 'fully_used' ? 'secondary' : 'destructive';
                        return (
                          <TableRow key={adv.id} data-testid={`row-advance-${adv.id}`}>
                            <TableCell className="font-mono text-sm">{adv.advanceNumber}</TableCell>
                            <TableCell className="font-medium">{adv.vendorName || '—'}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {adv.receiptDate ? format(new Date(adv.receiptDate), 'dd MMM yyyy') : '—'}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              ₹{(adv.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm text-muted-foreground">
                              ₹{(adv.usedAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm font-medium text-green-700 dark:text-green-400">
                              ₹{(available / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-sm">{adv.paymentMethod}</TableCell>
                            <TableCell>
                              <Badge variant={statusColor as any} className="text-xs" data-testid={`badge-advance-status-${adv.id}`}>
                                {adv.status === 'active' ? 'Active' : adv.status === 'fully_used' ? 'Fully Used' : 'Cancelled'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {canCreate && adv.status === 'active' && available > 0 && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setSelectedAdvance(adv);
                                      setApplyAmount((available / 100).toFixed(2));
                                      setShowApplyAdvanceDialog(true);
                                    }}
                                    data-testid={`button-apply-advance-${adv.id}`}
                                  >
                                    Apply
                                  </Button>
                                )}
                                {showAdminTools && adv.status === 'active' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-destructive"
                                    onClick={() => cancelAdvanceMutation.mutate(adv.id)}
                                    disabled={cancelAdvanceMutation.isPending}
                                    data-testid={`button-cancel-advance-${adv.id}`}
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Summary */}
              {(prepaymentData as any[]).length > 0 && (
                <div className="flex justify-end pt-2 border-t">
                  <div className="text-sm text-right space-y-1">
                    <div className="text-muted-foreground">
                      Total Advance Payments: <span className="font-medium text-foreground">
                        ₹{((prepaymentData as any[]).reduce((s: number, a: any) => s + a.amount, 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Total Available Balance: <span className="font-semibold text-green-700 dark:text-green-400">
                        ₹{((prepaymentData as any[]).reduce((s: number, a: any) => s + Math.max(0, a.amount - a.usedAmount), 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Advance Payment Dialog */}
      <Dialog open={showAdvanceDialog} onOpenChange={setShowAdvanceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Advance Payment</DialogTitle>
            <DialogDescription>
              Record a payment received from a customer that is not linked to any specific invoice. You can apply it to invoices later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer *</label>
              <Popover open={advVendorOpen} onOpenChange={setAdvVendorOpen} modal>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={advVendorOpen}
                    className="w-full justify-between font-normal"
                    data-testid="trigger-adv-vendor"
                  >
                    {advForm.vendorId
                      ? customerVendors.find((v: any) => v.id === advForm.vendorId)?.vendorName ?? "Select customer..."
                      : "Select customer..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
                  <Command>
                    <CommandInput placeholder="Search customer..." />
                    <CommandList>
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        {customerVendors.map((v: any) => (
                          <CommandItem
                            key={v.id}
                            value={v.vendorName}
                            onSelect={() => {
                              setAdvForm(f => ({ ...f, vendorId: v.id }));
                              setAdvVendorOpen(false);
                            }}
                            data-testid={`vendor-option-${v.id}`}
                          >
                            <Check
                              className={cn("mr-2 h-4 w-4", advForm.vendorId === v.id ? "opacity-100" : "opacity-0")}
                            />
                            {v.vendorName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Date *</label>
                <Input
                  type="date"
                  value={advForm.receiptDate}
                  onChange={(e) => setAdvForm(f => ({ ...f, receiptDate: e.target.value }))}
                  data-testid="input-adv-date"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={advForm.amount}
                  onChange={(e) => setAdvForm(f => ({ ...f, amount: e.target.value }))}
                  data-testid="input-adv-amount"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method *</label>
                <Select
                  value={advForm.paymentMethod}
                  onValueChange={(v) => setAdvForm(f => ({ ...f, paymentMethod: v }))}
                  data-testid="select-adv-method"
                >
                  <SelectTrigger data-testid="trigger-adv-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="RTGS">RTGS</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reference No.</label>
                <Input
                  placeholder="UTR / Cheque no."
                  value={advForm.referenceNumber}
                  onChange={(e) => setAdvForm(f => ({ ...f, referenceNumber: e.target.value }))}
                  data-testid="input-adv-ref"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks</label>
              <Textarea
                placeholder="Optional notes..."
                value={advForm.remarks}
                onChange={(e) => setAdvForm(f => ({ ...f, remarks: e.target.value }))}
                data-testid="input-adv-remarks"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdvanceDialog(false)}>Cancel</Button>
            <Button
              onClick={() => createAdvanceMutation.mutate()}
              disabled={createAdvanceMutation.isPending || !advForm.vendorId || !advForm.amount || parseFloat(advForm.amount) <= 0}
              data-testid="button-submit-advance"
            >
              {createAdvanceMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Apply Advance to Invoice Dialog */}
      <Dialog open={showApplyAdvanceDialog} onOpenChange={setShowApplyAdvanceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Advance to Invoice</DialogTitle>
            <DialogDescription>
              {selectedAdvance && (
                <>Advance {selectedAdvance.advanceNumber} — Available: ₹{((selectedAdvance.amount - selectedAdvance.usedAmount) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Invoice *</label>
              <Select value={applyInvoiceId} onValueChange={setApplyInvoiceId} data-testid="select-apply-invoice">
                <SelectTrigger data-testid="trigger-apply-invoice">
                  <SelectValue placeholder="Select invoice..." />
                </SelectTrigger>
                <SelectContent>
                  {(vendorPendingInvoices as any[]).map((inv: any) => {
                    const outstanding = inv.totalAmount - (inv.amountReceived || 0);
                    return (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — ₹{(outstanding / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} outstanding
                      </SelectItem>
                    );
                  })}
                  {(vendorPendingInvoices as any[]).length === 0 && (
                    <SelectItem value="__none__" disabled>No pending invoices found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount to Apply (₹) *</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={applyAmount}
                onChange={(e) => setApplyAmount(e.target.value)}
                data-testid="input-apply-amount"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Remarks</label>
              <Input
                placeholder="Optional notes..."
                value={applyRemarks}
                onChange={(e) => setApplyRemarks(e.target.value)}
                data-testid="input-apply-remarks"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowApplyAdvanceDialog(false); setSelectedAdvance(null); }}>Cancel</Button>
            <Button
              onClick={() => applyAdvanceMutation.mutate()}
              disabled={applyAdvanceMutation.isPending || !applyInvoiceId || applyInvoiceId === '__none__' || !applyAmount || parseFloat(applyAmount) <= 0}
              data-testid="button-submit-apply"
            >
              {applyAdvanceMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Apply Advance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New FIFO Payment</DialogTitle>
            <DialogDescription>
              Allocate payment across outstanding invoices using First-In-First-Out
            </DialogDescription>
          </DialogHeader>

          <FIFOPaymentAllocation 
            onSuccess={() => {
              setShowPaymentDialog(false);
              queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments/history'] });
              queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments/bulk-allocations'] });
              queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
            }} 
            onCancel={() => setShowPaymentDialog(false)} 
          />
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>
              Update payment details or adjust amount
            </DialogDescription>
          </DialogHeader>

          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Cheque">Cheque</SelectItem>
                          <SelectItem value="NEFT">NEFT</SelectItem>
                          <SelectItem value="RTGS">RTGS</SelectItem>
                          <SelectItem value="UPI">UPI</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {editForm.watch("amount") !== (editPayment?.amount / 100).toFixed(2) && (
                <FormField
                  control={editForm.control}
                  name="amountChangeReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reason for Amount Change</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Correction, TDS adjustment" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editMutation.isPending}
                >
                  {editMutation.isPending ? "Updating..." : "Update Payment"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelPaymentId} onOpenChange={() => setCancelPaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the payment and restore the outstanding balance on the linked invoices.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <FormLabel>Cancellation Remarks</FormLabel>
            <Textarea
              value={cancellationRemarks}
              onChange={(e) => setCancellationRemarks(e.target.value)}
              placeholder="Provide a reason for cancellation..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelPayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!cancellationRemarks.trim() || cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancellation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
