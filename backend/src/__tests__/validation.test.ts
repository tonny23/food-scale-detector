/**
 * Tests for Zod validation schemas
 */

import {
  FoodItemSchema,
  WeightReadingSchema,
  NutritionInfoSchema,
  ProcessImageRequestSchema,
  ConfirmSelectionRequestSchema,
  validateUUID,
  validateWeight,
  validateNutritionValues
} from '../schemas/validation';

describe('Validation Schemas', () => {
  describe('FoodItemSchema', () => {
    test('should validate valid food item', () => {
      const validFood = {
        id: 'food-123',
        name: 'Apple',
        confidence: 0.95,
        alternativeNames: ['Red Apple', 'Gala Apple'],
        category: 'Fruits'
      };

      expect(() => FoodItemSchema.parse(validFood)).not.toThrow();
    });

    test('should reject invalid confidence value', () => {
      const invalidFood = {
        id: 'food-123',
        name: 'Apple',
        confidence: 1.5, // Invalid: > 1
        alternativeNames: [],
        category: 'Fruits'
      };

      expect(() => FoodItemSchema.parse(invalidFood)).toThrow();
    });

    test('should reject empty name', () => {
      const invalidFood = {
        id: 'food-123',
        name: '', // Invalid: empty
        confidence: 0.95,
        alternativeNames: [],
        category: 'Fruits'
      };

      expect(() => FoodItemSchema.parse(invalidFood)).toThrow();
    });
  });

  describe('WeightReadingSchema', () => {
    test('should validate valid weight reading', () => {
      const validWeight = {
        value: 150.5,
        unit: 'g' as const,
        confidence: 0.9,
        rawText: '150.5g'
      };

      expect(() => WeightReadingSchema.parse(validWeight)).not.toThrow();
    });

    test('should reject invalid unit', () => {
      const invalidWeight = {
        value: 150.5,
        unit: 'kg', // Invalid unit
        confidence: 0.9,
        rawText: '150.5kg'
      };

      expect(() => WeightReadingSchema.parse(invalidWeight)).toThrow();
    });

    test('should reject negative weight', () => {
      const invalidWeight = {
        value: -10, // Invalid: negative
        unit: 'g' as const,
        confidence: 0.9,
        rawText: '-10g'
      };

      expect(() => WeightReadingSchema.parse(invalidWeight)).toThrow();
    });
  });

  describe('NutritionInfoSchema', () => {
    test('should validate valid nutrition info', () => {
      const validNutrition = {
        calories: 95,
        protein: 0.5,
        carbohydrates: 25,
        fat: 0.3,
        fiber: 4.4,
        sodium: 1,
        sugar: 19,
        saturatedFat: 0.1,
        cholesterol: 0,
        potassium: 195
      };

      expect(() => NutritionInfoSchema.parse(validNutrition)).not.toThrow();
    });

    test('should reject negative values', () => {
      const invalidNutrition = {
        calories: -95, // Invalid: negative
        protein: 0.5,
        carbohydrates: 25,
        fat: 0.3,
        fiber: 4.4,
        sodium: 1,
        sugar: 19,
        saturatedFat: 0.1,
        cholesterol: 0,
        potassium: 195
      };

      expect(() => NutritionInfoSchema.parse(invalidNutrition)).toThrow();
    });
  });

  describe('ProcessImageRequestSchema', () => {
    test('should validate request with optional sessionId', () => {
      const validRequest = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000'
      };

      expect(() => ProcessImageRequestSchema.parse(validRequest)).not.toThrow();
    });

    test('should validate request without sessionId', () => {
      const validRequest = {};

      expect(() => ProcessImageRequestSchema.parse(validRequest)).not.toThrow();
    });

    test('should reject empty sessionId', () => {
      const invalidRequest = {
        sessionId: ''
      };

      expect(() => ProcessImageRequestSchema.parse(invalidRequest)).toThrow();
    });
  });

  describe('ConfirmSelectionRequestSchema', () => {
    test('should validate valid confirmation request', () => {
      const validRequest = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        selectedFood: {
          id: 'food-123',
          name: 'Apple',
          confidence: 0.95,
          alternativeNames: [],
          category: 'Fruits'
        },
        confirmedWeight: 150.5
      };

      expect(() => ConfirmSelectionRequestSchema.parse(validRequest)).not.toThrow();
    });

    test('should reject negative weight', () => {
      const invalidRequest = {
        sessionId: '123e4567-e89b-12d3-a456-426614174000',
        selectedFood: {
          id: 'food-123',
          name: 'Apple',
          confidence: 0.95,
          alternativeNames: [],
          category: 'Fruits'
        },
        confirmedWeight: -10 // Invalid: negative
      };

      expect(() => ConfirmSelectionRequestSchema.parse(invalidRequest)).toThrow();
    });
  });
});

describe('Validation Utility Functions', () => {
  describe('validateUUID', () => {
    test('should validate correct UUID format', () => {
      expect(validateUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    });

    test('should reject invalid UUID format', () => {
      expect(validateUUID('invalid-uuid')).toBe(false);
      expect(validateUUID('123-456-789')).toBe(false);
    });
  });

  describe('validateWeight', () => {
    test('should validate reasonable weights', () => {
      expect(validateWeight(100, 'g')).toBe(true);
      expect(validateWeight(5, 'oz')).toBe(true);
      expect(validateWeight(2, 'lb')).toBe(true);
    });

    test('should reject unreasonable weights', () => {
      expect(validateWeight(0, 'g')).toBe(false);
      expect(validateWeight(-10, 'g')).toBe(false);
      expect(validateWeight(15000, 'g')).toBe(false); // Too heavy
    });
  });

  describe('validateNutritionValues', () => {
    test('should validate complete nutrition object', () => {
      const nutrition = {
        calories: 95,
        protein: 0.5,
        carbohydrates: 25,
        fat: 0.3,
        fiber: 4.4
      };

      expect(validateNutritionValues(nutrition)).toBe(true);
    });

    test('should reject incomplete nutrition object', () => {
      const nutrition = {
        calories: 95,
        protein: 0.5
        // Missing required fields
      };

      expect(validateNutritionValues(nutrition)).toBe(false);
    });

    test('should reject nutrition with negative values', () => {
      const nutrition = {
        calories: -95, // Invalid
        protein: 0.5,
        carbohydrates: 25,
        fat: 0.3
      };

      expect(validateNutritionValues(nutrition)).toBe(false);
    });
  });
});