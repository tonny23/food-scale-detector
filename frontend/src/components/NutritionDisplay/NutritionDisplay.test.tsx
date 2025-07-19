import React from 'react';
import { render, screen } from '@testing-library/react';
import { NutritionDisplay } from './NutritionDisplay';

const mockNutrition = {
  calories: 150,
  protein: 5.2,
  carbohydrates: 25.8,
  fat: 3.1,
  fiber: 4.2,
  sodium: 120,
  sugar: 18.5,
  saturatedFat: 0.8,
  cholesterol: 0,
  potassium: 195
};

const mockFood = {
  id: 'apple-001',
  name: 'Red Apple',
  confidence: 85,
  alternativeNames: ['Apple', 'Red Delicious'],
  category: 'Fruit'
};

describe('NutritionDisplay', () => {
  it('renders nutrition information correctly', () => {
    render(
      <NutritionDisplay
        nutrition={mockNutrition}
        food={mockFood}
        weight={150}
      />
    );

    // Check if calories are displayed
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Calories')).toBeInTheDocument();

    // Check if food name is displayed
    expect(screen.getByText('Red Apple')).toBeInTheDocument();
    expect(screen.getByText('Fruit')).toBeInTheDocument();

    // Check if weight is displayed
    expect(screen.getByText('150.0g')).toBeInTheDocument();

    // Check if macronutrients are displayed
    expect(screen.getByText('5.2g')).toBeInTheDocument(); // Protein
    expect(screen.getByText('25.8g')).toBeInTheDocument(); // Carbs
    expect(screen.getByText('3.1g')).toBeInTheDocument(); // Fat
  });

  it('renders compact version correctly', () => {
    render(
      <NutritionDisplay
        nutrition={mockNutrition}
        food={mockFood}
        weight={150}
        compact={true}
        showTitle={false}
      />
    );

    // Should still show nutrition values in compact format
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('5.2g')).toBeInTheDocument();
    expect(screen.getByText('25.8g')).toBeInTheDocument();
    expect(screen.getByText('3.1g')).toBeInTheDocument();

    // Should not show food name when showTitle is false
    expect(screen.queryByText('Red Apple')).not.toBeInTheDocument();
  });

  it('renders without food information', () => {
    render(
      <NutritionDisplay
        nutrition={mockNutrition}
        weight={150}
      />
    );

    // Should still show nutrition values
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Calories')).toBeInTheDocument();

    // Should show weight
    expect(screen.getByText('150.0g')).toBeInTheDocument();
  });

  it('formats nutrition values correctly', () => {
    render(
      <NutritionDisplay
        nutrition={mockNutrition}
      />
    );

    // Check formatting of different units
    expect(screen.getByText('120mg')).toBeInTheDocument(); // Sodium
    expect(screen.getByText('195mg')).toBeInTheDocument(); // Potassium
    expect(screen.getByText('4.2g')).toBeInTheDocument(); // Fiber
    expect(screen.getByText('18.5g')).toBeInTheDocument(); // Sugar
  });

  it('applies custom className', () => {
    const { container } = render(
      <NutritionDisplay
        nutrition={mockNutrition}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('nutrition-display');
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders all nutrient sections', () => {
    render(
      <NutritionDisplay
        nutrition={mockNutrition}
        food={mockFood}
      />
    );

    // Check section titles
    expect(screen.getByText('Macronutrients')).toBeInTheDocument();
    expect(screen.getByText('Other Nutrients')).toBeInTheDocument();

    // Check specific nutrients
    expect(screen.getByText('Dietary Fiber')).toBeInTheDocument();
    expect(screen.getByText('Total Sugars')).toBeInTheDocument();
    expect(screen.getByText('Saturated Fat')).toBeInTheDocument();
    expect(screen.getByText('Cholesterol')).toBeInTheDocument();
    expect(screen.getByText('Sodium')).toBeInTheDocument();
    expect(screen.getByText('Potassium')).toBeInTheDocument();
  });

  it('handles zero values correctly', () => {
    const zeroNutrition = {
      ...mockNutrition,
      cholesterol: 0,
      saturatedFat: 0
    };

    render(
      <NutritionDisplay
        nutrition={zeroNutrition}
      />
    );

    expect(screen.getByText('0mg')).toBeInTheDocument(); // Cholesterol
    expect(screen.getByText('0.0g')).toBeInTheDocument(); // Saturated Fat
  });
});