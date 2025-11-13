import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertProductionReconciliationSchema, insertProductionReconciliationItemSchema, type RawMaterialIssuance } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Info, Package, ArrowRight, Calculator } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

const headerSchema = insertProductionReconciliationSchema.omit({ 
  createdBy: true, 
  reconciliationNumber: true,
  editCount: true,
});

const itemSchema = insertProductionReconciliationItemSchema.omit({ 
  reconciliationId: true 
});

type HeaderFormData = z.infer<typeof headerSchema>;
type ItemFormData = z.infer<typeof itemSchema>;

interface IssuanceSummary {
  issuance: RawMaterialIssuance & { items: any[] };
  product: any;
  bomItems: any[];
}

interface ProductionReconciliationFormProps {
  reconciliation?: any;
  onClose: () => void;
}

export default function ProductionReconciliationForm({ reconciliation, onClose }: ProductionReconciliationFormProps) {
  const { toast } = useToast();
  const [selectedIssuanceId, setSelectedIssuanceId] = useState<string>("");
  const [selectedProductionId, setSelectedProductionId] = useState<string>("");
  const [items, setItems] = useState<Array<ItemFormData & { id?: string }>>([]);

  const { data: issuances = [] } = useQuery<RawMaterialIssuance[]>({
    queryKey: ['/api/raw-material-issuances'],
  });

  const { data: productions = [] } = useQuery<any[]>({
    queryKey: ['/api/production-entries'],
  });

  const { data: issuanceSummary, isLoading: isLoadingSummary } = useQuery<IssuanceSummary>({
    queryKey: ['/api/raw-material-issuances', selectedIssuanceId, 'summary'],
    enabled: !!selectedIssuanceId && selectedIssuanceId !== "",
  });

  const form = useForm<HeaderFormData>({
    resolver: zodResolver(headerSchema),
    defaultValues: {
      issuanceId: "",
      productionEntryId: "",
      reconciliationDate: new Date(),
      shift: 'A',
      remarks: "",
    },
  });

  useEffect(() => {
    if (reconciliation) {
      form.reset({
        issuanceId: reconciliation.issuanceId,
        productionEntryId: reconciliation.productionEntryId || "",
        reconciliationDate: reconciliation.reconciliationDate ? new Date(reconciliation.reconciliationDate) : new Date(),
        shift: reconciliation.shift || 'A',
        remarks: reconciliation.remarks || "",
      });
      setSelectedIssuanceId(reconciliation.issuanceId);
      setSelectedProductionId(reconciliation.productionEntryId || "");
      if (reconciliation.items) {
        setItems(reconciliation.items);
      }
    }
  }, [reconciliation, form]);

  // Watch form values outside of effects to avoid subscription issues
  const watchedIssuanceId = form.watch('issuanceId');
  const watchedProductionId = form.watch('productionEntryId');

  // Sync selectedIssuanceId from form value
  useEffect(() => {
    const currentIssuanceId = watchedIssuanceId || "";
    // Only update if it's a real change (not redundant selection or initial render)
    if (currentIssuanceId !== "" && currentIssuanceId !== selectedIssuanceId) {
      setSelectedIssuanceId(currentIssuanceId);
      // Only reset items in create mode when issuance changes
      // In edit mode, preserve existing items to prevent data loss
      if (!reconciliation && selectedIssuanceId !== "") {
        setItems([]);
      }
    }
  }, [watchedIssuanceId, selectedIssuanceId, reconciliation]);

  // Sync selectedProductionId from form value
  useEffect(() => {
    const currentProductionId = watchedProductionId || "";
    if (currentProductionId !== selectedProductionId) {
      setSelectedProductionId(currentProductionId);
    }
  }, [watchedProductionId, selectedProductionId]);

  // Auto-populate items when issuance is selected (create mode only)
  useEffect(() => {
    // Only auto-fill in create mode, when summary is loaded, and items are empty
    // Prevent auto-fill during edit mode even if items get cleared
    if (issuanceSummary && !reconciliation && items.length === 0 && selectedIssuanceId) {
      const issuanceItems = issuanceSummary.issuance.items.map((item: any) => ({
        rawMaterialId: item.rawMaterialId,
        issuanceItemId: item.id,
        quantityIssued: Number(item.quantityIssued) || 0,
        quantityUsed: Number(item.quantityIssued) || 0,
        quantityReturned: 0,
        quantityPending: 0,
        remarks: "",
      }));
      setItems(issuanceItems);
    }
  }, [issuanceSummary, reconciliation, items.length, selectedIssuanceId]);

  const createMutation = useMutation({
    mutationFn: async (data: { header: HeaderFormData; items: ItemFormData[] }) => {
      const response = await fetch('/api/production-reconciliations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/production-reconciliations'] });
      toast({
        title: "Success",
        description: "Production reconciliation created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      let errorMessage = "Failed to create production reconciliation";
      
      if (error.status === 409) {
        errorMessage = "A reconciliation already exists for this issuance and shift combination";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { header: Partial<HeaderFormData>; items: Array<ItemFormData & { id?: string }> }) => {
      const response = await fetch(`/api/production-reconciliations/${reconciliation?.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw error;
      }
      return response.json();
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/production-reconciliations'] });
      toast({
        title: "Success",
        description: response.message || "Reconciliation updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      let errorMessage = "Failed to update reconciliation";
      
      if (error.status === 403) {
        errorMessage = error.message || "Edit limit reached. Contact an administrator for further changes.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: HeaderFormData) => {
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "At least one reconciliation item is required",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      header: data,
      items: items,
    };

    if (reconciliation) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const updateItem = (index: number, field: keyof ItemFormData, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setItems(updatedItems);
  };

  const calculateNetConsumed = (used: number, returned: number, pending: number): number => {
    return used - returned - pending;
  };

  // Filter productions for selected issuance
  const filteredProductions = productions.filter(p => p.issuanceId === selectedIssuanceId);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{reconciliation ? 'Edit' : 'Create'} Production Reconciliation</CardTitle>
          <CardDescription>
            End-of-day reconciliation of material usage. Track returned and pending materials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Header Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="issuanceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Raw Material Issuance *</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!reconciliation}
                        data-testid="select-issuance"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select issuance" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {issuances.map((issuance) => (
                            <SelectItem key={issuance.id} value={issuance.id}>
                              {issuance.issuanceNumber} - {format(new Date(issuance.issuanceDate), 'MMM dd, yyyy')}
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
                  name="productionEntryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Production Entry *</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        value={field.value}
                        data-testid="select-production"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select production entry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredProductions.map((prod) => (
                            <SelectItem key={prod.id} value={prod.id}>
                              Shift {prod.shift} - {format(new Date(prod.productionDate), 'MMM dd')} ({prod.producedQuantity} units)
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
                  name="reconciliationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reconciliation Date *</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                          data-testid="input-reconciliation-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shift"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift *</FormLabel>
                      <Select 
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!!reconciliation}
                        data-testid="select-shift"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A">Shift A</SelectItem>
                          <SelectItem value="B">Shift B</SelectItem>
                          <SelectItem value="C">Shift C</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        value={field.value || ""}
                        placeholder="Additional notes about this reconciliation"
                        data-testid="textarea-remarks"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Items Section */}
              {selectedIssuanceId && (
                <div className="space-y-4 mt-6">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Material Reconciliation</h3>
                  </div>

                  {isLoadingSummary ? (
                    <div className="text-center py-4 text-muted-foreground">Loading materials...</div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>No materials found for this issuance</p>
                    </div>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Material</TableHead>
                            <TableHead className="text-right">Issued</TableHead>
                            <TableHead className="text-right">Used</TableHead>
                            <TableHead className="text-right">Returned</TableHead>
                            <TableHead className="text-right">Pending</TableHead>
                            <TableHead className="text-right">Net Consumed</TableHead>
                            <TableHead>Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, index) => {
                            const material = issuanceSummary?.issuance.items.find(
                              (i: any) => i.rawMaterialId === item.rawMaterialId
                            );
                            const netConsumed = calculateNetConsumed(
                              item.quantityUsed || 0,
                              item.quantityReturned || 0,
                              item.quantityPending || 0
                            );

                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {material?.rawMaterialId || item.rawMaterialId}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline">{item.quantityIssued}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={item.quantityUsed || 0}
                                    onChange={(e) => updateItem(index, 'quantityUsed', Number(e.target.value))}
                                    className="w-24 text-right"
                                    data-testid={`input-used-${index}`}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={item.quantityReturned || 0}
                                    onChange={(e) => updateItem(index, 'quantityReturned', Number(e.target.value))}
                                    className="w-24 text-right"
                                    data-testid={`input-returned-${index}`}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={item.quantityPending || 0}
                                    onChange={(e) => updateItem(index, 'quantityPending', Number(e.target.value))}
                                    className="w-24 text-right"
                                    data-testid={`input-pending-${index}`}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Calculator className="h-3 w-3 text-muted-foreground" />
                                    <Badge 
                                      variant={netConsumed < 0 ? "destructive" : "secondary"}
                                      data-testid={`badge-consumed-${index}`}
                                    >
                                      {netConsumed}
                                    </Badge>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    value={item.remarks || ""}
                                    onChange={(e) => updateItem(index, 'remarks', e.target.value)}
                                    placeholder="Notes"
                                    className="w-full"
                                    data-testid={`input-item-remarks-${index}`}
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Info Box */}
                  <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4">
                      <div className="flex gap-2">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="text-sm text-blue-900 dark:text-blue-100 space-y-1">
                          <p className="font-medium">Net Consumed = Used - Returned - Pending</p>
                          <p className="text-blue-700 dark:text-blue-300">
                            • <strong>Used:</strong> Total quantity actually used in production
                          </p>
                          <p className="text-blue-700 dark:text-blue-300">
                            • <strong>Returned:</strong> Materials physically returned to inventory (adds to stock)
                          </p>
                          <p className="text-blue-700 dark:text-blue-300">
                            • <strong>Pending:</strong> Materials in-process or pending return (tracked but not in stock)
                          </p>
                          {reconciliation && (
                            <p className="text-blue-700 dark:text-blue-300 mt-2">
                              • <strong>Edit {reconciliation.editCount || 0}/3:</strong> Non-admin users have limited edits
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending || !watchedIssuanceId || !watchedProductionId || items.length === 0}
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : reconciliation ? "Update Reconciliation" : "Create Reconciliation"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
