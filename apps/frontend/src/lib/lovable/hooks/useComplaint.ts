import { useQuery, useMutation } from "@tanstack/react-query";
import { complaintService } from "../utils/complaint.service";
import { CreateComplaintDTO } from "@/types/api/complaint";
import { toast } from "sonner";

export const useComplaint = (id?: number) => {
  const { data: complaint, isLoading } = useQuery({
    queryKey: ["complaint", id],
    queryFn: () => id ? complaintService.getComplaintById(id) : undefined,
    enabled: !!id,
  });

  const { mutate: createComplaint } = useMutation({
    mutationFn: (data: CreateComplaintDTO) => complaintService.createComplaint(data),
    onSuccess: () => {
      toast.success("Complaint submitted successfully");
    },
    onError: (error) => {
      console.error("Error creating complaint:", error);
      toast.error("Failed to submit complaint");
    },
  });

  return {
    complaint,
    isLoading,
    createComplaint,
  };
};