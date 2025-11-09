import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertGatepassSchema, insertGatepassItemSchema, type FinishedGood, type Product, type Uom, type Gatepass, type GatepassItem, type Vendor, type Invoice } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Printer } from "lucide-react";

const headerSchema = insertGatepassSchema.extend({
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  driverName: z.string().min(1, "Driver name is required"),
  driverContact: z.string().min(1, "Driver contact is required"),
  transporterName: z.string().min(1, "Transporter name is required"),
  destination: z.string().min(1, "Destination is required"),
  customerName: z.string().min(1, "Customer name is required"),
  casesCount: z.number().optional(), // Number of cases/boxes
  securitySealNo: z.string().optional(), // Security seal number
  remarks: z.string().optional(), // Remarks is optional
});

const itemSchema = insertGatepassItemSchema.omit({ gatepassId: true }).extend({
  finishedGoodId: z.string().min(1, "Finished good is required"),
  productId: z.string().min(1, "Product is required"),
  quantityDispatched: z.number().min(1, "Quantity must be at least 1"),
  uomId: z.string().min(1, "Unit of measurement is required"),
  remarks: z.string().optional(), // Item remarks is optional
});

const formSchema = z.object({
  header: headerSchema,
  items: z.array(itemSchema).min(1, "At least one item is required"),
});

type FormData = z.infer<typeof formSchema>;

interface GatepassFormProps {
  gatepass: Gatepass | null;
  onClose: () => void;
}

