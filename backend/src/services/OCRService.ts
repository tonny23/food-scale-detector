/**
 * OCR Service for reading scale weights from images
 * Uses Tesseract.js for optical character recognition with image preprocessing
 */

import Tesseract from 'tesseract.js';
import sharp from 'sharp';
import type { WeightReading } from '../types/core.js';

export interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
}

export interface PreprocessingOptions {
  enhanceContrast?: boolean;
  sharpen?: boolean;
  denoise?: boolean;
  threshold?: number;
}

export class OCRService {
  private static readonly WEIGHT_PATTERNS = [
    // Digital scale patterns with units
    /(\d+\.?\d*)\s*(g|grams?|oz|ounces?|lb|lbs?|pounds?)/gi,
    // Numbers followed by common weight abbreviations
    /(\d+\.?\d*)\s*(g|oz|lb)/gi,
    // Standalone numbers that might be weights (when near scale display area)
    /(\d+\.?\d*)/g
  ];

  private static readonly UNIT_MAPPINGS: Record<string, 'g' | 'oz' | 'lb'> = {
    'g': 'g',
    'gram': 'g',
    'grams': 'g',
    'oz': 'oz',
    'ounce': 'oz',
    'ounces': 'oz',
    'lb': 'lb',
    'lbs': 'lb',
    'pound': 'lb',
    'pounds': 'lb'
  };

  private static readonly MIN_CONFIDENCE_THRESHOLD = 60;
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 80;

  /**
   * Preprocess image to enhance OCR accuracy for scale displays
   */
  private async preprocessImage(
    imageBuffer: Buffer,
    options: PreprocessingOptions = {}
  ): Promise<Buffer> {
    const {
      enhanceContrast = true,
      sharpen = true,
      denoise = true,
      threshold = 128
    } = options;

    let pipeline = sharp(imageBuffer);

    // Convert to grayscale for better OCR
    pipeline = pipeline.greyscale();

    // Enhance contrast for better digit recognition
    if (enhanceContrast) {
      pipeline = pipeline.normalize();
    }

    // Apply sharpening to make digits clearer
    if (sharpen) {
      pipeline = pipeline.sharpen({
        sigma: 1,
        flat: 1,
        jagged: 2
      });
    }

    // Reduce noise
    if (denoise) {
      pipeline = pipeline.median(3);
    }

    // Apply threshold to create high contrast black/white image
    pipeline = pipeline.threshold(threshold);

    // Resize to improve OCR accuracy (scale up small text)
    pipeline = pipeline.resize({
      width: 800,
      height: 600,
      fit: 'inside',
      withoutEnlargement: false
    });

    return pipeline.png().toBuffer();
  }

