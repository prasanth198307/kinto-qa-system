import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator, AlertCircle, History } from "lucide-react";
import type { InvoiceItem } from "@shared/schema";

const correctAndCreditSchema = z.object({
  reason: z.enum(["pricing_error", "quantity_error", "discount", "other"], {
    required_error: "Please select a reason",
  }),
  customReason: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      invoiceItemId: z.string(),
      originalQuantity: z.number(),
      originalUnitPrice: z.number(),
      correctedQuantity: z.coerce.number().min(0, "Quantity must be 0 or more"),
      correctedUnitPrice: z.coerce.number().min(0, "Price must be 0 or more"),
    })
  ),
});

type CorrectAndCreditForm = z.infer<typeof correctAndCreditSchema>;

interface EffectiveItem {
  id: string;
  invoiceId: string;
  productId: string;
  productName: string;
  hsnCode: string;
  uom: string;
  originalQuantity: number;
  originalUnitPrice: number;
  originalTaxableValue: number;
  creditedValue: number;
  debitedValue: number;
  creditedQuantity: number;
  debitedQuantity: number;
  remainingQuantity: number;
  effectiveQuantity: number;
  effectiveUnitPrice: number;
  currentUnitPrice: number; // Actual per-unit value after ALL adjustments
  effectiveTaxableValue: number;
  remainingCreditable: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  hasAdjustments: boolean;
  priceIncreased: boolean;
  priceDecreased: boolean;
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

interface CorrectAndCreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  invoiceItems: InvoiceItem[];
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  onSuccess?: (creditNoteNumber: string) => void;
}

