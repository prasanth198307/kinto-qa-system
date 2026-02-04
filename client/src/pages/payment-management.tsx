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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Plus, X, FileText, Search, Filter, Check, ChevronsUpDown, Pencil, ChevronDown, ChevronRight, Link2, CircleCheck, AlertTriangle, CircleDashed, AlertCircle, ArrowLeft } from "lucide-react";
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
  const canCreate = hasPermission('payments', 'create');
  const canEdit = hasPermission('payments', 'edit');
  
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

  const { data: vendors = [] } = useQuery<any[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: paymentsData = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/invoice-payments/history'],
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
                            {format(new Date(payment.paymentDate), 'dd MMM yyyy')}
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
                          {!payment.cancelledAt && canEdit && (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditPayment(payment)}
                                data-testid={`button-edit-payment-${payment.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => setCancelPaymentId(payment.id)}
                                data-testid={`button-cancel-payment-${payment.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
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