export default function GatepassForm({ gatepass, onClose }: GatepassFormProps) {
  const { toast } = useToast();
  const [items, setItems] = useState([{ 
    finishedGoodId: "", 
    productId: "", 
    quantityDispatched: 0, 
    uomId: "", 
    remarks: "" 
  }]);

  const { data: gatepassItems = [] } = useQuery<GatepassItem[]>({
    queryKey: ['/api/gatepass-items', gatepass?.id],
    enabled: !!gatepass?.id,
  });

  const { data: finishedGoods = [] } = useQuery<FinishedGood[]>({
    queryKey: ['/api/finished-goods'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: uoms = [] } = useQuery<Uom[]>({
    queryKey: ['/api/uom'],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  // Fetch available invoices (not yet linked to any gatepass)
  const { data: availableInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices/available'],
  });

  // Fetch invoice items when an invoice is selected
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const { data: invoiceItems = [] } = useQuery<any[]>({
    queryKey: ['/api/invoice-items', selectedInvoiceId],
    enabled: !!selectedInvoiceId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      header: {
        gatepassDate: new Date(),
        vehicleNumber: "",
        driverName: "",
        driverContact: "",
        transporterName: "",
        destination: "",
        vendorId: "",
        customerName: "",
        isCluster: 0,
        invoiceId: "",
        casesCount: undefined,
        securitySealNo: "",
        remarks: "",
      },
      items: items,
    },
  });

  useEffect(() => {
    if (gatepass && gatepassItems.length > 0) {
      const mappedItems = gatepassItems.map(item => ({
        finishedGoodId: item.finishedGoodId,
        productId: item.productId,
        quantityDispatched: item.quantityDispatched,
        uomId: item.uomId || "",
        remarks: item.remarks || "",
      }));
      
      setItems(mappedItems);
      
      // Initialize selectedInvoiceId if gatepass has an invoice
      if (gatepass.invoiceId) {
        setSelectedInvoiceId(gatepass.invoiceId);
      }
      
      form.reset({
        header: {
          gatepassDate: gatepass.gatepassDate ? new Date(gatepass.gatepassDate) : new Date(),
          vehicleNumber: gatepass.vehicleNumber,
          driverName: gatepass.driverName,
          driverContact: gatepass.driverContact || "",
          transporterName: gatepass.transporterName || "",
          destination: gatepass.destination || "",
          vendorId: gatepass.vendorId || "",
          customerName: gatepass.customerName || "",
          isCluster: gatepass.isCluster || 0,
          invoiceId: gatepass.invoiceId || "",
          remarks: gatepass.remarks || "",
        },
        items: mappedItems,
      });
    }
  }, [gatepass, gatepassItems, form]);

  // Auto-populate customer and items when invoice is selected
  useEffect(() => {
    if (selectedInvoiceId && availableInvoices.length > 0) {
      const selectedInvoice = availableInvoices.find(inv => inv.id === selectedInvoiceId);
      if (selectedInvoice) {
        // Auto-fill customer details from invoice buyer
        form.setValue("header.customerName", selectedInvoice.buyerName);
        form.setValue("header.isCluster", selectedInvoice.isCluster || 0);
        
        // Find vendor by buyer name (if exists)
        const matchingVendor = vendors.find(v => v.vendorName === selectedInvoice.buyerName);
        if (matchingVendor) {
          form.setValue("header.vendorId", matchingVendor.id);
        }
      }
    }
  }, [selectedInvoiceId, availableInvoices, vendors, form]);

  // Auto-populate finished goods items from invoice items
  useEffect(() => {
    if (invoiceItems.length > 0 && selectedInvoiceId) {
      const mappedItems = invoiceItems.map(invItem => {
        // Find matching finished good by product
        const matchingFG = finishedGoods.find(fg => fg.productId === invItem.productId);
        return {
          finishedGoodId: matchingFG?.id || "",
          productId: invItem.productId,
          quantityDispatched: invItem.quantity,
          uomId: invItem.uomId || "",
          remarks: invItem.description || "",
        };
      });
      
      setItems(mappedItems);
      form.setValue("items", mappedItems);
    }
  }, [invoiceItems, selectedInvoiceId, finishedGoods, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (gatepass) {
        return await apiRequest('PATCH', `/api/gatepasses/${gatepass.id}`, data);
      } else {
        return await apiRequest('POST', '/api/gatepasses', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/gatepasses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/gatepass-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finished-goods'] });
      toast({
        title: "Success",
        description: gatepass ? "Gatepass updated successfully" : "Gatepass created successfully",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || (gatepass ? "Failed to update gatepass" : "Failed to create gatepass"),
        variant: "destructive",
      });
    },
  });

  const addItem = () => {
    const newItems = [...items, { 
      finishedGoodId: "", 
      productId: "", 
      quantityDispatched: 0, 
      uomId: "", 
      remarks: "" 
    }];
    setItems(newItems);
    form.setValue('items', newItems);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      form.setValue('items', newItems);
    }
  };

  const handleClose = () => {
    form.reset();
    setItems([{ finishedGoodId: "", productId: "", quantityDispatched: 0, uomId: "", remarks: "" }]);
    onClose();
  };

  const onSubmit = (data: FormData) => {
    // Alert if no invoice selected
    if (!selectedInvoiceId) {
      toast({
        title: "Invoice Required",
        description: "Please select an invoice to add items before creating the gatepass.",
        variant: "destructive",
      });
      return;
    }
    
    saveMutation.mutate(data);
  };

  const handlePrintPreview = () => {
    const formData = form.getValues();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML(formData));
      printWindow.document.close();
    }
  };

  const generatePrintHTML = (data: FormData) => {
    const vendor = vendors.find(v => v.id === data.header.vendorId);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gatepass - ${gatepass?.gatepassNumber || 'New'}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; }
          .no-print { display: block; margin-bottom: 20px; }
          @media print { .no-print { display: none; } }
          .print-btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 15px; }
          .company-name { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
          .gatepass-number { font-size: 18px; font-weight: bold; margin: 10px 0; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
          .detail-item { padding: 8px 0; border-bottom: 1px solid #ddd; }
          .detail-label { font-weight: bold; margin-right: 10px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border: 1px solid #ddd; }
          th { background: #f0f0f0; font-weight: bold; }
          .signature-section { margin-top: 60px; display: flex; justify-content: space-between; }
          .signature-box { text-align: center; }
          .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
        </style>
      </head>
      <body>
        <button onclick="window.print()" class="print-btn no-print">Print Gatepass</button>
        
        <div class="header">
          <div class="company-name">KINTO MANUFACTURING</div>
          <div>DELIVERY GATEPASS</div>
          <div class="gatepass-number">GP No: ${gatepass?.gatepassNumber || 'NEW'}</div>
        </div>

        <div class="details-grid">
          <div class="detail-item">
            <span class="detail-label">Date:</span>
            <span>${new Date(data.header.gatepassDate).toLocaleDateString()}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Customer:</span>
            <span>${data.header.customerName}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Vehicle Number:</span>
            <span>${data.header.vehicleNumber}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Driver Name:</span>
            <span>${data.header.driverName}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Driver Contact:</span>
            <span>${data.header.driverContact}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Transporter:</span>
            <span>${data.header.transporterName}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Destination:</span>
            <span>${data.header.destination}</span>
          </div>
          ${vendor ? `
          <div class="detail-item">
            <span class="detail-label">Vendor:</span>
            <span>${vendor.vendorName}</span>
          </div>
          ` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>UOM</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map((item, index) => {
              const product = products.find(p => p.id === item.productId);
              const uom = uoms.find(u => u.id === item.uomId);
              return `
              <tr>
                <td>${index + 1}</td>
                <td>${product?.productName || 'N/A'}</td>
                <td>${item.quantityDispatched}</td>
                <td>${uom?.name || 'N/A'}</td>
                <td>${item.remarks || '-'}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        ${data.header.remarks ? `
        <div style="margin: 20px 0;">
          <strong>Remarks:</strong> ${data.header.remarks}
        </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-line">Prepared By</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Checked By</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Authorized Signatory</div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <Card className="p-4 mb-4">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">
            {gatepass ? 'Edit Gatepass' : 'Create Gatepass'}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {gatepass ? 'Update gatepass details and line items' : 'Dispatch multiple finished goods in one gatepass'}
          </p>
        </div>
        {gatepass && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePrintPreview} 
            type="button"
            data-testid="button-print-preview-gatepass"
          >
            <Printer className="w-4 h-4 mr-1" />
            Print Preview
          </Button>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <>
          <Card className="p-4 space-y-4">
            <h4 className="font-semibold text-sm">Gatepass Details</h4>
            
            {gatepass && (
              <div className="mb-4 p-3 bg-muted rounded-md">
                <p className="text-sm">
                  <span className="font-medium">Gatepass Number:</span> <span className="text-primary">{gatepass.gatepassNumber}</span>
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="header.gatepassDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gatepass Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                        data-testid="input-gatepass-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.vehicleNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Number</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="MH-12-AB-1234" data-testid="input-vehicle-number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.driverName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-driver-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.driverContact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver Contact</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-driver-contact" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.transporterName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transporter Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-transporter-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-destination" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.casesCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Cases/Boxes (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        value={field.value || ""} 
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        placeholder="e.g., 10" 
                        data-testid="input-cases-count" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.securitySealNo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Security Seal Number (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="e.g., SEAL-12345" 
                        data-testid="input-security-seal-no" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.vendorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer/Vendor</FormLabel>
                    <Select
                      value={field.value || ""}
                      onValueChange={(value) => {
                        field.onChange(value);
                        const selectedVendor = vendors.find(v => v.id === value);
                        if (selectedVendor) {
                          form.setValue("header.customerName", selectedVendor.vendorName);
                          form.setValue("header.isCluster", selectedVendor.isCluster || 0);
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-vendor">
                          <SelectValue placeholder="Select vendor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{vendor.vendorName}</span>
                              <span className="text-xs text-muted-foreground">
                                {vendor.mobileNumber} • {vendor.gstNumber || vendor.aadhaarNumber || "No ID"}
                              </span>
                            </div>
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
                name="header.customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} readOnly className="bg-muted" data-testid="input-customer-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.invoiceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Invoice</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        // Alert when selecting "None"
                        if (value === "none" && selectedInvoiceId) {
                          toast({
                            title: "Warning",
                            description: "Selecting 'None' will remove all items. You won't be able to add items without an invoice.",
                            variant: "default",
                          });
                        }
                        field.onChange(value === "none" ? "" : value);
                        setSelectedInvoiceId(value === "none" ? "" : value);
                      }} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-invoice">
                          <SelectValue placeholder="Select an invoice to add items" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None - No items can be added</SelectItem>
                        {availableInvoices.map((invoice) => (
                          <SelectItem key={invoice.id} value={invoice.id}>
                            {invoice.invoiceNumber} - {invoice.buyerName} - ₹{(invoice.totalAmount / 100).toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Invoice must be selected to add items. Items will auto-populate from the selected invoice.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks (Optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value || ""} data-testid="input-header-remarks" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {selectedInvoiceId && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold text-sm">
                  Finished Goods Items
                  <span className="ml-2 text-xs text-muted-foreground">(Auto-populated from Invoice)</span>
                </h4>
              </div>

              {items.map((_, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h5 className="text-sm font-medium">Item {index + 1}</h5>
                    {items.length > 1 && !selectedInvoiceId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.finishedGoodId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Finished Good</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid={`select-finished-good-${index}`}>
                                <SelectValue placeholder="Select finished good" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {finishedGoods.map((fg) => {
                                const product = products.find(p => p.id === fg.productId);
                                return (
                                  <SelectItem key={fg.id} value={fg.id}>
                                    {product?.productName || 'Unknown'} - Batch: {fg.batchNumber} (Qty: {fg.quantity})
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.productId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!!selectedInvoiceId}>
                            <FormControl>
                              <SelectTrigger data-testid={`select-product-${index}`}>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.productName}
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
                      name={`items.${index}.quantityDispatched`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity Dispatched</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              readOnly={!!selectedInvoiceId}
                              className={selectedInvoiceId ? "bg-muted" : ""}
                              data-testid={`input-quantity-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.uomId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit of Measure</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""} disabled={!!selectedInvoiceId}>
                            <FormControl>
                              <SelectTrigger data-testid={`select-uom-${index}`}>
                                <SelectValue placeholder="Select UOM" />
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.remarks`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Item Remarks (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} data-testid={`input-item-remarks-${index}`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </Card>
            ))}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} data-testid="button-submit">
              {saveMutation.isPending ? "Saving..." : (gatepass ? "Update Gatepass" : "Create Gatepass")}
            </Button>
          </div>
          </>
        </form>
      </Form>
    </Card>
  );
}
