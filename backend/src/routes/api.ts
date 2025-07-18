import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sessionService } from '../services/SessionService.js';
import { OCRService } from '../services/OCRService.js';
import { FoodDetectionService } from '../services/FoodDetectionService.js';
import { NutritionService } from '../services/NutritionService.js';
import { validateImageUpload, validateFoodConfirmation } from '../schemas/validation.js';
import type { ProcessImageResponse, ConfirmSelectionRequest, ErrorResponse } from '../types/api.js';

const router = express.Router();
const ocrService = new OCRService();
const foodDetectionService = new FoodDetectionService();
const nutritionService = new NutritionService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
  }
});

// POST /api/upload - Upload image and start processing
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No image file provided',
        code: 'MISSING_FILE',
        message: 'Please upload an image file'
      } as ErrorResponse);
    }

    // Validate the uploaded image
    const validation = validateImageUpload(req.file);
    if (!validation.success) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Invalid image',
        code: 'INVALID_IMAGE',
        message: validation.error.message,
        details: validation.error.issues
      } as ErrorResponse);
    }

    // Create a new session
    const sessionId = await sessionService.createSession();

    // Read the uploaded image file
    const imageBuffer = fs.readFileSync(req.file.path);

    // Perform parallel processing of OCR and food detection
    const [detectedWeight, detectedFood] = await Promise.all([
      ocrService.readScaleWeight(imageBuffer),
      foodDetectionService.detectFood(imageBuffer)
    ]);

    // Validate that the image contains a scale (optional validation)
    const scaleValidation = await ocrService.validateScaleImage(imageBuffer);

    // Clean up uploaded file after processing
    fs.unlinkSync(req.file.path);

    // Check if OCR confidence is too low and provide suggestions
    if (detectedWeight.confidence < 60) {
      return res.status(422).json({
        error: 'Low confidence scale reading',
        code: 'LOW_CONFIDENCE_OCR',
        message: 'Could not reliably read the scale display. Please try again with a clearer image.',
        details: {
          detectedWeight,
          scaleValidation,
          suggestions: [
            'Ensure the scale display is clearly visible and well-lit',
            'Take the photo from directly above the scale',
            'Make sure there are no shadows or glare on the display',
            'Check that the scale is showing a stable weight reading'
          ]
        }
      } as ErrorResponse);
    }

    // Check if food detection failed or has low confidence
    if (detectedFood.length === 0) {
      return res.status(422).json({
        error: 'No food detected',
        code: 'NO_FOOD_DETECTED',
        message: 'Could not detect any food items in the image. Please try again with a clearer image.',
        details: {
          detectedWeight,
          scaleValidation,
          suggestions: [
            'Ensure food items are clearly visible in the image',
            'Try taking the photo from a different angle',
            'Make sure the lighting is adequate',
            'Remove any obstructions that might hide the food'
          ]
        }
      } as ErrorResponse);
    }

    // Check for session continuity (sequential ingredient addition)
    let weightDifference: number | undefined;
    let previousWeight: number | undefined;
    let sessionIdToUse = sessionId;

    // Get existing session if this is a continuation
    const existingSessionId = req.body.sessionId;
    if (existingSessionId) {
      const weightValidation = await sessionService.calculateWeightDifference(existingSessionId, detectedWeight.value);
      
      if (!weightValidation.isValid) {
        return res.status(422).json({
          error: 'Invalid weight difference',
          code: 'INVALID_WEIGHT_DIFFERENCE',
          message: weightValidation.error || 'The new weight should be greater than the previous weight when adding ingredients.',
          details: {
            currentWeight: detectedWeight.value,
            previousWeight: weightValidation.previousWeight,
            weightDifference: weightValidation.difference,
            suggestions: [
              'Ensure you have added new food to the scale',
              'Check that the scale reading is accurate',
              'Make sure the scale has not been reset'
            ]
          }
        } as ErrorResponse);
      }

      weightDifference = weightValidation.difference;
      previousWeight = weightValidation.previousWeight;
      sessionIdToUse = existingSessionId; // Use existing session instead of creating new one
    }

    const response: ProcessImageResponse = {
      sessionId: sessionIdToUse,
      detectedFood,
      detectedWeight,
      weightDifference,
      previousWeight
    };

    return res.json(response);

  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      error: 'Upload processing failed',
      code: 'UPLOAD_ERROR',
      message: 'An error occurred while processing your image'
    } as ErrorResponse);
  }
});

