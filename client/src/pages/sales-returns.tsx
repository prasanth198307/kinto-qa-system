import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Package, CheckCircle, AlertCircle, Trash2, Search, Loader2, Camera, Image, Upload, X, Printer } from "lucide-react";
import PrintableSalesReturn from "@/components/PrintableSalesReturn";
import PrintableScrapInventory from "@/components/PrintableScrapInventory";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const createReturnSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  returnDate: z.string().min(1, "Return date is required"),
  returnReason: z.string().min(1, "Return reason is required"),
  customerRemarks: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    productName: z.string().min(1),
    batchNumber: z.string().optional(),
    quantityReturned: z.coerce.number().min(1, "Quantity must be at least 1"),
    maxQuantity: z.coerce.number().optional(), // Max quantity from invoice
    unitPrice: z.coerce.number().optional(), // Unit price from invoice
    returnReason: z.string().min(1, "Reason is required"),
  })).min(1, "At least one item is required"),
});

type CreateReturnForm = z.infer<typeof createReturnSchema>;

interface InvoiceItem {
  id: string;
  productId: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  product?: { name: string };
}

const inspectSchema = z.object({
  inspections: z.array(z.object({
    itemId: z.string(),
    condition: z.enum(['good', 'damaged']),
    disposition: z.enum(['restock', 'scrap']),
  })),
});

