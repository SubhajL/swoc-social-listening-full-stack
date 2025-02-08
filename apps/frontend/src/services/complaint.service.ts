import { Complaint } from "@/types/complaint";
import { CreateComplaintDTO, ComplaintDTO } from "@/dto/complaint.dto";
import { toast } from "sonner";
import { apiClient } from "@/lib/enhanced-api-client";
import { ProcessedPost } from "@/types/processed-post";
import { logger } from "@/lib/logger";
import { AppError, ErrorCode, ErrorSeverity } from "@/types/api/errors";

// Convert ProcessedPost to Complaint
const mapPostToComplaint = (post: ProcessedPost): Complaint => ({
  id: post.processed_post_id,
  issue: post.text || '',
  category: post.category_name || '',
  reporter: post.profile_name || '',
  date: post.post_date instanceof Date 
    ? post.post_date.toISOString().split('T')[0] 
    : new Date(post.post_date).toISOString().split('T')[0],
  link: post.post_url || '',
  coordinates: {
    lat: post.latitude || 0,
    lng: post.longitude || 0
  },
  tumbon: post.tumbon || [],
  amphure: post.amphure || [],
  province: post.province || [],
  location: [
    post.tumbon?.[0], 
    post.amphure?.[0], 
    post.province?.[0]
  ].filter(Boolean).join(' ')
});

class ComplaintService {
  async getComplaints(filters?: {
    categories?: string[];
    province?: string | null;
    office?: string | null;
  }): Promise<Complaint[]> {
    try {
      logger.info('Fetching complaints', 'ComplaintService', {
        filters
      });
      
      const response = await apiClient.get<ProcessedPost[]>('/api/posts', {
        validateResponse: (data): data is ProcessedPost[] => Array.isArray(data)
      });
      
      const posts = response.data;
      return posts.map(mapPostToComplaint);
    } catch (error) {
      logger.error('Failed to fetch complaints', 'ComplaintService', error, {
        filters
      });
      
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลข้อร้องเรียน');
      throw error;
    }
  }

  async getComplaintById(id: number): Promise<Complaint | undefined> {
    try {
      logger.info('Fetching complaint', 'ComplaintService', {
        id
      });

      const response = await apiClient.get<ProcessedPost>(`/api/posts/${id}`, {
        validateResponse: (data): data is ProcessedPost => 
          typeof data === 'object' && data !== null && 'processed_post_id' in data
      });
      
      return mapPostToComplaint(response.data);
    } catch (error) {
      logger.error('Failed to fetch complaint', 'ComplaintService', error, {
        id
      });
      
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลข้อร้องเรียน');
      throw error;
    }
  }

  async createComplaint(data: CreateComplaintDTO): Promise<Complaint> {
    try {
      logger.info('Creating complaint', 'ComplaintService', {
        data
      });
      
      // Validate input data
      const validationResult = ComplaintDTO.safeParse(data);
      
      if (!validationResult.success) {
        logger.error('Validation failed', 'ComplaintService', validationResult.error, {
          errors: validationResult.error.errors
        });
        
        toast.error('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก');
        throw new AppError({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Complaint validation failed',
          severity: ErrorSeverity.MEDIUM,
          component: 'ComplaintService',
          details: {
            validationErrors: validationResult.error.errors
          }
        });
      }

      // Ensure coordinates are present and valid
      if (!validationResult.data.coordinates?.lat || !validationResult.data.coordinates?.lng) {
        logger.error('Invalid coordinates', 'ComplaintService', new Error('Invalid coordinates'), {
          coordinates: validationResult.data.coordinates
        });
        
        toast.error('พิกัดไม่ถูกต้อง');
        throw new AppError({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid coordinates',
          severity: ErrorSeverity.MEDIUM,
          component: 'ComplaintService',
          details: {
            coordinates: validationResult.data.coordinates
          }
        });
      }

      // TODO: Implement actual API call when endpoint is ready
      throw new AppError({
        code: ErrorCode.NOT_FOUND,
        message: 'Create complaint endpoint not implemented',
        severity: ErrorSeverity.HIGH,
        component: 'ComplaintService'
      });
    } catch (error) {
      logger.error('Failed to create complaint', 'ComplaintService', error, {
        data
      });
      
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อร้องเรียน');
      throw error;
    }
  }
}

export const complaintService = new ComplaintService();