// POST /api/confirm - Confirm food selection and weight
router.post('/confirm', async (req, res) => {
  try {
    const validation = validateFoodConfirmation(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid confirmation data',
        code: 'INVALID_DATA',
        message: 'Please provide valid food and weight information',
        details: validation.error.issues
      } as ErrorResponse);
    }

    const { sessionId, selectedFood, confirmedWeight } = req.body as ConfirmSelectionRequest;

    // Get the session
    const session = await sessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND',
        message: 'The session has expired or does not exist'
      } as ErrorResponse);
    }

    // Create meal component (nutrition calculation will be implemented in task 5)
    const mealComponent = {
      food: selectedFood,
      weight: confirmedWeight,
      nutrition: {
        // Mock nutrition data - will be replaced with actual USDA API data
        calories: Math.round(confirmedWeight * 0.52), // ~52 cal per 100g for apple
        protein: Math.round(confirmedWeight * 0.003), // ~0.3g per 100g
        carbohydrates: Math.round(confirmedWeight * 0.14), // ~14g per 100g
        fat: Math.round(confirmedWeight * 0.002), // ~0.2g per 100g
        fiber: Math.round(confirmedWeight * 0.024), // ~2.4g per 100g
        sodium: Math.round(confirmedWeight * 0.00001), // ~1mg per 100g
        sugar: Math.round(confirmedWeight * 0.104), // ~10.4g per 100g
        saturatedFat: 0,
        cholesterol: 0,
        potassium: Math.round(confirmedWeight * 1.07) // ~107mg per 100g
      },
      addedAt: new Date()
    };

    // Add ingredient to session
    const updatedSession = await sessionService.addIngredient(sessionId, mealComponent);
    if (!updatedSession) {
      return res.status(500).json({
        error: 'Failed to update session',
        code: 'SESSION_UPDATE_ERROR',
        message: 'Could not add ingredient to meal session'
      } as ErrorResponse);
    }

    return res.json({
      success: true,
      session: updatedSession,
      message: 'Ingredient added successfully'
    });

  } catch (error) {
    console.error('Confirmation error:', error);
    return res.status(500).json({
      error: 'Confirmation processing failed',
      code: 'CONFIRMATION_ERROR',
      message: 'An error occurred while confirming your selection'
    } as ErrorResponse);
  }
});

// GET /api/session/:sessionId - Get session data
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await sessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND',
        message: 'The session has expired or does not exist'
      } as ErrorResponse);
    }

    return res.json(session);

  } catch (error) {
    console.error('Session retrieval error:', error);
    return res.status(500).json({
      error: 'Session retrieval failed',
      code: 'SESSION_ERROR',
      message: 'Could not retrieve session data'
    } as ErrorResponse);
  }
});

// DELETE /api/session/:sessionId - Delete session
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const deleted = await sessionService.deleteSession(sessionId);
    if (!deleted) {
      return res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND',
        message: 'The session has expired or does not exist'
      } as ErrorResponse);
    }

    return res.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error) {
    console.error('Session deletion error:', error);
    return res.status(500).json({
      error: 'Session deletion failed',
      code: 'SESSION_DELETE_ERROR',
      message: 'Could not delete session'
    } as ErrorResponse);
  }
});

// POST /api/session/:sessionId/extend - Extend session expiration
router.post('/session/:sessionId/extend', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { ttlSeconds = 3600 } = req.body;
    
    const extended = await sessionService.extendSession(sessionId, ttlSeconds);
    if (!extended) {
      return res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND',
        message: 'The session has expired or does not exist'
      } as ErrorResponse);
    }

    return res.json({
      success: true,
      message: 'Session extended successfully',
      expiresIn: ttlSeconds
    });

  } catch (error) {
    console.error('Session extension error:', error);
    return res.status(500).json({
      error: 'Session extension failed',
      code: 'SESSION_EXTEND_ERROR',
      message: 'Could not extend session'
    } as ErrorResponse);
  }
});

// GET /api/foods/search - Search USDA food database
router.get('/foods/search', async (req, res) => {
  try {
    const { q: query, limit = '10' } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Missing search query',
        code: 'MISSING_QUERY',
        message: 'Please provide a search query parameter "q"'
      } as ErrorResponse);
    }

    if (query.trim().length < 2) {
      return res.status(400).json({
        error: 'Query too short',
        code: 'QUERY_TOO_SHORT',
        message: 'Search query must be at least 2 characters long'
      } as ErrorResponse);
    }

    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        error: 'Invalid limit',
        code: 'INVALID_LIMIT',
        message: 'Limit must be a number between 1 and 50'
      } as ErrorResponse);
    }

    const foods = await nutritionService.searchFoodDatabase(query.trim(), limitNum);
    
    return res.json({
      query: query.trim(),
      results: foods,
      count: foods.length
    });

  } catch (error) {
    console.error('Food search error:', error);
    return res.status(500).json({
      error: 'Food search failed',
      code: 'SEARCH_ERROR',
      message: 'An error occurred while searching for foods'
    } as ErrorResponse);
  }
});

