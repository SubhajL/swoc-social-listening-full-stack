import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface UserAccount {
  id?: number;
  name: string;
  email: string;
  position: string;
  office_id: string;
  password: string;
  password_changed?: boolean;
  created_at?: Date;
}

export class UserAccountModel {
  constructor(private pool: Pool) {}

  async createUserAccount(userAccount: UserAccount): Promise<UserAccount> {
    const { name, email, position, office_id, password } = userAccount;
    
    try {
      // Check if user with this email already exists
      const existingUser = await this.getUserByEmail(email);
      if (existingUser) {
        throw new Error(`User with email ${email} already exists`);
      }

      const query = `
        INSERT INTO user_accounts (name, email, position, office_id, password, password_changed)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const values = [name, email, position, office_id, password, false];
      const result = await this.pool.query(query, values);
      
      logger.info('✅ User account created successfully', { email });
      return result.rows[0];
    } catch (error) {
      logger.error('❌ Error creating user account', { error: (error as Error).message, email });
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<UserAccount | null> {
    try {
      const query = 'SELECT * FROM user_accounts WHERE email = $1';
      const result = await this.pool.query(query, [email]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('❌ Error getting user by email', { error: (error as Error).message, email });
      throw error;
    }
  }

  // New method to get user by ID
  async getUserById(id: number): Promise<UserAccount | null> {
    try {
      const query = 'SELECT * FROM user_accounts WHERE id = $1';
      const result = await this.pool.query(query, [id]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      logger.error('❌ Error getting user by ID', { error: (error as Error).message, id });
      throw error;
    }
  }

  // Method to delete user by ID
  async deleteUserById(id: number): Promise<boolean> {
    try {
      logger.info('🔄 Attempting to delete user', { id });
      
      // First check if the user exists
      const checkQuery = 'SELECT id FROM user_accounts WHERE id = $1';
      const checkResult = await this.pool.query(checkQuery, [id]);
      
      if (checkResult.rowCount === 0) {
        logger.warn('⚠️ Cannot delete user - not found', { id });
        return false;
      }
      
      // Proceed with deletion
      const query = 'DELETE FROM user_accounts WHERE id = $1 RETURNING id';
      const result = await this.pool.query(query, [id]);
      
      const success = result.rowCount !== null && result.rowCount > 0;
      if (success) {
        logger.info('✅ User account deleted successfully', { id });
      } else {
        logger.warn('⚠️ No user found to delete', { id });
      }
      
      return success;
    } catch (error) {
      logger.error('❌ Error deleting user by ID', { 
        error: (error as Error).message, 
        stack: (error as Error).stack,
        id 
      });
      throw error;
    }
  }

  // New method to get users by office ID
  async getUsersByOfficeId(officeId: string): Promise<UserAccount[]> {
    try {
      const query = `
        SELECT id, name, email, position, office_id, password_changed, created_at 
        FROM user_accounts 
        WHERE office_id = $1
        ORDER BY name ASC
      `;
      
      const result = await this.pool.query(query, [officeId]);
      logger.info('✅ Retrieved users by office ID', { officeId, count: result.rowCount });
      
      return result.rows;
    } catch (error) {
      logger.error('❌ Error getting users by office ID', { error: (error as Error).message, officeId });
      throw error;
    }
  }

  // Create table if it doesn't exist
  async createTableIfNotExists(): Promise<void> {
    try {
      const query = `
        CREATE TABLE IF NOT EXISTS user_accounts (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          position VARCHAR(255) NOT NULL,
          office_id VARCHAR(255) NOT NULL,
          password VARCHAR(255) NOT NULL,
          password_changed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await this.pool.query(query);
      logger.info('✅ User accounts table created or already exists');
    } catch (error) {
      logger.error('❌ Error creating user accounts table', { error: (error as Error).message });
      throw error;
    }
  }
} 