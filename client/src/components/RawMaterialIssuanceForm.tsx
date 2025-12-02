import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type RawMaterial, type Product, type Uom, type RawMaterialIssuance, type RawMaterialIssuanceItem } from "@shared/schema";
import { calculateBOMSuggestions, type LotAllocation, type BOMCalculationResultExtended } from "@shared/calculations";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, AlertCircle, Package, Calendar } from "lucide-react";

const formHeaderSchema = z.object({
  issuanceDate: z.coerce.date(),
  issuedTo: z.string().min(1, "Issued To is required"),
  productId: z.string().optional().transform(val => val || undefined),
  productionReference: z.string().optional(),
  plannedOutput: z.coerce.number().optional().transform(val => Number.isFinite(val) ? val : undefined),
  remarks: z.string().optional(),
});

const formItemSchema = z.object({
  rawMaterialId: z.string().min(1, "Raw material is required"),
  productId: z.string().optional().transform(val => val || undefined),
  quantityIssued: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  suggestedQuantity: z.coerce.number().optional().transform(val => val || undefined),
  calculationBasis: z.enum(['formula-based', 'direct-value', 'output-coverage', 'manual']).optional().nullable(),
  uomId: z.string().optional().transform(val => val || undefined),
  remarks: z.string().optional(),
});

const formSchema = z.object({
  header: formHeaderSchema,
  items: z.array(formItemSchema).min(1, "At least one item is required"),
});

type FormData = z.infer<typeof formSchema>;

interface ExtendedFormItem {
  rawMaterialId: string;
  productId: string;
  quantityIssued: number;
  suggestedQuantity: number | undefined;
  calculationBasis: 'formula-based' | 'direct-value' | 'output-coverage' | 'manual' | undefined;
  uomId: string;
  remarks: string;
  _typeId?: string | null;
  _typeName?: string | null;
  _allocations?: LotAllocation[];
  _allocationSummary?: string;
  _insufficientStock?: boolean;
  _totalAvailableStock?: number;
  _isBomItem?: boolean;
}

interface RawMaterialIssuanceFormProps {
  issuance: RawMaterialIssuance | null;
  onClose: () => void;
}

