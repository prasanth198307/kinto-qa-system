import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, X, FileText, Search, Filter, Check, ChevronsUpDown, Pencil, ChevronDown, ChevronRight, Link2, CircleCheck, AlertTriangle, CircleDashed, AlertCircle, ArrowLeft } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

const fifoPaymentSchema = z.object({
  vendorId: z.string().min(1, "Please select a vendor"),
  amount: z.string().min(1, "Payment amount is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["Cash", "Cheque", "NEFT", "RTGS", "UPI", "Other"]),
  referenceNumber: z.string().optional(),
  bankName: z.string().optional(),
  remarks: z.string().optional(),
});

const editPaymentSchema = z.object({
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["Cash", "Cheque", "NEFT", "RTGS", "UPI", "Other"]),
  referenceNumber: z.string().optional(),
  bankName: z.string().optional(),
  remarks: z.string().optional(),
  amount: z.string().optional(),
  amountChangeReason: z.string().optional(),
});

type FIFOPaymentFormData = z.infer<typeof fifoPaymentSchema>;
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
        const sourceData = ev.sourceRow ? JSON.parse(ev.sourceRow) : {};
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
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('payment_management', 'create');
  const canEdit = hasPermission('payment_management', 'edit');
  
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [allocationPreview, setAllocationPreview] = useState<any>(null);
  const [cancelPaymentId, setCancelPaymentId] = useState<string | null>(null);
  const [cancellationRemarks, setCancellationRemarks] = useState("");
  const [vendorPopoverOpen, setVendorPopoverOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  
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

  const { data: vendors = [] } = useQuery<any[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: banks = [] } = useQuery<any[]>({
    queryKey: ['/api/banks'],
  });

  const { data: paymentsData = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/invoice-payments/history'],
  });

  // Fetch pending invoices when vendor is selected (for preview in dialog)
  const { data: pendingData, isLoading: isPendingLoading } = useQuery<{
    vendorName: string;
    pendingInvoices: Array<{
      id: string;
      invoiceNumber: string;
      invoiceDate: string;
      totalAmount: number;
      totalPaid: number;
      outstanding: number;
    }>;
    totalOutstanding: number;
    invoiceCount: number;
  }>({
    queryKey: ['/api/vendors', selectedVendorId, 'pending-invoices'],
    enabled: !!selectedVendorId && showPaymentDialog,
  });

  const form = useForm<FIFOPaymentFormData>({
    resolver: zodResolver(fifoPaymentSchema),
    defaultValues: {
      vendorId: "",
      amount: "",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      paymentMethod: "Cash",
      referenceNumber: "",
      bankName: "",
      remarks: "",
    },
  });

  const allocateMutation = useMutation({
    mutationFn: async (data: FIFOPaymentFormData) => {
      const payload = {
        vendorId: data.vendorId,
        amount: Math.round(parseFloat(data.amount) * 100),
        paymentDate: new Date(data.paymentDate).toISOString(),
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        bankName: data.bankName,
        remarks: data.remarks,
      };
      const response = await apiRequest('POST', '/api/invoice-payments/allocate-fifo', payload);
      return await response.json(); // Parse the JSON response
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setAllocationPreview(data);
      toast({
        title: "Success",
        description: `Payment allocated to ${data?.allocations?.length || 0} invoice(s)`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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
        paymentDate: new Date(data.paymentDate).toISOString(),
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
      paymentDate: payment.paymentDate ? format(new Date(payment.paymentDate), "yyyy-MM-dd") : "",
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

  const onSubmit = (data: FIFOPaymentFormData) => {
    allocateMutation.mutate(data);
  };

  const handleCancelPayment = () => {
    if (cancelPaymentId && cancellationRemarks.trim()) {
      cancelMutation.mutate({ paymentId: cancelPaymentId, remarks: cancellationRemarks });
    }
  };

  const handleCloseAllocationPreview = () => {
    setAllocationPreview(null);
    setShowPaymentDialog(false);
    form.reset();
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
      <div className="flex items-center justify-between gap-4">
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
            <p className="text-sm text-muted-foreground">
              FIFO payment entry and payment history
            </p>
          </div>
        </div>
        {canCreate && (
          <Button onClick={() => setShowPaymentDialog(true)} data-testid="button-add-payment">
            <Plus className="w-4 h-4 mr-2" />
            New Payment
          </Button>
        )}
      </div>

      {/* Payment History */}
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
                    {vendor.name}
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
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment: any) => {
                    const isVyapaar = isVyapaarPayment(payment);
                    const isExpanded = expandedPayments.has(payment.id);
                    
                    return (
                      <>
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
                              {format(new Date(payment.paymentDate), 'dd MMM yyyy')}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{payment.vendorName}</TableCell>
                          <TableCell className="text-sm font-medium">{payment.invoiceNumber}</TableCell>
                          <TableCell className="text-sm">₹{(payment.amount / 100).toFixed(2)}</TableCell>
                          <TableCell className="text-sm">{payment.paymentMethod}</TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1">
                              {payment.referenceNumber || '-'}
                              {isVyapaar && (
                                <Badge variant="secondary" className="text-xs ml-1">
                                  <Link2 className="w-3 h-3 mr-1" />
                                  Vyapaar
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {payment.paymentType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {payment.cancelledAt ? (
                              <Badge variant="destructive" className="text-xs">Cancelled</Badge>
                            ) : (
                              <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-700">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {!payment.cancelledAt && canEdit && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditPayment(payment)}
                                  data-testid={`button-edit-${payment.id}`}
                                >
                                  <Pencil className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                              )}
                              {!payment.cancelledAt && payment.paymentType !== 'Write-off' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setCancelPaymentId(payment.id)}
                                  data-testid={`button-cancel-${payment.id}`}
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {/* Payment Evidence Sub-row */}
                        {isVyapaar && isExpanded && (
                          <PaymentEvidenceRow key={`evidence-${payment.id}`} paymentId={payment.id} />
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={(open) => {
        setShowPaymentDialog(open);
        if (!open) {
          setAllocationPreview(null);
          setSelectedVendorId("");
          form.reset();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New FIFO Payment</DialogTitle>
            <DialogDescription>
              Allocate payment across outstanding invoices using First-In-First-Out
            </DialogDescription>
          </DialogHeader>

          {!allocationPreview ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="vendorId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Vendor</FormLabel>
                        <Popover open={vendorPopoverOpen} onOpenChange={setVendorPopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={vendorPopoverOpen}
                                className={cn(
                                  "w-full justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                                data-testid="select-vendor"
                              >
                                {field.value
                                  ? vendors.find((vendor: any) => vendor.id === field.value)?.vendorName || "Select vendor"
                                  : "Select vendor"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search vendors..." data-testid="input-search-vendor" />
                              <CommandEmpty>No vendor found.</CommandEmpty>
                              <CommandList className="max-h-64 overflow-auto">
                                <CommandGroup>
                                  {vendors.map((vendor: any) => (
                                    <CommandItem
                                      key={vendor.id}
                                      value={vendor.vendorName}
                                      keywords={[vendor.vendorCode, vendor.mobileNumber || '']}
                                      onSelect={() => {
                                        form.setValue("vendorId", vendor.id);
                                        setSelectedVendorId(vendor.id);
                                        setVendorPopoverOpen(false);
                                      }}
                                      data-testid={`vendor-option-${vendor.vendorCode}`}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === vendor.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{vendor.vendorName}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {vendor.vendorCode} {vendor.mobileNumber && `• ${vendor.mobileNumber}`}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Amount (₹)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            data-testid="input-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-payment-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-payment-method">
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
                    control={form.control}
                    name="referenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Transaction ID / Cheque No" data-testid="input-reference" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Bank name" data-testid="input-bank-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="Additional notes" data-testid="input-remarks" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pending Invoices Preview - Shows when vendor is selected */}
                {selectedVendorId && (
                  <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Pending Invoices for {pendingData?.vendorName}</h4>
                      {isPendingLoading ? (
                        <span className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading...
                        </span>
                      ) : pendingData?.invoiceCount === 0 ? (
                        <span className="flex items-center gap-2 text-sm text-yellow-600">
                          <AlertCircle className="h-4 w-4" />
                          No pending invoices
                        </span>
                      ) : (
                        <Badge variant="secondary">
                          {pendingData?.invoiceCount} invoice(s) • ₹{((pendingData?.totalOutstanding || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })} outstanding
                        </Badge>
                      )}
                    </div>
                    {pendingData && pendingData.invoiceCount > 0 && (
                      <div className="rounded-md border max-h-40 overflow-y-auto bg-background">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs py-2">Invoice #</TableHead>
                              <TableHead className="text-xs py-2">Date</TableHead>
                              <TableHead className="text-xs text-right py-2">Total</TableHead>
                              <TableHead className="text-xs text-right py-2">Paid</TableHead>
                              <TableHead className="text-xs text-right py-2">Outstanding</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingData.pendingInvoices.map((invoice, idx) => (
                              <TableRow key={invoice.id}>
                                <TableCell className="text-sm font-medium py-1.5">
                                  {invoice.invoiceNumber}
                                  {idx === 0 && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      Oldest
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground py-1.5">
                                  {format(new Date(invoice.invoiceDate), "dd-MMM-yy")}
                                </TableCell>
                                <TableCell className="text-sm text-right py-1.5">
                                  ₹{(invoice.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-sm text-right text-green-600 py-1.5">
                                  ₹{(invoice.totalPaid / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </TableCell>
                                <TableCell className="text-sm text-right font-medium text-destructive py-1.5">
                                  ₹{(invoice.outstanding / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Payment will be allocated starting from the oldest invoice (FIFO order)
                    </p>
                  </div>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPaymentDialog(false)}
                    data-testid="button-cancel-payment"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={allocateMutation.isPending}
                    data-testid="button-submit-payment"
                  >
                    {allocateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Allocate Payment
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : allocationPreview && allocationPreview.allocations ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 rounded-md border bg-muted/30">
                <div>
                  <p className="text-sm text-muted-foreground">Total Payment</p>
                  <p className="text-lg font-semibold">
                    ₹{((allocationPreview.totalAmount || 0) / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Allocated</p>
                  <p className="text-lg font-semibold text-green-600">
                    ₹{((allocationPreview.allocated || 0) / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-lg font-semibold text-destructive">
                    ₹{((allocationPreview.remaining || 0) / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Outstanding Before</TableHead>
                      <TableHead>Amount Allocated</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocationPreview.allocations.map((allocation: any) => (
                      <TableRow key={allocation.paymentId}>
                        <TableCell className="font-medium">
                          {allocation.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          {format(new Date(allocation.invoiceDate), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          ₹{(allocation.outstanding / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          ₹{(allocation.allocated / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {allocation.allocated === allocation.outstanding ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">Fully Paid</Badge>
                          ) : (
                            <Badge variant="outline">Partial</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <DialogFooter>
                <Button onClick={handleCloseAllocationPreview} data-testid="button-close-preview">
                  Close
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Processing payment allocation...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => {
        setShowEditDialog(open);
        if (!open) {
          setEditPayment(null);
          editForm.reset();
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>
              Update payment details for {editPayment?.vendorName} - Invoice #{editPayment?.invoiceNumber}
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="paymentDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" data-testid="input-edit-payment-date" />
                      </FormControl>
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
                        <Input 
                          {...field} 
                          type="number" 
                          step="0.01"
                          data-testid="input-edit-amount" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {editForm.watch('amount') !== (editPayment?.amount / 100).toFixed(2) && (
                <>
                  {isVyapaarPayment(editPayment) && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm">
                      <strong>Warning:</strong> This is a Vyapaar-imported payment (VY-). Changing this amount will affect the Vyapaar totals matching.
                    </div>
                  )}
                  <FormField
                    control={editForm.control}
                    name="amountChangeReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reason for Amount Change *</FormLabel>
                        <FormControl>
                          <Textarea 
                            {...field} 
                            rows={2} 
                            placeholder="Please provide a reason for changing the amount..." 
                            data-testid="input-edit-amount-reason" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <FormField
                control={editForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-payment-method">
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
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Transaction ID / Cheque No" data-testid="input-edit-reference" />
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
                      <Input {...field} placeholder="Bank name" data-testid="input-edit-bank-name" />
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
                      <Textarea {...field} rows={3} placeholder="Additional notes" data-testid="input-edit-remarks" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false);
                    setEditPayment(null);
                    editForm.reset();
                  }}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {editMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Cancel Payment Confirmation */}
      <AlertDialog open={!!cancelPaymentId} onOpenChange={(open) => !open && setCancelPaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reverse the payment allocation and restore the outstanding balance on the linked invoice.
              Please provide a reason for cancellation:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={cancellationRemarks}
            onChange={(e) => setCancellationRemarks(e.target.value)}
            placeholder="Reason for cancellation..."
            rows={3}
            data-testid="input-cancellation-remarks"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setCancelPaymentId(null);
              setCancellationRemarks("");
            }} data-testid="button-cancel-dialog">
              No, Keep Payment
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelPayment}
              disabled={!cancellationRemarks.trim() || cancelMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
              data-testid="button-confirm-cancel"
            >
              {cancelMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Yes, Cancel Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
