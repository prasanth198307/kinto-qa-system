import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Trash2, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Gatepass, Product, Vendor, GatepassItem, FinishedGood } from "@shared/schema";

const invoiceFormSchema = z.object({
  gatepassId: z.string().optional(),
  invoiceDate: z.string(),
  
  // Seller details
  sellerGstin: z.string().optional(),
  sellerName: z.string().optional(),
  sellerAddress: z.string().optional(),
  sellerState: z.string().optional(),
  sellerStateCode: z.string().optional(),
  
  // Buyer details
  buyerGstin: z.string().optional(),
  buyerName: z.string().min(1, "Buyer name is required"),
  buyerAddress: z.string().optional(),
  buyerState: z.string().optional(),
  buyerStateCode: z.string().optional(),
  
  // Payment details
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankIfscCode: z.string().optional(),
  upiId: z.string().optional(),
  
  items: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    description: z.string().min(1, "Description is required"),
    hsnCode: z.string().optional(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0, "Price must be positive"),
    gstRate: z.number().min(0).max(100, "GST rate must be 0-100%"),
  })).min(1, "At least one item is required"),
  
  remarks: z.string().optional(),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  gatepass?: Gatepass;
  onClose: () => void;
}

export default function InvoiceForm({ gatepass, onClose }: InvoiceFormProps) {
  const { toast } = useToast();
  const [isIntrastateSupply, setIsIntrastateSupply] = useState(true);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: gatepassItems = [] } = useQuery<GatepassItem[]>({
    queryKey: gatepass ? [`/api/gatepass-items/${gatepass.id}`] : [],
    enabled: !!gatepass,
  });

  const { data: finishedGoods = [] } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods'],
    enabled: !!gatepass,
  });

  const form = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      gatepassId: gatepass?.id || "",
      invoiceDate: new Date().toISOString().split('T')[0],
      sellerName: "KINTO Manufacturing",
      sellerAddress: "Industrial Area, Phase 1",
      sellerState: "Karnataka",
      sellerStateCode: "29",
      sellerGstin: "29AAAAA0000A1Z5",
      buyerName: "",
      buyerGstin: "",
      buyerAddress: "",
      buyerState: "Karnataka",
      buyerStateCode: "29",
      items: [{
        productId: "",
        description: "",
        hsnCode: "",
        quantity: 1,
        unitPrice: 0,
        gstRate: 18,
      }],
      bankName: "State Bank of India",
      bankAccountNumber: "12345678901234",
      bankIfscCode: "SBIN0001234",
      upiId: "kinto@sbi",
    },
  });

  // Pre-populate buyer details from vendor/customer when data loads
  useEffect(() => {
    if (gatepass && vendors.length > 0) {
      const vendor = vendors.find(v => v.id === gatepass.vendorId);
      if (vendor) {
        form.setValue("buyerName", vendor.vendorName || "");
        form.setValue("buyerGstin", vendor.gstNumber || "");
        form.setValue("buyerAddress", vendor.address || "");
        form.setValue("buyerState", vendor.state || "Karnataka");
        form.setValue("buyerStateCode", vendor.stateCode || "29");
      } else if (gatepass.customerName) {
        form.setValue("buyerName", gatepass.customerName);
      }
    }
  }, [gatepass, vendors, form]);

  // Pre-populate invoice items from gatepass items
  useEffect(() => {
    if (gatepassItems.length > 0 && products.length > 0) {
      const invoiceItems = gatepassItems.map(item => {
        const fg = finishedGoods.find(f => f.id === item.finishedGoodId);
        const product = fg 
          ? products.find(p => p.id === fg.productId)
          : products.find(p => p.id === item.productId);
        
        return {
          productId: product?.id || item.productId || "",
          description: product?.productName || item.productId || "",
          hsnCode: product?.hsnCode || "",
          quantity: item.quantityDispatched || 1,
          unitPrice: 0, // User needs to fill price
          gstRate: 18,
        };
      });
      
      form.setValue("items", invoiceItems);
    }
  }, [gatepassItems, products, finishedGoods, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchBuyerState = form.watch("buyerStateCode");
  const watchSellerState = form.watch("sellerStateCode");
  const watchItems = form.watch("items");

  useEffect(() => {
    setIsIntrastateSupply(watchBuyerState === watchSellerState);
  }, [watchBuyerState, watchSellerState]);

  const calculateTaxes = () => {
    let subtotal = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    watchItems.forEach((item) => {
      const itemTotal = item.quantity * item.unitPrice;
      subtotal += itemTotal;

      const taxAmount = (itemTotal * item.gstRate) / 100;
      
      if (isIntrastateSupply) {
        cgstAmount += taxAmount / 2;
        sgstAmount += taxAmount / 2;
      } else {
        igstAmount += taxAmount;
      }
    });

    const totalAmount = subtotal + cgstAmount + sgstAmount + igstAmount;

    return {
      subtotal: Math.round(subtotal * 100), // Convert to paise
      cgstAmount: Math.round(cgstAmount * 100),
      sgstAmount: Math.round(sgstAmount * 100),
      igstAmount: Math.round(igstAmount * 100),
      totalAmount: Math.round(totalAmount * 100),
    };
  };

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData) => {
      const taxes = calculateTaxes();
      
      const invoiceHeader = {
        gatepassId: data.gatepassId || null,
        invoiceDate: new Date(data.invoiceDate),
        sellerGstin: data.sellerGstin || null,
        sellerName: data.sellerName || null,
        sellerAddress: data.sellerAddress || null,
        sellerState: data.sellerState || null,
        sellerStateCode: data.sellerStateCode || null,
        buyerGstin: data.buyerGstin || null,
        buyerName: data.buyerName,
        buyerAddress: data.buyerAddress || null,
        buyerState: data.buyerState || null,
        buyerStateCode: data.buyerStateCode || null,
        subtotal: taxes.subtotal,
        cgstAmount: taxes.cgstAmount,
        sgstAmount: taxes.sgstAmount,
        igstAmount: taxes.igstAmount,
        cessAmount: 0,
        roundOff: 0,
        totalAmount: taxes.totalAmount,
        bankName: data.bankName || null,
        bankAccountNumber: data.bankAccountNumber || null,
        bankIfscCode: data.bankIfscCode || null,
        upiId: data.upiId || null,
        remarks: data.remarks || null,
      };

      const invoiceItems = data.items.map((item) => {
        const taxableAmount = item.quantity * item.unitPrice;
        const taxAmount = (taxableAmount * item.gstRate) / 100;
        
        let cgstRate = 0;
        let cgstAmount = 0;
        let sgstRate = 0;
        let sgstAmount = 0;
        let igstRate = 0;
        let igstAmount = 0;

        if (isIntrastateSupply) {
          cgstRate = (item.gstRate / 2) * 100; // Convert to basis points
          sgstRate = (item.gstRate / 2) * 100;
          cgstAmount = Math.round((taxAmount / 2) * 100); // Convert to paise
          sgstAmount = Math.round((taxAmount / 2) * 100);
        } else {
          igstRate = item.gstRate * 100;
          igstAmount = Math.round(taxAmount * 100);
        }

        return {
          productId: item.productId,
          hsnCode: item.hsnCode || null,
          sacCode: null,
          description: item.description,
          quantity: item.quantity,
          uomId: null,
          unitPrice: Math.round(item.unitPrice * 100), // Convert to paise
          discount: 0,
          taxableAmount: Math.round(taxableAmount * 100),
          cgstRate,
          cgstAmount,
          sgstRate,
          sgstAmount,
          igstRate,
          igstAmount,
          cessRate: 0,
          cessAmount: 0,
          totalAmount: Math.round((taxableAmount + taxAmount) * 100),
        };
      });

      return await apiRequest('POST', '/api/invoices', {
        header: invoiceHeader,
        items: invoiceItems,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      toast({
        title: "Success",
        description: "Invoice created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InvoiceFormData) => {
    createInvoiceMutation.mutate(data);
  };

  const taxes = calculateTaxes();
  const formatCurrency = (amountInPaise: number) => `₹${(amountInPaise / 100).toFixed(2)}`;

  return (
    <Card className="p-6 max-h-[90vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Generate GST Invoice</h2>
        <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-invoice-form">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Invoice Date */}
        <div>
          <Label htmlFor="invoiceDate">Invoice Date *</Label>
          <Input
            id="invoiceDate"
            type="date"
            {...form.register("invoiceDate")}
            data-testid="input-invoice-date"
          />
          {form.formState.errors.invoiceDate && (
            <p className="text-sm text-destructive mt-1">{form.formState.errors.invoiceDate.message}</p>
          )}
        </div>

        {/* Buyer Details */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Buyer Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="buyerName">Buyer Name *</Label>
              <Input
                id="buyerName"
                {...form.register("buyerName")}
                data-testid="input-buyer-name"
              />
              {form.formState.errors.buyerName && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.buyerName.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="buyerGstin">Buyer GSTIN</Label>
              <Input
                id="buyerGstin"
                {...form.register("buyerGstin")}
                placeholder="29AAAAA0000A1Z5"
                data-testid="input-buyer-gstin"
              />
            </div>
            <div className="col-span-2">
              <Label htmlFor="buyerAddress">Buyer Address</Label>
              <Input
                id="buyerAddress"
                {...form.register("buyerAddress")}
                data-testid="input-buyer-address"
              />
            </div>
            <div>
              <Label htmlFor="buyerState">Buyer State</Label>
              <Input
                id="buyerState"
                {...form.register("buyerState")}
                data-testid="input-buyer-state"
              />
            </div>
            <div>
              <Label htmlFor="buyerStateCode">State Code</Label>
              <Input
                id="buyerStateCode"
                {...form.register("buyerStateCode")}
                placeholder="29"
                maxLength={2}
                data-testid="input-buyer-state-code"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Invoice Items</h3>
            <Button
              type="button"
              size="sm"
              onClick={() => append({ productId: "", description: "", hsnCode: "", quantity: 1, unitPrice: 0, gstRate: 18 })}
              data-testid="button-add-item"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>

          {fields.map((field, index) => (
            <Card key={field.id} className="p-4 relative">
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => remove(index)}
                  data-testid={`button-remove-item-${index}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Product *</Label>
                  <Select
                    value={form.watch(`items.${index}.productId`)}
                    onValueChange={(value) => {
                      form.setValue(`items.${index}.productId`, value);
                      const product = products.find(p => p.id === value);
                      if (product) {
                        form.setValue(`items.${index}.description`, product.productName);
                        form.setValue(`items.${index}.hsnCode`, product.hsnCode || "");
                      }
                    }}
                  >
                    <SelectTrigger data-testid={`select-product-${index}`}>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.productName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>HSN Code</Label>
                  <Input
                    {...form.register(`items.${index}.hsnCode`)}
                    placeholder="8471"
                    data-testid={`input-hsn-${index}`}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Description *</Label>
                  <Input
                    {...form.register(`items.${index}.description`)}
                    data-testid={`input-description-${index}`}
                  />
                </div>
                <div>
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                    data-testid={`input-quantity-${index}`}
                  />
                </div>
                <div>
                  <Label>Unit Price (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                    data-testid={`input-unit-price-${index}`}
                  />
                </div>
                <div>
                  <Label>GST Rate (%) *</Label>
                  <Select
                    value={form.watch(`items.${index}.gstRate`)?.toString()}
                    onValueChange={(value) => form.setValue(`items.${index}.gstRate`, parseFloat(value))}
                  >
                    <SelectTrigger data-testid={`select-gst-rate-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="18">18%</SelectItem>
                      <SelectItem value="28">28%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Tax Summary */}
        <Card className="p-4 bg-muted">
          <h3 className="font-semibold mb-3">Tax Summary ({isIntrastateSupply ? "Intrastate" : "Interstate"} Supply)</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold">{formatCurrency(taxes.subtotal)}</span>
            </div>
            {isIntrastateSupply ? (
              <>
                <div className="flex justify-between">
                  <span>CGST:</span>
                  <span>{formatCurrency(taxes.cgstAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST:</span>
                  <span>{formatCurrency(taxes.sgstAmount)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span>IGST:</span>
                <span>{formatCurrency(taxes.igstAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total Amount:</span>
              <span>{formatCurrency(taxes.totalAmount)}</span>
            </div>
          </div>
        </Card>

        {/* Remarks */}
        <div>
          <Label htmlFor="remarks">Remarks</Label>
          <Input
            id="remarks"
            {...form.register("remarks")}
            placeholder="Additional notes"
            data-testid="input-remarks"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button type="submit" disabled={createInvoiceMutation.isPending} data-testid="button-generate-invoice">
            {createInvoiceMutation.isPending ? "Generating..." : "Generate Invoice"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