// GET /api/foods/:foodId/nutrition - Get nutrition data for specific food and weight
router.get('/foods/:foodId/nutrition', async (req, res) => {
  try {
    const { foodId } = req.params;
    const { weight } = req.query;
    
    if (!weight || typeof weight !== 'string') {
      return res.status(400).json({
        error: 'Missing weight parameter',
        code: 'MISSING_WEIGHT',
        message: 'Please provide a weight parameter in grams'
      } as ErrorResponse);
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      return res.status(400).json({
        error: 'Invalid weight',
        code: 'INVALID_WEIGHT',
        message: 'Weight must be a positive number in grams'
      } as ErrorResponse);
    }

    const nutrition = await nutritionService.getNutritionData(foodId, weightNum);
    
    return res.json({
      foodId,
      weight: weightNum,
      nutrition
    });

  } catch (error) {
    console.error('Nutrition data error:', error);
    return res.status(500).json({
      error: 'Nutrition data retrieval failed',
      code: 'NUTRITION_ERROR',
      message: 'An error occurred while retrieving nutrition data'
    } as ErrorResponse);
  }
});

// GET /api/session/:sessionId/summary - Get meal summary with cumulative nutrition
router.get('/session/:sessionId/summary', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const summary = await sessionService.getMealSummary(sessionId);
    if (!summary) {
      return res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND',
        message: 'The session has expired or does not exist'
      } as ErrorResponse);
    }

    return res.json({
      sessionId,
      ...summary,
      message: 'Meal summary retrieved successfully'
    });

  } catch (error) {
    console.error('Meal summary error:', error);
    return res.status(500).json({
      error: 'Meal summary retrieval failed',
      code: 'SUMMARY_ERROR',
      message: 'Could not retrieve meal summary'
    } as ErrorResponse);
  }
});

// PUT /api/session/:sessionId/weight - Update weight for last ingredient and recalculate nutrition
router.put('/session/:sessionId/weight', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { weight, unit = 'g' } = req.body;
    
    if (!weight || typeof weight !== 'number' || weight <= 0) {
      return res.status(400).json({
        error: 'Invalid weight',
        code: 'INVALID_WEIGHT',
        message: 'Weight must be a positive number'
      } as ErrorResponse);
    }

    if (!['g', 'oz', 'lb'].includes(unit)) {
      return res.status(400).json({
        error: 'Invalid unit',
        code: 'INVALID_UNIT',
        message: 'Unit must be g, oz, or lb'
      } as ErrorResponse);
    }

    // Get the session
    const session = await sessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND',
        message: 'The session has expired or does not exist'
      } as ErrorResponse);
    }

    if (session.components.length === 0) {
      return res.status(400).json({
        error: 'No ingredients to update',
        code: 'NO_INGREDIENTS',
        message: 'Session has no ingredients to update weight for'
      } as ErrorResponse);
    }

    // Get the last ingredient
    const lastIngredient = session.components[session.components.length - 1];
    
    // Convert weight to grams for consistent storage
    const { convertToGrams } = await import('../utils/conversions.js');
    const weightInGrams = convertToGrams(weight, unit as any);
    
    // Validate weight against previous total if this isn't the first ingredient
    if (session.components.length > 1) {
      const previousTotalWeight = session.totalWeight - lastIngredient.weight;
      if (weightInGrams <= previousTotalWeight) {
        return res.status(400).json({
          error: 'Invalid weight correction',
          code: 'INVALID_WEIGHT_CORRECTION',
          message: `Corrected weight (${weightInGrams.toFixed(1)}g) must be greater than previous total weight (${previousTotalWeight.toFixed(1)}g)`
        } as ErrorResponse);
      }
    }

    // Recalculate nutrition for the corrected weight
    const updatedNutrition = await nutritionService.getNutritionData(
      lastIngredient.food.id, 
      weightInGrams
    );

    // Update the last ingredient
    const updatedIngredient = {
      ...lastIngredient,
      weight: weightInGrams,
      nutrition: updatedNutrition
    };

    // Update session components
    const updatedComponents = [
      ...session.components.slice(0, -1),
      updatedIngredient
    ];

    // Recalculate total weight
    const newTotalWeight = updatedComponents.reduce((sum, component) => sum + component.weight, 0);

    // Update session
    const updatedSession = {
      ...session,
      components: updatedComponents,
      totalWeight: newTotalWeight,
      lastUpdated: new Date()
    };

    // Save updated session
    const savedSession = await sessionService.updateSession(sessionId, updatedSession);
    if (!savedSession) {
      return res.status(500).json({
        error: 'Failed to update session',
        code: 'SESSION_UPDATE_ERROR',
        message: 'Could not save weight correction'
      } as ErrorResponse);
    }

    return res.json({
      success: true,
      session: savedSession,
      updatedIngredient,
      message: 'Weight corrected and nutrition recalculated successfully'
    });

  } catch (error) {
    console.error('Weight correction error:', error);
    return res.status(500).json({
      error: 'Weight correction failed',
      code: 'WEIGHT_CORRECTION_ERROR',
      message: 'An error occurred while correcting the weight'
    } as ErrorResponse);
  }
});

export default router;