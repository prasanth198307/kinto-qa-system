import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Mail, FileText, Printer } from "lucide-react";
import type { Invoice, InvoiceItem, Product, Gatepass } from "@shared/schema";
import PrintableInvoice from "@/components/PrintableInvoice";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: invoice, isLoading: isLoadingInvoice } = useQuery<Invoice>({
    queryKey: ['/api/invoices', id],
  });

  const { data: items = [] } = useQuery<InvoiceItem[]>({
    queryKey: ['/api/invoice-items', id],
    enabled: !!id,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: gatepasses = [] } = useQuery<Gatepass[]>({
    queryKey: ['/api/gatepasses'],
  });

  if (isLoadingInvoice) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-muted-foreground">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen p-6">
        <Card className="max-w-md mx-auto p-8 text-center">
          <h2 className="text-2xl font-bold text-destructive mb-4">Invoice Not Found</h2>
          <p className="text-muted-foreground mb-6">The requested invoice could not be found.</p>
          <Button onClick={() => navigate('/')} data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const relatedGatepass = gatepasses.find(g => g.invoiceId === id);

  const getProductName = (productId: string | null): string => {
    if (!productId) return 'Unknown Product';
    const product = products.find(p => p.id === productId);
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
    toast({
      title: "Email Invoice",
      description: "Email functionality will be implemented soon.",
      variant: "default",
    });
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            data-testid="button-edit-invoice"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <PrintableInvoice invoice={invoice} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleEmail}
            data-testid="button-email-invoice"
          >
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          {invoice.status === 'draft' && (
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
                {items.map((item, index) => {
                  const totalGst = item.cgstAmount + item.sgstAmount + item.igstAmount;
                  const gstRate = (item.cgstRate + item.sgstRate + item.igstRate) / 100;
                  
                  return (
                    <tr key={item.id} className="border-b" data-testid={`row-item-${index + 1}`}>
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">
                        <div className="font-medium">{item.description}</div>
                        <div className="text-sm text-muted-foreground">{getProductName(item.productId)}</div>
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
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount Received:</span>
              <span className="font-medium text-green-600">{formatCurrency(invoice.amountReceived || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Balance Due:</span>
              <span className="font-medium text-orange-600">
                {formatCurrency(invoice.totalAmount - (invoice.amountReceived || 0))}
              </span>
            </div>
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
    </div>
  );
}
