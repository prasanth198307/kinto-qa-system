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
import { Plus, Trash2 } from "lucide-react";

const headerSchema = insertGatepassSchema;
const itemSchema = insertGatepassItemSchema.omit({ gatepassId: true });

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
    saveMutation.mutate(data);
  };

  return (
    <Card className="p-4 mb-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          {gatepass ? 'Edit Gatepass' : 'Create Gatepass'}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {gatepass ? 'Update gatepass details and line items' : 'Dispatch multiple finished goods in one gatepass'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <FormLabel>Driver Contact (Optional)</FormLabel>
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
                    <FormLabel>Transporter Name (Optional)</FormLabel>
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
                    <FormLabel>Destination (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} data-testid="input-destination" />
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
                    <FormLabel>Select Invoice (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-invoice">
                          <SelectValue placeholder="Select an invoice" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {availableInvoices.map((invoice) => (
                          <SelectItem key={invoice.id} value={invoice.id}>
                            {invoice.invoiceNumber} - {invoice.buyerName} - ₹{(invoice.totalAmount / 100).toFixed(2)}
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

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-sm">Finished Goods Items</h4>
              <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="button-add-item">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>

            {items.map((_, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h5 className="text-sm font-medium">Item {index + 1}</h5>
                    {items.length > 1 && (
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                          <Select onValueChange={field.onChange} value={field.value || ""}>
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

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} data-testid="button-submit">
              {saveMutation.isPending ? "Saving..." : (gatepass ? "Update Gatepass" : "Create Gatepass")}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
