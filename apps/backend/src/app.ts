import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error-handler.js';
import { router as postsRouter } from './api/posts/index.js';

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/posts', postsRouter);

// Error handling
app.use(errorHandler);

export { app }; 