function BatchAllocationDisplay({ 
  allocations, 
  allocationSummary, 
  insufficientStock,
  totalAvailableStock,
  quantityIssued 
}: { 
  allocations: LotAllocation[];
  allocationSummary: string;
  insufficientStock: boolean;
  totalAvailableStock: number;
  quantityIssued: number;
}) {
  const usedAllocations = allocations.filter(a => a.allocatedQuantity > 0);
  
  if (usedAllocations.length === 0) {
    return (
      <div className="text-sm text-muted-foreground flex items-center gap-1">
        <AlertCircle className="w-4 h-4 text-yellow-500" />
        No stock available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-muted-foreground font-medium">FIFO Allocation (Oldest First):</div>
      <div className="space-y-1">
        {usedAllocations.map((allocation, idx) => (
          <div 
            key={allocation.rawMaterialId} 
            className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1"
            data-testid={`allocation-${idx}`}
          >
            <Package className="w-3 h-3 text-muted-foreground" />
            <Badge variant="outline" className="text-xs font-mono">
              {allocation.batchCode}
            </Badge>
            {allocation.receivedDate && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(allocation.receivedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
            <span className="ml-auto font-medium">
              {allocation.allocatedQuantity.toFixed(2)}
            </span>
            <span className="text-xs text-muted-foreground">
              (of {allocation.availableStock})
            </span>
          </div>
        ))}
      </div>
      
      {insufficientStock && (
        <div className="flex items-center gap-1 text-sm text-destructive">
          <AlertCircle className="w-4 h-4" />
          Insufficient stock: need {quantityIssued}, have {totalAvailableStock}
        </div>
      )}
      
      {usedAllocations.length > 1 && (
        <div className="text-xs text-muted-foreground italic">
          Production will use material from {usedAllocations.length} batches
        </div>
      )}
    </div>
  );
}

interface BomConfiguration {
  id: string;
  productId: string;
  configName: string;
  description?: string | null;
  isDefault: number;
}

export default function RawMaterialIssuanceForm({ issuance, onClose }: RawMaterialIssuanceFormProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<ExtendedFormItem[]>([{ 
    rawMaterialId: "", 
    productId: "", 
    quantityIssued: 0,
    suggestedQuantity: undefined,
    calculationBasis: undefined,
    uomId: "", 
    remarks: "",
    _isBomItem: false,
  }]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | undefined>(undefined);

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
      items: items.map(i => ({
        rawMaterialId: i.rawMaterialId,
        productId: i.productId,
        quantityIssued: i.quantityIssued,
        suggestedQuantity: i.suggestedQuantity,
        calculationBasis: i.calculationBasis,
        uomId: i.uomId,
        remarks: i.remarks,
      })),
    },
  });

  // Use state-based tracking for Safari compatibility
  // react-hook-form's watch() doesn't reliably trigger useEffect in Safari
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [plannedOutput, setPlannedOutput] = useState<number | undefined>(undefined);

  // Subscribe to form changes for Safari compatibility
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'header.productId' || name === 'header' || !name) {
        const newProductId = value.header?.productId;
        if (newProductId !== selectedProductId) {
          setSelectedProductId(newProductId);
        }
      }
      if (name === 'header.plannedOutput' || name === 'header' || !name) {
        const newPlannedOutput = value.header?.plannedOutput;
        if (newPlannedOutput !== plannedOutput) {
          setPlannedOutput(newPlannedOutput);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form, selectedProductId, plannedOutput]);

  // Fetch BOM configurations for selected product
  const { data: bomConfigurations = [], isLoading: isConfigLoading } = useQuery<BomConfiguration[]>({
    queryKey: ['/api/products', selectedProductId, 'bom-configurations'],
    enabled: !!selectedProductId && selectedProductId !== "",
  });

  // Auto-select default configuration when product changes
  useEffect(() => {
    if (bomConfigurations.length > 0 && !selectedConfigId) {
      const defaultConfig = bomConfigurations.find(c => c.isDefault === 1);
      if (defaultConfig) {
        setSelectedConfigId(defaultConfig.id);
      } else if (bomConfigurations.length === 1) {
        setSelectedConfigId(bomConfigurations[0].id);
      }
    }
  }, [bomConfigurations, selectedConfigId]);

  // Reset config when product changes
  useEffect(() => {
    setSelectedConfigId(undefined);
  }, [selectedProductId]);

  const { data: bomData, isLoading: isBomLoading } = useQuery<{
    items: Array<{
      bom: any;
      material: any;
      type: any;
      typeId?: string | null;
      effectiveUomId?: string | null;
      availableRawMaterials?: Array<{
        id: string;
        materialCode: string | null;
        materialName: string | null;
        currentStock: number;
        receivedDate: string | null;
        batchCode: string | null;
      }>;
    }>;
    metadata: {
      productId: string;
      productName: string;
      totalItems: number;
      lastUpdatedAt: Date | null;
      configurationId?: string | null;
      configurationName?: string | null;
    };
  }>({
    queryKey: selectedConfigId 
      ? ['/api/products', selectedProductId, 'bom-with-types', { configurationId: selectedConfigId }]
      : ['/api/products', selectedProductId, 'bom-with-types'],
    enabled: !!selectedProductId && selectedProductId !== "",
  });

  useEffect(() => {
    if (issuance && issuanceItems.length > 0) {
      const mappedItems: ExtendedFormItem[] = issuanceItems.map(item => ({
        rawMaterialId: item.rawMaterialId,
        productId: item.productId || "",
        quantityIssued: Number(item.quantityIssued) || 0,
        suggestedQuantity: item.suggestedQuantity ? Number(item.suggestedQuantity) : undefined,
        calculationBasis: item.calculationBasis as 'formula-based' | 'direct-value' | 'output-coverage' | 'manual' | undefined,
        uomId: item.uomId || "",
        remarks: item.remarks || "",
        _isBomItem: false,
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
        items: mappedItems.map(i => ({
          rawMaterialId: i.rawMaterialId,
          productId: i.productId,
          quantityIssued: i.quantityIssued,
          suggestedQuantity: i.suggestedQuantity,
          calculationBasis: i.calculationBasis,
          uomId: i.uomId,
          remarks: i.remarks,
        })),
      });
    }
  }, [issuance, issuanceItems, form]);

  useEffect(() => {
    if (issuance) return;
    if (!bomData || !bomData.items || !plannedOutput || plannedOutput <= 0) return;

    const suggestionsMap = calculateBOMSuggestions(plannedOutput, bomData.items);
    
    const bomItems: ExtendedFormItem[] = Array.from(suggestionsMap.values())
      .filter(suggestion => !suggestion.outOfStock)
      .map(suggestion => ({
        rawMaterialId: suggestion.rawMaterialId || suggestion.allocations[0]?.rawMaterialId || "",
        productId: selectedProductId || "",
        quantityIssued: suggestion.roundedQuantity,
        suggestedQuantity: suggestion.suggestedQuantity,
        calculationBasis: suggestion.calculationBasis,
        uomId: suggestion.uomId || "",
        remarks: suggestion.calculationDetails || "",
        _typeId: suggestion.typeId,
        _typeName: suggestion.typeName,
        _allocations: suggestion.allocations,
        _allocationSummary: suggestion.allocationSummary,
        _insufficientStock: suggestion.insufficientStock,
        _totalAvailableStock: suggestion.totalAvailableStock,
        _isBomItem: true,
      }));

    const outOfStockCount = Array.from(suggestionsMap.values()).filter(s => s.outOfStock).length;

    if (bomItems.length > 0) {
      setItems(bomItems);
      form.setValue('items', bomItems.map(i => ({
        rawMaterialId: i.rawMaterialId,
        productId: i.productId,
        quantityIssued: i.quantityIssued,
        suggestedQuantity: i.suggestedQuantity,
        calculationBasis: i.calculationBasis,
        uomId: i.uomId,
        remarks: i.remarks,
      })));
      
      let description = `${bomItems.length} materials auto-populated`;
      if (bomData.metadata.configurationName) {
        description += ` from "${bomData.metadata.configurationName}" BOM`;
      } else {
        description += ` from product BOM`;
      }
      const multiBatchCount = bomItems.filter(i => (i._allocations?.filter(a => a.allocatedQuantity > 0).length || 0) > 1).length;
      if (multiBatchCount > 0) {
        description += ` (${multiBatchCount} using multiple batches)`;
      }
      if (outOfStockCount > 0) {
        description += ` (${outOfStockCount} out of stock)`;
      }
      
      toast({
        title: "BOM Loaded with FIFO Allocation",
        description,
      });
    } else if (outOfStockCount > 0) {
      toast({
        title: "No Stock Available",
        description: `${outOfStockCount} materials in BOM have no available stock`,
        variant: "destructive",
      });
    }
  }, [bomData, plannedOutput, selectedProductId, issuance, form, toast]);

  const recalculateAllocations = (index: number, newQuantity: number) => {
    const item = items[index];
    if (!item._isBomItem || !bomData) return;
    
    const bomItem = bomData.items.find(b => 
      (b.typeId === item._typeId) || (b.bom?.materialTypeId === item._typeId)
    );
    if (!bomItem?.availableRawMaterials) return;

    let remainingToAllocate = newQuantity;
    let totalAvailable = 0;
    const newAllocations: LotAllocation[] = [];

    for (const rm of bomItem.availableRawMaterials) {
      totalAvailable += rm.currentStock;
      const allocated = Math.min(remainingToAllocate, rm.currentStock);
      remainingToAllocate -= allocated;
      
      const batchCode = rm.batchCode || (rm.receivedDate 
        ? `LOT-${new Date(rm.receivedDate).toISOString().slice(0, 10).replace(/-/g, '')}`
        : 'Unknown');
      
      newAllocations.push({
        rawMaterialId: rm.id,
        materialCode: rm.materialCode,
        materialName: rm.materialName,
        batchCode,
        receivedDate: rm.receivedDate,
        availableStock: rm.currentStock,
        allocatedQuantity: allocated,
        remainingStock: rm.currentStock - allocated,
      });
    }

    const newItems = [...items];
    newItems[index] = {
      ...item,
      quantityIssued: newQuantity,
      rawMaterialId: newAllocations[0]?.rawMaterialId || item.rawMaterialId,
      _allocations: newAllocations,
      _insufficientStock: remainingToAllocate > 0,
      _totalAvailableStock: totalAvailable,
      _allocationSummary: newAllocations
        .filter(a => a.allocatedQuantity > 0)
        .map(a => `${a.batchCode}: ${a.allocatedQuantity.toFixed(2)}`)
        .join(' + ') || 'No stock',
    };
    setItems(newItems);
    form.setValue(`items.${index}.quantityIssued`, newQuantity);
    form.setValue(`items.${index}.rawMaterialId`, newItems[index].rawMaterialId);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      // Validate product is selected (required for production entry linking)
      if (!data.header.productId || data.header.productId.trim() === '') {
        throw new Error('Product selection is required for issuance');
      }
      
      const apiPayload = {
        header: {
          issuanceDate: data.header.issuanceDate instanceof Date ? data.header.issuanceDate.toISOString() : data.header.issuanceDate,
          issuedTo: data.header.issuedTo,
          productId: data.header.productId.trim(),
          productionReference: data.header.productionReference?.trim() || "",
          plannedOutput: Number.isFinite(data.header.plannedOutput) ? data.header.plannedOutput : null,
          remarks: data.header.remarks?.trim() || "",
          bomConfigurationId: selectedConfigId || null, // Track which BOM configuration was used
        },
        items: data.items.map(item => ({
          rawMaterialId: item.rawMaterialId,
          productId: item.productId?.trim() || null,
          quantityIssued: item.quantityIssued,
          suggestedQuantity: item.suggestedQuantity || null,
          calculationBasis: item.calculationBasis || null,
          uomId: item.uomId?.trim() || null,
          remarks: item.remarks?.trim() || "",
        })),
      };
      
      if (issuance) {
        return await apiRequest('PATCH', `/api/raw-material-issuances/${issuance.id}`, apiPayload);
      } else {
        return await apiRequest('POST', '/api/raw-material-issuances', apiPayload);
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
    const newItems: ExtendedFormItem[] = [...items, { 
      rawMaterialId: "", 
      productId: "", 
      quantityIssued: 0,
      suggestedQuantity: undefined,
      calculationBasis: 'manual',
      uomId: "", 
      remarks: "",
      _isBomItem: false,
    }];
    setItems(newItems);
    form.setValue('items', newItems.map(i => ({
      rawMaterialId: i.rawMaterialId,
      productId: i.productId,
      quantityIssued: i.quantityIssued,
      suggestedQuantity: i.suggestedQuantity,
      calculationBasis: i.calculationBasis,
      uomId: i.uomId,
      remarks: i.remarks,
    })));
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      form.setValue('items', newItems.map(i => ({
        rawMaterialId: i.rawMaterialId,
        productId: i.productId,
        quantityIssued: i.quantityIssued,
        suggestedQuantity: i.suggestedQuantity,
        calculationBasis: i.calculationBasis,
        uomId: i.uomId,
        remarks: i.remarks,
      })));
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
      remarks: "",
      _isBomItem: false,
    }]);
    onClose();
  };

  const onSubmit = (data: FormData) => {
    // Defensive validation: Ensure all items have valid rawMaterialId
    const invalidItems = data.items.filter((item, index) => !item.rawMaterialId || item.rawMaterialId.trim() === '');
    if (invalidItems.length > 0) {
      const invalidCount = invalidItems.length;
      toast({
        title: "Missing Raw Materials",
        description: `${invalidCount} item(s) have no raw material selected. Please select a raw material for each line or remove items without stock.`,
        variant: "destructive",
      });
      return;
    }
    
    saveMutation.mutate(data);
  };

  return (
    <Card className="p-4 mb-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold" data-testid="form-title">
          {issuance ? 'Edit Raw Material Issuance' : 'Create Raw Material Issuance'}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {issuance ? 'Update issuance details and line items' : 'Issue multiple raw materials in one transaction. Select a product and planned output for automatic BOM-based allocation.'}
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
                rules={{ required: "Product is required for issuance" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product <span className="text-destructive">*</span></FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value)} 
                      value={field.value || ""}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-product">
                          <SelectValue placeholder="Select product (required)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
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

              {/* BOM Configuration Selector - only shows when product has multiple configs */}
              {selectedProductId && bomConfigurations.length > 0 && (
                <FormItem>
                  <FormLabel>BOM Configuration</FormLabel>
                  <Select 
                    onValueChange={(value) => setSelectedConfigId(value === "none" ? undefined : value)} 
                    value={selectedConfigId || "none"}
                    disabled={isConfigLoading}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-bom-config">
                        <SelectValue placeholder={isConfigLoading ? "Loading..." : "Select BOM configuration"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {bomConfigurations.length === 0 && (
                        <SelectItem value="none">-- No configurations --</SelectItem>
                      )}
                      {bomConfigurations.map((config) => (
                        <SelectItem key={config.id} value={config.id}>
                          {config.configName}
                          {config.isDefault === 1 && " (Default)"}
                          {config.description && ` - ${config.description}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {bomConfigurations.length > 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      This product has {bomConfigurations.length} BOM configurations. Select the one to use for this issuance.
                    </p>
                  )}
                </FormItem>
              )}

              <FormField
                control={form.control}
                name="header.plannedOutput"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Planned Output (triggers BOM calculation)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        step="1"
                        value={field.value || ""} 
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="e.g., 12000 bottles" 
                        data-testid="input-planned-output" 
                      />
                    </FormControl>
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
                Add Manual Item
              </Button>
            </div>

            {isBomLoading && selectedProductId && (
              <div className="text-sm text-muted-foreground p-4 border rounded-md">
                Loading BOM data...
              </div>
            )}

            {items.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="text-sm font-medium">
                        {item._isBomItem && item._typeName ? (
                          <>Material Type: <span className="text-primary">{item._typeName}</span></>
                        ) : (
                          `Item ${index + 1}`
                        )}
                      </h5>
                      {item._isBomItem && (
                        <Badge variant="secondary" className="text-xs" data-testid={`badge-bom-${index}`}>
                          From BOM
                        </Badge>
                      )}
                      {item.calculationBasis && item.calculationBasis !== 'manual' && (
                        <Badge variant="outline" className="text-xs" data-testid={`badge-calculation-${index}`}>
                          {item.calculationBasis}
                        </Badge>
                      )}
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {item._isBomItem ? (
                      <>
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Selected Batch (FIFO - Oldest First)</label>
                          <div className="flex items-center h-9 px-3 border rounded-md bg-muted text-sm" data-testid={`display-batch-${index}`}>
                            {item._allocations && item._allocations[0] ? (
                              <span className="flex items-center gap-2">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {item._allocations[0].batchCode}
                                </Badge>
                                <span className="text-muted-foreground">
                                  {item._allocations[0].materialName}
                                </span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">No batch available</span>
                            )}
                          </div>
                        </div>

                        {item.suggestedQuantity !== undefined && (
                          <div className="space-y-1">
                            <label className="text-sm font-medium">BOM Suggested Quantity</label>
                            <div className="flex items-center h-9 px-3 border rounded-md bg-muted text-sm" data-testid={`display-suggested-${index}`}>
                              {item.suggestedQuantity.toFixed(2)}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <FormField
                        control={form.control}
                        name={`items.${index}.rawMaterialId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Raw Material</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Auto-populate UOM from raw material
                                const selectedMaterial = rawMaterials.find(m => m.id === value);
                                if (selectedMaterial?.uomId) {
                                  form.setValue(`items.${index}.uomId`, selectedMaterial.uomId);
                                  // Also update local items state
                                  setItems(prev => prev.map((item, i) => 
                                    i === index ? { ...item, rawMaterialId: value, uomId: selectedMaterial.uomId! } : item
                                  ));
                                }
                              }} 
                              value={field.value}
                            >
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
                    )}

                    <FormField
                      control={form.control}
                      name={`items.${index}.quantityIssued`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantity to Issue</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={field.value || ""}
                              onChange={(e) => {
                                const newValue = parseFloat(e.target.value) || 0;
                                if (item._isBomItem) {
                                  recalculateAllocations(index, newValue);
                                } else {
                                  field.onChange(newValue);
                                }
                              }}
                              data-testid={`input-quantity-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {item._isBomItem ? (
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Unit of Measure</label>
                        <div className="flex items-center h-9 px-3 border rounded-md bg-muted text-sm" data-testid={`display-uom-${index}`}>
                          {uoms.find(u => u.id === item.uomId)?.name || item.uomId || "—"}
                        </div>
                      </div>
                    ) : (
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
                    )}

                    {!item._isBomItem && (
                      <FormField
                        control={form.control}
                        name={`items.${index}.productId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ""}>
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
                    )}
                  </div>

                  {item._isBomItem && item._allocations && item._allocations.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <BatchAllocationDisplay 
                        allocations={item._allocations}
                        allocationSummary={item._allocationSummary || ""}
                        insufficientStock={item._insufficientStock || false}
                        totalAvailableStock={item._totalAvailableStock || 0}
                        quantityIssued={item.quantityIssued}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name={`items.${index}.remarks`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Item Remarks (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} data-testid={`input-item-remarks-${index}`} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
