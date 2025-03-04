import { Request, Response } from 'express';
import ApprovalRecord from '../models/approval-record';
import { Op } from 'sequelize';
import { logger } from '../utils/logger';

/**
 * Get all approval records based on RBAC role
 */
export const getAllApprovalRecords = async (req: Request, res: Response) => {
  try {
    const { rbacRole } = req.query;
    
    logger.info(`Fetching approval records for RBAC role: ${rbacRole}`);
    
    // Validate rbacRole
    const role = rbacRole ? parseInt(rbacRole as string, 10) : 1;
    
    logger.info(`Parsed RBAC role: ${role}`);
    
    // Get records based on RBAC role
    let records;
    
    if (role === 1) {
      // RBAC 1 can see all records
      logger.info('RBAC 1 - Fetching all records');
      records = await ApprovalRecord.findAll();
    } else {
      // Other roles can only see their own records and subsequent records
      logger.info(`RBAC ${role} - Fetching filtered records`);
      records = await ApprovalRecord.findAll({
        where: {
          position: {
            [Op.gte]: role
          }
        }
      });
    }
    
    logger.info(`Found ${records.length} approval records`);
    
    return res.status(200).json(records);
  } catch (error) {
    logger.error('Error fetching approval records:', error);
    return res.status(500).json({ message: 'Failed to fetch approval records' });
  }
};

/**
 * Get a single approval record by ID
 */
export const getApprovalRecordById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const record = await ApprovalRecord.findByPk(id);
    
    if (!record) {
      return res.status(404).json({ message: 'Approval record not found' });
    }
    
    return res.status(200).json(record);
  } catch (error) {
    logger.error('Error fetching approval record:', error);
    return res.status(500).json({ message: 'Failed to fetch approval record' });
  }
};

/**
 * Create a batch of approval records
 */
export const createApprovalRecordsBatch = async (req: Request, res: Response) => {
  try {
    const records = req.body;
    
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: 'Invalid request body. Expected an array of records.' });
    }
    
    // Create all records in a transaction
    const createdRecords = await ApprovalRecord.bulkCreate(records);
    
    return res.status(201).json(createdRecords);
  } catch (error) {
    logger.error('Error creating approval records:', error);
    return res.status(500).json({ message: 'Failed to create approval records' });
  }
};

/**
 * Update an approval record
 */
export const updateApprovalRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const record = await ApprovalRecord.findByPk(id);
    
    if (!record) {
      return res.status(404).json({ message: 'Approval record not found' });
    }
    
    await record.update(updates);
    
    return res.status(200).json(record);
  } catch (error) {
    logger.error('Error updating approval record:', error);
    return res.status(500).json({ message: 'Failed to update approval record' });
  }
};

/**
 * Approve an approval record
 */
export const approveRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { endDate, status } = req.body;
    
    const record = await ApprovalRecord.findByPk(id);
    
    if (!record) {
      return res.status(404).json({ message: 'Approval record not found' });
    }
    
    // Update the record with approval info
    await record.update({
      endDate,
      status
    });
    
    return res.status(200).json(record);
  } catch (error) {
    logger.error('Error approving record:', error);
    return res.status(500).json({ message: 'Failed to approve record' });
  }
};

/**
 * Delete an approval record
 */
export const deleteApprovalRecord = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const record = await ApprovalRecord.findByPk(id);
    
    if (!record) {
      return res.status(404).json({ message: 'Approval record not found' });
    }
    
    await record.destroy();
    
    return res.status(204).send();
  } catch (error) {
    logger.error('Error deleting approval record:', error);
    return res.status(500).json({ message: 'Failed to delete approval record' });
  }
}; 