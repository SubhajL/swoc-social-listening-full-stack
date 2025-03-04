import { Request, Response } from 'express';
import { z } from 'zod';
import { UserAccountModel, UserAccount } from '../models/user-account';
import { EmailService } from '../services/email.service';
import { logger } from '../utils/logger';
import { pool } from '../lib/db';

// Initialize models and services
const userAccountModel = new UserAccountModel(pool);
const emailService = new EmailService();

// Initialize database table if it doesn't exist
(async () => {
  try {
    await userAccountModel.createTableIfNotExists();
  } catch (error) {
    logger.error('❌ Error initializing user account database table', { error: (error as Error).message });
  }
})();

// Validation schema for creating a user account
const userAccountSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  position: z.string().min(1, 'Position is required'),
  office_id: z.string().min(1, 'Office ID is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Validation schema for creating multiple user accounts at once
const createUsersSchema = z.object({
  office_id: z.string().min(1, 'Office ID is required'),
  users: z.array(
    z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email address'),
      position: z.string().min(1, 'Position is required'),
    })
  ).min(1, 'At least one user is required'),
});

export const createUserAccount = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = userAccountSchema.parse(req.body);
    
    // Create user account
    const userAccount = await userAccountModel.createUserAccount(validatedData);
    
    // Send welcome email
    const emailResult = await emailService.sendWelcomeEmail(
      userAccount.email,
      userAccount.name,
      validatedData.password // Use the non-hashed password for the email
    );
    
    // Return success response with user account data and email status
    return res.status(201).json({
      success: true,
      message: 'User account created successfully',
      data: {
        user: {
          id: userAccount.id,
          name: userAccount.name,
          email: userAccount.email,
          position: userAccount.position,
          office_id: userAccount.office_id,
          created_at: userAccount.created_at,
        },
        email: {
          success: emailResult.success,
          previewUrl: emailResult.previewUrl,
        },
      },
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      logger.error('❌ Validation error creating user account', { error: error.errors });
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }
    
    // Handle other errors
    logger.error('❌ Error creating user account', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
};

export const createMultipleUserAccounts = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = createUsersSchema.parse(req.body);
    const { office_id, users } = validatedData;
    
    // Results arrays
    const createdUsers: UserAccount[] = [];
    const failedUsers: { email: string; error: string }[] = [];
    const emailResults: { email: string; success: boolean; previewUrl?: string }[] = [];
    
    // Process each user
    for (const userData of users) {
      try {
        // Generate random password
        const password = generateRandomPassword();
        
        // Create user account
        const userAccount = await userAccountModel.createUserAccount({
          ...userData,
          office_id,
          password,
        });
        
        // Send welcome email
        const emailResult = await emailService.sendWelcomeEmail(
          userAccount.email,
          userAccount.name,
          password
        );
        
        // Add to results
        createdUsers.push(userAccount);
        emailResults.push({
          email: userAccount.email,
          success: emailResult.success,
          previewUrl: emailResult.previewUrl,
        });
      } catch (error) {
        // Add to failed users
        failedUsers.push({
          email: userData.email,
          error: (error as Error).message,
        });
      }
    }
    
    // Return response with results
    return res.status(201).json({
      success: true,
      message: `Created ${createdUsers.length} user accounts with ${failedUsers.length} failures`,
      data: {
        created: createdUsers.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          position: user.position,
          office_id: user.office_id,
          created_at: user.created_at,
        })),
        failed: failedUsers,
        emails: emailResults,
      },
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      logger.error('❌ Validation error creating multiple user accounts', { error: error.errors });
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
    }
    
    // Handle other errors
    logger.error('❌ Error creating multiple user accounts', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
};

// Generate a random password
const generateRandomPassword = (length = 10) => {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};

