import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Edit, Mail, FileText, Printer, Star, Receipt, RefreshCw, Calculator, CreditCard, Lock, PackageCheck, PenTool, XCircle, AlertTriangle, ClipboardList } from "lucide-react";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Invoice, InvoiceItem, Product, Gatepass, InvoicePayment, GatepassItem, FinishedGood } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PrintableInvoice from "@/components/PrintableInvoice";
import InvoiceForm from "@/components/InvoiceForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { GlobalHeader } from "@/components/GlobalHeader";
import { CreateCreditNoteDialog } from "@/components/CreateCreditNoteDialog";
import { CorrectAndCreditDialog } from "@/components/CorrectAndCreditDialog";
import { CorrectAndDebitDialog } from "@/components/CorrectAndDebitDialog";
import { QuickFullCreditDialog } from "@/components/QuickFullCreditDialog";

interface Vendor {
  id: string;
  vendorCode: string;
  vendorName: string;
  vendorType: string;
  [key: string]: any;
}

interface VendorType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: number;
}

interface VendorVendorType {
  id: string;
  vendorId: string;
  vendorTypeId: string;
  isPrimary: number;
  vendorType?: VendorType;
}

interface InvoiceDetailProps {
  showHeader?: boolean;
}

export default function InvoiceDetail({ showHeader = true }: InvoiceDetailProps = {}) {
  const { id } = useParams<{ id: string }>();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { logoutMutation, user } = useAuth();
  // Call usePermissions early to avoid hooks ordering violation with early returns
  const { hasPermission, role: permissionRole } = usePermissions();
  const [isCreditNoteDialogOpen, setIsCreditNoteDialogOpen] = useState(false);
  const [isCorrectAndCreditOpen, setIsCorrectAndCreditOpen] = useState(false);
  const [isCorrectAndDebitOpen, setIsCorrectAndDebitOpen] = useState(false);
  const [isQuickFullCreditOpen, setIsQuickFullCreditOpen] = useState(false);
  const [isCancelReissueConfirmOpen, setIsCancelReissueConfirmOpen] = useState(false);
  const [isCancelOnlyConfirmOpen, setIsCancelOnlyConfirmOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isReissueFormOpen, setIsReissueFormOpen] = useState(false);
  const [reissueInvoiceData, setReissueInvoiceData] = useState<any>(null);
  const [isApplyAdvanceOpen, setIsApplyAdvanceOpen] = useState(false);
  const [applyAdvanceAmount, setApplyAdvanceAmount] = useState('');
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  // Check if we're viewing a cancelled invoice (from cancelled invoices page)
  const urlParams = new URLSearchParams(window.location.search);
  const includeCancelled = urlParams.get('includeCancelled') === 'true';

  const { data: invoice, isLoading: isLoadingInvoice } = useQuery<Invoice>({
    queryKey: ['/api/invoices', id, includeCancelled],
    queryFn: async () => {
      const url = includeCancelled 
        ? `/api/invoices/${id}?includeCancelled=true`
        : `/api/invoices/${id}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Invoice not found');
      }
      return response.json();
    },
  });

  const { data: items = [] } = useQuery<InvoiceItem[]>({
    queryKey: ['/api/invoice-items', id, includeCancelled],
    queryFn: async () => {
      const url = includeCancelled 
        ? `/api/invoice-items/${id}?includeCancelled=true`
        : `/api/invoice-items/${id}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: gatepassesResponse } = useQuery<{ data: Gatepass[] } | Gatepass[]>({
    queryKey: ['/api/gatepasses'],
  });

  // Handle both paginated response {data: [...]} and plain array formats
  const gatepasses = Array.isArray(gatepassesResponse) 
    ? gatepassesResponse 
    : (gatepassesResponse as any)?.data || [];

  // Find related gatepass early to fetch its items
  const safeGatepassesEarly = Array.isArray(gatepasses) ? gatepasses : [];
  const relatedGatepassId = safeGatepassesEarly.find(g => g.invoiceId === id)?.id;

  // Fetch gatepass items to show batch numbers
  const { data: gatepassItems = [] } = useQuery<GatepassItem[]>({
    queryKey: ['/api/gatepass-items', relatedGatepassId],
    enabled: !!relatedGatepassId,
  });

  // For reissued invoices, also fetch original invoice's gatepass items (for old data fallback)
  const originalInvoiceId = (invoice as any)?.originalInvoiceId;
  const originalGatepassId = originalInvoiceId 
    ? safeGatepassesEarly.find(g => g.invoiceId === originalInvoiceId)?.id 
    : null;
  
  const { data: originalGatepassItems = [] } = useQuery<GatepassItem[]>({
    queryKey: ['/api/gatepass-items', originalGatepassId],
    enabled: !!originalGatepassId,
  });

  // Get finished good IDs from both current and original gatepass items
  const currentFinishedGoodIds = gatepassItems.map(gi => gi.finishedGoodId).filter(Boolean);
  const originalFinishedGoodIds = originalGatepassItems.map(gi => gi.finishedGoodId).filter(Boolean);
  const finishedGoodIds = Array.from(new Set([...currentFinishedGoodIds, ...originalFinishedGoodIds]));

  // Fetch only the specific finished goods needed (for batch number fallback on old data)
  const { data: finishedGoods = [] } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods/by-ids', ...finishedGoodIds],
    queryFn: async () => {
      if (finishedGoodIds.length === 0) return [];
      const res = await fetch(`/api/finished-goods/by-ids/${finishedGoodIds.join(',')}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: finishedGoodIds.length > 0,
  });

  // Fetch all vendors to find the one matching this invoice's buyer
  // Note: This may fail for non-admin users, which is acceptable - they just won't see vendor type badges
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
    retry: false,
    throwOnError: false,
  });

  // Fetch all vendor-type assignments
  // Note: This may fail for non-admin users, which is acceptable
  const { data: allVendorTypeAssignments = [] } = useQuery<VendorVendorType[]>({
    queryKey: ['/api/vendor-vendor-types/batch'],
    retry: false,
    throwOnError: false,
  });

  // Fetch payment history for this invoice
  const { data: payments = [] } = useQuery<InvoicePayment[]>({
    queryKey: ['/api/invoice-payments', id],
    enabled: !!id,
  });

  // Fetch credit notes for this invoice
  const { data: creditNotes = [] } = useQuery<any[]>({
    queryKey: ['/api/credit-notes/invoice', id],
    queryFn: async () => {
      const res = await fetch(`/api/credit-notes/invoice/${id}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch debit notes for this invoice
  const { data: debitNotes = [] } = useQuery<any[]>({
    queryKey: ['/api/debit-notes/invoice', id],
    queryFn: async () => {
      const res = await fetch(`/api/debit-notes/invoice/${id}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch sales returns for this invoice
  const { data: invoiceSalesReturns = [] } = useQuery<any[]>({
    queryKey: ['/api/sales-returns/by-invoice', id],
    queryFn: async () => {
      const res = await fetch(`/api/sales-returns/by-invoice/${id}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  // Fetch linked Sales Order if exists
  const { data: linkedSalesOrder } = useQuery<any>({
    queryKey: ['/api/sales-orders', invoice?.salesOrderId],
    queryFn: async () => {
      if (!invoice?.salesOrderId) return null;
      const res = await fetch(`/api/sales-orders/${invoice.salesOrderId}`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!invoice?.salesOrderId,
  });

  // A "full return" blocks cancel/reissue and credit note actions to prevent double-crediting
  const hasFullReturn = invoiceSalesReturns.some((r: any) => r.returnType === 'full');

  // Restore invoice mutation
  const restoreInvoiceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/invoices/${id}/restore`, {});
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Invoice Restored",
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Restore Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Cancel & Reissue mutation - MUST be before early returns to avoid hooks ordering violation
  const cancelAndReissueMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/invoices/${id}/cancel-and-reissue`, {});
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Invoice Cancelled",
        description: data.message || "Invoice cancelled. Create a replacement now.",
      });
      
      // Store invoice data and open the reissue form popup
      if (data.invoiceData) {
        setReissueInvoiceData({
          ...data.invoiceData,
          items: data.invoiceItems || [],
        });
        setIsReissueFormOpen(true);
      }
      
      // Refresh the invoice list
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel & reissue invoice",
        variant: "destructive",
      });
    },
  });

  const cancelOnlyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/invoices/${id}/cancel`, { reason: cancelReason });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Invoice Cancelled",
        description: data.gatepassesCancelled > 0
          ? `Invoice ${data.invoiceNumber} and ${data.gatepassesCancelled} gatepass(es) cancelled. Inventory returned.`
          : `Invoice ${data.invoiceNumber} cancelled. Inventory returned.`,
      });
      setCancelReason('');
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gatepasses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finished-goods'] });
      navigate('/production-management?tab=invoices');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invoice",
        variant: "destructive",
      });
    },
  });

  const [isCancelGatepassConfirmOpen, setIsCancelGatepassConfirmOpen] = useState(false);

  const cancelGatepassMutation = useMutation({
    mutationFn: async () => {
      if (!relatedGatepassId) throw new Error("No gatepass found");
      await apiRequest('DELETE', `/api/gatepasses/${relatedGatepassId}`);
    },
    onSuccess: () => {
      toast({
        title: "Gatepass Cancelled",
        description: "Gatepass cancelled and stock returned to finished goods. You can create a new gatepass.",
      });
      setIsCancelGatepassConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/gatepasses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gatepass-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finished-goods'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel gatepass",
        variant: "destructive",
      });
    },
  });

  // Mark invoice as ready for gatepass mutation
  const markReadyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PATCH', `/api/invoices/${id}`, { 
        status: 'ready_for_gatepass' 
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices/available'] });
      toast({
        title: "Invoice Ready for Dispatch",
        description: "You can now create a gatepass for this invoice.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice status",
        variant: "destructive",
      });
    },
  });

  // Update invoice signature mutation
  const updateSignatureMutation = useMutation({
    mutationFn: async (signatureType: string) => {
      const response = await apiRequest('PATCH', `/api/invoices/${id}/signature`, { 
        signatureType 
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      toast({
        title: "Signature Updated",
        description: "Invoice signature has been changed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update signature",
        variant: "destructive",
      });
    },
  });

  // Find the vendor matching the buyer name - use Array.isArray for safety
  const safeVendors = Array.isArray(vendors) ? vendors : [];
  const matchingVendor = safeVendors.find(v => v.vendorName === invoice?.buyerName);
  
  // Get vendor types for this vendor
  const safeVendorTypeAssignments = Array.isArray(allVendorTypeAssignments) ? allVendorTypeAssignments : [];
  const vendorTypes = matchingVendor 
    ? safeVendorTypeAssignments.filter(a => a.vendorId === matchingVendor.id)
    : [];

  const { data: salesOrder } = useQuery<any>({
    queryKey: ['/api/sales-orders', invoice?.salesOrderId],
    enabled: !!invoice?.salesOrderId,
  });

  // Fetch available advance balance for this invoice's customer
  const { data: availableAdvancesData } = useQuery<{ advances: any[]; totalAvailable: number; count: number }>({
    queryKey: ['/api/customer-advances/available', matchingVendor?.id],
    queryFn: async () => {
      if (!matchingVendor?.id) return { advances: [], totalAvailable: 0, count: 0 };
      const res = await fetch(`/api/customer-advances/available/${matchingVendor.id}`, { credentials: 'include' });
      if (!res.ok) return { advances: [], totalAvailable: 0, count: 0 };
      return res.json();
    },
    enabled: !!matchingVendor?.id,
    retry: false,
    throwOnError: false,
  });

  const totalAvailableAdvance = availableAdvancesData?.totalAvailable ?? 0; // in paise

  // Mutation to apply advance to this invoice
  const applyAdvanceMutation = useMutation({
    mutationFn: async ({ advanceId, amount }: { advanceId: string; amount: number }) => {
      return apiRequest('POST', `/api/customer-advances/${advanceId}/apply`, {
        invoiceId: id,
        amount,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-advances/available', matchingVendor?.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer-advances'] });
      setIsApplyAdvanceOpen(false);
      setApplyAdvanceAmount('');
      toast({ title: 'Advance applied successfully' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to apply advance', description: err.message, variant: 'destructive' });
    },
  });

  const handleApplyAdvance = () => {
    const amountPaise = Math.round(parseFloat(applyAdvanceAmount) * 100);
    if (!amountPaise || amountPaise <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    if (!availableAdvancesData?.advances?.length) return;
    // Apply FIFO across available advances
    let remaining = amountPaise;
    const applyPromises = [];
    for (const adv of availableAdvancesData.advances) {
      if (remaining <= 0) break;
      const use = Math.min(remaining, adv.availableAmount);
      if (use > 0) {
        applyPromises.push(applyAdvanceMutation.mutateAsync({ advanceId: adv.id, amount: use }));
        remaining -= use;
      }
    }
    Promise.all(applyPromises).catch(() => {});
  };

  const sendEmailMutation = useMutation({
    mutationFn: async ({ toEmail, message }: { toEmail: string; message: string }) => {
      const res = await apiRequest("POST", `/api/invoices/${id}/send-email`, { toEmail, message });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invoice sent", description: `Invoice emailed to ${emailTo}` });
      setIsEmailDialogOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Failed to send email", description: err.message, variant: "destructive" });
    },
  });

  if (isLoadingInvoice) {
    return (
      <>
        {showHeader && <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />}
        <div className={showHeader ? "min-h-screen p-6 mt-16 flex items-center justify-center" : "min-h-screen p-6 flex items-center justify-center"}>
          <div className="text-muted-foreground">Loading invoice...</div>
        </div>
      </>
    );
  }

  if (!invoice) {
    return (
      <>
        {showHeader && <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />}
        <div className={showHeader ? "min-h-screen p-6 mt-16" : "min-h-screen p-6"}>
          <Card className="max-w-md mx-auto p-8 text-center">
            <h2 className="text-2xl font-bold text-destructive mb-4">Invoice Not Found</h2>
            <p className="text-muted-foreground mb-6">The requested invoice could not be found.</p>
            <Button onClick={() => navigate('/?tab=invoices')} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Invoices
            </Button>
          </Card>
        </div>
      </>
    );
  }

  // Use Array.isArray checks for safety
  const safeGatepasses = Array.isArray(gatepasses) ? gatepasses : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeItems = Array.isArray(items) ? items : [];
  
  const relatedGatepass = safeGatepasses.find(g => g.invoiceId === id);

  const getProductName = (productId: string | null): string => {
    if (!productId) return 'Unknown Product';
    const product = safeProducts.find(p => p.id === productId);
    return product?.productName || 'Unknown Product';
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
      draft: { label: 'Draft', variant: 'secondary' },
      ready_for_gatepass: { label: 'Ready for Gatepass', variant: 'default' },
      dispatched: { label: 'Dispatched', variant: 'outline' },
      delivered: { label: 'Delivered', variant: 'default' },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant} data-testid={`status-${status}`}>{config.label}</Badge>;
  };

  const formatCurrency = (amountInPaise: number): string => {
    return `₹${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleEdit = () => {
    navigate(`/?tab=invoices&edit=${id}`);
  };

  const handleGenerateGatepass = () => {
    navigate(`/dispatch-tracking?invoice=${id}`);
  };

  const handleEmail = () => {
    setEmailTo((invoice as any)?.email || '');
    setEmailMessage('');
    setIsEmailDialogOpen(true);
  };

  const handleCreditNoteSuccess = (creditNoteNumber: string) => {
    toast({
      title: "Credit Note Created",
      description: `Credit note ${creditNoteNumber} has been created successfully.`,
    });
    // Refresh invoice data to show updated outstanding balance
    queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
    queryClient.invalidateQueries({ queryKey: ['/api/credit-notes'] });
  };

  // hasPermission and permissionRole moved to top to avoid hooks ordering violation
  
  // Check permissions - 100% database driven, no role name checking
  // Check if user has invoice permissions
  const hasInvoiceCreatePermission = hasPermission('invoices', 'create');
  const hasInvoiceEditPermission = hasPermission('invoices', 'edit');
  // Check if user has credit note create permissions
  const hasCreditNotePermission = hasPermission('credit_notes', 'create');
  // Check if user has vendor debit note create permissions (for debit notes)
  const hasDebitNotePermission = hasPermission('vendor_debit_notes', 'create') || hasPermission('credit_notes', 'create');
  
  // All permission checks are based on database permissions only
  const canManageInvoices = hasInvoiceEditPermission;
  // For workflow progression (mark ready for dispatch), allow create OR edit permission
  const canProgressInvoiceWorkflow = hasInvoiceCreatePermission || hasInvoiceEditPermission;
  const canManageCreditNotes = hasCreditNotePermission;
  const canManageDebitNotes = hasDebitNotePermission;
  
  // Check if invoice is in current month
  // IMPORTANT: Must have invoice loaded to determine this correctly
  const isCurrentMonth = (): boolean => {
    if (!invoice || !invoice.invoiceDate) return true; // Default to current month if not loaded (safer - blocks credit/debit)
    const now = new Date();
    const invoiceDate = new Date(invoice.invoiceDate);
    // Compare month and year
    const isSameMonth = now.getMonth() === invoiceDate.getMonth() && 
                        now.getFullYear() === invoiceDate.getFullYear();
    return isSameMonth;
  };
  
  // GST Compliance Logic:
  // - Current month invoices: Use Cancel & Reissue (before GST filing)
  // - Previous month invoices: Use Credit Notes (after GST filing)
  const currentMonthCheck = isCurrentMonth();
  const isOldInvoice = invoice && invoice.invoiceDate ? !currentMonthCheck : false;
  
  // Check if invoice is active (not cancelled) - use Number() to handle string/number type
  const isActiveInvoice = invoice && Number(invoice.recordStatus) === 1;
  
  // Cancel & Reissue - only for current month invoices (and invoice must be loaded and active)
  // Blocked when a full sales return exists — goods are already back, no need to cancel/reissue
  const canCancelAndReissue = canManageInvoices && isActiveInvoice && currentMonthCheck && !hasFullReturn;
  
  // Credit Notes - only for previous month invoices (GST compliance) and active invoices
  // Blocked when a full sales return exists — credit would already have been issued via the return workflow
  // IMPORTANT: Only show these buttons when invoice is fully loaded AND is from a previous month AND is active
  const canCreateCreditNote = canManageCreditNotes && isActiveInvoice && isOldInvoice && !hasFullReturn;
  const canCorrectAndCredit = canManageCreditNotes && isActiveInvoice && isOldInvoice && !hasFullReturn;
  const canCorrectAndDebit = canManageDebitNotes && isActiveInvoice && isOldInvoice && !hasFullReturn;

  return (
    <>
      {showHeader && <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />}
      <div className={showHeader ? "min-h-screen p-6 mt-16 space-y-6" : "min-h-screen p-6 space-y-6"}>
        {/* Header */}
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Get current location/URL to check for tab param
              const searchParams = new URLSearchParams(window.location.search);
              const from = searchParams.get('from');
              
              if (from === 'cancelled') {
                navigate('/cancelled-invoices');
              } else if (from === 'dispatch') {
                navigate('/dispatch-tracking');
              } else if (from === 'customer_advance') {
                navigate('/customer-advances');
              } else if (from === 'vendor_history') {
                navigate('/vendor-history');
              } else {
                // Standard return to dashboard with invoices tab
                navigate('/?tab=invoices');
              }
            }}
            data-testid="button-back-to-dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Invoice Details</h1>
            <p className="text-muted-foreground mt-1">{invoice.invoiceNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Only show edit/email buttons for active invoices */}
          {isActiveInvoice && (
            <>
              {invoice.status === 'delivered' ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        data-testid="button-edit-invoice-disabled"
                      >
                        <Lock className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delivered invoices cannot be edited.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {currentMonthCheck 
                        ? "Use 'Cancel & Reissue' to make corrections." 
                        : "Use 'Credit Note' or 'Correct & Credit' for adjustments."}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  data-testid="button-edit-invoice"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              {/* Signature selector - works on locked invoices */}
              <Select
                value={(invoice as any).signatureType || 'default'}
                onValueChange={(value) => updateSignatureMutation.mutate(value)}
                disabled={updateSignatureMutation.isPending}
              >
                <SelectTrigger className="w-[140px] h-9" data-testid="select-signature-type">
                  <PenTool className="w-4 h-4 mr-2 flex-shrink-0" />
                  <SelectValue placeholder="Signature" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Signature 1</SelectItem>
                  <SelectItem value="alternate">Signature 2</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmail}
                data-testid="button-email-invoice"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            </>
          )}
          {/* Print is always available, even for cancelled invoices */}
          <PrintableInvoice invoice={invoice} />
          {canCreateCreditNote && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreditNoteDialogOpen(true)}
              data-testid="button-create-credit-note"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Create Credit Note
            </Button>
          )}
          {Number(invoice.recordStatus) === 0 && !invoice.replacedByInvoiceId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => restoreInvoiceMutation.mutate()}
              disabled={restoreInvoiceMutation.isPending}
              data-testid="button-restore-invoice"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${restoreInvoiceMutation.isPending ? 'animate-spin' : ''}`} />
              {restoreInvoiceMutation.isPending ? 'Restoring...' : 'Restore Invoice'}
            </Button>
          )}
          {canCancelAndReissue && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelReissueConfirmOpen(true)}
                disabled={cancelAndReissueMutation.isPending}
                data-testid="button-cancel-and-reissue"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${cancelAndReissueMutation.isPending ? 'animate-spin' : ''}`} />
                {cancelAndReissueMutation.isPending ? 'Cancelling...' : 'Cancel & Reissue'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelOnlyConfirmOpen(true)}
                disabled={cancelOnlyMutation.isPending}
                className="border-red-300 text-red-600"
                data-testid="button-cancel-only"
              >
                <XCircle className={`w-4 h-4 mr-2 ${cancelOnlyMutation.isPending ? 'animate-spin' : ''}`} />
                {cancelOnlyMutation.isPending ? 'Cancelling...' : 'Cancel Only'}
              </Button>
            </>
          )}
          {canCorrectAndCredit && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCorrectAndCreditOpen(true)}
                data-testid="button-correct-and-credit"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Correct & Credit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCorrectAndDebitOpen(true)}
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
                data-testid="button-correct-and-debit"
              >
                <Calculator className="w-4 h-4 mr-2" />
                Correct & Debit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsQuickFullCreditOpen(true)}
                data-testid="button-quick-full-credit"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Quick Full Credit
              </Button>
            </>
          )}
          {/* Show "Mark Ready for Dispatch" for draft invoices (active only) - requires create OR edit permission */}
          {canProgressInvoiceWorkflow && isActiveInvoice && invoice.status === 'draft' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => markReadyMutation.mutate()}
              disabled={markReadyMutation.isPending}
              data-testid="button-mark-ready"
            >
              <PackageCheck className={`w-4 h-4 mr-2 ${markReadyMutation.isPending ? 'animate-spin' : ''}`} />
              {markReadyMutation.isPending ? 'Updating...' : 'Mark Ready for Dispatch'}
            </Button>
          )}
          {/* Show "Generate Gatepass" for ready invoices without a gatepass (active only) */}
          {isActiveInvoice && !relatedGatepass && invoice.status === 'ready_for_gatepass' && (
            <Button
              variant="default"
              size="sm"
              onClick={handleGenerateGatepass}
              data-testid="button-generate-gatepass"
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Gatepass
            </Button>
          )}
        </div>
      </div>

      {/* Full Return Banner */}
      {hasFullReturn && isActiveInvoice && (
        <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 p-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-300">Full Sales Return on Record</p>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-0.5">
              A full return has been registered against this invoice. Cancel &amp; Reissue, Credit Note, and Debit Note actions are disabled to prevent double-crediting. Manage this through the Sales Returns module.
            </p>
          </div>
        </div>
      )}

      {/* Invoice Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice Number:</span>
              <span className="font-medium" data-testid="text-invoice-number">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium">{format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <span>{getStatusBadge(invoice.status)}</span>
            </div>
            {relatedGatepass && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gatepass:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => navigate(`/gatepasses/${relatedGatepass.id}`)}
                  data-testid="link-gatepass"
                >
                  {relatedGatepass.gatepassNumber}
                </Button>
              </div>
            )}
            {invoice.salesOrderId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sales Order:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0"
                  asChild
                  data-testid="link-sales-order"
                >
                  <Link href={`/sales-orders/${invoice.salesOrderId}`}>
                    {salesOrder?.soNumber || 'View Sales Order'}
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Buyer Information */}
        <Card>
          <CardHeader>
            <CardTitle>Buyer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{invoice.buyerName}</span>
            </div>
            {vendorTypes.length > 0 && (
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Classifications:</span>
                <div className="flex gap-1 flex-wrap justify-end" data-testid="vendor-types-badges">
                  {vendorTypes.map((vt) => (
                    <Badge
                      key={vt.id}
                      variant={vt.isPrimary === 1 ? "default" : "secondary"}
                      className="text-xs"
                      data-testid={`vendor-type-badge-${vt.vendorTypeId}`}
                    >
                      {vt.isPrimary === 1 && <Star className="h-2 w-2 mr-1 fill-current" />}
                      {vt.vendorType?.name || vt.vendorType?.code || 'Unknown'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {invoice.buyerGstin && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">GSTIN:</span>
                <span className="font-mono text-sm">{invoice.buyerGstin}</span>
              </div>
            )}
            {invoice.buyerState && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">State:</span>
                <span>{invoice.buyerState} ({invoice.buyerStateCode})</span>
              </div>
            )}
            {invoice.buyerAddress && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Address:</span>
                <span className="text-sm">{invoice.buyerAddress}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
          <CardDescription>Detailed breakdown of items in this invoice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">#</th>
                  <th className="text-left p-3 font-semibold">Item</th>
                  <th className="text-left p-3 font-semibold">HSN/SAC</th>
                  <th className="text-right p-3 font-semibold">Qty</th>
                  <th className="text-right p-3 font-semibold">Unit Price</th>
                  <th className="text-right p-3 font-semibold">Taxable Amount</th>
                  <th className="text-right p-3 font-semibold">GST</th>
                  <th className="text-right p-3 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {safeItems.map((item, index) => {
                  const totalGst = item.cgstAmount + item.sgstAmount + item.igstAmount;
                  const gstRate = (item.cgstRate + item.sgstRate + item.igstRate) / 100;
                  
                  // Find batch numbers for this product from gatepass items
                  // Fallback chain: gatepass item -> finished goods -> original gatepass items (for old cancel & reissue)
                  const productBatchItems = gatepassItems.filter(gi => gi.productId === item.productId);
                  const batchNumbers = productBatchItems
                    .map(gi => {
                      // 1. Use gatepass item's batchNumber if available (new records)
                      if (gi.batchNumber) return gi.batchNumber;
                      // 2. Fallback to finished goods batchNumber or originalBatchNumber
                      const fg = finishedGoods.find(f => f.id === gi.finishedGoodId);
                      if (fg?.batchNumber && !fg.batchNumber.startsWith('CANCEL-')) return fg.batchNumber;
                      if ((fg as any)?.originalBatchNumber) return (fg as any).originalBatchNumber;
                      // 3. For old cancel & reissue, check original gatepass items
                      const originalItem = originalGatepassItems.find(ogi => ogi.productId === item.productId);
                      if (originalItem) {
                        if (originalItem.batchNumber) return originalItem.batchNumber;
                        const origFg = finishedGoods.find(f => f.id === originalItem.finishedGoodId);
                        return origFg?.batchNumber || (origFg as any)?.originalBatchNumber;
                      }
                      return null;
                    })
                    .filter(Boolean)
                    .join(', ');

                  return (
                    <tr key={item.id} className="border-b" data-testid={`row-item-${index + 1}`}>
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">
                        <div className="font-medium">{item.description}</div>
                        <div className="text-sm text-muted-foreground">{getProductName(item.productId)}</div>
                        {batchNumbers && (
                          <div className="text-xs font-mono text-primary mt-1">
                            Batch: {batchNumbers}
                          </div>
                        )}
                      </td>
                      <td className="p-3">{item.hsnCode || item.sacCode || '-'}</td>
                      <td className="p-3 text-right">{item.quantity}</td>
                      <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-3 text-right">{formatCurrency(item.taxableAmount)}</td>
                      <td className="p-3 text-right">
                        <div>{gstRate.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">{formatCurrency(totalGst)}</div>
                      </td>
                      <td className="p-3 text-right font-medium">{formatCurrency(item.totalAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Loaded Batch Numbers - Show when gatepass exists */}
      {relatedGatepass && gatepassItems.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Loaded Batch Numbers
                </CardTitle>
                <CardDescription>
                  Batch numbers loaded in vehicle for Gatepass {relatedGatepass.gatepassNumber}
                </CardDescription>
              </div>
              {canCancelAndReissue && relatedGatepass.status === 'generated' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-300 text-red-600"
                  onClick={() => setIsCancelGatepassConfirmOpen(true)}
                  disabled={cancelGatepassMutation.isPending}
                  data-testid="button-cancel-gatepass"
                >
                  <XCircle className={`w-4 h-4 mr-2 ${cancelGatepassMutation.isPending ? 'animate-spin' : ''}`} />
                  {cancelGatepassMutation.isPending ? 'Cancelling...' : 'Cancel Gatepass'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">#</th>
                    <th className="text-left p-3 font-semibold">Product</th>
                    <th className="text-left p-3 font-semibold">Batch Number</th>
                    <th className="text-right p-3 font-semibold">Quantity Dispatched</th>
                  </tr>
                </thead>
                <tbody>
                  {gatepassItems.map((gpItem, index) => {
                    const product = safeProducts.find(p => p.id === gpItem.productId);
                    const fg = finishedGoods.find(f => f.id === gpItem.finishedGoodId);
                    
                    // Get batch number with fallback chain for old cancel & reissue
                    let batchNumber = '-';
                    // 1. Use gatepass item's batchNumber if available (new records)
                    if (gpItem.batchNumber) {
                      batchNumber = gpItem.batchNumber;
                    }
                    // 2. Fallback to finished goods (skip CANCEL- prefixed batches)
                    else if (fg?.batchNumber && !fg.batchNumber.startsWith('CANCEL-')) {
                      batchNumber = fg.batchNumber;
                    }
                    // 3. Check originalBatchNumber on finished goods
                    else if ((fg as any)?.originalBatchNumber) {
                      batchNumber = (fg as any).originalBatchNumber;
                    }
                    // 4. For old cancel & reissue, check original invoice's gatepass items
                    else {
                      const originalItem = originalGatepassItems.find(ogi => ogi.productId === gpItem.productId);
                      if (originalItem) {
                        if (originalItem.batchNumber) {
                          batchNumber = originalItem.batchNumber;
                        } else {
                          const origFg = finishedGoods.find(f => f.id === originalItem.finishedGoodId);
                          batchNumber = origFg?.batchNumber || (origFg as any)?.originalBatchNumber || '-';
                        }
                      }
                    }
                    return (
                      <tr key={gpItem.id} className="border-b" data-testid={`row-batch-${index + 1}`}>
                        <td className="p-3">{index + 1}</td>
                        <td className="p-3">{product?.productName || 'Unknown Product'}</td>
                        <td className="p-3">
                          <Badge variant="outline" className="font-mono">
                            {batchNumber}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">{gpItem.quantityDispatched}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tax Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tax Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.cgstAmount > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CGST:</span>
                  <span className="font-medium">{formatCurrency(invoice.cgstAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SGST:</span>
                  <span className="font-medium">{formatCurrency(invoice.sgstAmount)}</span>
                </div>
              </>
            )}
            {invoice.igstAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IGST:</span>
                <span className="font-medium">{formatCurrency(invoice.igstAmount)}</span>
              </div>
            )}
            {invoice.roundOff !== 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Round Off:</span>
                <span className="font-medium">{formatCurrency(invoice.roundOff)}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between text-lg">
              <span className="font-semibold">Grand Total:</span>
              <span className="font-bold" data-testid="text-grand-total">{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(() => {
              const writeOffTotal = payments.filter(p => p.paymentType === 'Write-off').reduce((sum, p) => sum + p.amount, 0);
              const actualReceived = Math.max(0, (invoice.amountReceived || 0) - writeOffTotal);
              return (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount Received:</span>
                    <span className="font-medium text-green-600">{formatCurrency(actualReceived)}</span>
                  </div>
                  {writeOffTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Written Off:</span>
                      <span className="font-medium text-slate-500">{formatCurrency(writeOffTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Balance Due:</span>
                    <span className="font-medium text-orange-600">
                      {formatCurrency(invoice.totalAmount - (invoice.amountReceived || 0))}
                    </span>
                  </div>
                  {totalAvailableAdvance > 0 && invoice.paymentStatus !== 'paid' && invoice.status !== 'cancelled' && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-green-700 dark:text-green-400">Advance Available</div>
                          <div className="text-xs text-muted-foreground">
                            {availableAdvancesData!.count} record{availableAdvancesData!.count !== 1 ? 's' : ''} · can be applied to this invoice
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-green-700 dark:text-green-400">
                            {formatCurrency(totalAvailableAdvance)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid="button-apply-advance"
                            onClick={() => {
                              const balanceDue = invoice.totalAmount - (invoice.amountReceived || 0);
                              const maxApply = Math.min(totalAvailableAdvance / 100, balanceDue / 100);
                              setApplyAdvanceAmount(maxApply.toFixed(2));
                              setIsApplyAdvanceOpen(true);
                            }}
                          >
                            Apply
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
            {invoice.bankName && (
              <>
                <Separator />
                <div className="text-sm space-y-2">
                  <div className="font-semibold">Bank Details:</div>
                  <div><span className="text-muted-foreground">Bank:</span> {invoice.bankName}</div>
                  {invoice.bankAccountNumber && (
                    <div><span className="text-muted-foreground">A/C:</span> {invoice.bankAccountNumber}</div>
                  )}
                  {invoice.bankIfscCode && (
                    <div><span className="text-muted-foreground">IFSC:</span> {invoice.bankIfscCode}</div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      {payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment History
              <Badge variant="secondary">{payments.length}</Badge>
            </CardTitle>
            <CardDescription>All recorded payments for this invoice</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <TableCell>
                        {format(new Date(payment.paymentDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className={payment.paymentType === 'Write-off' ? 'text-destructive font-medium' : 'text-green-600 font-medium'}>
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.paymentType === 'Write-off' ? 'destructive' : payment.paymentType === 'Full' ? 'default' : 'secondary'}>
                          {payment.paymentType}
                        </Badge>
                      </TableCell>
                      <TableCell>{payment.paymentMethod}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {payment.referenceNumber || '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={payment.remarks || ''}>
                        {payment.remarks || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice History - Credit Notes, Debit Notes, Cancellation, Reissue */}
      {(creditNotes.length > 0 || debitNotes.length > 0 || invoice.recordStatus === 0 || (invoice as any).originalInvoiceId) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice History
            </CardTitle>
            <CardDescription>Credit notes, debit notes, and status changes for this invoice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cancellation Status */}
            {invoice.recordStatus === 0 && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">CANCELLED</Badge>
                  <span className="text-sm text-muted-foreground">
                    This invoice has been cancelled
                    {(invoice as any).cancelledAt && (
                      <> on {format(new Date((invoice as any).cancelledAt), 'dd MMM yyyy, HH:mm')}</>
                    )}
                  </span>
                </div>
                {(invoice as any).replacedByInvoiceId && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Replaced by: </span>
                    <Button 
                      variant="ghost" 
                      className="p-0 h-auto text-primary underline hover:no-underline"
                      onClick={() => navigate(`/invoice/${(invoice as any).replacedByInvoiceId}`)}
                      data-testid="link-replacement-invoice"
                    >
                      View Replacement Invoice
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Original Invoice Link (for reissued invoices) */}
            {(invoice as any).originalInvoiceId && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-blue-500 text-blue-600">REISSUED</Badge>
                  <span className="text-sm text-muted-foreground">
                    This invoice was created to replace a cancelled invoice
                  </span>
                </div>
                <div className="text-sm mt-2">
                  <span className="text-muted-foreground">Original cancelled invoice: </span>
                  <Button 
                    variant="ghost" 
                    className="p-0 h-auto text-primary underline hover:no-underline"
                    onClick={() => navigate(`/invoice/${(invoice as any).originalInvoiceId}`)}
                    data-testid="link-original-invoice"
                  >
                    View Original Invoice
                  </Button>
                </div>
              </div>
            )}

            {/* Credit Notes */}
            {creditNotes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  Credit Notes
                  <Badge variant="secondary">{creditNotes.length}</Badge>
                </h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Credit Note #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditNotes.map((cn: any) => (
                        <TableRow key={cn.id} data-testid={`row-credit-note-${cn.id}`}>
                          <TableCell className="font-medium">{cn.noteNumber}</TableCell>
                          <TableCell>{cn.creditDate ? format(new Date(cn.creditDate), 'dd MMM yyyy') : '-'}</TableCell>
                          <TableCell>{cn.reason || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={cn.status === 'approved' ? 'default' : cn.status === 'draft' ? 'secondary' : 'outline'}>
                              {cn.status || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-destructive font-medium">
                            -{formatCurrency(cn.grandTotal || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Debit Notes */}
            {debitNotes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  Debit Notes
                  <Badge variant="secondary">{debitNotes.length}</Badge>
                </h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Debit Note #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {debitNotes.map((dn: any) => (
                        <TableRow key={dn.id} data-testid={`row-debit-note-${dn.id}`}>
                          <TableCell className="font-medium">{dn.noteNumber}</TableCell>
                          <TableCell>{dn.debitDate ? format(new Date(dn.debitDate), 'dd MMM yyyy') : '-'}</TableCell>
                          <TableCell>{dn.reason || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={dn.status === 'approved' ? 'default' : dn.status === 'draft' ? 'secondary' : 'outline'}>
                              {dn.status || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            +{formatCurrency(dn.grandTotal || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* No history message */}
            {creditNotes.length === 0 && debitNotes.length === 0 && invoice.recordStatus !== 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No credit notes or debit notes for this invoice.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Remarks */}
      {invoice.remarks && (
        <Card>
          <CardHeader>
            <CardTitle>Remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{invoice.remarks}</p>
          </CardContent>
        </Card>
      )}

      {/* Credit Note Dialog */}
      <CreateCreditNoteDialog
        open={isCreditNoteDialogOpen}
        onOpenChange={setIsCreditNoteDialogOpen}
        invoiceId={id!}
        invoiceNumber={invoice.invoiceNumber}
        invoiceItems={safeItems}
        onSuccess={handleCreditNoteSuccess}
      />

      {/* Correct & Credit Dialog */}
      <CorrectAndCreditDialog
        open={isCorrectAndCreditOpen}
        onOpenChange={setIsCorrectAndCreditOpen}
        invoiceId={id!}
        invoiceNumber={invoice.invoiceNumber}
        invoiceItems={safeItems}
        cgstRate={safeItems[0]?.cgstRate || 0}
        sgstRate={safeItems[0]?.sgstRate || 0}
        igstRate={safeItems[0]?.igstRate || 0}
        onSuccess={handleCreditNoteSuccess}
      />

      {/* Correct & Debit Dialog */}
      <CorrectAndDebitDialog
        open={isCorrectAndDebitOpen}
        onOpenChange={setIsCorrectAndDebitOpen}
        invoiceId={id!}
        invoiceNumber={invoice.invoiceNumber}
        invoiceItems={safeItems}
        cgstRate={safeItems[0]?.cgstRate || 0}
        sgstRate={safeItems[0]?.sgstRate || 0}
        igstRate={safeItems[0]?.igstRate || 0}
        onSuccess={(debitNoteNumber) => {
          toast({
            title: "Debit Note Created",
            description: `Debit note ${debitNoteNumber} has been created successfully.`,
          });
          queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
          queryClient.invalidateQueries({ queryKey: ['/api/debit-notes'] });
        }}
      />

      {/* Quick Full Credit Dialog */}
      <QuickFullCreditDialog
        open={isQuickFullCreditOpen}
        onOpenChange={setIsQuickFullCreditOpen}
        invoiceId={id!}
        invoiceNumber={invoice.invoiceNumber}
        invoiceItems={safeItems}
        subtotal={invoice.subtotal}
        cgstAmount={invoice.cgstAmount}
        sgstAmount={invoice.sgstAmount}
        igstAmount={invoice.igstAmount}
        grandTotal={invoice.totalAmount}
        buyerName={invoice.buyerName}
        onSuccess={handleCreditNoteSuccess}
      />

      {/* Cancel & Reissue Confirmation Dialog */}
      <AlertDialog open={isCancelReissueConfirmOpen} onOpenChange={setIsCancelReissueConfirmOpen}>
        <AlertDialogContent data-testid="dialog-cancel-reissue-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel & Reissue Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel invoice <strong>{invoice.invoiceNumber}</strong>? 
              This will permanently mark the invoice as cancelled and redirect you to create a new replacement invoice.
              {relatedGatepass && (
                <>
                  <br /><br />
                  <strong>Note:</strong> The associated gatepass ({relatedGatepass.gatepassNumber}) will also be cancelled.
                </>
              )}
              <br /><br />
              <strong>This action cannot be undone.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reissue-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelAndReissueMutation.mutate()}
              disabled={cancelAndReissueMutation.isPending}
              data-testid="button-cancel-reissue-confirm"
            >
              {cancelAndReissueMutation.isPending ? 'Cancelling...' : 'Yes, Cancel & Reissue'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Gatepass Only Confirmation Dialog */}
      <AlertDialog open={isCancelGatepassConfirmOpen} onOpenChange={setIsCancelGatepassConfirmOpen}>
        <AlertDialogContent data-testid="dialog-cancel-gatepass-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Gatepass</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  Are you sure you want to cancel gatepass <strong>{relatedGatepass?.gatepassNumber}</strong>?
                </p>
                <p className="mt-2">This will:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Cancel the gatepass only (invoice stays active)</li>
                  <li>Return all dispatched stock back to finished goods inventory</li>
                  <li>Reset invoice status so you can create a new gatepass</li>
                </ul>
                <p className="mt-3 font-semibold">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-gatepass-dismiss">Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelGatepassMutation.mutate()}
              disabled={cancelGatepassMutation.isPending}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-cancel-gatepass-confirm"
            >
              {cancelGatepassMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Gatepass'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Only Confirmation Dialog */}
      <AlertDialog open={isCancelOnlyConfirmOpen} onOpenChange={(open) => { setIsCancelOnlyConfirmOpen(open); if (!open) setCancelReason(''); }}>
        <AlertDialogContent data-testid="dialog-cancel-only-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invoice</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p>
                  Are you sure you want to cancel invoice <strong>{invoice?.invoiceNumber}</strong>? 
                  This will permanently mark the invoice as cancelled and return all inventory.
                </p>
                {relatedGatepass && (
                  <p className="mt-2 font-semibold text-destructive">
                    The associated gatepass ({relatedGatepass.gatepassNumber}) will also be cancelled automatically.
                  </p>
                )}
                <div className="mt-3">
                  <label className="text-sm font-medium">Reason for cancellation (optional)</label>
                  <Input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Enter reason..."
                    className="mt-1"
                    data-testid="input-cancel-reason"
                  />
                </div>
                <p className="mt-3 font-semibold">This action cannot be undone.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-only-dismiss">Go Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelOnlyMutation.mutate()}
              disabled={cancelOnlyMutation.isPending}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-cancel-only-confirm"
            >
              {cancelOnlyMutation.isPending ? 'Cancelling...' : 'Yes, Cancel Invoice'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reissue Invoice Form Dialog */}
      <Dialog open={isReissueFormOpen} onOpenChange={setIsReissueFormOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" data-testid="dialog-reissue-invoice-form">
          <DialogHeader>
            <DialogTitle>Create Replacement Invoice</DialogTitle>
          </DialogHeader>
          {reissueInvoiceData && (
            <InvoiceForm 
              invoice={reissueInvoiceData}
              isReissueMode={true}
              onClose={() => {
                setIsReissueFormOpen(false);
                setReissueInvoiceData(null);
                // Navigate back to production management after closing
                navigate('/production-management?tab=invoices');
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Apply Advance Payment Dialog */}
      <Dialog open={isApplyAdvanceOpen} onOpenChange={setIsApplyAdvanceOpen}>
        <DialogContent className="max-w-sm" data-testid="dialog-apply-advance">
          <DialogHeader>
            <DialogTitle>Apply Advance to Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground">
              Available balance:{' '}
              <span className="font-semibold text-green-600">
                {formatCurrency(totalAvailableAdvance)}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Balance due:{' '}
              <span className="font-semibold text-orange-600">
                {formatCurrency(invoice ? invoice.totalAmount - (invoice.amountReceived || 0) : 0)}
              </span>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Amount to Apply (₹)</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={applyAdvanceAmount}
                onChange={(e) => setApplyAdvanceAmount(e.target.value)}
                data-testid="input-apply-advance-amount"
                placeholder="Enter amount"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsApplyAdvanceOpen(false)} data-testid="button-cancel-apply-advance">
                Cancel
              </Button>
              <Button
                onClick={handleApplyAdvance}
                disabled={applyAdvanceMutation.isPending}
                data-testid="button-confirm-apply-advance"
              >
                {applyAdvanceMutation.isPending ? 'Applying...' : 'Apply'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Invoice Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent data-testid="dialog-email-invoice">
          <DialogHeader>
            <DialogTitle>Email Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="email-to">Recipient Email</Label>
              <Input
                id="email-to"
                type="email"
                placeholder="customer@example.com"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                data-testid="input-email-to"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-message">Message (optional)</Label>
              <Textarea
                id="email-message"
                placeholder="Add a personal note to the email..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={3}
                data-testid="input-email-message"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The invoice details will be included in the email body.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => sendEmailMutation.mutate({ toEmail: emailTo, message: emailMessage })}
              disabled={!emailTo || sendEmailMutation.isPending}
              data-testid="button-send-email-confirm"
            >
              {sendEmailMutation.isPending ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
