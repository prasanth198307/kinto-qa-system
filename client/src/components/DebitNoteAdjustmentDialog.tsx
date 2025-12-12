import { useState } from "react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Package, Check, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

interface PendingInvoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  grandTotal: number;
  vendorName: string | null;
  paidAmount: number;
  adjustedAmount: number;
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
  const [selectedId, setSelectedId] = useState<string>("");
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [remarks, setRemarks] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const unsettledAmount = debitNote.grandTotal - debitNote.settledAmount;

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
    onSuccess: () => {
      toast({
        title: "Adjustment Created",
        description: "The debit note has been adjusted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-debit-notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-debit-notes/pending-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-debit-notes/pending-purchase-orders"] });
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create adjustment",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedId("");
    setAdjustmentAmount(0);
    setRemarks("");
  };

  const formatCurrency = (paise: number) => {
    return `₹${(paise / 100).toFixed(2)}`;
  };

  const handleSelect = (id: string, pendingAmount: number) => {
    setSelectedId(id);
    setAdjustmentAmount(Math.min(pendingAmount, unsettledAmount));
  };

  const handleSubmit = async () => {
    if (!selectedId) {
      toast({
        title: "Error",
        description: "Please select an invoice or purchase order",
        variant: "destructive",
      });
      return;
    }

    if (adjustmentAmount <= 0) {
      toast({
        title: "Error",
        description: "Adjustment amount must be greater than 0",
        variant: "destructive",
      });
      return;
    }

    if (adjustmentAmount > unsettledAmount) {
      toast({
        title: "Error",
        description: `Adjustment amount cannot exceed unsettled balance (${formatCurrency(unsettledAmount)})`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await adjustmentMutation.mutateAsync({
        referenceType: selectedType,
        invoiceId: selectedType === "invoice" ? selectedId : undefined,
        purchaseOrderId: selectedType === "purchase_order" ? selectedId : undefined,
        adjustmentAmount,
        remarks,
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

          <Tabs value={selectedType} onValueChange={(v) => { setSelectedType(v as any); setSelectedId(""); }}>
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
              <ScrollArea className="h-[250px] border rounded-md p-2">
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
                    {pendingInvoices.map((invoice) => (
                      <Card 
                        key={invoice.id} 
                        className={`cursor-pointer transition-colors hover-elevate ${selectedId === invoice.id ? "border-primary bg-primary/5" : ""}`}
                        onClick={() => handleSelect(invoice.id, invoice.pendingAmount)}
                        data-testid={`invoice-option-${invoice.id}`}
                      >
                        <CardContent className="p-3 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            {selectedId === invoice.id && <Check className="h-5 w-5 text-primary" />}
                            <div>
                              <p className="font-medium">{invoice.invoiceNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(invoice.invoiceDate), "dd MMM yyyy")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(invoice.pendingAmount)}</p>
                            <p className="text-xs text-muted-foreground">
                              of {formatCurrency(invoice.grandTotal)} pending
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="purchase_order" className="mt-4">
              <ScrollArea className="h-[250px] border rounded-md p-2">
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
                    {pendingPOs.map((po) => (
                      <Card 
                        key={po.id} 
                        className={`cursor-pointer transition-colors hover-elevate ${selectedId === po.id ? "border-primary bg-primary/5" : ""}`}
                        onClick={() => handleSelect(po.id, po.pendingAmount)}
                        data-testid={`po-option-${po.id}`}
                      >
                        <CardContent className="p-3 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            {selectedId === po.id && <Check className="h-5 w-5 text-primary" />}
                            <div>
                              <p className="font-medium">{po.poNumber}</p>
                              <p className="text-sm text-muted-foreground">
                                {po.poDate ? format(new Date(po.poDate), "dd MMM yyyy") : "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline">{po.status}</Badge>
                            <p className="font-medium mt-1">{formatCurrency(po.pendingAmount)}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {selectedId && (
            <div className="space-y-3 pt-2">
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="adjustmentAmount">Adjustment Amount (₹)</Label>
                  <Input
                    id="adjustmentAmount"
                    type="number"
                    step="0.01"
                    value={(adjustmentAmount / 100).toFixed(2)}
                    onChange={(e) => setAdjustmentAmount(Math.round(parseFloat(e.target.value || "0") * 100))}
                    data-testid="input-adjustment-amount"
                  />
                </div>
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
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-adjustment">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedId || adjustmentAmount <= 0 || isSubmitting}
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
