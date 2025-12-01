/**
 * BOM Quantity Calculation Utilities
 * 
 * Calculates suggested material quantities based on:
 * - Planned production output
 * - Product BOM requirements
 * - Raw Material Type conversion formulas
 */

export type CalculationMethod = 'formula-based' | 'direct-value' | 'output-coverage' | 'manual';

export interface RawMaterialTypeConversion {
  conversionMethod: CalculationMethod;
  
  // Formula-Based fields
  baseUnitWeight?: number;          // e.g., 25 kg bag
  weightPerDerivedUnit?: number;    // e.g., 21g per preform
  derivedValuePerBase?: number;     // Calculated: baseUnitWeight / weightPerDerivedUnit (e.g., 1190 pcs/bag)
  
  // Direct-Value fields  
  pcsPerBase?: number;              // e.g., 6930 pcs per box (derivedValuePerBase)
  
  // Output-Coverage fields
  outputUnitsCovered?: number;      // e.g., 2500 bottles per kg of label
  
  // Common
  lossPercent?: number;             // e.g., 5% loss
  usableUnits?: number;             // Auto-calculated: conversionValue × (1 - loss%)
}

export interface BOMCalculationInput {
  plannedOutput: number;            // e.g., 12000 bottles
  quantityRequired: number;         // From BOM: quantity per unit (usually 1)
  typeConversion: RawMaterialTypeConversion | null; // Null when material has no type assigned
}

export interface BOMCalculationResult {
  rawMaterialId: string;            // ID of the raw material
  uomId: string | null;             // Unit of measure ID
  suggestedQuantity: number;        // Calculated quantity to issue
  calculationBasis: CalculationMethod;
  calculationDetails: string;       // Human-readable explanation
  roundedQuantity: number;          // Suggested quantity rounded up
}

/**
 * Calculate suggested quantity using Formula-Based method
 * Formula: (quantityPerUnit × plannedOutput ÷ usableUnitsPerBase)
 * 
 * Example: Preform 21g in 25kg bags
 * - baseUnitWeight: 25000g (25kg bag)
 * - weightPerDerivedUnit: 21g per preform
 * - pcsPerBag: 25000 / 21 = 1190 pcs
 * - usableUnits: 1190 × (1 - 0.05) = 1130 pcs (after 5% loss)
 * - For 12,000 bottles: (1 × 12000 ÷ 1130) = 10.6 bags
 */
function calculateFormulaBased(input: BOMCalculationInput): number {
  const { typeConversion, plannedOutput, quantityRequired } = input;
  
  if (!typeConversion || !typeConversion.baseUnitWeight || !typeConversion.weightPerDerivedUnit) {
    return 0; // Missing required data
  }
  
  // Calculate pieces per base unit
  const pcsPerBase = typeConversion.baseUnitWeight / typeConversion.weightPerDerivedUnit;
  
  // Apply loss percentage (ensure it doesn't make usableUnits zero or negative)
  const lossPercent = Math.min(typeConversion.lossPercent || 0, 99); // Cap at 99%
  const usableUnits = pcsPerBase * (1 - lossPercent / 100);
  
  // Guard against divide by zero
  if (usableUnits <= 0) {
    return 0;
  }
  
  // Calculate required quantity
  const required = (quantityRequired * plannedOutput) / usableUnits;
  
  return required;
}

/**
 * Calculate suggested quantity using Direct-Value method
 * Formula: (quantityPerUnit × plannedOutput ÷ pcsPerBase)
 * 
 * Example: Cap 28mm in boxes
 * - derivedValuePerBase: 6930 pcs per box
 * - For 12,000 bottles: (1 × 12000 ÷ 6930) = 1.73 boxes
 */
function calculateDirectValue(input: BOMCalculationInput): number {
  const { typeConversion, plannedOutput, quantityRequired } = input;
  
  if (!typeConversion) return 0;
  
  const pcsPerBase = typeConversion.derivedValuePerBase || typeConversion.pcsPerBase;
  
  if (!pcsPerBase) {
    return 0; // Missing required data
  }
  
  // Apply loss percentage (ensure it doesn't make usableUnits zero or negative)
  const lossPercent = Math.min(typeConversion.lossPercent || 0, 99); // Cap at 99%
  const usableUnits = pcsPerBase * (1 - lossPercent / 100);
  
  // Guard against divide by zero
  if (usableUnits <= 0) {
    return 0;
  }
  
  // Calculate required quantity
  const required = (quantityRequired * plannedOutput) / usableUnits;
  
  return required;
}

