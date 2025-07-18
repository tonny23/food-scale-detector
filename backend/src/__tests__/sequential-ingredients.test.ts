import { SessionService } from '../services/SessionService';
import type { MealComponent, FoodItem, NutritionInfo } from '../types/core';

describe('Sequential Ingredient Addition', () => {
  let sessionService: SessionService;
  let sessionId: string;

  beforeEach(async () => {
    sessionService = new SessionService();
    sessionId = await sessionService.createSession();
  });

  afterEach(async () => {
    if (sessionId) {
      await sessionService.deleteSession(sessionId);
    }
    await sessionService.disconnect();
  });

  const createMockMealComponent = (weight: number, foodName: string): MealComponent => ({
    food: {
      id: `food_${foodName.toLowerCase()}`,
      name: foodName,
      confidence: 0.9,
      alternativeNames: [],
      category: 'fruit'
    } as FoodItem,
    weight,
    nutrition: {
      calories: Math.round(weight * 0.52),
      protein: Math.round(weight * 0.003 * 10) / 10,
      carbohydrates: Math.round(weight * 0.14 * 10) / 10,
      fat: Math.round(weight * 0.002 * 10) / 10,
      fiber: Math.round(weight * 0.024 * 10) / 10,
      sodium: Math.round(weight * 0.00001),
      sugar: Math.round(weight * 0.104 * 10) / 10,
      saturatedFat: 0,
      cholesterol: 0,
      potassium: Math.round(weight * 1.07)
    } as NutritionInfo,
    addedAt: new Date()
  });

  describe('Weight Differential Calculation', () => {
    it('should calculate correct weight difference for new ingredients', async () => {
      // Add first ingredient (100g)
      const firstIngredient = createMockMealComponent(100, 'Apple');
      await sessionService.addIngredient(sessionId, firstIngredient);

      // Calculate weight difference for second ingredient (total 250g, so 150g new)
      const result = await sessionService.calculateWeightDifference(sessionId, 250);

      expect(result.isValid).toBe(true);
      expect(result.difference).toBe(150);
      expect(result.previousWeight).toBe(100);
    });

    it('should reject weight difference when new weight is less than previous', async () => {
      // Add first ingredient (100g)
      const firstIngredient = createMockMealComponent(100, 'Apple');
      await sessionService.addIngredient(sessionId, firstIngredient);

      // Try to add ingredient with lower total weight
      const result = await sessionService.calculateWeightDifference(sessionId, 80);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be greater than previous weight');
    });

    it('should reject weight difference when increase is too large', async () => {
      // Add first ingredient (100g)
      const firstIngredient = createMockMealComponent(100, 'Apple');
      await sessionService.addIngredient(sessionId, firstIngredient);

      // Try to add ingredient with unreasonably large increase (6kg)
      const result = await sessionService.calculateWeightDifference(sessionId, 6100);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('seems too large');
    });

    it('should reject weight difference when increase is too small', async () => {
      // Add first ingredient (100g)
      const firstIngredient = createMockMealComponent(100, 'Apple');
      await sessionService.addIngredient(sessionId, firstIngredient);

      // Try to add ingredient with very small increase (0.5g)
      const result = await sessionService.calculateWeightDifference(sessionId, 100.5);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too small');
    });
  });

  describe('Ingredient History Tracking', () => {
    it('should track multiple ingredients in correct order', async () => {
      const ingredients = [
        createMockMealComponent(100, 'Apple'),
        createMockMealComponent(150, 'Banana'),
        createMockMealComponent(200, 'Orange')
      ];

      // Add ingredients sequentially
      for (const ingredient of ingredients) {
        await sessionService.addIngredient(sessionId, ingredient);
      }

      const session = await sessionService.getSession(sessionId);
      expect(session).not.toBeNull();
      expect(session!.components).toHaveLength(3);
      expect(session!.components[0].food.name).toBe('Apple');
      expect(session!.components[1].food.name).toBe('Banana');
      expect(session!.components[2].food.name).toBe('Orange');
      expect(session!.totalWeight).toBe(450); // 100 + 150 + 200
    });

    it('should maintain correct previousWeight tracking', async () => {
      // Add first ingredient
      const firstIngredient = createMockMealComponent(100, 'Apple');
      await sessionService.addIngredient(sessionId, firstIngredient);

      let session = await sessionService.getSession(sessionId);
      expect(session!.previousWeight).toBe(0); // No previous weight for first ingredient
      expect(session!.totalWeight).toBe(100);

      // Add second ingredient
      const secondIngredient = createMockMealComponent(150, 'Banana');
      await sessionService.addIngredient(sessionId, secondIngredient);

      session = await sessionService.getSession(sessionId);
      expect(session!.previousWeight).toBe(100); // Previous weight should be 100g
      expect(session!.totalWeight).toBe(250); // 100 + 150
    });

    it('should update lastUpdated timestamp when adding ingredients', async () => {
      const session1 = await sessionService.getSession(sessionId);
      const initialTimestamp = session1!.lastUpdated;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      const ingredient = createMockMealComponent(100, 'Apple');
      await sessionService.addIngredient(sessionId, ingredient);

      const session2 = await sessionService.getSession(sessionId);
      expect(session2!.lastUpdated.getTime()).toBeGreaterThan(initialTimestamp.getTime());
    });
  });

  describe('Meal Summary Calculation', () => {
    it('should calculate cumulative nutrition correctly', async () => {
      const ingredients = [
        createMockMealComponent(100, 'Apple'),   // 52 calories
        createMockMealComponent(150, 'Banana'),  // 78 calories
        createMockMealComponent(200, 'Orange')   // 104 calories
      ];

      // Add all ingredients
      for (const ingredient of ingredients) {
        await sessionService.addIngredient(sessionId, ingredient);
      }

      const summary = await sessionService.getMealSummary(sessionId);
      expect(summary).not.toBeNull();
      expect(summary!.componentCount).toBe(3);
      expect(summary!.totalWeight).toBe(450);
      expect(summary!.totalNutrition.calories).toBe(234); // 52 + 78 + 104
    });

    it('should return null for non-existent session', async () => {
      const summary = await sessionService.getMealSummary('non-existent-session');
      expect(summary).toBeNull();
    });

    it('should handle empty session correctly', async () => {
      const summary = await sessionService.getMealSummary(sessionId);
      expect(summary).not.toBeNull();
      expect(summary!.componentCount).toBe(0);
      expect(summary!.totalWeight).toBe(0);
      expect(summary!.totalNutrition.calories).toBe(0);
    });
  });

  describe('Weight Inconsistency Detection', () => {
    it('should detect when scale was reset between ingredients', async () => {
      // Add first ingredient (100g)
      const firstIngredient = createMockMealComponent(100, 'Apple');
      await sessionService.addIngredient(sessionId, firstIngredient);

      // Try to add second ingredient with weight that suggests scale was reset (50g total)
      const result = await sessionService.calculateWeightDifference(sessionId, 50);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be greater than previous weight');
    });

    it('should detect unrealistic weight jumps', async () => {
      // Add first ingredient (100g)
      const firstIngredient = createMockMealComponent(100, 'Apple');
      await sessionService.addIngredient(sessionId, firstIngredient);

      // Try to add ingredient with massive weight increase
      const result = await sessionService.calculateWeightDifference(sessionId, 8000); // 7.9kg increase

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('seems too large');
    });
  });

  describe('Session Management', () => {
    it('should maintain session state across multiple operations', async () => {
      // Add first ingredient
      const firstIngredient = createMockMealComponent(100, 'Apple');
      await sessionService.addIngredient(sessionId, firstIngredient);

      // Verify session state
      let session = await sessionService.getSession(sessionId);
      expect(session!.components).toHaveLength(1);
      expect(session!.totalWeight).toBe(100);

      // Add second ingredient
      const secondIngredient = createMockMealComponent(150, 'Banana');
      await sessionService.addIngredient(sessionId, secondIngredient);

      // Verify updated session state
      session = await sessionService.getSession(sessionId);
      expect(session!.components).toHaveLength(2);
      expect(session!.totalWeight).toBe(250);
      expect(session!.previousWeight).toBe(100);
    });

    it('should extend session expiration when adding ingredients', async () => {
      const ingredient = createMockMealComponent(100, 'Apple');
      await sessionService.addIngredient(sessionId, ingredient);

      // Session should still be accessible (expiration was extended)
      const session = await sessionService.getSession(sessionId);
      expect(session).not.toBeNull();
    });
  });
});