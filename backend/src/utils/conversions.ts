/**
 * Utility functions for unit conversions and calculations
 */

export type WeightUnit = 'g' | 'oz' | 'lb';

/**
 * Convert weight to grams (base unit for calculations)
 */
export function convertToGrams(weight: number, unit: WeightUnit): number {
  switch (unit) {
    case 'g':
      return weight;
    case 'oz':
      return weight * 28.3495; // 1 oz = 28.3495 grams
    case 'lb':
      return weight * 453.592; // 1 lb = 453.592 grams
    default:
      throw new Error(`Unsupported unit: ${unit}`);
  }
}

/**
 * Convert weight from grams to specified unit
 */
export function convertFromGrams(weightInGrams: number, targetUnit: WeightUnit): number {
  switch (targetUnit) {
    case 'g':
      return weightInGrams;
    case 'oz':
      return weightInGrams / 28.3495;
    case 'lb':
      return weightInGrams / 453.592;
    default:
      throw new Error(`Unsupported unit: ${targetUnit}`);
  }
}

/**
 * Convert weight between any two units
 */
export function convertWeight(weight: number, fromUnit: WeightUnit, toUnit: WeightUnit): number {
  if (fromUnit === toUnit) {
    return weight;
  }
  
  const weightInGrams = convertToGrams(weight, fromUnit);
  return convertFromGrams(weightInGrams, toUnit);
}

/**
 * Format weight with appropriate precision based on unit
 */
export function formatWeight(weight: number, unit: WeightUnit): string {
  let precision: number;
  
  switch (unit) {
    case 'g':
      precision = weight < 10 ? 1 : 0;
      break;
    case 'oz':
      precision = weight < 1 ? 2 : 1;
      break;
    case 'lb':
      precision = weight < 1 ? 3 : 2;
      break;
    default:
      precision = 2;
  }
  
  return `${weight.toFixed(precision)} ${unit}`;
}

/**
 * Get the most appropriate unit for display based on weight in grams
 */
export function getBestDisplayUnit(weightInGrams: number): WeightUnit {
  if (weightInGrams < 28.35) {
    return 'g'; // Less than 1 oz, show in grams
  } else if (weightInGrams < 453.6) {
    return 'oz'; // Less than 1 lb, show in ounces
  } else {
    return 'lb'; // 1 lb or more, show in pounds
  }
}

/**
 * Calculate weight difference for sequential ingredient additions
 */
export function calculateWeightDifference(
  currentWeight: number,
  currentUnit: WeightUnit,
  previousWeight: number,
  previousUnit: WeightUnit
): { difference: number; unit: WeightUnit } {
  const currentInGrams = convertToGrams(currentWeight, currentUnit);
  const previousInGrams = convertToGrams(previousWeight, previousUnit);
  
  const differenceInGrams = currentInGrams - previousInGrams;
  
  if (differenceInGrams <= 0) {
    throw new Error('Current weight must be greater than previous weight');
  }
  
  // Use the most appropriate unit for the difference
  const bestUnit = getBestDisplayUnit(differenceInGrams);
  const difference = convertFromGrams(differenceInGrams, bestUnit);
  
  return { difference, unit: bestUnit };
}

/**
 * Validate that weight values are reasonable for food items
 */
export function validateFoodWeight(weight: number, unit: WeightUnit): boolean {
  const weightInGrams = convertToGrams(weight, unit);
  
  // Reasonable range: 0.1g to 10kg
  return weightInGrams >= 0.1 && weightInGrams <= 10000;
}

/**
 * Round weight to appropriate precision for calculations
 */
export function roundWeight(weight: number, unit: WeightUnit): number {
  switch (unit) {
    case 'g':
      return Math.round(weight * 10) / 10; // Round to 0.1g
    case 'oz':
      return Math.round(weight * 100) / 100; // Round to 0.01oz
    case 'lb':
      return Math.round(weight * 1000) / 1000; // Round to 0.001lb
    default:
      return Math.round(weight * 100) / 100;
  }
}

/**
 * Convert nutrition values based on weight ratio
 * Used when scaling nutrition data from reference weight to actual weight
 */
export function scaleNutritionValues(
  baseNutrition: Record<string, number>,
  baseWeight: number,
  actualWeight: number,
  baseUnit: WeightUnit = 'g',
  actualUnit: WeightUnit = 'g'
): Record<string, number> {
  const baseWeightInGrams = convertToGrams(baseWeight, baseUnit);
  const actualWeightInGrams = convertToGrams(actualWeight, actualUnit);
  
  const ratio = actualWeightInGrams / baseWeightInGrams;
  
  const scaledNutrition: Record<string, number> = {};
  
  for (const [key, value] of Object.entries(baseNutrition)) {
    scaledNutrition[key] = Math.round((value * ratio) * 100) / 100; // Round to 2 decimal places
  }
  
  return scaledNutrition;
}

/**
 * Unit conversion constants for reference
 */
export const CONVERSION_CONSTANTS = {
  GRAMS_PER_OUNCE: 28.3495,
  GRAMS_PER_POUND: 453.592,
  OUNCES_PER_POUND: 16
} as const;