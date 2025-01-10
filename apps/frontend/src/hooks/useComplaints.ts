import { useQuery } from "@tanstack/react-query";
import { complaintService } from "@/services/complaint.service";

export const useComplaints = (filters?: {
  categories?: string[];
  province?: string | null;
}) => {
  return useQuery({
    queryKey: ['complaints', filters],
    queryFn: () => complaintService.getComplaints(filters),
  });
};