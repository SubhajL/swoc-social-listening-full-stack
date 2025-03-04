import express from 'express';
import {
  getAllApprovalRecords,
  getApprovalRecordById,
  createApprovalRecordsBatch,
  updateApprovalRecord,
  approveRecord,
  deleteApprovalRecord
} from '../controllers/approval-record.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all approval records
router.get('/', getAllApprovalRecords);

// Get a single approval record by ID
router.get('/:id', getApprovalRecordById);

// Create a batch of approval records
router.post('/batch', createApprovalRecordsBatch);

// Update an approval record
router.put('/:id', updateApprovalRecord);

// Approve an approval record
router.put('/:id/approve', approveRecord);

// Delete an approval record
router.delete('/:id', deleteApprovalRecord);

export default router; 