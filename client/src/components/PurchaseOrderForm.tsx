import { useState, useEffect, useRef } from "react";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Vendor, InvoiceTemplate, PurchaseOrder, RawMaterial, Uom } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Check, ChevronsUpDown, Upload, X, ImageIcon, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Line item schema
const lineItemSchema = z.object({
  rawMaterialId: z.string().optional(),
  itemName: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  hsnCode: z.string().optional(),
  quantity: z.number().min(0.01, "Quantity must be greater than 0"),
  uomId: z.string().optional(),
  unitName: z.string().optional(),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  gstRate: z.number().default(1800),
});

const purchaseOrderFormSchema = z.object({
  poDate: z.string().optional(),
  vendorId: z.string().optional(), // Optional - can use manual entry instead
  // Manual vendor entry fields
  vendorName: z.string().optional(),
  vendorAddress: z.string().optional(),
  vendorGst: z.string().optional(),
  vendorPhone: z.string().optional(),
  vendorEmail: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
  deliveryAddress: z.string().optional(),
  paymentTerms: z.string().optional(),
  transportMode: z.string().optional(),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  remarks: z.string().optional(),
  termsAndConditions: z.string().optional(),
  includeSignature: z.number().default(1),
  signatureImage: z.string().optional(),
  items: z.array(lineItemSchema).min(1, "At least one item is required"),
}).refine((data) => {
  // Either select a vendor OR enter vendor name manually
  return data.vendorId || data.vendorName;
}, {
  message: "Please select a vendor or enter vendor name manually",
  path: ["vendorName"],
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderFormSchema>;

interface PurchaseOrderFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  editingPO?: PurchaseOrder | null;
}

interface POItem {
  id?: string;
  serialNo: number;
  rawMaterialId?: string | null;
  itemName: string;
  description?: string | null;
  hsnCode?: string | null;
  quantity: string;
  uomId?: string | null;
  unitName?: string | null;
  unitPrice: number;
  gstRate: number;
  amount: number;
  cgstAmount?: number | null;
  sgstAmount?: number | null;
  totalAmount?: number | null;
}

export default function PurchaseOrderForm({ onSuccess, onCancel, editingPO }: PurchaseOrderFormProps) {
  const { toast } = useToast();
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;
  const [vendorSearchOpen, setVendorSearchOpen] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['/api/raw-materials'],
  });

  const { data: uoms = [] } = useQuery<Uom[]>({
    queryKey: ['/api/uom'],
  });

  const { data: templates = [] } = useQuery<InvoiceTemplate[]>({
    queryKey: ['/api/invoice-templates'],
  });

  const { data: existingItems = [] } = useQuery<POItem[]>({
    queryKey: ['/api/purchase-order-items', editingPO?.id],
    enabled: !!editingPO?.id,
  });

  const defaultTemplate = templates.find(t => t.isDefault === 1);

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      poDate: format(new Date(), "yyyy-MM-dd"),
      vendorId: "",
      vendorName: "",
      vendorAddress: "",
      vendorGst: "",
      vendorPhone: "",
      vendorEmail: "",
      expectedDeliveryDate: "",
      deliveryAddress: "356-2, Chintalapalem, Kothavalasa, Andhra Pradesh - 535183",
      paymentTerms: "Payment within 30 days of delivery",
      transportMode: "Road",
      urgency: "medium",
      remarks: "",
      termsAndConditions: `1. All items must be delivered in good condition.
2. Delivery should be made to the specified address.
3. Invoice must be provided along with delivery.
4. Payment will be made as per agreed terms.
5. Any discrepancies must be reported within 7 days of delivery.`,
      includeSignature: 1,
      signatureImage: "",
      items: [{
        rawMaterialId: "",
        itemName: "",
        description: "",
        hsnCode: "",
        quantity: 1,
        uomId: "",
        unitName: "",
        unitPrice: 0,
        gstRate: 1800,
      }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Load existing PO data for editing - combined with items loading to avoid race condition
  useEffect(() => {
    if (editingPO) {
      // Map existing items if they're loaded, otherwise use empty placeholder
      const mappedItems = existingItems && existingItems.length > 0 
        ? existingItems.map(item => ({
            rawMaterialId: item.rawMaterialId || "",
            itemName: item.itemName,
            description: item.description || "",
            hsnCode: item.hsnCode || "",
            quantity: parseFloat(item.quantity) || 1,
            uomId: item.uomId || "",
            unitName: item.unitName || "",
            unitPrice: (item.unitPrice || 0) / 100, // Convert paise to rupees
            gstRate: item.gstRate || 1800,
          }))
        : [{
            rawMaterialId: "",
            itemName: "",
            description: "",
            hsnCode: "",
            quantity: 1,
            uomId: "",
            unitName: "",
            unitPrice: 0,
            gstRate: 1800,
          }];

      form.reset({
        poDate: editingPO.poDate ? format(new Date(editingPO.poDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        vendorId: editingPO.vendorId || "",
        vendorName: (editingPO as any).vendorName || "",
        vendorAddress: (editingPO as any).vendorAddress || "",
        vendorGst: (editingPO as any).vendorGst || "",
        vendorPhone: (editingPO as any).vendorPhone || "",
        vendorEmail: (editingPO as any).vendorEmail || "",
        expectedDeliveryDate: editingPO.expectedDeliveryDate ? format(new Date(editingPO.expectedDeliveryDate), "yyyy-MM-dd") : "",
        deliveryAddress: editingPO.deliveryAddress || "356-2, Chintalapalem, Kothavalasa, Andhra Pradesh - 535183",
        paymentTerms: editingPO.paymentTerms || "Payment within 30 days of delivery",
        transportMode: editingPO.transportMode || "Road",
        urgency: (editingPO.urgency || "medium") as any,
        remarks: editingPO.remarks || "",
        termsAndConditions: editingPO.termsAndConditions || "",
        includeSignature: editingPO.includeSignature ?? 1,
        signatureImage: editingPO.signatureImage || "",
        items: mappedItems,
      });
      if (editingPO.signatureImage) {
        setSignaturePreview(editingPO.signatureImage);
      }
    }
  }, [editingPO, existingItems]);

  // Set default signature from template
  useEffect(() => {
    if (defaultTemplate?.defaultSignatureImage && !signaturePreview && !editingPO?.signatureImage) {
      setSignaturePreview(defaultTemplate.defaultSignatureImage);
      form.setValue("signatureImage", defaultTemplate.defaultSignatureImage);
    }
  }, [defaultTemplate, signaturePreview, editingPO, form]);

  const createPOMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = editingPO ? `/api/purchase-orders/${editingPO.id}` : '/api/purchase-orders';
      const method = editingPO ? 'PUT' : 'POST';
      return await apiRequest(method, endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-order-items'] });
      toast({
        title: editingPO ? "Purchase Order Updated" : "Purchase Order Created",
        description: editingPO 
          ? "Purchase order has been updated successfully."
          : "Purchase order has been created successfully.",
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to save purchase order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const selectedVendor = vendors.find(v => v.id === form.watch("vendorId"));

  // Calculate line item totals
  const watchedItems = form.watch("items");
  const calculateLineTotal = (quantity: number, unitPrice: number, gstRate: number) => {
    const amount = quantity * unitPrice;
    const gstAmount = (amount * gstRate) / 10000;
    return {
      amount,
      gstAmount,
      total: amount + gstAmount,
    };
  };

  // Calculate overall totals
  const calculateTotals = () => {
    let subtotal = 0;
    let totalGst = 0;
    
    watchedItems.forEach(item => {
      const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0;
      const price = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice)) || 0;
      const gstRate = typeof item.gstRate === 'number' ? item.gstRate : 1800;
      
      const amount = qty * price;
      const gstAmount = (amount * gstRate) / 10000;
      
      subtotal += amount;
      totalGst += gstAmount;
    });
    
    return {
      subtotal,
      totalGst,
      cgst: totalGst / 2,
      sgst: totalGst / 2,
      grandTotal: subtotal + totalGst,
    };
  };

  const totals = calculateTotals();

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please upload an image file.",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload an image smaller than 2MB.",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setSignaturePreview(base64);
        form.setValue("signatureImage", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSignature = () => {
    setSignaturePreview(null);
    form.setValue("signatureImage", "");
    if (signatureInputRef.current) {
      signatureInputRef.current.value = "";
    }
  };

  const useTemplateSignature = () => {
    if (defaultTemplate?.defaultSignatureImage) {
      setSignaturePreview(defaultTemplate.defaultSignatureImage);
      form.setValue("signatureImage", defaultTemplate.defaultSignatureImage);
      toast({
        title: "Template Signature Applied",
        description: "Using signature from default invoice template.",
      });
    } else {
      toast({
        title: "No Template Signature",
        description: "No signature found in default invoice template.",
        variant: "destructive",
      });
    }
  };

  const handleRawMaterialSelect = (index: number, rawMaterialId: string) => {
    const material = rawMaterials.find(rm => rm.id === rawMaterialId);
    if (material) {
      form.setValue(`items.${index}.rawMaterialId`, rawMaterialId);
      form.setValue(`items.${index}.itemName`, material.materialName);
      form.setValue(`items.${index}.description`, material.description || "");
      if (material.uomId) {
        form.setValue(`items.${index}.uomId`, material.uomId);
        const uom = uoms.find(u => u.id === material.uomId);
        if (uom) {
          form.setValue(`items.${index}.unitName`, uom.name);
        }
      }
      // Set unit cost if available
      if (material.unitCost) {
        form.setValue(`items.${index}.unitPrice`, material.unitCost / 100);
      }
    }
  };

  const onSubmit = (data: PurchaseOrderFormData) => {
    // Convert line items to paise and calculate amounts
    const items = data.items.map((item, index) => {
      const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0;
      const price = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice)) || 0;
      const gstRate = typeof item.gstRate === 'number' ? item.gstRate : 1800;
      
      const amountInRupees = qty * price;
      const gstAmountInRupees = (amountInRupees * gstRate) / 10000;
      
      return {
        serialNo: index + 1,
        rawMaterialId: item.rawMaterialId || null,
        itemName: item.itemName,
        description: item.description || null,
        hsnCode: item.hsnCode || null,
        quantity: String(qty),
        uomId: item.uomId || null,
        unitName: item.unitName || null,
        unitPrice: Math.round(price * 100), // Convert to paise
        gstRate: gstRate,
        amount: Math.round(amountInRupees * 100), // Convert to paise
        cgstAmount: Math.round((gstAmountInRupees / 2) * 100),
        sgstAmount: Math.round((gstAmountInRupees / 2) * 100),
        igstAmount: 0,
        totalAmount: Math.round((amountInRupees + gstAmountInRupees) * 100),
      };
    });

    const submitData = {
      poDate: data.poDate || new Date().toISOString(),
      vendorId: data.vendorId || null,
      // Manual vendor entry fields
      vendorName: data.vendorName || null,
      vendorAddress: data.vendorAddress || null,
      vendorGst: data.vendorGst || null,
      vendorPhone: data.vendorPhone || null,
      vendorEmail: data.vendorEmail || null,
      expectedDeliveryDate: data.expectedDeliveryDate || null,
      deliveryAddress: data.deliveryAddress || null,
      paymentTerms: data.paymentTerms || null,
      transportMode: data.transportMode || null,
      urgency: data.urgency,
      remarks: data.remarks || null,
      termsAndConditions: data.termsAndConditions || null,
      includeSignature: data.includeSignature,
      signatureImage: data.signatureImage || null,
      // Calculate totals in paise
      totalAmount: Math.round(totals.subtotal * 100),
      cgstAmount: Math.round(totals.cgst * 100),
      sgstAmount: Math.round(totals.sgst * 100),
      igstAmount: 0,
      grandTotal: Math.round(totals.grandTotal * 100),
      gstApplicable: 1,
      gstRate: 1800, // Default rate for header
      // Include items
      items: items,
      // Preserve status on edit
      ...(editingPO ? {} : { status: 'pending' }),
    };

    createPOMutation.mutate(submitData);
  };

  const addLineItem = () => {
    append({
      rawMaterialId: "",
      itemName: "",
      description: "",
      hsnCode: "",
      quantity: 1,
      uomId: "",
      unitName: "",
      unitPrice: 0,
      gstRate: 1800,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header Section */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Purchase Order Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="poDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PO Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field}
                      data-testid="input-po-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="expectedDeliveryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Delivery Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      {...field}
                      data-testid="input-delivery-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="urgency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Urgency Level</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-urgency">
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        {/* Vendor Details - Manual Entry */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Vendor Details</h3>
          
          {/* Option to select existing vendor */}
          <div className="mb-4">
            <FormField
              control={form.control}
              name="vendorId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Select Existing Vendor (Optional)</FormLabel>
                  <Popover open={vendorSearchOpen} onOpenChange={setVendorSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-select-vendor"
                        >
                          {field.value
                            ? vendors.find(v => v.id === field.value)?.vendorName
                            : "Search existing vendors..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Search vendors..." />
                        <CommandList>
                          <CommandEmpty>No vendor found.</CommandEmpty>
                          <CommandGroup>
                            {vendors.map((vendor) => (
                              <CommandItem
                                key={vendor.id}
                                value={vendor.vendorName}
                                onSelect={() => {
                                  form.setValue("vendorId", vendor.id);
                                  // Auto-fill manual fields from selected vendor
                                  form.setValue("vendorName", vendor.vendorName);
                                  form.setValue("vendorAddress", vendor.address || "");
                                  form.setValue("vendorGst", vendor.gstNumber || "");
                                  form.setValue("vendorPhone", vendor.mobileNumber || "");
                                  form.setValue("vendorEmail", vendor.email || "");
                                  setVendorSearchOpen(false);
                                }}
                                data-testid={`vendor-option-${vendor.id}`}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    vendor.id === field.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span className="font-medium">{vendor.vendorName}</span>
                                  {vendor.gstNumber && (
                                    <span className="text-xs text-muted-foreground">GSTIN: {vendor.gstNumber}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )}
            />
          </div>

          <div className="text-sm text-muted-foreground mb-4">Or enter vendor details manually:</div>

          {/* Manual Vendor Entry Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="vendorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor Name *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter vendor/supplier name"
                      data-testid="input-vendor-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vendorGst"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GSTIN</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter GSTIN"
                      data-testid="input-vendor-gst"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vendorPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Enter phone number"
                      data-testid="input-vendor-phone"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vendorEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="email"
                      placeholder="Enter email address"
                      data-testid="input-vendor-email"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="vendorAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter vendor address"
                        rows={2}
                        data-testid="input-vendor-address"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Card>

        {/* Line Items */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Line Items</h3>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addLineItem}
              data-testid="button-add-line-item"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => {
              const item = watchedItems[index];
              const qty = typeof item?.quantity === 'number' ? item.quantity : parseFloat(String(item?.quantity)) || 0;
              const price = typeof item?.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item?.unitPrice)) || 0;
              const gstRate = typeof item?.gstRate === 'number' ? item.gstRate : 1800;
              const lineCalc = calculateLineTotal(qty, price, gstRate);

              return (
                <Card key={field.id} className="p-4 bg-muted/30">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-muted-foreground">Item #{index + 1}</span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    {/* Item Name */}
                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.itemName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Item Name *</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Enter item name"
                                data-testid={`input-item-name-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* HSN Code */}
                    <div>
                      <FormField
                        control={form.control}
                        name={`items.${index}.hsnCode`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">HSN Code</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="HSN"
                                data-testid={`input-hsn-${index}`}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Description</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Description"
                                data-testid={`input-description-${index}`}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-3">
                    {/* Quantity */}
                    <div>
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Qty *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                data-testid={`input-quantity-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Unit */}
                    <div>
                      <FormField
                        control={form.control}
                        name={`items.${index}.uomId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Unit</FormLabel>
                            <Select 
                              value={field.value || ""} 
                              onValueChange={(val) => {
                                field.onChange(val);
                                const uom = uoms.find(u => u.id === val);
                                if (uom) {
                                  form.setValue(`items.${index}.unitName`, uom.name);
                                }
                              }}
                            >
                              <FormControl>
                                <SelectTrigger data-testid={`select-uom-${index}`}>
                                  <SelectValue placeholder="Unit" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {uoms.map((uom) => (
                                  <SelectItem key={uom.id} value={uom.id}>
                                    {uom.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Rate */}
                    <div>
                      <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Rate ({sym}) *</FormLabel>
                            <FormControl>
                              <Input 
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                data-testid={`input-rate-${index}`}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* GST Rate */}
                    <div>
                      <FormField
                        control={form.control}
                        name={`items.${index}.gstRate`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">GST %</FormLabel>
                            <Select 
                              value={String(field.value)} 
                              onValueChange={(val) => field.onChange(parseInt(val))}
                            >
                              <FormControl>
                                <SelectTrigger data-testid={`select-gst-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="0">0%</SelectItem>
                                <SelectItem value="500">5%</SelectItem>
                                <SelectItem value="1200">12%</SelectItem>
                                <SelectItem value="1800">18%</SelectItem>
                                <SelectItem value="2800">28%</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Line Amount */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Amount</div>
                      <div className="h-9 flex items-center font-medium">
                        {fmtCur(lineCalc.amount, tenantConfig)}
                      </div>
                    </div>

                    {/* Line Total */}
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Total (incl. GST)</div>
                      <div className="h-9 flex items-center font-medium text-primary">
                        {fmtCur(lineCalc.total, tenantConfig)}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">{fmtCur(totals.subtotal, tenantConfig)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CGST:</span>
                <span>{fmtCur(totals.cgst, tenantConfig)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">SGST:</span>
                <span>{fmtCur(totals.sgst, tenantConfig)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="font-semibold">Grand Total:</span>
                <span className="font-bold text-lg text-primary">{fmtCur(totals.grandTotal, tenantConfig)}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Delivery & Payment */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Delivery & Payment</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="deliveryAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      rows={3}
                      data-testid="input-delivery-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="paymentTerms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-payment-terms">
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Payment within 7 days of delivery">Net 7</SelectItem>
                        <SelectItem value="Payment within 15 days of delivery">Net 15</SelectItem>
                        <SelectItem value="Payment within 30 days of delivery">Net 30</SelectItem>
                        <SelectItem value="Payment within 45 days of delivery">Net 45</SelectItem>
                        <SelectItem value="Payment within 60 days of delivery">Net 60</SelectItem>
                        <SelectItem value="Advance payment required">Advance</SelectItem>
                        <SelectItem value="Cash on Delivery">COD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="transportMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transport Mode</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-transport-mode">
                          <SelectValue placeholder="Select transport mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Road">Road</SelectItem>
                        <SelectItem value="Rail">Rail</SelectItem>
                        <SelectItem value="Air">Air</SelectItem>
                        <SelectItem value="Sea">Sea</SelectItem>
                        <SelectItem value="Courier">Courier</SelectItem>
                        <SelectItem value="Self Pickup">Self Pickup</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Card>

        {/* Terms, Remarks & Signature */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Additional Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="termsAndConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Terms & Conditions</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      rows={5}
                      data-testid="input-terms"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      rows={5}
                      placeholder="Any additional notes..."
                      data-testid="input-remarks"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Signature Section */}
          <div className="mt-6">
            <FormField
              control={form.control}
              name="includeSignature"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Signature</FormLabel>
                  <Select 
                    value={String(field.value)} 
                    onValueChange={(val) => field.onChange(parseInt(val))}
                  >
                    <FormControl>
                      <SelectTrigger className="w-48" data-testid="select-include-signature">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Include Signature</SelectItem>
                      <SelectItem value="0">No Signature</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {form.watch("includeSignature") === 1 && (
              <div className="mt-4 space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => signatureInputRef.current?.click()}
                    data-testid="button-upload-signature"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload Signature
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={useTemplateSignature}
                    data-testid="button-use-template-signature"
                  >
                    <ImageIcon className="h-4 w-4 mr-1" />
                    Use Template Signature
                  </Button>
                  {signaturePreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSignature}
                      data-testid="button-clear-signature"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  )}
                </div>
                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSignatureUpload}
                />
                {signaturePreview && (
                  <div className="border rounded-lg p-4 max-w-xs bg-white">
                    <img 
                      src={signaturePreview} 
                      alt="Signature Preview" 
                      className="max-h-20 object-contain"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Form Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={createPOMutation.isPending}
            data-testid="button-submit"
          >
            {createPOMutation.isPending 
              ? "Saving..." 
              : editingPO 
                ? "Update Purchase Order" 
                : "Create Purchase Order"
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
