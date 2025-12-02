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
      producedCases: 0,
      rejectedCases: 0,
      emptyBottlesProduced: 0,
      emptyBottlesUsed: 0,
      emptyBottlesPending: 0,
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
        producedCases: reconciliation.producedCases || 0,
        rejectedCases: reconciliation.rejectedCases || 0,
        emptyBottlesProduced: reconciliation.emptyBottlesProduced || 0,
        emptyBottlesUsed: reconciliation.emptyBottlesUsed || 0,
        emptyBottlesPending: reconciliation.emptyBottlesPending || 0,
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

  // Filter productions for selected issuance (defined early for use in calculations)
  // In edit mode, ensure the current production entry is always available even if not in filtered list
  let filteredProductions = productions.filter(p => p.issuanceId === selectedIssuanceId);
  
  if (reconciliation && reconciliation.productionEntryId) {
    const currentProduction = productions.find(p => p.id === reconciliation.productionEntryId);
    if (currentProduction && !filteredProductions.find(p => p.id === currentProduction.id)) {
      filteredProductions = [currentProduction, ...filteredProductions];
    }
  }

  // Get selected production entry data
  const selectedProduction = filteredProductions.find(p => p.id === selectedProductionId);
  const producedCases = selectedProduction ? Number(selectedProduction.producedQuantity) || 0 : 0;
  
  // Get empty bottles data from production entry (already entered by operator)
  const productionEmptyBottlesUsed = selectedProduction ? Number(selectedProduction.emptyBottlesUsed) || 0 : 0;
  const productionEmptyBottlesPending = selectedProduction ? Number(selectedProduction.emptyBottlesPending) || 0 : 0;

  // Find BOM item for a raw material (shared helper)
  const findBomItem = (rawMaterialId: string): any => {
    if (!issuanceSummary?.bomItems) return null;
    
    return issuanceSummary.bomItems.find((b: any) => {
      // Direct raw material match
      if (b.rawMaterialId === rawMaterialId) return true;
      // Check if raw material belongs to BOM's material type
      if (b.availableRawMaterials) {
        return b.availableRawMaterials.some((rm: any) => rm.id === rawMaterialId);
      }
      return false;
    });
  };

  // Calculate expected usage from BOM based on PRODUCTION (what was actually produced)
  const calculateProductionDemand = (rawMaterialId: string): number => {
    if (!producedCases) return 0;
    
    const bomItem = findBomItem(rawMaterialId);
    if (!bomItem) return 0;
    
    // Production Demand = Produced Cases × BOM quantity per case
    const quantityPerCase = Number(bomItem.quantityRequired || bomItem.bom?.quantityRequired) || 0;
    return Math.round(producedCases * quantityPerCase * 100) / 100;
  };

  // Get issuance capacity in cases (how many cases was the issuance planned for)
  const getIssuanceCapacity = (): number => {
    if (!issuanceSummary?.issuance) return 0;
    // The issuance is made for a planned output quantity (cases)
    return Number(issuanceSummary.issuance.plannedOutput) || 0;
  };

  // Calculate expected usage from BOM based on ISSUANCE capacity (what store issued for)
  const calculateExpectedFromIssuance = (rawMaterialId: string): number => {
    const issuanceCapacity = getIssuanceCapacity();
    if (!issuanceCapacity) return 0;
    
    const bomItem = findBomItem(rawMaterialId);
    if (!bomItem) return 0;
    
    // Expected from Issuance = Issuance Capacity (cases) × BOM quantity per case
    const quantityPerCase = Number(bomItem.quantityRequired || bomItem.bom?.quantityRequired) || 0;
    return Math.round(issuanceCapacity * quantityPerCase * 100) / 100;
  };

  // Get acceptable loss percent from raw material type (default 2%)
  const getAcceptableLossPercent = (rawMaterialId: string): number => {
    const bomItem = findBomItem(rawMaterialId);
    if (!bomItem) return 2; // Default 2%
    
    // Get loss percent from type details
    const typeDetails = bomItem.typeDetails || bomItem.type;
    if (typeDetails?.lossPercent !== undefined) {
      return Number(typeDetails.lossPercent) || 2;
    }
    
    // Check if raw material has its own loss percent
    const rawMaterial = bomItem.availableRawMaterials?.find((rm: any) => rm.id === rawMaterialId);
    if (rawMaterial?.lossPercent !== undefined) {
      return Number(rawMaterial.lossPercent) || 2;
    }
    
    return 2; // Default 2%
  };

  // Get pieces per bag from material type (for conversion display)
  const getPiecesPerBag = (rawMaterialId: string): number => {
    const bomItem = findBomItem(rawMaterialId);
    if (!bomItem) return 0;
    
    const typeDetails = bomItem.typeDetails || bomItem.type;
    if (typeDetails) {
      // Check different conversion methods
      // For direct-value: derivedValuePerBase = pieces per bag
      if (typeDetails.derivedValuePerBase) {
        return Number(typeDetails.derivedValuePerBase) || 0;
      }
      // For formula-based: calculate from weight
      if (typeDetails.baseUnitWeight && typeDetails.weightPerDerivedUnit) {
        const baseWeight = Number(typeDetails.baseUnitWeight) || 0;
        const weightPerPiece = Number(typeDetails.weightPerDerivedUnit) || 0;
        if (weightPerPiece > 0) {
          return Math.round((baseWeight * 1000) / weightPerPiece); // Convert kg to grams
        }
      }
      // Check conversionValue directly
      if (typeDetails.conversionValue) {
        return Number(typeDetails.conversionValue) || 0;
      }
    }
    
    // Check raw material itself
    const rawMaterial = bomItem.availableRawMaterials?.find((rm: any) => rm.id === rawMaterialId);
    if (rawMaterial?.conversionValue) {
      return Number(rawMaterial.conversionValue) || 0;
    }
    
    return 0;
  };

  // Convert pieces to bags (decimal)
  const piecesToBags = (pieces: number, rawMaterialId: string): number => {
    const piecesPerBag = getPiecesPerBag(rawMaterialId);
    if (piecesPerBag <= 0) return 0;
    return Math.round((pieces / piecesPerBag) * 100) / 100; // 2 decimal places
  };

  // Convert bags to pieces
  const bagsToPieces = (bags: number, rawMaterialId: string): number => {
    const piecesPerBag = getPiecesPerBag(rawMaterialId);
    if (piecesPerBag <= 0) return 0;
    return Math.round(bags * piecesPerBag);
  };

  // Auto-populate items when issuance is selected (create mode only)
  // RULE: Used + Hopper + Returned = Issued (no variance means perfectly balanced)
  useEffect(() => {
    // Only auto-fill in create mode, when summary is loaded, and items are empty
    if (issuanceSummary && !reconciliation && items.length === 0 && selectedIssuanceId) {
      const issuanceItems = issuanceSummary.issuance.items.map((item: any) => {
        const issued = Number(item.quantityIssued) || 0;
        
        // Default: assume everything issued was used, nothing in hopper or to return
        // User will adjust based on actual production
        return {
          rawMaterialId: item.rawMaterialId,
          issuanceItemId: item.id,
          quantityIssued: issued,
          quantityUsed: issued, // Default: all issued was used
          quantityReturned: 0,  // Default: nothing to return
          quantityPending: 0,   // Default: nothing in hopper
          remarks: "",
        };
      });
      setItems(issuanceItems);
    }
  }, [issuanceSummary, reconciliation, items.length, selectedIssuanceId]);

  // When production entry is selected, update "Used" to production demand
  // This is the actual usage based on what was produced
  useEffect(() => {
    if (!reconciliation && selectedProductionId && items.length > 0 && producedCases > 0) {
      const updatedItems = items.map(item => {
        const issued = item.quantityIssued || 0;
        const productionDemand = calculateProductionDemand(item.rawMaterialId);
        
        // If production demand is available, use it as "Used"
        // Otherwise keep what was issued as default
        const used = productionDemand > 0 ? Math.min(productionDemand, issued) : issued;
        const pending = item.quantityPending || 0;
        const suggestedReturned = Math.max(0, issued - used - pending);
        
        return {
          ...item,
          quantityUsed: used,
          quantityReturned: suggestedReturned,
        };
      });
      setItems(updatedItems);
    }
  }, [selectedProductionId, producedCases]);


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
    // Only require items in create mode
    // In edit mode, allow updates even with zero items (for fixing data issues)
    if (!reconciliation && items.length === 0) {
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
    const item = { ...updatedItems[index], [field]: value };
    
    // When Used or Hopper (pending) changes, auto-suggest returned
    // This keeps the balance: Issued = Used + Hopper + Returned
    if (field === 'quantityPending' || field === 'quantityUsed') {
      const issued = item.quantityIssued || 0;
      const used = field === 'quantityUsed' ? (value || 0) : (item.quantityUsed || 0);
      const pending = field === 'quantityPending' ? (value || 0) : (item.quantityPending || 0);
      // Suggested returned = Issued - Used - Hopper
      item.quantityReturned = Math.max(0, issued - used - pending);
    }
    
    updatedItems[index] = item;
    setItems(updatedItems);
  };

  const calculateNetConsumed = (used: number, returned: number, pending: number): number => {
    return used - returned - pending;
  };

  // Calculate variance: Issued - Used - Returned - Pending (should be 0 if all accounted)
  const calculateVariance = (issued: number, used: number, returned: number, pending: number): number => {
    return issued - used - returned - pending;
  };

  // Get material name from issuance summary
  const getMaterialName = (rawMaterialId: string): string => {
    const issuanceItem = issuanceSummary?.issuance.items.find(
      (i: any) => i.rawMaterialId === rawMaterialId
    );
    return issuanceItem?.materialName || issuanceItem?.rawMaterial?.materialName || rawMaterialId.substring(0, 8) + '...';
  };

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
                      {reconciliation ? (
                        <div className="px-3 py-2 border rounded-md bg-muted text-muted-foreground" data-testid="select-issuance-readonly">
                          {issuances.find(i => i.id === field.value)?.issuanceNumber || 'Unknown'} - {issuances.find(i => i.id === field.value) ? format(new Date(issuances.find(i => i.id === field.value)!.issuanceDate), 'MMM dd, yyyy') : ''}
                        </div>
                      ) : (
                        <Select 
                          onValueChange={field.onChange}
                          value={field.value}
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
                      )}
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
                      {reconciliation ? (
                        <div className="px-3 py-2 border rounded-md bg-muted text-muted-foreground" data-testid="select-production-readonly">
                          {filteredProductions.find(p => p.id === field.value) 
                            ? `Shift ${filteredProductions.find(p => p.id === field.value)!.shift} - ${format(new Date(filteredProductions.find(p => p.id === field.value)!.productionDate), 'MMM dd')} (${filteredProductions.find(p => p.id === field.value)!.producedQuantity} units)`
                            : 'Unknown'}
                        </div>
                      ) : (
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
                      )}
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
                            <TableHead className="text-right">
                              <div className="flex flex-col items-end">
                                <span>Expected</span>
                                <span className="text-xs text-muted-foreground font-normal">(from Issuance)</span>
                              </div>
                            </TableHead>
                            <TableHead className="text-right">
                              <div className="flex flex-col items-end">
                                <span>Prod. Demand</span>
                                <span className="text-xs text-muted-foreground font-normal">({producedCases} cases)</span>
                              </div>
                            </TableHead>
                            <TableHead className="text-right">Used (pcs)</TableHead>
                            <TableHead className="text-right bg-amber-50 dark:bg-amber-950">
                              <div className="flex flex-col items-end">
                                <span>In Hopper</span>
                                <span className="text-xs text-amber-700 dark:text-amber-300 font-normal">(bags)</span>
                              </div>
                            </TableHead>
                            <TableHead className="text-right">
                              <div className="flex flex-col items-end">
                                <span>To Return</span>
                                <span className="text-xs text-muted-foreground font-normal">(bags)</span>
                              </div>
                            </TableHead>
                            <TableHead className="text-right">Variance</TableHead>
                            <TableHead>Remarks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item, index) => {
                            const issued = item.quantityIssued || 0;
                            const used = item.quantityUsed || 0;
                            const returned = item.quantityReturned || 0;
                            const pending = item.quantityPending || 0; // Hopper
                            const expectedFromIssuance = calculateExpectedFromIssuance(item.rawMaterialId);
                            const productionDemand = calculateProductionDemand(item.rawMaterialId);
                            const variance = calculateVariance(issued, used, returned, pending);
                            const variancePercent = issued > 0 ? Math.abs((variance / issued) * 100) : 0;
                            const acceptableLoss = getAcceptableLossPercent(item.rawMaterialId);
                            const isWithinTolerance = variancePercent <= acceptableLoss;

                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {getMaterialName(item.rawMaterialId)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline">{issued}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="secondary" className="text-xs">
                                    {expectedFromIssuance > 0 ? expectedFromIssuance.toFixed(0) : '-'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950">
                                    {productionDemand > 0 ? productionDemand.toFixed(0) : '-'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={used}
                                    onChange={(e) => updateItem(index, 'quantityUsed', Number(e.target.value))}
                                    className="w-20 text-right"
                                    data-testid={`input-used-${index}`}
                                  />
                                </TableCell>
                                <TableCell className="text-right bg-amber-50 dark:bg-amber-950">
                                  {(() => {
                                    const piecesPerBag = getPiecesPerBag(item.rawMaterialId);
                                    const hopperBags = piecesToBags(pending, item.rawMaterialId);
                                    return (
                                      <div className="flex flex-col items-end gap-1">
                                        {piecesPerBag > 0 ? (
                                          <>
                                            <div className="flex items-center gap-1">
                                              <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={hopperBags || ''}
                                                onChange={(e) => {
                                                  const bags = Number(e.target.value) || 0;
                                                  const pieces = bagsToPieces(bags, item.rawMaterialId);
                                                  updateItem(index, 'quantityPending', pieces);
                                                }}
                                                className="w-16 text-right border-amber-300 dark:border-amber-700"
                                                data-testid={`input-hopper-bags-${index}`}
                                                placeholder="0.00"
                                              />
                                              <span className="text-xs text-amber-700 dark:text-amber-300">bags</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                              = {pending} pcs
                                            </span>
                                          </>
                                        ) : (
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={pending}
                                            onChange={(e) => updateItem(index, 'quantityPending', Number(e.target.value))}
                                            className="w-20 text-right border-amber-300 dark:border-amber-700"
                                            data-testid={`input-hopper-${index}`}
                                            placeholder="Hopper"
                                          />
                                        )}
                                      </div>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell className="text-right">
                                  {(() => {
                                    const piecesPerBag = getPiecesPerBag(item.rawMaterialId);
                                    const returnBags = piecesToBags(returned, item.rawMaterialId);
                                    return (
                                      <div className="flex flex-col items-end gap-1">
                                        {piecesPerBag > 0 ? (
                                          <>
                                            <div className="flex items-center gap-1">
                                              <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={returnBags || ''}
                                                onChange={(e) => {
                                                  const bags = Number(e.target.value) || 0;
                                                  const pieces = bagsToPieces(bags, item.rawMaterialId);
                                                  updateItem(index, 'quantityReturned', pieces);
                                                }}
                                                className="w-16 text-right"
                                                data-testid={`input-returned-bags-${index}`}
                                                placeholder="0.00"
                                              />
                                              <span className="text-xs text-muted-foreground">bags</span>
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                              = {returned} pcs
                                            </span>
                                          </>
                                        ) : (
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={returned}
                                            onChange={(e) => updateItem(index, 'quantityReturned', Number(e.target.value))}
                                            className="w-20 text-right"
                                            data-testid={`input-returned-${index}`}
                                          />
                                        )}
                                      </div>
                                    );
                                  })()}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-col items-end gap-0.5">
                                    <div className="flex items-center gap-1">
                                      <Badge 
                                        variant={variance === 0 ? "secondary" : isWithinTolerance ? "outline" : "destructive"}
                                        className={variance === 0 || isWithinTolerance ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : ""}
                                        data-testid={`badge-variance-${index}`}
                                      >
                                        {variance === 0 ? '✓' : variance.toFixed(2)}
                                      </Badge>
                                      {variance !== 0 && (
                                        <span className={`text-xs ${isWithinTolerance ? 'text-green-600' : 'text-red-500'}`}>
                                          ({variancePercent.toFixed(1)}%)
                                        </span>
                                      )}
                                    </div>
                                    {variance !== 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        {isWithinTolerance ? `≤${acceptableLoss}% OK` : `>${acceptableLoss}% loss`}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="text"
                                    value={item.remarks || ""}
                                    onChange={(e) => updateItem(index, 'remarks', e.target.value)}
                                    placeholder="Notes"
                                    className="w-24"
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
                          <p className="font-medium">Material Reconciliation Rule</p>
                          <p className="text-blue-700 dark:text-blue-300">
                            • <strong>Issued = Used + Hopper + Returned + Loss</strong>
                          </p>
                          <p className="text-blue-700 dark:text-blue-300">
                            • <strong>Expected (from Issuance):</strong> BOM × {getIssuanceCapacity()} cases (planned output)
                          </p>
                          <p className="text-blue-700 dark:text-blue-300">
                            • <strong>Prod. Demand:</strong> BOM × {producedCases} cases (actually produced)
                          </p>
                          <p className="text-blue-700 dark:text-blue-300">
                            • <strong>Variance:</strong> Green ✓ if within loss %, Red if exceeds threshold
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
                  disabled={
                    createMutation.isPending || 
                    updateMutation.isPending || 
                    !watchedIssuanceId || 
                    !watchedProductionId || 
                    (!reconciliation && items.length === 0) // Only require items in create mode
                  }
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
