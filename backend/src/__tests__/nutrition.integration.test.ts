/**
 * Integration tests for NutritionService with real USDA API calls
 * These tests require a valid USDA_API_KEY and internet connection
 */

import { NutritionService } from '../services/NutritionService.js';

describe('NutritionService Integration Tests', () => {
  let nutritionService: NutritionService;

  beforeAll(() => {
    nutritionService = new NutritionService();
  });

  // Skip these tests if no API key is available
  const skipIfNoApiKey = () => {
    if (!process.env.USDA_API_KEY) {
      console.log('Skipping integration tests - USDA_API_KEY not found');
      return true;
    }
    return false;
  };

  describe('Real USDA API Integration', () => {
    it('should search for real foods using USDA API', async () => {
      if (skipIfNoApiKey()) return;

      const results = await nutritionService.searchFoodDatabase('apple', 5);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      
      // Check that we got real USDA data (not fallback)
      const firstResult = results[0];
      expect(firstResult.confidence).toBe(1.0); // USDA data has confidence 1.0
      expect(firstResult.name).toContain('apple');
      expect(firstResult.id).not.toContain('fallback');
    }, 10000); // 10 second timeout for API call

    it('should fetch real nutrition data for a specific food', async () => {
      if (skipIfNoApiKey()) return;

      // First search for an apple to get a real food ID
      const searchResults = await nutritionService.searchFoodDatabase('apple', 1);
      expect(searchResults.length).toBeGreaterThan(0);
      
      const foodId = searchResults[0].id;
      const nutrition = await nutritionService.getNutritionData(foodId, 100);
      
      expect(nutrition).toBeDefined();
      expect(typeof nutrition.calories).toBe('number');
      expect(nutrition.calories).toBeGreaterThan(0);
      expect(typeof nutrition.protein).toBe('number');
      expect(typeof nutrition.carbohydrates).toBe('number');
      expect(typeof nutrition.fat).toBe('number');
      
      // Verify nutrition values are reasonable for 100g of apple
      expect(nutrition.calories).toBeLessThan(200); // Apples are low calorie
      expect(nutrition.carbohydrates).toBeGreaterThan(nutrition.protein); // Apples are mostly carbs
    }, 15000); // 15 second timeout for API calls

    it('should handle weight scaling correctly with real data', async () => {
      if (skipIfNoApiKey()) return;

      // Search for a common food
      const searchResults = await nutritionService.searchFoodDatabase('banana', 1);
      expect(searchResults.length).toBeGreaterThan(0);
      
      const foodId = searchResults[0].id;
      
      // Get nutrition for 100g and 200g
      const nutrition100g = await nutritionService.getNutritionData(foodId, 100);
      const nutrition200g = await nutritionService.getNutritionData(foodId, 200);
      
      // 200g should have approximately double the nutrition of 100g
      expect(nutrition200g.calories).toBeCloseTo(nutrition100g.calories * 2, 0);
      expect(nutrition200g.protein).toBeCloseTo(nutrition100g.protein * 2, 1);
      expect(nutrition200g.carbohydrates).toBeCloseTo(nutrition100g.carbohydrates * 2, 1);
    }, 20000); // 20 second timeout for multiple API calls

    it('should cache results to avoid duplicate API calls', async () => {
      if (skipIfNoApiKey()) return;

      const searchResults = await nutritionService.searchFoodDatabase('orange', 1);
      expect(searchResults.length).toBeGreaterThan(0);
      
      const foodId = searchResults[0].id;
      
      // Time the first call
      const start1 = Date.now();
      const nutrition1 = await nutritionService.getNutritionData(foodId, 150);
      const time1 = Date.now() - start1;
      
      // Time the second call (should be cached)
      const start2 = Date.now();
      const nutrition2 = await nutritionService.getNutritionData(foodId, 150);
      const time2 = Date.now() - start2;
      
      // Results should be identical
      expect(nutrition1).toEqual(nutrition2);
      
      // Second call should be much faster (cached)
      expect(time2).toBeLessThan(time1 / 2);
    }, 15000);
  });

  describe('API Error Handling', () => {
    it('should handle invalid food IDs gracefully', async () => {
      if (skipIfNoApiKey()) return;

      const nutrition = await nutritionService.getNutritionData('invalid_food_id_12345', 100);
      
      // Should return fallback nutrition data
      expect(nutrition.calories).toBe(150); // Fallback calories for 100g
      expect(nutrition.protein).toBe(8); // Fallback protein for 100g
    }, 10000);

    it('should handle empty search queries', async () => {
      if (skipIfNoApiKey()) return;

      const results = await nutritionService.searchFoodDatabase('', 5);
      
      // Should return some results or handle gracefully
      expect(Array.isArray(results)).toBe(true);
    }, 10000);
  });

  describe('Performance Tests', () => {
    it('should complete food search within reasonable time', async () => {
      if (skipIfNoApiKey()) return;

      const start = Date.now();
      const results = await nutritionService.searchFoodDatabase('chicken breast', 10);
      const duration = Date.now() - start;
      
      expect(results).toBeDefined();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    }, 10000);

    it('should complete nutrition lookup within reasonable time', async () => {
      if (skipIfNoApiKey()) return;

      // Use a known food ID or search first
      const searchResults = await nutritionService.searchFoodDatabase('rice', 1);
      if (searchResults.length === 0) return;
      
      const start = Date.now();
      const nutrition = await nutritionService.getNutritionData(searchResults[0].id, 100);
      const duration = Date.now() - start;
      
      expect(nutrition).toBeDefined();
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
    }, 15000);
  });
});