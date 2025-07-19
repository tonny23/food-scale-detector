import React from 'react';
import './NutritionDisplay.css';

interface NutritionInfo {
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

interface FoodItem {
  id: string;
  name: string;
  confidence: number;
  alternativeNames: string[];
  category: string;
}

interface NutritionDisplayProps {
  nutrition: NutritionInfo;
  food?: FoodItem;
  weight?: number;
  showTitle?: boolean;
  compact?: boolean;
  className?: string;
}

export const NutritionDisplay: React.FC<NutritionDisplayProps> = ({
  nutrition,
  food,
  weight,
  showTitle = true,
  compact = false,
  className = ''
}) => {
  const formatNutritionValue = (value: number, unit: string, decimals: number = 1): string => {
    if (unit === 'mg') {
      return `${Math.round(value)}${unit}`;
    }
    if (unit === 'g') {
      return `${value.toFixed(decimals)}${unit}`;
    }
    return `${Math.round(value)}${unit}`;
  };

  const formatWeight = (weightValue: number): string => {
    return `${weightValue.toFixed(1)}g`;
  };

  const getNutrientColor = (nutrient: string): string => {
    const colorMap: { [key: string]: string } = {
      calories: '#ff6b6b',
      protein: '#4ecdc4',
      carbohydrates: '#45b7d1',
      fat: '#f9ca24',
      fiber: '#6c5ce7',
      sodium: '#fd79a8',
      sugar: '#fdcb6e',
      saturatedFat: '#e17055',
      cholesterol: '#a29bfe',
      potassium: '#00b894'
    };
    return colorMap[nutrient] || '#74b9ff';
  };

  if (compact) {
    return (
      <div className={`nutrition-display-compact ${className}`}>
        {showTitle && food && (
          <div className="nutrition-header-compact">
            <h4 className="food-name">{food.name}</h4>
            {weight && <span className="weight-info">{formatWeight(weight)}</span>}
          </div>
        )}
        
        <div className="nutrition-grid-compact">
          <div className="nutrition-item-compact calories">
            <span className="nutrition-value">{nutrition.calories}</span>
            <span className="nutrition-label">cal</span>
          </div>
          <div className="nutrition-item-compact protein">
            <span className="nutrition-value">{formatNutritionValue(nutrition.protein, 'g')}</span>
            <span className="nutrition-label">protein</span>
          </div>
          <div className="nutrition-item-compact carbs">
            <span className="nutrition-value">{formatNutritionValue(nutrition.carbohydrates, 'g')}</span>
            <span className="nutrition-label">carbs</span>
          </div>
          <div className="nutrition-item-compact fat">
            <span className="nutrition-value">{formatNutritionValue(nutrition.fat, 'g')}</span>
            <span className="nutrition-label">fat</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`nutrition-display ${className}`}>
      {showTitle && (
        <div className="nutrition-header">
          {food && (
            <div className="food-info">
              <h3 className="food-name">{food.name}</h3>
              <span className="food-category">{food.category}</span>
            </div>
          )}
          {weight && (
            <div className="weight-info">
              <span className="weight-value">{formatWeight(weight)}</span>
              <span className="weight-label">serving size</span>
            </div>
          )}
        </div>
      )}

      <div className="nutrition-content">
        {/* Featured Calories */}
        <div className="calories-section">
          <div 
            className="calories-circle"
            style={{ borderColor: getNutrientColor('calories') }}
          >
            <div className="calories-value">{nutrition.calories}</div>
            <div className="calories-label">Calories</div>
          </div>
        </div>

        {/* Macronutrients */}
        <div className="macronutrients-section">
          <h4 className="section-title">Macronutrients</h4>
          <div className="macros-grid">
            <div className="macro-item">
              <div 
                className="macro-bar"
                style={{ backgroundColor: getNutrientColor('protein') }}
              >
                <div className="macro-value">{formatNutritionValue(nutrition.protein, 'g')}</div>
              </div>
              <div className="macro-label">Protein</div>
            </div>
            <div className="macro-item">
              <div 
                className="macro-bar"
                style={{ backgroundColor: getNutrientColor('carbohydrates') }}
              >
                <div className="macro-value">{formatNutritionValue(nutrition.carbohydrates, 'g')}</div>
              </div>
              <div className="macro-label">Carbohydrates</div>
            </div>
            <div className="macro-item">
              <div 
                className="macro-bar"
                style={{ backgroundColor: getNutrientColor('fat') }}
              >
                <div className="macro-value">{formatNutritionValue(nutrition.fat, 'g')}</div>
              </div>
              <div className="macro-label">Total Fat</div>
            </div>
          </div>
        </div>

        {/* Other Nutrients */}
        <div className="other-nutrients-section">
          <h4 className="section-title">Other Nutrients</h4>
          <div className="nutrients-list">
            <div className="nutrient-row">
              <span className="nutrient-name">Dietary Fiber</span>
              <span className="nutrient-value">{formatNutritionValue(nutrition.fiber, 'g')}</span>
            </div>
            <div className="nutrient-row">
              <span className="nutrient-name">Total Sugars</span>
              <span className="nutrient-value">{formatNutritionValue(nutrition.sugar, 'g')}</span>
            </div>
            <div className="nutrient-row">
              <span className="nutrient-name">Saturated Fat</span>
              <span className="nutrient-value">{formatNutritionValue(nutrition.saturatedFat, 'g')}</span>
            </div>
            <div className="nutrient-row">
              <span className="nutrient-name">Cholesterol</span>
              <span className="nutrient-value">{formatNutritionValue(nutrition.cholesterol, 'mg')}</span>
            </div>
            <div className="nutrient-row">
              <span className="nutrient-name">Sodium</span>
              <span className="nutrient-value">{formatNutritionValue(nutrition.sodium, 'mg')}</span>
            </div>
            <div className="nutrient-row">
              <span className="nutrient-name">Potassium</span>
              <span className="nutrient-value">{formatNutritionValue(nutrition.potassium, 'mg')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};