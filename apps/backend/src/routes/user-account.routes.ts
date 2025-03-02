import express from 'express';
import {
  createUserAccount,
  createMultipleUserAccounts,
  getUsersByOffice,
  resendWelcomeEmail,
  checkEmailConfig,
  testEmailService,
  deleteUserAccount,
  deleteMultipleUserAccounts
} from '../controllers/user-account.controller';

const router = express.Router();

/**
 * @route POST /api/users
 * @description Create a single user account
 * @access Private (to be implemented)
 */
router.post('/', createUserAccount);

/**
 * @route POST /api/users/batch
 * @description Create multiple user accounts at once
 * @access Private (to be implemented)
 */
router.post('/batch', createMultipleUserAccounts);

/**
 * @route GET /api/users/office/:officeId
 * @description Get all users for a specific office
 * @access Private (to be implemented)
 */
router.get('/office/:officeId', getUsersByOffice);

/**
 * @route POST /api/users/resend-welcome
 * @description Resend welcome email to an existing user
 * @access Private (to be implemented)
 */
router.post('/resend-welcome', resendWelcomeEmail);

/**
 * @route GET /api/users/email-config
 * @description Check the email service configuration
 * @access Private (to be implemented)
 */
router.get('/email-config', checkEmailConfig);

/**
 * @route POST /api/users/test-email
 * @description Test the email service by sending a test email
 * @access Private (to be implemented)
 */
router.post('/test-email', testEmailService);

/**
 * @route DELETE /api/users/batch
 * @description Delete multiple user accounts at once
 * @access Private (to be implemented)
 */
router.delete('/batch', deleteMultipleUserAccounts);

/**
 * @route DELETE /api/users/:id
 * @description Delete a user account by ID
 * @access Private (to be implemented)
 */
router.delete('/:id', deleteUserAccount);

export default router; 