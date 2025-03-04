import { Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { UserAccountModel } from '../models/user-account';
import { logger } from '../utils/logger';
import { pool } from '../lib/db';

// Initialize models
const userAccountModel = new UserAccountModel(pool);

// JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Validation schema for login
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Validation schema for changing password
const changePasswordSchema = z.object({
  userId: z.number().int().positive('User ID is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * @route POST /api/auth/login
 * @description Authenticate a user and return a token
 * @access Public
 */
export const login = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);
    const { email, password } = validatedData;
    
    // Find user by email
    const user = await userAccountModel.getUserByEmail(email);
    
    // Check if user exists
    if (!user) {
      logger.warn('❌ Login attempt failed: User not found', { email });
      return res.status(401).json({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      });
    }
    
    // Check if password matches
    let isPasswordValid = false;
    
    // First try direct comparison (for plain text passwords in development)
    if (password === user.password) {
      isPasswordValid = true;
      logger.info('Password matched using direct comparison', { email });
    } else {
      // Then try bcrypt comparison (for hashed passwords in production)
      try {
        isPasswordValid = await bcrypt.compare(password, user.password);
        logger.info('Password matched using bcrypt comparison', { email });
      } catch (error) {
        logger.warn('Error comparing passwords with bcrypt', { 
          email, 
          error: error instanceof Error ? error.message : String(error) 
        });
        // If bcrypt.compare throws an error (e.g., the stored password is not a valid hash),
        // we'll fall back to the default isPasswordValid = false
      }
    }
    
    if (!isPasswordValid) {
      logger.warn('❌ Login attempt failed: Invalid password', { email });
      return res.status(401).json({
        success: false,
        message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    logger.info('✅ User logged in successfully', { email });
    
    // Return success response with token and user data
    return res.status(200).json({
      success: true,
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        position: user.position,
        office_id: user.office_id,
        password_changed: user.password_changed,
      },
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      logger.error('❌ Validation error during login', { error: error.errors });
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }
    
    // Handle other errors
    logger.error('❌ Error during login', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
};

/**
 * @route POST /api/auth/change-password
 * @description Change a user's password
 * @access Private
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = changePasswordSchema.parse(req.body);
    const { userId, newPassword } = validatedData;
    
    // Find user by ID
    const user = await userAccountModel.getUserById(userId);
    
    // Check if user exists
    if (!user) {
      logger.warn('❌ Password change failed: User not found', { userId });
      return res.status(404).json({
        success: false,
        message: 'ไม่พบผู้ใช้งาน',
      });
    }
    
    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    // Update user's password in the database
    const query = `
      UPDATE user_accounts
      SET password = $1, password_changed = true
      WHERE id = $2
      RETURNING id, email, password_changed
    `;
    
    const result = await pool.query(query, [hashedPassword, userId]);
    
    if (result.rowCount === 0) {
      logger.error('❌ Password change failed: Database update failed', { userId });
      return res.status(500).json({
        success: false,
        message: 'ไม่สามารถอัปเดตรหัสผ่านได้',
      });
    }
    
    logger.info('✅ Password changed successfully', { userId });
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'เปลี่ยนรหัสผ่านสำเร็จ',
      data: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        password_changed: result.rows[0].password_changed,
      },
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      logger.error('❌ Validation error during password change', { error: error.errors });
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }
    
    // Handle other errors
    logger.error('❌ Error during password change', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
}; 