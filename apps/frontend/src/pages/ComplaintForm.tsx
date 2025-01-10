import { Card } from "@/components/ui/card";
import { ComplaintHeader } from "@/components/complaint/ComplaintHeader";
import { ComplaintFooter } from "@/components/complaint/ComplaintFooter";
import { WaterLevelInfo } from "@/components/complaint/WaterLevelInfo";
import { ComplaintInfo } from "@/components/complaint/ComplaintInfo";
import { LocationInfo } from "@/components/complaint/LocationInfo";
import { WaterFlowPanel } from "@/components/complaint/WaterFlowPanel";
import { ComplaintNavigation } from "@/components/complaint/ComplaintNavigation";
import { useComplaint } from "@/hooks/useComplaint";
import { useLocation } from "react-router-dom";
import { Complaint } from "@/types/complaint";
import { ComplaintDTO } from "@/dto/complaint.dto";
import { toast } from "sonner";

const ComplaintForm = () => {
  const location = useLocation();
  const complaintData = location.state as Complaint | undefined;
  const { isLoading } = useComplaint(complaintData?.id);

  const validateComplaintData = () => {
    if (!complaintData) return;

    const result = ComplaintDTO.safeParse(complaintData);
    if (!result.success) {
      console.error('Complaint data validation failed:', result.error);
      toast.error('ข้อมูลข้อร้องเรียนไม่ถูกต้อง');
      return false;
    }
    return true;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (complaintData && !validateComplaintData()) {
    return <div>Invalid complaint data</div>;
  }

  return (
    <div className="min-h-screen bg-[#F0F8FF] pb-32">
      <ComplaintHeader />
      
      <main className="container mx-auto p-4 space-y-6">
        <Card className="p-6">
          <ComplaintInfo />
          <LocationInfo />
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WaterLevelInfo />
          <WaterFlowPanel />
        </div>
      </main>

      <ComplaintFooter />
      <ComplaintNavigation />
    </div>
  );
};

export default ComplaintForm;