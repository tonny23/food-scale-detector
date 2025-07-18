import request from 'supertest';
import express from 'express';
import apiRoutes from '../routes/api.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

describe('Food Search API', () => {
  describe('GET /api/foods/search', () => {
    it('should return validation error for missing query', async () => {
      const response = await request(app)
        .get('/api/foods/search')
        .expect(400);

      expect(response.body.code).toBe('MISSING_QUERY');
      expect(response.body.message).toContain('search query');
    });

    it('should return validation error for short query', async () => {
      const response = await request(app)
        .get('/api/foods/search?q=a')
        .expect(400);

      expect(response.body.code).toBe('QUERY_TOO_SHORT');
      expect(response.body.message).toContain('at least 2 characters');
    });

    it('should return validation error for invalid limit', async () => {
      const response = await request(app)
        .get('/api/foods/search?q=apple&limit=100')
        .expect(400);

      expect(response.body.code).toBe('INVALID_LIMIT');
      expect(response.body.message).toContain('between 1 and 50');
    });

    it('should search for foods successfully', async () => {
      const response = await request(app)
        .get('/api/foods/search?q=apple&limit=5')
        .expect(200);

      expect(response.body.query).toBe('apple');
      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.count).toBeDefined();
      expect(typeof response.body.count).toBe('number');
    });

    it('should handle search with default limit', async () => {
      const response = await request(app)
        .get('/api/foods/search?q=chicken')
        .expect(200);

      expect(response.body.query).toBe('chicken');
      expect(response.body.results).toBeDefined();
      expect(response.body.count).toBeDefined();
    });

    it('should trim whitespace from query', async () => {
      const response = await request(app)
        .get('/api/foods/search?q=  banana  ')
        .expect(200);

      expect(response.body.query).toBe('banana');
    });
  });

  describe('GET /api/foods/:foodId/nutrition', () => {
    it('should return validation error for missing weight', async () => {
      const response = await request(app)
        .get('/api/foods/123/nutrition')
        .expect(400);

      expect(response.body.code).toBe('MISSING_WEIGHT');
      expect(response.body.message).toContain('weight parameter');
    });

    it('should return validation error for invalid weight', async () => {
      const response = await request(app)
        .get('/api/foods/123/nutrition?weight=invalid')
        .expect(400);

      expect(response.body.code).toBe('INVALID_WEIGHT');
      expect(response.body.message).toContain('positive number');
    });

    it('should return validation error for negative weight', async () => {
      const response = await request(app)
        .get('/api/foods/123/nutrition?weight=-10')
        .expect(400);

      expect(response.body.code).toBe('INVALID_WEIGHT');
      expect(response.body.message).toContain('positive number');
    });

    it('should get nutrition data successfully', async () => {
      const response = await request(app)
        .get('/api/foods/123/nutrition?weight=100')
        .expect(200);

      expect(response.body.foodId).toBe('123');
      expect(response.body.weight).toBe(100);
      expect(response.body.nutrition).toBeDefined();
      
      const nutrition = response.body.nutrition;
      expect(typeof nutrition.calories).toBe('number');
      expect(typeof nutrition.protein).toBe('number');
      expect(typeof nutrition.carbohydrates).toBe('number');
      expect(typeof nutrition.fat).toBe('number');
      expect(typeof nutrition.fiber).toBe('number');
      expect(typeof nutrition.sodium).toBe('number');
    });

    it('should handle decimal weights', async () => {
      const response = await request(app)
        .get('/api/foods/456/nutrition?weight=150.5')
        .expect(200);

      expect(response.body.weight).toBe(150.5);
      expect(response.body.nutrition).toBeDefined();
    });
  });
});