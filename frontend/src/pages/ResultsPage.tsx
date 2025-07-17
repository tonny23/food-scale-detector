import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';

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

export const ResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [foodItem, setFoodItem] = useState<FoodItem | null>(null);
  const [weight, setWeight] = useState<{ weight: number; unit: string } | null>(null);
  const [nutrition, setNutrition] = useState<NutritionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if we have all required data
    const selectedFood = sessionStorage.getItem('selectedFood');
    const confirmedWeight = sessionStorage.getItem('confirmedWeight');
    
    if (!selectedFood || !confirmedWeight) {
      navigate('/');
      return;
    }

    const food = JSON.parse(selectedFood);
    const weightData = JSON.parse(confirmedWeight);
    
    setFoodItem(food);
    setWeight(weightData);

    // Simulate nutrition calculation
    const calculateNutrition = async () => {
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock nutrition data (per 100g, scaled to actual weight)
      const baseNutrition = {
        calories: 52,
        protein: 0.3,
        carbohydrates: 14,
        fat: 0.2,
        fiber: 2.4,
        sodium: 1,
        sugar: 10.4,
        saturatedFat: 0.1,
        cholesterol: 0,
        potassium: 107
      };

      // Convert weight to grams for calculation
      let weightInGrams = weightData.weight;
      if (weightData.unit === 'oz') {
        weightInGrams = weightData.weight * 28.3495;
      } else if (weightData.unit === 'lb') {
        weightInGrams = weightData.weight * 453.592;
      }

      // Scale nutrition values based on actual weight
      const scaleFactor = weightInGrams / 100;
      const scaledNutrition: NutritionInfo = {
        calories: Math.round(baseNutrition.calories * scaleFactor),
        protein: Math.round(baseNutrition.protein * scaleFactor * 10) / 10,
        carbohydrates: Math.round(baseNutrition.carbohydrates * scaleFactor * 10) / 10,
        fat: Math.round(baseNutrition.fat * scaleFactor * 10) / 10,
        fiber: Math.round(baseNutrition.fiber * scaleFactor * 10) / 10,
        sodium: Math.round(baseNutrition.sodium * scaleFactor),
        sugar: Math.round(baseNutrition.sugar * scaleFactor * 10) / 10,
        saturatedFat: Math.round(baseNutrition.saturatedFat * scaleFactor * 10) / 10,
        cholesterol: Math.round(baseNutrition.cholesterol * scaleFactor),
        potassium: Math.round(baseNutrition.potassium * scaleFactor)
      };
      
      setNutrition(scaledNutrition);
      setIsLoading(false);
    };

    calculateNutrition();
  }, [navigate]);

  const handleStartOver = () => {
    // Clear session storage
    sessionStorage.removeItem('uploadedImage');
    sessionStorage.removeItem('uploadedImageFile');
    sessionStorage.removeItem('selectedFood');
    sessionStorage.removeItem('confirmedWeight');
    
    navigate('/');
  };

  const handleAddMore = () => {
    // In a real app, this would start the sequential ingredient addition flow
    alert('Sequential ingredient addition would be implemented here');
  };

  if (isLoading) {
    return (
      <Layout title="Calculating Nutrition">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #4299e1',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#2d3748' }}>
            Calculating nutrition information...
          </h3>
          <p style={{ margin: 0, color: '#718096' }}>
            Please wait while we process your food data
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Nutrition Results">
      <div style={{ marginBottom: '1rem' }}>
        <button 
          onClick={() => navigate('/confirm-weight')}
          style={{
            background: 'none',
            border: 'none',
            color: '#4299e1',
            cursor: 'pointer',
            fontSize: '0.875rem',
            textDecoration: 'underline'
          }}
        >
          ← Back to Weight Confirmation
        </button>
      </div>

      {foodItem && weight && nutrition && (
        <div>
          {/* Food Summary */}
          <div style={{
            backgroundColor: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', color: '#2d3748' }}>
              {foodItem.name}
            </h2>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span style={{
                backgroundColor: '#48bb78',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.875rem'
              }}>
                {foodItem.category}
              </span>
              <span style={{
                backgroundColor: '#ed8936',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.875rem'
              }}>
                {weight.weight} {weight.unit}
              </span>
            </div>
          </div>

          {/* Nutrition Information */}
          <div style={{
            backgroundColor: 'white',
            border: '2px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#2d3748' }}>
              Nutrition Information
            </h3>
            
            {/* Calories - Featured */}
            <div style={{
              backgroundColor: '#4299e1',
              color: 'white',
              padding: '1rem',
              borderRadius: '8px',
              textAlign: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                {nutrition.calories}
              </div>
              <div style={{ fontSize: '0.875rem' }}>Calories</div>
            </div>

            {/* Macronutrients */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2d3748' }}>
                  {nutrition.protein}g
                </div>
                <div style={{ fontSize: '0.875rem', color: '#718096' }}>Protein</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2d3748' }}>
                  {nutrition.carbohydrates}g
                </div>
                <div style={{ fontSize: '0.875rem', color: '#718096' }}>Carbs</div>
              </div>
              <div style={{ textAlign: 'center', padding: '0.75rem', backgroundColor: '#f7fafc', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#2d3748' }}>
                  {nutrition.fat}g
                </div>
                <div style={{ fontSize: '0.875rem', color: '#718096' }}>Fat</div>
              </div>
            </div>

            {/* Other Nutrients */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
              gap: '0.5rem',
              fontSize: '0.875rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <span>Fiber</span>
                <span>{nutrition.fiber}g</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <span>Sugar</span>
                <span>{nutrition.sugar}g</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <span>Sodium</span>
                <span>{nutrition.sodium}mg</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #e2e8f0' }}>
                <span>Potassium</span>
                <span>{nutrition.potassium}mg</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <button
              onClick={handleAddMore}
              style={{
                backgroundColor: '#48bb78',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                width: '100%',
                maxWidth: '300px'
              }}
            >
              Add More Ingredients
            </button>
            <button
              onClick={handleStartOver}
              style={{
                backgroundColor: '#a0aec0',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.75rem 2rem',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer',
                width: '100%',
                maxWidth: '300px'
              }}
            >
              Start Over
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};