export function CorrectAndCreditDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  invoiceItems,
  cgstRate,
  sgstRate,
  igstRate,
  onSuccess,
}: CorrectAndCreditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: effectiveData, isLoading: isLoadingEffective } = useQuery<EffectiveItemsResponse>({
    queryKey: ['/api/invoice-items-effective', invoiceId],
    enabled: open && !!invoiceId,
  });

  const form = useForm<CorrectAndCreditForm>({
    resolver: zodResolver(correctAndCreditSchema),
    defaultValues: {
      reason: "pricing_error",
      notes: "",
      items: [],
    },
  });

  useEffect(() => {
    if (open && effectiveData?.items) {
      form.reset({
        reason: "pricing_error",
        notes: "",
        items: effectiveData.items.map(item => ({
          invoiceItemId: item.id,
          // Use remainingQuantity as the "original" for credit calculation (original + debited - credited)
          originalQuantity: item.remainingQuantity,
          // Use currentUnitPrice (actual per-unit value after ALL adjustments)
          originalUnitPrice: item.currentUnitPrice || item.originalUnitPrice,
          // Default to remaining quantity (no change = no credit)
          correctedQuantity: item.remainingQuantity,
          // Default price to current price (reflects all adjustments - credits AND debits)
          correctedUnitPrice: item.currentUnitPrice || item.originalUnitPrice,
        })),
      });
    }
  }, [open, effectiveData, form]);

  const reason = form.watch("reason");
  const watchedItems = form.watch("items");

  const watchedItemsKey = JSON.stringify(watchedItems.map(item => ({
    q: item.correctedQuantity,
    p: item.correctedUnitPrice,
  })));

  const creditCalculation = useMemo(() => {
    let totalRemaining = 0;
    let totalCorrected = 0;
    let exceedsRemaining = false;
    const itemDifferences: Array<{
      invoiceItemId: string;
      productName: string;
      remainingAmount: number;
      correctedAmount: number;
      difference: number;
      remainingCreditable: number;
      exceeds: boolean;
    }> = [];

    watchedItems.forEach((item, index) => {
      const effectiveItem = effectiveData?.items[index];
      if (!effectiveItem) return;

      const remainingQty = effectiveItem.remainingQuantity;
      const origPrice = Number(item.originalUnitPrice) || 0;
      const corrQty = Number(item.correctedQuantity) || 0;
      const corrPrice = Number(item.correctedUnitPrice) || 0;

      // Calculate based on REMAINING quantity (after previous credits)
      const remainingAmount = remainingQty * origPrice;
      const correctedAmount = corrQty * corrPrice;
      const difference = remainingAmount - correctedAmount;

      totalRemaining += remainingAmount;
      totalCorrected += correctedAmount;

      const exceeds = difference > effectiveItem.remainingCreditable;
      if (exceeds) exceedsRemaining = true;

      if (difference > 0) {
        itemDifferences.push({
          invoiceItemId: item.invoiceItemId,
          productName: effectiveItem.productName || invoiceItems[index]?.description || 'Unknown',
          remainingAmount,
          correctedAmount,
          difference,
          remainingCreditable: effectiveItem.remainingCreditable,
          exceeds,
        });
      }
    });

    const subtotalDifference = totalRemaining - totalCorrected;
    const cgstDifference = Math.round(subtotalDifference * cgstRate / 10000);
    const sgstDifference = Math.round(subtotalDifference * sgstRate / 10000);
    const igstDifference = Math.round(subtotalDifference * igstRate / 10000);
    const grandTotalDifference = subtotalDifference + cgstDifference + sgstDifference + igstDifference;

    const isIncreasing = totalCorrected > totalRemaining;
    
    return {
      totalRemaining,
      totalCorrected,
      subtotalDifference,
      cgstDifference,
      sgstDifference,
      igstDifference,
      grandTotalDifference,
      itemDifferences,
      hasChanges: subtotalDifference > 0,
      isIncreasing,
      exceedsRemaining,
    };
  }, [watchedItemsKey, effectiveData, invoiceItems, cgstRate, sgstRate, igstRate]);

  const handleSubmit = async (data: CorrectAndCreditForm) => {
    if (!creditCalculation.hasChanges) {
      if (creditCalculation.isIncreasing) {
        form.setError("root", {
          type: "manual",
          message: "Credit notes can only REDUCE amounts. To increase quantities or prices, use 'Correct & Debit' instead.",
        });
      } else {
        form.setError("root", {
          type: "manual",
          message: "No changes detected. Please reduce quantities or prices to create a credit.",
        });
      }
      return;
    }

    if (creditCalculation.exceedsRemaining) {
      form.setError("root", {
        type: "manual",
        message: "Credit amount exceeds remaining creditable value. Check highlighted items.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/credit-notes/correct-and-credit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          invoiceId,
          reason: data.reason,
          customReason: data.customReason,
          notes: data.notes,
          items: data.items.map(item => ({
            invoiceItemId: item.invoiceItemId,
            originalQuantity: item.originalQuantity,
            originalUnitPrice: item.originalUnitPrice,
            correctedQuantity: item.correctedQuantity,
            correctedUnitPrice: item.correctedUnitPrice,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create credit note");
      }

      const result = await response.json();
      
      if (onSuccess) {
        onSuccess(result.creditNoteNumber);
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating credit note:", error);
      form.setError("root", {
        type: "manual",
        message: error instanceof Error ? error.message : "Failed to create credit note",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amountInPaise: number) => {
    return `₹${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const hasPreviousAdjustments = effectiveData?.summary && 
    (effectiveData.summary.creditNoteCount > 0 || effectiveData.summary.debitNoteCount > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="dialog-correct-and-credit">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="title-correct-and-credit">
            <Calculator className="h-5 w-5" />
            Correct & Credit
          </DialogTitle>
          <DialogDescription data-testid="description-correct-and-credit">
            Edit the corrected values below. A credit note will be auto-generated for the difference.
            <br />
            <span className="font-medium">Invoice: {invoiceNumber}</span>
          </DialogDescription>
        </DialogHeader>

        {isLoadingEffective ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
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

              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Correction</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-correction-reason">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pricing_error" data-testid="option-pricing-error">Pricing Error</SelectItem>
                        <SelectItem value="quantity_error" data-testid="option-quantity-error">Quantity Error</SelectItem>
                        <SelectItem value="discount" data-testid="option-discount">Discount / Negotiation</SelectItem>
                        <SelectItem value="other" data-testid="option-other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {reason === "other" && (
                <FormField
                  control={form.control}
                  name="customReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Reason</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Enter custom reason"
                          data-testid="input-custom-reason"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="space-y-3">
                <FormLabel>Items - Enter Corrected Values</FormLabel>
                <div className="border rounded-md divide-y" data-testid="list-correction-items">
                  <div className="grid grid-cols-12 gap-2 p-3 bg-muted/50 text-sm font-medium">
                    <div className="col-span-3">Product</div>
                    <div className="col-span-2 text-center">Remaining Qty</div>
                    <div className="col-span-2 text-center">Current Price</div>
                    <div className="col-span-2 text-center">New Qty</div>
                    <div className="col-span-2 text-center">New Price</div>
                    <div className="col-span-1 text-right">Credit</div>
                  </div>
                  
                  {effectiveData?.items.map((item, index) => {
                    const watchedItem = watchedItems[index];
                    // Use currentUnitPrice (actual per-unit value after ALL adjustments)
                    const currentPrice = item.currentUnitPrice || item.originalUnitPrice;
                    // Use remainingQuantity for credit calculation (original + debited - credited)
                    const originalAmount = item.remainingQuantity * currentPrice;
                    const correctedAmount = watchedItem ? watchedItem.correctedQuantity * watchedItem.correctedUnitPrice : originalAmount;
                    const difference = originalAmount - correctedAmount;
                    const exceeds = difference > item.remainingCreditable;

                    return (
                      <div key={item.id} className={`grid grid-cols-12 gap-2 p-3 items-center ${exceeds ? 'bg-destructive/10' : ''}`} data-testid={`row-item-${item.id}`}>
                        <div className="col-span-3">
                          <div className="font-medium text-sm truncate" title={item.productName}>
                            {item.productName || invoiceItems[index]?.description || 'Unknown Product'}
                          </div>
                          {item.hasAdjustments && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              Already credited: {item.creditedQuantity} qty ({formatCurrency(item.creditedValue)})
                              {item.debitedValue > 0 && ` | Debited: ${item.debitedQuantity} qty (${formatCurrency(item.debitedValue)})`}
                            </div>
                          )}
                          {item.hasAdjustments && (
                            <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                              Remaining: {item.remainingQuantity} qty
                            </div>
                          )}
                        </div>
                        
                        <div className="col-span-2 text-center text-muted-foreground">
                          {item.remainingQuantity}
                        </div>
                        
                        <div className="col-span-2 text-center text-muted-foreground">
                          {formatCurrency(item.currentUnitPrice || item.originalUnitPrice)}
                          {item.priceIncreased && (
                            <span className="text-xs text-orange-500 block">(+adj.)</span>
                          )}
                          {item.priceDecreased && (
                            <span className="text-xs text-blue-500 block">(-adj.)</span>
                          )}
                        </div>
                        
                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.correctedQuantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={item.remainingQuantity}
                                    className="h-8 text-center"
                                    data-testid={`input-corrected-qty-${item.id}`}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="col-span-2">
                          <FormField
                            control={form.control}
                            name={`items.${index}.correctedUnitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    className="h-8 text-center"
                                    data-testid={`input-corrected-price-${item.id}`}
                                    value={(field.value / 100).toFixed(2)}
                                    onChange={(e) => {
                                      const rupeesValue = parseFloat(e.target.value) || 0;
                                      field.onChange(Math.round(rupeesValue * 100));
                                    }}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="col-span-1 text-right">
                          {difference > 0 ? (
                            <Badge variant={exceeds ? "destructive" : "destructive"} className="text-xs">
                              -{formatCurrency(difference)}
                            </Badge>
                          ) : difference < 0 ? (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              +{formatCurrency(Math.abs(difference))}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Card className="p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="h-4 w-4" />
                  <span className="font-medium">Credit Note Preview</span>
                </div>
                
                {creditCalculation.hasChanges ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Remaining Subtotal:</span>
                      <span>{formatCurrency(creditCalculation.totalRemaining)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Corrected Subtotal:</span>
                      <span>{formatCurrency(creditCalculation.totalCorrected)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-destructive">
                      <span>Credit Subtotal:</span>
                      <span>{formatCurrency(creditCalculation.subtotalDifference)}</span>
                    </div>
                    {cgstRate > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>CGST ({(cgstRate / 100).toFixed(1)}%):</span>
                        <span>{formatCurrency(creditCalculation.cgstDifference)}</span>
                      </div>
                    )}
                    {sgstRate > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>SGST ({(sgstRate / 100).toFixed(1)}%):</span>
                        <span>{formatCurrency(creditCalculation.sgstDifference)}</span>
                      </div>
                    )}
                    {igstRate > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>IGST ({(igstRate / 100).toFixed(1)}%):</span>
                        <span>{formatCurrency(creditCalculation.igstDifference)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-destructive">
                      <span>Total Credit Amount:</span>
                      <span>{formatCurrency(creditCalculation.grandTotalDifference)}</span>
                    </div>
                    {creditCalculation.exceedsRemaining && (
                      <div className="flex items-center gap-2 text-destructive mt-2 p-2 bg-destructive/10 rounded">
                        <AlertCircle className="h-4 w-4" />
                        <span>Credit exceeds remaining creditable amount for some items.</span>
                      </div>
                    )}
                  </div>
                ) : creditCalculation.isIncreasing ? (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>Credit notes can only REDUCE amounts. To charge more, use "Correct & Debit" instead.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>No changes detected. Reduce quantities or prices to generate a credit.</span>
                  </div>
                )}
              </Card>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Additional notes about this correction"
                        rows={2}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" data-testid="error-message">
                  {form.formState.errors.root.message}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !creditCalculation.hasChanges || creditCalculation.exceedsRemaining}
                  data-testid="button-create-credit"
                >
                  {isSubmitting ? "Creating..." : `Create Credit Note (${formatCurrency(creditCalculation.grandTotalDifference)})`}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
