/**
 * Zod validation schemas for data validation
 */

import { z } from 'zod';

// Core data schemas
export const FoodItemSchema = z.object({
  id: z.string().min(1, 'Food ID is required'),
  name: z.string().min(1, 'Food name is required'),
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
  alternativeNames: z.array(z.string()),
  category: z.string().min(1, 'Category is required')
});

export const WeightReadingSchema = z.object({
  value: z.number().positive('Weight must be positive'),
  unit: z.enum(['g', 'oz', 'lb'], {
    errorMap: () => ({ message: 'Unit must be g, oz, or lb' })
  }),
  confidence: z.number().min(0).max(1, 'Confidence must be between 0 and 1'),
  rawText: z.string()
});

export const NutritionInfoSchema = z.object({
  calories: z.number().min(0, 'Calories cannot be negative'),
  protein: z.number().min(0, 'Protein cannot be negative'),
  carbohydrates: z.number().min(0, 'Carbohydrates cannot be negative'),
  fat: z.number().min(0, 'Fat cannot be negative'),
  fiber: z.number().min(0, 'Fiber cannot be negative'),
  sodium: z.number().min(0, 'Sodium cannot be negative'),
  sugar: z.number().min(0, 'Sugar cannot be negative'),
  saturatedFat: z.number().min(0, 'Saturated fat cannot be negative'),
  cholesterol: z.number().min(0, 'Cholesterol cannot be negative'),
  potassium: z.number().min(0, 'Potassium cannot be negative')
});

export const MealComponentSchema = z.object({
  food: FoodItemSchema,
  weight: z.number().positive('Weight must be positive'),
  nutrition: NutritionInfoSchema,
  addedAt: z.date()
});

export const MealSessionSchema = z.object({
  id: z.string().min(1, 'Session ID is required'),
  components: z.array(MealComponentSchema),
  totalWeight: z.number().min(0, 'Total weight cannot be negative'),
  previousWeight: z.number().min(0, 'Previous weight cannot be negative'),
  createdAt: z.date(),
  lastUpdated: z.date()
});

export const BoundingBoxSchema = z.object({
  x: z.number().min(0, 'X coordinate must be non-negative'),
  y: z.number().min(0, 'Y coordinate must be non-negative'),
  width: z.number().positive('Width must be positive'),
  height: z.number().positive('Height must be positive')
});

export const FoodDetectionResultSchema = z.object({
  food: FoodItemSchema,
  alternatives: z.array(FoodItemSchema),
  boundingBox: BoundingBoxSchema
});

// API request schemas
export const ProcessImageRequestSchema = z.object({
  sessionId: z.string().min(1).optional()
});

export const ConfirmSelectionRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  selectedFood: FoodItemSchema,
  confirmedWeight: z.number().positive('Weight must be positive')
});

export const SearchFoodRequestSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  limit: z.number().int().min(1).max(100).optional().default(10)
});

export const AddIngredientRequestSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  food: FoodItemSchema,
  weight: z.number().positive('Weight must be positive')
});

export const GetNutritionRequestSchema = z.object({
  foodId: z.string().min(1, 'Food ID is required'),
  weight: z.number().positive('Weight must be positive')
});

// Image validation schema
export const ImageValidationSchema = z.object({
  isValid: z.boolean(),
  hasFood: z.boolean(),
  hasScale: z.boolean(),
  errors: z.array(z.string()),
  suggestions: z.array(z.string())
});

// File upload validation
export const ImageFileSchema = z.object({
  mimetype: z.enum(['image/jpeg', 'image/png', 'image/webp'], {
    errorMap: () => ({ message: 'Only JPEG, PNG, and WebP images are supported' })
  }),
  size: z.number().max(10 * 1024 * 1024, 'Image size must be less than 10MB')
});

// Utility validation functions
export const validateUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const validateWeight = (weight: number, unit: string): boolean => {
  if (weight <= 0) return false;
  
  // Set reasonable limits based on unit
  switch (unit) {
    case 'g':
      return weight <= 10000; // 10kg max
    case 'oz':
      return weight <= 352; // ~10kg max
    case 'lb':
      return weight <= 22; // ~10kg max
    default:
      return false;
  }
};

export const validateNutritionValues = (nutrition: any): boolean => {
  const requiredFields = ['calories', 'protein', 'carbohydrates', 'fat'];
  return requiredFields.every(field => 
    typeof nutrition[field] === 'number' && nutrition[field] >= 0
  );
};

// API validation functions
export const validateImageUpload = (file: Express.Multer.File) => {
  try {
    ImageFileSchema.parse({
      mimetype: file.mimetype,
      size: file.size
    });
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

export const validateFoodConfirmation = (data: any) => {
  try {
    ConfirmSelectionRequestSchema.parse(data);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};

export const validateSessionId = (sessionId: string) => {
  try {
    z.string().min(1).parse(sessionId);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
};