/**
 * Core data types for the Food Nutrition Detector application
 */

export interface FoodItem {
  id: string;
  name: string;
  confidence: number;
  alternativeNames: string[];
  category: string;
}

export interface WeightReading {
  value: number;
  unit: 'g' | 'oz' | 'lb';
  confidence: number;
  rawText: string;
}

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber: number;
  sodium: number;
  sugar: number;
  saturatedFat: number;
  cholesterol: number;
  potassium: number;
}

export interface MealComponent {
  food: FoodItem;
  weight: number;
  nutrition: NutritionInfo;
  addedAt: Date;
}

export interface MealSession {
  id: string;
  components: MealComponent[];
  totalWeight: number;
  previousWeight: number;
  createdAt: Date;
  lastUpdated: Date;
}

export interface MealNutrition {
  totalNutrition: NutritionInfo;
  components: MealComponent[];
  totalWeight: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FoodDetectionResult {
  food: FoodItem;
  alternatives: FoodItem[];
  boundingBox: BoundingBox;
}

export interface ImageValidation {
  isValid: boolean;
  hasFood: boolean;
  hasScale: boolean;
  errors: string[];
  suggestions: string[];
}