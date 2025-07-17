# Food Nutrition Detector

A web application that uses computer vision to detect food items and read scale weights from photos, providing accurate nutrition information based on actual measured portions.

## Project Structure

```
├── frontend/          # React TypeScript frontend with Vite
├── backend/           # Node.js Express backend with TypeScript
├── docker-compose.yml # Production Docker setup
├── docker-compose.dev.yml # Development Docker setup
└── README.md
```

## Development Setup

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose (optional but recommended)

### Option 1: Docker Development (Recommended)

1. Clone the repository
2. Copy environment files:
   ```bash
   cp frontend/.env.example frontend/.env
   cp backend/.env.example backend/.env
   ```
3. Start development environment:
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Redis: localhost:6379

### Option 2: Local Development

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

#### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

#### Redis Setup
Install and start Redis locally, or use Docker:
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

## Testing

### Frontend Tests
```bash
cd frontend
npm test          # Run tests once
npm run test:watch # Run tests in watch mode
```

### Backend Tests
```bash
cd backend
npm test          # Run tests once
npm run test:watch # Run tests in watch mode
```

## Production Deployment

```bash
docker-compose up --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Environment Variables

### Frontend (.env)
- `VITE_API_BASE_URL`: Backend API URL
- `VITE_NODE_ENV`: Environment (development/production)

### Backend (.env)
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `FRONTEND_URL`: Frontend URL for CORS
- `REDIS_URL`: Redis connection URL
- `USDA_API_KEY`: USDA FoodData Central API key
- `MAX_FILE_SIZE`: Maximum upload file size in bytes
- `UPLOAD_DIR`: Directory for uploaded files

## Technology Stack

- **Frontend**: React 19, TypeScript, Vite, React Testing Library, Vitest
- **Backend**: Node.js, Express, TypeScript, Jest, Redis
- **Development**: ESLint, Prettier, Docker
- **Future**: Computer Vision (food detection), OCR (scale reading), USDA API integration