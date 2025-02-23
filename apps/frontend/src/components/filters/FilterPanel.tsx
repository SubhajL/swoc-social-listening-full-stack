import { useState, useEffect } from "react";
import { CategoryName } from "@/types/processed-post";
import { IrrigationOfficeFilter } from "./IrrigationOfficeFilter";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, CalendarCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type TimeRangeType = 'today' | 'lastWeek' | 'thisWeek' | 'lastMonth' | 'thisMonth' | 'custom';

interface FilterPanelProps {
  selectedCategories: CategoryName[];
  setSelectedCategories: (categories: CategoryName[]) => void;
  selectedProvince: string | null;
  setSelectedProvince: (province: string | null) => void;
  selectedOffice: string | null;
  setSelectedOffice: (office: string | null) => void;
  onDateRangeChange: (range: { start: string; end: string }) => void;
  isLoading?: boolean;
}

interface CategoryCardProps {
  title: string;
  value: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function CategoryCard({ title, value, checked, onCheckedChange }: CategoryCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center space-x-2">
        <Checkbox 
          id={value} 
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
        <label 
          htmlFor={value}
          className="text-base text-[#0F172A] cursor-pointer"
        >
          {title}
        </label>
      </div>
      <div className="mt-2 ml-6">
        <div className="flex items-center space-x-2">
          <Checkbox 
            id={`${value}-all`}
            checked={checked}
            onCheckedChange={onCheckedChange}
          />
          <label 
            htmlFor={`${value}-all`}
            className="text-sm text-[#64748B] cursor-pointer"
          >
            ทั้งหมด
          </label>
        </div>
      </div>
    </div>
  );
}

