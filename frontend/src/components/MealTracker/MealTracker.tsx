import React, { useState, useEffect } from 'react';
import { NutritionDisplay } from '../NutritionDisplay';
import './MealTracker.css';

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

interface MealComponent {
  food: FoodItem;
  weight: number;
  nutrition: NutritionInfo;
  addedAt: Date;
}

interface MealSession {
  id: string;
  components: MealComponent[];
  totalWeight: number;
  previousWeight: number;
  createdAt: Date;
  lastUpdated: Date;
}

interface MealNutrition {
  totalNutrition: NutritionInfo;
  components: MealComponent[];
  totalWeight: number;
}

interface MealTrackerProps {
  sessionId: string;
  onAddIngredient: () => void;
  onFinalizeMeal: (mealNutrition: MealNutrition) => void;
  onWeightCorrection?: (componentIndex: number, newWeight: number) => void;
  showActions?: boolean;
}

export const MealTracker: React.FC<MealTrackerProps> = ({
  sessionId,
  onAddIngredient,
  onFinalizeMeal,
  onWeightCorrection,
  showActions = true
}) => {
  const [session, setSession] = useState<MealSession | null>(null);
  const [cumulativeNutrition, setCumulativeNutrition] = useState<NutritionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [editingWeight, setEditingWeight] = useState<number | null>(null);
  const [newWeight, setNewWeight] = useState<string>('');
  const [isFinalizingMeal, setIsFinalizingMeal] = useState(false);

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      setIsLoading(true);
      setError('');

      const response = await fetch(`/api/session/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch session data');
      }

      const sessionData = await response.json();
      
      // Convert date strings back to Date objects
      sessionData.createdAt = new Date(sessionData.createdAt);
      sessionData.lastUpdated = new Date(sessionData.lastUpdated);
      sessionData.components = sessionData.components.map((component: any) => ({
        ...component,
        addedAt: new Date(component.addedAt)
      }));

      setSession(sessionData);
      calculateCumulativeNutrition(sessionData.components);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meal data');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCumulativeNutrition = (components: MealComponent[]) => {
    if (components.length === 0) {
      setCumulativeNutrition(null);
      return;
    }

    const total = components.reduce((acc, component) => ({
      calories: acc.calories + component.nutrition.calories,
      protein: acc.protein + component.nutrition.protein,
      carbohydrates: acc.carbohydrates + component.nutrition.carbohydrates,
      fat: acc.fat + component.nutrition.fat,
      fiber: acc.fiber + component.nutrition.fiber,
      sodium: acc.sodium + component.nutrition.sodium,
      sugar: acc.sugar + component.nutrition.sugar,
      saturatedFat: acc.saturatedFat + component.nutrition.saturatedFat,
      cholesterol: acc.cholesterol + component.nutrition.cholesterol,
      potassium: acc.potassium + component.nutrition.potassium
    }), {
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
    });

    setCumulativeNutrition(total);
  };

  const handleWeightEdit = async (componentIndex: number) => {
    if (!session || !newWeight) return;

    try {
      const weightValue = parseFloat(newWeight);
      if (isNaN(weightValue) || weightValue <= 0) {
        alert('Please enter a valid weight');
        return;
      }

      // Call the weight correction API
      const response = await fetch(`/api/session/${sessionId}/weight`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weight: weightValue,
          unit: 'g'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update weight');
      }

      // Refresh session data
      await fetchSession();
      
      // Call parent callback if provided
      if (onWeightCorrection) {
        onWeightCorrection(componentIndex, weightValue);
      }

      setEditingWeight(null);
      setNewWeight('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update weight');
    }
  };

  const handleFinalizeMeal = async () => {
    if (!session || session.components.length === 0) return;

    try {
      setIsFinalizingMeal(true);

      const response = await fetch(`/api/session/${sessionId}/finalize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to finalize meal');
      }

      const result = await response.json();
      
      // Call parent callback with meal nutrition data
      onFinalizeMeal(result.mealNutrition);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to finalize meal');
    } finally {
      setIsFinalizingMeal(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatWeight = (weight: number) => {
    return `${weight.toFixed(1)}g`;
  };

  const formatNutritionValue = (value: number, unit: string) => {
    if (unit === 'g') {
      return `${value.toFixed(1)}${unit}`;
    }
    return `${Math.round(value)}${unit}`;
  };

  if (isLoading) {
    return (
      <div className="meal-tracker-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading meal data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="meal-tracker-container">
        <div className="error-state">
          <h3>Error Loading Meal</h3>
          <p>{error}</p>
          <button onClick={fetchSession} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="meal-tracker-container">
        <div className="empty-state">
          <h3>No Meal Session Found</h3>
          <p>Start by uploading an image of food on a scale</p>
        </div>
      </div>
    );
  }

  return (
    <div className="meal-tracker-container">
      <div className="meal-header">
        <h2>Meal Tracker</h2>
        <div className="meal-meta">
          <span className="ingredient-count">
            {session.components.length} ingredient{session.components.length !== 1 ? 's' : ''}
          </span>
          <span className="total-weight">
            Total: {formatWeight(session.totalWeight)}
          </span>
        </div>
      </div>

      {session.components.length > 0 && (
        <>
          {/* Ingredient History */}
          <div className="ingredient-history">
            <h3>Ingredients Added</h3>
            <div className="ingredient-list">
              {session.components.map((component, index) => (
                <div key={index} className="ingredient-item">
                  <div className="ingredient-header">
                    <div className="ingredient-info">
                      <h4 className="ingredient-name">{component.food.name}</h4>
                      <span className="ingredient-category">{component.food.category}</span>
                    </div>
                    <div className="ingredient-meta">
                      <span className="ingredient-time">
                        {formatTime(component.addedAt)}
                      </span>
                      <span className="ingredient-weight">
                        {editingWeight === index ? (
                          <div className="weight-edit">
                            <input
                              type="number"
                              value={newWeight}
                              onChange={(e) => setNewWeight(e.target.value)}
                              placeholder={component.weight.toString()}
                              className="weight-input"
                              step="0.1"
                              min="0"
                            />
                            <button
                              onClick={() => handleWeightEdit(index)}
                              className="save-weight-btn"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => {
                                setEditingWeight(null);
                                setNewWeight('');
                              }}
                              className="cancel-weight-btn"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <span
                            className="weight-display"
                            onClick={() => {
                              setEditingWeight(index);
                              setNewWeight(component.weight.toString());
                            }}
                            title="Click to edit weight"
                          >
                            {formatWeight(component.weight)}
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  
                  <div className="ingredient-nutrition">
                    <NutritionDisplay
                      nutrition={component.nutrition}
                      food={component.food}
                      weight={component.weight}
                      compact={true}
                      showTitle={false}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cumulative Nutrition Summary */}
          {cumulativeNutrition && (
            <div className="cumulative-nutrition-section">
              <h3>Total Meal Nutrition</h3>
              <NutritionDisplay
                nutrition={cumulativeNutrition}
                food={{
                  id: 'meal-total',
                  name: 'Complete Meal',
                  confidence: 100,
                  alternativeNames: [],
                  category: 'Meal'
                }}
                weight={session.totalWeight}
                showTitle={true}
                className="meal-nutrition-display"
              />
            </div>
          )}
        </>
      )}

      {/* Actions */}
      {showActions && (
        <div className="meal-actions">
          <button
            onClick={onAddIngredient}
            className="add-ingredient-btn"
          >
            Add Another Ingredient
          </button>
          {session.components.length > 0 && (
            <button
              onClick={handleFinalizeMeal}
              className="finalize-meal-btn"
              disabled={isFinalizingMeal}
            >
              {isFinalizingMeal ? 'Finalizing...' : 'Finalize Meal'}
            </button>
          )}
        </div>
      )}

      {/* Weight Differential Info */}
      {session.components.length > 0 && (
        <div className="weight-info">
          <p className="weight-note">
            <strong>Next ingredient:</strong> Place additional food on the scale. 
            The new total weight should be greater than {formatWeight(session.totalWeight)}.
          </p>
        </div>
      )}
    </div>
  );
};