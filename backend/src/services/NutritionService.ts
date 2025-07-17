/**
 * NutritionService - Interface with USDA FoodData Central API
 * Provides food search and nutrition calculation functionality
 */

import type { FoodItem, NutritionInfo, MealComponent, MealNutrition } from '../types/core.js';

// USDA API response types
interface USDAFoodSearchResponse {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: USDAFood[];
}

interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  ingredients?: string;
  foodCategory?: string;
  foodNutrients: USDANutrient[];
}

interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
}

interface USDAFoodDetailsResponse {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients: USDANutrient[];
  foodCategory?: {
    description: string;
  };
}

// Nutrition cache interface
interface NutritionCacheEntry {
  nutrition: NutritionInfo;
  timestamp: number;
  ttl: number;
}

export class NutritionService {
  private readonly baseUrl = 'https://api.nal.usda.gov/fdc/v1';
  private readonly apiKey: string;
  private readonly cache = new Map<string, NutritionCacheEntry>();
  private readonly cacheTTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  constructor() {
    this.apiKey = process.env.USDA_API_KEY || '';
    if (!this.apiKey) {
      console.warn('USDA_API_KEY not found in environment variables');
    }
  }

  /**
   * Search for foods in the USDA database
   */
  async searchFoodDatabase(query: string, limit: number = 10): Promise<FoodItem[]> {
    try {
      const url = new URL(`${this.baseUrl}/foods/search`);
      url.searchParams.set('query', query);
      url.searchParams.set('pageSize', limit.toString());
      url.searchParams.set('api_key', this.apiKey);
      url.searchParams.set('dataType', 'Foundation,SR Legacy');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
      }

      const data: USDAFoodSearchResponse = await response.json();
      
      return data.foods.map(food => this.mapUSDAFoodToFoodItem(food));
    } catch (error) {
      console.error('Error searching USDA food database:', error);
      return this.getFallbackFoodItems(query);
    }
  }

  /**
   * Get nutrition data for a specific food ID and weight
   */
  async getNutritionData(foodId: string, weightInGrams: number): Promise<NutritionInfo> {
    const cacheKey = `${foodId}_${weightInGrams}`;
    
    // Check cache first
    const cached = this.getCachedNutrition(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = new URL(`${this.baseUrl}/food/${foodId}`);
      url.searchParams.set('api_key', this.apiKey);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
      }

      const data: USDAFoodDetailsResponse = await response.json();
      const nutrition = this.calculateNutritionForWeight(data, weightInGrams);
      
      // Cache the result
      this.cacheNutrition(cacheKey, nutrition);
      
      return nutrition;
    } catch (error) {
      console.error('Error fetching nutrition data:', error);
      return this.getFallbackNutritionData(weightInGrams);
    }
  }

  /**
   * Calculate cumulative nutrition for a complete meal
   */
  async calculateMealNutrition(ingredients: MealComponent[]): Promise<MealNutrition> {
    const totalNutrition: NutritionInfo = {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sodium: 0,
      sugar: 0,
      saturatedFat: 0,
      cholesterol: 0,
      potassium: 0
    };

    let totalWeight = 0;

    // Sum up all nutrition values
    for (const ingredient of ingredients) {
      totalNutrition.calories += ingredient.nutrition.calories;
      totalNutrition.protein += ingredient.nutrition.protein;
      totalNutrition.carbohydrates += ingredient.nutrition.carbohydrates;
      totalNutrition.fat += ingredient.nutrition.fat;
      totalNutrition.fiber += ingredient.nutrition.fiber;
      totalNutrition.sodium += ingredient.nutrition.sodium;
      totalNutrition.sugar += ingredient.nutrition.sugar;
      totalNutrition.saturatedFat += ingredient.nutrition.saturatedFat;
      totalNutrition.cholesterol += ingredient.nutrition.cholesterol;
      totalNutrition.potassium += ingredient.nutrition.potassium;
      totalWeight += ingredient.weight;
    }

    return {
      totalNutrition,
      components: ingredients,
      totalWeight
    };
  }

  /**
   * Map USDA food data to our FoodItem interface
   */
  private mapUSDAFoodToFoodItem(usdaFood: USDAFood): FoodItem {
    return {
      id: usdaFood.fdcId.toString(),
      name: usdaFood.description,
      confidence: 1.0, // USDA data is considered highly confident
      alternativeNames: [],
      category: usdaFood.foodCategory || 'Unknown'
    };
  }

  /**
   * Calculate nutrition values for a specific weight from USDA data
   */
  private calculateNutritionForWeight(usdaFood: USDAFoodDetailsResponse, weightInGrams: number): NutritionInfo {
    const nutrients = usdaFood.foodNutrients;
    
    // USDA nutrition data is typically per 100g
    const multiplier = weightInGrams / 100;

    const nutrition: NutritionInfo = {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sodium: 0,
      sugar: 0,
      saturatedFat: 0,
      cholesterol: 0,
      potassium: 0
    };

    // Map USDA nutrient IDs to our nutrition fields
    const nutrientMapping: Record<number, keyof NutritionInfo> = {
      1008: 'calories', // Energy
      1003: 'protein', // Protein
      1005: 'carbohydrates', // Carbohydrate, by difference
      1004: 'fat', // Total lipid (fat)
      1079: 'fiber', // Fiber, total dietary
      1093: 'sodium', // Sodium, Na
      2000: 'sugar', // Sugars, total including NLEA
      1258: 'saturatedFat', // Fatty acids, total saturated
      1253: 'cholesterol', // Cholesterol
      1092: 'potassium' // Potassium, K
    };

    for (const nutrientData of nutrients) {
      // Handle different response structures
      const nutrientId = nutrientData.nutrient?.id || nutrientData.nutrientId;
      const value = nutrientData.amount || nutrientData.value;
      
      const field = nutrientMapping[nutrientId];
      if (field && typeof value === 'number') {
        nutrition[field] = Math.round((value * multiplier) * 100) / 100;
      }
    }

    return nutrition;
  }

  /**
   * Get cached nutrition data if available and not expired
   */
  private getCachedNutrition(cacheKey: string): NutritionInfo | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.nutrition;
  }

  /**
   * Cache nutrition data
   */
  private cacheNutrition(cacheKey: string, nutrition: NutritionInfo): void {
    this.cache.set(cacheKey, {
      nutrition,
      timestamp: Date.now(),
      ttl: this.cacheTTL
    });
  }

  /**
   * Provide fallback food items when USDA API is unavailable
   */
  private getFallbackFoodItems(query: string): FoodItem[] {
    const commonFoods: FoodItem[] = [
      {
        id: 'fallback_apple',
        name: 'Apple, raw',
        confidence: 0.5,
        alternativeNames: ['apple', 'red apple', 'green apple'],
        category: 'Fruits'
      },
      {
        id: 'fallback_banana',
        name: 'Banana, raw',
        confidence: 0.5,
        alternativeNames: ['banana'],
        category: 'Fruits'
      },
      {
        id: 'fallback_chicken',
        name: 'Chicken breast, cooked',
        confidence: 0.5,
        alternativeNames: ['chicken', 'chicken breast'],
        category: 'Poultry'
      },
      {
        id: 'fallback_rice',
        name: 'Rice, white, cooked',
        confidence: 0.5,
        alternativeNames: ['rice', 'white rice'],
        category: 'Grains'
      }
    ];

    // Simple text matching for fallback
    const queryLower = query.toLowerCase();
    return commonFoods.filter(food => 
      food.name.toLowerCase().includes(queryLower) ||
      food.alternativeNames.some(alt => alt.toLowerCase().includes(queryLower))
    );
  }

  /**
   * Provide fallback nutrition data when USDA API is unavailable
   */
  private getFallbackNutritionData(weightInGrams: number): NutritionInfo {
    // Generic nutrition values per 100g (approximate average for mixed foods)
    const baseNutrition = {
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
    };

    const multiplier = weightInGrams / 100;

    return {
      calories: Math.round(baseNutrition.calories * multiplier),
      protein: Math.round((baseNutrition.protein * multiplier) * 100) / 100,
      carbohydrates: Math.round((baseNutrition.carbohydrates * multiplier) * 100) / 100,
      fat: Math.round((baseNutrition.fat * multiplier) * 100) / 100,
      fiber: Math.round((baseNutrition.fiber * multiplier) * 100) / 100,
      sodium: Math.round((baseNutrition.sodium * multiplier) * 100) / 100,
      sugar: Math.round((baseNutrition.sugar * multiplier) * 100) / 100,
      saturatedFat: Math.round((baseNutrition.saturatedFat * multiplier) * 100) / 100,
      cholesterol: Math.round((baseNutrition.cholesterol * multiplier) * 100) / 100,
      potassium: Math.round((baseNutrition.potassium * multiplier) * 100) / 100
    };
  }

  /**
   * Clear expired cache entries
   */
  public clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics for monitoring
   */
  public getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size
    };
  }
}