/**
 * Calculate suggested quantity using Output-Coverage method
 * Formula: (plannedOutput ÷ outputUnitsCovered)
 * 
 * Example: Label Roll covering 2500 bottles per kg
 * - outputUnitsCovered: 2500 bottles per kg
 * - For 12,000 bottles: (12000 ÷ 2500) = 4.8 kg
 */
function calculateOutputCoverage(input: BOMCalculationInput): number {
  const { typeConversion, plannedOutput } = input;
  
  if (!typeConversion || !typeConversion.outputUnitsCovered) {
    return 0; // Missing required data
  }
  
  // Apply loss percentage (ensure it doesn't make effectiveCoverage zero or negative)
  const lossPercent = Math.min(typeConversion.lossPercent || 0, 99); // Cap at 99%
  const effectiveCoverage = typeConversion.outputUnitsCovered * (1 - lossPercent / 100);
  
  // Guard against divide by zero
  if (effectiveCoverage <= 0) {
    return 0;
  }
  
  // Calculate required quantity
  const required = plannedOutput / effectiveCoverage;
  
  return required;
}

/**
 * Normalize conversion method string to standard slug format
 * Handles legacy DB values like "Direct", "Formula-Based", etc.
 */
function normalizeConversionMethod(method: string | undefined | null): CalculationMethod {
  if (!method) return 'manual';
  
  const lowercased = method.toLowerCase().trim();
  
  // Map all known variants to standard slugs
  if (lowercased.includes('formula')) return 'formula-based';
  if (lowercased.includes('direct')) return 'direct-value';
  if (lowercased.includes('output') || lowercased.includes('coverage')) return 'output-coverage';
  if (lowercased.includes('manual')) return 'manual';
  
  // Default to manual for unknown methods
  return 'manual';
}

/**
 * Main calculation function - dispatches to appropriate method
 */
export function calculateSuggestedQuantity(input: BOMCalculationInput, rawMaterialId: string, uomId: string | null): BOMCalculationResult {
  const { typeConversion, plannedOutput, quantityRequired } = input;
  let suggestedQuantity = 0;
  let calculationDetails = '';
  let calculationBasis: CalculationMethod = 'manual';
  
  // Handle missing type conversion data - use basic BOM calculation as fallback
  if (!typeConversion) {
    // Basic BOM calculation: plannedOutput × quantityRequired
    suggestedQuantity = plannedOutput * quantityRequired;
    calculationDetails = `Basic BOM: ${plannedOutput} units × ${quantityRequired} per unit (no type conversion)`;
    calculationBasis = 'manual'; // Mark as manual since no conversion formula exists
    
    return {
      rawMaterialId,
      uomId,
      suggestedQuantity: Math.max(0, suggestedQuantity),
      calculationBasis,
      calculationDetails,
      roundedQuantity: Math.ceil(Math.max(0, suggestedQuantity)),
    };
  }
  
  // Normalize conversion method to handle all DB format variants
  const normalizedMethod = normalizeConversionMethod(typeConversion.conversionMethod);
  calculationBasis = normalizedMethod;
  
  switch (normalizedMethod) {
    case 'formula-based':
      suggestedQuantity = calculateFormulaBased(input);
      calculationDetails = `Formula-Based: ${input.plannedOutput} units ÷ ${typeConversion.usableUnits || 'N/A'} usable units per base`;
      break;
      
    case 'direct-value':
      suggestedQuantity = calculateDirectValue(input);
      calculationDetails = `Direct-Value: ${input.plannedOutput} units ÷ ${typeConversion.pcsPerBase || typeConversion.derivedValuePerBase || 'N/A'} pcs per base`;
      break;
      
    case 'output-coverage':
      suggestedQuantity = calculateOutputCoverage(input);
      calculationDetails = `Output-Coverage: ${input.plannedOutput} units ÷ ${typeConversion.outputUnitsCovered || 'N/A'} units covered`;
      break;
      
    case 'manual':
    default:
      // For manual mode with type conversion, still use basic BOM calc
      suggestedQuantity = plannedOutput * quantityRequired;
      calculationDetails = `Manual (BOM-based): ${plannedOutput} units × ${quantityRequired} per unit`;
      break;
  }
  
  // Prevent Infinity from divide-by-zero scenarios
  if (!isFinite(suggestedQuantity)) {
    suggestedQuantity = 0;
    calculationDetails += ' (Invalid: Division by zero or loss >= 100%)';
  }
  
  return {
    rawMaterialId,
    uomId,
    suggestedQuantity: Math.max(0, suggestedQuantity), // Never negative
    calculationBasis,
    calculationDetails,
    roundedQuantity: Math.ceil(Math.max(0, suggestedQuantity)), // Round up for safety
  };
}

