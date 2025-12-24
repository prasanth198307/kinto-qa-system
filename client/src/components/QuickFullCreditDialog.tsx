import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, AlertTriangle, Loader2, History } from "lucide-react";
import type { InvoiceItem } from "@shared/schema";

interface EffectiveItem {
  id: string;
  productName: string;
  originalQuantity: number;
  originalUnitPrice: number;
  originalTaxableValue: number;
  creditedValue: number;
  debitedValue: number;
  effectiveQuantity: number;
  effectiveUnitPrice: number;
  effectiveTaxableValue: number;
  remainingCreditable: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  hasAdjustments: boolean;
}

interface EffectiveItemsResponse {
  items: EffectiveItem[];
  summary: {
    totalCreditedValue: number;
    totalDebitedValue: number;
    creditNoteCount: number;
    debitNoteCount: number;
  };
}

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

  // Fetch effective values to show remaining creditable amount
  const { data: effectiveData, isLoading: isLoadingEffective } = useQuery<EffectiveItemsResponse>({
    queryKey: ['/api/invoice-items-effective', invoiceId],
    enabled: open && !!invoiceId,
  });

  const formatCurrency = (amountInPaise: number) => {
    return `₹${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Calculate remaining amounts based on effective values (value-based approach)
  const hasPreviousAdjustments = effectiveData?.summary && 
    (effectiveData.summary.creditNoteCount > 0 || effectiveData.summary.debitNoteCount > 0);

  // Calculate remaining creditable using the value-based approach
  // remainingCreditable = original - credited + debited for each item
  const remainingCreditableSubtotal = effectiveData?.items.reduce((sum, item) => 
    sum + item.remainingCreditable, 0) || subtotal;
  
  // Calculate GST on remaining amount
  const remainingCgstAmount = effectiveData?.items.reduce((sum, item) => 
    sum + Math.round(item.remainingCreditable * item.cgstRate / 10000), 0) || cgstAmount;
  
  const remainingSgstAmount = effectiveData?.items.reduce((sum, item) => 
    sum + Math.round(item.remainingCreditable * item.sgstRate / 10000), 0) || sgstAmount;
  
  const remainingIgstAmount = effectiveData?.items.reduce((sum, item) => 
    sum + Math.round(item.remainingCreditable * item.igstRate / 10000), 0) || igstAmount;
  
  const remainingGrandTotal = remainingCreditableSubtotal + remainingCgstAmount + remainingSgstAmount + remainingIgstAmount;

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
            {hasPreviousAdjustments ? "Credit Remaining Amount" : "Full Invoice Credit"}
          </AlertDialogTitle>
          <AlertDialogDescription data-testid="description-quick-full-credit">
            {hasPreviousAdjustments 
              ? "Create a credit note for the remaining effective amount."
              : "Create a credit note for the entire invoice amount."
            }
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isLoadingEffective ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {hasPreviousAdjustments && (
              <Card className="p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <History className="h-4 w-4" />
                  <span>
                    This invoice has previous adjustments: 
                    {effectiveData?.summary.creditNoteCount ? ` ${effectiveData.summary.creditNoteCount} credit note(s) (${formatCurrency(effectiveData.summary.totalCreditedValue)})` : ''}
                    {effectiveData?.summary.creditNoteCount && effectiveData?.summary.debitNoteCount ? ' and' : ''}
                    {effectiveData?.summary.debitNoteCount ? ` ${effectiveData.summary.debitNoteCount} debit note(s) (${formatCurrency(effectiveData.summary.totalDebitedValue)})` : ''}.
                  </span>
                </div>
              </Card>
            )}

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
                <div className="font-medium mb-2">
                  {hasPreviousAdjustments ? "Remaining Items to Credit:" : "Items to Credit:"}
                </div>
                {effectiveData?.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-muted-foreground">
                    <span className="truncate max-w-[200px]" title={item.productName}>
                      {item.productName} x {item.originalQuantity}
                      {item.hasAdjustments && (
                        <span className="text-xs text-blue-500 ml-1">
                          (credited: {formatCurrency(item.creditedValue)}
                          {item.debitedValue > 0 && `, debited: ${formatCurrency(item.debitedValue)}`})
                        </span>
                      )}
                    </span>
                    <span>{formatCurrency(item.remainingCreditable)}</span>
                  </div>
                )) || invoiceItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-muted-foreground">
                    <span className="truncate max-w-[200px]" title={item.description}>
                      {item.description} x {item.quantity}
                    </span>
                    <span>{formatCurrency(item.quantity * item.unitPrice)}</span>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-1 text-sm">
                {hasPreviousAdjustments && (
                  <>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Original Invoice Total:</span>
                      <span className="line-through">{formatCurrency(grandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-blue-600 dark:text-blue-400">
                      <span>Already Credited:</span>
                      <span>-{formatCurrency(effectiveData?.summary.totalCreditedValue || 0)}</span>
                    </div>
                    {(effectiveData?.summary.debitNoteCount || 0) > 0 && (
                      <div className="flex justify-between text-orange-600 dark:text-orange-400">
                        <span>Debited:</span>
                        <span>+{formatCurrency(effectiveData?.summary.totalDebitedValue || 0)}</span>
                      </div>
                    )}
                    <Separator />
                  </>
                )}
                <div className="flex justify-between">
                  <span>{hasPreviousAdjustments ? "Remaining Subtotal:" : "Subtotal:"}</span>
                  <span>{formatCurrency(remainingCreditableSubtotal)}</span>
                </div>
                {remainingCgstAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>CGST:</span>
                    <span>{formatCurrency(remainingCgstAmount)}</span>
                  </div>
                )}
                {remainingSgstAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>SGST:</span>
                    <span>{formatCurrency(remainingSgstAmount)}</span>
                  </div>
                )}
                {remainingIgstAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>IGST:</span>
                    <span>{formatCurrency(remainingIgstAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-destructive">
                  <span>{hasPreviousAdjustments ? "Credit Amount:" : "Total Credit Amount:"}</span>
                  <span>{formatCurrency(remainingGrandTotal)}</span>
                </div>
              </div>
            </Card>

            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {hasPreviousAdjustments 
                  ? `This will credit the remaining amount of ${formatCurrency(remainingGrandTotal)}. This action cannot be undone.`
                  : `This will create a credit note for the full invoice amount of ${formatCurrency(remainingGrandTotal)}. This action cannot be undone.`
                }
              </p>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" data-testid="error-message">
                {error}
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting} data-testid="button-cancel">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isSubmitting || isLoadingEffective || remainingGrandTotal <= 0}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            data-testid="button-confirm-full-credit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              `Credit ${formatCurrency(remainingGrandTotal)}`
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
