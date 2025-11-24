import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Mail, FileText, Printer, Star, Receipt, RefreshCw } from "lucide-react";
import type { Invoice, InvoiceItem, Product, Gatepass } from "@shared/schema";
import PrintableInvoice from "@/components/PrintableInvoice";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { GlobalHeader } from "@/components/GlobalHeader";
import { CreateCreditNoteDialog } from "@/components/CreateCreditNoteDialog";

interface Vendor {
  id: string;
  vendorCode: string;
  vendorName: string;
  vendorType: string;
  [key: string]: any;
}

interface VendorType {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: number;
}

interface VendorVendorType {
  id: string;
  vendorId: string;
  vendorTypeId: string;
  isPrimary: number;
  vendorType?: VendorType;
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { logoutMutation, user } = useAuth();
  const [isCreditNoteDialogOpen, setIsCreditNoteDialogOpen] = useState(false);

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

  // Fetch all vendors to find the one matching this invoice's buyer
  // Note: This may fail for non-admin users, which is acceptable - they just won't see vendor type badges
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
    retry: false,
    throwOnError: false,
  });

  // Fetch all vendor-type assignments
  // Note: This may fail for non-admin users, which is acceptable
  const { data: allVendorTypeAssignments = [] } = useQuery<VendorVendorType[]>({
    queryKey: ['/api/vendor-vendor-types/batch'],
    retry: false,
    throwOnError: false,
  });

  // Cancel & Reissue mutation - MUST be before early returns to avoid hooks ordering violation
  const cancelAndReissueMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/invoices/${id}/cancel-and-reissue`, {});
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Invoice Cancelled",
        description: data.message || "Invoice cancelled. Redirecting to create new invoice...",
      });
      
      // Store invoice data and reissue flag in sessionStorage for re-issue
      if (data.invoiceData) {
        sessionStorage.setItem('reissue-invoice-data', JSON.stringify(data.invoiceData));
        sessionStorage.setItem('is-reissue', data.isReissue ? 'true' : 'false');
      }
      
      // Navigate to invoice creation with reissue flag
      navigate('/?tab=invoices&reissue=true');
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel & reissue invoice",
        variant: "destructive",
      });
    },
  });

  // Find the vendor matching the buyer name - use Array.isArray for safety
  const safeVendors = Array.isArray(vendors) ? vendors : [];
  const matchingVendor = safeVendors.find(v => v.vendorName === invoice?.buyerName);
  
  // Get vendor types for this vendor
  const safeVendorTypeAssignments = Array.isArray(allVendorTypeAssignments) ? allVendorTypeAssignments : [];
  const vendorTypes = matchingVendor 
    ? safeVendorTypeAssignments.filter(a => a.vendorId === matchingVendor.id)
    : [];

  if (isLoadingInvoice) {
    return (
      <>
        <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />
        <div className="min-h-screen p-6 mt-16 flex items-center justify-center">
          <div className="text-muted-foreground">Loading invoice...</div>
        </div>
      </>
    );
  }

  if (!invoice) {
    return (
      <>
        <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />
        <div className="min-h-screen p-6 mt-16">
          <Card className="max-w-md mx-auto p-8 text-center">
            <h2 className="text-2xl font-bold text-destructive mb-4">Invoice Not Found</h2>
            <p className="text-muted-foreground mb-6">The requested invoice could not be found.</p>
            <Button onClick={() => navigate('/')} data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Card>
        </div>
      </>
    );
  }

  // Use Array.isArray checks for safety
  const safeGatepasses = Array.isArray(gatepasses) ? gatepasses : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const safeItems = Array.isArray(items) ? items : [];
  
  const relatedGatepass = safeGatepasses.find(g => g.invoiceId === id);

  const getProductName = (productId: string | null): string => {
    if (!productId) return 'Unknown Product';
    const product = safeProducts.find(p => p.id === productId);
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

  const handleCreditNoteSuccess = (creditNoteNumber: string) => {
    toast({
      title: "Credit Note Created",
      description: `Credit note ${creditNoteNumber} has been created successfully.`,
    });
    // Refresh invoice data to show updated outstanding balance
    queryClient.invalidateQueries({ queryKey: ['/api/invoices', id] });
    queryClient.invalidateQueries({ queryKey: ['/api/credit-notes'] });
  };

  // Check if user is admin or manager
  const canCreateCreditNote = user && (user.role === 'admin' || user.role === 'manager');
  
  // Check if invoice is in current month
  const isCurrentMonth = () => {
    if (!invoice) return false;
    const now = new Date();
    const invoiceDate = new Date(invoice.invoiceDate);
    return now.getMonth() === invoiceDate.getMonth() && 
           now.getFullYear() === invoiceDate.getFullYear();
  };
  
  const canCancelAndReissue = canCreateCreditNote && isCurrentMonth() && !relatedGatepass;

  return (
    <>
      <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />
      <div className="min-h-screen p-6 mt-16 space-y-6">
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
          {canCreateCreditNote && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreditNoteDialogOpen(true)}
              data-testid="button-create-credit-note"
            >
              <Receipt className="w-4 h-4 mr-2" />
              Create Credit Note
            </Button>
          )}
          {canCancelAndReissue && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => cancelAndReissueMutation.mutate()}
              disabled={cancelAndReissueMutation.isPending}
              data-testid="button-cancel-and-reissue"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${cancelAndReissueMutation.isPending ? 'animate-spin' : ''}`} />
              {cancelAndReissueMutation.isPending ? 'Cancelling...' : 'Cancel & Reissue'}
            </Button>
          )}
          {!relatedGatepass && invoice.status !== 'delivered' && (
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
            {vendorTypes.length > 0 && (
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Classifications:</span>
                <div className="flex gap-1 flex-wrap justify-end" data-testid="vendor-types-badges">
                  {vendorTypes.map((vt) => (
                    <Badge
                      key={vt.id}
                      variant={vt.isPrimary === 1 ? "default" : "secondary"}
                      className="text-xs"
                      data-testid={`vendor-type-badge-${vt.vendorTypeId}`}
                    >
                      {vt.isPrimary === 1 && <Star className="h-2 w-2 mr-1 fill-current" />}
                      {vt.vendorType?.name || vt.vendorType?.code || 'Unknown'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
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
                {safeItems.map((item, index) => {
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

      {/* Credit Note Dialog */}
      <CreateCreditNoteDialog
        open={isCreditNoteDialogOpen}
        onOpenChange={setIsCreditNoteDialogOpen}
        invoiceId={id!}
        invoiceNumber={invoice.invoiceNumber}
        invoiceItems={safeItems}
        onSuccess={handleCreditNoteSuccess}
      />
      </div>
    </>
  );
}