/**
 * FIFO lot allocation entry
 * Shows how much quantity is allocated from each batch
 */
export interface LotAllocation {
  rawMaterialId: string;
  materialCode: string | null;
  materialName: string | null;
  batchCode: string | null;
  receivedDate: string | null;
  availableStock: number;
  allocatedQuantity: number;
  remainingStock: number;
}

/**
 * Extended result for type-based BOM calculations
 * Includes FIFO allocation breakdown when quantity spans multiple batches
 */
export interface BOMCalculationResultExtended extends BOMCalculationResult {
  typeId: string | null;
  typeName: string | null;
  availableRawMaterials: Array<{
    id: string;
    materialCode: string | null;
    materialName: string | null;
    currentStock: number;
    receivedDate: string | null;
    batchCode: string | null;
  }>;
  selectionRequired: boolean; // True if user must select from multiple options (deprecated - use allocations)
  outOfStock: boolean; // True if no raw materials have stock
  
  // FIFO allocation breakdown
  allocations: LotAllocation[]; // Ordered oldest-first, shows how quantity is distributed
  totalAvailableStock: number; // Sum of all available stock across batches
  insufficientStock: boolean; // True if suggested quantity exceeds available stock
  allocationSummary: string; // Human-readable summary e.g. "LOT-20241015: 50kg + LOT-20241120: 30kg"
}

/**
 * Generate batch code from received date if not already set
 */
function getBatchCode(batchCode: string | null, receivedDate: string | null): string {
  if (batchCode) return batchCode;
  if (!receivedDate) return 'Unknown';
  
  const date = new Date(receivedDate);
  if (isNaN(date.getTime())) return 'Unknown';
  
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `LOT-${dateStr}`;
}

/**
 * Calculate FIFO allocation for a given quantity across available batches
 * Returns allocation array ordered oldest-first
 */
function calculateFIFOAllocation(
  suggestedQuantity: number,
  availableRawMaterials: Array<{
    id: string;
    materialCode: string | null;
    materialName: string | null;
    currentStock: number;
    receivedDate: string | null;
    batchCode: string | null;
  }>
): { allocations: LotAllocation[]; totalAvailableStock: number; insufficientStock: boolean; allocationSummary: string } {
  const allocations: LotAllocation[] = [];
  let remainingToAllocate = suggestedQuantity;
  let totalAvailableStock = 0;
  
  // Materials are already sorted by receivedDate (oldest first)
  for (const rm of availableRawMaterials) {
    totalAvailableStock += rm.currentStock;
    
    if (remainingToAllocate <= 0) {
      // No more to allocate, but still track available stock
      allocations.push({
        rawMaterialId: rm.id,
        materialCode: rm.materialCode,
        materialName: rm.materialName,
        batchCode: getBatchCode(rm.batchCode, rm.receivedDate),
        receivedDate: rm.receivedDate,
        availableStock: rm.currentStock,
        allocatedQuantity: 0,
        remainingStock: rm.currentStock,
      });
      continue;
    }
    
    const allocatedFromThis = Math.min(remainingToAllocate, rm.currentStock);
    remainingToAllocate -= allocatedFromThis;
    
    allocations.push({
      rawMaterialId: rm.id,
      materialCode: rm.materialCode,
      materialName: rm.materialName,
      batchCode: getBatchCode(rm.batchCode, rm.receivedDate),
      receivedDate: rm.receivedDate,
      availableStock: rm.currentStock,
      allocatedQuantity: allocatedFromThis,
      remainingStock: rm.currentStock - allocatedFromThis,
    });
  }
  
  const insufficientStock = remainingToAllocate > 0;
  
  // Generate human-readable summary
  const usedAllocations = allocations.filter(a => a.allocatedQuantity > 0);
  let allocationSummary = '';
  if (usedAllocations.length === 0) {
    allocationSummary = 'No stock available';
  } else if (usedAllocations.length === 1) {
    const a = usedAllocations[0];
    allocationSummary = `${a.batchCode}: ${a.allocatedQuantity.toFixed(2)}`;
  } else {
    allocationSummary = usedAllocations
      .map(a => `${a.batchCode}: ${a.allocatedQuantity.toFixed(2)}`)
      .join(' + ');
  }
  
  if (insufficientStock) {
    allocationSummary += ` (Short: ${remainingToAllocate.toFixed(2)})`;
  }
  
  return { allocations, totalAvailableStock, insufficientStock, allocationSummary };
}