  /**
   * Perform OCR on preprocessed image
   */
  private async performOCR(imageBuffer: Buffer): Promise<OCRResult> {
    const result = await Tesseract.recognize(imageBuffer, 'eng', {
      logger: () => {}, // Disable logging
      tessedit_char_whitelist: '0123456789.,glbozundsram ', // Only allow relevant characters
      tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT, // Sparse text mode for scale displays
    });

    return {
      text: result.data.text || '',
      confidence: result.data.confidence || 0,
      words: (result.data.words || []).map(word => ({
        text: word.text || '',
        confidence: word.confidence || 0,
        bbox: word.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 }
      }))
    };
  }

  /**
   * Extract weight information from OCR text
   */
  private extractWeightFromText(ocrResult: OCRResult): WeightReading[] {
    const { text, confidence, words } = ocrResult;
    const possibleWeights: WeightReading[] = [];

    // Try each pattern to find weight readings
    for (const pattern of OCRService.WEIGHT_PATTERNS) {
      const matches = Array.from(text.matchAll(pattern));
      
      for (const match of matches) {
        const fullMatch = match[0];
        const numberStr = match[1];
        const unitStr = match[2]?.toLowerCase() || '';

        const value = parseFloat(numberStr);
        if (isNaN(value) || value <= 0) continue;

        // Determine unit
        let unit: 'g' | 'oz' | 'lb' = 'g'; // default to grams
        if (unitStr) {
          const mappedUnit = OCRService.UNIT_MAPPINGS[unitStr];
          if (mappedUnit) {
            unit = mappedUnit;
          }
        }

        // Calculate confidence based on OCR confidence and pattern match quality
        let weightConfidence = confidence;
        
        // Boost confidence if we found a clear unit
        if (unitStr && OCRService.UNIT_MAPPINGS[unitStr]) {
          weightConfidence = Math.min(100, weightConfidence + 10);
        }

        // Reduce confidence for very large or very small values
        if (value > 10000 || value < 0.1) {
          weightConfidence = Math.max(0, weightConfidence - 20);
        }

        // Find the word that contains this number for better confidence scoring
        const matchingWord = words.find(word => 
          word.text.includes(numberStr) && word.confidence > 0
        );
        
        if (matchingWord) {
          // Use the specific word confidence if available
          weightConfidence = (weightConfidence + matchingWord.confidence) / 2;
        }

        possibleWeights.push({
          value,
          unit,
          confidence: Math.round(weightConfidence),
          rawText: fullMatch.trim()
        });
      }
    }

    return possibleWeights;
  }

  /**
   * Select the best weight reading from multiple candidates
   */
  private selectBestWeight(weights: WeightReading[]): WeightReading | null {
    if (weights.length === 0) return null;

    // Sort by confidence, then by reasonable weight values
    const sortedWeights = weights.sort((a, b) => {
      // First priority: confidence
      if (Math.abs(a.confidence - b.confidence) > 10) {
        return b.confidence - a.confidence;
      }

      // Second priority: reasonable weight ranges
      const aReasonable = this.isReasonableWeight(a.value, a.unit);
      const bReasonable = this.isReasonableWeight(b.value, b.unit);
      
      if (aReasonable && !bReasonable) return -1;
      if (!aReasonable && bReasonable) return 1;

      // Third priority: higher confidence
      return b.confidence - a.confidence;
    });

    return sortedWeights[0];
  }

  /**
   * Check if a weight value is reasonable for food measurement
   */
  private isReasonableWeight(value: number, unit: 'g' | 'oz' | 'lb'): boolean {
    switch (unit) {
      case 'g':
        return value >= 1 && value <= 5000; // 1g to 5kg
      case 'oz':
        return value >= 0.1 && value <= 176; // ~3g to 5kg
      case 'lb':
        return value >= 0.01 && value <= 11; // ~5g to 5kg
      default:
        return false;
    }
  }

  /**
   * Main method to read weight from scale image
   */
  async readScaleWeight(imageBuffer: Buffer): Promise<WeightReading> {
    try {
      // Try multiple preprocessing approaches
      const preprocessingOptions: PreprocessingOptions[] = [
        { enhanceContrast: true, sharpen: true, denoise: true, threshold: 128 },
        { enhanceContrast: true, sharpen: false, denoise: true, threshold: 100 },
        { enhanceContrast: false, sharpen: true, denoise: false, threshold: 150 }
      ];

      let bestWeight: WeightReading | null = null;
      let bestConfidence = 0;

      for (const options of preprocessingOptions) {
        try {
          const preprocessedImage = await this.preprocessImage(imageBuffer, options);
          const ocrResult = await this.performOCR(preprocessedImage);
          
          if (ocrResult.confidence < OCRService.MIN_CONFIDENCE_THRESHOLD) {
            continue;
          }

          const weights = this.extractWeightFromText(ocrResult);
          const selectedWeight = this.selectBestWeight(weights);

          if (selectedWeight && selectedWeight.confidence > bestConfidence) {
            bestWeight = selectedWeight;
            bestConfidence = selectedWeight.confidence;
          }

          // If we found a high-confidence result, use it
          if (bestConfidence >= OCRService.HIGH_CONFIDENCE_THRESHOLD) {
            break;
          }
        } catch (error) {
          console.warn('OCR preprocessing attempt failed:', error);
          continue;
        }
      }

      // Return best result or fallback
      if (bestWeight) {
        return bestWeight;
      }

      // Fallback: return low-confidence result indicating manual input needed
      return {
        value: 0,
        unit: 'g',
        confidence: 0,
        rawText: 'Unable to read scale display'
      };

    } catch (error) {
      console.error('OCR processing failed:', error);
      
      return {
        value: 0,
        unit: 'g',
        confidence: 0,
        rawText: `OCR Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate if an image likely contains a scale display
   */
  async validateScaleImage(imageBuffer: Buffer): Promise<{
    hasScale: boolean;
    confidence: number;
    suggestions: string[];
  }> {
    try {
      const preprocessedImage = await this.preprocessImage(imageBuffer, {
        enhanceContrast: true,
        sharpen: false,
        denoise: true
      });

      const ocrResult = await this.performOCR(preprocessedImage);
      const text = ocrResult.text.toLowerCase();

      // Look for scale-related indicators
      const scaleIndicators = [
        /\d+\.?\d*\s*(g|oz|lb)/gi,
        /scale/gi,
        /weight/gi,
        /\d+\.\d+/g // Decimal numbers common on scales
      ];

      let scaleScore = 0;
      const suggestions: string[] = [];

      for (const indicator of scaleIndicators) {
        const matches = text.match(indicator);
        if (matches) {
          scaleScore += matches.length * 10;
        }
      }

      // Check for reasonable number patterns
      const numbers = text.match(/\d+\.?\d*/g);
      if (numbers && numbers.length > 0) {
        scaleScore += numbers.length * 5;
      }

      const hasScale = scaleScore > 20;
      const confidence = Math.min(100, scaleScore);

      if (!hasScale) {
        suggestions.push(
          'Ensure the scale display is clearly visible and well-lit',
          'Try taking the photo from directly above the scale',
          'Make sure the scale display shows a weight reading',
          'Check that the scale display is not obscured by shadows or glare'
        );
      }

      return {
        hasScale,
        confidence,
        suggestions
      };

    } catch (error) {
      return {
        hasScale: false,
        confidence: 0,
        suggestions: [
          'Image processing failed - please try a different image',
          'Ensure the image is clear and not corrupted'
        ]
      };
    }
  }
}