import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import type { Product } from "@shared/schema";

interface StockSummaryItem {
  productId: string;
  totalPhysical: number;
  reserved: number;
  available: number;
}

export interface InvoiceItemRowProps {
  field: any;
  index: number;
  fieldsCount: number;
  form: UseFormReturn<any>;
  gstInclusiveMode: boolean;
  isIntrastateSupply: boolean;
  isReissueMode: boolean;
  invoice: any | undefined;
  products: Product[];
  stockSummary: StockSummaryItem[];
  itemTotalAmounts: { [index: number]: number };
  handleTotalAmountChange: (index: number, value: number) => void;
  calculateBaseFromTotal: (total: number, gstRate: number) => number;
  remove: (index: number) => void;
  toast: (opts: any) => void;
}

export default function InvoiceItemRow({
  field,
  index,
  fieldsCount,
  form,
  gstInclusiveMode,
  isIntrastateSupply,
  isReissueMode,
  invoice,
  products,
  stockSummary,
  itemTotalAmounts,
  handleTotalAmountChange,
  calculateBaseFromTotal,
  remove,
  toast,
}: InvoiceItemRowProps) {
  return (
    <div className="border rounded-md p-3 md:p-1.5 hover-elevate">
      <div className="flex flex-col gap-3 md:grid md:grid-cols-14 md:gap-2 md:items-start">

        {/* Product */}
        <div className="md:col-span-2">
          <Label className="md:hidden text-xs text-muted-foreground mb-1">Product *</Label>
          <Select
            value={form.watch(`items.${index}.productId`)}
            onValueChange={(value) => {
              const productSummary = stockSummary.find(s => s.productId === value);
              const totalAvailable = productSummary?.available || 0;

              const currentProductId = form.watch(`items.${index}.productId`);
              const isExistingItem = currentProductId === value;
              const skipStockCheck = isReissueMode || !!invoice || isExistingItem;

              if (!skipStockCheck && totalAvailable === 0) {
                const reserved = productSummary?.reserved || 0;
                const physical = productSummary?.totalPhysical || 0;

                if (reserved > 0 && physical > 0) {
                  toast({
                    title: "All Stock Reserved",
                    description: `This product has ${physical} units in stock, but all ${reserved} units are reserved for other pending invoices. Please dispatch those invoices first or choose a different product.`,
                    variant: "destructive",
                  });
                } else {
                  toast({
                    title: "No Stock Available",
                    description: "This product has no available finished goods in inventory.",
                    variant: "destructive",
                  });
                }
                return;
              }

              form.setValue(`items.${index}.productId`, value);
              const product = products.find(p => p.id === value);
              if (product) {
                form.setValue(`items.${index}.description`, product.productName);
                const basePriceNum = product.basePrice ? parseFloat(String(product.basePrice)) : 0;
                if (basePriceNum > 0 && !isExistingItem) {
                  form.setValue(`items.${index}.unitPrice`, basePriceNum / 100);
                }
                if (product.hsnCode && !isExistingItem) {
                  form.setValue(`items.${index}.hsnCode`, product.hsnCode);
                }
                if (productSummary) {
                  const reserved = productSummary.reserved || 0;
                  const reservedInfo = reserved > 0 ? ` (${reserved} reserved)` : '';
                  toast({
                    title: "Stock Available",
                    description: `Available: ${totalAvailable} units${reservedInfo}${basePriceNum > 0 ? ` | Price: ₹${(basePriceNum / 100).toFixed(2)}` : ''}`,
                  });
                }
              }
            }}
          >
            <SelectTrigger data-testid={`select-product-${index}`} className="h-9">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => {
                const productSummary = stockSummary.find(s => s.productId === product.id);
                const totalAvailable = productSummary?.available || 0;
                const reserved = productSummary?.reserved || 0;
                const stockDisplay = reserved > 0
                  ? `(${totalAvailable} / ${reserved} rsv)`
                  : `(${totalAvailable})`;
                return (
                  <SelectItem key={product.id} value={product.id}>
                    {product.productName} {stockDisplay}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* HSN Code */}
        <div className="md:col-span-1">
          <Label className="md:hidden text-xs text-muted-foreground mb-1">HSN</Label>
          <Input
            {...form.register(`items.${index}.hsnCode`)}
            placeholder="8471"
            className="h-9 text-sm"
            data-testid={`input-hsn-${index}`}
          />
        </div>

        {/* Description */}
        <div className={gstInclusiveMode ? "md:col-span-1" : "md:col-span-2"}>
          <Label className="md:hidden text-xs text-muted-foreground mb-1">Description *</Label>
          <Input
            {...form.register(`items.${index}.description`)}
            placeholder="Description"
            className="h-9 text-sm"
            data-testid={`input-description-${index}`}
          />
        </div>

        {/* Quantity */}
        <div className="md:col-span-1">
          <Label className="md:hidden text-xs text-muted-foreground mb-1">Qty *</Label>
          <Input
            type="number"
            {...form.register(`items.${index}.quantity`, {
              valueAsNumber: true,
              onChange: (e) => {
                const enteredQty = parseInt(e.target.value) || 0;
                const productId = form.watch(`items.${index}.productId`);
                const isEditMode = !!invoice || isReissueMode;

                if (productId && enteredQty > 0) {
                  const productSummary = stockSummary.find(s => s.productId === productId);
                  const totalAvailable = productSummary?.available || 0;

                  if (enteredQty > totalAvailable) {
                    const reserved = productSummary?.reserved || 0;
                    toast({
                      title: isEditMode ? "Stock Warning" : "Insufficient Stock",
                      description: `Only ${totalAvailable} units available${reserved > 0 ? ` (${reserved} reserved for other invoices)` : ''}`,
                      variant: isEditMode ? "default" : "destructive",
                    });
                    if (!isEditMode) {
                      form.setValue(`items.${index}.quantity`, totalAvailable);
                    }
                  }
                }
              }
            })}
            className="h-9 text-sm"
            data-testid={`input-quantity-${index}`}
          />
        </div>

        {/* Batch Number */}
        <div className="md:col-span-1">
          <Label className="md:hidden text-xs text-muted-foreground mb-1">Batch #</Label>
          <Input
            {...form.register(`items.${index}.batchNumber`)}
            placeholder="Batch #"
            className="h-9 text-sm border-primary/50 focus-visible:ring-primary"
            data-testid={`input-batch-${index}`}
          />
        </div>

        {/* Unit Price */}
        <div className="md:col-span-1">
          <Label className="md:hidden text-xs text-muted-foreground mb-1">{gstInclusiveMode ? 'Base ₹' : 'Price ₹'}</Label>
          <Input
            type="number"
            step="0.01"
            {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
            placeholder="0.00"
            className={`h-9 text-sm ${gstInclusiveMode ? 'bg-muted/50' : ''}`}
            data-testid={`input-unit-price-${index}`}
          />
        </div>

        {/* Discount with Mode Toggle */}
        <div className="md:col-span-2">
          <Label className="md:hidden text-xs text-muted-foreground mb-1">Discount</Label>
          <div className="flex gap-1 items-center h-9">
            <Input
              type="number"
              step="0.01"
              min="0"
              {...form.register(`items.${index}.discount`, { valueAsNumber: true })}
              placeholder="0"
              className="h-9 text-sm flex-1"
              data-testid={`input-discount-${index}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-10 px-1.5 text-xs"
              onClick={() => {
                const currentMode = form.watch(`items.${index}.discountMode`) || '%';
                const newMode = currentMode === '%' ? '₹' : '%';
                form.setValue(`items.${index}.discountMode`, newMode);
              }}
              data-testid={`button-discount-mode-${index}`}
            >
              {form.watch(`items.${index}.discountMode`) || '%'}
            </Button>
          </div>
        </div>

        {/* GST Rate */}
        <div className="md:col-span-1">
          <Label className="md:hidden text-xs text-muted-foreground mb-1">GST %</Label>
          <Select
            value={(() => {
              const watchedValue = form.watch(`items.${index}.gstRate`);
              const fieldValue = (field as any).gstRate;
              const finalValue = watchedValue ?? fieldValue ?? 18;
              return String(finalValue);
            })()}
            onValueChange={(value) => {
              const newGstRate = parseFloat(value);
              form.setValue(`items.${index}.gstRate`, newGstRate);
              if (gstInclusiveMode && itemTotalAmounts[index] > 0) {
                const totalAmount = itemTotalAmounts[index];
                const newBasePrice = calculateBaseFromTotal(totalAmount, newGstRate);
                form.setValue(`items.${index}.unitPrice`, newBasePrice);
              }
            }}
          >
            <SelectTrigger data-testid={`select-gst-rate-${index}`} className="h-9">
              <SelectValue placeholder="18%" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              <SelectItem value="0">0%</SelectItem>
              <SelectItem value="5">5%</SelectItem>
              <SelectItem value="12">12%</SelectItem>
              <SelectItem value="18">18%</SelectItem>
              <SelectItem value="28">28%</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Total Amount per Case (GST Inclusive Mode) */}
        {gstInclusiveMode && (
          <div className="md:col-span-2">
            <Label className="md:hidden text-xs text-muted-foreground mb-1">Price/Case (incl. GST)</Label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={itemTotalAmounts[index] || ''}
                onChange={(e) => handleTotalAmountChange(index, parseFloat(e.target.value) || 0)}
                placeholder="Price per case"
                className="h-9 text-sm pr-20"
                data-testid={`input-total-amount-${index}`}
              />
              {itemTotalAmounts[index] > 0 && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  GST: ₹{(itemTotalAmounts[index] - form.watch(`items.${index}.unitPrice`)).toFixed(2)}
                </div>
              )}
            </div>
            {itemTotalAmounts[index] > 0 && (
              <div className="text-xs text-muted-foreground mt-1 flex gap-2">
                <span>Base: ₹{(form.watch(`items.${index}.unitPrice`) * form.watch(`items.${index}.quantity`)).toFixed(2)}</span>
                <span>|</span>
                <span>
                  {isIntrastateSupply
                    ? `CGST+SGST: ₹${((itemTotalAmounts[index] - form.watch(`items.${index}.unitPrice`)) * form.watch(`items.${index}.quantity`)).toFixed(2)}`
                    : `IGST: ₹${((itemTotalAmounts[index] - form.watch(`items.${index}.unitPrice`)) * form.watch(`items.${index}.quantity`)).toFixed(2)}`
                  }
                </span>
              </div>
            )}
          </div>
        )}

        {/* Transport Rate per Case */}
        <div className="md:col-span-1">
          <Label className="md:hidden text-xs text-muted-foreground mb-1">Transport</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            {...form.register(`items.${index}.transportRatePerCase`, { valueAsNumber: true })}
            placeholder="₹0"
            className="h-9 text-sm"
            data-testid={`input-transport-rate-${index}`}
          />
        </div>

        {/* Remove Button */}
        <div className={`${gstInclusiveMode ? 'md:col-span-1' : 'md:col-span-2'} flex justify-center md:justify-center`}>
          {fieldsCount > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => remove(index)}
              data-testid={`button-remove-item-${index}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

      </div>
    </div>
  );
}
