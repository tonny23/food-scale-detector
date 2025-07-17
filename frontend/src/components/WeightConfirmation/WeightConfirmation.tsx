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
  isLoading?: boolean;
  previousWeight?: number;
}

export const WeightConfirmation: React.FC<WeightConfirmationProps> = ({
  detectedWeight,
  onWeightConfirm,
  isLoading = false,
  previousWeight
}) => {
  const [manualEntry, setManualEntry] = useState(false);
  const [weight, setWeight] = useState<string>('');
  const [unit, setUnit] = useState<'g' | 'oz' | 'lb'>('g');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (detectedWeight) {
      setWeight(detectedWeight.value.toString());
      setUnit(detectedWeight.unit);
    }
  }, [detectedWeight]);

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
    if (weightValue > 10000) {
      return 'Weight seems too high. Please check your input.';
    }
    if (previousWeight && weightValue <= previousWeight) {
      return 'New weight should be greater than previous weight';
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