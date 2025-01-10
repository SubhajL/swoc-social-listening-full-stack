import { Card } from "@/components/ui/card";

export const ComplaintHeader = () => {
  return (
    <header className="bg-white p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <img 
          src="/lovable-uploads/ee1a850d-ddf7-485e-b731-92093d1f9b40.png" 
          alt="Logo" 
          className="h-12"
        />
        <h1 className="text-2xl font-semibold">ระบบตอบประเด็นข้อร้องเรียน</h1>
        <div className="ml-auto bg-green-500 text-white px-3 py-1 rounded-lg">A</div>
      </div>
    </header>
  );
};