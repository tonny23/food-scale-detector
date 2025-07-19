import request from 'supertest';
import express from 'express';
import { sessionService } from '../services/SessionService';
import apiRoutes from '../routes/api';

// Create test app
const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

// Mock session service
jest.mock('../services/SessionService');
const mockSessionService = sessionService as jest.Mocked<typeof sessionService>;

describe('Finalize Meal Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should finalize meal successfully', async () => {
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

    mockSessionService.getSession.mockResolvedValue(mockSession);
    mockSessionService.extendSession.mockResolvedValue(true);

    const response = await request(app)
      .post('/api/session/test-session-123/finalize')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.sessionId).toBe('test-session-123');
    expect(response.body.mealNutrition).toBeDefined();
    expect(response.body.mealNutrition.totalNutrition).toBeDefined();
    expect(response.body.mealNutrition.components).toHaveLength(2);
    expect(response.body.mealNutrition.totalWeight).toBe(270);

    // Check cumulative nutrition calculation
    const totalNutrition = response.body.mealNutrition.totalNutrition;
    expect(totalNutrition.calories).toBe(183); // 78 + 105
    expect(totalNutrition.protein).toBe(1.8); // 0.5 + 1.3
    expect(totalNutrition.carbohydrates).toBe(48); // 21 + 27
    expect(totalNutrition.fat).toBe(0.7); // 0.3 + 0.4

    expect(mockSessionService.getSession).toHaveBeenCalledWith('test-session-123');
    expect(mockSessionService.extendSession).toHaveBeenCalledWith('test-session-123', 7200);
  });

  it('should return 404 for non-existent session', async () => {
    mockSessionService.getSession.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/session/non-existent-session/finalize')
      .expect(404);

    expect(response.body.error).toBe('Session not found');
    expect(response.body.code).toBe('SESSION_NOT_FOUND');
  });

  it('should return 400 for session with no ingredients', async () => {
    const emptySession = {
      id: 'empty-session',
      components: [],
      totalWeight: 0,
      previousWeight: 0,
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    mockSessionService.getSession.mockResolvedValue(emptySession);

    const response = await request(app)
      .post('/api/session/empty-session/finalize')
      .expect(400);

    expect(response.body.error).toBe('No ingredients to finalize');
    expect(response.body.code).toBe('NO_INGREDIENTS');
  });

  it('should handle service errors gracefully', async () => {
    mockSessionService.getSession.mockRejectedValue(new Error('Database connection failed'));

    const response = await request(app)
      .post('/api/session/test-session-123/finalize')
      .expect(500);

    expect(response.body.error).toBe('Meal finalization failed');
    expect(response.body.code).toBe('FINALIZATION_ERROR');
  });
});