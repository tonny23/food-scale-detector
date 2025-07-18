import React, { useState } from 'react';
import { FoodSearch } from '../FoodSearch';
import './FoodConfirmation.css';

interface FoodItem {
  id: string;
  name: string;
  confidence: number;
  alternativeNames: string[];
  category: string;
}

interface FoodConfirmationProps {
  detectedFood: FoodItem[];
  onFoodConfirm: (food: FoodItem) => void;
  onManualSearch?: () => void;
  isLoading?: boolean;
}

export const FoodConfirmation: React.FC<FoodConfirmationProps> = ({
  detectedFood,
  onFoodConfirm,
  onManualSearch,
  isLoading = false
}) => {
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  const handleFoodSelect = (food: FoodItem) => {
    setSelectedFood(food);
  };

  const handleConfirm = () => {
    if (selectedFood) {
      onFoodConfirm(selectedFood);
    }
  };

  const handleManualSearchClick = () => {
    if (onManualSearch) {
      onManualSearch();
    } else {
      setIsSearchModalOpen(true);
    }
  };

  const handleSearchFoodSelect = (food: FoodItem) => {
    setIsSearchModalOpen(false);
    onFoodConfirm(food);
  };

  const handleSearchCancel = () => {
    setIsSearchModalOpen(false);
  };

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  if (isLoading) {
    return (
      <div className="food-confirmation-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <h3>Detecting food...</h3>
          <p>Please wait while we analyze your image</p>
        </div>
      </div>
    );
  }

  if (!detectedFood || detectedFood.length === 0) {
    return (
      <div className="food-confirmation-container">
        <div className="no-detection">
          <div className="no-detection-icon">🤔</div>
          <h3>No food detected</h3>
          <p>We couldn't identify any food in your image. Please try:</p>
          <ul>
            <li>Taking a clearer photo</li>
            <li>Ensuring good lighting</li>
            <li>Making sure the food is clearly visible</li>
          </ul>
          <button onClick={handleManualSearchClick} className="manual-search-button">
            Search Manually
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="food-confirmation-container">
      <div className="confirmation-header">
        <h2>Confirm Food Type</h2>
        <p>Select the food that matches what's in your image:</p>
      </div>

      <div className="food-options">
        {detectedFood.map((food) => (
          <div
            key={food.id}
            className={`food-option ${selectedFood?.id === food.id ? 'selected' : ''}`}
            onClick={() => handleFoodSelect(food)}
          >
            <div className="food-info">
              <h3 className="food-name">{food.name}</h3>
              <div className="food-details">
                <span className="confidence">
                  Confidence: {formatConfidence(food.confidence)}
                </span>
                <span className="category">{food.category}</span>
              </div>
              {food.alternativeNames.length > 0 && (
                <div className="alternative-names">
                  <span>Also known as: </span>
                  {food.alternativeNames.join(', ')}
                </div>
              )}
            </div>
            <div className="selection-indicator">
              {selectedFood?.id === food.id && <span>✓</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="confirmation-actions">
        <button
          onClick={handleConfirm}
          disabled={!selectedFood}
          className="confirm-button"
        >
          Confirm Selection
        </button>
        <button
          onClick={handleManualSearchClick}
          className="manual-search-button secondary"
        >
          None of these? Search manually
        </button>
      </div>

      <FoodSearch
        isOpen={isSearchModalOpen}
        onFoodSelect={handleSearchFoodSelect}
        onCancel={handleSearchCancel}
      />
    </div>
  );
};