import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { WeightConfirmation } from '../components/WeightConfirmation';

interface WeightReading {
  value: number;
  unit: 'g' | 'oz' | 'lb';
  confidence: number;
  rawText: string;
}

export const WeightConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [detectedWeight, setDetectedWeight] = useState<WeightReading | undefined>();

  useEffect(() => {
    // Check if we have selected food
    const selectedFood = sessionStorage.getItem('selectedFood');
    if (!selectedFood) {
      navigate('/');
      return;
    }

    // Simulate weight detection
    const simulateWeightDetection = async () => {
      setIsLoading(true);
      
      // Simulate OCR processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock detected weight data
      const mockDetectedWeight: WeightReading = {
        value: 150.5,
        unit: 'g',
        confidence: 0.87,
        rawText: '150.5g'
      };
      
      setDetectedWeight(mockDetectedWeight);
      setIsLoading(false);
    };

    simulateWeightDetection();
  }, [navigate]);

  const handleWeightConfirm = (weight: number, unit: string) => {
    // Store confirmed weight
    sessionStorage.setItem('confirmedWeight', JSON.stringify({ weight, unit }));
    
    // Navigate to results page
    navigate('/results');
  };

  return (
    <Layout title="Confirm Weight">
      <div style={{ marginBottom: '1rem' }}>
        <button 
          onClick={() => navigate('/confirm-food')}
          style={{
            background: 'none',
            border: 'none',
            color: '#4299e1',
            cursor: 'pointer',
            fontSize: '0.875rem',
            textDecoration: 'underline'
          }}
        >
          ← Back to Food Confirmation
        </button>
      </div>
      
      <WeightConfirmation
        detectedWeight={detectedWeight}
        onWeightConfirm={handleWeightConfirm}
        isLoading={isLoading}
      />
    </Layout>
  );
};