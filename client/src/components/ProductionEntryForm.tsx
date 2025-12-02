import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertProductionEntrySchema, type RawMaterialIssuance } from "@shared/schema";
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
import { AlertCircle, Info } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const formSchema = insertProductionEntrySchema.omit({ createdBy: true, derivedUnits: true });

type FormData = z.infer<typeof formSchema>;

interface IssuanceSummary {
  issuance: RawMaterialIssuance & { items: any[] };
  product: any;
  bomItems: any[];
}

interface ProductionEntryFormProps {
  entry?: any;
  onClose: () => void;
}

export default function ProductionEntryForm({ entry, onClose }: ProductionEntryFormProps) {
  const { toast } = useToast();
  const [selectedIssuanceId, setSelectedIssuanceId] = useState<string>("");
  const [showBOMComparison, setShowBOMComparison] = useState(false);

  const { data: issuances = [] } = useQuery<RawMaterialIssuance[]>({
    queryKey: ['/api/raw-material-issuances'],
  });

  // Fetch UOMs for finished goods UOM selection
  const { data: uomList = [] } = useQuery<{ id: string; name: string; abbreviation?: string }[]>({
    queryKey: ['/api/uoms'],
  });

  const { data: issuanceSummary, isLoading: isLoadingSummary } = useQuery<IssuanceSummary>({
    queryKey: ['/api/raw-material-issuances', selectedIssuanceId, 'summary'],
    enabled: !!selectedIssuanceId && selectedIssuanceId !== "",
  });

  // Fetch opening bottles balance from last production entry (only for new entries)
  const { data: openingBottlesData } = useQuery<{ openingBalance: number; fromEntry: any }>({
    queryKey: ['/api/production-entries/opening-bottles'],
    enabled: !entry, // Only fetch for new entries, not when editing
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      issuanceId: "",
      productionDate: new Date(),
      shift: 'A',
      uomId: "", // Default UOM for finished goods
      batchNumber: "", // Will be auto-generated server-side if empty
      producedQuantity: 0,
      rejectedQuantity: 0,
      emptyBottlesOpening: 0,
      emptyBottlesProduced: 0,
      emptyBottlesUsed: 0,
      emptyBottlesPending: 0,
      remarks: "",
    },
  });

  const producedQuantity = form.watch('producedQuantity');
  const emptyBottlesOpening = form.watch('emptyBottlesOpening');
  const emptyBottlesProduced = form.watch('emptyBottlesProduced');
  const emptyBottlesUsed = form.watch('emptyBottlesUsed');
  
  // State for additional produced bottles (from other sources, not from preform blow molding)
  const [additionalProduced, setAdditionalProduced] = useState<number>(0);

  // Calculate bottles from issuance based on preform-type materials
  // Formula: Σ (quantityIssued × conversionValue) for preform materials
  // Note: Use conversionValue (full potential) NOT usableUnits (which has loss % applied)
  // Loss % is for reconciliation variance check, not for potential calculation
  const calculateBottlesFromIssuance = (): { 
    total: number; 
    breakdown: { name: string; qty: number; conversionValue: number; bottles: number; lossPercent: number }[] 
  } => {
    if (!issuanceSummary?.issuance?.items || !issuanceSummary?.bomItems) {
      return { total: 0, breakdown: [] };
    }
    
    const breakdown: { name: string; qty: number; conversionValue: number; bottles: number; lossPercent: number }[] = [];
    let total = 0;
    
    // Match each issuance item to its BOM item to get type details
    for (const item of issuanceSummary.issuance.items) {
      // Find matching BOM item for this raw material
      const bomItem = issuanceSummary.bomItems.find(bom => 
        bom.rawMaterialId === item.rawMaterialId || 
        (bom.availableRawMaterials && bom.availableRawMaterials.some((rm: any) => rm.id === item.rawMaterialId))
      );
      
      if (bomItem?.typeDetails) {
        const typeDetails = bomItem.typeDetails;
        // Only count materials that produce empty bottles/pieces (preforms)
        // Check if derivedUnit is Piece, Bottle, or similar
        const derivedUnit = typeDetails.derivedUnit?.toLowerCase() || '';
        const typeName = typeDetails.typeName?.toLowerCase() || '';
        
        const isPreformType = 
          derivedUnit.includes('piece') || 
          derivedUnit.includes('bottle') ||
          typeName.includes('preform') ||
          typeName.includes('pet');
        
        // Use conversionValue (full potential) instead of usableUnits (which has loss % applied)
        const conversionValue = Number(typeDetails.conversionValue) || Number(typeDetails.usableUnits) || 0;
        const lossPercent = Number(typeDetails.lossPercent) || 0;
        
        if (isPreformType && conversionValue > 0) {
          const qty = Number(item.quantityIssued) || 0;
          const bottles = Math.round(qty * conversionValue);
          
          breakdown.push({
            name: typeDetails.typeName || 'Unknown',
            qty,
            conversionValue,
            bottles,
            lossPercent
          });
          total += bottles;
        }
      }
    }
    
    return { total, breakdown };
  };
  
  const bottlesFromIssuance = calculateBottlesFromIssuance();

  // Calculate bottles used from cases produced
  // Formula: Cases Produced × Bottles Per Case (from product's derivedValuePerBase)
  const calculateUsedFromCases = (): { total: number; casesProduced: number; bottlesPerCase: number } => {
    const casesProduced = Number(producedQuantity) || 0;
    const bottlesPerCase = Number(issuanceSummary?.product?.derivedValuePerBase) || 0;
    return {
      total: Math.round(casesProduced * bottlesPerCase),
      casesProduced,
      bottlesPerCase
    };
  };
  
  const usedFromCases = calculateUsedFromCases();

  // Auto-set "Used" field = Used from Cases only (no additional used)
  useEffect(() => {
    form.setValue('emptyBottlesUsed', usedFromCases.total);
  }, [usedFromCases.total, form]);

  // Auto-calculate pending when opening, produced, additional produced, or used changes
  // Formula: Pending = Opening + Total Produced - Used
  // Total Produced = Blow-molded + Additional Produced
  // Validation: Total Produced cannot exceed Potential (from preforms issued)
  useEffect(() => {
    const opening = Number(emptyBottlesOpening) || 0;
    const blowMolded = Number(emptyBottlesProduced) || 0;
    const additional = additionalProduced || 0;
    const totalProduced = blowMolded + additional;
    const used = Number(emptyBottlesUsed) || 0;
    const availableBottles = opening + totalProduced;
    const pending = availableBottles - used;
    const potential = bottlesFromIssuance.total;
    
    // Validate: Total Produced cannot exceed Potential from preforms
    if (potential > 0 && totalProduced > potential) {
      form.setError('emptyBottlesProduced', {
        type: 'manual',
        message: `Total produced (${totalProduced.toLocaleString()}) cannot exceed potential from preforms (${potential.toLocaleString()})`
      });
    } else {
      form.clearErrors('emptyBottlesProduced');
    }
    
    // Validate: Used cannot exceed available bottles
    if (used > availableBottles) {
      form.setError('emptyBottlesUsed', {
        type: 'manual',
        message: `Cannot use more than available (${availableBottles.toLocaleString()} bottles)`
      });
    } else {
      form.clearErrors('emptyBottlesUsed');
    }
    
    // Allow negative pending to show deficit clearly
    form.setValue('emptyBottlesPending', pending);
  }, [emptyBottlesOpening, emptyBottlesProduced, additionalProduced, emptyBottlesUsed, bottlesFromIssuance.total, form]);

  // Set opening balance from last production entry when data loads (for new entries)
  useEffect(() => {
    if (!entry && openingBottlesData?.openingBalance !== undefined) {
      form.setValue('emptyBottlesOpening', openingBottlesData.openingBalance);
    }
  }, [entry, openingBottlesData, form]);

  useEffect(() => {
    if (entry) {
      form.reset({
        issuanceId: entry.issuanceId,
        productionDate: entry.productionDate ? new Date(entry.productionDate) : new Date(),
        shift: entry.shift || 'A',
        producedQuantity: Number(entry.producedQuantity) || 0,
        rejectedQuantity: Number(entry.rejectedQuantity) || 0,
        emptyBottlesOpening: Number(entry.emptyBottlesOpening) || 0,
        emptyBottlesProduced: Number(entry.emptyBottlesProduced) || 0,
        emptyBottlesUsed: Number(entry.emptyBottlesUsed) || 0,
        emptyBottlesPending: Number(entry.emptyBottlesPending) || 0,
        remarks: entry.remarks || "",
      });
      setSelectedIssuanceId(entry.issuanceId);
    }
  }, [entry, form]);

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest('POST', '/api/production-entries', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/production-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/production-entries/opening-bottles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/finished-goods'], exact: false });
      toast({
        title: "Success",
        description: "Production entry created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      let errorMessage = "Failed to create production entry";
      
      if (error.status === 409) {
        errorMessage = "A production entry already exists for this issuance, date, and shift combination";
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

  const onSubmit = (data: FormData) => {
    // Include Additional Produced in the emptyBottlesProduced field
    // Total Produced = Blow-molded + Additional Produced
    const totalProduced = (Number(data.emptyBottlesProduced) || 0) + additionalProduced;
    
    // Calculate derived units: producedQuantity × (usableDerivedUnits or derivedValuePerBase)
    const unitsMultiplier = Number(issuanceSummary?.product?.usableDerivedUnits) || 
                            Number(issuanceSummary?.product?.derivedValuePerBase) || 0;
    const derivedUnits = unitsMultiplier > 0 
      ? Number(data.producedQuantity) * unitsMultiplier
      : 0;
    
    // Get productId from issuance OR from the product object in summary
    const productId = issuanceSummary?.issuance?.productId || issuanceSummary?.product?.id || null;
    
    if (!productId) {
      toast({
        title: "Error",
        description: "The selected issuance does not have a product linked. Please edit the issuance to add a product first.",
        variant: "destructive",
      });
      return;
    }
    
    const submissionData = {
      ...data,
      productId,
      emptyBottlesProduced: totalProduced,
      derivedUnits: derivedUnits,
    };
    createMutation.mutate(submissionData as any);
  };

  const handleIssuanceChange = (issuanceId: string) => {
    setSelectedIssuanceId(issuanceId);
    form.setValue('issuanceId', issuanceId);
    setShowBOMComparison(false);
  };

  const calculateDerivedUnits = (): string => {
    // Use usableDerivedUnits or fall back to derivedValuePerBase
    const unitsMultiplier = Number(issuanceSummary?.product?.usableDerivedUnits) || 
                            Number(issuanceSummary?.product?.derivedValuePerBase) || 0;
    if (!unitsMultiplier || !producedQuantity) {
      return "0.00";
    }
    const derived = Number(producedQuantity) * unitsMultiplier;
    return derived.toFixed(2);
  };
  
  // Get the effective derived units multiplier (for display)
  const getEffectiveDerivedUnits = (): number => {
    return Number(issuanceSummary?.product?.usableDerivedUnits) || 
           Number(issuanceSummary?.product?.derivedValuePerBase) || 0;
  };

  const calculateExpectedQuantity = (bomItem: any): number => {
    if (!producedQuantity || !bomItem.typeDetails) return 0;

    // Transform bomItem to the structure calculateBOMSuggestions expects
    // issuanceSummary.bomItems has spread ...item.bom + typeDetails + typeId
    // calculateBOMSuggestions expects { bom: {...}, type: {...}, typeId: ... }
    const transformedItem = {
      bom: {
        rawMaterialId: bomItem.rawMaterialId,
        materialTypeId: bomItem.materialTypeId,
        quantityRequired: bomItem.quantityRequired,
        uom: bomItem.uom,
      },
      material: bomItem.material,
      type: bomItem.typeDetails, // typeDetails -> type
      typeId: bomItem.typeId || bomItem.materialTypeId,
      effectiveUomId: bomItem.effectiveUomId,
      availableRawMaterials: bomItem.availableRawMaterials,
    };

    const suggestions = calculateBOMSuggestions(Number(producedQuantity), [transformedItem]);
    // The result map uses typeId || materialTypeId || rawMaterialId as key
    const key = bomItem.typeId || bomItem.materialTypeId || bomItem.rawMaterialId;
    return suggestions.get(key)?.suggestedQuantity || 0;
  };

  const getIssuedQuantity = (bomItem: any): number => {
    if (!issuanceSummary?.issuance?.items) return 0;
    
    // Match issuance items by:
    // 1. Direct rawMaterialId match (if BOM has specific raw material)
    // 2. Or check if issued raw material is in BOM's availableRawMaterials list
    const issuedItem = issuanceSummary.issuance.items.find(item => {
      // Direct match by rawMaterialId
      if (bomItem.rawMaterialId && item.rawMaterialId === bomItem.rawMaterialId) {
        return true;
      }
      // Match by material type - check if issued material is in available list
      if (bomItem.availableRawMaterials) {
        return bomItem.availableRawMaterials.some((rm: any) => rm.id === item.rawMaterialId);
      }
      return false;
    });
    return issuedItem ? Number(issuedItem.quantityIssued) : 0;
  };

  const calculateVariance = (expected: number, issued: number): number => {
    return issued - expected;
  };

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Issuance Selection */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Issuance Details</h3>
            
            <FormField
              control={form.control}
              name="issuanceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raw Material Issuance</FormLabel>
                  <Select 
                    onValueChange={handleIssuanceChange} 
                    value={selectedIssuanceId}
                    disabled={!!entry}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-issuance">
                        <SelectValue placeholder="Select issuance..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {issuances.map((iss) => (
                        <SelectItem key={iss.id} value={iss.id!}>
                          {iss.issuanceNumber} - {new Date(iss.issuanceDate).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {issuanceSummary && (
              <div className="mt-4 space-y-2 p-4 bg-muted rounded-md">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Issuance Information</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Product:</span>{" "}
                    <span className="font-medium">
                      {issuanceSummary.product?.productName || "No product linked"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Planned Output:</span>{" "}
                    <span className="font-medium">
                      {issuanceSummary.issuance?.plannedOutput || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Issued To:</span>{" "}
                    <span className="font-medium">
                      {issuanceSummary.issuance?.issuedTo || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Production Ref:</span>{" "}
                    <span className="font-medium">
                      {issuanceSummary.issuance?.productionReference || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Production Entry Details */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Production Entry</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="productionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Production Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                        data-testid="input-production-date"
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
                    <FormLabel>Shift</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-shift">
                          <SelectValue placeholder="Select shift..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A">Shift A</SelectItem>
                        <SelectItem value="B">Shift B</SelectItem>
                        <SelectItem value="General">General</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="uomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Finished Goods UOM</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-uom">
                          <SelectValue placeholder="Select UOM (default: Case)..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {uomList.map((uom) => (
                          <SelectItem key={uom.id} value={uom.id}>
                            {uom.name} {uom.abbreviation ? `(${uom.abbreviation})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">Leave empty to default to "Case"</p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="batchNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Auto-generated if empty (YYMMDD-PROD-SHIFT-SEQ)"
                        {...field}
                        value={field.value || ""}
                        data-testid="input-batch-number"
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">Leave empty for auto-generated batch number</p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="producedQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produced Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-produced-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rejectedQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rejected Quantity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-rejected-quantity"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Derived Units Display */}
            {issuanceSummary?.product && (
              <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-muted-foreground">Calculated Derived Units:</span>
                    {getEffectiveDerivedUnits() > 0 ? (
                      <>
                        <p className="text-2xl font-bold text-primary">{calculateDerivedUnits()}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          = {producedQuantity} × {getEffectiveDerivedUnits()} (bottles per case)
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-medium text-amber-600 dark:text-amber-400">Not Configured</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Set up derivedValuePerBase in Product Master to calculate derived units
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Empty Bottles Section */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Empty Bottles Tracking</h3>
            
            {/* Preform Issuance & Hopper Analysis */}
            {bottlesFromIssuance.total > 0 && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-md">
                <div className="grid grid-cols-5 gap-4">
                  {/* Potential from Issuance (full conversion) */}
                  <div>
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Potential (100%)</span>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{bottlesFromIssuance.total.toLocaleString()}</p>
                    <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {bottlesFromIssuance.breakdown.map((item, idx) => (
                        <div key={idx}>
                          {item.qty} bags × {item.conversionValue.toLocaleString()}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Total Produced (Blow-molded + Additional) */}
                  <div>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Total Produced</span>
                    {(() => {
                      const totalProduced = Number(emptyBottlesProduced) + additionalProduced;
                      const potential = bottlesFromIssuance.total;
                      const isOverLimit = totalProduced > potential;
                      return (
                        <>
                          <p className={`text-2xl font-bold ${isOverLimit ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                            {totalProduced.toLocaleString()}
                          </p>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            = {Number(emptyBottlesProduced).toLocaleString()} + {additionalProduced.toLocaleString()}
                          </p>
                          {isOverLimit && (
                            <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                              Exceeds potential!
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  
                  {/* Left in Hopper - Reusable for next day */}
                  <div>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Left in Hopper</span>
                    {(() => {
                      const totalProduced = Number(emptyBottlesProduced) + additionalProduced;
                      const leftInHopper = bottlesFromIssuance.total - totalProduced;
                      return (
                        <>
                          <p className={`text-2xl font-bold ${leftInHopper >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                            {leftInHopper.toLocaleString()} pcs
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            Reusable for next day
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  
                  {/* Bags to Return - Full bags only */}
                  <div>
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Bags to Return</span>
                    {(() => {
                      const totalProduced = Number(emptyBottlesProduced) + additionalProduced;
                      const leftInHopper = bottlesFromIssuance.total - totalProduced;
                      const firstBreakdown = bottlesFromIssuance.breakdown[0];
                      const conversionValue = firstBreakdown?.conversionValue || 1;
                      const fullBagsToReturn = Math.floor(leftInHopper / conversionValue);
                      const remainingInHopper = leftInHopper - (fullBagsToReturn * conversionValue);
                      return (
                        <>
                          <p className={`text-2xl font-bold ${fullBagsToReturn > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'}`}>
                            {fullBagsToReturn} bags
                          </p>
                          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                            = {(fullBagsToReturn * conversionValue).toLocaleString()} pcs
                          </p>
                        </>
                      );
                    })()}
                  </div>
                  
                  {/* Remaining in Hopper - Carries forward */}
                  <div>
                    <span className="text-sm font-medium text-teal-700 dark:text-teal-300">Hopper Carry Forward</span>
                    {(() => {
                      const totalProduced = Number(emptyBottlesProduced) + additionalProduced;
                      const leftInHopper = bottlesFromIssuance.total - totalProduced;
                      const firstBreakdown = bottlesFromIssuance.breakdown[0];
                      const conversionValue = firstBreakdown?.conversionValue || 1;
                      const fullBagsToReturn = Math.floor(leftInHopper / conversionValue);
                      const remainingInHopper = leftInHopper - (fullBagsToReturn * conversionValue);
                      const carryForwardPercent = conversionValue > 0 ? (remainingInHopper / conversionValue) * 100 : 0;
                      return (
                        <>
                          <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                            {remainingInHopper.toLocaleString()} pcs
                          </p>
                          <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                            ≈ {carryForwardPercent.toFixed(0)}% of 1 bag
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Use in next issuance
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-5 gap-3">
              <FormField
                control={form.control}
                name="emptyBottlesOpening"
                render={({ field }) => {
                  // Opening is read-only if we have previous entry data OR if editing an existing entry
                  const hasPreviousEntry = openingBottlesData?.fromEntry || (openingBottlesData?.openingBalance ?? 0) > 0;
                  const isReadOnly = entry || hasPreviousEntry;
                  
                  return (
                    <FormItem>
                      <FormLabel>Opening</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="1" 
                          {...field}
                          onChange={(e) => !isReadOnly && field.onChange(parseFloat(e.target.value) || 0)}
                          readOnly={isReadOnly}
                          className={isReadOnly ? "bg-muted" : ""}
                          data-testid="input-empty-bottles-opening"
                        />
                      </FormControl>
                      {!entry && openingBottlesData?.fromEntry && (
                        <p className="text-xs text-muted-foreground">
                          From {new Date(openingBottlesData.fromEntry.productionDate).toLocaleDateString()} (Shift {openingBottlesData.fromEntry.shift})
                        </p>
                      )}
                      {entry && (
                        <p className="text-xs text-muted-foreground">
                          Carried from previous
                        </p>
                      )}
                      {!entry && !openingBottlesData?.fromEntry && (
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          First entry - editable
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="emptyBottlesProduced"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Produced (Blow-molded)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="1" 
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        data-testid="input-empty-bottles-produced"
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      From preform blow molding
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Additional Produced - From other sources */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Additional Produced</label>
                <Input 
                  type="number" 
                  step="1"
                  value={additionalProduced}
                  onChange={(e) => setAdditionalProduced(parseFloat(e.target.value) || 0)}
                  data-testid="input-empty-bottles-additional-produced"
                />
                <p className="text-xs text-muted-foreground">
                  From other sources
                </p>
              </div>

              {/* Used - Show cases, derive bottles */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Used (for Filling)</label>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    value={usedFromCases.casesProduced}
                    readOnly
                    className="bg-muted w-24"
                    data-testid="input-empty-bottles-used-cases"
                  />
                  <span className="text-sm text-muted-foreground">cases</span>
                </div>
                {usedFromCases.bottlesPerCase > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400">
                    = {usedFromCases.casesProduced.toLocaleString()} × {usedFromCases.bottlesPerCase} = <strong>{usedFromCases.total.toLocaleString()} bottles</strong>
                  </p>
                )}
              </div>

              <FormField
                control={form.control}
                name="emptyBottlesPending"
                render={({ field }) => {
                  const pendingValue = Number(field.value) || 0;
                  const isDeficit = pendingValue < 0;
                  return (
                    <FormItem>
                      <FormLabel>Pending (Closing)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          {...field}
                          readOnly
                          className={`font-medium ${isDeficit ? 'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400' : 'bg-muted'}`}
                          data-testid="input-empty-bottles-pending"
                        />
                      </FormControl>
                      <p className={`text-xs ${isDeficit ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                        {isDeficit ? 'Deficit! Need more bottles' : '= Available - Total Used'}
                      </p>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            
            {/* Summary calculation */}
            <div className="mt-3 pt-3 border-t text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  <strong>Available:</strong> Opening ({Number(emptyBottlesOpening).toLocaleString()}) + Produced ({Number(emptyBottlesProduced).toLocaleString()}) + Additional ({additionalProduced.toLocaleString()})
                </span>
                <span className="font-medium">
                  = {(Number(emptyBottlesOpening) + Number(emptyBottlesProduced) + additionalProduced).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  <strong>Used:</strong> For filling {usedFromCases.casesProduced.toLocaleString()} cases
                </span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  = {usedFromCases.total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="font-semibold">Pending (Closing):</span>
                {(() => {
                  const pending = Number(form.watch('emptyBottlesPending')) || 0;
                  const isDeficit = pending < 0;
                  return (
                    <span className={`font-bold ${isDeficit ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                      {pending.toLocaleString()}
                      {isDeficit && ' (Deficit)'}
                    </span>
                  );
                })()}
              </div>
            </div>
          </Card>

          {/* BOM Variance Analysis */}
          {issuanceSummary?.bomItems && issuanceSummary.bomItems.length > 0 && producedQuantity > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">BOM Variance Analysis</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBOMComparison(!showBOMComparison)}
                  data-testid="button-toggle-bom"
                >
                  {showBOMComparison ? "Hide" : "Show"} Details
                </Button>
              </div>

              {showBOMComparison && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>UOM</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Expected Qty</TableHead>
                        <TableHead className="text-right">Issued Qty</TableHead>
                        <TableHead className="text-right">Variance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {issuanceSummary.bomItems.map((bomItem) => {
                        const expected = calculateExpectedQuantity(bomItem);
                        const issued = getIssuedQuantity(bomItem);
                        const variance = calculateVariance(expected, issued);
                        
                        return (
                          <TableRow key={bomItem.id}>
                            <TableCell className="font-medium">
                              {bomItem.material?.materialName || "Unknown"}
                            </TableCell>
                            <TableCell>
                              {bomItem.typeDetails?.typeName || "N/A"}
                            </TableCell>
                            <TableCell>
                              {bomItem.typeDetails?.baseUnit || "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {bomItem.typeDetails?.conversionMethod || "N/A"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{expected.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{issued.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                              <span className={variance > 0 ? "text-yellow-600" : variance < 0 ? "text-red-600" : "text-green-600"}>
                                {variance > 0 ? "+" : ""}{variance.toFixed(2)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          )}

          {/* Remarks */}
          <Card className="p-6">
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Remarks</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional notes..." 
                      {...field} 
                      value={field.value || ""}
                      data-testid="input-remarks"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Card>

          {/* Form Actions */}
          <div className="flex justify-end gap-2">
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
              disabled={createMutation.isPending}
              data-testid="button-submit"
            >
              {createMutation.isPending ? "Creating..." : "Create Production Entry"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
