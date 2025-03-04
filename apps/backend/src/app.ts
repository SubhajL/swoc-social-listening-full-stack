import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rainStationsRouter from './api/rain-stations';

const app = express();
const server = createServer(app);

// Import routes
import authRouter from './routes/auth.routes';
import thaiWaterRouter from './routes/thaiwater.routes';
import userAccountRouter from './routes/user-account.routes';
import approvalRecordRouter from './routes/approval-record.routes';
import telemetryRouter from './routes/telemetry.routes';

// Configure middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// API routes
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Register routes
app.use('/api/rain-stations', rainStationsRouter);
app.use('/api/telemetry', telemetryRouter);
app.use('/api/thaiwater', thaiWaterRouter);
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
    origin: '*',
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

// CORS configuration for preflight requests
app.options('*', cors());

// Configure CORS for specific routes
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply CORS to specific routes
const corsProtectedRoutes = [
  '/api/rain-stations',
  '/api/telemetry',
  '/api/thaiwater',
  '/api/users',
  '/api/auth',
  '/api/approval-records'
];

corsProtectedRoutes.forEach(route => {
  app.use(route, cors(corsOptions));
});

export { app, server, io }; 