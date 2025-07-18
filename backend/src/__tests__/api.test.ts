import request from 'supertest';
import app from '../index';
import { sessionService } from '../services/SessionService';
import sharp from 'sharp';

// Mock Redis to avoid requiring actual Redis connection in tests
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    setEx: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
    on: jest.fn()
  }))
}));

describe('API Endpoints', () => {
  // Helper function to create a test image
  const createTestImage = async (width = 400, height = 300): Promise<Buffer> => {
    return sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    })
    .jpeg()
    .toBuffer();
  };

  beforeAll(async () => {
    // Mock session service methods
    jest.spyOn(sessionService, 'createSession').mockResolvedValue('test-session-123');
    jest.spyOn(sessionService, 'getSession').mockResolvedValue({
      id: 'test-session-123',
      components: [],
      totalWeight: 0,
      previousWeight: 0,
      createdAt: new Date(),
      lastUpdated: new Date()
    });
    jest.spyOn(sessionService, 'addIngredient').mockResolvedValue({
      id: 'test-session-123',
      components: [{
        food: {
          id: 'test-food',
          name: 'Apple',
          confidence: 0.85,
          alternativeNames: [],
          category: 'Fruits'
        },
        weight: 150,
        nutrition: {
          calories: 78,
          protein: 0,
          carbohydrates: 21,
          fat: 0,
          fiber: 4,
          sodium: 0,
          sugar: 16,
          saturatedFat: 0,
          cholesterol: 0,
          potassium: 161
        },
        addedAt: new Date()
      }],
      totalWeight: 150,
      previousWeight: 0,
      createdAt: new Date(),
      lastUpdated: new Date()
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Food Nutrition Detector API');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('endpoints');
    });
  });

  describe('POST /api/upload', () => {
    it('should reject requests without image file', async () => {
      const response = await request(app)
        .post('/api/upload')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No image file provided');
      expect(response.body).toHaveProperty('code', 'MISSING_FILE');
    });

    it('should reject invalid file types', async () => {
      const response = await request(app)
        .post('/api/upload')
        .attach('image', Buffer.from('fake-pdf-content'), 'test.pdf')
        .expect(400);

      expect(response.body).toHaveProperty('code', 'INVALID_FILE_TYPE');
    });

    it('should process valid image with OCR and return low confidence error for blank image', async () => {
      const testImage = await createTestImage();
      
      const response = await request(app)
        .post('/api/upload')
        .attach('image', testImage, 'test.jpg')
        .expect(422); // Expect low confidence error for blank image

      expect(response.body.code).toBe('LOW_CONFIDENCE_OCR');
      expect(response.body.details.detectedWeight).toBeDefined();
      expect(response.body.details.scaleValidation).toBeDefined();
      expect(response.body.details.suggestions).toBeInstanceOf(Array);
      expect(response.body.message).toContain('Could not reliably read the scale display');
    });
  });

  describe('POST /api/confirm', () => {
    it('should reject requests with invalid data', async () => {
      const response = await request(app)
        .post('/api/confirm')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid confirmation data');
      expect(response.body).toHaveProperty('code', 'INVALID_DATA');
    });

    it('should process valid confirmation data', async () => {
      const confirmationData = {
        sessionId: 'test-session-123',
        selectedFood: {
          id: 'test-food',
          name: 'Apple',
          confidence: 0.85,
          alternativeNames: [],
          category: 'Fruits'
        },
        confirmedWeight: 150
      };

      const response = await request(app)
        .post('/api/confirm')
        .send(confirmationData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('session');
      expect(response.body).toHaveProperty('message', 'Ingredient added successfully');
    });
  });

  describe('GET /api/session/:sessionId', () => {
    it('should return session data for valid session ID', async () => {
      const response = await request(app)
        .get('/api/session/test-session-123')
        .expect(200);

      expect(response.body).toHaveProperty('id', 'test-session-123');
      expect(response.body).toHaveProperty('components');
      expect(response.body).toHaveProperty('totalWeight');
    });
  });

  describe('DELETE /api/session/:sessionId', () => {
    it('should delete session successfully', async () => {
      jest.spyOn(sessionService, 'deleteSession').mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/session/test-session-123')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Session deleted successfully');
    });
  });

  describe('POST /api/session/:sessionId/extend', () => {
    it('should extend session successfully', async () => {
      jest.spyOn(sessionService, 'extendSession').mockResolvedValue(true);

      const response = await request(app)
        .post('/api/session/test-session-123/extend')
        .send({ ttlSeconds: 7200 })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Session extended successfully');
      expect(response.body).toHaveProperty('expiresIn', 7200);
    });
  });

  describe('PUT /api/session/:sessionId/weight', () => {
    beforeEach(() => {
      // Mock session with existing ingredient
      jest.spyOn(sessionService, 'getSession').mockResolvedValue({
        id: 'test-session-123',
        components: [{
          food: {
            id: 'test-food',
            name: 'Apple',
            confidence: 0.85,
            alternativeNames: [],
            category: 'Fruits'
          },
          weight: 150,
          nutrition: {
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
          },
          addedAt: new Date()
        }],
        totalWeight: 150,
        previousWeight: 0,
        createdAt: new Date(),
        lastUpdated: new Date()
      });

      jest.spyOn(sessionService, 'updateSession').mockResolvedValue({
        id: 'test-session-123',
        components: [{
          food: {
            id: 'test-food',
            name: 'Apple',
            confidence: 0.85,
            alternativeNames: [],
            category: 'Fruits'
          },
          weight: 200,
          nutrition: {
            calories: 104,
            protein: 0.5,
            carbohydrates: 28,
            fat: 0.3,
            fiber: 5,
            sodium: 1,
            sugar: 21,
            saturatedFat: 0.1,
            cholesterol: 0,
            potassium: 215
          },
          addedAt: new Date()
        }],
        totalWeight: 200,
        previousWeight: 0,
        createdAt: new Date(),
        lastUpdated: new Date()
      });
    });

    it('should update weight and recalculate nutrition successfully', async () => {
      const response = await request(app)
        .put('/api/session/test-session-123/weight')
        .send({ weight: 200, unit: 'g' })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('session');
      expect(response.body).toHaveProperty('updatedIngredient');
      expect(response.body).toHaveProperty('message', 'Weight corrected and nutrition recalculated successfully');
    });

    it('should reject invalid weight values', async () => {
      const response = await request(app)
        .put('/api/session/test-session-123/weight')
        .send({ weight: -10, unit: 'g' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid weight');
      expect(response.body).toHaveProperty('code', 'INVALID_WEIGHT');
    });

    it('should reject invalid units', async () => {
      const response = await request(app)
        .put('/api/session/test-session-123/weight')
        .send({ weight: 200, unit: 'kg' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid unit');
      expect(response.body).toHaveProperty('code', 'INVALID_UNIT');
    });

    it('should reject weight correction for non-existent session', async () => {
      jest.spyOn(sessionService, 'getSession').mockResolvedValue(null);

      const response = await request(app)
        .put('/api/session/non-existent-session/weight')
        .send({ weight: 200, unit: 'g' })
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Session not found');
      expect(response.body).toHaveProperty('code', 'SESSION_NOT_FOUND');
    });

    it('should reject weight correction for session with no ingredients', async () => {
      jest.spyOn(sessionService, 'getSession').mockResolvedValue({
        id: 'test-session-123',
        components: [],
        totalWeight: 0,
        previousWeight: 0,
        createdAt: new Date(),
        lastUpdated: new Date()
      });

      const response = await request(app)
        .put('/api/session/test-session-123/weight')
        .send({ weight: 200, unit: 'g' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'No ingredients to update');
      expect(response.body).toHaveProperty('code', 'NO_INGREDIENTS');
    });
  });
});