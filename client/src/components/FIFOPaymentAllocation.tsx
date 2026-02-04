import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";
import { Loader2, AlertCircle, Search, Check, ChevronsUpDown } from "lucide-react";
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
import { cn } from "@/lib/utils";

const fifoPaymentSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  allocationMethod: z.enum(["fifo", "manual"]).default("fifo"),
  amount: z.string().min(1, "Amount is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be greater than 0",
    }),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  paidBy: z.string().min(1, "Payer category is required"),
  payerName: z.string().min(1, "Payer name is required"),
  referenceNumber: z.string().optional(),
  bankName: z.string().optional(),
  remarks: z.string().optional(),
  manualAllocations: z.record(z.string(), z.string()).optional(),
});

type FIFOPaymentFormData = z.infer<typeof fifoPaymentSchema>;

interface FIFOPaymentAllocationProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function FIFOPaymentAllocation({ onSuccess, onCancel }: FIFOPaymentAllocationProps) {
  const { toast } = useToast();
  const [allocationPreview, setAllocationPreview] = useState<any>(null);
  const [vendorPopoverOpen, setVendorPopoverOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");

  const { data: vendors = [] } = useQuery<any[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: banks = [] } = useQuery<any[]>({
    queryKey: ['/api/banks'],
  });

  // Fetch pending invoices when vendor is selected
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
    enabled: !!selectedVendorId,
  });

  const form = useForm<FIFOPaymentFormData>({
    resolver: zodResolver(fifoPaymentSchema),
    defaultValues: {
      vendorId: "",
      allocationMethod: "fifo",
      amount: "",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      paymentMethod: "Cash",
      paidBy: "buyer",
      payerName: "",
      referenceNumber: "",
      bankName: "",
      remarks: "",
      manualAllocations: {},
    },
  });

  const allocationMethod = form.watch("allocationMethod");
  const manualAllocations = form.watch("manualAllocations") || {};

  const handleManualAllocationChange = (invoiceId: string, value: string) => {
    const currentAllocations = { ...manualAllocations };
    if (!value || parseFloat(value) === 0) {
      delete currentAllocations[invoiceId];
    } else {
      currentAllocations[invoiceId] = value;
    }
    form.setValue("manualAllocations", currentAllocations);
    
    // Update total amount based on manual entries
    const total = Object.values(currentAllocations).reduce((sum, val) => sum + parseFloat(val), 0);
    form.setValue("amount", total.toFixed(2));
  };

  const allocateMutation = useMutation({
    mutationFn: async (data: FIFOPaymentFormData) => {
      const payload = {
        vendorId: data.vendorId,
        allocationMethod: data.allocationMethod,
        amount: Math.round(parseFloat(data.amount) * 100), // Convert to paise
        paymentDate: new Date(data.paymentDate).toISOString(),
        paymentMethod: data.paymentMethod,
        paidBy: data.paidBy,
        payerName: data.payerName,
        referenceNumber: data.referenceNumber,
        bankName: data.bankName,
        remarks: data.remarks,
        manualAllocations: data.allocationMethod === 'manual' 
          ? Object.fromEntries(Object.entries(data.manualAllocations || {}).map(([id, val]) => [id, Math.round(parseFloat(val) * 100)]))
          : undefined,
      };
      const response = await apiRequest('POST', '/api/invoice-payments/allocate-fifo', payload);
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      setAllocationPreview(data);
      toast({
        title: "Success",
        description: `Payment allocated to ${data.allocations.length} invoice(s)`,
      });
      // Don't close dialog immediately - let user see the allocation preview
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>FIFO Payment Allocation</CardTitle>
          <CardDescription>
            Allocate a bulk payment across multiple outstanding invoices using First-In-First-Out (oldest invoices first)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vendorId"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Vendor/Customer</FormLabel>
                      <Popover open={vendorPopoverOpen} onOpenChange={setVendorPopoverOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="select-vendor"
                            >
                              {field.value
                                ? vendors.find((v: any) => v.id === field.value)?.vendorName
                                : "Select vendor"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search vendor..." />
                            <CommandList>
                              <CommandEmpty>No vendor found.</CommandEmpty>
                              <CommandGroup>
                                {vendors.map((vendor: any) => (
                                  <CommandItem
                                    key={vendor.id}
                                    value={vendor.vendorName}
                                    onSelect={() => {
                                      form.setValue("vendorId", vendor.id);
                                      setSelectedVendorId(vendor.id);
                                      form.setValue("payerName", vendor.vendorName || "");
                                      setVendorPopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        vendor.id === field.value ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {vendor.vendorName}
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
                  name="allocationMethod"
                  render={({ field }) => (
                    <FormItem className="w-[200px]">
                      <FormLabel>Allocation Type</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-allocation-method" className="bg-white border-primary/20">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="fifo">FIFO (Oldest First)</SelectItem>
                          <SelectItem value="manual">Specific Invoices</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="paidBy"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paid By</FormLabel>
                      <Select 
                        onValueChange={(val) => {
                          field.onChange(val);
                          const vendor = vendors.find(v => v.id === selectedVendorId);
                          if (val === 'buyer') {
                            form.setValue('payerName', vendor?.vendorName || "");
                          } else if (val === 'shipper') {
                            form.setValue('payerName', vendor?.shipToName || "");
                          }
                        }} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-paid-by">
                            <SelectValue placeholder="Who paid?" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="buyer">Buyer/Vendor</SelectItem>
                          <SelectItem value="shipper">Shipper (Unit)</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="payerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payer Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter name of entity"
                          data-testid="input-payer-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Payment Amount (₹)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          data-testid="input-amount"
                          disabled={allocationMethod === 'manual'}
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="referenceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reference Number (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Transaction ID, Cheque No." data-testid="input-reference" />
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
                      <FormLabel>Bank (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-bank">
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {banks.map((bank: any) => (
                            <SelectItem key={bank.id} value={bank.bankName}>
                              {bank.bankName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    <FormLabel>Remarks (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Additional notes" data-testid="input-remarks" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 justify-end">
                {onCancel && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={allocateMutation.isPending || allocationPreview !== null}
                  data-testid="button-allocate"
                >
                  {allocateMutation.isPending ? "Allocating..." : "Allocate Payment (FIFO)"}
                </Button>
              </div>
              {allocationPreview && (
                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setAllocationPreview(null);
                      setSelectedVendorId("");
                      form.reset();
                      if (onSuccess) onSuccess();
                    }}
                    className="w-full"
                    data-testid="button-close-preview"
                  >
                    Close and Return
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Pending Invoices Preview - Shows when vendor is selected */}
      {selectedVendorId && !allocationPreview && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Pending Invoices for {pendingData?.vendorName}
            </CardTitle>
            <CardDescription>
              {isPendingLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading pending invoices...
                </span>
              ) : pendingData?.invoiceCount === 0 ? (
                <span className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-4 w-4" />
                  No pending invoices for this vendor
                </span>
              ) : (
                <span>
                  {pendingData?.invoiceCount} invoice(s) with outstanding balance of{" "}
                  <span className="font-semibold text-destructive">
                    ₹{((pendingData?.totalOutstanding || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </span>
              )}
            </CardDescription>
          </CardHeader>
          {pendingData && pendingData.invoiceCount > 0 && (
            <CardContent className="pt-0">
              <div className="rounded-md border max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="text-xs">Invoice #</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                      <TableHead className="text-xs text-right">Paid</TableHead>
                      <TableHead className="text-xs text-right">Outstanding</TableHead>
                      {allocationMethod === 'manual' && (
                        <TableHead className="text-xs text-right w-[140px]">Pay Amount (₹)</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingData.pendingInvoices.map((invoice, idx) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="text-sm font-medium">
                          {invoice.invoiceNumber}
                          {idx === 0 && allocationMethod === 'fifo' && (
                            <Badge variant="outline" className="ml-2 text-[10px] h-4">
                              Oldest
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(invoice.invoiceDate), "dd-MMM-yy")}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          ₹{(invoice.totalAmount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-sm text-right text-green-600">
                          ₹{(invoice.totalPaid / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-sm text-right font-medium text-destructive">
                          ₹{(invoice.outstanding / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </TableCell>
                        {allocationMethod === 'manual' && (
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              className="h-8 text-right text-xs border-primary/20 focus:border-primary"
                              placeholder="0.00"
                              value={manualAllocations[invoice.id] || ""}
                              onChange={(e) => handleManualAllocationChange(invoice.id, e.target.value)}
                              max={(invoice.outstanding / 100).toFixed(2)}
                              data-testid={`input-manual-alloc-${invoice.id}`}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground italic">
                {allocationMethod === 'fifo' 
                  ? "Payment will be automatically distributed starting from the oldest invoice." 
                  : "Enter the exact amount you want to pay against specific invoices above."}
              </p>
            </CardContent>
          )}
        </Card>
      )}

      {allocationPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Allocation Summary</CardTitle>
            <CardDescription>Payment has been allocated to the following invoices (oldest first)</CardDescription>
          </CardHeader>
          <CardContent>
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
                          {format(new Date(allocation.invoiceDate), "dd-MMM-yyyy")}
                        </TableCell>
                        <TableCell>
                          ₹{(allocation.outstanding / 100).toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium text-green-600">
                          ₹{(allocation.allocated / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                            allocation.allocated === allocation.outstanding
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {allocation.allocated === allocation.outstanding ? 'Fully Paid' : 'Partially Paid'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
