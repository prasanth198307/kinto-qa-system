import { useQuery, useMutation } from "@tanstack/react-query";
import { type InvoicePayment, type Invoice } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PaymentHistoryProps {
  invoice: Invoice;
}

export default function PaymentHistory({ invoice }: PaymentHistoryProps) {
  const { toast } = useToast();

  const { data: payments = [], isLoading } = useQuery<InvoicePayment[]>({
    queryKey: ['/api/invoice-payments', invoice.id],
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      await apiRequest('DELETE', `/api/invoice-payments/${paymentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Success",
        description: "Payment deleted successfully",
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

  // Sort payments chronologically (oldest first) by paymentDate, then createdAt
  const sortedPayments = [...payments].sort((a, b) => {
    const dateCompare = new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime();
    if (dateCompare !== 0) return dateCompare;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Calculate running balance for each payment
  let runningTotal = 0;
  const paymentsWithBalance = sortedPayments.map((payment) => {
    runningTotal += payment.amount;
    return {
      ...payment,
      runningBalance: invoice.totalAmount - runningTotal,
    };
  });

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const outstandingBalance = invoice.totalAmount - totalPaid;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Payment Summary */}
        <div className="grid grid-cols-3 gap-4 p-4 rounded-md border bg-muted/30">
          <div>
            <p className="text-sm text-muted-foreground">Invoice Total</p>
            <p className="text-lg font-semibold" data-testid="text-invoice-total">
              ₹{(invoice.totalAmount / 100).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-lg font-semibold text-green-600" data-testid="text-payments-total">
              ₹{(totalPaid / 100).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Outstanding</p>
            <p className="text-lg font-semibold text-destructive" data-testid="text-balance-outstanding">
              ₹{(outstandingBalance / 100).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Payment Records */}
        {payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No payments recorded yet</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Running Balance</TableHead>
                  <TableHead>Recorded By</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsWithBalance.map((payment) => (
                  <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                    <TableCell data-testid={`text-payment-date-${payment.id}`}>
                      {format(new Date(payment.paymentDate), "dd-MMM-yyyy")}
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-payment-amount-${payment.id}`}>
                      ₹{(payment.amount / 100).toFixed(2)}
                    </TableCell>
                    <TableCell data-testid={`text-payment-type-${payment.id}`}>
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {payment.paymentType}
                      </span>
                    </TableCell>
                    <TableCell data-testid={`text-payment-method-${payment.id}`}>
                      {payment.paymentMethod}
                    </TableCell>
                    <TableCell data-testid={`text-payment-reference-${payment.id}`}>
                      {payment.referenceNumber || "-"}
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`text-running-balance-${payment.id}`}>
                      <span className={payment.runningBalance > 0 ? "text-destructive" : "text-green-600"}>
                        ₹{(payment.runningBalance / 100).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground" data-testid={`text-recorded-by-${payment.id}`}>
                      {(payment as any).recordedByFullName || 'System'}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate" data-testid={`text-payment-remarks-${payment.id}`}>
                      {payment.remarks || "-"}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-delete-payment-${payment.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this payment record? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deletePaymentMutation.mutate(payment.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
