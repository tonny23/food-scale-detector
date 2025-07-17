/**
 * Unit tests for NutritionService
 */

import { NutritionService } from '../services/NutritionService.js';
import type { MealComponent } from '../types/core.js';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('NutritionService', () => {
  let nutritionService: NutritionService;

  beforeEach(() => {
    nutritionService = new NutritionService();
    mockFetch.mockClear();
    // Clear cache between tests
    nutritionService.clearExpiredCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchFoodDatabase', () => {
    it('should search for foods and return mapped results', async () => {
      const mockUSDAResponse = {
        totalHits: 2,
        currentPage: 1,
        totalPages: 1,
        foods: [
          {
            fdcId: 123456,
            description: 'Apple, raw',
            dataType: 'Foundation',
            foodCategory: 'Fruits',
            foodNutrients: []
          },
          {
            fdcId: 789012,
            description: 'Apple, red delicious',
            dataType: 'SR Legacy',
            foodCategory: 'Fruits',
            foodNutrients: []
          }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUSDAResponse
      } as Response);

      const result = await nutritionService.searchFoodDatabase('apple', 10);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('foods/search')
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: '123456',
        name: 'Apple, raw',
        confidence: 1.0,
        alternativeNames: [],
        category: 'Fruits'
      });
    });

    it('should return fallback foods when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await nutritionService.searchFoodDatabase('apple');

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'fallback_apple',
            name: 'Apple, raw',
            confidence: 0.5
          })
        ])
      );
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      const result = await nutritionService.searchFoodDatabase('apple');

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'fallback_apple'
          })
        ])
      );
    });
  });

  describe('getNutritionData', () => {
    it('should fetch and calculate nutrition data for given weight', async () => {
      const mockUSDAFoodDetails = {
        fdcId: 123456,
        description: 'Apple, raw',
        dataType: 'Foundation',
        foodNutrients: [
          { nutrientId: 1008, nutrientName: 'Energy', nutrientNumber: '208', unitName: 'kcal', value: 52 },
          { nutrientId: 1003, nutrientName: 'Protein', nutrientNumber: '203', unitName: 'g', value: 0.26 },
          { nutrientId: 1005, nutrientName: 'Carbohydrate', nutrientNumber: '205', unitName: 'g', value: 13.81 },
          { nutrientId: 1004, nutrientName: 'Total lipid (fat)', nutrientNumber: '204', unitName: 'g', value: 0.17 },
          { nutrientId: 1079, nutrientName: 'Fiber', nutrientNumber: '291', unitName: 'g', value: 2.4 },
          { nutrientId: 1093, nutrientName: 'Sodium', nutrientNumber: '307', unitName: 'mg', value: 1 }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUSDAFoodDetails
      } as Response);

      const result = await nutritionService.getNutritionData('123456', 150); // 150g apple

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('food/123456')
      );
      
      // Values should be calculated for 150g (1.5x the base 100g values)
      expect(result.calories).toBe(78); // 52 * 1.5
      expect(result.protein).toBe(0.39); // 0.26 * 1.5
      expect(result.carbohydrates).toBe(20.72); // 13.81 * 1.5
      expect(result.fat).toBe(0.26); // 0.17 * 1.5
      expect(result.fiber).toBe(3.6); // 2.4 * 1.5
      expect(result.sodium).toBe(1.5); // 1 * 1.5
    });

    it('should return cached data on subsequent calls', async () => {
      const mockUSDAFoodDetails = {
        fdcId: 123456,
        description: 'Apple, raw',
        dataType: 'Foundation',
        foodNutrients: [
          { nutrientId: 1008, nutrientName: 'Energy', nutrientNumber: '208', unitName: 'kcal', value: 52 }
        ]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockUSDAFoodDetails
      } as Response);

      // First call
      await nutritionService.getNutritionData('123456', 100);
      
      // Second call should use cache
      const result = await nutritionService.getNutritionData('123456', 100);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.calories).toBe(52);
    });

    it('should return fallback nutrition data when API fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await nutritionService.getNutritionData('123456', 100);

      expect(result).toEqual({
        calories: 150,
        protein: 8,
        carbohydrates: 20,
        fat: 5,
        fiber: 3,
        sodium: 200,
        sugar: 5,
        saturatedFat: 1.5,
        cholesterol: 10,
        potassium: 200
      });
    });

    it('should scale fallback nutrition data by weight', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Error'));

      const result = await nutritionService.getNutritionData('123456', 200); // 200g

      expect(result.calories).toBe(300); // 150 * 2
      expect(result.protein).toBe(16); // 8 * 2
    });
  });

  describe('calculateMealNutrition', () => {
    it('should sum nutrition values from all meal components', async () => {
      const mockComponents: MealComponent[] = [
        {
          food: { id: '1', name: 'Apple', confidence: 1, alternativeNames: [], category: 'Fruit' },
          weight: 100,
          nutrition: {
            calories: 52,
            protein: 0.26,
            carbohydrates: 13.81,
            fat: 0.17,
            fiber: 2.4,
            sodium: 1,
            sugar: 10.4,
            saturatedFat: 0.03,
            cholesterol: 0,
            potassium: 107
          },
          addedAt: new Date()
        },
        {
          food: { id: '2', name: 'Banana', confidence: 1, alternativeNames: [], category: 'Fruit' },
          weight: 120,
          nutrition: {
            calories: 89,
            protein: 1.09,
            carbohydrates: 22.84,
            fat: 0.33,
            fiber: 2.6,
            sodium: 1,
            sugar: 12.23,
            saturatedFat: 0.11,
            cholesterol: 0,
            potassium: 358
          },
          addedAt: new Date()
        }
      ];

      const result = await nutritionService.calculateMealNutrition(mockComponents);

      expect(result.totalNutrition.calories).toBe(141); // 52 + 89
      expect(result.totalNutrition.protein).toBe(1.35); // 0.26 + 1.09
      expect(result.totalNutrition.carbohydrates).toBe(36.65); // 13.81 + 22.84
      expect(result.totalWeight).toBe(220); // 100 + 120
      expect(result.components).toHaveLength(2);
    });

    it('should handle empty meal components', async () => {
      const result = await nutritionService.calculateMealNutrition([]);

      expect(result.totalNutrition.calories).toBe(0);
      expect(result.totalWeight).toBe(0);
      expect(result.components).toHaveLength(0);
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', () => {
      const stats = nutritionService.getCacheStats();
      expect(stats).toHaveProperty('size');
      expect(typeof stats.size).toBe('number');
    });

    it('should clear expired cache entries', () => {
      // This is mainly testing that the method exists and doesn't throw
      expect(() => nutritionService.clearExpiredCache()).not.toThrow();
    });
  });

  describe('fallback mechanisms', () => {
    it('should provide fallback foods for common queries', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const appleResults = await nutritionService.searchFoodDatabase('apple');
      const chickenResults = await nutritionService.searchFoodDatabase('chicken');
      const riceResults = await nutritionService.searchFoodDatabase('rice');

      expect(appleResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Apple, raw' })
        ])
      );
      expect(chickenResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Chicken breast, cooked' })
        ])
      );
      expect(riceResults).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'Rice, white, cooked' })
        ])
      );
    });

    it('should return empty array for unknown fallback queries', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await nutritionService.searchFoodDatabase('unknownfood123');
      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle malformed API responses gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'response' })
      } as Response);

      const result = await nutritionService.searchFoodDatabase('apple');
      
      // Should fall back to fallback foods
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: 'fallback_apple' })
        ])
      );
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );

      const result = await nutritionService.getNutritionData('123456', 100);
      
      // Should return fallback nutrition data
      expect(result.calories).toBe(150);
    });
  });

  describe('nutrition calculation accuracy', () => {
    it('should correctly calculate nutrition for different weights', async () => {
      const mockUSDAFoodDetails = {
        fdcId: 123456,
        description: 'Test Food',
        dataType: 'Foundation',
        foodNutrients: [
          { nutrientId: 1008, nutrientName: 'Energy', nutrientNumber: '208', unitName: 'kcal', value: 100 }
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockUSDAFoodDetails
      } as Response);

      const result50g = await nutritionService.getNutritionData('123456', 50);
      const result200g = await nutritionService.getNutritionData('123456', 200);

      expect(result50g.calories).toBe(50); // 100 * 0.5
      expect(result200g.calories).toBe(200); // 100 * 2
    });

    it('should round nutrition values appropriately', async () => {
      const mockUSDAFoodDetails = {
        fdcId: 123456,
        description: 'Test Food',
        dataType: 'Foundation',
        foodNutrients: [
          { nutrientId: 1003, nutrientName: 'Protein', nutrientNumber: '203', unitName: 'g', value: 3.333 }
        ]
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockUSDAFoodDetails
      } as Response);

      const result = await nutritionService.getNutritionData('123456', 150);

      // 3.333 * 1.5 = 4.9995, should round to 5.00
      expect(result.protein).toBe(5);
    });
  });
});