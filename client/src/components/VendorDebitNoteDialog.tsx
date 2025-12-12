import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Vendor } from "@shared/schema";

const vendorDebitNoteItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  hsnCode: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  unit: z.string().default("units"),
  unitPrice: z.coerce.number().min(0, "Price must be 0 or more"),
  cgstRate: z.coerce.number().min(0).max(2800).default(0),
  sgstRate: z.coerce.number().min(0).max(2800).default(0),
  igstRate: z.coerce.number().min(0).max(2800).default(0),
  rawMaterialId: z.string().optional(),
});

const vendorDebitNoteSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  debitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  reason: z.enum([
    "processing_charges", 
    "job_work_charges", 
    "freight_charges", 
    "quality_premium", 
    "material_conversion", 
    "defective_goods", 
    "short_receipt", 
    "quality_rejection", 
    "price_dispute", 
    "other"
  ], {
    required_error: "Please select a reason",
  }),
  customReason: z.string().optional(),
  notes: z.string().optional(),
  entryMode: z.enum(["itemized", "lumpsum"]).default("lumpsum"),
  lumpSumAmount: z.coerce.number().min(0).optional(),
  lumpSumDescription: z.string().optional(),
  lumpSumCgstRate: z.coerce.number().min(0).max(2800).default(0),
  lumpSumSgstRate: z.coerce.number().min(0).max(2800).default(0),
  items: z.array(vendorDebitNoteItemSchema).default([]),
});

type VendorDebitNoteForm = z.infer<typeof vendorDebitNoteSchema>;

interface VendorDebitNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (noteNumber: string) => void;
}

const REASON_LABELS: Record<string, string> = {
  processing_charges: "Processing Charges",
  job_work_charges: "Job Work Charges",
  freight_charges: "Freight/Transport Charges",
  quality_premium: "Quality Premium/Bonus",
  material_conversion: "Material Conversion Charges",
  defective_goods: "Defective Goods",
  short_receipt: "Short Receipt",
  quality_rejection: "Quality Rejection",
  price_dispute: "Price Dispute",
  other: "Other",
};

