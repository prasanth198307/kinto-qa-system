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
  typeConversion: RawMaterialTypeConversion;
}

export interface BOMCalculationResult {
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
  
  if (!typeConversion.baseUnitWeight || !typeConversion.weightPerDerivedUnit) {
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
  
  if (!typeConversion.outputUnitsCovered) {
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
export function calculateSuggestedQuantity(input: BOMCalculationInput): BOMCalculationResult {
  const { typeConversion } = input;
  let suggestedQuantity = 0;
  let calculationDetails = '';
  
  // Normalize conversion method to handle all DB format variants
  const normalizedMethod = normalizeConversionMethod(typeConversion.conversionMethod);
  
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
      suggestedQuantity = 0;
      calculationDetails = 'Manual entry required';
      break;
  }
  
  // Prevent Infinity from divide-by-zero scenarios
  if (!isFinite(suggestedQuantity)) {
    suggestedQuantity = 0;
    calculationDetails += ' (Invalid: Division by zero or loss >= 100%)';
  }
  
  return {
    suggestedQuantity: Math.max(0, suggestedQuantity), // Never negative
    calculationBasis: normalizedMethod || 'manual',
    calculationDetails,
    roundedQuantity: Math.ceil(Math.max(0, suggestedQuantity)), // Round up for safety
  };
}

/**
 * Batch calculate suggested quantities for multiple BOM items
 */
export function calculateBOMSuggestions(
  plannedOutput: number,
  bomItems: Array<{
    rawMaterialId: string;
    quantityRequired: number;
    typeConversion: RawMaterialTypeConversion;
  }>
): Map<string, BOMCalculationResult> {
  const results = new Map<string, BOMCalculationResult>();
  
  for (const item of bomItems) {
    const result = calculateSuggestedQuantity({
      plannedOutput,
      quantityRequired: item.quantityRequired,
      typeConversion: item.typeConversion,
    });
    
    results.set(item.rawMaterialId, result);
  }
  
  return results;
}
