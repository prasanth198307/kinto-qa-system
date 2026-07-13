import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
  ArrowLeft, CheckCircle, XCircle, Plus, Edit, ClipboardList, FileText,
  CalendarCheck, Trash2, Check, ChevronsUpDown,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { Product, Vendor } from "@shared/schema";
import { useTenantConfig, formatCurrency as fmtCur } from "@/hooks/use-tenant-config";

const salesOrderItemSchema = z.object({
  productId: z.string().min(1, "Product required"),
  description: z.string().optional(),
  hsnCode: z.string().optional(),
  quantity: z.number().min(1, "Qty ≥ 1"),
  unitPrice: z.number().min(0),
  cgstRate: z.number().min(0).max(100).default(9),
  sgstRate: z.number().min(0).max(100).default(9),
  igstRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).default(0),
  discountMode: z.enum(['%', sym]).default('%'),
});

const salesOrderSchema = z.object({
  buyerName: z.string().min(1, "Buyer name required"),
  soDate: z.string().min(1, "Date required"),
  deliveryDate: z.string().optional(),
  vendorId: z.string().optional(),
  buyerGstin: z.string().optional(),
  buyerAddress: z.string().optional(),
  buyerState: z.string().optional(),
  buyerContact: z.string().optional(),
  shipToName: z.string().optional(),
  shipToAddress: z.string().optional(),
  shipToCity: z.string().optional(),
  shipToState: z.string().optional(),
  shipToPin: z.string().optional(),
  remarks: z.string().optional(),
  items: z.array(salesOrderItemSchema).min(1, "At least one item required"),
});

type SOFormValues = z.infer<typeof salesOrderSchema>;

function formatCurrency(amountInPaise: number) {
  return (amountInPaise / 100).toLocaleString('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2,
  });
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'draft': return <Badge variant="secondary">Draft</Badge>;
    case 'confirmed': return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 no-default-hover-elevate">Confirmed</Badge>;
    case 'invoiced': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 no-default-hover-elevate">Invoiced</Badge>;
    case 'partially_invoiced': return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 no-default-hover-elevate">Partially Invoiced</Badge>;
    case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

interface EditDialogProps {
  salesOrder: any;
  open: boolean;
  onClose: () => void;
}

