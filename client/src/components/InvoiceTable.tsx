import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, DollarSign } from "lucide-react";
import type { Invoice, InvoicePayment } from "@shared/schema";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import PrintableInvoice from "./PrintableInvoice";

interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onPayment?: (invoice: Invoice) => void;
}

export default function InvoiceTable({ invoices, isLoading, onEdit, onDelete, onPayment }: InvoiceTableProps) {
  // Fetch all payments for all invoices
  const { data: allPayments = [] } = useQuery<InvoicePayment[]>({
    queryKey: ['/api/invoice-payments'],
  });

  // Calculate total paid for each invoice
  const getInvoicePayments = (invoiceId: string) => {
    return allPayments.filter(p => p.invoiceId === invoiceId);
  };

  const getTotalPaid = (invoiceId: string) => {
    return getInvoicePayments(invoiceId).reduce((sum, p) => sum + p.amount, 0);
  };

  if (isLoading) {
    return <div className="text-center py-8" data-testid="loading-invoices">Loading invoices...</div>;
  }

  if (invoices.length === 0) {
    return <div className="text-center py-8 text-muted-foreground" data-testid="no-invoices">No invoices found</div>;
  }

  const formatCurrency = (amountInPaise: number) => {
    return `₹${(amountInPaise / 100).toFixed(2)}`;
  };

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead data-testid="header-invoice-number">Invoice #</TableHead>
            <TableHead data-testid="header-date">Date</TableHead>
            <TableHead data-testid="header-buyer">Buyer Name</TableHead>
            <TableHead data-testid="header-total">Total</TableHead>
            <TableHead data-testid="header-paid">Paid</TableHead>
            <TableHead data-testid="header-outstanding">Outstanding</TableHead>
            <TableHead data-testid="header-actions">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const totalPaid = getTotalPaid(invoice.id);
            const outstanding = invoice.totalAmount - totalPaid;
            const isPaid = outstanding <= 0;
            
            return (
              <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                <TableCell data-testid={`invoice-number-${invoice.id}`}>{invoice.invoiceNumber}</TableCell>
                <TableCell data-testid={`invoice-date-${invoice.id}`}>
                  {format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}
                </TableCell>
                <TableCell data-testid={`buyer-name-${invoice.id}`}>{invoice.buyerName}</TableCell>
                <TableCell data-testid={`total-${invoice.id}`} className="font-semibold">
                  {formatCurrency(invoice.totalAmount)}
                </TableCell>
                <TableCell data-testid={`paid-${invoice.id}`} className="text-green-600">
                  {formatCurrency(totalPaid)}
                </TableCell>
                <TableCell data-testid={`outstanding-${invoice.id}`}>
                  <span className={isPaid ? "text-muted-foreground" : "text-destructive font-medium"}>
                    {formatCurrency(outstanding)}
                  </span>
                </TableCell>
                <TableCell data-testid={`actions-${invoice.id}`}>
                  <div className="flex gap-1">
                    {onPayment && !isPaid && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onPayment(invoice)}
                        data-testid={`button-payment-${invoice.id}`}
                        title="Record Payment"
                      >
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(invoice)}
                        data-testid={`button-edit-${invoice.id}`}
                        title="Edit Invoice"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                    <PrintableInvoice invoice={invoice} />
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(invoice)}
                        data-testid={`button-delete-${invoice.id}`}
                        title="Delete Invoice"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
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
  );
}