// Add this new controller method after the existing ones
export const getUsersByOffice = async (req: Request, res: Response) => {
  try {
    const officeId = req.params.officeId;
    
    if (!officeId) {
      return res.status(400).json({
        success: false,
        message: 'Office ID is required',
      });
    }
    
    // Get users by office ID
    const users = await userAccountModel.getUsersByOfficeId(officeId);
    
    // Return success response with users data
    return res.status(200).json({
      success: true,
      message: `Retrieved ${users.length} users for office ID ${officeId}`,
      data: {
        users: users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          position: user.position,
          office_id: user.office_id,
          password_changed: user.password_changed,
          created_at: user.created_at,
        })),
      },
    });
  } catch (error) {
    // Handle errors
    logger.error('❌ Error getting users by office ID', { error: (error as Error).message, officeId: req.params.officeId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
};

/**
 * @route POST /api/users/resend-welcome
 * @description Resend welcome email to an existing user
 * @access Private
 */
export async function resendWelcomeEmail(req: Request, res: Response) {
  try {
    // Validate input
    const schema = z.object({
      email: z.string().email('Invalid email format'),
    });

    const validationResult = schema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationResult.error.errors,
      });
    }

    const { email } = validationResult.data;
    
    // Find user by email
    const user = await userAccountModel.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with email ${email} not found`,
      });
    }
    
    // Generate a new random password
    const password = generateRandomPassword();
    
    // Send welcome email
    const emailResult = await emailService.sendWelcomeEmail(
      user.email,
      user.name,
      password
    );
    
    if (emailResult.success) {
      logger.info('✅ Welcome email resent successfully', {
        email: user.email,
        messageId: emailResult.messageId,
      });
      
      return res.status(200).json({
        success: true,
        message: 'Welcome email resent successfully',
        data: {
          email: user.email,
          messageId: emailResult.messageId,
          previewUrl: emailResult.previewUrl,
        },
      });
    } else {
      logger.error('❌ Failed to resend welcome email', { email: user.email });
      return res.status(500).json({
        success: false,
        message: 'Failed to resend welcome email',
      });
    }
  } catch (error) {
    logger.error('❌ Error resending welcome email', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
}

/**
 * @route GET /api/users/email-config
 * @description Check the email service configuration
 * @access Private
 */
export async function checkEmailConfig(req: Request, res: Response) {
  try {
    // Reinitialize the email service to ensure it has the latest environment variables
    emailService.initialize();
    
    const isUsingEthereal = emailService.isUsingEtherealEmail();
    const smtpSettings = emailService.getSmtpSettings();
    
    return res.status(200).json({
      success: true,
      data: {
        isUsingEthereal,
        smtpSettings,
        message: isUsingEthereal 
          ? 'Using Ethereal test email service. Emails will NOT be delivered to real inboxes.' 
          : 'Using real SMTP server. Emails will be delivered to real inboxes.'
      }
    });
  } catch (error) {
    logger.error('❌ Error checking email configuration', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
}

/**
 * @route POST /api/users/test-email
 * @description Test the email service by sending a test email
 * @access Private
 */
export async function testEmailService(req: Request, res: Response) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }
    
    // Reinitialize the email service to ensure it has the latest environment variables
    emailService.initialize();
    
    // Send a test email
    const result = await emailService.sendEmail({
      to: email,
      subject: 'Test Email from SWOC Social Listening',
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #17254D;">Test Email</h2>
          <p>This is a test email from SWOC Social Listening.</p>
          <p>If you received this email, it means the email service is working correctly.</p>
          <p>Email configuration: ${emailService.isUsingEtherealEmail() ? 'Using Ethereal (test only)' : 'Using real SMTP server'}</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;" />
          <p style="color: #777; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      `,
      text: `
Test Email

This is a test email from SWOC Social Listening.
If you received this email, it means the email service is working correctly.
Email configuration: ${emailService.isUsingEtherealEmail() ? 'Using Ethereal (test only)' : 'Using real SMTP server'}

This is an automated message, please do not reply.
      `,
    });
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Test email sent successfully',
        data: {
          email,
          messageId: result.messageId,
          previewUrl: result.previewUrl,
          isUsingEthereal: emailService.isUsingEtherealEmail(),
        },
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Failed to send test email',
      });
    }
  } catch (error) {
    logger.error('❌ Error sending test email', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
}

/**
 * @route DELETE /api/users/:id
 * @description Delete a user account by ID
 * @access Private
 */
export async function deleteUserAccount(req: Request, res: Response) {
  try {
    const userId = req.params.id;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }
    
    // Get the user before deletion to return in the response
    const user = await userAccountModel.getUserById(parseInt(userId));
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with ID ${userId} not found`,
      });
    }
    
    // Delete the user
    await userAccountModel.deleteUserById(parseInt(userId));
    
    logger.info('✅ User account deleted successfully', { userId, email: user.email });
    
    return res.status(200).json({
      success: true,
      message: 'User account deleted successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    logger.error('❌ Error deleting user account', { error: (error as Error).message, userId: req.params.id });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
}

/**
 * @route DELETE /api/users/batch
 * @description Delete multiple user accounts at once
 * @access Private
 */
export async function deleteMultipleUserAccounts(req: Request, res: Response) {
  try {
    // Validate request body
    const schema = z.object({
      user_ids: z.array(z.number()).min(1, 'At least one user ID is required'),
    });

    const validationResult = schema.safeParse(req.body);
    
    if (!validationResult.success) {
      logger.error('❌ Validation error in deleteMultipleUserAccounts', { errors: validationResult.error.errors });
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationResult.error.errors,
      });
    }

    const { user_ids } = validationResult.data;
    logger.info('🔄 Processing batch deletion request', { user_ids });
    
    // Results arrays
    const deletedUsers: { id: number; name: string; email: string }[] = [];
    const failedDeletions: { id: number; error: string }[] = [];
    
    // Process each user ID
    for (const userId of user_ids) {
      try {
        // Get user before deletion
        const user = await userAccountModel.getUserById(userId);
        
        if (!user) {
          logger.warn('⚠️ User not found for deletion', { userId });
          failedDeletions.push({
            id: userId,
            error: `User with ID ${userId} not found`,
          });
          continue;
        }
        
        // Delete the user
        const success = await userAccountModel.deleteUserById(userId);
        
        if (success) {
          logger.info('✅ User deleted successfully', { userId, name: user.name, email: user.email });
          deletedUsers.push({
            id: userId,
            name: user.name,
            email: user.email,
          });
        } else {
          logger.error('❌ Failed to delete user', { userId });
          failedDeletions.push({
            id: userId,
            error: `Failed to delete user with ID ${userId}`,
          });
        }
      } catch (error) {
        logger.error('❌ Error deleting user', { error: (error as Error).message, userId });
        failedDeletions.push({
          id: userId,
          error: (error as Error).message,
        });
      }
    }
    
    // Return response with results
    logger.info('✅ Batch deletion completed', { 
      deletedCount: deletedUsers.length, 
      failedCount: failedDeletions.length 
    });
    
    return res.status(200).json({
      success: true,
      message: `Deleted ${deletedUsers.length} user accounts with ${failedDeletions.length} failures`,
      data: {
        deleted: deletedUsers,
        failed: failedDeletions,
      },
    });
  } catch (error) {
    logger.error('❌ Error deleting multiple user accounts', { error: (error as Error).message });
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: (error as Error).message,
    });
  }
}

/**
 * Get approval team members by organization ID
 * This function retrieves users with positions 1, 2, and 3 for a specific organization
 */
export const getApprovalTeamByOrganization = async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.params;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required',
      });
    }
    
    logger.info('🔍 Fetching approval team for organization', { organizationId });
    
    // Get users by office ID (organization ID)
    const users = await userAccountModel.getUsersByOfficeId(organizationId);
    
    // Filter users by position (1, 2, 3) and map to approval team format
    const approvalTeam = users
      .filter(user => ['1', '2', '3'].includes(user.position))
      .sort((a, b) => parseInt(a.position) - parseInt(b.position))
      .map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        position: parseInt(user.position),
        organizationId: user.office_id
      }));
    
    logger.info('✅ Retrieved approval team members', { 
      organizationId, 
      count: approvalTeam.length,
      positions: approvalTeam.map(member => member.position)
    });
    
    // Return success response with approval team data
    return res.status(200).json(approvalTeam);
  } catch (error) {
    logger.error('❌ Error fetching approval team', { 
      error: (error as Error).message,
      organizationId: req.params.organizationId
    });
    
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch approval team',
      error: (error as Error).message
    });
  }
}; 