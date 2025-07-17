import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import type { FoodDetectionResult, FoodItem, BoundingBox } from '../types/core.js';

export interface FoodDetectionConfig {
  pythonPath?: string;
  modelPath?: string;
  confidenceThreshold?: number;
  maxDetections?: number;
}

export interface PythonDetectionResult {
  detections: Array<{
    class_name: string;
    confidence: number;
    bbox: [number, number, number, number]; // [x, y, width, height]
    alternatives?: Array<{
      class_name: string;
      confidence: number;
    }>;
  }>;
  processing_time: number;
  model_info: {
    name: string;
    version: string;
  };
}

export class FoodDetectionService {
  private config: FoodDetectionConfig;
  private pythonScriptPath: string;

  constructor(config: FoodDetectionConfig = {}) {
    this.config = {
      pythonPath: config.pythonPath || 'python3',
      modelPath: config.modelPath || path.join(process.cwd(), 'ml_models'),
      confidenceThreshold: config.confidenceThreshold || 0.5,
      maxDetections: config.maxDetections || 5,
      ...config
    };
    
    this.pythonScriptPath = path.join(process.cwd(), '..', 'python_services', 'food_detection.py');
  }

  /**
   * Detect food items in an image buffer
   */
  async detectFood(imageBuffer: Buffer): Promise<FoodDetectionResult[]> {
    try {
      // Save image buffer to temporary file
      const tempImagePath = await this.saveTemporaryImage(imageBuffer);
      
      try {
        // Run Python food detection script
        const pythonResult = await this.runPythonDetection(tempImagePath);
        
        // Convert Python results to our format
        const detectionResults = this.convertPythonResults(pythonResult);
        
        return detectionResults;
      } finally {
        // Clean up temporary file
        if (fs.existsSync(tempImagePath)) {
          fs.unlinkSync(tempImagePath);
        }
      }
    } catch (error) {
      console.error('Food detection error:', error);
      throw new Error(`Food detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate that the image contains detectable food items
   */
  async validateFoodImage(imageBuffer: Buffer): Promise<{ hasFood: boolean; confidence: number; suggestions: string[] }> {
    try {
      const detections = await this.detectFood(imageBuffer);
      
      if (detections.length === 0) {
        return {
          hasFood: false,
          confidence: 0,
          suggestions: [
            'Ensure food items are clearly visible in the image',
            'Try taking the photo from a different angle',
            'Make sure the lighting is adequate',
            'Remove any obstructions that might hide the food'
          ]
        };
      }

      const maxConfidence = Math.max(...detections.map(d => d.food.confidence));
      
      return {
        hasFood: true,
        confidence: maxConfidence,
        suggestions: maxConfidence < 0.7 ? [
          'Try taking a clearer photo with better lighting',
          'Position the food more prominently in the frame',
          'Ensure the food is not partially obscured'
        ] : []
      };
    } catch (error) {
      console.error('Food validation error:', error);
      return {
        hasFood: false,
        confidence: 0,
        suggestions: [
          'Image processing failed - please try again',
          'Ensure the image is in a supported format (JPEG, PNG, WebP)'
        ]
      };
    }
  }

  /**
   * Get available food categories that the model can detect
   */
  getDetectableCategories(): string[] {
    // Based on Food-101 dataset categories
    return [
      'apple_pie', 'baby_back_ribs', 'baklava', 'beef_carpaccio', 'beef_tartare',
      'beet_salad', 'beignets', 'bibimbap', 'bread_pudding', 'breakfast_burrito',
      'bruschetta', 'caesar_salad', 'cannoli', 'caprese_salad', 'carrot_cake',
      'ceviche', 'cheese_plate', 'cheesecake', 'chicken_curry', 'chicken_quesadilla',
      'chicken_wings', 'chocolate_cake', 'chocolate_mousse', 'churros', 'clam_chowder',
      'club_sandwich', 'crab_cakes', 'creme_brulee', 'croque_madame', 'cup_cakes',
      'deviled_eggs', 'donuts', 'dumplings', 'edamame', 'eggs_benedict',
      'escargots', 'falafel', 'filet_mignon', 'fish_and_chips', 'foie_gras',
      'french_fries', 'french_onion_soup', 'french_toast', 'fried_calamari', 'fried_rice',
      'frozen_yogurt', 'garlic_bread', 'gnocchi', 'greek_salad', 'grilled_cheese_sandwich',
      'grilled_salmon', 'guacamole', 'gyoza', 'hamburger', 'hot_and_sour_soup',
      'hot_dog', 'huevos_rancheros', 'hummus', 'ice_cream', 'lasagna',
      'lobster_bisque', 'lobster_roll_sandwich', 'macaroni_and_cheese', 'macarons', 'miso_soup',
      'mussels', 'nachos', 'omelette', 'onion_rings', 'oysters',
      'pad_thai', 'paella', 'pancakes', 'panna_cotta', 'peking_duck',
      'pho', 'pizza', 'pork_chop', 'poutine', 'prime_rib',
      'pulled_pork_sandwich', 'ramen', 'ravioli', 'red_velvet_cake', 'risotto',
      'samosa', 'sashimi', 'scallops', 'seaweed_salad', 'shrimp_and_grits',
      'spaghetti_bolognese', 'spaghetti_carbonara', 'spring_rolls', 'steak', 'strawberry_shortcake',
      'sushi', 'tacos', 'takoyaki', 'tiramisu', 'tuna_tartare', 'waffles'
    ];
  }

  /**
   * Save image buffer to temporary file
   */
  private async saveTemporaryImage(imageBuffer: Buffer): Promise<string> {
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFileName = `food_detection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const tempFilePath = path.join(tempDir, tempFileName);
    
    fs.writeFileSync(tempFilePath, imageBuffer);
    return tempFilePath;
  }

  /**
   * Run Python food detection script
   */
  private async runPythonDetection(imagePath: string): Promise<PythonDetectionResult> {
    return new Promise((resolve, reject) => {
      const args = [
        this.pythonScriptPath,
        '--image', imagePath,
        '--confidence', this.config.confidenceThreshold!.toString(),
        '--max-detections', this.config.maxDetections!.toString()
      ];

      if (this.config.modelPath) {
        args.push('--model-path', this.config.modelPath);
      }

      const pythonProcess = spawn(this.config.pythonPath!, args);
      
      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const result = JSON.parse(stdout) as PythonDetectionResult;
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse Python output: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });

      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });

      // Set timeout for long-running processes
      setTimeout(() => {
        pythonProcess.kill();
        reject(new Error('Food detection timeout - process took too long'));
      }, 30000); // 30 second timeout
    });
  }

  /**
   * Convert Python detection results to our TypeScript format
   */
  private convertPythonResults(pythonResult: PythonDetectionResult): FoodDetectionResult[] {
    return pythonResult.detections.map((detection, index) => {
      const food: FoodItem = {
        id: `food_${Date.now()}_${index}`,
        name: this.formatFoodName(detection.class_name),
        confidence: detection.confidence,
        alternativeNames: detection.alternatives?.map(alt => this.formatFoodName(alt.class_name)) || [],
        category: this.getCategoryFromClassName(detection.class_name)
      };

      const alternatives: FoodItem[] = detection.alternatives?.map((alt, altIndex) => ({
        id: `food_alt_${Date.now()}_${index}_${altIndex}`,
        name: this.formatFoodName(alt.class_name),
        confidence: alt.confidence,
        alternativeNames: [],
        category: this.getCategoryFromClassName(alt.class_name)
      })) || [];

      const boundingBox: BoundingBox = {
        x: detection.bbox[0],
        y: detection.bbox[1],
        width: detection.bbox[2],
        height: detection.bbox[3]
      };

      return {
        food,
        alternatives,
        boundingBox
      };
    });
  }

  /**
   * Format class name to human-readable food name
   */
  private formatFoodName(className: string): string {
    return className
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get food category from class name
   */
  private getCategoryFromClassName(className: string): string {
    // Simple categorization based on common patterns
    const desserts = ['cake', 'pie', 'mousse', 'pudding', 'ice_cream', 'donut', 'cookie', 'brownie'];
    const mains = ['burger', 'pizza', 'steak', 'chicken', 'fish', 'pasta', 'rice'];
    const appetizers = ['salad', 'soup', 'wings', 'fries', 'bread'];
    
    const lowerClassName = className.toLowerCase();
    
    if (desserts.some(dessert => lowerClassName.includes(dessert))) {
      return 'Desserts';
    } else if (mains.some(main => lowerClassName.includes(main))) {
      return 'Main Dishes';
    } else if (appetizers.some(app => lowerClassName.includes(app))) {
      return 'Appetizers & Sides';
    } else {
      return 'Other';
    }
  }
}