/**
 * API request and response type definitions
 */

import type { FoodItem, WeightReading, FoodDetectionResult, NutritionInfo, MealComponent, MealNutrition } from './core.js';

// Request types
export interface ProcessImageRequest {
  sessionId?: string;
}

export interface ConfirmSelectionRequest {
  sessionId: string;
  selectedFood: FoodItem;
  confirmedWeight: number;
}

export interface SearchFoodRequest {
  query: string;
  limit?: number;
}

export interface CreateSessionRequest {
  // Empty for now, may include user preferences in future
}

export interface AddIngredientRequest {
  sessionId: string;
  food: FoodItem;
  weight: number;
}

export interface GetNutritionRequest {
  foodId: string;
  weight: number;
}

// Response types
export interface ProcessImageResponse {
  sessionId: string;
  detectedFood: FoodDetectionResult[];
  detectedWeight: WeightReading;
  weightDifference?: number;
  previousWeight?: number;
}

export interface ConfirmSelectionResponse {
  sessionId: string;
  ingredient: MealComponent;
  cumulativeNutrition: NutritionInfo;
  totalWeight: number;
}

export interface SearchFoodResponse {
  foods: FoodItem[];
  total: number;
}

export interface CreateSessionResponse {
  sessionId: string;
  createdAt: Date;
}

export interface GetSessionResponse {
  sessionId: string;
  components: MealComponent[];
  totalWeight: number;
  previousWeight: number;
  cumulativeNutrition: NutritionInfo;
  createdAt: Date;
  lastUpdated: Date;
}

export interface FinalizeMealResponse {
  mealNutrition: MealNutrition;
  sessionId: string;
}

export interface ErrorResponse {
  error: string;
  code: string;
  message: string;
  details?: any;
  suggestions?: string[];
}

export interface HealthCheckResponse {
  status: 'OK' | 'ERROR';
  timestamp: string;
  version?: string;
}

// Common response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  timestamp: string;
}