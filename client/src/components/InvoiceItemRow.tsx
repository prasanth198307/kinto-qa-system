import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <tr className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">

      {/* Product */}
      <td className="p-1">
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
          <SelectTrigger data-testid={`select-product-${index}`} className="h-8 text-sm min-w-[130px]">
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
      </td>

      {/* HSN Code */}
      <td className="p-1">
        <Input
          {...form.register(`items.${index}.hsnCode`)}
          placeholder="HSN"
          className="h-8 text-sm w-[70px]"
          data-testid={`input-hsn-${index}`}
        />
      </td>

      {/* Description */}
      <td className="p-1">
        <Input
          {...form.register(`items.${index}.description`)}
          placeholder="Description"
          className="h-8 text-sm min-w-[100px]"
          data-testid={`input-description-${index}`}
        />
      </td>

      {/* Quantity */}
      <td className="p-1">
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
          className="h-8 text-sm w-[55px]"
          data-testid={`input-quantity-${index}`}
        />
      </td>

      {/* Batch Number */}
      <td className="p-1">
        <Input
          {...form.register(`items.${index}.batchNumber`)}
          placeholder="Batch #"
          className="h-8 text-sm w-[75px] border-primary/50 focus-visible:ring-primary"
          data-testid={`input-batch-${index}`}
        />
      </td>

      {/* Unit Price */}
      <td className="p-1">
        <Input
          type="number"
          step="0.01"
          {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
          placeholder="0.00"
          className={`h-8 text-sm w-[75px] ${gstInclusiveMode ? 'bg-muted/50' : ''}`}
          data-testid={`input-unit-price-${index}`}
        />
      </td>

      {/* Discount with Mode Toggle */}
      <td className="p-1">
        <div className="flex gap-1 items-center">
          <Input
            type="number"
            step="0.01"
            min="0"
            {...form.register(`items.${index}.discount`, { valueAsNumber: true })}
            placeholder="0"
            className="h-8 text-sm w-[60px]"
            data-testid={`input-discount-${index}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-9 px-1 text-xs shrink-0"
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
      </td>

      {/* GST Rate */}
      <td className="p-1">
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
          <SelectTrigger data-testid={`select-gst-rate-${index}`} className="h-8 text-sm w-[70px]">
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
      </td>

      {/* Total Amount per Case (GST Inclusive Mode) */}
      {gstInclusiveMode && (
        <td className="p-1">
          <div className="relative">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={itemTotalAmounts[index] || ''}
              onChange={(e) => handleTotalAmountChange(index, parseFloat(e.target.value) || 0)}
              placeholder="Incl. price"
              className="h-8 text-sm w-[95px] pr-1"
              data-testid={`input-total-amount-${index}`}
            />
            {itemTotalAmounts[index] > 0 && (
              <div className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                {isIntrastateSupply ? 'C+S' : 'I'}GST: ₹{((itemTotalAmounts[index] - form.watch(`items.${index}.unitPrice`)) * form.watch(`items.${index}.quantity`)).toFixed(2)}
              </div>
            )}
          </div>
        </td>
      )}

      {/* Transport Rate per Case */}
      <td className="p-1">
        <Input
          type="number"
          step="0.01"
          min="0"
          {...form.register(`items.${index}.transportRatePerCase`, { valueAsNumber: true })}
          placeholder="₹0"
          className="h-8 text-sm w-[65px]"
          data-testid={`input-transport-rate-${index}`}
        />
      </td>

      {/* Remove Button */}
      <td className="p-1 text-center">
        {fieldsCount > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => remove(index)}
            data-testid={`button-remove-item-${index}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </td>

    </tr>
  );
}
