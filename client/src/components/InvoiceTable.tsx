import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { Invoice } from "@shared/schema";
import { format } from "date-fns";
import PrintableInvoice from "./PrintableInvoice";

interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  onDelete?: (invoice: Invoice) => void;
}

export default function InvoiceTable({ invoices, isLoading, onDelete }: InvoiceTableProps) {
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
            <TableHead data-testid="header-subtotal">Subtotal</TableHead>
            <TableHead data-testid="header-gst">GST</TableHead>
            <TableHead data-testid="header-total">Total</TableHead>
            <TableHead data-testid="header-actions">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const totalGst = invoice.cgstAmount + invoice.sgstAmount + invoice.igstAmount;
            
            return (
              <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                <TableCell data-testid={`invoice-number-${invoice.id}`}>{invoice.invoiceNumber}</TableCell>
                <TableCell data-testid={`invoice-date-${invoice.id}`}>
                  {format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}
                </TableCell>
                <TableCell data-testid={`buyer-name-${invoice.id}`}>{invoice.buyerName}</TableCell>
                <TableCell data-testid={`subtotal-${invoice.id}`}>
                  {formatCurrency(invoice.subtotal)}
                </TableCell>
                <TableCell data-testid={`gst-${invoice.id}`}>
                  {formatCurrency(totalGst)}
                </TableCell>
                <TableCell data-testid={`total-${invoice.id}`} className="font-semibold">
                  {formatCurrency(invoice.totalAmount)}
                </TableCell>
                <TableCell data-testid={`actions-${invoice.id}`}>
                  <div className="flex gap-2">
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
