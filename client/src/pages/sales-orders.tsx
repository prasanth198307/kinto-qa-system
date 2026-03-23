import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Plus, 
  Search, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  MoreVertical,
  Calendar as CalendarIcon,
  Filter,
  Package,
  FilePlus
} from "lucide-react";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTablePagination } from "@/components/DataTablePagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";
import type { Product, Vendor } from "@shared/schema";

// Sales Order Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case 'draft':
      return <Badge variant="secondary">Draft</Badge>;
    case 'confirmed':
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:bg-blue-100/80">Confirmed</Badge>;
    case 'invoiced':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-100/80">Invoiced</Badge>;
    case 'partially_invoiced':
      return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 hover:bg-amber-100/80">Partially Invoiced</Badge>;
    case 'cancelled':
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const salesOrderItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  description: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Price must be positive"),
  cgstRate: z.number().min(0).max(100).default(9),
  sgstRate: z.number().min(0).max(100).default(9),
  igstRate: z.number().min(0).max(100).default(0),
});

const salesOrderSchema = z.object({
  buyerName: z.string().min(1, "Buyer name is required"),
  soDate: z.string().min(1, "Date is required"),
  deliveryDate: z.string().optional(),
  vendorId: z.string().optional(),
  buyerGstin: z.string().optional(),
  buyerAddress: z.string().optional(),
  buyerContact: z.string().optional(),
  shipToName: z.string().optional(),
  shipToAddress: z.string().optional(),
  shipToCity: z.string().optional(),
  shipToState: z.string().optional(),
  shipToPin: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(salesOrderItemSchema).min(1, "At least one item is required"),
});

type SalesOrderFormValues = z.infer<typeof salesOrderSchema>;

