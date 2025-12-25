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
  FormDescription,
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
import { Calculator, ArrowRight, AlertCircle, TrendingUp, History } from "lucide-react";
import type { InvoiceItem } from "@shared/schema";

const correctAndDebitSchema = z.object({
  reason: z.enum(["quantity_increase", "price_increase", "additional_charges", "other"], {
    required_error: "Please select a reason",
  }),
  customReason: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      invoiceItemId: z.string(),
      originalQuantity: z.number(),
      originalUnitPrice: z.number(),
      newQuantity: z.coerce.number().min(0, "Quantity must be 0 or more"),
      newUnitPrice: z.coerce.number().min(0, "Price must be 0 or more"),
    })
  ),
});

type CorrectAndDebitForm = z.infer<typeof correctAndDebitSchema>;

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
  effectiveUnitPrice: number; // Max price ever charged
  currentUnitPrice: number; // Actual per-unit value after ALL adjustments
  effectiveTaxableValue: number;
  remainingCreditable: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  hasAdjustments: boolean;
  priceIncreased?: boolean;
  priceDecreased?: boolean;
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

interface CorrectAndDebitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  invoiceItems: InvoiceItem[];
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  onSuccess?: (debitNoteNumber: string) => void;
}

export function CorrectAndDebitDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  invoiceItems,
  cgstRate,
  sgstRate,
  igstRate,
  onSuccess,
}: CorrectAndDebitDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: effectiveData, isLoading: isLoadingEffective } = useQuery<EffectiveItemsResponse>({
    queryKey: ['/api/invoice-items-effective', invoiceId],
    enabled: open && !!invoiceId,
  });

  const form = useForm<CorrectAndDebitForm>({
    resolver: zodResolver(correctAndDebitSchema),
    defaultValues: {
      reason: "quantity_increase",
      notes: "",
      items: [],
    },
  });

  useEffect(() => {
    if (open && effectiveData?.items) {
      form.reset({
        reason: "quantity_increase",
        notes: "",
        items: effectiveData.items.map(item => ({
          invoiceItemId: item.id,
          // Store original invoice values for reference
          originalQuantity: item.originalQuantity,
          originalUnitPrice: item.originalUnitPrice,
          // Default NEW values to current effective values (after all adjustments)
          // For quantity: use remainingQuantity (original + debited - credited)
          newQuantity: item.remainingQuantity,
          // For price: use currentUnitPrice (effective price after debit note increases)
          newUnitPrice: item.currentUnitPrice || item.originalUnitPrice,
        })),
      });
    }
  }, [open, effectiveData, form]);

  const reason = form.watch("reason");
  const watchedItems = form.watch("items");

  const watchedItemsKey = JSON.stringify(watchedItems.map(item => ({
    q: item.newQuantity,
    p: item.newUnitPrice,
  })));

  const debitCalculation = useMemo(() => {
    let totalOriginal = 0;
    let totalNew = 0;
    let totalCgstDifference = 0;
    let totalSgstDifference = 0;
    let totalIgstDifference = 0;
    const itemDifferences: Array<{
      invoiceItemId: string;
      productName: string;
      originalAmount: number;
      newAmount: number;
      difference: number;
      additionalQuantity: number;
      priceIncrease: number;
      cgstDifference: number;
      sgstDifference: number;
      igstDifference: number;
    }> = [];

    watchedItems.forEach((item, index) => {
      const effectiveItem = effectiveData?.items[index];
      if (!effectiveItem) return;

      // Use current effective values as the baseline (after all previous adjustments)
      const currentQty = effectiveItem.remainingQuantity;
      const currentPrice = effectiveItem.currentUnitPrice || effectiveItem.originalUnitPrice;
      const newQty = Number(item.newQuantity) || 0;
      const newPrice = Number(item.newUnitPrice) || 0;

      const currentAmount = currentQty * currentPrice;
      const newAmount = newQty * newPrice;
      const difference = newAmount - currentAmount;

      totalOriginal += currentAmount;
      totalNew += newAmount;

      if (difference > 0) {
        const itemCgstRate = effectiveItem.cgstRate || 0;
        const itemSgstRate = effectiveItem.sgstRate || 0;
        const itemIgstRate = effectiveItem.igstRate || 0;
        
        const itemCgstDiff = Math.round(difference * itemCgstRate / 10000);
        const itemSgstDiff = Math.round(difference * itemSgstRate / 10000);
        const itemIgstDiff = Math.round(difference * itemIgstRate / 10000);
        
        totalCgstDifference += itemCgstDiff;
        totalSgstDifference += itemSgstDiff;
        totalIgstDifference += itemIgstDiff;

        itemDifferences.push({
          invoiceItemId: item.invoiceItemId,
          productName: effectiveItem.productName || invoiceItems[index]?.description || 'Unknown',
          originalAmount: currentAmount,
          newAmount,
          difference,
          additionalQuantity: newQty - currentQty > 0 ? newQty - currentQty : 0,
          priceIncrease: newPrice - currentPrice > 0 ? newPrice - currentPrice : 0,
          cgstDifference: itemCgstDiff,
          sgstDifference: itemSgstDiff,
          igstDifference: itemIgstDiff,
        });
      }
    });

    const subtotalDifference = totalNew - totalOriginal;
    const grandTotalDifference = subtotalDifference + totalCgstDifference + totalSgstDifference + totalIgstDifference;

    const isDecreasing = totalNew < totalOriginal;
    
    return {
      totalOriginal,
      totalNew,
      subtotalDifference,
      cgstDifference: totalCgstDifference,
      sgstDifference: totalSgstDifference,
      igstDifference: totalIgstDifference,
      grandTotalDifference,
      itemDifferences,
      hasChanges: subtotalDifference > 0,
      isDecreasing,
    };
  }, [watchedItemsKey, effectiveData, invoiceItems]);

  const handleSubmit = async (data: CorrectAndDebitForm) => {
    if (!debitCalculation.hasChanges) {
      if (debitCalculation.isDecreasing) {
        form.setError("root", {
          type: "manual",
          message: "Debit notes can only INCREASE amounts. To reduce quantities or prices, use 'Correct & Credit' instead.",
        });
      } else {
        form.setError("root", {
          type: "manual",
          message: "No changes detected. Please increase quantities or prices to create a debit note.",
        });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/debit-notes/correct-and-debit", {
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
            newQuantity: item.newQuantity,
            newUnitPrice: item.newUnitPrice,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create debit note");
      }

      const result = await response.json();
      onSuccess?.(result.debitNoteNumber);
      onOpenChange(false);
    } catch (error) {
      form.setError("root", {
        type: "manual",
        message: error instanceof Error ? error.message : "Failed to create debit note",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (paise: number) => {
    return `₹${(paise / 100).toFixed(2)}`;
  };

  const hasPreviousAdjustments = effectiveData?.summary && 
    (effectiveData.summary.creditNoteCount > 0 || effectiveData.summary.debitNoteCount > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            Correct & Debit - Invoice {invoiceNumber}
          </DialogTitle>
          <DialogDescription>
            Increase quantities or prices to generate a <strong>Debit Note</strong>. 
            This charges additional amounts to the customer for corrections on previous month invoices.
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
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                    <FormLabel>Reason for Debit Note</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-debit-reason">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="quantity_increase">Quantity Increase</SelectItem>
                        <SelectItem value="price_increase">Price Increase</SelectItem>
                        <SelectItem value="additional_charges">Additional Charges</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
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
                          placeholder="Describe the reason..." 
                          {...field}
                          data-testid="input-custom-debit-reason"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calculator className="h-4 w-4" />
                  Invoice Items - Enter NEW Values (increase to charge more)
                </div>

                {effectiveData?.items.map((item, index) => {
                  const watchedItem = watchedItems[index];
                  if (!watchedItem) return null;

                  return (
                    <Card key={item.id} className="p-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{item.productName || invoiceItems[index]?.description || 'Unknown Product'}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Original: {item.originalQuantity} × {formatCurrency(item.originalUnitPrice)}
                            </Badge>
                            {item.hasAdjustments && (
                              <Badge variant="secondary" className="text-xs">
                                {item.creditedValue > 0 && `Credited: ${item.creditedQuantity} qty`}
                                {item.debitedValue > 0 && ` | Debited: ${item.debitedQuantity} qty`}
                              </Badge>
                            )}
                            {item.hasAdjustments && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                Current: {item.remainingQuantity} qty
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.newQuantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">New Quantity</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={item.originalQuantity}
                                    step="1"
                                    {...field}
                                    data-testid={`input-new-qty-${index}`}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${index}.newUnitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">New Unit Price</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={(Number(field.value) / 100).toFixed(2)}
                                    onChange={(e) => {
                                      const rupeesValue = parseFloat(e.target.value) || 0;
                                      field.onChange(Math.round(rupeesValue * 100));
                                    }}
                                    data-testid={`input-new-price-${index}`}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  In Rupees
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <Separator />

              <Card className="p-4 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-800 dark:text-orange-200">Debit Note Preview</span>
                </div>
                
                {debitCalculation.hasChanges ? (
                  <div className="space-y-2 text-sm">
                    {debitCalculation.itemDifferences.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center py-1 border-b border-orange-200/50 last:border-0">
                        <div className="flex-1">
                          <span className="font-medium">{item.productName}</span>
                          <div className="text-xs text-muted-foreground">
                            {item.additionalQuantity > 0 && `+${item.additionalQuantity} units`}
                            {item.additionalQuantity > 0 && item.priceIncrease > 0 && ', '}
                            {item.priceIncrease > 0 && `+${formatCurrency(item.priceIncrease)}/unit`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{formatCurrency(item.originalAmount)}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="font-medium text-orange-700 dark:text-orange-300">{formatCurrency(item.newAmount)}</span>
                          <Badge variant="outline" className="ml-2 text-orange-600 border-orange-300">
                            +{formatCurrency(item.difference)}
                          </Badge>
                        </div>
                      </div>
                    ))}

                    <Separator className="my-2" />

                    <div className="flex justify-between text-muted-foreground">
                      <span>Additional Subtotal:</span>
                      <span>+{formatCurrency(debitCalculation.subtotalDifference)}</span>
                    </div>
                    {debitCalculation.cgstDifference > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>CGST:</span>
                        <span>+{formatCurrency(debitCalculation.cgstDifference)}</span>
                      </div>
                    )}
                    {debitCalculation.sgstDifference > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>SGST:</span>
                        <span>+{formatCurrency(debitCalculation.sgstDifference)}</span>
                      </div>
                    )}
                    {debitCalculation.igstDifference > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>IGST:</span>
                        <span>+{formatCurrency(debitCalculation.igstDifference)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-orange-700 dark:text-orange-300 pt-2 border-t">
                      <span>Total Debit Amount:</span>
                      <span>+{formatCurrency(debitCalculation.grandTotalDifference)}</span>
                    </div>
                  </div>
                ) : debitCalculation.isDecreasing ? (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>Debit notes can only INCREASE amounts. To reduce amounts, use "Correct & Credit" instead.</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>No changes detected. Increase quantities or prices to generate a debit note.</span>
                  </div>
                )}
              </Card>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes about this debit note..."
                        {...field}
                        data-testid="input-debit-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.errors.root && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {form.formState.errors.root.message}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                  data-testid="button-cancel-debit"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !debitCalculation.hasChanges}
                  className="bg-orange-600 hover:bg-orange-700"
                  data-testid="button-create-debit-note"
                >
                  {isSubmitting ? "Creating..." : `Create Debit Note (+${formatCurrency(debitCalculation.grandTotalDifference)})`}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
