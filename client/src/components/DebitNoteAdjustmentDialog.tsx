import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Package, Check, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface PendingInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount?: number;
  grandTotal?: number;
  buyerName?: string | null;
  vendorName?: string | null;
  paidAmount: number;
  adjustedAmount?: number;
  pendingAmount: number;
}

interface PendingPO {
  id: string;
  poNumber: string;
  poDate: string;
  grandTotal: number | null;
  status: string | null;
  adjustedAmount: number;
  pendingAmount: number;
}

interface SelectedItem {
  id: string;
  amount: number;
  maxAmount: number;
  type: "invoice" | "purchase_order";
  label: string;
}

interface DebitNoteAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debitNote: {
    id: string;
    noteNumber: string;
    vendorId: string;
    vendorName: string | null;
    grandTotal: number;
    settledAmount: number;
  };
  onSuccess?: () => void;
}

export function DebitNoteAdjustmentDialog({
  open,
  onOpenChange,
  debitNote,
  onSuccess,
}: DebitNoteAdjustmentDialogProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<"invoice" | "purchase_order">("invoice");
  const [selectedItems, setSelectedItems] = useState<Record<string, SelectedItem>>({});
  const [remarks, setRemarks] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unsettledAmount = debitNote.grandTotal - debitNote.settledAmount;

  // Reset selections when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedItems({});
      setRemarks("");
    }
  }, [open]);

  const { data: pendingInvoices = [], isLoading: loadingInvoices } = useQuery<PendingInvoice[]>({
    queryKey: ["/api/vendor-debit-notes/pending-invoices", debitNote.vendorId],
    queryFn: () => fetch(`/api/vendor-debit-notes/pending-invoices/${debitNote.vendorId}`).then(r => r.json()),
    enabled: open && !!debitNote.vendorId,
  });

  const { data: pendingPOs = [], isLoading: loadingPOs } = useQuery<PendingPO[]>({
    queryKey: ["/api/vendor-debit-notes/pending-purchase-orders", debitNote.vendorId],
    queryFn: () => fetch(`/api/vendor-debit-notes/pending-purchase-orders/${debitNote.vendorId}`).then(r => r.json()),
    enabled: open && !!debitNote.vendorId,
  });

  const adjustmentMutation = useMutation({
    mutationFn: async (data: {
      referenceType: string;
      invoiceId?: string;
      purchaseOrderId?: string;
      adjustmentAmount: number;
      remarks: string;
    }) => {
      return apiRequest(`/api/vendor-debit-notes/${debitNote.id}/adjustments`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  });

  const formatCurrency = (paise: number) => {
    return `₹${(paise / 100).toFixed(2)}`;
  };

  const totalSelectedAmount = Object.values(selectedItems).reduce((sum, item) => sum + item.amount, 0);
  const remainingToAllocate = unsettledAmount - totalSelectedAmount;

  const handleToggleItem = (id: string, type: "invoice" | "purchase_order", maxAmount: number, label: string) => {
    setSelectedItems(prev => {
      if (prev[id]) {
        const { [id]: removed, ...rest } = prev;
        return rest;
      } else {
        // Auto-allocate: use remaining amount or max, whichever is smaller
        const autoAmount = Math.min(maxAmount, remainingToAllocate);
        return {
          ...prev,
          [id]: { id, amount: autoAmount > 0 ? autoAmount : 0, maxAmount, type, label }
        };
      }
    });
  };

  const handleAmountChange = (id: string, value: number) => {
    setSelectedItems(prev => {
      if (!prev[id]) return prev;
      const item = prev[id];
      const clampedValue = Math.min(Math.max(0, value), item.maxAmount);
      return {
        ...prev,
        [id]: { ...item, amount: clampedValue }
      };
    });
  };

  const handleSubmit = async () => {
    const items = Object.values(selectedItems).filter(item => item.amount > 0);
    
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one item with an amount",
        variant: "destructive",
      });
      return;
    }

    if (totalSelectedAmount > unsettledAmount) {
      toast({
        title: "Error",
        description: `Total adjustment (${formatCurrency(totalSelectedAmount)}) exceeds unsettled balance (${formatCurrency(unsettledAmount)})`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit each adjustment sequentially
      for (const item of items) {
        await adjustmentMutation.mutateAsync({
          referenceType: item.type,
          invoiceId: item.type === "invoice" ? item.id : undefined,
          purchaseOrderId: item.type === "purchase_order" ? item.id : undefined,
          adjustmentAmount: item.amount,
          remarks,
        });
      }
      
      toast({
        title: "Adjustments Created",
        description: `${items.length} adjustment(s) totaling ${formatCurrency(totalSelectedAmount)} created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-debit-notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-debit-notes/pending-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-debit-notes/pending-purchase-orders"] });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create adjustments",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Adjust Debit Note
          </DialogTitle>
          <DialogDescription>
            Adjust debit note <span className="font-semibold">{debitNote.noteNumber}</span> against pending invoices or purchase orders from {debitNote.vendorName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Debit Note Total</p>
              <p className="text-lg font-semibold">{formatCurrency(debitNote.grandTotal)}</p>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div>
              <p className="text-sm text-muted-foreground">Already Settled</p>
              <p className="text-lg font-semibold">{formatCurrency(debitNote.settledAmount)}</p>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div>
              <p className="text-sm text-muted-foreground">Unsettled Balance</p>
              <p className="text-lg font-semibold text-primary">{formatCurrency(unsettledAmount)}</p>
            </div>
          </div>

          {/* Allocation Summary */}
          {Object.keys(selectedItems).length > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Allocating to {Object.keys(selectedItems).length} item(s)
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Total: {formatCurrency(totalSelectedAmount)} | Remaining: {formatCurrency(remainingToAllocate)}
                  </p>
                </div>
                {totalSelectedAmount > unsettledAmount && (
                  <Badge variant="destructive">Exceeds Balance!</Badge>
                )}
              </div>
            </div>
          )}

          <Tabs value={selectedType} onValueChange={(v) => setSelectedType(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="invoice" className="gap-2">
                <FileText className="h-4 w-4" />
                Sales Invoices ({pendingInvoices.length})
              </TabsTrigger>
              <TabsTrigger value="purchase_order" className="gap-2">
                <Package className="h-4 w-4" />
                Purchase Orders ({pendingPOs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="invoice" className="mt-4">
              <ScrollArea className="h-[280px] border rounded-md p-2">
                {loadingInvoices ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : pendingInvoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>No pending invoices found for this vendor</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingInvoices.map((invoice) => {
                      const isSelected = !!selectedItems[invoice.id];
                      const selectedItem = selectedItems[invoice.id];
                      return (
                        <Card 
                          key={invoice.id} 
                          className={`transition-colors ${isSelected ? "border-primary bg-primary/5" : ""}`}
                          data-testid={`invoice-option-${invoice.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleItem(invoice.id, "invoice", invoice.pendingAmount, invoice.invoiceNumber)}
                                data-testid={`checkbox-invoice-${invoice.id}`}
                              />
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">{invoice.invoiceNumber}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">{formatCurrency(invoice.pendingAmount)}</p>
                                    <p className="text-xs text-muted-foreground">pending</p>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <Label className="text-xs whitespace-nowrap">Adjust Amount:</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="h-8 w-32"
                                      value={((selectedItem?.amount || 0) / 100).toFixed(2)}
                                      onChange={(e) => handleAmountChange(invoice.id, Math.round(parseFloat(e.target.value || "0") * 100))}
                                      data-testid={`input-amount-${invoice.id}`}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      max: {formatCurrency(invoice.pendingAmount)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="purchase_order" className="mt-4">
              <ScrollArea className="h-[280px] border rounded-md p-2">
                {loadingPOs ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : pendingPOs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>No pending purchase orders found for this vendor</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingPOs.map((po) => {
                      const isSelected = !!selectedItems[po.id];
                      const selectedItem = selectedItems[po.id];
                      return (
                        <Card 
                          key={po.id} 
                          className={`transition-colors ${isSelected ? "border-primary bg-primary/5" : ""}`}
                          data-testid={`po-option-${po.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleToggleItem(po.id, "purchase_order", po.pendingAmount, po.poNumber)}
                                data-testid={`checkbox-po-${po.id}`}
                              />
                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium">{po.poNumber}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {po.poDate ? format(new Date(po.poDate), "dd MMM yyyy") : "N/A"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <Badge variant="outline" className="mb-1">{po.status}</Badge>
                                    <p className="font-medium">{formatCurrency(po.pendingAmount)}</p>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <Label className="text-xs whitespace-nowrap">Adjust Amount:</Label>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      className="h-8 w-32"
                                      value={((selectedItem?.amount || 0) / 100).toFixed(2)}
                                      onChange={(e) => handleAmountChange(po.id, Math.round(parseFloat(e.target.value || "0") * 100))}
                                      data-testid={`input-amount-${po.id}`}
                                    />
                                    <span className="text-xs text-muted-foreground">
                                      max: {formatCurrency(po.pendingAmount)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {Object.keys(selectedItems).length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks (Optional)</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any notes about this adjustment..."
                className="resize-none"
                data-testid="input-adjustment-remarks"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-adjustment">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={Object.keys(selectedItems).length === 0 || totalSelectedAmount <= 0 || totalSelectedAmount > unsettledAmount || isSubmitting}
            data-testid="button-confirm-adjustment"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Confirm Adjustment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
