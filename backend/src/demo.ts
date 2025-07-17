/**
 * Demo script to test USDA API integration and OCR functionality
 */

import { config } from 'dotenv';
import { NutritionService } from './services/NutritionService.js';
import { OCRService } from './services/OCRService.js';
import { resolve } from 'path';
import sharp from 'sharp';

// Load environment variables from the correct path
config({ path: resolve(process.cwd(), '.env') });

async function testUSDAAPI() {
  console.log('Testing USDA API integration and OCR functionality...');
  console.log('API Key:', process.env.USDA_API_KEY ? `Present (${process.env.USDA_API_KEY.substring(0, 8)}...)` : 'Missing');
  
  const nutritionService = new NutritionService();
  const ocrService = new OCRService();
  
  try {
    console.log('\n1. Testing food search...');
    const searchResults = await nutritionService.searchFoodDatabase('apple', 3);
    console.log('Search results:', searchResults.length, 'foods found');
    
    if (searchResults.length > 0) {
      console.log('First result:', searchResults[0]);
      
      console.log('\n2. Testing nutrition data retrieval...');
      const nutrition = await nutritionService.getNutritionData(searchResults[0].id, 100);
      console.log('Nutrition for 100g:', nutrition);
      
      console.log('\n3. Testing weight scaling...');
      const nutrition200g = await nutritionService.getNutritionData(searchResults[0].id, 200);
      console.log('Nutrition for 200g:', nutrition200g);
      
      console.log('\n4. Testing meal calculation...');
      const mealComponents = [
        {
          food: searchResults[0],
          weight: 100,
          nutrition: nutrition,
          addedAt: new Date()
        }
      ];
      
      const mealNutrition = await nutritionService.calculateMealNutrition(mealComponents);
      console.log('Meal nutrition:', mealNutrition);
    }
    
    console.log('\n5. Testing cache stats...');
    const cacheStats = nutritionService.getCacheStats();
    console.log('Cache stats:', cacheStats);
    
    console.log('\n6. Testing OCR functionality...');
    
    // Create a test image with scale display text
    const testImage = await sharp({
      create: {
        width: 400,
        height: 300,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    }).png().toBuffer();

    console.log('   Created test image...');
    
    const weightReading = await ocrService.readScaleWeight(testImage);
    console.log(`   OCR Result: ${weightReading.value}${weightReading.unit} (confidence: ${weightReading.confidence}%)`);
    console.log(`   Raw text: "${weightReading.rawText}"`);
    
    // Test scale validation
    const scaleValidation = await ocrService.validateScaleImage(testImage);
    console.log(`   Scale detected: ${scaleValidation.hasScale} (confidence: ${scaleValidation.confidence}%)`);
    
    if (scaleValidation.suggestions.length > 0) {
      console.log('   Suggestions:', scaleValidation.suggestions.slice(0, 2).join(', '));
    }
    
    console.log('\n7. Testing OCR error handling...');
    const emptyBuffer = Buffer.alloc(0);
    const errorResult = await ocrService.readScaleWeight(emptyBuffer);
    console.log(`   Empty image result: confidence ${errorResult.confidence}%, message: "${errorResult.rawText}"`);
    
  } catch (error) {
    console.error('Error during testing:', error);
  }
}

// Run the test
testUSDAAPI().then(() => {
  console.log('\nDemo completed!');
}).catch(error => {
  console.error('Demo failed:', error);
});