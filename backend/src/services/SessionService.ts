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