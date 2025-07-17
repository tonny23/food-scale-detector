import { FoodDetectionService } from '../services/FoodDetectionService.js';
import fs from 'fs';
import path from 'path';

describe('FoodDetectionService', () => {
  let foodDetectionService: FoodDetectionService;
  let mockImageBuffer: Buffer;

  beforeAll(() => {
    foodDetectionService = new FoodDetectionService({
      confidenceThreshold: 0.5,
      maxDetections: 5
    });

    // Create a mock image buffer (1x1 pixel JPEG)
    mockImageBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0xB2, 0xC0,
      0x07, 0xFF, 0xD9
    ]);
  });

  afterEach(() => {
    // Clean up any temporary files
    const tempDir = path.join(process.cwd(), 'temp');
    if (fs.existsSync(tempDir)) {
      const files = fs.readdirSync(tempDir);
      files.forEach(file => {
        if (file.startsWith('food_detection_')) {
          fs.unlinkSync(path.join(tempDir, file));
        }
      });
    }
  });

  describe('detectFood', () => {
    it('should handle empty detection results gracefully', async () => {
      // Mock the Python process to return empty results
      const originalSpawn = require('child_process').spawn;
      const mockSpawn = jest.fn().mockImplementation(() => {
        const mockProcess = {
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback(JSON.stringify({
                  detections: [],
                  processing_time: 0.5,
                  model_info: {
                    name: 'YOLOv8-Food101',
                    version: '1.0.0'
                  }
                }));
              }
            })
          },
          stderr: {
            on: jest.fn()
          },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              callback(0);
            }
          }),
          kill: jest.fn()
        };
        return mockProcess;
      });

      require('child_process').spawn = mockSpawn;

      const results = await foodDetectionService.detectFood(mockImageBuffer);
      
      expect(results).toEqual([]);
      
      // Restore original spawn
      require('child_process').spawn = originalSpawn;
    });

    it('should return food detection results when food is detected', async () => {
      // Mock the Python process to return detection results
      const originalSpawn = require('child_process').spawn;
      const mockSpawn = jest.fn().mockImplementation(() => {
        const mockProcess = {
          stdout: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback(JSON.stringify({
                  detections: [
                    {
                      class_name: 'pizza',
                      confidence: 0.85,
                      bbox: [100, 100, 200, 150],
                      alternatives: [
                        {
                          class_name: 'italian_food',
                          confidence: 0.65
                        }
                      ]
                    }
                  ],
                  processing_time: 1.2,
                  model_info: {
                    name: 'YOLOv8-Food101',
                    version: '1.0.0'
                  }
                }));
              }
            })
          },
          stderr: {
            on: jest.fn()
          },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              callback(0);
            }
          }),
          kill: jest.fn()
        };
        return mockProcess;
      });

      require('child_process').spawn = mockSpawn;

      const results = await foodDetectionService.detectFood(mockImageBuffer);
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        food: {
          name: 'Pizza',
          confidence: 0.85,
          category: 'Main Dishes'
        },
        alternatives: expect.arrayContaining([
          expect.objectContaining({
            name: 'Italian Food',
            confidence: 0.65
          })
        ]),
        boundingBox: {
          x: 100,
          y: 100,
          width: 200,
          height: 150
        }
      });
      
      // Restore original spawn
      require('child_process').spawn = originalSpawn;
    });

    it('should handle Python process errors', async () => {
      // Mock the Python process to return an error
      const originalSpawn = require('child_process').spawn;
      const mockSpawn = jest.fn().mockImplementation(() => {
        const mockProcess = {
          stdout: {
            on: jest.fn()
          },
          stderr: {
            on: jest.fn((event, callback) => {
              if (event === 'data') {
                callback('Python error: Model not found');
              }
            })
          },
          on: jest.fn((event, callback) => {
            if (event === 'close') {
              callback(1);
            }
          }),
          kill: jest.fn()
        };
        return mockProcess;
      });

      require('child_process').spawn = mockSpawn;

      await expect(foodDetectionService.detectFood(mockImageBuffer))
        .rejects
        .toThrow('Food detection failed');
      
      // Restore original spawn
      require('child_process').spawn = originalSpawn;
    });

    it('should handle timeout for long-running processes', async () => {
      // Mock the Python process to never complete
      const originalSpawn = require('child_process').spawn;
      const mockSpawn = jest.fn().mockImplementation(() => {
        const mockProcess = {
          stdout: {
            on: jest.fn()
          },
          stderr: {
            on: jest.fn()
          },
          on: jest.fn(), // Never calls callback
          kill: jest.fn()
        };
        return mockProcess;
      });

      require('child_process').spawn = mockSpawn;

      // Reduce timeout for testing
      const originalTimeout = setTimeout;
      const mockTimeout = jest.fn((callback, delay) => {
        if (delay === 30000) {
          // Immediately trigger timeout
          callback();
          return 123;
        }
        return originalTimeout(callback, delay);
      });
      global.setTimeout = mockTimeout;

      await expect(foodDetectionService.detectFood(mockImageBuffer))
        .rejects
        .toThrow('Food detection timeout');
      
      // Restore original functions
      require('child_process').spawn = originalSpawn;
      global.setTimeout = originalTimeout;
    });
  });

  describe('validateFoodImage', () => {
    it('should return false when no food is detected', async () => {
      // Mock detectFood to return empty results
      const mockDetectFood = jest.spyOn(foodDetectionService, 'detectFood')
        .mockResolvedValue([]);

      const result = await foodDetectionService.validateFoodImage(mockImageBuffer);
      
      expect(result).toEqual({
        hasFood: false,
        confidence: 0,
        suggestions: expect.arrayContaining([
          'Ensure food items are clearly visible in the image'
        ])
      });

      mockDetectFood.mockRestore();
    });

    it('should return true when food is detected with high confidence', async () => {
      // Mock detectFood to return high confidence results
      const mockDetectFood = jest.spyOn(foodDetectionService, 'detectFood')
        .mockResolvedValue([
          {
            food: {
              id: 'test_food',
              name: 'Pizza',
              confidence: 0.9,
              alternativeNames: [],
              category: 'Main Dishes'
            },
            alternatives: [],
            boundingBox: { x: 0, y: 0, width: 100, height: 100 }
          }
        ]);

      const result = await foodDetectionService.validateFoodImage(mockImageBuffer);
      
      expect(result).toEqual({
        hasFood: true,
        confidence: 0.9,
        suggestions: []
      });

      mockDetectFood.mockRestore();
    });

    it('should provide suggestions when confidence is low', async () => {
      // Mock detectFood to return low confidence results
      const mockDetectFood = jest.spyOn(foodDetectionService, 'detectFood')
        .mockResolvedValue([
          {
            food: {
              id: 'test_food',
              name: 'Pizza',
              confidence: 0.6,
              alternativeNames: [],
              category: 'Main Dishes'
            },
            alternatives: [],
            boundingBox: { x: 0, y: 0, width: 100, height: 100 }
          }
        ]);

      const result = await foodDetectionService.validateFoodImage(mockImageBuffer);
      
      expect(result).toEqual({
        hasFood: true,
        confidence: 0.6,
        suggestions: expect.arrayContaining([
          'Try taking a clearer photo with better lighting'
        ])
      });

      mockDetectFood.mockRestore();
    });
  });

  describe('getDetectableCategories', () => {
    it('should return a list of detectable food categories', () => {
      const categories = foodDetectionService.getDetectableCategories();
      
      expect(categories).toBeInstanceOf(Array);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('pizza');
      expect(categories).toContain('hamburger');
      expect(categories).toContain('sushi');
    });
  });

  describe('configuration', () => {
    it('should use default configuration when none provided', () => {
      const service = new FoodDetectionService();
      expect(service).toBeInstanceOf(FoodDetectionService);
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        confidenceThreshold: 0.7,
        maxDetections: 3,
        pythonPath: 'python3.9'
      };
      
      const service = new FoodDetectionService(customConfig);
      expect(service).toBeInstanceOf(FoodDetectionService);
    });
  });
});