export default function SalesReturnsPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inspectDialogOpen, setInspectDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [invoiceSearchOpen, setInvoiceSearchOpen] = useState(false);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [loadingInvoiceItems, setLoadingInvoiceItems] = useState(false);

  const { data: returns = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/sales-returns'],
  });

  // Only fetch delivered invoices (can only return delivered items)
  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ['/api/invoices'],
  });

  // Filter to only delivered invoices for returns
  const deliveredInvoices = invoices.filter((inv: any) => 
    inv.status === 'delivered' || inv.dispatchStatus === 'pod_confirmed'
  );

  // Filter invoices based on search
  const filteredInvoices = deliveredInvoices.filter((inv: any) => {
    const searchLower = invoiceSearch.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(searchLower) ||
      inv.customerName?.toLowerCase().includes(searchLower) ||
      inv.vendorName?.toLowerCase().includes(searchLower)
    );
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  const form = useForm<CreateReturnForm>({
    resolver: zodResolver(createReturnSchema),
    defaultValues: {
      invoiceId: "",
      returnDate: format(new Date(), "yyyy-MM-dd"),
      returnReason: "",
      customerRemarks: "",
      items: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Load invoice items when invoice is selected
  const loadInvoiceItems = async (invoiceId: string) => {
    setLoadingInvoiceItems(true);
    try {
      const response = await fetch(`/api/invoice-items/${invoiceId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch invoice items');
      const items: InvoiceItem[] = await response.json();
      
      // Convert invoice items to return items with max quantity validation
      const returnItems = items.map((item) => ({
        productId: item.productId,
        productName: item.product?.name || item.description || 'Unknown Product',
        batchNumber: '',
        quantityReturned: 1,
        maxQuantity: item.quantity,
        unitPrice: item.unitPrice,
        returnReason: '',
      }));
      
      replace(returnItems);
      toast({ title: `Loaded ${items.length} items from invoice` });
    } catch (error: any) {
      toast({ 
        title: "Failed to load invoice items", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setLoadingInvoiceItems(false);
    }
  };

  // Handle invoice selection
  const handleInvoiceSelect = (invoiceId: string) => {
    form.setValue('invoiceId', invoiceId);
    setSelectedInvoiceId(invoiceId);
    setInvoiceSearchOpen(false);
    loadInvoiceItems(invoiceId);
  };

  // Get selected invoice details
  const selectedInvoice = invoices.find((inv: any) => inv.id === form.watch('invoiceId'));

  const createMutation = useMutation({
    mutationFn: async (data: CreateReturnForm) => {
      const { items, ...header } = data;
      return apiRequest('POST', '/api/sales-returns', { header, items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-returns'] });
      toast({ title: "Sales return created successfully" });
      setCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Failed to create return", description: error.message, variant: "destructive" });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('PATCH', `/api/sales-returns/${id}/receive`, { receivedDate: new Date().toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-returns'] });
      toast({ title: "Return marked as received" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to receive return", description: error.message, variant: "destructive" });
    },
  });

  const inspectMutation = useMutation({
    mutationFn: async ({ id, inspections }: { id: string; inspections: any[] }) => {
      return apiRequest('PATCH', `/api/sales-returns/${id}/inspect`, { inspections });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-returns'] });
      toast({ title: "Return inspected and inventory updated" });
      setInspectDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Failed to inspect return", description: error.message, variant: "destructive" });
    },
  });

  const handleReceive = async (id: string) => {
    receiveMutation.mutate(id);
  };

  const handleInspect = async (returnRecord: any) => {
    const response = await apiRequest('GET', `/api/sales-returns/${returnRecord.id}`);
    const returnWithItems = await response.json();
    setSelectedReturn(returnWithItems);
    setInspectDialogOpen(true);
  };

  const onSubmit = (data: CreateReturnForm) => {
    createMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      pending: { variant: "secondary", icon: AlertCircle },
      received: { variant: "default", icon: Package },
      inspected: { variant: "default", icon: CheckCircle },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1" data-testid={`badge-status-${status}`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Sales Returns & Damage Handling</h1>
          <p className="text-muted-foreground">Manage post-delivery returns and damaged goods</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-return">
              <Plus className="mr-2 h-4 w-4" />
              Create Return
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Sales Return</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="invoiceId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Invoice</FormLabel>
                        <Popover open={invoiceSearchOpen} onOpenChange={setInvoiceSearchOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={invoiceSearchOpen}
                                className="justify-between"
                                data-testid="select-invoice"
                              >
                                {selectedInvoice 
                                  ? `${selectedInvoice.invoiceNumber} - ${selectedInvoice.customerName || selectedInvoice.vendorName}`
                                  : "Search invoice..."}
                                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                              <CommandInput 
                                placeholder="Search by invoice number or customer..."
                                value={invoiceSearch}
                                onValueChange={setInvoiceSearch}
                                data-testid="input-invoice-search"
                              />
                              <CommandList>
                                <CommandEmpty>
                                  {deliveredInvoices.length === 0 
                                    ? "No delivered invoices found"
                                    : "No matching invoices found"}
                                </CommandEmpty>
                                <CommandGroup heading="Delivered Invoices">
                                  {filteredInvoices.slice(0, 20).map((inv: any) => (
                                    <CommandItem
                                      key={inv.id}
                                      value={`${inv.invoiceNumber} ${inv.customerName || inv.vendorName}`}
                                      onSelect={() => handleInvoiceSelect(inv.id)}
                                      data-testid={`invoice-option-${inv.id}`}
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">{inv.invoiceNumber}</span>
                                        <span className="text-sm text-muted-foreground">
                                          {inv.customerName || inv.vendorName} - {format(new Date(inv.invoiceDate), 'dd MMM yyyy')}
                                        </span>
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
                  <FormField
                    control={form.control}
                    name="returnDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-return-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="returnReason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Reason</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-return-reason">
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="damaged_in_transit">Damaged in Transit</SelectItem>
                          <SelectItem value="quality_issue">Quality Issue</SelectItem>
                          <SelectItem value="wrong_product">Wrong Product</SelectItem>
                          <SelectItem value="excess_delivery">Excess Delivery</SelectItem>
                          <SelectItem value="customer_request">Customer Request</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerRemarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Remarks (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-customer-remarks" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Return Items</h3>
                    {loadingInvoiceItems && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading items...
                      </div>
                    )}
                  </div>

                  {fields.length === 0 && !loadingInvoiceItems && (
                    <Card className="border-dashed">
                      <CardContent className="py-8 text-center text-muted-foreground">
                        {form.watch('invoiceId') 
                          ? "No items loaded from invoice"
                          : "Select an invoice to load items automatically"}
                      </CardContent>
                    </Card>
                  )}

                  {fields.map((field, index) => {
                    const maxQty = form.watch(`items.${index}.maxQuantity`) || 0;
                    const currentQty = form.watch(`items.${index}.quantityReturned`) || 0;
                    const unitPrice = form.watch(`items.${index}.unitPrice`) || 0;
                    const isOverMax = currentQty > maxQty;
                    
                    return (
                    <Card key={field.id} className={isOverMax ? "border-destructive" : ""}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{form.watch(`items.${index}.productName`)}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  (Max: {maxQty} @ {(unitPrice / 100).toFixed(2)}/unit)
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => remove(index)}
                                data-testid={`button-remove-item-${index}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name={`items.${index}.quantityReturned`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Qty to Return</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min={1}
                                        max={maxQty}
                                        {...field} 
                                        className={isOverMax ? "border-destructive" : ""}
                                        data-testid={`input-quantity-${index}`} 
                                      />
                                    </FormControl>
                                    {isOverMax && (
                                      <p className="text-xs text-destructive">
                                        Cannot exceed {maxQty}
                                      </p>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.batchNumber`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Batch (Optional)</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="e.g., LOT-2024" data-testid={`input-batch-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.returnReason`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Item Reason</FormLabel>
                                    <FormControl>
                                      <Input {...field} placeholder="e.g., Broken seal" data-testid={`input-item-reason-${index}`} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                  })}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-return">
                    {createMutation.isPending ? "Creating..." : "Create Return"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-returns">{returns.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Inspection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-inspection">
              {returns.filter((r: any) => r.status === 'received').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inspected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-inspected">
              {returns.filter((r: any) => r.status === 'inspected').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Returns List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return Number</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Return Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No sales returns found
                  </TableCell>
                </TableRow>
              ) : (
                returns.map((returnRecord: any) => (
                  <TableRow key={returnRecord.id} data-testid={`row-return-${returnRecord.id}`}>
                    <TableCell className="font-medium">{returnRecord.returnNumber}</TableCell>
                    <TableCell data-testid={`text-invoice-number-${returnRecord.id}`}>
                      {returnRecord.invoiceNumber || returnRecord.invoiceId}
                    </TableCell>
                    <TableCell>{format(new Date(returnRecord.returnDate), "dd MMM yyyy")}</TableCell>
                    <TableCell>{returnRecord.returnReason.replace(/_/g, ' ')}</TableCell>
                    <TableCell>{getStatusBadge(returnRecord.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <PrintableSalesReturn salesReturn={returnRecord} />
                        {returnRecord.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReceive(returnRecord.id)}
                            disabled={receiveMutation.isPending}
                            data-testid={`button-receive-${returnRecord.id}`}
                          >
                            Mark Received
                          </Button>
                        )}
                        {returnRecord.status === 'received' && (
                          <Button
                            size="sm"
                            onClick={() => handleInspect(returnRecord)}
                            disabled={inspectMutation.isPending}
                            data-testid={`button-inspect-${returnRecord.id}`}
                          >
                            Inspect
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Scrap Inventory Section */}
      <ScrapInventorySection />

      {/* Inspect Dialog */}
      <Dialog open={inspectDialogOpen} onOpenChange={setInspectDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Inspect Return - {selectedReturn?.returnNumber}</DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <InspectionForm
              returnRecord={selectedReturn}
              onSubmit={(inspections) => {
                inspectMutation.mutate({ id: selectedReturn.id, inspections });
              }}
              isPending={inspectMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InspectionForm({ returnRecord, onSubmit, isPending }: { returnRecord: any; onSubmit: (inspections: any[]) => void; isPending: boolean }) {
  const [inspections, setInspections] = useState(
    returnRecord.items.map((item: any) => ({
      itemId: item.id,
      condition: 'good' as const,
      disposition: 'restock' as const,
    }))
  );

  const handleSubmit = () => {
    onSubmit(inspections);
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Disposition</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {returnRecord.items.map((item: any, index: number) => (
            <TableRow key={item.id}>
              <TableCell>{item.productName}</TableCell>
              <TableCell>{item.batchNumber}</TableCell>
              <TableCell>{item.quantityReturned}</TableCell>
              <TableCell>
                <Select
                  value={inspections[index].condition}
                  onValueChange={(value) => {
                    const updated = [...inspections];
                    updated[index].condition = value as 'good' | 'damaged';
                    setInspections(updated);
                  }}
                >
                  <SelectTrigger data-testid={`select-condition-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Select
                  value={inspections[index].disposition}
                  onValueChange={(value) => {
                    const updated = [...inspections];
                    updated[index].disposition = value as 'restock' | 'scrap';
                    setInspections(updated);
                  }}
                >
                  <SelectTrigger data-testid={`select-disposition-${index}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restock">Restock</SelectItem>
                    <SelectItem value="scrap">Scrap/Damage</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => {}} data-testid="button-cancel-inspect">
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending} data-testid="button-submit-inspection">
          {isPending ? "Processing..." : "Complete Inspection"}
        </Button>
      </div>
    </div>
  );
}

// Scrap Inventory Section with Photo Upload
function ScrapInventorySection() {
  const { toast } = useToast();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: scrapRecords = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/scrap-inventory'],
  });

  const uploadEvidenceMutation = useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const formData = new FormData();
      formData.append('photo', file);
      
      const response = await fetch(`/api/scrap-inventory/${id}/evidence`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/scrap-inventory'] });
      toast({ title: "Damage evidence uploaded successfully" });
      setUploadingId(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Upload failed", 
        description: error.message,
        variant: "destructive" 
      });
      setUploadingId(null); // Reset to allow retry
    },
  });

  const handleFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ 
          title: "File too large", 
          description: "Please select an image under 5MB",
          variant: "destructive" 
        });
        return;
      }
      setUploadingId(id);
      uploadEvidenceMutation.mutate({ id, file });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Scrap Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (scrapRecords.length === 0) {
    return null; // Don't show section if no scrap records
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Scrap Inventory ({scrapRecords.length} records)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scrap #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Damage Reason</TableHead>
              <TableHead>Loss Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scrapRecords.slice(0, 20).map((scrap: any) => (
              <TableRow key={scrap.id}>
                <TableCell className="font-mono text-sm">{scrap.scrapNumber}</TableCell>
                <TableCell>{scrap.scrapDate ? format(new Date(scrap.scrapDate), 'dd/MM/yyyy') : '-'}</TableCell>
                <TableCell>{scrap.productName}</TableCell>
                <TableCell>{scrap.quantity}</TableCell>
                <TableCell className="capitalize">{scrap.damageReason?.replace('_', ' ') || '-'}</TableCell>
                <TableCell className="text-red-600 font-medium">
                  ₹{((scrap.lossAmount || 0) / 100).toFixed(2)}
                </TableCell>
                <TableCell>{getStatusBadge(scrap.approvalStatus)}</TableCell>
                <TableCell>
                  {scrap.damageEvidenceUrl ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewUrl(scrap.damageEvidenceUrl)}
                        data-testid={`button-view-evidence-${scrap.id}`}
                      >
                        <Image className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => handleFileChange(scrap.id, e)}
                        disabled={uploadingId === scrap.id}
                        data-testid={`input-upload-evidence-${scrap.id}`}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={uploadingId === scrap.id}
                        data-testid={`button-upload-evidence-${scrap.id}`}
                      >
                        {uploadingId === scrap.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-1" />
                            Upload
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <PrintableScrapInventory scrap={scrap} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Damage Evidence</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="flex justify-center">
              <img 
                src={previewUrl} 
                alt="Damage evidence" 
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
