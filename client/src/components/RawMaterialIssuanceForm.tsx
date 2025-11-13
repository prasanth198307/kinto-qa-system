import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertRawMaterialIssuanceSchema, insertRawMaterialIssuanceItemSchema, type RawMaterial, type Product, type Uom, type RawMaterialIssuance, type RawMaterialIssuanceItem } from "@shared/schema";
import { calculateBOMSuggestions } from "@shared/calculations";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertCircle } from "lucide-react";

const headerSchema = insertRawMaterialIssuanceSchema.omit({ issuanceNumber: true });
const itemSchema = insertRawMaterialIssuanceItemSchema.omit({ issuanceId: true });

const formSchema = z.object({
  header: headerSchema,
  items: z.array(itemSchema).min(1, "At least one item is required"),
});

type FormData = z.infer<typeof formSchema>;

interface RawMaterialIssuanceFormProps {
  issuance: RawMaterialIssuance | null;
  onClose: () => void;
}

export default function RawMaterialIssuanceForm({ issuance, onClose }: RawMaterialIssuanceFormProps) {
  const { toast } = useToast();
  const [items, setItems] = useState([{ 
    rawMaterialId: "", 
    productId: "", 
    quantityIssued: 0,
    suggestedQuantity: undefined,
    calculationBasis: undefined,
    uomId: "", 
    remarks: "" 
  }]);

  const { data: issuanceItems = [] } = useQuery<RawMaterialIssuanceItem[]>({
    queryKey: ['/api/raw-material-issuance-items', issuance?.id],
    enabled: !!issuance?.id,
  });

  const { data: rawMaterials = [] } = useQuery<RawMaterial[]>({
    queryKey: ['/api/raw-materials'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: uoms = [] } = useQuery<Uom[]>({
    queryKey: ['/api/uom'],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      header: {
        issuanceDate: new Date(),
        issuedTo: "",
        productId: undefined,
        productionReference: "",
        plannedOutput: undefined,
        remarks: "",
      },
      items: items,
    },
  });

  // Watch header values for BOM auto-population (MUST be after useForm)
  const selectedProductId = form.watch('header.productId');
  const plannedOutput = form.watch('header.plannedOutput');

  // Fetch BOM data when product is selected
  const { data: bomData, isLoading: isBomLoading } = useQuery<{
    items: Array<{
      bom: any;
      material: any;
      type: any;
    }>;
    metadata: {
      productId: string;
      productName: string;
      totalItems: number;
      lastUpdatedAt: Date | null;
    };
  }>({
    queryKey: ['/api/products', selectedProductId, 'bom-with-types'],
    enabled: !!selectedProductId && selectedProductId !== "",
  });

  useEffect(() => {
    if (issuance && issuanceItems.length > 0) {
      const mappedItems = issuanceItems.map(item => ({
        rawMaterialId: item.rawMaterialId,
        productId: item.productId,
        quantityIssued: Number(item.quantityIssued) || 0,
        suggestedQuantity: item.suggestedQuantity ? Number(item.suggestedQuantity) : undefined,
        calculationBasis: item.calculationBasis as 'formula-based' | 'direct-value' | 'output-coverage' | 'manual' | undefined,
        uomId: item.uomId || "",
        remarks: item.remarks || "",
      }));
      
      setItems(mappedItems);
      form.reset({
        header: {
          issuanceDate: issuance.issuanceDate ? new Date(issuance.issuanceDate) : new Date(),
          issuedTo: issuance.issuedTo || "",
          productId: issuance.productId || undefined,
          productionReference: issuance.productionReference || "",
          plannedOutput: issuance.plannedOutput ? Number(issuance.plannedOutput) : undefined,
          remarks: issuance.remarks || "",
        },
        items: mappedItems,
      });
    }
  }, [issuance, issuanceItems, form]);

  // Auto-populate items when BOM data and planned output are available
  useEffect(() => {
    console.log('[BOM Auto-Populate] useEffect triggered', {
      issuance: !!issuance,
      bomData: !!bomData,
      bomDataItems: bomData?.items?.length || 0,
      plannedOutput,
      selectedProductId
    });

    // Only auto-populate for new issuances (not editing existing ones)
    if (issuance) {
      console.log('[BOM Auto-Populate] Skipping - editing existing issuance');
      return;
    }

    // Require both product and planned output to calculate suggestions
    if (!bomData || !bomData.items || !plannedOutput || plannedOutput <= 0) {
      console.log('[BOM Auto-Populate] Conditions not met', {
        hasBomData: !!bomData,
        hasItems: !!bomData?.items,
        itemsLength: bomData?.items?.length,
        plannedOutput,
        plannedOutputType: typeof plannedOutput,
        isPlannedOutputValid: plannedOutput > 0
      });
      return;
    }

    console.log('[BOM Auto-Populate] Calculating suggestions...');
    // Calculate suggested quantities using the shared calculation utility
    // calculateBOMSuggestions returns a Map<materialId, suggestion>
    const suggestionsMap = calculateBOMSuggestions(plannedOutput, bomData.items);
    console.log('[BOM Auto-Populate] Suggestions calculated', { 
      suggestionsCount: suggestionsMap.size,
      suggestions: Array.from(suggestionsMap.values())
    });

    // Convert Map to array for form structure
    const bomItems = Array.from(suggestionsMap.values()).map(suggestion => ({
      rawMaterialId: suggestion.rawMaterialId,
      productId: selectedProductId || "",
      quantityIssued: suggestion.roundedQuantity, // Pre-fill with suggested (rounded up)
      suggestedQuantity: suggestion.suggestedQuantity,
      calculationBasis: suggestion.calculationBasis,
      uomId: suggestion.uomId || "",
      remarks: suggestion.calculationDetails || "",
    }));

    console.log('[BOM Auto-Populate] BOM items created', { count: bomItems.length, bomItems });

    // Update items state and form
    if (bomItems.length > 0) {
      console.log('[BOM Auto-Populate] Setting items and showing toast');
      setItems(bomItems);
      form.setValue('items', bomItems);
      
      toast({
        title: "BOM Loaded",
        description: `${bomItems.length} materials auto-populated from product BOM`,
      });
    } else {
      console.log('[BOM Auto-Populate] No BOM items to populate');
    }
  }, [bomData, plannedOutput, selectedProductId, issuance, form, toast]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (issuance) {
        return await apiRequest('PATCH', `/api/raw-material-issuances/${issuance.id}`, data);
      } else {
        return await apiRequest('POST', '/api/raw-material-issuances', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/raw-material-issuances'] });
      queryClient.invalidateQueries({ queryKey: ['/api/raw-material-issuance-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/raw-materials'] });
      toast({
        title: "Success",
        description: issuance ? "Issuance updated successfully" : "Raw material issuance created successfully",
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || (issuance ? "Failed to update issuance" : "Failed to create issuance"),
        variant: "destructive",
      });
    },
  });

  const addItem = () => {
    const newItems = [...items, { 
      rawMaterialId: "", 
      productId: "", 
      quantityIssued: 0,
      suggestedQuantity: undefined,
      calculationBasis: 'manual' as const,
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
    setItems([{ 
      rawMaterialId: "", 
      productId: "", 
      quantityIssued: 0,
      suggestedQuantity: undefined,
      calculationBasis: undefined,
      uomId: "", 
      remarks: "" 
    }]);
    onClose();
  };

  const onSubmit = (data: FormData) => {
    saveMutation.mutate(data);
  };

  return (
    <Card className="p-4 mb-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          {issuance ? 'Edit Raw Material Issuance' : 'Create Raw Material Issuance'}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {issuance ? 'Update issuance details and line items' : 'Issue multiple raw materials in one transaction'}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="p-4 space-y-4">
            <h4 className="font-semibold text-sm">Issuance Details</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="header.issuanceDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issuance Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value instanceof Date && !isNaN(field.value.getTime()) ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        data-testid="input-issuance-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.issuedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issued To</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ""} placeholder="Department/Person" data-testid="input-issued-to" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product (Optional)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-product">
                          <SelectValue placeholder="Select product to auto-load BOM" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">-- None --</SelectItem>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.productName} ({product.productCode})
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
                name="header.productionReference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Production Reference (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ""} 
                        placeholder="Batch ID / FG Name / Shift No" 
                        data-testid="input-production-reference" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="header.plannedOutput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned Output (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        step="0.01"
                        value={field.value || ""} 
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="Expected production quantity" 
                        data-testid="input-planned-output" 
                      />
                    </FormControl>
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
              <h4 className="font-semibold text-sm">Material Items</h4>
              <Button type="button" variant="outline" size="sm" onClick={addItem} data-testid="button-add-item">
                <Plus className="w-4 h-4 mr-2" />
                Add off-BOM Item
              </Button>
            </div>

            {items.map((_, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h5 className="text-sm font-medium">Item {index + 1}</h5>
                      {items[index]?.calculationBasis && items[index].calculationBasis !== 'manual' && (
                        <Badge variant="secondary" className="text-xs" data-testid={`badge-calculation-${index}`}>
                          {items[index].calculationBasis}
                        </Badge>
                      )}
                    </div>
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
                      name={`items.${index}.rawMaterialId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Raw Material</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid={`select-raw-material-${index}`}>
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {rawMaterials.map((material) => (
                                <SelectItem key={material.id} value={material.id}>
                                  {material.materialName} (Stock: {material.currentStock || 0})
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

                    {items[index]?.suggestedQuantity !== undefined && (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Suggested Quantity</label>
                        <div className="flex items-center h-9 px-3 border rounded-md bg-muted text-sm" data-testid={`display-suggested-${index}`}>
                          {items[index].suggestedQuantity?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name={`items.${index}.quantityIssued`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity Issued (Actual)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
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
              {saveMutation.isPending ? "Saving..." : (issuance ? "Update Issuance" : "Create Issuance")}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}
