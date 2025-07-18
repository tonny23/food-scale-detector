import { convertWeight, formatWeight, validateFoodWeight, scaleNutritionValues, calculateWeightDifference } from './utils/conversions.js';
import { WeightReadingSchema, NutritionInfoSchema } from './schemas/validation.js';

// Demo data for weight confirmation functionality
const mockWeightReading = {
  value: 150.5,
  unit: 'g' as const,
  confidence: 0.87,
  rawText: '150.5g'
};

const mockNutrition = {
  calories: 78,
  protein: 0.4,
  carbohydrates: 21,
  fat: 0.2,
  fiber: 4,
  sodium: 1,
  sugar: 16,
  saturatedFat: 0.1,
  cholesterol: 0,
  potassium: 161
};

console.log('=== Weight Confirmation & Correction Demo ===\n');

// Test weight reading validation
console.log('1. Weight Reading Validation:');
try {
  const validatedWeight = WeightReadingSchema.parse(mockWeightReading);
  console.log('✅ Weight reading is valid:', validatedWeight);
  console.log(`   Confidence: ${(validatedWeight.confidence * 100).toFixed(1)}%`);
} catch (error) {
  console.log('❌ Weight reading validation failed:', error);
}

// Test nutrition info validation
console.log('\n2. Nutrition Info Validation:');
try {
  const validatedNutrition = NutritionInfoSchema.parse(mockNutrition);
  console.log('✅ Nutrition info is valid');
  console.log(`   Calories: ${validatedNutrition.calories}, Protein: ${validatedNutrition.protein}g`);
} catch (error) {
  console.log('❌ Nutrition info validation failed:', error);
}

// Test unit conversions for weight confirmation
console.log('\n3. Weight Unit Conversions:');
const testWeights = [
  { value: 150, unit: 'g' as const },
  { value: 5.3, unit: 'oz' as const },
  { value: 0.33, unit: 'lb' as const }
];

testWeights.forEach(weight => {
  console.log(`${weight.value}${weight.unit}:`);
  console.log(`  → ${convertWeight(weight.value, weight.unit, 'g').toFixed(1)}g`);
  console.log(`  → ${convertWeight(weight.value, weight.unit, 'oz').toFixed(2)}oz`);
  console.log(`  → ${convertWeight(weight.value, weight.unit, 'lb').toFixed(3)}lb`);
});

// Test weight validation for different scenarios
console.log('\n4. Weight Validation Scenarios:');
const validationTests = [
  { weight: 100, unit: 'g', desc: 'Normal weight' },
  { weight: 0.05, unit: 'g', desc: 'Too small' },
  { weight: 15000, unit: 'g', desc: 'Too large' },
  { weight: -10, unit: 'g', desc: 'Negative weight' },
  { weight: 2.5, unit: 'lb', desc: 'Normal weight in pounds' }
];

validationTests.forEach(test => {
  const isValid = validateFoodWeight(test.weight, test.unit as any);
  console.log(`${test.weight}${test.unit} (${test.desc}): ${isValid ? '✅ Valid' : '❌ Invalid'}`);
});

// Test sequential weight additions (for multi-ingredient meals)
console.log('\n5. Sequential Weight Addition:');
try {
  const previousWeight = 150; // grams
  const currentWeight = 275; // grams
  
  const difference = calculateWeightDifference(currentWeight, 'g', previousWeight, 'g');
  console.log(`Previous weight: ${previousWeight}g`);
  console.log(`Current weight: ${currentWeight}g`);
  console.log(`New ingredient weight: ${difference.difference.toFixed(1)}${difference.unit}`);
} catch (error) {
  console.log('❌ Weight difference calculation failed:', error);
}

// Test nutrition recalculation for weight corrections
console.log('\n6. Nutrition Recalculation for Weight Corrections:');
const originalWeight = 100; // grams
const correctedWeights = [150, 200, 75]; // grams

console.log(`Original nutrition (${originalWeight}g):`, mockNutrition);

correctedWeights.forEach(newWeight => {
  const scaledNutrition = scaleNutritionValues(mockNutrition, originalWeight, newWeight);
  console.log(`\nCorrected nutrition (${newWeight}g):`);
  console.log(`  Calories: ${scaledNutrition.calories} (${((scaledNutrition.calories / mockNutrition.calories - 1) * 100).toFixed(0)}% change)`);
  console.log(`  Protein: ${scaledNutrition.protein}g`);
  console.log(`  Carbs: ${scaledNutrition.carbohydrates}g`);
});

// Test weight correction validation
console.log('\n7. Weight Correction Validation:');
const correctionScenarios = [
  { current: 200, previous: 150, desc: 'Valid increase' },
  { current: 150, previous: 200, desc: 'Invalid decrease' },
  { current: 150, previous: 150, desc: 'No change' },
  { current: 6000, previous: 150, desc: 'Too large increase' }
];

correctionScenarios.forEach(scenario => {
  try {
    if (scenario.current <= scenario.previous) {
      throw new Error('New weight must be greater than previous weight');
    }
    if (scenario.current - scenario.previous > 5000) {
      throw new Error('Weight increase too large');
    }
    console.log(`${scenario.current}g → ${scenario.previous}g (${scenario.desc}): ✅ Valid`);
  } catch (error) {
    console.log(`${scenario.current}g → ${scenario.previous}g (${scenario.desc}): ❌ ${error.message}`);
  }
});

// Test real-time nutrition preview calculation
console.log('\n8. Real-time Nutrition Preview:');
const baseNutrition = { ...mockNutrition, baseWeight: 100 };
const previewWeights = [50, 100, 150, 200, 300];

console.log('Weight → Calories (Preview):');
previewWeights.forEach(weight => {
  const ratio = weight / baseNutrition.baseWeight;
  const previewCalories = Math.round(baseNutrition.calories * ratio);
  console.log(`  ${weight}g → ${previewCalories} calories`);
});

console.log('\n=== Weight Confirmation Demo Complete ===');