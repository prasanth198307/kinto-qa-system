import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertInvoicePaymentSchema, type Invoice, type InvoicePayment } from "@shared/schema";
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
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { format } from "date-fns";

const paymentFormSchema = insertInvoicePaymentSchema.extend({
  paymentDate: z.string().min(1, "Payment date is required"),
  amount: z.string().min(1, "Amount is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be greater than 0",
    }),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

interface PaymentFormProps {
  invoice: Invoice;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function PaymentForm({ invoice, onSuccess, onCancel }: PaymentFormProps) {
  const { toast } = useToast();

  // Fetch payment history to calculate outstanding balance
  const { data: payments = [] } = useQuery<InvoicePayment[]>({
    queryKey: ['/api/invoice-payments', invoice.id],
  });

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingBalance = invoice.totalAmount - totalPaid;

  // Create a custom schema with outstanding balance validation
  const dynamicPaymentFormSchema = paymentFormSchema.extend({
    amount: z.string().min(1, "Amount is required")
      .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
        message: "Amount must be greater than 0",
      })
      .refine((val) => {
        const amountInPaise = Math.round(parseFloat(val) * 100);
        return amountInPaise <= outstandingBalance;
      }, {
        message: `Amount cannot exceed outstanding balance of ₹${(outstandingBalance / 100).toFixed(2)}`,
      }),
  });

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(dynamicPaymentFormSchema),
    defaultValues: {
      invoiceId: invoice.id,
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      amount: (outstandingBalance / 100).toFixed(2),
      paymentMethod: "Cash",
      paymentType: "Partial",
      referenceNumber: "",
      bankName: "",
      remarks: "",
      recordedBy: undefined,
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: PaymentFormData) => {
      const payload = {
        ...data,
        paymentDate: new Date(data.paymentDate).toISOString(),
        amount: Math.round(parseFloat(data.amount) * 100), // Convert to paise
      };
      await apiRequest('POST', '/api/invoice-payments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PaymentFormData) => {
    createPaymentMutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border p-4 bg-muted/50">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Invoice Number:</span>
            <span className="ml-2 font-medium" data-testid="text-invoice-number">{invoice.invoiceNumber}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Amount:</span>
            <span className="ml-2 font-medium" data-testid="text-total-amount">₹{(invoice.totalAmount / 100).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Paid:</span>
            <span className="ml-2 font-medium" data-testid="text-total-paid">₹{(totalPaid / 100).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Outstanding:</span>
            <span className="ml-2 font-medium text-destructive" data-testid="text-outstanding">₹{(outstandingBalance / 100).toFixed(2)}</span>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      data-testid="input-payment-date"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      data-testid="input-payment-amount"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-payment-method">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="NEFT">NEFT</SelectItem>
                      <SelectItem value="RTGS">RTGS</SelectItem>
                      <SelectItem value="IMPS">IMPS</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Net Banking">Net Banking</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-payment-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Advance">Advance</SelectItem>
                      <SelectItem value="Partial">Partial Payment</SelectItem>
                      <SelectItem value="Full">Full Payment</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="referenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference/Transaction ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="UTR/Cheque/Transaction ID"
                      data-testid="input-reference-number"
                      {...field}
                      value={field.value || ""}
                    />
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
                  <FormLabel>Bank Name (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Bank name"
                      data-testid="input-bank-name"
                      {...field}
                      value={field.value || ""}
                    />
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
                <FormLabel>Remarks (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Additional notes"
                    data-testid="input-remarks"
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createPaymentMutation.isPending}
              data-testid="button-record-payment"
            >
              {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
