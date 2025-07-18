import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { WeightConfirmation } from './WeightConfirmation';

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
  potassium: 161,
  baseWeight: 100 // Base weight for scaling calculations
};

describe('WeightConfirmation', () => {
  const mockOnWeightConfirm = vi.fn();
  const mockOnWeightChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading state when isLoading is true', () => {
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
          isLoading={true}
        />
      );

      expect(screen.getByText('Reading scale...')).toBeInTheDocument();
      expect(screen.getByText('Please wait while we analyze the weight display')).toBeInTheDocument();
    });
  });

  describe('Detected Weight Display', () => {
    it('should display detected weight with confidence indicator', () => {
      render(
        <WeightConfirmation
          detectedWeight={mockWeightReading}
          onWeightConfirm={mockOnWeightConfirm}
        />
      );

      expect(screen.getByText('150.5 g')).toBeInTheDocument();
      expect(screen.getByText('Confidence: 87%')).toBeInTheDocument();
      expect(screen.getByText('Raw reading: "150.5g"')).toBeInTheDocument();
    });

    it('should show confirm and manual entry buttons for detected weight', () => {
      render(
        <WeightConfirmation
          detectedWeight={mockWeightReading}
          onWeightConfirm={mockOnWeightConfirm}
        />
      );

      expect(screen.getByText('Confirm Weight')).toBeInTheDocument();
      expect(screen.getByText('Enter Manually')).toBeInTheDocument();
    });

    it('should call onWeightConfirm when confirm button is clicked', async () => {
      render(
        <WeightConfirmation
          detectedWeight={mockWeightReading}
          onWeightConfirm={mockOnWeightConfirm}
        />
      );

      fireEvent.click(screen.getByText('Confirm Weight'));
      expect(mockOnWeightConfirm).toHaveBeenCalledWith(150.5, 'g');
    });
  });

  describe('Manual Weight Entry', () => {
    it('should show manual entry form when no weight is detected', () => {
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
        />
      );

      expect(screen.getByText('Unable to read the scale display clearly.')).toBeInTheDocument();
      expect(screen.getByText('Please enter the weight manually:')).toBeInTheDocument();
      expect(screen.getByLabelText('Weight:')).toBeInTheDocument();
    });

    it('should switch to manual entry when Enter Manually is clicked', async () => {
      render(
        <WeightConfirmation
          detectedWeight={mockWeightReading}
          onWeightConfirm={mockOnWeightConfirm}
        />
      );

      fireEvent.click(screen.getByText('Enter Manually'));
      
      await waitFor(() => {
        expect(screen.getByLabelText('Weight:')).toBeInTheDocument();
      });
    });

    it('should allow weight input and unit selection', async () => {
      const user = userEvent.setup();
      
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
        />
      );

      const weightInput = screen.getByLabelText('Weight:');
      const unitSelect = screen.getByDisplayValue('grams (g)');

      await user.type(weightInput, '200');
      await user.selectOptions(unitSelect, 'oz');

      expect(weightInput).toHaveValue(200);
      expect(unitSelect).toHaveValue('oz');
    });

    it('should show weight conversions when valid weight is entered', async () => {
      const user = userEvent.setup();
      
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
        />
      );

      const weightInput = screen.getByLabelText('Weight:');
      await user.type(weightInput, '100');

      await waitFor(() => {
        expect(screen.getByText('Conversions:')).toBeInTheDocument();
        expect(screen.getByText('100.0g')).toBeInTheDocument();
        expect(screen.getByText('3.53oz')).toBeInTheDocument();
        expect(screen.getByText('0.220lb')).toBeInTheDocument();
      });
    });
  });

  describe('Weight Validation', () => {
    it('should show error for negative weight', async () => {
      const user = userEvent.setup();
      
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
        />
      );

      const weightInput = screen.getByLabelText('Weight:');
      await user.type(weightInput, '-10');
      
      fireEvent.click(screen.getByText('Confirm Weight'));

      await waitFor(() => {
        expect(screen.getByText('Weight must be greater than 0')).toBeInTheDocument();
      });
    });

    it('should show error for weight too high', async () => {
      const user = userEvent.setup();
      
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
        />
      );

      const weightInput = screen.getByLabelText('Weight:');
      await user.type(weightInput, '15000');
      
      fireEvent.click(screen.getByText('Confirm Weight'));

      await waitFor(() => {
        expect(screen.getByText('Weight seems too high. Maximum weight is 10kg (10,000g)')).toBeInTheDocument();
      });
    });

    it('should show error when new weight is not greater than previous weight', async () => {
      const user = userEvent.setup();
      
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
          previousWeight={200}
        />
      );

      const weightInput = screen.getByLabelText('Weight:');
      await user.type(weightInput, '150');
      
      fireEvent.click(screen.getByText('Confirm Weight'));

      await waitFor(() => {
        expect(screen.getByText(/New weight.*should be greater than previous weight/)).toBeInTheDocument();
      });
    });

    it('should show error for invalid number input', async () => {
      const user = userEvent.setup();
      
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
        />
      );

      const weightInput = screen.getByLabelText('Weight:');
      await user.type(weightInput, 'abc');
      
      fireEvent.click(screen.getByText('Confirm Weight'));

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid number')).toBeInTheDocument();
      });
    });
  });

  describe('Previous Weight Display', () => {
    it('should display previous weight when provided', () => {
      render(
        <WeightConfirmation
          detectedWeight={mockWeightReading}
          onWeightConfirm={mockOnWeightConfirm}
          previousWeight={100}
        />
      );

      expect(screen.getByText('Previous weight: 100g')).toBeInTheDocument();
    });
  });

  describe('Real-time Weight Changes', () => {
    it('should call onWeightChange when weight is modified', async () => {
      const user = userEvent.setup();
      
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
          onWeightChange={mockOnWeightChange}
        />
      );

      const weightInput = screen.getByLabelText('Weight:');
      await user.type(weightInput, '200');

      await waitFor(() => {
        expect(mockOnWeightChange).toHaveBeenCalledWith(200, 'g');
      });
    });

    it('should not call onWeightChange for invalid weights', async () => {
      const user = userEvent.setup();
      
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
          onWeightChange={mockOnWeightChange}
        />
      );

      const weightInput = screen.getByLabelText('Weight:');
      await user.type(weightInput, '-10');

      await waitFor(() => {
        expect(mockOnWeightChange).not.toHaveBeenCalled();
      });
    });
  });

  describe('Nutrition Preview', () => {
    it('should show nutrition preview when enabled and nutrition data is provided', async () => {
      const user = userEvent.setup();
      
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
          currentNutrition={mockNutrition}
          showNutritionPreview={true}
        />
      );

      const weightInput = screen.getByLabelText('Weight:');
      await user.type(weightInput, '200');

      await waitFor(() => {
        expect(screen.getByText('Nutrition Preview:')).toBeInTheDocument();
        expect(screen.getByText('156')).toBeInTheDocument(); // 78 * 2 = 156 calories
        expect(screen.getByText('0.8g')).toBeInTheDocument(); // 0.4 * 2 = 0.8g protein
      });
    });

    it('should update nutrition preview when weight changes', async () => {
      const user = userEvent.setup();
      
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
          currentNutrition={mockNutrition}
          showNutritionPreview={true}
        />
      );

      const weightInput = screen.getByLabelText('Weight:');
      
      // First weight
      await user.type(weightInput, '100');
      await waitFor(() => {
        expect(screen.getByText('78')).toBeInTheDocument(); // Base calories
      });

      // Clear and enter new weight
      await user.clear(weightInput);
      await user.type(weightInput, '300');
      
      await waitFor(() => {
        expect(screen.getByText('234')).toBeInTheDocument(); // 78 * 3 = 234 calories
      });
    });

    it('should show nutrition note about automatic updates', async () => {
      const user = userEvent.setup();
      
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
          currentNutrition={mockNutrition}
          showNutritionPreview={true}
        />
      );

      const weightInput = screen.getByLabelText('Weight:');
      await user.type(weightInput, '200');

      await waitFor(() => {
        expect(screen.getByText('* Nutrition values update automatically as you change the weight')).toBeInTheDocument();
      });
    });
  });

  describe('Back to Detected Weight', () => {
    it('should show back button when in manual entry mode with detected weight', async () => {
      render(
        <WeightConfirmation
          detectedWeight={mockWeightReading}
          onWeightConfirm={mockOnWeightConfirm}
        />
      );

      fireEvent.click(screen.getByText('Enter Manually'));
      
      await waitFor(() => {
        expect(screen.getByText('Back to Detected Weight')).toBeInTheDocument();
      });
    });

    it('should return to detected weight when back button is clicked', async () => {
      render(
        <WeightConfirmation
          detectedWeight={mockWeightReading}
          onWeightConfirm={mockOnWeightConfirm}
        />
      );

      // Switch to manual entry
      fireEvent.click(screen.getByText('Enter Manually'));
      
      await waitFor(() => {
        expect(screen.getByLabelText('Weight:')).toBeInTheDocument();
      });

      // Go back to detected weight
      fireEvent.click(screen.getByText('Back to Detected Weight'));
      
      await waitFor(() => {
        expect(screen.getByText('150.5 g')).toBeInTheDocument();
        expect(screen.getByText('Confidence: 87%')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for form inputs', () => {
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
        />
      );

      expect(screen.getByLabelText('Weight:')).toBeInTheDocument();
    });

    it('should disable confirm button when there are errors', async () => {
      const user = userEvent.setup();
      
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
        />
      );

      const weightInput = screen.getByLabelText('Weight:');
      await user.type(weightInput, '-10');

      const confirmButton = screen.getByRole('button', { name: 'Confirm Weight' });
      expect(confirmButton).toBeDisabled();
    });

    it('should enable confirm button when weight is valid', async () => {
      const user = userEvent.setup();
      
      render(
        <WeightConfirmation
          onWeightConfirm={mockOnWeightConfirm}
        />
      );

      const weightInput = screen.getByLabelText('Weight:');
      await user.type(weightInput, '200');

      const confirmButton = screen.getByRole('button', { name: 'Confirm Weight' });
      expect(confirmButton).not.toBeDisabled();
    });
  });
});