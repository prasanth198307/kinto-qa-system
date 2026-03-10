import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Edit, 
  ClipboardList,
  FileText,
  CalendarCheck
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/use-auth";

export default function SalesOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { logoutMutation } = useAuth();
  const [cancellationReason, setCancellationReason] = useState("");

  const { data: salesOrder, isLoading: isLoadingSO } = useQuery<any>({
    queryKey: ['/api/sales-orders', id],
  });

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<any[]>({
    queryKey: ['/api/sales-orders', id, 'invoices'],
    queryFn: async () => {
      const res = await fetch(`/api/sales-orders/${id}/invoices`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/sales-orders/${id}/confirm`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-orders', id] });
      toast({ title: "Sales Order Confirmed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/sales-orders/${id}/cancel`, { cancellationReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-orders', id] });
      toast({ title: "Sales Order Cancelled" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoadingSO) {
    return (
      <div className="flex flex-col min-h-screen">
        <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />
        <div className="flex-1 flex items-center justify-center p-6 mt-16">
          <p className="text-muted-foreground">Loading Sales Order...</p>
        </div>
      </div>
    );
  }

  if (!salesOrder) {
    return (
      <div className="flex flex-col min-h-screen">
        <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />
        <div className="flex-1 p-6 mt-16 max-w-4xl mx-auto w-full">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold text-destructive mb-4">Sales Order Not Found</h2>
            <Button onClick={() => setLocation('/?tab=sales-orders')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sales Orders
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const items = salesOrder.items || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'confirmed': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 no-default-hover-elevate">Confirmed</Badge>;
      case 'invoiced': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 no-default-hover-elevate">Invoiced</Badge>;
      case 'partially_invoiced': return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 no-default-hover-elevate">Partially Invoiced</Badge>;
      case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amountInPaise: number) => {
    return (amountInPaise / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />
      <div className="flex-1 p-6 mt-16 max-w-7xl mx-auto w-full space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/?tab=sales-orders')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{salesOrder.soNumber}</h1>
                {getStatusBadge(salesOrder.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                Date: {salesOrder.soDate ? format(new Date(salesOrder.soDate), "dd MMM yyyy") : "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(salesOrder.status === 'draft') && (
              <Button 
                variant="default"
                onClick={() => confirmMutation.mutate()}
                disabled={confirmMutation.isPending}
                data-testid="button-confirm-so"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Confirm
              </Button>
            )}
            {(salesOrder.status === 'confirmed' || salesOrder.status === 'partially_invoiced') && (
              <Button 
                variant="default"
                onClick={() => setLocation(`/?soId=${salesOrder.id}`)}
                data-testid="button-create-invoice"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            )}
            {(salesOrder.status === 'draft' || salesOrder.status === 'confirmed') && (
              <Button 
                variant="outline"
                onClick={() => setLocation(`/sales-orders/${salesOrder.id}/edit`)}
                data-testid="button-edit-so"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            {(salesOrder.status !== 'invoiced' && salesOrder.status !== 'cancelled') && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive" data-testid="button-cancel-so">
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Sales Order</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to cancel this sales order? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4 space-y-2">
                    <Label htmlFor="reason">Cancellation Reason</Label>
                    <Input 
                      id="reason" 
                      placeholder="Enter reason..." 
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                    />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Back</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                    >
                      Cancel Order
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Details Section */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Buyer & Shipping Details</CardTitle>
              </CardHeader>
              <CardContent>
                {salesOrder.deliveryDate && (
                  <div className="mb-4 p-3 rounded-md bg-muted/50 flex items-center gap-2 text-sm">
                    <CalendarCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">Expected Delivery:</span>
                    <span className="font-medium">{format(new Date(salesOrder.deliveryDate), 'dd MMM yyyy')}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Buyer Details</h4>
                      <p className="font-medium text-lg">{salesOrder.buyerName}</p>
                      {salesOrder.buyerGstin && (
                        <p className="text-sm">GSTIN: <span className="font-mono">{salesOrder.buyerGstin}</span></p>
                      )}
                      {salesOrder.buyerContact && (
                        <p className="text-sm">Contact: {salesOrder.buyerContact}</p>
                      )}
                      {salesOrder.buyerAddress && (
                        <p className="text-sm mt-2 text-muted-foreground leading-relaxed">{salesOrder.buyerAddress}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Shipping Details</h4>
                      <p className="font-medium">{salesOrder.shipToName || salesOrder.buyerName}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {salesOrder.shipToAddress || salesOrder.buyerAddress}<br />
                        {salesOrder.shipToCity && `${salesOrder.shipToCity}, `}
                        {salesOrder.shipToState && `${salesOrder.shipToState} `}
                        {salesOrder.shipToPin && `- ${salesOrder.shipToPin}`}
                      </p>
                    </div>
                  </div>
                </div>
                {salesOrder.remarks && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Remarks</h4>
                      <p className="text-sm italic text-muted-foreground">"{salesOrder.remarks}"</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Line Items</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Taxable</TableHead>
                      <TableHead className="text-right">Tax%</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item: any, idx: number) => (
                      <TableRow key={item.id || idx}>
                        <TableCell>
                          <div className="font-medium">{item.productName || "Unknown Product"}</div>
                          {item.description && <div className="text-xs text-muted-foreground">{item.description}</div>}
                          {item.hsnCode && <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">HSN: {item.hsnCode}</div>}
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.taxableAmount)}</TableCell>
                        <TableCell className="text-right text-xs">
                          {Number(item.igstRate) > 0 ? (
                            <span>IGST {item.igstRate}%</span>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span>CGST {item.cgstRate}%</span>
                              <span>SGST {item.sgstRate}%</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono">{formatCurrency(item.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-6 flex flex-col items-end gap-2 bg-muted/20">
                  <div className="flex justify-between w-full max-w-[240px] text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-mono">{formatCurrency(items.reduce((acc: number, item: any) => acc + (item.taxableAmount || 0), 0))}</span>
                  </div>
                  <div className="flex justify-between w-full max-w-[240px] text-sm">
                    <span className="text-muted-foreground">Total Tax:</span>
                    <span className="font-mono">{formatCurrency(salesOrder.totalAmount - items.reduce((acc: number, item: any) => acc + (item.taxableAmount || 0), 0))}</span>
                  </div>
                  <Separator className="w-full max-w-[240px] my-1" />
                  <div className="flex justify-between w-full max-w-[240px] text-lg font-bold">
                    <span>Grand Total:</span>
                    <span className="font-mono text-primary">{formatCurrency(salesOrder.totalAmount)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Linked Invoices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingInvoices ? (
                  <p className="text-sm text-muted-foreground">Loading invoices...</p>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg">
                    <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground px-4">No invoices have been generated from this sales order yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((inv: any) => (
                      <div 
                        key={inv.id} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => setLocation(`/invoice/${inv.id}`)}
                      >
                        <div className="space-y-1">
                          <p className="text-sm font-bold group-hover:text-primary transition-colors">{inv.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(inv.invoiceDate), "dd MMM yyyy")}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-xs font-mono font-bold">{formatCurrency(inv.totalAmount)}</p>
                          <Badge variant="outline" className="text-[10px] h-4 uppercase tracking-tighter">{inv.status?.replace(/_/g, ' ')}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Audit Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Created By</p>
                  <p className="font-medium capitalize">{salesOrder.recordedByUsername || salesOrder.recordedBy || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{salesOrder.createdAt ? format(new Date(salesOrder.createdAt), "dd MMM yyyy HH:mm") : "N/A"}</p>
                </div>
                {salesOrder.status === 'cancelled' && (
                  <div>
                    <Separator className="my-3" />
                    <p className="text-muted-foreground mb-1">Cancelled By</p>
                    <p className="font-medium capitalize">{salesOrder.cancelledByUsername || salesOrder.cancelledBy || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{salesOrder.cancelledAt ? format(new Date(salesOrder.cancelledAt), "dd MMM yyyy HH:mm") : "N/A"}</p>
                    {salesOrder.cancellationReason && (
                      <p className="text-xs mt-2 text-destructive font-medium italic">"{salesOrder.cancellationReason}"</p>
                    )}
                  </div>
                )}
                {salesOrder.status !== 'draft' && salesOrder.status !== 'cancelled' && (
                  <div>
                    <Separator className="my-3" />
                    <p className="text-muted-foreground mb-1">Confirmed By</p>
                    <p className="font-medium capitalize">{salesOrder.confirmedByUsername || salesOrder.confirmedBy || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{salesOrder.confirmedAt ? format(new Date(salesOrder.confirmedAt), "dd MMM yyyy HH:mm") : "N/A"}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
