import { Complaint } from "@/types/complaint";
import { CreateComplaintDTO, ComplaintDTO } from "@/dto/complaint.dto";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { ProcessedPost } from "@/types/processed-post";

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
      console.log('Fetching complaints with filters:', filters);
      
      const posts = await apiClient.getUnprocessedPosts();
      return posts.map(mapPostToComplaint);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลข้อร้องเรียน');
      throw error;
    }
  }

  async getComplaintById(id: number): Promise<Complaint | undefined> {
    try {
      console.log('Fetching complaint by ID:', id);
      const post = await apiClient.getPostById(String(id));
      return mapPostToComplaint(post);
    } catch (error) {
      console.error('Error fetching complaint by ID:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลข้อร้องเรียน');
      throw error;
    }
  }

  async createComplaint(data: CreateComplaintDTO): Promise<Complaint> {
    try {
      console.log('Creating new complaint:', data);
      
      // Validate input data
      const validationResult = ComplaintDTO.safeParse(data);
      
      if (!validationResult.success) {
        console.error('Validation failed:', validationResult.error);
        toast.error('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก');
        throw new Error('Validation failed');
      }

      // Ensure coordinates are present and valid
      if (!validationResult.data.coordinates?.lat || !validationResult.data.coordinates?.lng) {
        console.error('Invalid coordinates');
        toast.error('พิกัดไม่ถูกต้อง');
        throw new Error('Invalid coordinates');
      }

      // TODO: Implement actual API call when endpoint is ready
      throw new Error('Create complaint endpoint not implemented');
    } catch (error) {
      console.error('Error creating complaint:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อร้องเรียน');
      throw error;
    }
  }
}

export const complaintService = new ComplaintService();