export default function SalesOrdersPage({ showHeader = true }: { showHeader?: boolean }) {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [isNewSoDialogOpen, setIsNewSoDialogOpen] = useState(false);

  const { data: soResponse, isLoading } = useQuery<{ data: any[], total: number }>({
    queryKey: ['/api/sales-orders', { search, status: statusFilter === 'all' ? undefined : statusFilter, page, pageSize }],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['/api/vendors'],
  });

  const createSoMutation = useMutation({
    mutationFn: async (values: SalesOrderFormValues) => {
      // Map form values to API expected format
      // Pre-compute item amounts so header totalAmount can be derived
      const computedItems = values.items.map(item => {
        const unitPricePaise = Math.round(item.unitPrice * 100);
        const taxableAmountPaise = unitPricePaise * item.quantity;
        const taxRate = (Number(item.cgstRate) || 0) + (Number(item.sgstRate) || 0) + (Number(item.igstRate) || 0);
        const totalAmountPaise = Math.round(taxableAmountPaise * (1 + taxRate / 100));
        return { item, unitPricePaise, taxableAmountPaise, totalAmountPaise };
      });
      const soTotalPaise = computedItems.reduce((sum, c) => sum + c.totalAmountPaise, 0);

      const payload = {
        header: {
          buyerName: values.buyerName,
          soDate: values.soDate,
          deliveryDate: values.deliveryDate || null,
          vendorId: values.vendorId || null,
          buyerGstin: values.buyerGstin || null,
          buyerAddress: values.buyerAddress || null,
          buyerContact: values.buyerContact || null,
          shipToName: values.shipToName || null,
          shipToAddress: values.shipToAddress || null,
          shipToCity: values.shipToCity || null,
          shipToState: values.shipToState || null,
          shipToPin: values.shipToPin || null,
          remarks: values.remarks || null,
          totalAmount: soTotalPaise,
        },
        items: computedItems.map(({ item, unitPricePaise, taxableAmountPaise, totalAmountPaise }) => ({
          productId: item.productId,
          description: item.description,
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          cgstRate: item.cgstRate,
          sgstRate: item.sgstRate,
          igstRate: item.igstRate,
          unitPrice: unitPricePaise,
          taxableAmount: taxableAmountPaise,
          totalAmount: totalAmountPaise,
        }))
      };
      const res = await apiRequest('POST', '/api/sales-orders', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-orders'] });
      setIsNewSoDialogOpen(false);
      toast({
        title: "Sales Order Created",
        description: "The sales order has been successfully created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create sales order",
        variant: "destructive",
      });
    }
  });

  const confirmSoMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('POST', `/api/sales-orders/${id}/confirm`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-orders'] });
      toast({
        title: "Sales Order Confirmed",
        description: "The sales order is now confirmed and ready for invoicing.",
      });
    },
  });

  const form = useForm<SalesOrderFormValues>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      buyerName: "",
      vendorId: "",
      soDate: format(new Date(), 'yyyy-MM-dd'),
      items: [{
        productId: "",
        quantity: 1,
        unitPrice: 0,
        cgstRate: 9,
        sgstRate: 9,
        igstRate: 0,
      }],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const onSubmit = (values: SalesOrderFormValues) => {
    createSoMutation.mutate(values);
  };

  const formatCurrency = (amountPaise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amountPaise / 100);
  };

  const pageContent = (
    <div className={showHeader ? "container mx-auto p-6 mt-16" : "p-4"}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          {showHeader && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="print:hidden"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales Orders</h1>
            <p className="text-muted-foreground mt-1">
              Manage pre-invoice purchase requests from customers.
            </p>
          </div>
        </div>
          <Dialog open={isNewSoDialogOpen} onOpenChange={setIsNewSoDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-sales-order">
                <Plus className="w-4 h-4 mr-2" />
                New Sales Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Sales Order</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="buyerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Buyer Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter buyer / customer name" {...field} data-testid="input-buyer-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="vendorId"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Link to Vendor (Optional — auto-fills details)</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    "w-full justify-between",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="select-vendor"
                                >
                                  {field.value
                                    ? vendors.find((v) => v.id === field.value)?.vendorName
                                    : "Select vendor (optional)..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                              <Command>
                                <CommandInput placeholder="Search vendor..." />
                                <CommandList>
                                  <CommandEmpty>No vendor found.</CommandEmpty>
                                  <CommandGroup>
                                    {vendors.map((vendor) => (
                                      <CommandItem
                                        value={vendor.vendorName}
                                        key={vendor.id}
                                        onSelect={() => {
                                          form.setValue("vendorId", vendor.id);
                                          if (vendor.vendorName) form.setValue("buyerName", vendor.vendorName);
                                          if (vendor.gstNumber) form.setValue("buyerGstin", vendor.gstNumber);
                                          if (vendor.address) form.setValue("buyerAddress", vendor.address);
                                          if ((vendor as any).vendorPhone) form.setValue("buyerContact", (vendor as any).vendorPhone);
                                          if (vendor.shipToName) form.setValue("shipToName", vendor.shipToName);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            vendor.id === field.value ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {vendor.vendorName}
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
                      name="soDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Order Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-so-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="deliveryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Delivery Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-delivery-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="buyerGstin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Buyer GSTIN</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter GSTIN" {...field} data-testid="input-buyer-gstin" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="buyerContact"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Buyer Contact</FormLabel>
                          <FormControl>
                            <Input placeholder="Phone / email" {...field} data-testid="input-buyer-contact" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="buyerAddress"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Buyer Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Full billing address" {...field} data-testid="input-buyer-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Ship-To section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Shipping Address <span className="normal-case font-normal">(leave blank if same as buyer)</span></h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="shipToName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ship-To Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Recipient name / company" {...field} data-testid="input-ship-to-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="shipToAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ship-To Address</FormLabel>
                            <FormControl>
                              <Input placeholder="Street address" {...field} data-testid="input-ship-to-address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="shipToCity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="City" {...field} data-testid="input-ship-to-city" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="shipToState"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input placeholder="State" {...field} data-testid="input-ship-to-state" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="shipToPin"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>PIN Code</FormLabel>
                            <FormControl>
                              <Input placeholder="6-digit PIN" {...field} data-testid="input-ship-to-pin" />
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
                              <Input placeholder="Internal notes / special instructions" {...field} data-testid="input-remarks" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Line Items</h3>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({
                          productId: "",
                          quantity: 1,
                          unitPrice: 0,
                          cgstRate: 9,
                          sgstRate: 9,
                          igstRate: 0,
                        })}
                        data-testid="button-add-item"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>

                    <div className="border rounded-md overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[180px]">Product</TableHead>
                            <TableHead className="w-20">Qty</TableHead>
                            <TableHead className="w-28">Price (₹)</TableHead>
                            <TableHead className="w-40">CGST% / SGST%</TableHead>
                            <TableHead className="w-28 text-right">Line Total</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((field, index) => {
                            const watchedItems = form.watch("items");
                            const row = watchedItems[index] || {};
                            const taxable = (row.unitPrice || 0) * (row.quantity || 0);
                            const taxRate = (Number(row.cgstRate) || 0) + (Number(row.sgstRate) || 0) + (Number(row.igstRate) || 0);
                            const lineTotal = taxable * (1 + taxRate / 100);
                            return (
                            <TableRow key={field.id}>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.productId`}
                                  render={({ field }) => (
                                    <Select 
                                      onValueChange={(val) => {
                                        field.onChange(val);
                                        const prod = products.find(p => p.id === val);
                                        if (prod) {
                                          form.setValue(`items.${index}.description`, prod.productName);
                                          form.setValue(`items.${index}.unitPrice`, Number(prod.basePrice || 0) / 100);
                                        }
                                      }} 
                                      value={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger data-testid={`select-product-${index}`}>
                                          <SelectValue placeholder="Select product" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {products.map(p => (
                                          <SelectItem key={p.id} value={p.id}>{p.productName}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.quantity`}
                                  render={({ field }) => (
                                    <FormControl>
                                      <Input 
                                        type="number"
                                        min={1}
                                        step={1}
                                        {...field} 
                                        onChange={e => field.onChange(Number(e.target.value))}
                                        className="w-16" 
                                        data-testid={`input-qty-${index}`}
                                      />
                                    </FormControl>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.unitPrice`}
                                  render={({ field }) => (
                                    <FormControl>
                                      <Input 
                                        type="number" 
                                        step="0.01"
                                        min={0}
                                        {...field} 
                                        onChange={e => field.onChange(Number(e.target.value))}
                                        className="w-24" 
                                        data-testid={`input-price-${index}`}
                                      />
                                    </FormControl>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1 items-center">
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.cgstRate`}
                                    render={({ field }) => (
                                      <FormControl>
                                        <Input 
                                          type="number"
                                          step="0.01"
                                          min={0}
                                          max={100}
                                          {...field} 
                                          onChange={e => field.onChange(Number(e.target.value))}
                                          className="w-16 text-xs" 
                                          title="CGST %"
                                          placeholder="CGST"
                                        />
                                      </FormControl>
                                    )}
                                  />
                                  <span className="text-xs text-muted-foreground">/</span>
                                  <FormField
                                    control={form.control}
                                    name={`items.${index}.sgstRate`}
                                    render={({ field }) => (
                                      <FormControl>
                                        <Input 
                                          type="number"
                                          step="0.01"
                                          min={0}
                                          max={100}
                                          {...field} 
                                          onChange={e => field.onChange(Number(e.target.value))}
                                          className="w-16 text-xs" 
                                          title="SGST %"
                                          placeholder="SGST"
                                        />
                                      </FormControl>
                                    )}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium tabular-nums">
                                ₹{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => remove(index)}
                                  disabled={fields.length === 1}
                                  className="text-destructive h-8 w-8"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ); })}
                        </TableBody>
                      </Table>
                    </div>
                    {/* Live Total */}
                    <div className="flex justify-end pt-1">
                      <div className="flex items-center gap-4 bg-muted/50 rounded-md px-4 py-2 text-sm">
                        <span className="text-muted-foreground">Estimated Grand Total (incl. GST):</span>
                        <span className="font-bold text-base">
                          ₹{form.watch("items").reduce((sum, item) => {
                            const taxable = (item.unitPrice || 0) * (item.quantity || 0);
                            const taxRate = (Number(item.cgstRate) || 0) + (Number(item.sgstRate) || 0) + (Number(item.igstRate) || 0);
                            return sum + taxable * (1 + taxRate / 100);
                          }, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={createSoMutation.isPending}
                      data-testid="button-save-so"
                    >
                      {createSoMutation.isPending ? "Creating..." : "Create Sales Order"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by SO number or buyer..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-so"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]" data-testid="select-status-filter">
                  <SelectValue placeholder="Status: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="partially_invoiced">Partially Invoiced</SelectItem>
                  <SelectItem value="invoiced">Invoiced</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SO Number</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : soResponse?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No sales orders found.
                    </TableCell>
                  </TableRow>
                ) : (
                  soResponse?.data?.map((so) => (
                    <TableRow key={so.id}>
                      <TableCell className="font-medium" data-testid={`text-so-number-${so.id}`}>{so.soNumber}</TableCell>
                      <TableCell>{format(new Date(so.soDate), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-sm">
                        {so.deliveryDate
                          ? <span className="text-foreground">{format(new Date(so.deliveryDate), 'dd MMM yyyy')}</span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" data-testid={`text-buyer-name-${so.id}`}>{so.buyerName}</TableCell>
                      <TableCell data-testid={`text-total-amount-${so.id}`}>
                        {formatCurrency(so.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={so.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/sales-orders/${so.id}`)}
                            data-testid={`button-view-${so.id}`}
                          >
                            View
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {so.status === 'draft' && (
                                <DropdownMenuItem 
                                  onClick={() => confirmSoMutation.mutate(so.id)}
                                  className="text-blue-600"
                                  data-testid={`button-confirm-${so.id}`}
                                >
                                  <CheckCircle2 className="w-4 h-4 mr-2" />
                                  Confirm Order
                                </DropdownMenuItem>
                              )}
                              {(so.status === 'confirmed' || so.status === 'partially_invoiced') && (
                                <DropdownMenuItem 
                                  onClick={() => navigate(`/?soId=${so.id}`)}
                                  className="text-green-600"
                                  data-testid={`button-create-invoice-${so.id}`}
                                >
                                  <FilePlus className="w-4 h-4 mr-2" />
                                  Create Invoice
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
          <div className="p-4 border-t">
            <DataTablePagination
              meta={{
                totalItems: soResponse?.total || 0,
                page,
                pageSize,
                totalPages: Math.max(1, Math.ceil((soResponse?.total || 0) / pageSize)),
                hasPreviousPage: page > 1,
                hasNextPage: page < Math.ceil((soResponse?.total || 0) / pageSize),
              }}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            />
          </div>
        </Card>
    </div>
  );

  if (!showHeader) return pageContent;

  return (
    <div className="min-h-screen bg-background">
      <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />
      {pageContent}
    </div>
  );
}
