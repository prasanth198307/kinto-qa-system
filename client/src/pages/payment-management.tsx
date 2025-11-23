import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Loader2, Plus, X, FileText, Search, Filter } from "lucide-react";

const fifoPaymentSchema = z.object({
  vendorId: z.string().min(1, "Please select a vendor"),
  amount: z.string().min(1, "Payment amount is required"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.enum(["Cash", "Cheque", "NEFT", "RTGS", "UPI", "Other"]),
  referenceNumber: z.string().optional(),
  bankName: z.string().optional(),
  remarks: z.string().optional(),
});

type FIFOPaymentFormData = z.infer<typeof fifoPaymentSchema>;

export default function PaymentManagement() {
  const { toast } = useToast();
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [allocationPreview, setAllocationPreview] = useState<any>(null);
  const [cancelPaymentId, setCancelPaymentId] = useState<string | null>(null);
  const [cancellationRemarks, setCancellationRemarks] = useState("");
  
  // Filters for payment history
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVendor, setFilterVendor] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, cancelled

  const { data: vendors = [] } = useQuery<any[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: banks = [] } = useQuery<any[]>({
    queryKey: ['/api/banks'],
  });

  const { data: paymentsData = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/invoice-payments/history'],
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
      const response: any = await apiRequest('POST', '/api/invoice-payments/allocate-fifo', payload);
      return response;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments/history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setAllocationPreview(data);
      toast({
        title: "Success",
        description: `Payment allocated to ${data.allocations.length} invoice(s)`,
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
        <div>
          <h1 className="text-lg font-semibold">Payment Management</h1>
          <p className="text-sm text-muted-foreground">
            FIFO payment entry and payment history
          </p>
        </div>
        <Button onClick={() => setShowPaymentDialog(true)} data-testid="button-add-payment">
          <Plus className="w-4 h-4 mr-2" />
          New Payment
        </Button>
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
                  {filteredPayments.map((payment: any) => (
                    <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                      <TableCell className="text-sm">
                        {format(new Date(payment.paymentDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-sm">{payment.vendorName}</TableCell>
                      <TableCell className="text-sm font-medium">{payment.invoiceNumber}</TableCell>
                      <TableCell className="text-sm">₹{(payment.amount / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-sm">{payment.paymentMethod}</TableCell>
                      <TableCell className="text-sm">{payment.referenceNumber || '-'}</TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
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
                      <FormItem>
                        <FormLabel>Vendor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-vendor">
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vendors.map((vendor: any) => (
                              <SelectItem key={vendor.id} value={vendor.id}>
                                {vendor.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 rounded-md border bg-muted/30">
                <div>
                  <p className="text-sm text-muted-foreground">Total Payment</p>
                  <p className="text-lg font-semibold">
                    ₹{(allocationPreview.totalAmount / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Allocated</p>
                  <p className="text-lg font-semibold text-green-600">
                    ₹{(allocationPreview.allocated / 100).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-lg font-semibold text-destructive">
                    ₹{(allocationPreview.remaining / 100).toFixed(2)}
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
          )}
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
