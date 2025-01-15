export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
  status: 'running' | 'completed' | 'failed';
} 