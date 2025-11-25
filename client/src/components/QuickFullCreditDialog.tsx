import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreditCard, AlertTriangle, Loader2 } from "lucide-react";
import type { InvoiceItem } from "@shared/schema";

interface QuickFullCreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  invoiceItems: InvoiceItem[];
  subtotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  grandTotal: number;
  buyerName: string;
  onSuccess?: (creditNoteNumber: string) => void;
}

export function QuickFullCreditDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  invoiceItems,
  subtotal,
  cgstAmount,
  sgstAmount,
  igstAmount,
  grandTotal,
  buyerName,
  onSuccess,
}: QuickFullCreditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amountInPaise: number) => {
    return `₹${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await fetch("/api/credit-notes/quick-full-credit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          invoiceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create credit note");
      }

      const result = await response.json();
      
      if (onSuccess) {
        onSuccess(result.creditNoteNumber);
      }
      
      onOpenChange(false);
    } catch (err) {
      console.error("Error creating full credit:", err);
      setError(err instanceof Error ? err.message : "Failed to create credit note");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-lg" data-testid="dialog-quick-full-credit">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2" data-testid="title-quick-full-credit">
            <CreditCard className="h-5 w-5 text-destructive" />
            Full Invoice Credit
          </AlertDialogTitle>
          <AlertDialogDescription data-testid="description-quick-full-credit">
            Create a credit note for the <strong>entire invoice amount</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Invoice Number:</span>
              <Badge variant="outline">{invoiceNumber}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Buyer:</span>
              <span className="text-sm">{buyerName}</span>
            </div>
            <Separator />
            
            <div className="space-y-1 text-sm">
              <div className="font-medium mb-2">Items to Credit:</div>
              {invoiceItems.map((item) => (
                <div key={item.id} className="flex justify-between text-muted-foreground">
                  <span className="truncate max-w-[200px]" title={item.productName}>
                    {item.productName} x {item.quantity}
                  </span>
                  <span>{formatCurrency(item.quantity * item.unitPrice)}</span>
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {cgstAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>CGST:</span>
                  <span>{formatCurrency(cgstAmount)}</span>
                </div>
              )}
              {sgstAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>SGST:</span>
                  <span>{formatCurrency(sgstAmount)}</span>
                </div>
              )}
              {igstAmount > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>IGST:</span>
                  <span>{formatCurrency(igstAmount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-destructive">
                <span>Total Credit Amount:</span>
                <span>{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </Card>

          <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              This will create a credit note for the <strong>full invoice amount</strong> of {formatCurrency(grandTotal)}. 
              This action cannot be undone.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" data-testid="error-message">
              {error}
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting} data-testid="button-cancel">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isSubmitting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-full-credit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              `Credit ${formatCurrency(grandTotal)}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