/**
 * Batch calculate suggested quantities for multiple BOM items
 * Supports both:
 * - New type-based BOM (materialTypeId with availableRawMaterials)
 * - Legacy material-based BOM (rawMaterialId directly)
 * 
 * Returns FIFO allocation breakdown showing how quantity is distributed across batches
 */
export function calculateBOMSuggestions(
  plannedOutput: number,
  bomItems: Array<{
    bom: { 
      rawMaterialId?: string | null; 
      materialTypeId?: string | null;
      quantityRequired: number; 
      uom: string | null 
    };
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
  }>
): Map<string, BOMCalculationResultExtended> {
  const results = new Map<string, BOMCalculationResultExtended>();
  
  // Guard against invalid input
  if (!bomItems || !Array.isArray(bomItems) || bomItems.length === 0) {
    return results;
  }
  
  for (const item of bomItems) {
    // Skip items missing BOM data
    if (!item || !item.bom) {
      console.warn('[BOM Calculation] Skipping invalid BOM item', item);
      continue;
    }
    
    // Resolve UOM ID: effectiveUomId (UUID) or legacy display name as fallback
    const uomId = item.effectiveUomId || item.bom.uom;
    
    // Parse and validate quantityRequired
    const quantityRequired = Number(item.bom.quantityRequired);
    if (isNaN(quantityRequired) || quantityRequired < 0) {
      console.warn('[BOM Calculation] Invalid quantityRequired', item.bom);
      continue;
    }
    
    // Determine the raw material to use
    const availableRawMaterials = item.availableRawMaterials || [];
    let outOfStock = availableRawMaterials.length === 0;
    
    // Calculate suggested quantity using type conversion formulas
    // Use empty rawMaterialId as we'll allocate across batches
    const baseResult = calculateSuggestedQuantity(
      {
        plannedOutput,
        quantityRequired,
        typeConversion: item.type || null,
      },
      '', // rawMaterialId will be determined by FIFO allocation
      uomId
    );
    
    // Calculate FIFO allocation across batches
    const { allocations, totalAvailableStock, insufficientStock, allocationSummary } = 
      calculateFIFOAllocation(baseResult.roundedQuantity, availableRawMaterials);
    
    // For backward compatibility: select first batch (oldest) for rawMaterialId
    // This is the primary batch that will be used
    let selectedRawMaterialId = '';
    let selectionRequired = false;
    
    if (item.bom.rawMaterialId && !item.bom.materialTypeId) {
      // Legacy: Direct raw material reference
      selectedRawMaterialId = item.bom.rawMaterialId;
    } else if (allocations.length > 0 && allocations[0].allocatedQuantity > 0) {
      // Use oldest batch with allocation as the primary material
      selectedRawMaterialId = allocations[0].rawMaterialId;
      // Selection required if allocation spans multiple batches
      selectionRequired = allocations.filter(a => a.allocatedQuantity > 0).length > 1;
    }
    
    // Create key based on type or material (prefer typeId for new entries)
    const resultKey = item.typeId || item.bom.materialTypeId || item.bom.rawMaterialId || `bom-${results.size}`;
    
    // Extended result with type info and FIFO allocation
    const extendedResult: BOMCalculationResultExtended = {
      ...baseResult,
      rawMaterialId: selectedRawMaterialId,
      typeId: item.typeId || item.bom.materialTypeId || null,
      typeName: item.type?.name || null,
      availableRawMaterials,
      selectionRequired,
      outOfStock,
      // FIFO allocation fields
      allocations,
      totalAvailableStock,
      insufficientStock,
      allocationSummary,
    };
    
    // Add out-of-stock note to calculation details
    if (outOfStock) {
      extendedResult.calculationDetails = `No stock available for ${item.type?.name || 'this material type'}`;
      extendedResult.suggestedQuantity = 0;
      extendedResult.roundedQuantity = 0;
    } else if (insufficientStock) {
      extendedResult.calculationDetails += ` (Insufficient stock: need ${baseResult.roundedQuantity}, have ${totalAvailableStock})`;
    }
    
    results.set(resultKey, extendedResult);
  }
  
  return results;
}
