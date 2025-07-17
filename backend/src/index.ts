import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Import API routes
import apiRoutes from './routes/api.js';

// API routes
app.use('/api', apiRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Food Nutrition Detector API',
    version: '1.0.0',
    endpoints: {
      upload: 'POST /api/upload',
      confirm: 'POST /api/confirm',
      session: 'GET /api/session/:sessionId',
      deleteSession: 'DELETE /api/session/:sessionId',
      extendSession: 'POST /api/session/:sessionId/extend'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  
  // Handle multer errors
  if (err.message.includes('File too large')) {
    return res.status(413).json({ 
      error: 'File too large',
      code: 'FILE_TOO_LARGE',
      message: 'Image file size exceeds the maximum allowed limit'
    });
  }
  
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({
      error: 'Invalid file type',
      code: 'INVALID_FILE_TYPE', 
      message: err.message
    });
  }
  
  // Handle Redis connection errors
  if (err.message.includes('Redis') || err.message.includes('ECONNREFUSED')) {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      code: 'SERVICE_UNAVAILABLE',
      message: 'Session storage is currently unavailable. Please try again later.'
    });
  }
  
  return res.status(500).json({ 
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;