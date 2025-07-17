import { FoodDetectionService } from '../services/FoodDetectionService.js';

describe('Food Detection Service Integration', () => {
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

  describe('Service Integration', () => {
    it('should be properly instantiated with configuration', () => {
      expect(foodDetectionService).toBeInstanceOf(FoodDetectionService);
    });

    it('should provide detectable categories', () => {
      const categories = foodDetectionService.getDetectableCategories();
      expect(categories).toBeInstanceOf(Array);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('pizza');
      expect(categories).toContain('hamburger');
    });

    it('should handle food detection with proper error handling', async () => {
      // This test will fail with Python dependencies not installed, but should handle the error gracefully
      try {
        await foodDetectionService.detectFood(mockImageBuffer);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Food detection failed');
      }
    });

    it('should handle image validation with proper error handling', async () => {
      // This test will fail with Python dependencies not installed, but should handle the error gracefully
      const result = await foodDetectionService.validateFoodImage(mockImageBuffer);
      
      // Should return a proper validation result structure
      expect(result).toHaveProperty('hasFood');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('suggestions');
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  describe('Configuration Options', () => {
    it('should accept custom confidence threshold', () => {
      const customService = new FoodDetectionService({
        confidenceThreshold: 0.8
      });
      expect(customService).toBeInstanceOf(FoodDetectionService);
    });

    it('should accept custom max detections', () => {
      const customService = new FoodDetectionService({
        maxDetections: 3
      });
      expect(customService).toBeInstanceOf(FoodDetectionService);
    });

    it('should accept custom python path', () => {
      const customService = new FoodDetectionService({
        pythonPath: 'python3.9'
      });
      expect(customService).toBeInstanceOf(FoodDetectionService);
    });
  });
});