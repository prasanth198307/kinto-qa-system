import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2, Edit, DollarSign, FileText, Package, Truck, CheckCircle, Eye, PackageCheck, Lock, XCircle } from "lucide-react";
import type { Invoice } from "@shared/schema";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
import { format } from "date-fns";
import { Link } from "wouter";
import PrintableInvoice from "./PrintableInvoice";

interface InvoiceTableProps {
  invoices: Invoice[];
  isLoading: boolean;
  returnsMap?: Record<string, number>; // invoiceId -> totalCreditAmount in paise
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onCancel?: (invoice: Invoice) => void;
  onPayment?: (invoice: Invoice) => void;
  onMarkReadyForGatepass?: (invoice: Invoice) => void;
}

export default function InvoiceTable({ invoices, isLoading, returnsMap = {}, onEdit, onDelete, onCancel, onPayment, onMarkReadyForGatepass }: InvoiceTableProps) {
  const tenantConfig = useTenantConfig();

  const getTotalPaid = (invoice: Invoice) => {
    return invoice.amountReceived || 0;
  };

  if (isLoading) {
    return <div className="text-center py-8" data-testid="loading-invoices">Loading invoices...</div>;
  }

  if (invoices.length === 0) {
    return <div className="text-center py-8 text-muted-foreground" data-testid="no-invoices">No invoices found</div>;
  }

  const formatCurrency = (amountInPaise: number) => fmtCur(amountInPaise / 100, tenantConfig);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any; icon: any }> = {
      draft: { label: "Draft", variant: "secondary", icon: FileText },
      ready_for_gatepass: { label: "Ready for GP", variant: "default", icon: Package },
      dispatched: { label: "Dispatched", variant: "destructive", icon: Truck },
      delivered: { label: "Delivered", variant: "default", icon: CheckCircle },
    };

    const config = statusConfig[status] || { label: status, variant: "outline", icon: FileText };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} data-testid={`status-${status}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="border rounded-md overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead data-testid="header-invoice-number" className="min-w-[100px]">Invoice #</TableHead>
            <TableHead data-testid="header-date" className="min-w-[100px]">Date</TableHead>
            <TableHead data-testid="header-buyer" className="min-w-[150px]">Buyer Name</TableHead>
            <TableHead data-testid="header-status" className="min-w-[120px]">Status</TableHead>
            <TableHead data-testid="header-total" className="min-w-[100px]">Total</TableHead>
            <TableHead data-testid="header-paid" className="min-w-[100px]">Paid</TableHead>
            <TableHead data-testid="header-returns" className="min-w-[100px]">Returns</TableHead>
            <TableHead data-testid="header-outstanding" className="min-w-[120px]">Outstanding</TableHead>
            <TableHead data-testid="header-actions" className="min-w-[200px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const totalPaid = getTotalPaid(invoice);
            const returnsCredit = returnsMap[invoice.id] || 0;
            const outstanding = Math.max(0, invoice.totalAmount - returnsCredit - totalPaid);
            const isPaid = outstanding <= 0;
            
            return (
              <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                <TableCell data-testid={`invoice-number-${invoice.id}`}>
                  <Link href={`/invoice/${invoice.id}`}>
                    <span className="text-primary hover:underline cursor-pointer font-medium">
                      {invoice.invoiceNumber}
                    </span>
                  </Link>
                </TableCell>
                <TableCell data-testid={`invoice-date-${invoice.id}`}>
                  {format(new Date(invoice.invoiceDate), 'dd MMM yyyy')}
                </TableCell>
                <TableCell data-testid={`buyer-name-${invoice.id}`}>{invoice.buyerName}</TableCell>
                <TableCell data-testid={`status-${invoice.id}`}>
                  {getStatusBadge(invoice.status || 'draft')}
                </TableCell>
                <TableCell data-testid={`total-${invoice.id}`} className="font-semibold">
                  {formatCurrency(invoice.totalAmount)}
                </TableCell>
                <TableCell data-testid={`paid-${invoice.id}`} className="text-green-600">
                  {formatCurrency(totalPaid)}
                </TableCell>
                <TableCell data-testid={`returns-${invoice.id}`} className="text-blue-600">
                  {returnsCredit > 0 ? formatCurrency(returnsCredit) : <span className="text-muted-foreground">—</span>}
                </TableCell>
                <TableCell data-testid={`outstanding-${invoice.id}`}>
                  <span className={isPaid ? "text-muted-foreground" : "text-destructive font-medium"}>
                    {formatCurrency(outstanding)}
                  </span>
                </TableCell>
                <TableCell data-testid={`actions-${invoice.id}`}>
                  <div className="flex gap-1 flex-nowrap">
                    <Link href={`/invoice/${invoice.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid={`button-view-${invoice.id}`}
                        title="View Invoice Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
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
                    {onMarkReadyForGatepass && invoice.status === 'draft' && !(invoice as any).hasGatepass && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onMarkReadyForGatepass(invoice)}
                        data-testid={`button-ready-gatepass-${invoice.id}`}
                        title="Mark Ready for Gatepass"
                      >
                        <PackageCheck className="w-4 h-4 text-blue-600" />
                      </Button>
                    )}
                    {onEdit && (
                      (invoice.status === 'delivered' || invoice.status === 'dispatched') ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled
                                data-testid={`button-edit-${invoice.id}-disabled`}
                                title="Finalized invoices cannot be edited"
                              >
                                <Lock className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{invoice.status === 'delivered' ? 'Delivered' : 'Dispatched'} invoices cannot be edited.</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Use 'Cancel & Reissue' (same month) or 'Credit Notes'.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (invoice as any).hasGatepass ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled
                                data-testid={`button-edit-${invoice.id}-disabled`}
                                title="Gatepass exists - cannot edit"
                              >
                                <Lock className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Cannot edit - gatepass already created.</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Use 'Cancel & Reissue' from the invoice detail page to make changes.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(invoice)}
                          data-testid={`button-edit-${invoice.id}`}
                          title="Edit Invoice"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      )
                    )}
                    <PrintableInvoice invoice={invoice} />
                    {/* Show Cancel button for finalized invoices (dispatched/delivered), Delete for drafts */}
                    {(invoice.status === 'dispatched' || invoice.status === 'delivered') ? (
                      onCancel && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onCancel(invoice)}
                              data-testid={`button-cancel-${invoice.id}`}
                              title="Cancel Invoice"
                            >
                              <XCircle className="w-4 h-4 text-destructive" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Cancel Invoice</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Cancels invoice, gatepass, and returns inventory (same month only)
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    ) : (
                      onDelete && (
                        (invoice as any).hasGatepass ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled
                                  data-testid={`button-delete-${invoice.id}-disabled`}
                                  title="Cannot delete - gatepass exists"
                                >
                                  <Lock className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Cannot delete - gatepass exists.</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Delete the gatepass first, or use 'Cancel & Reissue'.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(invoice)}
                            data-testid={`button-delete-${invoice.id}`}
                            title="Delete Invoice"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )
                      )
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