export function FilterPanel({
  selectedCategories,
  setSelectedCategories,
  selectedProvince,
  setSelectedProvince,
  selectedOffice,
  setSelectedOffice,
  onDateRangeChange,
  isLoading = false
}: FilterPanelProps) {
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeType>('today');

  // Handle time range selection
  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    switch (selectedTimeRange) {
      case 'today':
        setDateRange({ start: today, end: today });
        break;
      case 'lastWeek': {
        const lastWeekStart = new Date(now.setDate(now.getDate() - 7));
        setDateRange({ 
          start: lastWeekStart.toISOString().split('T')[0], 
          end: today 
        });
        break;
      }
      case 'thisWeek': {
        const thisWeekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        setDateRange({ 
          start: thisWeekStart.toISOString().split('T')[0], 
          end: today 
        });
        break;
      }
      case 'lastMonth': {
        const lastMonthStart = new Date(now.setMonth(now.getMonth() - 1));
        setDateRange({ 
          start: lastMonthStart.toISOString().split('T')[0], 
          end: today 
        });
        break;
      }
      case 'thisMonth': {
        const thisMonthStart = new Date(now.setDate(1));
        setDateRange({ 
          start: thisMonthStart.toISOString().split('T')[0], 
          end: today 
        });
        break;
      }
    }
  }, [selectedTimeRange]);

  // Update parent component when date range changes
  useEffect(() => {
    onDateRangeChange(dateRange);
  }, [dateRange, onDateRangeChange]);

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    setSelectedTimeRange('custom');
    setDateRange(prev => ({ ...prev, [type]: value }));
  };

  const categories = [
    { title: "การรายงานและแจ้งเหตุ", value: "report" },
    { title: "การขอการสนับสนุน", value: "support" },
    { title: "การขอข้อมูล", value: "info" },
    { title: "ข้อเสนอแนะ", value: "suggestion" }
  ];

  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-[20px] font-medium text-[#17254D]">กรองข้อมูล</h2>
        <ChevronDown className="w-4 h-4 text-[#334155] rotate-180" />
      </div>

      <div className="space-y-6">
        {/* Message Type */}
        <div className="space-y-2">
          <label className="text-sm text-[#64748B]">ประเภทข้อความ</label>
          <select className="w-full h-[37px] px-3 bg-white border border-[#CBD5E1] rounded-md text-[#0F172A]">
            <option>เลือกทั้งหมด</option>
          </select>
        </div>

        {/* Message Subtype */}
        <div className="space-y-2">
          <label className="text-sm text-[#64748B]">ประเภทข้อความย่อย</label>
          <select className="w-full h-[37px] px-3 bg-white border border-[#CBD5E1] rounded-md text-[#0F172A]">
            <option>เลือกทั้งหมด</option>
          </select>
        </div>

        {/* Communication Channel & Province */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-[#64748B]">ช่องทางการสื่อสาร</label>
            <select className="w-full h-[37px] px-3 bg-white border border-[#CBD5E1] rounded-md text-[#0F172A]">
              <option>เลือกทั้งหมด</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-[#64748B]">จังหวัด</label>
            <select className="w-full h-[37px] px-3 bg-white border border-[#CBD5E1] rounded-md text-[#0F172A]">
              <option>เลือกทั้งหมด</option>
            </select>
          </div>
        </div>

        {/* Irrigation Office & Provincial Office */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-[#64748B]">สำนักงานชลประทาน</label>
            <select className="w-full h-[37px] px-3 bg-white border border-[#CBD5E1] rounded-md text-[#0F172A]">
              <option>เลือกทั้งหมด</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-[#64748B]">สำนักงานชลประทานจังหวัด</label>
            <select className="w-full h-[37px] px-3 bg-white border border-[#CBD5E1] rounded-md text-[#0F172A]">
              <option>เลือกทั้งหมด</option>
            </select>
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-4">
          <label className="text-base text-[#1E293B]">ตั้งค่าช่วงเวลา</label>
          
          {/* Quick select radio buttons */}
          <div className="space-y-4">
            {/* First line */}
            <div className="flex items-center">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="today"
                  name="timeRange"
                  checked={selectedTimeRange === 'today'}
                  onChange={() => setSelectedTimeRange('today')}
                  className="w-4 h-4 text-blue-500"
                />
                <label htmlFor="today" className="ml-2 text-sm text-gray-600">วันนี้</label>
              </div>
            </div>

            {/* Second line */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="lastWeek"
                  name="timeRange"
                  checked={selectedTimeRange === 'lastWeek'}
                  onChange={() => setSelectedTimeRange('lastWeek')}
                  className="w-4 h-4 text-blue-500"
                />
                <label htmlFor="lastWeek" className="ml-2 text-sm text-gray-600">สัปดาห์ที่แล้ว</label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="thisWeek"
                  name="timeRange"
                  checked={selectedTimeRange === 'thisWeek'}
                  onChange={() => setSelectedTimeRange('thisWeek')}
                  className="w-4 h-4 text-blue-500"
                />
                <label htmlFor="thisWeek" className="ml-2 text-sm text-gray-600">สัปดาห์นี้</label>
              </div>
            </div>

            {/* Third line */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="lastMonth"
                  name="timeRange"
                  checked={selectedTimeRange === 'lastMonth'}
                  onChange={() => setSelectedTimeRange('lastMonth')}
                  className="w-4 h-4 text-blue-500"
                />
                <label htmlFor="lastMonth" className="ml-2 text-sm text-gray-600">เดือนที่แล้ว</label>
              </div>
              <div className="flex items-center">
                <input
                  type="radio"
                  id="thisMonth"
                  name="timeRange"
                  checked={selectedTimeRange === 'thisMonth'}
                  onChange={() => setSelectedTimeRange('thisMonth')}
                  className="w-4 h-4 text-blue-500"
                />
                <label htmlFor="thisMonth" className="ml-2 text-sm text-gray-600">เดือนนี้</label>
              </div>
            </div>
          </div>

          {/* Custom date range */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="w-full h-10 pl-3 pr-10 bg-white border border-[#CBD5E1] rounded-md text-[#0F172A]"
              />
              <CalendarCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            </div>
            <span className="text-[#64748B]">ถึง</span>
            <div className="relative flex-1">
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="w-full h-10 pl-3 pr-10 bg-white border border-[#CBD5E1] rounded-md text-[#0F172A]"
              />
              <CalendarCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
            </div>
          </div>
        </div>

        {/* Search Button */}
        <Button 
          className={cn(
            "w-[110px] h-[42px] bg-[#42A5F5] hover:bg-[#1E88E5] text-white rounded-lg",
            "flex items-center justify-center gap-2"
          )}
          disabled={isLoading}
        >
          <Search className="w-4 h-4" />
          <span>ค้นหา</span>
        </Button>
      </div>
    </div>
  );
} 
