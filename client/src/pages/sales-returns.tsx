import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/use-permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Package, CheckCircle, AlertCircle, Trash2, Search, Loader2, Camera, Image, Upload, X, Printer, ArrowLeft } from "lucide-react";
import PrintableSalesReturn from "@/components/PrintableSalesReturn";
import PrintableScrapInventory from "@/components/PrintableScrapInventory";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const createReturnSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  returnDate: z.string().min(1, "Return date is required"),
  returnType: z.enum(["full", "partial"], { required_error: "Return type is required" }),
  returnReason: z.string().min(1, "Return reason is required"),
  customerRemarks: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    productName: z.string().min(1),
    batchNumber: z.string().optional(),
    availableBatches: z.array(z.string()).optional(),
    casesReturned: z.coerce.number().min(0, "Cases cannot be negative"),
    looseBottlesReturned: z.coerce.number().min(0, "Bottles cannot be negative").default(0),
    quantityReturned: z.coerce.number().min(0), // Auto-calculated total bottles
    bottlesPerCase: z.coerce.number().optional(), // From product master
    maxQuantityCases: z.coerce.number().optional(), // Invoice qty in cases
    maxQuantityBottles: z.coerce.number().optional(), // Max total bottles (cases × bottlesPerCase)
    unitPrice: z.coerce.number().optional(), // Unit price per case from invoice
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
  product?: { name: string; derivedValuePerBase?: number; baseUnit?: string; derivedUnit?: string };
}

const inspectSchema = z.object({
  inspections: z.array(z.object({
    itemId: z.string(),
    productId: z.string().optional(),
    condition: z.enum(['good', 'damaged', 'mixed']),
    disposition: z.enum(['restock', 'scrap', 'repack', 'mixed']),
    quantity: z.number().optional(), // For split dispositions
    damageReason: z.string().optional(),
  })),
});