export function VendorDebitNoteDialog({
  open,
  onOpenChange,
  onSuccess,
}: VendorDebitNoteDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const form = useForm<VendorDebitNoteForm>({
    resolver: zodResolver(vendorDebitNoteSchema),
    defaultValues: {
      vendorId: "",
      debitDate: new Date().toISOString().split("T")[0],
      reason: "processing_charges",
      notes: "",
      entryMode: "lumpsum",
      lumpSumAmount: 0,
      lumpSumDescription: "",
      lumpSumCgstRate: 900,
      lumpSumSgstRate: 900,
      items: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (open) {
      form.reset({
        vendorId: "",
        debitDate: new Date().toISOString().split("T")[0],
        reason: "processing_charges",
        notes: "",
        entryMode: "lumpsum",
        lumpSumAmount: 0,
        lumpSumDescription: "",
        lumpSumCgstRate: 900,
        lumpSumSgstRate: 900,
        items: [],
      });
    }
  }, [open, form]);

  const reason = form.watch("reason");
  const entryMode = form.watch("entryMode");
  const watchedItems = form.watch("items");
  const lumpSumAmount = form.watch("lumpSumAmount") || 0;
  const lumpSumCgstRate = form.watch("lumpSumCgstRate") || 0;
  const lumpSumSgstRate = form.watch("lumpSumSgstRate") || 0;

  const calculateTotals = () => {
    if (entryMode === "lumpsum") {
      const subtotal = Math.round(lumpSumAmount);
      const cgstAmount = Math.round(subtotal * lumpSumCgstRate / 10000);
      const sgstAmount = Math.round(subtotal * lumpSumSgstRate / 10000);
      return {
        subtotal,
        cgstAmount,
        sgstAmount,
        igstAmount: 0,
        grandTotal: subtotal + cgstAmount + sgstAmount,
      };
    }

    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    watchedItems.forEach((item) => {
      const taxableValue = Math.round((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0));
      subtotal += taxableValue;

      const cgstAmount = Math.round(taxableValue * (Number(item.cgstRate) || 0) / 10000);
      const sgstAmount = Math.round(taxableValue * (Number(item.sgstRate) || 0) / 10000);
      const igstAmount = Math.round(taxableValue * (Number(item.igstRate) || 0) / 10000);

      totalCgst += cgstAmount;
      totalSgst += sgstAmount;
      totalIgst += igstAmount;
    });

    return {
      subtotal,
      cgstAmount: totalCgst,
      sgstAmount: totalSgst,
      igstAmount: totalIgst,
      grandTotal: subtotal + totalCgst + totalSgst + totalIgst,
    };
  };

  const totals = calculateTotals();

  const handleSubmit = async (data: VendorDebitNoteForm) => {
    if (totals.grandTotal <= 0) {
      form.setError("root", {
        type: "manual",
        message: "Total amount must be greater than zero",
      });
      return;
    }

    let submitData: any = {
      vendorId: data.vendorId,
      debitDate: data.debitDate,
      reason: data.reason,
      customReason: data.customReason,
      notes: data.notes,
      items: [],
    };

    if (data.entryMode === "lumpsum") {
      const reasonLabel = REASON_LABELS[data.reason] || data.reason;
      const description = data.lumpSumDescription?.trim() || reasonLabel;
      submitData.items = [{
        description: description,
        hsnCode: "",
        quantity: 1,
        unit: "units",
        unitPrice: data.lumpSumAmount || 0,
        cgstRate: data.lumpSumCgstRate || 0,
        sgstRate: data.lumpSumSgstRate || 0,
        igstRate: 0,
      }];
    } else {
      if (data.items.length === 0) {
        form.setError("root", {
          type: "manual",
          message: "At least one line item is required in itemized mode",
        });
        return;
      }
      submitData.items = data.items;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/vendor-debit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create vendor debit note");
      }

      const result = await response.json();
      toast({
        title: "Vendor Debit Note Created",
        description: `Note ${result.noteNumber} created successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-debit-notes"] });
      onSuccess?.(result.noteNumber);
      onOpenChange(false);
    } catch (error) {
      form.setError("root", {
        type: "manual",
        message: error instanceof Error ? error.message : "Failed to create vendor debit note",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (paise: number) => {
    return `₹${(paise / 100).toFixed(2)}`;
  };

  const addItem = () => {
    append({
      description: "",
      hsnCode: "",
      quantity: 1,
      unit: "units",
      unitPrice: 0,
      cgstRate: 900,
      sgstRate: 900,
      igstRate: 0,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-orange-600" />
            Create Vendor Debit Note
          </DialogTitle>
          <DialogDescription>
            Issue a debit note against a vendor for claims such as defective goods, short receipts, or quality issues.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-vendor">
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.vendorName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="debitDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Debit Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-debit-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-reason">
                          <SelectValue placeholder="Select reason" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(REASON_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
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
                        <Input placeholder="Describe the reason..." {...field} data-testid="input-custom-reason" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <Separator />

            <FormField
              control={form.control}
              name="entryMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Entry Mode</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-6"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="lumpsum" id="lumpsum" data-testid="radio-lumpsum" />
                        <Label htmlFor="lumpsum" className="cursor-pointer">Lump Sum Amount</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="itemized" id="itemized" data-testid="radio-itemized" />
                        <Label htmlFor="itemized" className="cursor-pointer">Itemized (Line Items)</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            {entryMode === "lumpsum" ? (
              <Card className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lumpSumAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (paise) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            placeholder="e.g., 100000 = ₹1000" 
                            {...field} 
                            data-testid="input-lumpsum-amount" 
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          {field.value ? formatCurrency(Number(field.value)) : "₹0.00"}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lumpSumDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Leave blank to use reason as description" 
                            {...field} 
                            data-testid="input-lumpsum-description" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lumpSumCgstRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CGST Rate (basis points)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            placeholder="900 = 9%" 
                            {...field} 
                            data-testid="input-lumpsum-cgst" 
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          {field.value ? `${(Number(field.value) / 100).toFixed(2)}%` : "0%"}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lumpSumSgstRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SGST Rate (basis points)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            placeholder="900 = 9%" 
                            {...field} 
                            data-testid="input-lumpsum-sgst" 
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          {field.value ? `${(Number(field.value) / 100).toFixed(2)}%` : "0%"}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Line Items</span>
                  <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="button-add-item">
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                </div>

                {fields.length === 0 && (
                  <Card className="p-4 text-center text-muted-foreground">
                    No line items yet. Click "Add Item" to add one.
                  </Card>
                )}

                {fields.map((field, index) => (
                  <Card key={field.id} className="p-3">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Description *</FormLabel>
                              <FormControl>
                                <Input placeholder="Item description" {...field} data-testid={`input-item-desc-${index}`} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.hsnCode`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">HSN</FormLabel>
                              <FormControl>
                                <Input placeholder="HSN" {...field} data-testid={`input-item-hsn-${index}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Qty *</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" {...field} data-testid={`input-item-qty-${index}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unit`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Unit</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid={`input-item-unit-${index}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unitPrice`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">Unit Price (paise) *</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} data-testid={`input-item-price-${index}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.cgstRate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">CGST %</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} placeholder="900=9%" data-testid={`input-item-cgst-${index}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.sgstRate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">SGST %</FormLabel>
                              <FormControl>
                                <Input type="number" min="0" {...field} placeholder="900=9%" data-testid={`input-item-sgst-${index}`} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          className="text-destructive"
                          data-testid={`button-remove-item-${index}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <Separator />

            <Card className="p-4 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.cgstAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>CGST:</span>
                    <span>{formatCurrency(totals.cgstAmount)}</span>
                  </div>
                )}
                {totals.sgstAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>SGST:</span>
                    <span>{formatCurrency(totals.sgstAmount)}</span>
                  </div>
                )}
                {totals.igstAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>IGST:</span>
                    <span>{formatCurrency(totals.igstAmount)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-orange-700 dark:text-orange-300">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>
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
                      data-testid="input-notes"
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
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || totals.grandTotal <= 0}
                className="bg-orange-600 hover:bg-orange-700"
                data-testid="button-create-debit-note"
              >
                {isSubmitting ? "Creating..." : `Create Debit Note (${formatCurrency(totals.grandTotal)})`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
