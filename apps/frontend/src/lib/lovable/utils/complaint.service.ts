import { Complaint } from "@/types/models/complaint";
import { CreateComplaintDTO, ComplaintDTO, ComplaintStatus } from "@/types/api/complaint";
import { toast } from "sonner";

class ComplaintService {
  private complaints: Complaint[] = [];

  async getComplaints(filters?: {
    categories?: string[];
    province?: string | null;
  }): Promise<Complaint[]> {
    try {
      console.log('Fetching complaints with filters:', filters);
      
      let filteredComplaints = [...this.complaints];
      
      if (filters?.categories?.length) {
        console.log('Applying category filter:', filters.categories);
        filteredComplaints = filteredComplaints.filter(complaint => 
          filters.categories.includes(complaint.category)
        );
      }

      if (filters?.province) {
        console.log('Applying province filter:', filters.province);
        filteredComplaints = filteredComplaints.filter(complaint => 
          complaint.location.includes(filters.province)
        );
      }

      return filteredComplaints;
    } catch (error) {
      console.error('Error fetching complaints:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลข้อร้องเรียน');
      throw error;
    }
  }

  async getComplaintById(id: number): Promise<Complaint | undefined> {
    try {
      console.log('Fetching complaint by ID:', id);
      return this.complaints.find(complaint => complaint.id === id);
    } catch (error) {
      console.error('Error fetching complaint by ID:', error);
      toast.error('เกิดข้อผิดพลาดในการดึงข้อมูลข้อร้องเรียน');
      throw error;
    }
  }

  async createComplaint(data: CreateComplaintDTO): Promise<Complaint> {
    try {
      console.log('Creating new complaint:', data);
      
      const validationResult = ComplaintDTO.safeParse(data);
      
      if (!validationResult.success) {
        console.error('Validation failed:', validationResult.error);
        toast.error('ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอก');
        throw new Error('Validation failed');
      }

      const newComplaint: Complaint = {
        id: this.complaints.length + 1,
        ...validationResult.data,
        status: ComplaintStatus.PENDING
      };
      
      this.complaints.push(newComplaint);
      console.log('Complaint created successfully:', newComplaint);
      toast.success('บันทึกข้อร้องเรียนสำเร็จ');
      
      return newComplaint;
    } catch (error) {
      console.error('Error creating complaint:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อร้องเรียน');
      throw error;
    }
  }
}

export const complaintService = new ComplaintService();