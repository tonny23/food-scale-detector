import React, { useState, useEffect, useCallback } from 'react';
import './FoodSearch.css';

interface FoodItem {
  id: string;
  name: string;
  confidence: number;
  alternativeNames: string[];
  category: string;
}

interface FoodSearchProps {
  onFoodSelect: (food: FoodItem) => void;
  onCancel: () => void;
  isOpen: boolean;
}

interface SearchResponse {
  query: string;
  results: FoodItem[];
  count: number;
}

export const FoodSearch: React.FC<FoodSearchProps> = ({
  onFoodSelect,
  onCancel,
  isOpen
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.trim().length < 2) {
        setSearchResults([]);
        setHasSearched(false);
        return;
      }

      setIsSearching(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/foods/search?q=${encodeURIComponent(query.trim())}&limit=20`
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Search failed');
        }

        const data: SearchResponse = await response.json();
        setSearchResults(data.results);
        setHasSearched(true);
      } catch (err) {
        console.error('Food search error:', err);
        setError(err instanceof Error ? err.message : 'Search failed');
        setSearchResults([]);
        setHasSearched(true);
      } finally {
        setIsSearching(false);
      }
    }, 500),
    []
  );

  useEffect(() => {
    if (searchQuery.trim()) {
      debouncedSearch(searchQuery);
    } else {
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [searchQuery, debouncedSearch]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleFoodSelect = (food: FoodItem) => {
    onFoodSelect(food);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="food-search-overlay" onClick={onCancel}>
      <div className="food-search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="food-search-header">
          <h2>Search for Food</h2>
          <button 
            className="close-button"
            onClick={onCancel}
            aria-label="Close search"
          >
            ×
          </button>
        </div>

        <div className="food-search-content">
          <div className="search-input-container">
            <input
              type="text"
              placeholder="Search for food (e.g., apple, chicken breast, rice)..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              className="search-input"
              autoFocus
            />
            {isSearching && (
              <div className="search-spinner">
                <div className="spinner"></div>
              </div>
            )}
          </div>

          <div className="search-results">
            {error && (
              <div className="search-error">
                <div className="error-icon">⚠️</div>
                <div>
                  <h4>Search Error</h4>
                  <p>{error}</p>
                  <p className="error-suggestion">
                    Please try again or check your internet connection.
                  </p>
                </div>
              </div>
            )}

            {!error && hasSearched && searchResults.length === 0 && (
              <div className="no-results">
                <div className="no-results-icon">🔍</div>
                <h4>No foods found</h4>
                <p>Try searching with different terms:</p>
                <ul>
                  <li>Use common food names (e.g., "apple" instead of "fruit")</li>
                  <li>Try singular forms (e.g., "banana" instead of "bananas")</li>
                  <li>Be more specific (e.g., "chicken breast" instead of "meat")</li>
                </ul>
              </div>
            )}

            {!error && searchResults.length > 0 && (
              <div className="results-list">
                <div className="results-header">
                  <span>{searchResults.length} foods found</span>
                </div>
                {searchResults.map((food) => (
                  <div
                    key={food.id}
                    className="food-result-item"
                    onClick={() => handleFoodSelect(food)}
                  >
                    <div className="food-result-info">
                      <h4 className="food-result-name">{food.name}</h4>
                      <div className="food-result-details">
                        <span className="food-category">{food.category}</span>
                        {food.alternativeNames.length > 0 && (
                          <span className="alternative-names">
                            Also: {food.alternativeNames.slice(0, 2).join(', ')}
                            {food.alternativeNames.length > 2 && '...'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="select-indicator">
                      Select →
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!hasSearched && !isSearching && (
              <div className="search-instructions">
                <div className="instructions-icon">💡</div>
                <h4>Search Tips</h4>
                <ul>
                  <li>Type at least 2 characters to start searching</li>
                  <li>Use common food names for best results</li>
                  <li>The database contains thousands of foods from the USDA</li>
                  <li>Results include nutrition information for accurate calculations</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="food-search-footer">
          <button onClick={onCancel} className="cancel-button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}