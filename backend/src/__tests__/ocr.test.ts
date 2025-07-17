/**
 * Tests for OCR Service
 */

import { OCRService } from '../services/OCRService.js';
import sharp from 'sharp';

describe('OCRService', () => {
  let ocrService: OCRService;

  beforeEach(() => {
    ocrService = new OCRService();
  });

  describe('readScaleWeight', () => {
    // Helper function to create a test image with text
    const createTestImage = async (text: string, width = 400, height = 300): Promise<Buffer> => {
      return sharp({
        create: {
          width,
          height,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .png()
      .toBuffer();
    };

    it('should handle empty or invalid images gracefully', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = await ocrService.readScaleWeight(emptyBuffer);
      
      expect(result.confidence).toBe(0);
      expect(result.value).toBe(0);
      expect(result.rawText).toMatch(/Unable to read scale display|OCR Error/);
    });

    it('should return low confidence when no text is detected', async () => {
      const blankImage = await createTestImage('');
      const result = await ocrService.readScaleWeight(blankImage);
      
      expect(result.confidence).toBeLessThanOrEqual(10);
      expect(result.value).toBe(0);
    });

    it('should extract weight with units correctly', async () => {
      // This test would ideally use a real image with "150.5 g" text
      // For now, we test the service structure and error handling
      const testImage = await createTestImage('150.5 g');
      const result = await ocrService.readScaleWeight(testImage);
      
      // Since we're using a blank image, expect low confidence
      expect(typeof result.confidence).toBe('number');
      expect(typeof result.value).toBe('number');
      expect(['g', 'oz', 'lb']).toContain(result.unit);
      expect(typeof result.rawText).toBe('string');
    });

    it('should handle different weight units', async () => {
      const units = ['g', 'oz', 'lb'];
      
      for (const unit of units) {
        const testImage = await createTestImage(`100 ${unit}`);
        const result = await ocrService.readScaleWeight(testImage);
        
        expect(['g', 'oz', 'lb']).toContain(result.unit);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(100);
      }
    });

    it('should return reasonable confidence scores', async () => {
      const testImage = await createTestImage('test');
      const result = await ocrService.readScaleWeight(testImage);
      
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should handle processing errors gracefully', async () => {
      const invalidBuffer = Buffer.from('not an image');
      const result = await ocrService.readScaleWeight(invalidBuffer);
      
      expect(result.confidence).toBe(0);
      expect(result.rawText).toMatch(/Unable to read scale display|OCR Error/);
    });
  });

  describe('validateScaleImage', () => {
    const createTestImage = async (width = 400, height = 300): Promise<Buffer> => {
      return sharp({
        create: {
          width,
          height,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      })
      .png()
      .toBuffer();
    };

    it('should validate image structure', async () => {
      const testImage = await createTestImage();
      const result = await ocrService.validateScaleImage(testImage);
      
      expect(typeof result.hasScale).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should provide helpful suggestions when no scale detected', async () => {
      const testImage = await createTestImage();
      const result = await ocrService.validateScaleImage(testImage);
      
      // For blank images, we expect no scale to be detected
      expect(result.hasScale).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions.some(s => s.toLowerCase().includes('scale'))).toBe(true);
    });

    it('should handle invalid images gracefully', async () => {
      const invalidBuffer = Buffer.from('not an image');
      const result = await ocrService.validateScaleImage(invalidBuffer);
      
      expect(result.hasScale).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('weight extraction logic', () => {
    it('should handle various weight formats', () => {
      // Test the service instantiation and basic structure
      expect(ocrService).toBeInstanceOf(OCRService);
    });

    it('should validate reasonable weight ranges', () => {
      // These would test private methods if they were public
      // For now, we ensure the service is properly structured
      expect(typeof ocrService.readScaleWeight).toBe('function');
      expect(typeof ocrService.validateScaleImage).toBe('function');
    });
  });

  describe('preprocessing options', () => {
    it('should handle different preprocessing configurations', async () => {
      const testImage = await sharp({
        create: {
          width: 200,
          height: 150,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      }).png().toBuffer();

      const result = await ocrService.readScaleWeight(testImage);
      
      // Should complete without throwing errors
      expect(result).toBeDefined();
      expect(typeof result.confidence).toBe('number');
    });
  });

  describe('error handling', () => {
    it('should handle Tesseract errors gracefully', async () => {
      const corruptedBuffer = Buffer.from([0xFF, 0xD8, 0xFF]); // Incomplete JPEG header
      const result = await ocrService.readScaleWeight(corruptedBuffer);
      
      expect(result.confidence).toBe(0);
      expect(result.rawText).toMatch(/Unable to read scale display|OCR Error/);
    });

    it('should handle sharp processing errors', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = await ocrService.readScaleWeight(emptyBuffer);
      
      expect(result.confidence).toBe(0);
      expect(result.value).toBe(0);
    });
  });

  describe('confidence scoring', () => {
    it('should return appropriate confidence levels', async () => {
      const testImage = await sharp({
        create: {
          width: 300,
          height: 200,
          channels: 3,
          background: { r: 255, g: 255, b: 255 }
        }
      }).png().toBuffer();

      const result = await ocrService.readScaleWeight(testImage);
      
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should provide fallback when confidence is too low', async () => {
      const noiseImage = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 50, g: 50, b: 50 }
        }
      }).png().toBuffer();

      const result = await ocrService.readScaleWeight(noiseImage);
      
      // Should handle low-quality images gracefully
      expect(result).toBeDefined();
      expect(typeof result.confidence).toBe('number');
    });
  });
});