function EditSalesOrderDialog({ salesOrder, open, onClose }: EditDialogProps) {
  const { toast } = useToast();

  const { data: products = [] } = useQuery<Product[]>({ queryKey: ['/api/products'] });
  const { data: vendors = [] } = useQuery<Vendor[]>({ queryKey: ['/api/vendors'] });

  const items = salesOrder.items || [];
  const tenantConfig = useTenantConfig();
  const sym = tenantConfig.currency_symbol;

  // Detect supply type from existing items (inter-state if any item has igstRate > 0)
  const [isInterstate, setIsInterstate] = useState(() =>
    (items as any[]).some((it: any) => Number(it.igstRate) > 0)
  );

  const form = useForm<SOFormValues>({
    resolver: zodResolver(salesOrderSchema),
    defaultValues: {
      buyerName: salesOrder.buyerName || "",
      soDate: salesOrder.soDate ? salesOrder.soDate.slice(0, 10) : format(new Date(), 'yyyy-MM-dd'),
      deliveryDate: salesOrder.deliveryDate ? salesOrder.deliveryDate.slice(0, 10) : "",
      vendorId: salesOrder.vendorId || "",
      buyerGstin: salesOrder.buyerGstin || "",
      buyerAddress: salesOrder.buyerAddress || "",
      buyerState: (salesOrder as any).buyerState || "",
      buyerContact: salesOrder.buyerContact || "",
      shipToName: salesOrder.shipToName || "",
      shipToAddress: salesOrder.shipToAddress || "",
      shipToCity: salesOrder.shipToCity || "",
      shipToState: salesOrder.shipToState || "",
      shipToPin: salesOrder.shipToPin || "",
      remarks: salesOrder.remarks || "",
      items: items.length > 0 ? items.map((item: any) => {
        const cgst = Number(item.cgstRate) || 9;
        const sgst = Number(item.sgstRate) || 9;
        const igst = Number(item.igstRate) || 0;
        const totalGST = cgst + sgst + igst;
        // Convert stored base price (paise) back to case price incl. GST for display
        const baseRupees = Number(item.unitPrice || 0) / 100;
        const casePriceInclGST = baseRupees * (1 + totalGST / 100);
        return {
          productId: item.productId || "",
          description: item.description || "",
          hsnCode: item.hsnCode || "",
          quantity: Number(item.quantity) || 1,
          unitPrice: Math.round(casePriceInclGST * 100) / 100, // case price incl. GST
          cgstRate: cgst,
          sgstRate: sgst,
          igstRate: igst,
          discount: Number(item.discount || 0) / 100,       // stored as value×100, convert back
          discountMode: (item.discountMode || '%') as '%' | sym,
        };
      }) : [{ productId: "", description: "", hsnCode: "22011010", quantity: 1, unitPrice: 0, cgstRate: 9, sgstRate: 9, igstRate: 0, discount: 0, discountMode: '%' as '%' | sym }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

  const handleSupplyTypeChange = (interstate: boolean) => {
    const currentItems = form.getValues("items");
    currentItems.forEach((item, idx) => {
      const totalGst = (Number(item.cgstRate) || 0) + (Number(item.sgstRate) || 0) + (Number(item.igstRate) || 0);
      if (interstate) {
        form.setValue(`items.${idx}.cgstRate`, 0);
        form.setValue(`items.${idx}.sgstRate`, 0);
        form.setValue(`items.${idx}.igstRate`, totalGst);
      } else {
        const half = totalGst / 2;
        form.setValue(`items.${idx}.cgstRate`, half);
        form.setValue(`items.${idx}.sgstRate`, half);
        form.setValue(`items.${idx}.igstRate`, 0);
      }
    });
    setIsInterstate(interstate);
  };

  const watchedItems = form.watch("items");
  // casePrice is already inclusive of GST — liveTotal = sum(casePrice × qty)
  const liveTotal = watchedItems.reduce((sum, item) => {
    const gross = (item.unitPrice || 0) * (item.quantity || 0);
    const disc = item.discountMode === '%'
      ? gross * (item.discount || 0) / 100
      : (item.discount || 0) * (item.quantity || 0);
    return sum + gross - disc;
  }, 0);

  const updateMutation = useMutation({
    mutationFn: async (values: SOFormValues) => {
      // User enters case price INCLUSIVE of GST. Back-calculate base unit price.
      const computedItems = values.items.map(item => {
        const casePriceIncl = item.unitPrice; // rupees inclusive of GST
        const totalGST = (Number(item.cgstRate) || 0) + (Number(item.sgstRate) || 0) + (Number(item.igstRate) || 0);
        const unitPriceExcl = totalGST > 0 ? casePriceIncl / (1 + totalGST / 100) : casePriceIncl;
        const unitPricePaise = Math.round(unitPriceExcl * 100);
        const grossPaise = unitPricePaise * item.quantity;

        // Discount stored as value×100 (paise-style). '%' mode: gross×discount/10000; sym mode: discount×qty
        const discountStored = Math.round((item.discount || 0) * 100); // store back as value×100
        const discountMode = item.discountMode || '%';
        const discountPaise = discountMode === '%'
          ? Math.round(grossPaise * discountStored / 10000)
          : discountStored * item.quantity;

        const taxableAmountPaise = grossPaise - discountPaise;
        const gstPaise = Math.round(taxableAmountPaise * totalGST / 100);
        const totalAmountPaise = taxableAmountPaise + gstPaise;
        return { item, unitPricePaise, taxableAmountPaise, totalAmountPaise, discountStored, discountMode };
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
          buyerState: values.buyerState || null,
          buyerContact: values.buyerContact || null,
          shipToName: values.shipToName || null,
          shipToAddress: values.shipToAddress || null,
          shipToCity: values.shipToCity || null,
          shipToState: values.shipToState || null,
          shipToPin: values.shipToPin || null,
          remarks: values.remarks || null,
          totalAmount: soTotalPaise,
        },
        items: computedItems.map(({ item, unitPricePaise, taxableAmountPaise, totalAmountPaise, discountStored, discountMode }) => ({
          productId: item.productId,
          description: item.description || null,
          hsnCode: item.hsnCode || null,
          quantity: item.quantity,
          cgstRate: item.cgstRate,
          sgstRate: item.sgstRate,
          igstRate: item.igstRate,
          unitPrice: unitPricePaise,
          taxableAmount: taxableAmountPaise,
          totalAmount: totalAmountPaise,
          discount: discountStored,
          discountMode: discountMode,
        })),
      };
      const res = await apiRequest('PATCH', `/api/sales-orders/${salesOrder.id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-orders', salesOrder.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/sales-orders'] });
      toast({ title: "Sales Order Updated", description: "Changes saved successfully." });
      onClose();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Sales Order — {salesOrder.soNumber}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => updateMutation.mutate(v))} className="space-y-5">
            {/* Buyer info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="buyerName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Buyer Name *</FormLabel>
                  <FormControl><Input {...field} data-testid="input-edit-buyer-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="vendorId" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Link to Vendor (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")} data-testid="select-edit-vendor">
                          {field.value ? vendors.find(v => v.id === field.value)?.vendorName : "Select vendor..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[360px] p-0">
                      <Command>
                        <CommandInput placeholder="Search vendor..." />
                        <CommandList>
                          <CommandEmpty>No vendor found.</CommandEmpty>
                          <CommandGroup>
                            {vendors.map(vendor => (
                              <CommandItem key={vendor.id} value={vendor.vendorName} onSelect={() => {
                                form.setValue("vendorId", vendor.id);
                                if (vendor.vendorName) form.setValue("buyerName", vendor.vendorName);
                                if (vendor.gstNumber) form.setValue("buyerGstin", vendor.gstNumber);
                                if (vendor.address) form.setValue("buyerAddress", vendor.address);
                                if (vendor.state) form.setValue("buyerState", vendor.state);
                                if (vendor.mobileNumber) form.setValue("buyerContact", vendor.mobileNumber);
                                if (vendor.shipToName) form.setValue("shipToName", vendor.shipToName);
                                if (vendor.shipToAddress) form.setValue("shipToAddress", vendor.shipToAddress);
                                if (vendor.shipToCity) form.setValue("shipToCity", vendor.shipToCity);
                                if (vendor.shipToState) form.setValue("shipToState", vendor.shipToState);
                                if (vendor.shipToPincode) form.setValue("shipToPin", vendor.shipToPincode);
                              }}>
                                <Check className={cn("mr-2 h-4 w-4", vendor.id === field.value ? "opacity-100" : "opacity-0")} />
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
              )} />
              <FormField control={form.control} name="soDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Date *</FormLabel>
                  <FormControl><Input type="date" {...field} data-testid="input-edit-so-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="deliveryDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected Delivery Date</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="buyerGstin" render={({ field }) => (
                <FormItem>
                  <FormLabel>Buyer GSTIN</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="buyerAddress" render={({ field }) => (
                <FormItem>
                  <FormLabel>Buyer Address</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="buyerState" render={({ field }) => (
                <FormItem>
                  <FormLabel>Buyer State</FormLabel>
                  <FormControl><Input placeholder="e.g. Andhra Pradesh" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="buyerContact" render={({ field }) => (
                <FormItem>
                  <FormLabel>Buyer Contact</FormLabel>
                  <FormControl><Input placeholder="Phone / Email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="remarks" render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Remarks</FormLabel>
                  <FormControl><Input placeholder="Internal notes / special instructions" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Ship-To */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Shipping Address <span className="normal-case font-normal">(leave blank if same as buyer)</span></h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FormField control={form.control} name="shipToName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ship-To Name</FormLabel>
                    <FormControl><Input placeholder="Consignee name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="shipToAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ship-To Address</FormLabel>
                    <FormControl><Input placeholder="Street / locality" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="shipToCity" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl><Input placeholder="City" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="shipToState" render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl><Input placeholder="State" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="shipToPin" render={({ field }) => (
                  <FormItem>
                    <FormLabel>PIN Code</FormLabel>
                    <FormControl><Input placeholder="PIN" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-medium">Line Items</h3>
                  <div className="flex rounded-md border overflow-hidden h-8">
                    <button
                      type="button"
                      onClick={() => handleSupplyTypeChange(false)}
                      className={`px-3 text-xs font-medium transition-colors ${!isInterstate ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                      data-testid="button-so-supply-intrastate"
                    >
                      Intra-state
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSupplyTypeChange(true)}
                      className={`px-3 text-xs font-medium transition-colors ${isInterstate ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'}`}
                      data-testid="button-so-supply-interstate"
                    >
                      Inter-state
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">{isInterstate ? 'IGST only' : 'CGST + SGST'}</span>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => append(isInterstate
                  ? { productId: "", description: "", hsnCode: "22011010", quantity: 1, unitPrice: 0, cgstRate: 0, sgstRate: 0, igstRate: 18, discount: 0, discountMode: '%' as '%' | sym }
                  : { productId: "", description: "", hsnCode: "22011010", quantity: 1, unitPrice: 0, cgstRate: 9, sgstRate: 9, igstRate: 0, discount: 0, discountMode: '%' as '%' | sym }
                )} data-testid="button-edit-add-item">
                  <Plus className="w-4 h-4 mr-1" />Add Item
                </Button>
              </div>
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Product</TableHead>
                      <TableHead className="w-24">HSN Code</TableHead>
                      <TableHead className="w-20">Qty</TableHead>
                      <TableHead className="w-32">Case Price ${sym} (incl. GST)</TableHead>
                      <TableHead className="w-40">{isInterstate ? 'IGST %' : 'CGST% / SGST%'}</TableHead>
                      <TableHead className="w-36">Discount</TableHead>
                      <TableHead className="w-28 text-right">Line Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const row = watchedItems[index] || {};
                      // casePrice is already inclusive of GST; apply discount for display
                      const grossTotal = (row.unitPrice || 0) * (row.quantity || 0);
                      const lineTotal = row.discountMode === '%'
                        ? grossTotal * (1 - (row.discount || 0) / 100)
                        : grossTotal - (row.discount || 0) * (row.quantity || 0);
                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <FormField control={form.control} name={`items.${index}.productId`} render={({ field: f }) => (
                              <Select onValueChange={(val) => {
                                f.onChange(val);
                                const prod = products.find(p => p.id === val);
                                if (prod) {
                                  form.setValue(`items.${index}.description`, prod.productName);
                                  if (prod.hsnCode) form.setValue(`items.${index}.hsnCode`, prod.hsnCode);
                                }
                              }} value={f.value}>
                                <FormControl>
                                  <SelectTrigger data-testid={`select-edit-product-${index}`}>
                                    <SelectValue placeholder="Select product" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.productName}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            )} />
                          </TableCell>
                          <TableCell>
                            <FormField control={form.control} name={`items.${index}.hsnCode`} render={({ field: f }) => (
                              <FormControl>
                                <Input placeholder="HSN" {...f} className="w-20 font-mono text-xs" data-testid={`input-edit-hsn-${index}`} />
                              </FormControl>
                            )} />
                          </TableCell>
                          <TableCell>
                            <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: f }) => (
                              <FormControl>
                                <Input type="number" min={1} step={1} {...f} onChange={e => f.onChange(Number(e.target.value))} className="w-16" data-testid={`input-edit-qty-${index}`} />
                              </FormControl>
                            )} />
                          </TableCell>
                          <TableCell>
                            <FormField control={form.control} name={`items.${index}.unitPrice`} render={({ field: f }) => (
                              <FormControl>
                                <Input type="number" step="0.01" min={0} {...f} onChange={e => f.onChange(Number(e.target.value))} className="w-24" data-testid={`input-edit-price-${index}`} />
                              </FormControl>
                            )} />
                          </TableCell>
                          <TableCell>
                            {isInterstate ? (
                              <div className="flex items-center gap-1">
                                <FormField control={form.control} name={`items.${index}.igstRate`} render={({ field: f }) => (
                                  <FormControl>
                                    <Input type="number" step="0.01" min={0} max={100} {...f} onChange={e => {
                                      const v = Number(e.target.value);
                                      f.onChange(v);
                                      form.setValue(`items.${index}.cgstRate`, 0);
                                      form.setValue(`items.${index}.sgstRate`, 0);
                                    }} className="w-20 text-xs" title="IGST %" placeholder="IGST %" data-testid={`input-edit-igst-${index}`} />
                                  </FormControl>
                                )} />
                                <span className="text-xs text-muted-foreground">%</span>
                              </div>
                            ) : (
                              <div className="flex gap-1 items-center">
                                <FormField control={form.control} name={`items.${index}.cgstRate`} render={({ field: f }) => (
                                  <FormControl>
                                    <Input type="number" step="0.01" min={0} max={100} {...f} onChange={e => f.onChange(Number(e.target.value))} className="w-16 text-xs" title="CGST %" placeholder="CGST" data-testid={`input-edit-cgst-${index}`} />
                                  </FormControl>
                                )} />
                                <span className="text-xs text-muted-foreground">/</span>
                                <FormField control={form.control} name={`items.${index}.sgstRate`} render={({ field: f }) => (
                                  <FormControl>
                                    <Input type="number" step="0.01" min={0} max={100} {...f} onChange={e => f.onChange(Number(e.target.value))} className="w-16 text-xs" title="SGST %" placeholder="SGST" data-testid={`input-edit-sgst-${index}`} />
                                  </FormControl>
                                )} />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 items-center">
                              <Input
                                type="number"
                                step="0.01"
                                min={0}
                                {...form.register(`items.${index}.discount`, { valueAsNumber: true })}
                                placeholder="0"
                                className="w-16 text-xs"
                                data-testid={`input-edit-discount-${index}`}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-9 px-1 text-xs shrink-0"
                                onClick={() => {
                                  const cur = form.getValues(`items.${index}.discountMode`) || '%';
                                  form.setValue(`items.${index}.discountMode`, cur === '%' ? sym : '%');
                                }}
                                data-testid={`button-edit-discount-mode-${index}`}
                              >
                                {form.watch(`items.${index}.discountMode`) || '%'}
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium tabular-nums">
                            {sym}{lineTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} className="text-destructive h-8 w-8">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Live Total */}
              <div className="flex justify-end pt-1">
                <div className="flex items-center gap-4 bg-muted/50 rounded-md px-4 py-2 text-sm">
                  <span className="text-muted-foreground">Estimated Grand Total (incl. GST):</span>
                  <span className="font-bold text-base">{sym}{liveTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-edit-so">
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function SalesOrderDetail({ showHeader = true }: { showHeader?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { logoutMutation } = useAuth();
  const [cancellationReason, setCancellationReason] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { data: salesOrder, isLoading: isLoadingSO } = useQuery<any>({
    queryKey: ['/api/sales-orders', id],
  });

  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<any[]>({
    queryKey: ['/api/sales-orders', id, 'invoices'],
    queryFn: async () => {
      const res = await fetch(`/api/sales-orders/${id}/invoices`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/sales-orders/${id}/confirm`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-orders', id] });
      toast({ title: "Sales Order Confirmed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', `/api/sales-orders/${id}/cancel`, { cancellationReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sales-orders', id] });
      toast({ title: "Sales Order Cancelled" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const hasLinkedInvoices = !isLoadingInvoices && invoices.length > 0;

  const content = (() => {
    if (isLoadingSO) {
      return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      );
    }

    if (!salesOrder) {
      return (
        <div className="p-4 sm:p-6 max-w-4xl mx-auto w-full">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold text-destructive mb-4">Sales Order Not Found</h2>
            <Button onClick={() => setLocation('/?tab=sales-orders')}>
              <ArrowLeft className="w-4 h-4 mr-2" />Back to Sales Orders
            </Button>
          </Card>
        </div>
      );
    }

    const items = salesOrder.items || [];

    // Compute per-item discount amounts in paise
    // discount stored as value×100 (paise). '%' mode: gross×discount/10000; sym mode: discount×qty
    const itemsWithDiscount = items.map((item: any) => {
      const grossPaise = (item.unitPrice || 0) * (item.quantity || 0);
      const discountVal = item.discount || 0;
      const discountMode = item.discountMode || '%';
      const discountPaise = discountMode === '%'
        ? Math.round(grossPaise * discountVal / 10000)
        : discountVal * (item.quantity || 0);
      return { ...item, grossPaise, discountPaise };
    });

    const hasDiscount = itemsWithDiscount.some((item: any) => item.discountPaise > 0);
    const grossTotal = itemsWithDiscount.reduce((acc: number, item: any) => acc + item.grossPaise, 0);
    const totalDiscountAmount = itemsWithDiscount.reduce((acc: number, item: any) => acc + item.discountPaise, 0);
    const subtotal = items.reduce((acc: number, item: any) => acc + (item.taxableAmount || 0), 0);
    const totalTax = salesOrder.totalAmount - subtotal;

    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Edit dialog */}
        {isEditOpen && (
          <EditSalesOrderDialog
            salesOrder={salesOrder}
            open={isEditOpen}
            onClose={() => setIsEditOpen(false)}
          />
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setLocation('/?tab=sales-orders')} data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{salesOrder.soNumber}</h1>
                {getStatusBadge(salesOrder.status)}
              </div>
              <p className="text-sm text-muted-foreground">
                Date: {salesOrder.soDate ? format(new Date(salesOrder.soDate), "dd MMM yyyy") : "N/A"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {salesOrder.status === 'draft' && !hasLinkedInvoices && (
              <Button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending} data-testid="button-confirm-so">
                <CheckCircle className="w-4 h-4 mr-2" />Confirm
              </Button>
            )}
            {salesOrder.status === 'confirmed' && !hasLinkedInvoices && (
              <Button onClick={() => setLocation(`/?soId=${salesOrder.id}`)} data-testid="button-create-invoice">
                <Plus className="w-4 h-4 mr-2" />Create Invoice
              </Button>
            )}
            {(salesOrder.status === 'draft' || salesOrder.status === 'confirmed') && !hasLinkedInvoices && (
              <Button variant="outline" onClick={() => setIsEditOpen(true)} data-testid="button-edit-so">
                <Edit className="w-4 h-4 mr-2" />Edit
              </Button>
            )}
            {(salesOrder.status === 'draft' || salesOrder.status === 'confirmed') && !hasLinkedInvoices && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive" data-testid="button-cancel-so">
                    <XCircle className="w-4 h-4 mr-2" />Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Sales Order</AlertDialogTitle>
                    <AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4 space-y-2">
                    <Label htmlFor="reason">Cancellation Reason</Label>
                    <Input id="reason" placeholder="Enter reason..." value={cancellationReason} onChange={e => setCancellationReason(e.target.value)} />
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Back</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                      Cancel Order
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Buyer & Shipping Details</CardTitle></CardHeader>
              <CardContent>
                {salesOrder.deliveryDate && (
                  <div className="mb-4 p-3 rounded-md bg-muted/50 flex items-center gap-2 text-sm">
                    <CalendarCheck className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Expected Delivery:</span>
                    <span className="font-medium">{format(new Date(salesOrder.deliveryDate), 'dd MMM yyyy')}</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Buyer Details</h4>
                    <p className="font-medium text-lg">{salesOrder.buyerName}</p>
                    {salesOrder.buyerGstin && <p className="text-sm">GSTIN: <span className="font-mono">{salesOrder.buyerGstin}</span></p>}
                    {salesOrder.buyerContact && <p className="text-sm">Contact: {salesOrder.buyerContact}</p>}
                    {salesOrder.buyerAddress && <p className="text-sm mt-2 text-muted-foreground leading-relaxed">{salesOrder.buyerAddress}</p>}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Shipping Details</h4>
                    <p className="font-medium">{salesOrder.shipToName || salesOrder.buyerName}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {salesOrder.shipToAddress || salesOrder.buyerAddress}<br />
                      {salesOrder.shipToCity && `${salesOrder.shipToCity}, `}
                      {salesOrder.shipToState && `${salesOrder.shipToState} `}
                      {salesOrder.shipToPin && `- ${salesOrder.shipToPin}`}
                    </p>
                  </div>
                </div>
                {salesOrder.remarks && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Remarks</h4>
                      <p className="text-sm italic text-muted-foreground">"{salesOrder.remarks}"</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Line Items</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      {hasDiscount && <TableHead className="text-right">Gross</TableHead>}
                      {hasDiscount && <TableHead className="text-right">Discount</TableHead>}
                      <TableHead className="text-right">Taxable</TableHead>
                      <TableHead className="text-right">Tax%</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsWithDiscount.map((item: any, idx: number) => (
                      <TableRow key={item.id || idx}>
                        <TableCell>
                          <div className="font-medium">{item.productName || "Unknown Product"}</div>
                          {item.description && <div className="text-xs text-muted-foreground">{item.description}</div>}
                          {item.hsnCode && <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">HSN: {item.hsnCode}</div>}
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.unitPrice)}</TableCell>
                        {hasDiscount && (
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {formatCurrency(item.grossPaise)}
                          </TableCell>
                        )}
                        {hasDiscount && (
                          <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                            {item.discountPaise > 0 ? (
                              <span>
                                -{formatCurrency(item.discountPaise)}
                                <span className="text-[10px] text-muted-foreground ml-1">
                                  ({item.discountMode === '%'
                                    ? `${(item.discount / 100).toFixed(0)}%`
                                    : `${sym}${(item.discount / 100).toFixed(0)}/cs`})
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-mono">{formatCurrency(item.taxableAmount)}</TableCell>
                        <TableCell className="text-right text-xs">
                          {Number(item.igstRate) > 0 ? (
                            <span>IGST {item.igstRate}%</span>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span>CGST {item.cgstRate}%</span>
                              <span>SGST {item.sgstRate}%</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold font-mono">{formatCurrency(item.totalAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-6 flex flex-col items-end gap-2 bg-muted/20">
                  {hasDiscount && (
                    <div className="flex justify-between w-full max-w-[280px] text-sm">
                      <span className="text-muted-foreground">Gross Total:</span>
                      <span className="font-mono text-muted-foreground">{formatCurrency(grossTotal)}</span>
                    </div>
                  )}
                  {hasDiscount && (
                    <div className="flex justify-between w-full max-w-[280px] text-sm">
                      <span className="text-red-600 dark:text-red-400">Discount:</span>
                      <span className="font-mono text-red-600 dark:text-red-400">- {formatCurrency(totalDiscountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between w-full max-w-[280px] text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-mono">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between w-full max-w-[280px] text-sm">
                    <span className="text-muted-foreground">Total Tax:</span>
                    <span className="font-mono">{formatCurrency(totalTax >= 0 ? totalTax : 0)}</span>
                  </div>
                  <Separator className="w-full max-w-[280px] my-1" />
                  <div className="flex justify-between w-full max-w-[280px] text-lg font-bold">
                    <span>Grand Total:</span>
                    <span className="font-mono text-primary">{formatCurrency(salesOrder.totalAmount || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-4 h-4" />Linked Invoices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingInvoices ? (
                  <p className="text-sm text-muted-foreground">Loading invoices...</p>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed rounded-lg">
                    <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                    <p className="text-sm text-muted-foreground px-4">No invoices generated from this sales order yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invoices.map((inv: any) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 border rounded-lg hover-elevate cursor-pointer group" onClick={() => setLocation(`/invoice/${inv.id}`)}>
                        <div className="space-y-1">
                          <p className="text-sm font-bold group-hover:text-primary transition-colors">{inv.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(inv.invoiceDate), "dd MMM yyyy")}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-xs font-mono font-bold">{formatCurrency(inv.totalAmount)}</p>
                          <Badge variant="outline" className="text-[10px] h-4 uppercase tracking-tighter">{inv.status?.replace(/_/g, ' ')}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Audit Info</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Created By</p>
                  <p className="font-medium capitalize">{salesOrder.recordedByUsername || salesOrder.recordedBy || "Unknown"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{salesOrder.createdAt ? format(new Date(salesOrder.createdAt), "dd MMM yyyy HH:mm") : "N/A"}</p>
                </div>
                {salesOrder.status === 'cancelled' && (
                  <div>
                    <Separator className="my-3" />
                    <p className="text-muted-foreground mb-1">Cancelled By</p>
                    <p className="font-medium capitalize">{salesOrder.cancelledByUsername || salesOrder.cancelledBy || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{salesOrder.cancelledAt ? format(new Date(salesOrder.cancelledAt), "dd MMM yyyy HH:mm") : "N/A"}</p>
                    {salesOrder.cancellationReason && <p className="text-xs mt-2 text-destructive font-medium italic">"{salesOrder.cancellationReason}"</p>}
                  </div>
                )}
                {salesOrder.status !== 'draft' && salesOrder.status !== 'cancelled' && (
                  <div>
                    <Separator className="my-3" />
                    <p className="text-muted-foreground mb-1">Confirmed By</p>
                    <p className="font-medium capitalize">{salesOrder.confirmedByUsername || salesOrder.confirmedBy || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{salesOrder.confirmedAt ? format(new Date(salesOrder.confirmedAt), "dd MMM yyyy HH:mm") : "N/A"}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  })();

  if (!showHeader) return content;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <GlobalHeader onLogoutClick={() => logoutMutation.mutate()} />
      <div className="mt-16">{content}</div>
    </div>
  );
}
