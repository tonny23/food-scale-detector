import { createClient, type RedisClientType } from 'redis';
import type { MealSession, MealComponent } from '../types/core.js';

export class SessionService {
  private client: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
      this.isConnected = true;
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  async createSession(): Promise<string> {
    await this.connect();
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const session: MealSession = {
      id: sessionId,
      components: [],
      totalWeight: 0,
      previousWeight: 0,
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    await this.client.setEx(
      sessionId,
      3600, // 1 hour expiration
      JSON.stringify(session)
    );

    return sessionId;
  }

  async getSession(sessionId: string): Promise<MealSession | null> {
    await this.connect();
    
    const sessionData = await this.client.get(sessionId);
    if (!sessionData) {
      return null;
    }

    const session = JSON.parse(sessionData) as MealSession;
    // Convert date strings back to Date objects
    session.createdAt = new Date(session.createdAt);
    session.lastUpdated = new Date(session.lastUpdated);
    session.components = session.components.map(component => ({
      ...component,
      addedAt: new Date(component.addedAt)
    }));

    return session;
  }

  async updateSession(sessionId: string, updates: Partial<MealSession>): Promise<MealSession | null> {
    await this.connect();
    
    const existingSession = await this.getSession(sessionId);
    if (!existingSession) {
      return null;
    }

    const updatedSession: MealSession = {
      ...existingSession,
      ...updates,
      lastUpdated: new Date()
    };

    await this.client.setEx(
      sessionId,
      3600, // Reset expiration to 1 hour
      JSON.stringify(updatedSession)
    );

    return updatedSession;
  }

  async addIngredient(sessionId: string, ingredient: MealComponent): Promise<MealSession | null> {
    await this.connect();
    
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    // Update previous weight to current total before adding new ingredient
    const previousWeight = session.totalWeight;
    const newTotalWeight = ingredient.weight + session.totalWeight;

    const updatedSession: MealSession = {
      ...session,
      components: [...session.components, ingredient],
      totalWeight: newTotalWeight,
      previousWeight: previousWeight,
      lastUpdated: new Date()
    };

    await this.client.setEx(
      sessionId,
      3600,
      JSON.stringify(updatedSession)
    );

    return updatedSession;
  }

  async calculateWeightDifference(sessionId: string, newTotalWeight: number): Promise<{ difference: number; previousWeight: number; isValid: boolean; error?: string }> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return { difference: 0, previousWeight: 0, isValid: false, error: 'Session not found' };
    }

    const previousWeight = session.totalWeight;
    const difference = newTotalWeight - previousWeight;

    // Validate weight difference
    if (difference <= 0) {
      return {
        difference,
        previousWeight,
        isValid: false,
        error: `New weight (${newTotalWeight.toFixed(1)}g) must be greater than previous weight (${previousWeight.toFixed(1)}g)`
      };
    }

    // Check for unreasonably large additions (more than 5kg)
    if (difference > 5000) {
      return {
        difference,
        previousWeight,
        isValid: false,
        error: `Weight increase of ${difference.toFixed(1)}g seems too large. Please verify the reading.`
      };
    }

    // Check for very small additions (less than 1g) - might be measurement error
    if (difference < 1) {
      return {
        difference,
        previousWeight,
        isValid: false,
        error: `Weight increase of ${difference.toFixed(1)}g is too small. Minimum addition is 1g.`
      };
    }

    return { difference, previousWeight, isValid: true };
  }

  async getMealSummary(sessionId: string): Promise<{ totalNutrition: any; totalWeight: number; componentCount: number } | null> {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    // Calculate cumulative nutrition
    const totalNutrition = session.components.reduce((total, component) => ({
      calories: total.calories + component.nutrition.calories,
      protein: total.protein + component.nutrition.protein,
      carbohydrates: total.carbohydrates + component.nutrition.carbohydrates,
      fat: total.fat + component.nutrition.fat,
      fiber: total.fiber + component.nutrition.fiber,
      sodium: total.sodium + component.nutrition.sodium,
      sugar: total.sugar + component.nutrition.sugar,
      saturatedFat: total.saturatedFat + component.nutrition.saturatedFat,
      cholesterol: total.cholesterol + component.nutrition.cholesterol,
      potassium: total.potassium + component.nutrition.potassium
    }), {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sodium: 0,
      sugar: 0,
      saturatedFat: 0,
      cholesterol: 0,
      potassium: 0
    });

    return {
      totalNutrition,
      totalWeight: session.totalWeight,
      componentCount: session.components.length
    };
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    await this.connect();
    
    const result = await this.client.del(sessionId);
    return result === 1;
  }

  async extendSession(sessionId: string, ttlSeconds: number = 3600): Promise<boolean> {
    await this.connect();
    
    const result = await this.client.expire(sessionId, ttlSeconds);
    return result;
  }
}

// Singleton instance
export const sessionService = new SessionService();