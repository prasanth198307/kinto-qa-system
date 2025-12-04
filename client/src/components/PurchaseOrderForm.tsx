import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Vendor, SparePartCatalog, InvoiceTemplate, PurchaseOrder } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Check, ChevronsUpDown, Upload, X, ImageIcon, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const purchaseOrderFormSchema = z.object({
  poDate: z.string().optional(),
  vendorId: z.string().min(1, "Please select a vendor"),
  sparePartId: z.string().min(1, "Please select a spare part"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  urgency: z.enum(["low", "medium", "high", "critical"]),
  expectedDeliveryDate: z.string().optional(),
  deliveryAddress: z.string().optional(),
  paymentTerms: z.string().optional(),
  gstApplicable: z.number().default(1),
  gstRate: z.number().default(1800),
  remarks: z.string().optional(),
  termsAndConditions: z.string().optional(),
  includeSignature: z.number().default(1),
  signatureImage: z.string().optional(),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderFormSchema>;

interface PurchaseOrderFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  editingPO?: PurchaseOrder | null;
}

export default function PurchaseOrderForm({ onSuccess, onCancel, editingPO }: PurchaseOrderFormProps) {
  const { toast } = useToast();
  const [vendorSearchOpen, setVendorSearchOpen] = useState(false);
  const [sparePartSearchOpen, setSparePartSearchOpen] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const { data: vendors = [], isLoading: isLoadingVendors } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const { data: spareParts = [], isLoading: isLoadingSpareParts } = useQuery<SparePartCatalog[]>({
    queryKey: ['/api/spare-parts'],
  });

  const { data: templates = [] } = useQuery<InvoiceTemplate[]>({
    queryKey: ['/api/invoice-templates'],
  });

  const defaultTemplate = templates.find(t => t.isDefault === 1);

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      poDate: format(new Date(), "yyyy-MM-dd"),
      vendorId: "",
      sparePartId: "",
      quantity: 1,
      unitPrice: 0,
      urgency: "medium",
      expectedDeliveryDate: "",
      deliveryAddress: "356-2, Chintalapalem, Kothavalasa, Andhra Pradesh - 535183",
      paymentTerms: "Payment within 30 days of delivery",
      gstApplicable: 1,
      gstRate: 1800,
      remarks: "",
      termsAndConditions: `1. All items must be delivered in good condition.
2. Delivery should be made to the specified address.
3. Invoice must be provided along with delivery.
4. Payment will be made as per agreed terms.
5. Any discrepancies must be reported within 7 days of delivery.`,
      includeSignature: 1,
      signatureImage: "",
    },
  });

  useEffect(() => {
    if (editingPO) {
      form.reset({
        poDate: editingPO.poDate ? format(new Date(editingPO.poDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        vendorId: editingPO.vendorId || "",
        sparePartId: editingPO.sparePartId || "",
        quantity: editingPO.quantity,
        unitPrice: (editingPO.unitPrice || 0) / 100,
        urgency: (editingPO.urgency || "medium") as any,
        expectedDeliveryDate: editingPO.expectedDeliveryDate ? format(new Date(editingPO.expectedDeliveryDate), "yyyy-MM-dd") : "",
        deliveryAddress: editingPO.deliveryAddress || "356-2, Chintalapalem, Kothavalasa, Andhra Pradesh - 535183",
        paymentTerms: editingPO.paymentTerms || "Payment within 30 days of delivery",
        gstApplicable: editingPO.gstApplicable ?? 1,
        gstRate: editingPO.gstRate || 1800,
        remarks: editingPO.remarks || "",
        termsAndConditions: editingPO.termsAndConditions || "",
        includeSignature: editingPO.includeSignature ?? 1,
        signatureImage: editingPO.signatureImage || "",
      });
      if (editingPO.signatureImage) {
        setSignaturePreview(editingPO.signatureImage);
      }
    }
  }, [editingPO, form]);

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
  const selectedSparePart = spareParts.find(sp => sp.id === form.watch("sparePartId"));

  useEffect(() => {
    if (selectedSparePart && !editingPO) {
      form.setValue("unitPrice", (selectedSparePart.unitPrice || 0) / 100);
    }
  }, [selectedSparePart, editingPO, form]);

  const quantity = form.watch("quantity") || 0;
  const unitPrice = form.watch("unitPrice") || 0;
  const gstApplicable = form.watch("gstApplicable");
  const gstRate = form.watch("gstRate") || 1800;

  const subtotal = quantity * unitPrice;
  const gstAmount = gstApplicable === 1 ? (subtotal * gstRate) / 10000 : 0;
  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  const grandTotal = subtotal + gstAmount;

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

  const onSubmit = (data: PurchaseOrderFormData) => {
    // Convert rupees to paise for storage (all monetary values stored as integers in paise)
    const submitData = {
      ...data,
      poDate: data.poDate || new Date().toISOString(),
      unitPrice: Math.round(data.unitPrice * 100), // Convert rupees to paise
      totalAmount: Math.round(subtotal * 100), // Convert rupees to paise
      cgstAmount: Math.round(cgst * 100), // Convert rupees to paise
      sgstAmount: Math.round(sgst * 100), // Convert rupees to paise
      igstAmount: 0,
      grandTotal: Math.round(grandTotal * 100), // Convert rupees to paise
      // Only set status to pending for new POs, preserve existing status on edit
      ...(editingPO ? {} : { status: 'pending' }),
    };

    createPOMutation.mutate(submitData);
  };

  const lowStockItems = spareParts.filter(sp => 
    sp.reorderThreshold && sp.currentStock !== null && sp.currentStock !== undefined && sp.currentStock < sp.reorderThreshold
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Purchase Order Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Vendor Selection</h3>
          
          <FormField
            control={form.control}
            name="vendorId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Select Vendor / Supplier</FormLabel>
                <Popover open={vendorSearchOpen} onOpenChange={setVendorSearchOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={vendorSearchOpen}
                        className="w-full justify-between"
                        data-testid="button-vendor-select"
                      >
                        {field.value
                          ? vendors.find((v) => v.id === field.value)?.vendorName
                          : "Search and select vendor..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search vendors by name or GST..." 
                        data-testid="input-vendor-search"
                      />
                      <CommandEmpty>
                        {isLoadingVendors ? "Loading vendors..." : "No vendor found."}
                      </CommandEmpty>
                      <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandGroup>
                          {vendors.map((vendor) => (
                            <CommandItem
                              key={vendor.id}
                              value={vendor.vendorName}
                              keywords={[vendor.gstNumber || '', vendor.vendorCode || '']}
                              onSelect={() => {
                                form.setValue("vendorId", vendor.id);
                                setVendorSearchOpen(false);
                              }}
                              data-testid={`vendor-option-${vendor.id}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === vendor.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{vendor.vendorName}</span>
                                {vendor.gstNumber && (
                                  <span className="text-xs text-muted-foreground">
                                    GST: {vendor.gstNumber}
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedVendor && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <h4 className="font-medium mb-2">Selected Vendor Details</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-medium">{selectedVendor.vendorName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">GST:</span>{" "}
                  <span className="font-medium">{selectedVendor.gstNumber || "N/A"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Address:</span>{" "}
                  <span className="font-medium">{selectedVendor.address || "N/A"}</span>
                </div>
                {selectedVendor.contactPerson && (
                  <div>
                    <span className="text-muted-foreground">Contact:</span>{" "}
                    <span className="font-medium">{selectedVendor.contactPerson}</span>
                  </div>
                )}
                {selectedVendor.mobileNumber && (
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    <span className="font-medium">{selectedVendor.mobileNumber}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Spare Part Selection</h3>
          
          {lowStockItems.length > 0 && (
            <div className="mb-4 p-3 border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900 rounded-md">
              <div className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {lowStockItems.length} item(s) below reorder threshold
                </span>
              </div>
            </div>
          )}

          <FormField
            control={form.control}
            name="sparePartId"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Select Spare Part</FormLabel>
                <Popover open={sparePartSearchOpen} onOpenChange={setSparePartSearchOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={sparePartSearchOpen}
                        className="w-full justify-between"
                        data-testid="button-spare-part-select"
                      >
                        {field.value
                          ? spareParts.find((sp) => sp.id === field.value)?.partName
                          : "Search and select spare part..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[450px] p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Search by part name or number..." 
                        data-testid="input-spare-part-search"
                      />
                      <CommandEmpty>
                        {isLoadingSpareParts ? "Loading spare parts..." : "No spare part found."}
                      </CommandEmpty>
                      <CommandList className="max-h-[300px] overflow-y-auto">
                        <CommandGroup>
                          {spareParts.map((part) => {
                            const isLowStock = part.reorderThreshold && 
                              part.currentStock !== null && 
                              part.currentStock !== undefined && 
                              part.currentStock < part.reorderThreshold;
                            
                            return (
                              <CommandItem
                                key={part.id}
                                value={part.partName}
                                keywords={[part.partNumber || '', part.category || '']}
                                onSelect={() => {
                                  form.setValue("sparePartId", part.id);
                                  setSparePartSearchOpen(false);
                                }}
                                data-testid={`spare-part-option-${part.id}`}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === part.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-1 items-center justify-between">
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                      <span>{part.partName}</span>
                                      {isLowStock && (
                                        <AlertTriangle className="h-3 w-3 text-orange-600" />
                                      )}
                                    </div>
                                    {part.partNumber && (
                                      <span className="text-xs text-muted-foreground">
                                        Part #: {part.partNumber}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-right text-xs text-muted-foreground">
                                    <div>Stock: {part.currentStock ?? 0}</div>
                                    <div>Price: ₹{((part.unitPrice || 0) / 100).toFixed(2)}</div>
                                  </div>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {selectedSparePart && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <h4 className="font-medium mb-2">Selected Part Details</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Part Number:</span>{" "}
                  <span className="font-medium">{selectedSparePart.partNumber || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>{" "}
                  <span className="font-medium">{selectedSparePart.category || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Current Stock:</span>{" "}
                  <span className="font-medium">{selectedSparePart.currentStock ?? 0}</span>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Quantity & Pricing</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      min={1}
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      data-testid="input-quantity"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="unitPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit Price (₹)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number"
                      step="0.01"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      data-testid="input-unit-price"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="gstApplicable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GST Applicable</FormLabel>
                  <Select 
                    onValueChange={(v) => field.onChange(parseInt(v))} 
                    value={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-gst-applicable">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">Yes</SelectItem>
                      <SelectItem value="0">No</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {gstApplicable === 1 && (
              <FormField
                control={form.control}
                name="gstRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST Rate (%)</FormLabel>
                    <Select 
                      onValueChange={(v) => field.onChange(parseInt(v))} 
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-gst-rate">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="500">5%</SelectItem>
                        <SelectItem value="1200">12%</SelectItem>
                        <SelectItem value="1800">18%</SelectItem>
                        <SelectItem value="2800">28%</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <div className="mt-6 p-4 bg-muted rounded-md">
            <h4 className="font-semibold mb-3">Order Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal ({quantity} x ₹{unitPrice.toFixed(2)})</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {gstApplicable === 1 && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>CGST ({(gstRate / 200).toFixed(1)}%)</span>
                    <span>₹{cgst.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>SGST ({(gstRate / 200).toFixed(1)}%)</span>
                    <span>₹{sgst.toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Delivery & Payment</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      data-testid="input-expected-delivery"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentTerms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Terms</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder="e.g., Payment within 30 days"
                      data-testid="input-payment-terms"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-4">
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
                      placeholder="Enter delivery address"
                      data-testid="textarea-delivery-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Signature</h3>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeSignature"
                checked={form.watch("includeSignature") === 1}
                onChange={(e) => form.setValue("includeSignature", e.target.checked ? 1 : 0)}
                className="rounded border-gray-300 h-4 w-4"
                data-testid="checkbox-include-signature"
              />
              <Label htmlFor="includeSignature" className="cursor-pointer text-sm">
                Include digital signature on printed PO
              </Label>
            </div>
          </div>

          {form.watch("includeSignature") === 1 && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => signatureInputRef.current?.click()}
                  data-testid="button-upload-signature"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Signature
                </Button>
                
                {defaultTemplate?.defaultSignatureImage && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={useTemplateSignature}
                    data-testid="button-use-template-signature"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Use Template Signature
                  </Button>
                )}

                {signaturePreview && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSignature}
                    data-testid="button-clear-signature"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>

              <input
                ref={signatureInputRef}
                type="file"
                accept="image/*"
                onChange={handleSignatureUpload}
                className="hidden"
                data-testid="input-signature-upload"
              />

              {signaturePreview && (
                <div className="border rounded-md p-4 bg-white dark:bg-background">
                  <Label className="mb-2 block text-sm text-muted-foreground">Signature Preview</Label>
                  <img 
                    src={signaturePreview} 
                    alt="Signature preview" 
                    className="max-h-24 object-contain"
                  />
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
          
          <FormField
            control={form.control}
            name="remarks"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel>Remarks</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field}
                    rows={3}
                    placeholder="Enter any additional remarks..."
                    data-testid="textarea-remarks"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

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
                    placeholder="Enter terms and conditions..."
                    data-testid="textarea-terms"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </Card>

        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={createPOMutation.isPending}
            data-testid="button-submit-po"
          >
            {createPOMutation.isPending 
              ? (editingPO ? 'Updating...' : 'Creating...') 
              : (editingPO ? 'Update Purchase Order' : 'Create Purchase Order')
            }
          </Button>
        </div>
      </form>
    </Form>
  );
}
