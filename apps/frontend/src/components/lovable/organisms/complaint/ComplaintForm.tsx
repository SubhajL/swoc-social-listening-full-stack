import { useLocation } from "react-router-dom";
import { FormField } from "../../molecules/form/FormField";
import { FormInput } from "../../atoms/form/FormInput";
import { DynamicMap } from "../../molecules/map/DynamicMap";
import { Card } from "@/components/ui/card";
import { ComplaintHeader } from "@/components/complaint/ComplaintHeader";
import { WaterLevelInfo } from "@/components/complaint/WaterLevelInfo";
import { WaterFlowPanel } from "@/components/complaint/WaterFlowPanel";
import { ComplaintNavigation } from "@/components/complaint/ComplaintNavigation";
import { useComplaint } from "@/hooks/useComplaint";
import { ComplaintDTO, CreateComplaintDTO } from "@/dto/complaint.dto";
import { toast } from "sonner";

const MAPBOX_TOKEN = "pk.eyJ1Ijoic3ViaGFqIiwiYSI6ImNtNHdtdHYzMzBmY3AyanBwdW5nMmNpenAifQ.M6zea2D_TLnke3L7iwBUFg";

// Define interface based on ComplaintDTO schema for proper type checking
interface ComplaintFormData {
  id: number;
  issue: string;
  category: string;
  reporter: string;
  date: string;
  link?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  location?: string;
  tumbon?: string[];
  amphure?: string[];
  province?: string[];
}

const ComplaintForm = () => {
  const location = useLocation();
  const complaintData = location.state as ComplaintFormData | undefined;
  const { isLoading } = useComplaint(complaintData?.id);

  // Extract location data from complaint data
  const getLocationParts = () => {
    if (!complaintData?.location) return { amphure: '', province: '' };
    
    const locationParts = complaintData.location.split(' ');
    // Assuming format is typically "Amphure Province"
    if (locationParts.length >= 2) {
      return {
        amphure: locationParts[0],
        province: locationParts[locationParts.length - 1]
      };
    }
    // If only one part, assume it's the province
    return { amphure: '', province: locationParts[0] };
  };

  const { amphure, province } = getLocationParts();

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
          <div className="space-y-4">
            <FormField label="ประเด็นข้อร้องเรียน">
              <FormInput 
                value={complaintData?.issue ?? ''} 
                placeholder="ยังไม่มีข้อมูล"
                readOnly 
              />
            </FormField>
            
            <FormField label="ประเภทข้อร้องเรียน">
              <FormInput 
                value={complaintData?.category ?? ''} 
                placeholder="ยังไม่มีข้อมูล"
                readOnly 
              />
            </FormField>

            <FormField label="ข้อมูลผู้ร้องเรียน">
              <FormInput 
                className="h-24"
                value={complaintData?.reporter ?? ''} 
                placeholder="ยังไม่มีข้อมูล"
                readOnly 
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="วันที่">
                <FormInput 
                  type="date"
                  value={complaintData?.date ?? ''} 
                  placeholder="ยังไม่มีข้อมูล"
                  readOnly 
                />
              </FormField>
              
              <FormField label="Link">
                <FormInput 
                  value={complaintData?.link ?? ''} 
                  placeholder="ยังไม่มีข้อมูล"
                  readOnly 
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="พิกัด">
                <FormInput 
                  value={complaintData?.coordinates?.lat ?? ''} 
                  placeholder="ยังไม่มีข้อมูล"
                  readOnly 
                />
              </FormField>
              
              <FormField label="ตำแหน่ง">
                <FormInput 
                  value={complaintData?.coordinates?.lng ?? ''} 
                  placeholder="ยังไม่มีข้อมูล"
                  readOnly 
                />
              </FormField>
            </div>

            <FormField label="ที่อยู่">
              <FormInput 
                value={complaintData?.location ?? ''} 
                placeholder="ยังไม่มีข้อมูล"
                readOnly 
              />
            </FormField>
          </div>
        </Card>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WaterLevelInfo amphure={amphure} province={province} />
          <WaterFlowPanel />
        </div>

        <Card className="p-6">
          <DynamicMap 
            token={MAPBOX_TOKEN}
            selectedCategories={complaintData?.category ? [(complaintData.category as any)] : []}
            selectedProvince={complaintData?.location?.split(' ').pop() ?? null}
          />
        </Card>
      </main>

      <ComplaintNavigation />
    </div>
  );
};

export default ComplaintForm;
