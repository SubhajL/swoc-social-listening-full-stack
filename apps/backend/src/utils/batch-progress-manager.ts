import { BatchProgress, BatchOperation } from '../models/batch-progress.js';
import { logger } from './logger.js';

export class BatchProgressManager {
  private operations: Map<string, BatchProgress> = new Map();

  createBatch(batchId: string, total: number): BatchOperation {
    const progress: BatchProgress = {
      total,
      completed: 0,
      failed: 0,
      inProgress: 0,
      errors: [],
      status: 'running'
    };
    this.operations.set(batchId, progress);
    return { batchId, progress };
  }

  updateProgress(batchId: string, update: Partial<BatchProgress>): BatchProgress {
    const progress = this.operations.get(batchId);
    if (!progress) {
      throw new Error(`Batch ${batchId} not found`);
    }

    Object.assign(progress, update);
    return progress;
  }

  addError(batchId: string, id: string, error: string): void {
    const progress = this.operations.get(batchId);
    if (!progress) {
      throw new Error(`Batch ${batchId} not found`);
    }

    progress.errors.push({ id, error });
    progress.failed++;
    progress.inProgress--;

    if (progress.completed + progress.failed === progress.total) {
      progress.status = 'completed';
    }

    logger.error(`Batch ${batchId} item ${id} failed:`, error);
  }

  markCompleted(batchId: string, id: string): void {
    const progress = this.operations.get(batchId);
    if (!progress) {
      throw new Error(`Batch ${batchId} not found`);
    }

    progress.completed++;
    progress.inProgress--;

    if (progress.completed + progress.failed === progress.total) {
      progress.status = 'completed';
    }
  }

  getBatchProgress(batchId: string): BatchProgress | undefined {
    return this.operations.get(batchId);
  }

  cleanupBatch(batchId: string): void {
    this.operations.delete(batchId);
  }
} 