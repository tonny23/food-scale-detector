import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { ImageUpload } from '../components/ImageUpload';

export const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImageUpload = async (file: File) => {
    setIsProcessing(true);
    
    try {
      // Store the uploaded file for processing
      // In a real app, this would upload to the backend
      const fileUrl = URL.createObjectURL(file);
      sessionStorage.setItem('uploadedImage', fileUrl);
      sessionStorage.setItem('uploadedImageFile', JSON.stringify({
        name: file.name,
        size: file.size,
        type: file.type
      }));
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Navigate to confirmation page
      navigate('/confirm-food');
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Layout title="Upload Food Image">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ color: '#2d3748', marginBottom: '1rem' }}>
          Get Nutrition Information
        </h2>
        <p style={{ color: '#718096', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          Take a photo of your food on a scale to automatically detect the food type, 
          read the weight, and get detailed nutrition information.
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