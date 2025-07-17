/**
 * Jest setup file to load environment variables and configure test environment
 */

import { config } from 'dotenv';

// Load environment variables from .env file
config();

// This file is used for setup only, no tests needed
describe('Setup', () => {
  it('should load environment variables', () => {
    expect(process.env).toBeDefined();
  });
});