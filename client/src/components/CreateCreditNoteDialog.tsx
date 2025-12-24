import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, History } from "lucide-react";
import type { InvoiceItem } from "@shared/schema";

interface EffectiveItem {
  id: string;
  productName: string;
  originalQuantity: number;
  originalUnitPrice: number;
  creditedValue: number;
  debitedValue: number;
  creditedQuantity: number;
  debitedQuantity: number;
  remainingQuantity: number;
  remainingCreditable: number;
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

const creditNoteSchema = z.object({
  reason: z.enum(["pricing_error", "discount", "damage", "other"], {
    required_error: "Please select a reason",
  }),
  customReason: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      invoiceItemId: z.string(),
      quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
      adjustedUnitPrice: z.coerce.number().min(0, "Price must be positive"),
    })
  ).min(1, "At least one item must be selected"),
});

type CreditNoteForm = z.infer<typeof creditNoteSchema>;

interface CreateCreditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  invoiceNumber: string;
  invoiceItems: InvoiceItem[];
  onSuccess?: (creditNoteNumber: string) => void;
}

export function CreateCreditNoteDialog({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  invoiceItems,
  onSuccess,
}: CreateCreditNoteDialogProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch effective items with remaining quantities
  const { data: effectiveData, isLoading: isLoadingEffective } = useQuery<EffectiveItemsResponse>({
    queryKey: ['/api/invoice-items-effective', invoiceId],
    enabled: open && !!invoiceId,
  });

  const form = useForm<CreditNoteForm>({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: {
      reason: "pricing_error",
      notes: "",
      items: [],
    },
  });

  const reason = form.watch("reason");

  // Get effective item data by invoice item ID
  const getEffectiveItem = (itemId: string): EffectiveItem | undefined => {
    return effectiveData?.items.find(e => e.id === itemId);
  };

  const hasPreviousAdjustments = effectiveData?.summary && 
    (effectiveData.summary.creditNoteCount > 0 || effectiveData.summary.debitNoteCount > 0);

  const handleItemToggle = (itemId: string) => {
    const effectiveItem = getEffectiveItem(itemId);
    const invoiceItem = invoiceItems.find(i => i.id === itemId);
    if (!invoiceItem) return;

    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      // Only allow selection if there's remaining quantity
      if (effectiveItem && effectiveItem.remainingQuantity <= 0) return;
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
    
    // Update form items with remaining quantity (not original)
    const items = invoiceItems
      .filter(item => newSelected.has(item.id))
      .map(item => {
        const effItem = getEffectiveItem(item.id);
        return {
          invoiceItemId: item.id,
          quantity: effItem?.remainingQuantity ?? item.quantity,
          adjustedUnitPrice: item.unitPrice,
        };
      });
    form.setValue("items", items);
  };

  const formatCurrency = (amountInPaise: number) => {
    return `₹${(amountInPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleSubmit = async (data: CreditNoteForm) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/credit-notes/manual", {
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
          items: data.items,
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
      
      // Reset form and close dialog
      form.reset();
      setSelectedItems(new Set());
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-credit-note">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" data-testid="title-create-credit-note">
            <FileText className="h-5 w-5" />
            Create Credit Note
          </DialogTitle>
          <DialogDescription data-testid="description-create-credit-note">
            Issue a credit note for invoice {invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        {isLoadingEffective ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
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

            {/* Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-credit-note-reason">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pricing_error" data-testid="option-pricing-error">Pricing Error</SelectItem>
                      <SelectItem value="discount" data-testid="option-discount">Discount / Price Adjustment</SelectItem>
                      <SelectItem value="damage" data-testid="option-damage">Damage / Quality Issue</SelectItem>
                      <SelectItem value="other" data-testid="option-other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the reason for issuing this credit note
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Custom Reason (if Other selected) */}
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

            {/* Select Items */}
            <div className="space-y-2">
              <FormLabel>Select Items</FormLabel>
              <FormDescription>
                Choose the invoice items to include in the credit note
              </FormDescription>
              <div className="border rounded-md divide-y" data-testid="list-invoice-items">
                {invoiceItems.map((item) => {
                  const isSelected = selectedItems.has(item.id);
                  const itemData = form.watch("items").find(i => i.invoiceItemId === item.id);
                  const effectiveItem = getEffectiveItem(item.id);
                  const remainingQty = effectiveItem?.remainingQuantity ?? item.quantity;
                  const isFullyCredited = remainingQty <= 0;

                  return (
                    <div key={item.id} className={`p-3 space-y-2 ${isFullyCredited ? 'opacity-50 bg-muted/30' : ''}`} data-testid={`item-${item.id}`}>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleItemToggle(item.id)}
                          disabled={isFullyCredited}
                          data-testid={`checkbox-item-${item.id}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium" data-testid={`text-item-name-${item.id}`}>
                              {item.description}
                            </span>
                            {isFullyCredited && (
                              <Badge variant="secondary" className="text-xs">Fully Credited</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Invoice Qty: {item.quantity} @ {formatCurrency(item.unitPrice)}
                          </div>
                          {effectiveItem?.hasAdjustments && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              Already credited: {effectiveItem.creditedQuantity} qty ({formatCurrency(effectiveItem.creditedValue)})
                            </div>
                          )}
                          {!isFullyCredited && effectiveItem?.hasAdjustments && (
                            <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                              Remaining: {remainingQty} qty
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Editable quantity and unit price when selected */}
                      {isSelected && (
                        <div className="grid grid-cols-2 gap-3 ml-8">
                          <FormField
                            control={form.control}
                            name={`items.${form.watch("items").findIndex(i => i.invoiceItemId === item.id)}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Credit Quantity (max: {remainingQty})</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    min={1}
                                    max={remainingQty}
                                    data-testid={`input-quantity-${item.id}`}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      field.onChange(val);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`items.${form.watch("items").findIndex(i => i.invoiceItemId === item.id)}.adjustedUnitPrice`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Adjusted Price (₹)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    max={(item.unitPrice / 100).toFixed(2)}
                                    data-testid={`input-price-${item.id}`}
                                    onChange={(e) => {
                                      // Convert rupees to paise and store
                                      const rupeesValue = parseFloat(e.target.value) || 0;
                                      const paiseValue = Math.round(rupeesValue * 100);
                                      // Clamp to invoice price
                                      const clampedValue = Math.min(paiseValue, item.unitPrice);
                                      field.onChange(clampedValue);
                                    }}
                                    value={(field.value / 100).toFixed(2)}
                                  />
                                </FormControl>
                                <FormDescription className="text-xs">
                                  Max: {formatCurrency(item.unitPrice)} (Invoice Price)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {form.formState.errors.items && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.items.message}
                </p>
              )}
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Additional notes about this credit note"
                      rows={3}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormDescription>
                    Any additional details or explanations
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Root Error */}
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
                disabled={isSubmitting || selectedItems.size === 0}
                data-testid="button-create-credit-note"
              >
                {isSubmitting ? "Creating..." : "Create Credit Note"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
