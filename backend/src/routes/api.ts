import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sessionService } from '../services/SessionService.js';
import { OCRService } from '../services/OCRService.js';
import { validateImageUpload, validateFoodConfirmation } from '../schemas/validation.js';
import type { ProcessImageResponse, ConfirmSelectionRequest, ErrorResponse } from '../types/api.js';

const router = express.Router();
const ocrService = new OCRService();

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

    // Perform OCR to detect scale weight
    const detectedWeight = await ocrService.readScaleWeight(imageBuffer);

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

    // For now, return mock food detection data since ML processing isn't implemented yet
    // This will be replaced with actual food detection in later tasks
    const response: ProcessImageResponse = {
      sessionId,
      detectedFood: [
        {
          food: {
            id: 'mock_food_1',
            name: 'Apple',
            confidence: 0.85,
            alternativeNames: ['Red Apple', 'Gala Apple'],
            category: 'Fruits'
          },
          alternatives: [
            {
              id: 'mock_food_2',
              name: 'Red Apple',
              confidence: 0.75,
              alternativeNames: ['Apple'],
              category: 'Fruits'
            }
          ],
          boundingBox: {
            x: 100,
            y: 100,
            width: 200,
            height: 200
          }
        }
      ],
      detectedWeight
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

export default router;