/**
 * Tests for unit conversion utilities
 */

import {
  convertToGrams,
  convertFromGrams,
  convertWeight,
  formatWeight,
  getBestDisplayUnit,
  calculateWeightDifference,
  validateFoodWeight,
  scaleNutritionValues
} from '../utils/conversions';

describe('Unit Conversion Utilities', () => {
  describe('convertToGrams', () => {
    test('should convert grams to grams', () => {
      expect(convertToGrams(100, 'g')).toBe(100);
    });

    test('should convert ounces to grams', () => {
      expect(convertToGrams(1, 'oz')).toBeCloseTo(28.3495, 4);
    });

    test('should convert pounds to grams', () => {
      expect(convertToGrams(1, 'lb')).toBeCloseTo(453.592, 3);
    });

    test('should throw error for invalid unit', () => {
      expect(() => convertToGrams(100, 'kg' as any)).toThrow('Unsupported unit');
    });
  });

  describe('convertFromGrams', () => {
    test('should convert grams to ounces', () => {
      expect(convertFromGrams(28.3495, 'oz')).toBeCloseTo(1, 4);
    });

    test('should convert grams to pounds', () => {
      expect(convertFromGrams(453.592, 'lb')).toBeCloseTo(1, 4);
    });
  });

  describe('convertWeight', () => {
    test('should convert between different units', () => {
      expect(convertWeight(1, 'lb', 'oz')).toBeCloseTo(16, 2);
      expect(convertWeight(16, 'oz', 'lb')).toBeCloseTo(1, 2);
    });

    test('should return same value for same units', () => {
      expect(convertWeight(100, 'g', 'g')).toBe(100);
    });
  });

  describe('formatWeight', () => {
    test('should format weight with appropriate precision', () => {
      expect(formatWeight(5.123, 'g')).toBe('5.1 g');
      expect(formatWeight(15.123, 'g')).toBe('15 g');
      expect(formatWeight(0.123, 'oz')).toBe('0.12 oz');
      expect(formatWeight(1.123, 'oz')).toBe('1.1 oz');
    });
  });

  describe('getBestDisplayUnit', () => {
    test('should return appropriate unit based on weight', () => {
      expect(getBestDisplayUnit(10)).toBe('g');
      expect(getBestDisplayUnit(50)).toBe('oz');
      expect(getBestDisplayUnit(500)).toBe('lb');
    });
  });

  describe('calculateWeightDifference', () => {
    test('should calculate weight difference correctly', () => {
      const result = calculateWeightDifference(200, 'g', 100, 'g');
      expect(result.difference).toBeCloseTo(3.53, 2); // 100g ≈ 3.53oz
      expect(result.unit).toBe('oz');
    });

    test('should throw error when current weight is not greater', () => {
      expect(() => calculateWeightDifference(100, 'g', 200, 'g'))
        .toThrow('Current weight must be greater than previous weight');
    });
  });

  describe('validateFoodWeight', () => {
    test('should validate reasonable food weights', () => {
      expect(validateFoodWeight(100, 'g')).toBe(true);
      expect(validateFoodWeight(0.05, 'g')).toBe(false); // Too small
      expect(validateFoodWeight(15000, 'g')).toBe(false); // Too large
    });
  });

  describe('scaleNutritionValues', () => {
    test('should scale nutrition values correctly', () => {
      const baseNutrition = { calories: 100, protein: 10 };
      const scaled = scaleNutritionValues(baseNutrition, 100, 200);
      
      expect(scaled.calories).toBe(200);
      expect(scaled.protein).toBe(20);
    });
  });
});