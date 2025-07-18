import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FoodConfirmation } from '../components/FoodConfirmation';

interface FoodItem {
  id: string;
  name: string;
  confidence: number;
  alternativeNames: string[];
  category: string;
}

export const FoodConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [detectedFood, setDetectedFood] = useState<FoodItem[]>([]);

  useEffect(() => {
    // Check if we have an uploaded image
    const uploadedImage = sessionStorage.getItem('uploadedImage');
    if (!uploadedImage) {
      navigate('/');
      return;
    }

    // Simulate food detection
    const simulateDetection = async () => {
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock detected food data
      const mockDetectedFood: FoodItem[] = [
        {
          id: '1',
          name: 'Apple',
          confidence: 0.92,
          alternativeNames: ['Red Apple', 'Gala Apple'],
          category: 'Fruits'
        },
        {
          id: '2',
          name: 'Orange',
          confidence: 0.78,
          alternativeNames: ['Navel Orange', 'Valencia Orange'],
          category: 'Fruits'
        },
        {
          id: '3',
          name: 'Banana',
          confidence: 0.65,
          alternativeNames: ['Yellow Banana', 'Cavendish Banana'],
          category: 'Fruits'
        }
      ];
      
      setDetectedFood(mockDetectedFood);
      setIsLoading(false);
    };

    simulateDetection();
  }, [navigate]);

  const handleFoodConfirm = (food: FoodItem) => {
    // Store selected food
    sessionStorage.setItem('selectedFood', JSON.stringify(food));
    
    // Navigate to weight confirmation
    navigate('/confirm-weight');
  };

  const handleManualSearch = () => {
    // This is now handled by the FoodConfirmation component itself
    // No need for additional logic here
  };

  return (
    <Layout title="Confirm Food Type">
      <div style={{ marginBottom: '1rem' }}>
        <button 
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: '#4299e1',
            cursor: 'pointer',
            fontSize: '0.875rem',
            textDecoration: 'underline'
          }}
        >
          ← Back to Upload
        </button>
      </div>
      
      <FoodConfirmation
        detectedFood={detectedFood}
        onFoodConfirm={handleFoodConfirm}
        onManualSearch={handleManualSearch}
        isLoading={isLoading}
      />
    </Layout>
  );
};