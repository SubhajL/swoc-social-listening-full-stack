import { PlusSquare, Trash2 } from "lucide-react";

interface StationCardButtonsProps {
  onAdd?: () => void;
  onDelete?: () => void;
}

export const StationCardButtons = ({ onAdd, onDelete }: StationCardButtonsProps) => {
  return (
    <div className="flex items-center space-x-2 mt-3">
      {/* Add Button */}
      <button 
        className="bg-[#42A5F5] hover:bg-[#1E88E5] text-white px-4 py-2 rounded-[6px] h-[40px] font-medium flex items-center justify-center transition-colors duration-200 text-base whitespace-nowrap"
        onClick={onAdd}
      >
        <PlusSquare className="w-4 h-4 mr-2" />
        <span>เพิ่มข้อมูล</span>
      </button>
      
      {/* Delete Button */}
      <button 
        className="bg-[#DC2626] hover:bg-[#B91C1C] text-white px-4 py-2 rounded-[6px] h-[40px] font-medium flex items-center justify-center transition-colors duration-200 text-base whitespace-nowrap"
        onClick={onDelete}
      >
        <Trash2 className="w-4 h-4 mr-2" />
        <span>ลบข้อมูล</span>
      </button>
    </div>
  );
}; 