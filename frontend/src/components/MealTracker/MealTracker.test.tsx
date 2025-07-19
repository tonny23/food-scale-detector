import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MealTracker } from './MealTracker';

// Mock fetch
global.fetch = vi.fn();

const mockSession = {
  id: 'test-session-123',
  components: [
    {
      food: {
        id: 'apple-123',
        name: 'Apple',
        confidence: 0.9,
        alternativeNames: ['Red Apple'],
        category: 'Fruit'
      },
      weight: 150,
      nutrition: {
        calories: 78,
        protein: 0.5,
        carbohydrates: 21,
        fat: 0.3,
        fiber: 3.6,
        sodium: 2,
        sugar: 15.6,
        saturatedFat: 0.1,
        cholesterol: 0,
        potassium: 161
      },
      addedAt: new Date('2024-01-01T10:00:00Z')
    },
    {
      food: {
        id: 'banana-456',
        name: 'Banana',
        confidence: 0.85,
        alternativeNames: [],
        category: 'Fruit'
      },
      weight: 120,
      nutrition: {
        calories: 105,
        protein: 1.3,
        carbohydrates: 27,
        fat: 0.4,
        fiber: 3.1,
        sodium: 1,
        sugar: 14.4,
        saturatedFat: 0.1,
        cholesterol: 0,
        potassium: 422
      },
      addedAt: new Date('2024-01-01T10:05:00Z')
    }
  ],
  totalWeight: 270,
  previousWeight: 150,
  createdAt: new Date('2024-01-01T09:55:00Z'),
  lastUpdated: new Date('2024-01-01T10:05:00Z')
};

const mockProps = {
  sessionId: 'test-session-123',
  onAddIngredient: vi.fn(),
  onFinalizeMeal: vi.fn(),
  onWeightCorrection: vi.fn(),
  showActions: true
};

describe('MealTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSession)
    });
  });

  it('renders loading state initially', () => {
    render(<MealTracker {...mockProps} />);
    expect(screen.getByText('Loading meal data...')).toBeInTheDocument();
  });

  it('displays meal components after loading', async () => {
    render(<MealTracker {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Meal Tracker')).toBeInTheDocument();
    });

    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('2 ingredients')).toBeInTheDocument();
    expect(screen.getByText('Total: 270.0g')).toBeInTheDocument();
  });

  it('displays cumulative nutrition correctly', async () => {
    render(<MealTracker {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Total Meal Nutrition')).toBeInTheDocument();
    });

    // Total calories should be 78 + 105 = 183
    expect(screen.getByText('183')).toBeInTheDocument();
    expect(screen.getByText('Calories')).toBeInTheDocument();

    // Total protein should be 0.5 + 1.3 = 1.8g
    expect(screen.getByText('1.8g')).toBeInTheDocument();
  });

  it('shows weight differential information', async () => {
    render(<MealTracker {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Next ingredient:/)).toBeInTheDocument();
    });

    expect(screen.getByText(/greater than 270.0g/)).toBeInTheDocument();
  });

  it('calls onAddIngredient when add ingredient button is clicked', async () => {
    render(<MealTracker {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Add Another Ingredient')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add Another Ingredient'));
    expect(mockProps.onAddIngredient).toHaveBeenCalledTimes(1);
  });

  it('calls onFinalizeMeal when finalize meal button is clicked', async () => {
    // Mock the finalize meal API call
    const mockMealNutrition = {
      totalNutrition: {
        calories: 183,
        protein: 1.8,
        carbohydrates: 48,
        fat: 0.7,
        fiber: 6.7,
        sodium: 3,
        sugar: 30,
        saturatedFat: 0.2,
        cholesterol: 0,
        potassium: 583
      },
      components: mockSession.components,
      totalWeight: 270
    };

    // First mock the session fetch, then the finalize call
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSession)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          mealNutrition: mockMealNutrition
        })
      });

    render(<MealTracker {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Finalize Meal')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Finalize Meal'));

    await waitFor(() => {
      expect(mockProps.onFinalizeMeal).toHaveBeenCalledWith(mockMealNutrition);
    });
  });

  it('allows weight editing for ingredients', async () => {
    render(<MealTracker {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('150.0g')).toBeInTheDocument();
    });

    // Click on the weight to edit it
    fireEvent.click(screen.getByText('150.0g'));

    // Should show input field
    const weightInput = screen.getByDisplayValue('150');
    expect(weightInput).toBeInTheDocument();

    // Change the weight
    fireEvent.change(weightInput, { target: { value: '160' } });

    // Mock the weight correction API call
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    // Click save button
    const saveButton = screen.getByText('✓');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/session/test-session-123/weight', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weight: 160,
          unit: 'g'
        })
      });
    });
  });

  it('displays error state when session fetch fails', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<MealTracker {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Meal')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('displays error state when session fetch fails with 404', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404
    });

    render(<MealTracker {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Meal')).toBeInTheDocument();
    });

    expect(screen.getByText('Failed to fetch session data')).toBeInTheDocument();
  });

  it('formats ingredient times correctly', async () => {
    render(<MealTracker {...mockProps} />);

    await waitFor(() => {
      // Check that times are displayed (format may vary by timezone)
      const timeElements = screen.getAllByText(/\d{1,2}:\d{2} [AP]M/);
      expect(timeElements).toHaveLength(2); // Two ingredients, two times
    });
  });

  it('displays ingredient categories as badges', async () => {
    render(<MealTracker {...mockProps} />);

    await waitFor(() => {
      const fruitBadges = screen.getAllByText('Fruit');
      expect(fruitBadges).toHaveLength(2); // One for each ingredient
    });
  });

  it('handles weight correction cancellation', async () => {
    render(<MealTracker {...mockProps} />);

    await waitFor(() => {
      expect(screen.getByText('150.0g')).toBeInTheDocument();
    });

    // Click on the weight to edit it
    fireEvent.click(screen.getByText('150.0g'));

    // Should show input field and cancel button
    const cancelButton = screen.getByText('✕');
    expect(cancelButton).toBeInTheDocument();

    // Click cancel
    fireEvent.click(cancelButton);

    // Should return to display mode
    expect(screen.getByText('150.0g')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('150')).not.toBeInTheDocument();
  });

  it('does not show actions when showActions is false', async () => {
    render(<MealTracker {...mockProps} showActions={false} />);

    await waitFor(() => {
      expect(screen.getByText('Meal Tracker')).toBeInTheDocument();
    });

    expect(screen.queryByText('Add Another Ingredient')).not.toBeInTheDocument();
    expect(screen.queryByText('Finalize Meal')).not.toBeInTheDocument();
  });
});