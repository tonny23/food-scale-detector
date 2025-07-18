import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { FoodConfirmation } from './FoodConfirmation';

// Mock the FoodSearch component
vi.mock('../FoodSearch', () => ({
  FoodSearch: ({ isOpen, onFoodSelect, onCancel }: any) => {
    if (!isOpen) return null;
    return (
      <div data-testid="food-search-modal">
        <button onClick={() => onFoodSelect({ id: 'search-1', name: 'Searched Apple', confidence: 1.0, alternativeNames: [], category: 'Fruits' })}>
          Select Searched Food
        </button>
        <button onClick={onCancel}>Cancel Search</button>
      </div>
    );
  }
}));

const mockDetectedFood = [
  {
    id: '1',
    name: 'Apple',
    confidence: 0.92,
    alternativeNames: ['Red Apple'],
    category: 'Fruits'
  },
  {
    id: '2',
    name: 'Orange',
    confidence: 0.78,
    alternativeNames: ['Navel Orange'],
    category: 'Fruits'
  }
];

describe('FoodConfirmation', () => {
  const mockOnFoodConfirm = vi.fn();
  const mockOnManualSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders detected food options', () => {
    render(
      <FoodConfirmation
        detectedFood={mockDetectedFood}
        onFoodConfirm={mockOnFoodConfirm}
        onManualSearch={mockOnManualSearch}
      />
    );

    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Orange')).toBeInTheDocument();
    expect(screen.getByText('Confidence: 92%')).toBeInTheDocument();
    expect(screen.getByText('Confidence: 78%')).toBeInTheDocument();
  });

  it('allows food selection and confirmation', () => {
    render(
      <FoodConfirmation
        detectedFood={mockDetectedFood}
        onFoodConfirm={mockOnFoodConfirm}
        onManualSearch={mockOnManualSearch}
      />
    );

    // Select first food item
    fireEvent.click(screen.getByText('Apple'));
    
    // Confirm selection
    fireEvent.click(screen.getByText('Confirm Selection'));

    expect(mockOnFoodConfirm).toHaveBeenCalledWith(mockDetectedFood[0]);
  });

  it('opens manual search modal when manual search button is clicked', async () => {
    render(
      <FoodConfirmation
        detectedFood={mockDetectedFood}
        onFoodConfirm={mockOnFoodConfirm}
      />
    );

    // Click manual search button
    fireEvent.click(screen.getByText('None of these? Search manually'));

    // Check that search modal is opened
    await waitFor(() => {
      expect(screen.getByTestId('food-search-modal')).toBeInTheDocument();
    });
  });

  it('handles food selection from manual search', async () => {
    render(
      <FoodConfirmation
        detectedFood={mockDetectedFood}
        onFoodConfirm={mockOnFoodConfirm}
      />
    );

    // Open manual search
    fireEvent.click(screen.getByText('None of these? Search manually'));

    // Select food from search results
    await waitFor(() => {
      fireEvent.click(screen.getByText('Select Searched Food'));
    });

    // Verify that onFoodConfirm was called with the searched food
    expect(mockOnFoodConfirm).toHaveBeenCalledWith({
      id: 'search-1',
      name: 'Searched Apple',
      confidence: 1.0,
      alternativeNames: [],
      category: 'Fruits'
    });
  });

  it('closes search modal when cancel is clicked', async () => {
    render(
      <FoodConfirmation
        detectedFood={mockDetectedFood}
        onFoodConfirm={mockOnFoodConfirm}
      />
    );

    // Open manual search
    fireEvent.click(screen.getByText('None of these? Search manually'));

    // Cancel search
    await waitFor(() => {
      fireEvent.click(screen.getByText('Cancel Search'));
    });

    // Verify modal is closed
    await waitFor(() => {
      expect(screen.queryByTestId('food-search-modal')).not.toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    render(
      <FoodConfirmation
        detectedFood={[]}
        onFoodConfirm={mockOnFoodConfirm}
        onManualSearch={mockOnManualSearch}
        isLoading={true}
      />
    );

    expect(screen.getByText('Detecting food...')).toBeInTheDocument();
    expect(screen.getByText('Please wait while we analyze your image')).toBeInTheDocument();
  });

  it('shows no detection state with manual search option', () => {
    render(
      <FoodConfirmation
        detectedFood={[]}
        onFoodConfirm={mockOnFoodConfirm}
        onManualSearch={mockOnManualSearch}
      />
    );

    expect(screen.getByText('No food detected')).toBeInTheDocument();
    expect(screen.getByText('Search Manually')).toBeInTheDocument();
  });

  it('uses external manual search handler when provided', () => {
    render(
      <FoodConfirmation
        detectedFood={[]}
        onFoodConfirm={mockOnFoodConfirm}
        onManualSearch={mockOnManualSearch}
      />
    );

    fireEvent.click(screen.getByText('Search Manually'));

    expect(mockOnManualSearch).toHaveBeenCalled();
    // Should not open internal search modal
    expect(screen.queryByTestId('food-search-modal')).not.toBeInTheDocument();
  });
});