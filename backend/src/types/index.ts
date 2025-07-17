/**
 * Export all types for easy importing
 */

// Core types
export * from './core.js';
export * from './api.js';

// Re-export commonly used validation schemas
export {
  FoodItemSchema,
  WeightReadingSchema,
  NutritionInfoSchema,
  MealComponentSchema,
  MealSessionSchema,
  ProcessImageRequestSchema,
  ConfirmSelectionRequestSchema,
  SearchFoodRequestSchema,
  AddIngredientRequestSchema,
  validateUUID,
  validateWeight,
  validateNutritionValues
} from '../schemas/validation.js';

// Re-export conversion utilities
export * from '../utils/conversions.js';