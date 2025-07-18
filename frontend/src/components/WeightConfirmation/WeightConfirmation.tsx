import React, { useState, useEffect } from 'react';
import './WeightConfirmation.css';

interface WeightReading {
  value: number;
  unit: 'g' | 'oz' | 'lb';
  confidence: number;
  rawText: string;
}

interface WeightConfirmationProps {
  detectedWeight?: WeightReading;
  onWeightConfirm: (weight: number, unit: string) => void;
  onWeightChange?: (weight: number, unit: string) => void; // For real-time nutrition updates
  isLoading?: boolean;
  previousWeight?: number;
  currentNutrition?: any; // Current nutrition data for recalculation
  showNutritionPreview?: boolean; // Whether to show nutrition preview
}

export const WeightConfirmation: React.FC<WeightConfirmationProps> = ({
  detectedWeight,
  onWeightConfirm,
  onWeightChange,
  isLoading = false,
  previousWeight,
  currentNutrition,
  showNutritionPreview = false
}) => {
  const [manualEntry, setManualEntry] = useState(false);
  const [weight, setWeight] = useState<string>('');
  const [unit, setUnit] = useState<'g' | 'oz' | 'lb'>('g');
  const [error, setError] = useState<string>('');
  const [previewNutrition, setPreviewNutrition] = useState<any>(null);

  useEffect(() => {
    if (detectedWeight) {
      setWeight(detectedWeight.value.toString());
      setUnit(detectedWeight.unit);
    }
  }, [detectedWeight]);

  // Real-time weight change handling for nutrition recalculation
  useEffect(() => {
    if (onWeightChange && weight && !error && !isNaN(parseFloat(weight))) {
      const weightValue = parseFloat(weight);
      const validationError = validateWeight(weightValue);
      
      if (!validationError) {
        // Trigger real-time nutrition update
        onWeightChange(weightValue, unit);
        
        // Calculate preview nutrition if current nutrition is available
        if (currentNutrition && showNutritionPreview) {
          const weightInGrams = convertWeight(weightValue, unit, 'g');
          const originalWeightInGrams = currentNutrition.baseWeight || 100; // Default to 100g base
          const ratio = weightInGrams / originalWeightInGrams;
          
          const scaledNutrition = {
            calories: Math.round(currentNutrition.calories * ratio),
            protein: Math.round(currentNutrition.protein * ratio * 10) / 10,
            carbohydrates: Math.round(currentNutrition.carbohydrates * ratio * 10) / 10,
            fat: Math.round(currentNutrition.fat * ratio * 10) / 10,
            fiber: Math.round(currentNutrition.fiber * ratio * 10) / 10,
            sodium: Math.round(currentNutrition.sodium * ratio),
            sugar: Math.round(currentNutrition.sugar * ratio * 10) / 10
          };
          
          setPreviewNutrition(scaledNutrition);
        }
      } else {
        setPreviewNutrition(null);
      }
    }
  }, [weight, unit, onWeightChange, currentNutrition, showNutritionPreview, error]);

  const handleWeightChange = (value: string) => {
    setWeight(value);
    setError('');
  };

  const handleUnitChange = (newUnit: 'g' | 'oz' | 'lb') => {
    setUnit(newUnit);
  };

  const validateWeight = (weightValue: number): string | null => {
    if (weightValue <= 0) {
      return 'Weight must be greater than 0';
    }
    
    // Convert to grams for consistent validation
    const weightInGrams = convertWeight(weightValue, unit, 'g');
    
    // Minimum reasonable weight (0.1g)
    if (weightInGrams < 0.1) {
      return 'Weight is too small. Minimum weight is 0.1g';
    }
    
    // Maximum reasonable weight for food (10kg)
    if (weightInGrams > 10000) {
      return 'Weight seems too high. Maximum weight is 10kg (10,000g)';
    }
    
    // Check against previous weight for sequential additions
    if (previousWeight) {
      const previousWeightInGrams = convertWeight(previousWeight, 'g', 'g'); // Assume previousWeight is in grams
      if (weightInGrams <= previousWeightInGrams) {
        return `New weight (${weightInGrams.toFixed(1)}g) should be greater than previous weight (${previousWeightInGrams.toFixed(1)}g)`;
      }
      
      // Check for unreasonably large additions (more than 5kg difference)
      const difference = weightInGrams - previousWeightInGrams;
      if (difference > 5000) {
        return `Weight increase of ${difference.toFixed(1)}g seems too large. Please verify the reading.`;
      }
    }
    
    return null;
  };

  const handleConfirm = () => {
    const weightValue = parseFloat(weight);
    
    if (isNaN(weightValue)) {
      setError('Please enter a valid number');
      return;
    }

    const validationError = validateWeight(weightValue);
    if (validationError) {
      setError(validationError);
      return;
    }

    onWeightConfirm(weightValue, unit);
  };

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  const convertWeight = (value: number, fromUnit: string, toUnit: string): number => {
    // Convert to grams first
    let grams: number;
    switch (fromUnit) {
      case 'lb':
        grams = value * 453.592;
        break;
      case 'oz':
        grams = value * 28.3495;
        break;
      default:
        grams = value;
    }

    // Convert from grams to target unit
    switch (toUnit) {
      case 'lb':
        return grams / 453.592;
      case 'oz':
        return grams / 28.3495;
      default:
        return grams;
    }
  };

  if (isLoading) {
    return (
      <div className="weight-confirmation-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <h3>Reading scale...</h3>
          <p>Please wait while we analyze the weight display</p>
        </div>
      </div>
    );
  }

  return (
    <div className="weight-confirmation-container">
      <div className="confirmation-header">
        <h2>Confirm Weight</h2>
        {previousWeight && (
          <p className="previous-weight">
            Previous weight: {previousWeight}g
          </p>
        )}
      </div>

      {detectedWeight && !manualEntry ? (
        <div className="detected-weight">
          <div className="weight-display">
            <div className="weight-value">
              {detectedWeight.value} {detectedWeight.unit}
            </div>
            <div className="weight-details">
              <span className="confidence">
                Confidence: {formatConfidence(detectedWeight.confidence)}
              </span>
              {detectedWeight.rawText && (
                <span className="raw-text">
                  Raw reading: "{detectedWeight.rawText}"
                </span>
              )}
            </div>
          </div>
          
          <div className="weight-actions">
            <button onClick={handleConfirm} className="confirm-button">
              Confirm Weight
            </button>
            <button 
              onClick={() => setManualEntry(true)}
              className="manual-entry-button"
            >
              Enter Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="manual-weight-entry">
          {!detectedWeight && (
            <div className="no-detection">
              <div className="no-detection-icon">⚖️</div>
              <p>Unable to read the scale display clearly.</p>
              <p>Please enter the weight manually:</p>
            </div>
          )}
          
          <div className="weight-input-group">
            <label htmlFor="weight-input" className="weight-label">
              Weight:
            </label>
            <div className="input-with-unit">
              <input
                id="weight-input"
                type="number"
                value={weight}
                onChange={(e) => handleWeightChange(e.target.value)}
                placeholder="Enter weight"
                className={`weight-input ${error ? 'error' : ''}`}
                step="0.1"
                min="0"
              />
              <select
                value={unit}
                onChange={(e) => handleUnitChange(e.target.value as 'g' | 'oz' | 'lb')}
                className="unit-select"
              >
                <option value="g">grams (g)</option>
                <option value="oz">ounces (oz)</option>
                <option value="lb">pounds (lb)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {weight && !error && (
            <div className="weight-conversions">
              <h4>Conversions:</h4>
              <div className="conversion-list">
                <span>{convertWeight(parseFloat(weight), unit, 'g').toFixed(1)}g</span>
                <span>{convertWeight(parseFloat(weight), unit, 'oz').toFixed(2)}oz</span>
                <span>{convertWeight(parseFloat(weight), unit, 'lb').toFixed(3)}lb</span>
              </div>
            </div>
          )}

          {showNutritionPreview && previewNutrition && weight && !error && (
            <div className="nutrition-preview">
              <h4>Nutrition Preview:</h4>
              <div className="nutrition-grid">
                <div className="nutrition-item">
                  <span className="nutrition-label">Calories</span>
                  <span className="nutrition-value">{previewNutrition.calories}</span>
                </div>
                <div className="nutrition-item">
                  <span className="nutrition-label">Protein</span>
                  <span className="nutrition-value">{previewNutrition.protein}g</span>
                </div>
                <div className="nutrition-item">
                  <span className="nutrition-label">Carbs</span>
                  <span className="nutrition-value">{previewNutrition.carbohydrates}g</span>
                </div>
                <div className="nutrition-item">
                  <span className="nutrition-label">Fat</span>
                  <span className="nutrition-value">{previewNutrition.fat}g</span>
                </div>
                <div className="nutrition-item">
                  <span className="nutrition-label">Fiber</span>
                  <span className="nutrition-value">{previewNutrition.fiber}g</span>
                </div>
                <div className="nutrition-item">
                  <span className="nutrition-label">Sugar</span>
                  <span className="nutrition-value">{previewNutrition.sugar}g</span>
                </div>
              </div>
              <p className="nutrition-note">
                * Nutrition values update automatically as you change the weight
              </p>
            </div>
          )}

          <div className="manual-actions">
            <button 
              onClick={handleConfirm}
              disabled={!weight || !!error}
              className="confirm-button"
            >
              Confirm Weight
            </button>
            {detectedWeight && (
              <button 
                onClick={() => {
                  setManualEntry(false);
                  setWeight(detectedWeight.value.toString());
                  setUnit(detectedWeight.unit);
                  setError('');
                }}
                className="back-button"
              >
                Back to Detected Weight
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};