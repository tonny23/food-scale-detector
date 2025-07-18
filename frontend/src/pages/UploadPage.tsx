import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ImageUpload } from '../components/ImageUpload';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [continuingSession, setContinuingSession] = useState<string | null>(null);

  React.useEffect(() => {
    // Check if we're continuing an existing session
    const continueSessionId = sessionStorage.getItem('continueSession');
    if (continueSessionId) {
      setContinuingSession(continueSessionId);
      // Remove the continue session flag
      sessionStorage.removeItem('continueSession');
    }
  }, []);

  const handleImageUpload = async (file: File) => {
    setIsProcessing(true);
    
    try {
      // Create FormData for the API call
      const formData = new FormData();
      formData.append('image', file);
      
      // If continuing a session, include the session ID
      if (continuingSession) {
        formData.append('sessionId', continuingSession);
      }

      // Call the backend API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process image');
      }

      const result = await response.json();
      
      // Store the processing results
      sessionStorage.setItem('sessionId', result.sessionId);
      sessionStorage.setItem('detectedFood', JSON.stringify(result.detectedFood));
      sessionStorage.setItem('detectedWeight', JSON.stringify(result.detectedWeight));
      
      if (result.weightDifference !== undefined) {
        sessionStorage.setItem('weightDifference', result.weightDifference.toString());
      }
      if (result.previousWeight !== undefined) {
        sessionStorage.setItem('previousWeight', result.previousWeight.toString());
      }
      
      // Navigate to confirmation page
      navigate('/confirm-food');
    } catch (error) {
      console.error('Error processing image:', error);
      alert(error instanceof Error ? error.message : 'Error processing image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout title="Upload Food Image">
      {continuingSession && (
        <div style={{
          backgroundColor: '#f0fff4',
          border: '2px solid #48bb78',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#2f855a' }}>
            Adding Another Ingredient
          </h3>
          <p style={{ margin: 0, color: '#38a169' }}>
            Place additional food on the scale and take a photo. The system will calculate the weight difference for the new ingredient.
          </p>
        </div>
      )}
      
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: '#2d3748', marginBottom: '1rem' }}>
          {continuingSession ? 'Add Another Ingredient' : 'Get Nutrition Information'}
        </h2>
        <p style={{ color: '#718096', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          {continuingSession 
            ? 'Add more food to your scale and take another photo to continue building your meal.'
            : 'Take a photo of your food on a scale to automatically detect the food type, read the weight, and get detailed nutrition information.'
          }
        </p>
      </div>
      
      <ImageUpload 
        onImageUpload={handleImageUpload}
        isProcessing={isProcessing}
      />
      
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        backgroundColor: '#ebf8ff', 
        borderRadius: '8px',
        fontSize: '0.875rem',
        color: '#2b6cb0'
      }}>
        <h4 style={{ margin: '0 0 0.5rem 0' }}>Tips for best results:</h4>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>Ensure good lighting</li>
          <li>Make sure the scale display is clearly visible</li>
          <li>Keep the food clearly in frame</li>
          <li>Avoid shadows on the scale display</li>
        </ul>
      </div>
    </Layout>
  );
};