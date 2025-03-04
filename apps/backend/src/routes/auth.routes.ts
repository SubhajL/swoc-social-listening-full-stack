import express from 'express';
import { login, changePassword } from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

/**
 * @route POST /api/auth/login
 * @description Authenticate a user and return a token
 * @access Public
 */
router.post('/login', login);

/**
 * @route POST /api/auth/change-password
 * @description Change a user's password
 * @access Private
 */
router.post('/change-password', authenticateToken, changePassword);

export default router; 