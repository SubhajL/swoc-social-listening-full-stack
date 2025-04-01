import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import authRouter from './routes/auth.routes';
import { initThaiWaterRoutes } from './routes/thaiwater.routes';
import userAccountRouter from './routes/user-account.routes';
import approvalRecordRouter from './routes/approval-record.routes';
import telemetryStationsRouter from './api/telemetry-stations';
import rainStationsRouter from './api/rain-stations';

// Initialize database connection
import pkg from 'pg';
const { Pool } = pkg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const app = express();
const server = createServer(app);

// Configure middleware
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply CORS to all routes
app.use(cors(corsOptions));

// Health-check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'API is healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: pool ? 'connected' : 'disconnected'
    }
  });
});

// Root API route for documentation
app.get('/api', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Social Listening API',
    version: process.env.npm_package_version || '1.0.0',
    endpoints: [
      '/api/health',
      '/api/posts',
      '/api/location',
      '/api/monitoring-stations',
      '/api/rain-stations',
      '/api/reservoirs',
      '/api/telemetry',
      '/api/thaiwater',
      '/api/users',
      '/api/auth',
      '/api/approval-records'
    ]
  });
});

// Mount API routes with correct prefixes
app.use('/api/rain-stations', rainStationsRouter);
app.use('/api/telemetry-stations', telemetryStationsRouter);
app.use('/api/thaiwater', initThaiWaterRoutes(pool));
app.use('/api/users', userAccountRouter);
app.use('/api/auth', authRouter);
app.use('/api/approval-records', approvalRecordRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:8080',
    methods: ['GET', 'POST']
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('A user connected');
  
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Catch-all route for undefined routes
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// Listen on port from environment or default to 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API health check available at http://localhost:${PORT}/api/health`);
});

export { app, server, io }; 