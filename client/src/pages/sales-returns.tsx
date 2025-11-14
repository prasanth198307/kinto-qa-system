import { useState } from "react";
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
import { Plus, Package, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";

const createReturnSchema = z.object({
  invoiceId: z.string().min(1, "Invoice is required"),
  returnDate: z.string().min(1, "Return date is required"),
  returnReason: z.string().min(1, "Return reason is required"),
  customerRemarks: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    productName: z.string().min(1),
    batchNumber: z.string().min(1, "Batch number is required"),
    quantityReturned: z.coerce.number().min(1, "Quantity must be at least 1"),
    returnReason: z.string().min(1, "Reason is required"),
  })).min(1, "At least one item is required"),
});

type CreateReturnForm = z.infer<typeof createReturnSchema>;

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

  const { data: returns = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/sales-returns'],
  });

  const { data: invoices = [] } = useQuery<any[]>({
    queryKey: ['/api/invoices'],
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
      items: [{ productId: "", productName: "", batchNumber: "", quantityReturned: 1, returnReason: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

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
                      <FormItem>
                        <FormLabel>Invoice</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-invoice">
                              <SelectValue placeholder="Select invoice" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {invoices.map((inv: any) => (
                              <SelectItem key={inv.id} value={inv.id}>
                                {inv.invoiceNumber} - {inv.customerName}
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
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ productId: "", productName: "", batchNumber: "", quantityReturned: 1, returnReason: "" })}
                      data-testid="button-add-item"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  {fields.map((field, index) => (
                    <Card key={field.id}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`items.${index}.productId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Product</FormLabel>
                                  <Select
                                    onValueChange={(value) => {
                                      field.onChange(value);
                                      const product = products.find((p: any) => p.id === value);
                                      if (product) {
                                        form.setValue(`items.${index}.productName`, product.name);
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
                                      {products.map((prod: any) => (
                                        <SelectItem key={prod.id} value={prod.id}>
                                          {prod.name}
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
                              name={`items.${index}.batchNumber`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Batch Number</FormLabel>
                                  <FormControl>
                                    <Input {...field} data-testid={`input-batch-${index}`} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantityReturned`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantity Returned</FormLabel>
                                  <FormControl>
                                    <Input type="number" {...field} data-testid={`input-quantity-${index}`} />
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
                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => remove(index)}
                              data-testid={`button-remove-item-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