export default function SalesReturnsPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission('sales_returns', 'create');
  const canDelete = hasPermission('sales_returns', 'delete');
  
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
    inv.status === 'delivered' || inv.status === 'pod_confirmed'
  );

  // Filter invoices based on search and sort by invoice date descending (newest first)
  const filteredInvoices = deliveredInvoices
    .filter((inv: any) => {
      const searchLower = invoiceSearch.toLowerCase();
      return (
        inv.invoiceNumber?.toLowerCase().includes(searchLower) ||
        inv.buyerName?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a: any, b: any) => {
      const dateA = new Date(a.invoiceDate || a.createdAt || 0).getTime();
      const dateB = new Date(b.invoiceDate || b.createdAt || 0).getTime();
      return dateB - dateA; // Descending order (newest first)
    });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  const form = useForm<CreateReturnForm>({
    resolver: zodResolver(createReturnSchema),
    defaultValues: {
      invoiceId: "",
      returnDate: format(new Date(), "yyyy-MM-dd"),
      returnType: "partial",
      returnReason: "",
      customerRemarks: "",
      items: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Load invoice items when invoice is selected (with batch numbers from gatepass)
  const loadInvoiceItems = async (invoiceId: string) => {
    setLoadingInvoiceItems(true);
    try {
      // Use the new endpoint that includes batch numbers from gatepass
      const response = await fetch(`/api/invoice-items-with-batch/${invoiceId}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch invoice items');
      const items: (InvoiceItem & { batchNumber?: string | null; availableBatches?: string[] })[] = await response.json();
      
      // Convert invoice items to return items with max quantity validation
      // Auto-fill batch number if exactly one available from gatepass
      // Store availableBatches for items with multiple batches (for dropdown)
      const returnItems = items.map((item) => {
        const bottlesPerCase = item.product?.derivedValuePerBase || 1;
        const maxTotalBottles = item.quantity * bottlesPerCase;
        return {
          productId: item.productId,
          productName: item.product?.name || item.description || 'Unknown Product',
          batchNumber: item.batchNumber || '',
          availableBatches: item.availableBatches || [],
          casesReturned: 0,
          looseBottlesReturned: 0,
          quantityReturned: 0, // Will be auto-calculated: cases × bottlesPerCase + loose
          bottlesPerCase,
          maxQuantityCases: item.quantity,
          maxQuantityBottles: maxTotalBottles,
          unitPrice: item.unitPrice,
          returnReason: '',
        };
      });
      
      replace(returnItems);
      const batchCount = items.filter(i => i.batchNumber).length;
      const multipleBatchCount = items.filter(i => i.availableBatches && i.availableBatches.length > 1).length;
      
      let description = '';
      if (batchCount > 0) description += `${batchCount} item(s) have batch numbers auto-filled. `;
      if (multipleBatchCount > 0) description += `${multipleBatchCount} item(s) have multiple batches - please select manually.`;
      
      toast({ 
        title: `Loaded ${items.length} items from invoice`,
        description: description || undefined
      });
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
    mutationFn: async ({ id, inspections, verifiedQuantities }: { id: string; inspections: any[]; verifiedQuantities?: Record<string, { verified: number; varianceReason?: string }> }) => {
      return apiRequest('PATCH', `/api/sales-returns/${id}/inspect`, { inspections, verifiedQuantities });
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/sales-returns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-returns'] });
      toast({ title: "Sales return deleted successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete return", description: error.message, variant: "destructive" });
    },
  });

  const handleDelete = async (returnRecord: any) => {
    if (window.confirm(`Are you sure you want to delete return ${returnRecord.returnNumber}?`)) {
      deleteMutation.mutate(returnRecord.id);
    }
  };

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
    // Validate: total bottles must not exceed max, and at least 1 bottle returned per item
    for (const item of data.items) {
      const bpc = item.bottlesPerCase || 1;
      const totalBottles = ((item.casesReturned || 0) * bpc) + (item.looseBottlesReturned || 0);
      const maxBottles = item.maxQuantityBottles || ((item.maxQuantityCases || 0) * bpc);
      
      if (totalBottles <= 0) {
        toast({ title: "Invalid quantity", description: `${item.productName}: Must return at least 1 bottle`, variant: "destructive" });
        return;
      }
      if (totalBottles > maxBottles) {
        toast({ title: "Quantity exceeds invoice", description: `${item.productName}: Returning ${totalBottles} bottles but invoice has only ${maxBottles}`, variant: "destructive" });
        return;
      }
      if ((item.looseBottlesReturned || 0) >= bpc) {
        toast({ title: "Invalid loose bottles", description: `${item.productName}: Loose bottles (${item.looseBottlesReturned}) should be less than ${bpc} (bottles per case)`, variant: "destructive" });
        return;
      }
      // Update quantityReturned to total bottles for backend
      item.quantityReturned = totalBottles;
    }
    createMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: "secondary", icon: AlertCircle, label: "Pending" },
      pending_receipt: { variant: "secondary", icon: AlertCircle, label: "Pending Receipt" },
      received: { variant: "default", icon: Package, label: "Received" },
      inspected: { variant: "default", icon: CheckCircle, label: "Inspected" },
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1" data-testid={`badge-status-${status}`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (window.history.length > 2) {
              window.history.back();
            } else {
              navigate('/?tab=invoices');
            }
          }}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Sales Returns & Damage Handling</h1>
          <p className="text-muted-foreground">Manage post-delivery returns and damaged goods</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1"></div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          {canCreate && (
            <DialogTrigger asChild>
              <Button data-testid="button-create-return">
                <Plus className="mr-2 h-4 w-4" />
                Create Return
              </Button>
            </DialogTrigger>
          )}
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
                  name="returnType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Return Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-return-type">
                            <SelectValue placeholder="Select return type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="partial">Partial Return</SelectItem>
                          <SelectItem value="full">Full Return</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                    const maxCases = form.watch(`items.${index}.maxQuantityCases`) || 0;
                    const bpc = form.watch(`items.${index}.bottlesPerCase`) || 1;
                    const hasCaseConversion = bpc > 1; // Product has case/bottle conversion
                    const maxBottles = form.watch(`items.${index}.maxQuantityBottles`) || (maxCases * bpc);
                    const cases = form.watch(`items.${index}.casesReturned`) || 0;
                    const loose = form.watch(`items.${index}.looseBottlesReturned`) || 0;
                    const totalBottles = (cases * bpc) + loose;
                    const unitPrice = form.watch(`items.${index}.unitPrice`) || 0;
                    const isOverMax = totalBottles > maxBottles;
                    const isLooseOverCase = hasCaseConversion && loose >= bpc;
                    const creditAmount = Math.floor(totalBottles * (unitPrice / bpc));
                    
                    return (
                    <Card key={field.id} className={isOverMax ? "border-destructive" : ""}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <div>
                                <span className="font-medium">{form.watch(`items.${index}.productName`)}</span>
                                <span className="text-sm text-muted-foreground ml-2">
                                  {hasCaseConversion 
                                    ? `(Invoiced: ${maxCases} cases × ${bpc} = ${maxBottles} bottles @ ${(unitPrice / 100).toFixed(2)}/case)`
                                    : `(Invoiced: ${maxCases} units @ ${(unitPrice / 100).toFixed(2)}/unit)`}
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
                            
                            {hasCaseConversion ? (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              <FormField
                                control={form.control}
                                name={`items.${index}.casesReturned`}
                                render={({ field: caseField }) => (
                                  <FormItem>
                                    <FormLabel>Full Cases</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min={0}
                                        max={maxCases}
                                        {...caseField} 
                                        onChange={(e) => {
                                          caseField.onChange(e);
                                          const newCases = Number(e.target.value) || 0;
                                          form.setValue(`items.${index}.quantityReturned`, (newCases * bpc) + loose);
                                        }}
                                        data-testid={`input-cases-${index}`} 
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`items.${index}.looseBottlesReturned`}
                                render={({ field: looseField }) => (
                                  <FormItem>
                                    <FormLabel>Loose Bottles</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min={0}
                                        max={bpc - 1}
                                        {...looseField} 
                                        onChange={(e) => {
                                          looseField.onChange(e);
                                          const newLoose = Number(e.target.value) || 0;
                                          form.setValue(`items.${index}.quantityReturned`, (cases * bpc) + newLoose);
                                        }}
                                        className={isLooseOverCase ? "border-destructive" : ""}
                                        data-testid={`input-loose-bottles-${index}`} 
                                      />
                                    </FormControl>
                                    {isLooseOverCase && (
                                      <p className="text-xs text-destructive">
                                        Max {bpc - 1} loose (use full cases instead)
                                      </p>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div>
                                <Label className="text-sm font-medium">Total Bottles</Label>
                                <div className={`mt-2 text-lg font-semibold ${isOverMax ? 'text-destructive' : ''}`} data-testid={`text-total-bottles-${index}`}>
                                  {totalBottles}
                                </div>
                                {isOverMax && (
                                  <p className="text-xs text-destructive">
                                    Exceeds max {maxBottles}
                                  </p>
                                )}
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Credit Amount</Label>
                                <div className="mt-2 text-sm text-muted-foreground" data-testid={`text-credit-amount-${index}`}>
                                  {(creditAmount / 100).toFixed(2)}
                                </div>
                              </div>
                            </div>
                            ) : (
                            <div className="grid grid-cols-3 gap-4">
                              <FormField
                                control={form.control}
                                name={`items.${index}.casesReturned`}
                                render={({ field: caseField }) => (
                                  <FormItem>
                                    <FormLabel>Qty to Return</FormLabel>
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        min={0}
                                        max={maxCases}
                                        {...caseField} 
                                        onChange={(e) => {
                                          caseField.onChange(e);
                                          const newCases = Number(e.target.value) || 0;
                                          form.setValue(`items.${index}.quantityReturned`, newCases);
                                        }}
                                        className={isOverMax ? "border-destructive" : ""}
                                        data-testid={`input-cases-${index}`} 
                                      />
                                    </FormControl>
                                    {isOverMax && (
                                      <p className="text-xs text-destructive">
                                        Cannot exceed {maxCases}
                                      </p>
                                    )}
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div>
                                <Label className="text-sm font-medium">Credit Amount</Label>
                                <div className="mt-2 text-sm text-muted-foreground" data-testid={`text-credit-amount-${index}`}>
                                  {(creditAmount / 100).toFixed(2)}
                                </div>
                              </div>
                            </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name={`items.${index}.batchNumber`}
                                render={({ field }) => {
                                  const availableBatches = form.watch(`items.${index}.availableBatches`) || [];
                                  const hasMultipleBatches = availableBatches.length > 1;
                                  
                                  return (
                                    <FormItem>
                                      <FormLabel>
                                        Batch (Optional)
                                        {hasMultipleBatches && (
                                          <span className="ml-1 text-xs text-muted-foreground">
                                            ({availableBatches.length} available)
                                          </span>
                                        )}
                                      </FormLabel>
                                      <FormControl>
                                        {hasMultipleBatches ? (
                                          <Select
                                            value={field.value || ""}
                                            onValueChange={field.onChange}
                                          >
                                            <SelectTrigger data-testid={`select-batch-${index}`}>
                                              <SelectValue placeholder="Select batch..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {availableBatches.map((batch: string) => (
                                                <SelectItem key={batch} value={batch}>
                                                  {batch}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        ) : (
                                          <Input {...field} placeholder="e.g., LOT-2024" data-testid={`input-batch-${index}`} />
                                        )}
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  );
                                }}
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
                        {(returnRecord.status === 'pending' || returnRecord.status === 'pending_receipt') && (
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
                        {(returnRecord.status === 'pending' || returnRecord.status === 'pending_receipt') && canDelete && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(returnRecord)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${returnRecord.id}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* Repacking Queue Section */}
      <RepackingQueueSection />

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
              onSubmit={(inspections, verifiedQuantities) => {
                inspectMutation.mutate({ id: selectedReturn.id, inspections, verifiedQuantities });
              }}
              isPending={inspectMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InspectionForm({ returnRecord, onSubmit, isPending }: { returnRecord: any; onSubmit: (inspections: any[], verifiedQuantities?: Record<string, { verified: number; varianceReason?: string }>) => void; isPending: boolean }) {
  const { toast } = useToast();
  
  const [inspections, setInspections] = useState(
    returnRecord.items.map((item: any) => {
      const bpc = item.bottlesPerCase || 1;
      const qty = item.quantityReturned;
      const fullCaseBottles = Math.floor(qty / bpc) * bpc;
      const looseBottles = qty % bpc;
      return {
        itemId: item.id,
        productId: item.productId,
        bottlesPerCase: bpc,
        reportedQuantity: qty,
        verifiedQuantity: qty,
        varianceReason: '',
        restockQty: fullCaseBottles,   // Only full cases can be restocked
        scrapQty: 0,
        repackQty: looseBottles,       // Loose bottles default to repack
        condition: looseBottles > 0 ? 'damaged' as const : 'good' as const,
        damageReason: '',
      };
    })
  );

  const updateVerifiedQuantity = (index: number, value: number) => {
    const updated = [...inspections];
    const item = updated[index];
    const bpc = item.bottlesPerCase || 1;
    item.verifiedQuantity = Math.max(0, value);
    // Auto-split: full cases → restock, loose bottles → repack
    const fullCaseBottles = Math.floor(item.verifiedQuantity / bpc) * bpc;
    const looseBottles = item.verifiedQuantity % bpc;
    item.restockQty = fullCaseBottles;
    item.scrapQty = 0;
    item.repackQty = looseBottles;
    item.condition = looseBottles > 0 ? 'damaged' : 'good';
    setInspections(updated);
  };

  const updateVarianceReason = (index: number, value: string) => {
    const updated = [...inspections];
    updated[index].varianceReason = value;
    setInspections(updated);
  };

  const updateQuantity = (index: number, field: 'restockQty' | 'scrapQty' | 'repackQty', value: number) => {
    const updated = [...inspections];
    const item = updated[index];
    const total = item.verifiedQuantity;
    const bpc = item.bottlesPerCase || 1;
    
    let actualValue = Math.max(0, Math.min(value, total));
    // Restock only accepts full cases — snap down to nearest case multiple
    if (field === 'restockQty') {
      actualValue = Math.floor(actualValue / bpc) * bpc;
    }
    item[field] = actualValue;
    
    const otherFields = (['restockQty', 'scrapQty', 'repackQty'] as const).filter(f => f !== field);
    const remaining = total - item[field];
    
    const otherSum = otherFields.reduce((sum, f) => sum + item[f], 0);
    if (otherSum > remaining) {
      let excess = otherSum - remaining;
      for (const f of otherFields) {
        if (item[f] > 0 && excess > 0) {
          const reduction = Math.min(item[f], excess);
          item[f] -= reduction;
          excess -= reduction;
        }
      }
    }
    
    if (item.scrapQty > 0 && item.restockQty > 0) {
      item.condition = 'mixed';
    } else if (item.scrapQty > 0 || item.repackQty > 0) {
      item.condition = 'damaged';
    } else {
      item.condition = 'good';
    }
    
    setInspections(updated);
  };

  const getRowValidation = (item: any) => {
    if (item.verifiedQuantity <= 0) {
      return { valid: false, message: 'Verified qty must be > 0' };
    }
    const bpc = item.bottlesPerCase || 1;
    if (item.restockQty > 0 && item.restockQty % bpc !== 0) {
      return { valid: false, message: `Restock must be full cases only (multiples of ${bpc} bottles)` };
    }
    const total = item.restockQty + item.scrapQty + item.repackQty;
    const expected = item.verifiedQuantity;
    if (total !== expected) {
      return { valid: false, message: `Split total (${total}) must equal verified qty (${expected})` };
    }
    if (item.verifiedQuantity !== item.reportedQuantity && !item.varianceReason.trim()) {
      return { valid: false, message: 'Variance reason required' };
    }
    return { valid: true, message: '' };
  };

  const handleSubmit = () => {
    for (let i = 0; i < inspections.length; i++) {
      const validation = getRowValidation(inspections[i]);
      if (!validation.valid) {
        toast({
          title: "Validation Error",
          description: `Row ${i + 1}: ${validation.message}`,
          variant: "destructive"
        });
        return;
      }
    }
    
    const flatInspections: any[] = [];
    const verifiedQuantities: Record<string, { verified: number; varianceReason?: string }> = {};
    
    for (const item of inspections) {
      if (item.verifiedQuantity !== item.reportedQuantity) {
        verifiedQuantities[item.itemId] = {
          verified: item.verifiedQuantity,
          varianceReason: item.varianceReason || undefined,
        };
      } else {
        verifiedQuantities[item.itemId] = {
          verified: item.verifiedQuantity,
        };
      }
      
      if (item.restockQty > 0) {
        flatInspections.push({
          itemId: item.itemId,
          productId: item.productId,
          condition: 'good',
          disposition: 'restock',
          quantity: item.restockQty,
        });
      }
      if (item.scrapQty > 0) {
        flatInspections.push({
          itemId: item.itemId,
          productId: item.productId,
          condition: 'damaged',
          disposition: 'scrap',
          quantity: item.scrapQty,
          damageReason: item.damageReason || 'other',
        });
      }
      if (item.repackQty > 0) {
        flatInspections.push({
          itemId: item.itemId,
          productId: item.productId,
          condition: 'good',
          disposition: 'repack',
          quantity: item.repackQty,
        });
      }
    }
    
    onSubmit(flatInspections, verifiedQuantities);
  };

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 p-3 rounded-lg text-sm space-y-1">
        <p className="font-medium">Verify & Split Disposition</p>
        <p className="text-muted-foreground">First verify the actual quantity received, then split across categories.</p>
        <ul className="text-muted-foreground space-y-0.5 mt-1">
          <li><span className="text-green-700 font-medium">Restock</span> — Full cases only. Added back to inventory immediately.</li>
          <li><span className="text-amber-700 font-medium">Repack</span> — Loose bottles or items needing relabeling. Held physically; <strong>not</strong> added to inventory until physically repacked into full cases.</li>
          <li><span className="text-red-700 font-medium">Scrap</span> — Damaged or unsalvageable. Written off as loss.</li>
        </ul>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-center">Reported</TableHead>
              <TableHead className="text-center bg-blue-50 dark:bg-blue-950/30">
                <div className="flex flex-col items-center">
                  <CheckCircle className="h-4 w-4 text-blue-600 mb-1" />
                  <span>Verified</span>
                </div>
              </TableHead>
              <TableHead className="text-center bg-green-50 dark:bg-green-950/30">
                <div className="flex flex-col items-center">
                  <Package className="h-4 w-4 text-green-600 mb-1" />
                  <span>Restock</span>
                  <span className="text-xs text-muted-foreground font-normal">(full cases only)</span>
                </div>
              </TableHead>
              <TableHead className="text-center bg-red-50 dark:bg-red-950/30">
                <div className="flex flex-col items-center">
                  <Trash2 className="h-4 w-4 text-red-600 mb-1" />
                  <span>Scrap</span>
                </div>
              </TableHead>
              <TableHead className="text-center bg-amber-50 dark:bg-amber-950/30">
                <div className="flex flex-col items-center">
                  <Package className="h-4 w-4 text-amber-600 mb-1" />
                  <span>Repack</span>
                  <span className="text-xs text-muted-foreground font-normal">(hold, not inventory)</span>
                </div>
              </TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returnRecord.items.map((item: any, index: number) => {
              const inspection = inspections[index];
              const validation = getRowValidation(inspection);
              const hasVariance = inspection.verifiedQuantity !== inspection.reportedQuantity;
              
              return (
                <>
                  <TableRow key={item.id} className={!validation.valid ? "bg-red-50 dark:bg-red-950/20" : ""}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell className="text-muted-foreground">{item.batchNumber || '-'}</TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {item.casesReturned > 0 && item.looseBottlesReturned > 0 
                        ? `${item.casesReturned}C + ${item.looseBottlesReturned}B (${item.quantityReturned})`
                        : item.casesReturned > 0 
                          ? `${item.casesReturned}C (${item.quantityReturned})`
                          : `${item.quantityReturned}`}
                    </TableCell>
                    <TableCell className="bg-blue-50/50 dark:bg-blue-950/20">
                      <Input
                        type="number"
                        min={0}
                        value={inspection.verifiedQuantity}
                        onChange={(e) => updateVerifiedQuantity(index, parseInt(e.target.value) || 0)}
                        className={`w-20 text-center mx-auto ${hasVariance ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : ''}`}
                        data-testid={`input-verified-qty-${index}`}
                      />
                    </TableCell>
                    <TableCell className="bg-green-50/50 dark:bg-green-950/20">
                      <div className="flex flex-col items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={Math.floor(inspection.verifiedQuantity / (inspection.bottlesPerCase || 1)) * (inspection.bottlesPerCase || 1)}
                          step={inspection.bottlesPerCase || 1}
                          value={inspection.restockQty}
                          onChange={(e) => updateQuantity(index, 'restockQty', parseInt(e.target.value) || 0)}
                          className="w-20 text-center mx-auto"
                          data-testid={`input-restock-qty-${index}`}
                        />
                        <span className="text-xs text-muted-foreground">{Math.round(inspection.restockQty / (inspection.bottlesPerCase || 1))} cases</span>
                      </div>
                    </TableCell>
                    <TableCell className="bg-red-50/50 dark:bg-red-950/20">
                      <div className="flex flex-col items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={inspection.verifiedQuantity}
                          value={inspection.scrapQty}
                          onChange={(e) => updateQuantity(index, 'scrapQty', parseInt(e.target.value) || 0)}
                          className="w-20 text-center mx-auto"
                          data-testid={`input-scrap-qty-${index}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {inspection.scrapQty % (inspection.bottlesPerCase || 1) === 0
                            ? `${Math.floor(inspection.scrapQty / (inspection.bottlesPerCase || 1))} cases`
                            : `${Math.floor(inspection.scrapQty / (inspection.bottlesPerCase || 1))}C + ${inspection.scrapQty % (inspection.bottlesPerCase || 1)}B`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="bg-amber-50/50 dark:bg-amber-950/20">
                      <div className="flex flex-col items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={inspection.verifiedQuantity}
                          value={inspection.repackQty}
                          onChange={(e) => updateQuantity(index, 'repackQty', parseInt(e.target.value) || 0)}
                          className="w-20 text-center mx-auto"
                          data-testid={`input-repack-qty-${index}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          {inspection.repackQty % (inspection.bottlesPerCase || 1) === 0
                            ? `${Math.floor(inspection.repackQty / (inspection.bottlesPerCase || 1))} cases`
                            : `${Math.floor(inspection.repackQty / (inspection.bottlesPerCase || 1))}C + ${inspection.repackQty % (inspection.bottlesPerCase || 1)}B`}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {validation.valid ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Valid
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          {validation.message}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                  {hasVariance && (
                    <TableRow key={`${item.id}-variance`} className="bg-amber-50/30 dark:bg-amber-950/10">
                      <TableCell colSpan={8}>
                        <div className="flex items-center gap-3 py-1">
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 shrink-0">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Variance: {inspection.verifiedQuantity - inspection.reportedQuantity > 0 ? '+' : ''}{inspection.verifiedQuantity - inspection.reportedQuantity}
                          </Badge>
                          <Input
                            placeholder="Reason for difference (e.g., 'Loose bottles - only 8 instead of 12 per case')"
                            value={inspection.varianceReason}
                            onChange={(e) => updateVarianceReason(index, e.target.value)}
                            className="flex-1"
                            data-testid={`input-variance-reason-${index}`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-between gap-4 pt-4 border-t flex-wrap">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Legend:</span>{' '}
          <span className="text-blue-600">Verified</span> = Actual count |{' '}
          <span className="text-green-600">Restock</span> = Full cases back to inventory |{' '}
          <span className="text-red-600">Scrap</span> = Damaged, written off |{' '}
          <span className="text-amber-600">Repack</span> = Loose bottles held physically — not added to inventory until repacked into full cases
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSubmit} disabled={isPending} data-testid="button-submit-inspection">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Complete Inspection"
            )}
          </Button>
        </div>
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

  const approveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      return apiRequest('PATCH', `/api/scrap-inventory/${id}/approve`, { action });
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/scrap-inventory'] });
      toast({ title: action === 'approve' ? "Scrap record approved" : "Scrap record rejected" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update status", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

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
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Scrap Inventory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No scrap records yet. When you inspect a return and mark items as "Scrap/Damage", 
            they will appear here for approval and disposal tracking.
          </p>
        </CardContent>
      </Card>
    );
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
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => handleFileChange(scrap.id, e)}
                        disabled={uploadingId === scrap.id}
                        data-testid={`input-upload-evidence-${scrap.id}`}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={uploadingId === scrap.id}
                        asChild
                        data-testid={`button-upload-evidence-${scrap.id}`}
                      >
                        <span>
                          {uploadingId === scrap.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-1" />
                              Upload
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {scrap.approvalStatus === 'pending' && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => approveMutation.mutate({ id: scrap.id, action: 'approve' })}
                        disabled={approveMutation.isPending}
                        data-testid={`button-approve-scrap-${scrap.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    )}
                    <PrintableScrapInventory scrap={scrap} />
                  </div>
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

// Repacking Queue Section
function RepackingQueueSection() {
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [repackingDate, setRepackingDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [repackRemarks, setRepackRemarks] = useState('');

  const { data: repackItems = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/repacking-queue'],
  });

  const completeMutation = useMutation({
    mutationFn: async ({ id, repackingDate, remarks }: { id: string; repackingDate?: string; remarks?: string }) => {
      return apiRequest('PATCH', `/api/repacking-queue/${id}/complete`, { repackingDate, remarks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/repacking-queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finished-goods'] });
      toast({ title: "Item marked as repacked and moved to inventory" });
      setSelectedItem(null);
      setRepackingDate(format(new Date(), 'yyyy-MM-dd'));
      setRepackRemarks('');
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to complete repacking", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Repacking Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Repacking Queue
          {repackItems.length > 0 && (
            <Badge variant="secondary">{repackItems.length} pending</Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Items waiting to be physically repacked. Only full cases are queued — loose bottles that cannot form a full case are not tracked here.
        </p>
      </CardHeader>
      <CardContent>
        {repackItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No items pending repacking.</p>
            <p className="text-sm">When items from sales returns are marked for repacking, they will appear here.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Batch Number</TableHead>
                <TableHead className="text-right">Cases to Add</TableHead>
                <TableHead>Added On</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {repackItems.map((item: any) => (
                <TableRow key={item.id} data-testid={`row-repack-${item.id}`}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.productName || 'Unknown Product'}</div>
                      {item.productCode && (
                        <div className="text-sm text-muted-foreground">{item.productCode}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.batchNumber}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      <span className="font-medium">{item.casesToAdd}</span>
                      <span className="text-xs text-muted-foreground ml-1">cases</span>
                    </div>
                    {item.looseBottlesExcluded > 0 && (
                      <div className="text-xs text-muted-foreground">
                        +{item.looseBottlesExcluded} loose (excluded)
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.createdAt ? format(new Date(item.createdAt), 'dd MMM yyyy') : '-'}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <span className="text-sm text-muted-foreground">{item.remarks || '-'}</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedItem(item);
                        setRepackingDate(format(new Date(), 'yyyy-MM-dd'));
                        setRepackRemarks('');
                      }}
                      disabled={completeMutation.isPending}
                      data-testid={`button-complete-repack-${item.id}`}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Repacked
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Repacking Completion Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Repacking</DialogTitle>
              <DialogDescription>
                Confirm physical repacking is done for <strong>{selectedItem?.productName}</strong> (Batch: {selectedItem?.batchNumber}).
                This will add <strong>{selectedItem?.casesToAdd} case(s)</strong> to finished goods inventory as approved stock.
                {selectedItem?.looseBottlesExcluded > 0 && (
                  <span> {selectedItem.looseBottlesExcluded} loose bottle(s) cannot form a full case and will not be added.</span>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="repackingDate">Repacking Date</Label>
                <Input
                  id="repackingDate"
                  type="date"
                  value={repackingDate}
                  onChange={(e) => setRepackingDate(e.target.value)}
                  data-testid="input-repacking-date"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="repackRemarks">Remarks (Optional)</Label>
                <Input
                  id="repackRemarks"
                  placeholder="Any notes about the repacking..."
                  value={repackRemarks}
                  onChange={(e) => setRepackRemarks(e.target.value)}
                  data-testid="input-repack-remarks"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedItem(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedItem) {
                    completeMutation.mutate({
                      id: selectedItem.id,
                      repackingDate,
                      remarks: repackRemarks || undefined,
                    });
                  }
                }}
                disabled={completeMutation.isPending}
                data-testid="button-confirm-repacking"
              >
                {completeMutation.isPending ? 'Saving...' : 'Confirm Repacking'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
