import { useState, useEffect } from "react";
import { CategoryName } from "@/types/processed-post";
import { IrrigationOfficeFilter } from "./IrrigationOfficeFilter";
import { Button } from "@/components/ui/button";
import { Search, ChevronDown, Calendar, Check } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { provinceMapping } from "@/utils/provinces";

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

interface CheckboxSelectItemProps {
  value: string;
  label: string;
  isSelected: boolean;
  isSelectAll?: boolean;
  onShiftClick: (value: string, shiftKey: boolean) => void;
}

function CheckboxSelectItem({ 
  value, 
  label, 
  isSelected, 
  isSelectAll, 
  onShiftClick
}: CheckboxSelectItemProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent Radix default handling
    e.stopPropagation(); // Stop event bubbling
    
    // Only handle selection if shift is pressed or it's a regular click
    onShiftClick(value, e.shiftKey);
  };

  return (
    <SelectItem
      value={value}
      className="group px-4 py-2 hover:bg-[#EFF6FF] focus:bg-[#EFF6FF] rounded-none cursor-pointer data-[state=checked]:bg-[#EFF6FF] [&>*:first-child]:hidden"
      onClick={handleClick}
      onSelect={(e) => {
        e.preventDefault();
      }}
    >
      <div className="inline-flex items-baseline gap-2 leading-none">
        <div className={cn(
          "flex-shrink-0 inline-flex items-center justify-center h-5 w-5 rounded-[4px] border border-[#CBD5E1] transition-colors translate-y-[1px]",
          isSelected && "bg-[#42A5F5] border-[#42A5F5]"
        )}>
          {isSelected && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
        </div>
        <span className="text-[#0F172A] group-hover:text-[#0F172A] leading-5">{label}</span>
      </div>
    </SelectItem>
  );
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
  const messageTypes = [
    { value: "report", label: "การรายงานและแจ้งเหตุ" },
    { value: "support", label: "การขอการสนับสนุน" },
    { value: "info", label: "การขอข้อมูล" },
    { value: "suggestion", label: "ข้อเสนอแนะ" }
  ];

  const messageSubTypes = {
    report: [
      { value: "flood", label: "สถานการณ์น้ำท่วม" },
      { value: "drought", label: "สถานการณ์น้ำแล้ง" },
      { value: "damage", label: "อาคารชลประทานชำรุด" },
      { value: "other", label: "การแจ้งเหตุอื่นๆ" }
    ],
    support: [
      { value: "water_flow", label: "เพิ่ม/ลด การปล่อยน้ำ" },
      { value: "equipment", label: "การขอความสนับสนุนเครื่องมือเครื่องจักร" },
      { value: "gate", label: "เปิด/ปิด ประตูน้ำ" },
      { value: "rainy_measure", label: "มาตรการรองรับฤดูฝน" },
      { value: "drought_measure", label: "มาตรการรองรับฤดูแล้ง" },
      { value: "flood_risk", label: "แนวทาง/มาตรการรับมือพื้นที่เสี่ยงน้ำท่วม" },
      { value: "flood_repeat", label: "แนวทาง/มาตรการรับมือพื้นที่น้ำท่วมซ้ำซาก" },
      { value: "drought_risk", label: "แนวทาง/มาตรการรับมือพื้นที่เสี่ยงภัยแล้ง" },
      { value: "drought_repeat", label: "แนวทาง/มาตรการรับมือพื้นที่เสี่ยงภัยแล้งซ้ำซาก" },
      { value: "building_prep", label: "การเตรียมความพร้อมอาคารชลประทาน" },
      { value: "outside_support", label: "การขอความสนับสนุนนอกพื้นที่ชลประทาน" },
      { value: "area_usage", label: "การขอใช้พื้นที่" },
      { value: "construction", label: "การก่อสร้างแหล่งน้ำ/สถานีสูบน้ำชุมชน" },
      { value: "weed", label: "การแก้ไขปัญหาวัชพืช" },
      { value: "data_loss", label: "ข้อมูลในระบบสารสนเทศกรมชลประทานสูญหาย" },
      { value: "other", label: "การขอการสนับสนุนอื่นๆ" }
    ],
    info: [
      { value: "flood_risk_area", label: "พื้นที่เสี่ยงน้ำท่วม" },
      { value: "drought_risk_area", label: "พื้นที่เสี่ยงภัยแล้ง" },
      { value: "flood_repeat_area", label: "พื้นที่น้ำท่วมซ้ำซาก" },
      { value: "drought_repeat_area", label: "พื้นที่แล้งซ้ำซาก" },
      { value: "rain_condition", label: "สภาพฝน" },
      { value: "drought_condition", label: "สภาพแล้ง" },
      { value: "rain_data", label: "แหล่งข้อมูลฝน" },
      { value: "water_priority", label: "การจัดลำดับความสำคัญการใช้น้ำ" },
      { value: "water_source", label: "แหล่งน้ำกรมชลประทานรับผิดชอบ" },
      { value: "management", label: "หลักการบริหารจัดการพื้นที่ชลประทานและคลองระบายน้ำ" },
      { value: "electricity", label: "การจ่ายค่าไฟฟ้าสำหรับอาคารชลประทาน" },
      { value: "contact", label: "ข้อมูลการติดต่อ" },
      { value: "alert", label: "ช่องทางการแจ้งเตือนสถานการณ์ในพื้นที่" },
      { value: "system_usage", label: "การใช้งานระบบ/อุปกรณ์" },
      { value: "project", label: "แผนงานโครงการเพื่อการแก้ไขปัญหา" },
      { value: "other", label: "การขอข้อมูลอื่นๆ" }
    ],
    suggestion: []
  };

  const communicationChannels = [
    { value: "facebook", label: "Facebook" },
    { value: "line", label: "Line" },
    { value: "twitter", label: "Twitter" }
  ];

  const provinces = [
    { value: "all", label: "เลือกทั้งหมด" },
    ...Object.entries(provinceMapping)
      .map(([thai, english]) => ({
        value: english.toLowerCase().replace(/\s+/g, ''),
        label: thai
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ];

  const irrigationOffices = [
    { value: "all", label: "เลือกทั้งหมด" },
    { value: "1", label: "สำนักงานชลประทานที่ 1" },
    { value: "2", label: "สำนักงานชลประทานที่ 2" },
    { value: "3", label: "สำนักงานชลประทานที่ 3" },
    { value: "4", label: "สำนักงานชลประทานที่ 4" },
    { value: "5", label: "สำนักงานชลประทานที่ 5" },
    { value: "6", label: "สำนักงานชลประทานที่ 6" },
    { value: "7", label: "สำนักงานชลประทานที่ 7" },
    { value: "8", label: "สำนักงานชลประทานที่ 8" },
    { value: "9", label: "สำนักงานชลประทานที่ 9" },
    { value: "10", label: "สำนักงานชลประทานที่ 10" },
    { value: "11", label: "สำนักงานชลประทานที่ 11" },
    { value: "12", label: "สำนักงานชลประทานที่ 12" },
    { value: "13", label: "สำนักงานชลประทานที่ 13" },
    { value: "14", label: "สำนักงานชลประทานที่ 14" },
    { value: "15", label: "สำนักงานชลประทานที่ 15" },
    { value: "16", label: "สำนักงานชลประทานที่ 16" },
    { value: "17", label: "สำนักงานชลประทานที่ 17" }
  ];

  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeType>('today');

  // Initialize states with all items selected by default (except 'all')
  const [selectedSubTypes, setSelectedSubTypes] = useState<string[]>([]);
  const [lastSelectedSubType, setLastSelectedSubType] = useState<string>('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    communicationChannels.map(c => c.value)
  );
  const [selectedProvinces, setSelectedProvinces] = useState<string[]>(
    provinces.filter(p => p.value !== 'all').map(p => p.value)
  );
  const [selectedIrrigationOffices, setSelectedIrrigationOffices] = useState<string[]>(
    irrigationOffices.filter(o => o.value !== 'all').map(o => o.value)
  );
  const [selectedProvincialOffices, setSelectedProvincialOffices] = useState<string[]>(
    provinces.filter(p => p.value !== 'all').map(p => p.value)
  );

  // Add state for last selected items
  const [lastSelectedProvince, setLastSelectedProvince] = useState<string>('');
  const [lastSelectedIrrigationOffice, setLastSelectedIrrigationOffice] = useState<string>('');
  const [lastSelectedChannel, setLastSelectedChannel] = useState<string>('');
  const [lastSelectedProvincialOffice, setLastSelectedProvincialOffice] = useState<string>('');

  // Add state for controlling dropdowns
  const [openChannels, setOpenChannels] = useState(false);
  const [openProvinces, setOpenProvinces] = useState(false);
  const [openIrrigationOffices, setOpenIrrigationOffices] = useState(false);
  const [openProvincialOffices, setOpenProvincialOffices] = useState(false);
  const [openSubTypes, setOpenSubTypes] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Add state for shift key tracking
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // Add state for selected message type
  const [selectedMessageType, setSelectedMessageType] = useState<string>("report");

  // Get current subtypes based on selected message type
  const currentSubTypes = messageSubTypes[selectedMessageType as keyof typeof messageSubTypes];

  // Effect to handle default selections for subtypes
  useEffect(() => {
    if (selectedMessageType === 'suggestion') {
      setSelectedSubTypes([]);
      setLastSelectedSubType('');
    } else {
      // Select all subtypes by default
      setSelectedSubTypes(currentSubTypes.map(subType => subType.value));
      setLastSelectedSubType('');
    }
  }, [selectedMessageType]);

  // Add keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
        // Keep only the active dropdown open when shift is pressed
        if (activeDropdown === 'channels') setOpenChannels(true);
        if (activeDropdown === 'provinces') setOpenProvinces(true);
        if (activeDropdown === 'irrigation') setOpenIrrigationOffices(true);
        if (activeDropdown === 'provincial') setOpenProvincialOffices(true);
        if (activeDropdown === 'subtypes') setOpenSubTypes(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
        // Close only the active dropdown when shift is released
        if (activeDropdown === 'channels') setOpenChannels(false);
        if (activeDropdown === 'provinces') setOpenProvinces(false);
        if (activeDropdown === 'irrigation') setOpenIrrigationOffices(false);
        if (activeDropdown === 'provincial') setOpenProvincialOffices(false);
        if (activeDropdown === 'subtypes') setOpenSubTypes(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activeDropdown]);

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

  const selectContentClass = "bg-white p-0 shadow-lg border border-[#CBD5E1]";
  const selectItemClass = "px-4 py-3 text-[#0F172A] hover:bg-[#EFF6FF] hover:text-[#0F172A] hover:border hover:border-[#42A5F5] hover:rounded-md focus:bg-[#EFF6FF] focus:text-[#0F172A] focus:border focus:border-[#42A5F5] focus:rounded-md data-[highlighted]:bg-[#EFF6FF] data-[highlighted]:text-[#0F172A] data-[highlighted]:border data-[highlighted]:border-[#42A5F5] data-[highlighted]:rounded-md rounded-none border border-transparent cursor-pointer";

  const messageTypeItemClass = cn(selectItemClass, "data-[state=checked]:bg-[#EFF6FF] [&>*:first-child]:hidden");

  const handleSelectionChange = (
    value: string,
    selectedValues: string[],
    setSelectedValues: (values: string[]) => void,
    options: { value: string; label: string }[],
    shiftKey: boolean = false,
    lastSelected: string = '',
    setLastSelected: (value: string) => void
  ) => {
    console.log('handleSelectionChange:', {
      value,
      selectedValues,
      shiftKey,
      lastSelected,
      options: options.map(o => o.value)
    });

    // For Message Type dropdown, maintain single select behavior
    if (options === messageTypes) {
      setSelectedValues([value]);
      return;
    }

    const individualOptions = options.filter(opt => opt.value !== 'all');

    // Handle "Select All" toggle
    if (value === 'all') {
      const allSelected = isAllSelected(selectedValues, options);
      console.log('Handling Select All:', { allSelected });
      setSelectedValues(allSelected ? [] : individualOptions.map(opt => opt.value));
      setLastSelected('');
      return;
    }

    // Get the current selection state of the clicked item
    const isItemSelected = selectedValues.includes(value);
    let newSelectedValues: string[];

    // Handle shift-click for multiple selection
    if (shiftKey && lastSelected && value !== lastSelected) {
      console.log('Handling shift-click:', { lastSelected, value });
      const optionValues = individualOptions.map(opt => opt.value);
      const startIdx = optionValues.indexOf(lastSelected);
      const endIdx = optionValues.indexOf(value);
      
      if (startIdx !== -1 && endIdx !== -1) {
        const start = Math.min(startIdx, endIdx);
        const end = Math.max(startIdx, endIdx);
        const rangeValues = optionValues.slice(start, end + 1);
        
        console.log('Range values:', rangeValues);
        
        // Get values outside the range
        const outsideRangeValues = selectedValues.filter(v => !rangeValues.includes(v));
        
        // Apply the same action (select/deselect) to all items in range
        // Use the state of the clicked item to determine the action
        if (isItemSelected) {
          // If clicked item was selected, deselect the range
          newSelectedValues = outsideRangeValues;
        } else {
          // If clicked item was not selected, select the range
          newSelectedValues = [...outsideRangeValues, ...rangeValues];
        }
      } else {
        // Fallback to single item toggle if range is invalid
        newSelectedValues = isItemSelected
          ? selectedValues.filter(v => v !== value)
          : [...selectedValues, value];
      }
    } else {
      // Handle individual item selection
      newSelectedValues = isItemSelected
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value];
    }

    console.log('Selection update:', { 
      value,
      isItemSelected,
      newSelectedValues
    });

    setSelectedValues(newSelectedValues);
    setLastSelected(value); // Always update last selected for next shift-click
  };

  const isAllSelected = (
    selectedValues: string[],
    options: { value: string; label: string }[]
  ) => {
    const individualOptions = options.filter(opt => opt.value !== 'all');
    return individualOptions.every(opt => selectedValues.includes(opt.value));
  };

  const getDisplayValue = (
    selectedValues: string[],
    options: { value: string; label: string }[]
  ): string => {
    if (selectedValues.length === 0) return '';
    if (isAllSelected(selectedValues, options)) return 'เลือกทั้งหมด';
    return selectedValues
      .map(v => options.find(opt => opt.value === v)?.label)
      .filter(Boolean)
      .join(', ');
  };

  // Modify the dropdown close handlers
  const handleOpenChange = (
    isOpen: boolean,
    currentOpen: boolean,
    setOpen: (open: boolean) => void,
    dropdownName: string
  ) => {
    if (isOpen) {
      setActiveDropdown(dropdownName);
    }
    
    if (isShiftPressed && activeDropdown === dropdownName) {
      // Keep dropdown open while shift is pressed
      setOpen(true);
      return;
    }
    setOpen(isOpen);
  };

  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-[20px] font-medium text-[#17254D]">กรองข้อมูล</h2>
        <ChevronDown className="w-4 h-4 text-[#334155] rotate-180" />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Message Type - Single Select */}
        <div className="relative">
          <div className="absolute -top-3.5 left-2 px-2 bg-white">
            <label className="text-sm text-[#64748B]">ประเภทข้อความ</label>
          </div>
          <Select 
            defaultValue="report"
            onValueChange={(value) => {
              setSelectedMessageType(value);
            }}
          >
            <SelectTrigger className="w-full h-[48px] px-3 bg-white border border-[#CBD5E1] rounded-md">
              <SelectValue className="text-[#0F172A] placeholder:text-[#64748B]" />
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              {messageTypes.map((type) => (
                <SelectItem 
                  key={type.value} 
                  value={type.value}
                  className={messageTypeItemClass}
                >
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Message Subtype */}
        <div className="relative">
          <div className="absolute -top-3.5 left-2 px-2 bg-white">
            <label className="text-sm text-[#64748B]">ประเภทข้อความย่อย</label>
          </div>
          <Select
            value={selectedSubTypes.length === 0 ? "" : "selected"}
            onValueChange={(value) => {
              if (!isShiftPressed) {
                handleSelectionChange(
                  value,
                  selectedSubTypes,
                  setSelectedSubTypes,
                  [{ value: "all", label: "เลือกทั้งหมด" }, ...currentSubTypes],
                  false,
                  lastSelectedSubType,
                  setLastSelectedSubType
                );
              }
            }}
            open={openSubTypes}
            onOpenChange={(isOpen) => handleOpenChange(isOpen, openSubTypes, setOpenSubTypes, 'subtypes')}
            disabled={selectedMessageType === 'suggestion'}
          >
            <SelectTrigger className="w-full h-[48px] px-3 bg-white border border-[#CBD5E1] rounded-md">
              <SelectValue>
                {getDisplayValue(selectedSubTypes, [{ value: "all", label: "เลือกทั้งหมด" }, ...currentSubTypes])}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              <CheckboxSelectItem
                value="all"
                label="เลือกทั้งหมด"
                isSelected={isAllSelected(selectedSubTypes, [{ value: "all", label: "เลือกทั้งหมด" }, ...currentSubTypes])}
                isSelectAll
                onShiftClick={(value, shiftKey) => handleSelectionChange(
                  value,
                  selectedSubTypes,
                  setSelectedSubTypes,
                  [{ value: "all", label: "เลือกทั้งหมด" }, ...currentSubTypes],
                  shiftKey,
                  lastSelectedSubType,
                  setLastSelectedSubType
                )}
              />
              {currentSubTypes.map((subType) => (
                <CheckboxSelectItem
                  key={subType.value}
                  value={subType.value}
                  label={subType.label}
                  isSelected={selectedSubTypes.includes(subType.value)}
                  onShiftClick={(value, shiftKey) => handleSelectionChange(
                    value,
                    selectedSubTypes,
                    setSelectedSubTypes,
                    [{ value: "all", label: "เลือกทั้งหมด" }, ...currentSubTypes],
                    shiftKey,
                    lastSelectedSubType,
                    setLastSelectedSubType
                  )}
                />
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Communication Channel - Multi Select */}
        <div className="relative">
          <div className="absolute -top-3.5 left-2 px-2 bg-white">
            <label className="text-sm text-[#64748B]">ช่องทางการสื่อสาร</label>
          </div>
          <Select
            value={selectedChannels.length === 0 ? "" : "selected"}
            onValueChange={(value) => {
              if (!isShiftPressed) {
                handleSelectionChange(
                  value,
                  selectedChannels,
                  setSelectedChannels,
                  communicationChannels,
                  false,
                  lastSelectedChannel,
                  setLastSelectedChannel
                );
              }
            }}
            open={openChannels}
            onOpenChange={(isOpen) => handleOpenChange(isOpen, openChannels, setOpenChannels, 'channels')}
          >
            <SelectTrigger className="w-full h-[48px] px-3 bg-white border border-[#CBD5E1] rounded-md">
              <SelectValue>
                {getDisplayValue(selectedChannels, communicationChannels)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              <CheckboxSelectItem
                value="all"
                label="เลือกทั้งหมด"
                isSelected={isAllSelected(selectedChannels, communicationChannels)}
                isSelectAll
                onShiftClick={(value, shiftKey) => handleSelectionChange(
                  value,
                  selectedChannels,
                  setSelectedChannels,
                  communicationChannels,
                  shiftKey,
                  lastSelectedChannel,
                  setLastSelectedChannel
                )}
              />
              {communicationChannels.map((channel) => (
                <CheckboxSelectItem
                  key={channel.value}
                  value={channel.value}
                  label={channel.label}
                  isSelected={selectedChannels.includes(channel.value)}
                  onShiftClick={(value, shiftKey) => handleSelectionChange(
                    value,
                    selectedChannels,
                    setSelectedChannels,
                    communicationChannels,
                    shiftKey,
                    lastSelectedChannel,
                    setLastSelectedChannel
                  )}
                />
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Province - Multi Select */}
        <div className="relative">
          <div className="absolute -top-3.5 left-2 px-2 bg-white">
            <label className="text-sm text-[#64748B]">จังหวัด</label>
          </div>
          <Select
            value={selectedProvinces.length === 0 ? "" : "selected"}
            onValueChange={(value) => {
              if (!isShiftPressed) {
                handleSelectionChange(
                  value,
                  selectedProvinces,
                  setSelectedProvinces,
                  provinces,
                  false,
                  lastSelectedProvince,
                  setLastSelectedProvince
                );
              }
            }}
            open={openProvinces}
            onOpenChange={(isOpen) => handleOpenChange(isOpen, openProvinces, setOpenProvinces, 'provinces')}
          >
            <SelectTrigger className="w-full h-[48px] px-3 bg-white border border-[#CBD5E1] rounded-md">
              <SelectValue>
                {getDisplayValue(selectedProvinces, provinces)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              <CheckboxSelectItem
                value="all"
                label="เลือกทั้งหมด"
                isSelected={isAllSelected(selectedProvinces, provinces)}
                isSelectAll
                onShiftClick={(value, shiftKey) => handleSelectionChange(
                  value,
                  selectedProvinces,
                  setSelectedProvinces,
                  provinces,
                  shiftKey,
                  lastSelectedProvince,
                  setLastSelectedProvince
                )}
              />
              {provinces.filter(province => province.value !== 'all').map((province) => (
                <CheckboxSelectItem
                  key={province.value}
                  value={province.value}
                  label={province.label}
                  isSelected={selectedProvinces.includes(province.value)}
                  onShiftClick={(value, shiftKey) => handleSelectionChange(
                    value,
                    selectedProvinces,
                    setSelectedProvinces,
                    provinces,
                    shiftKey,
                    lastSelectedProvince,
                    setLastSelectedProvince
                  )}
                />
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Irrigation Office - Multi Select */}
        <div className="relative">
          <div className="absolute -top-3.5 left-2 px-2 bg-white">
            <label className="text-sm text-[#64748B]">สำนักงานชลประทาน</label>
          </div>
          <Select
            value={selectedIrrigationOffices.length === 0 ? "" : "selected"}
            onValueChange={(value) => {
              if (!isShiftPressed) {
                handleSelectionChange(
                  value,
                  selectedIrrigationOffices,
                  setSelectedIrrigationOffices,
                  irrigationOffices,
                  false,
                  lastSelectedIrrigationOffice,
                  setLastSelectedIrrigationOffice
                );
              }
            }}
            open={openIrrigationOffices}
            onOpenChange={(isOpen) => handleOpenChange(isOpen, openIrrigationOffices, setOpenIrrigationOffices, 'irrigation')}
          >
            <SelectTrigger className="w-full h-[48px] px-3 bg-white border border-[#CBD5E1] rounded-md">
              <SelectValue>
                {getDisplayValue(selectedIrrigationOffices, irrigationOffices)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              <CheckboxSelectItem
                value="all"
                label="เลือกทั้งหมด"
                isSelected={isAllSelected(selectedIrrigationOffices, irrigationOffices)}
                isSelectAll
                onShiftClick={(value, shiftKey) => handleSelectionChange(
                  value,
                  selectedIrrigationOffices,
                  setSelectedIrrigationOffices,
                  irrigationOffices,
                  shiftKey,
                  lastSelectedIrrigationOffice,
                  setLastSelectedIrrigationOffice
                )}
              />
              {irrigationOffices.filter(office => office.value !== 'all').map((office) => (
                <CheckboxSelectItem
                  key={office.value}
                  value={office.value}
                  label={office.label}
                  isSelected={selectedIrrigationOffices.includes(office.value)}
                  onShiftClick={(value, shiftKey) => handleSelectionChange(
                    value,
                    selectedIrrigationOffices,
                    setSelectedIrrigationOffices,
                    irrigationOffices,
                    shiftKey,
                    lastSelectedIrrigationOffice,
                    setLastSelectedIrrigationOffice
                  )}
                />
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Provincial Office - Multi Select */}
        <div className="relative">
          <div className="absolute -top-3.5 left-2 px-2 bg-white">
            <label className="text-sm text-[#64748B]">สำนักงานชลประทานจังหวัด</label>
          </div>
          <Select
            value={selectedProvincialOffices.length === 0 ? "" : "selected"}
            onValueChange={(value) => {
              if (!isShiftPressed) {
                handleSelectionChange(
                  value,
                  selectedProvincialOffices,
                  setSelectedProvincialOffices,
                  provinces,
                  false,
                  lastSelectedProvincialOffice,
                  setLastSelectedProvincialOffice
                );
              }
            }}
            open={openProvincialOffices}
            onOpenChange={(isOpen) => handleOpenChange(isOpen, openProvincialOffices, setOpenProvincialOffices, 'provincial')}
          >
            <SelectTrigger className="w-full h-[48px] px-3 bg-white border border-[#CBD5E1] rounded-md">
              <SelectValue>
                {getDisplayValue(selectedProvincialOffices, provinces)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className={selectContentClass}>
              <CheckboxSelectItem
                value="all"
                label="เลือกทั้งหมด"
                isSelected={isAllSelected(selectedProvincialOffices, provinces)}
                isSelectAll
                onShiftClick={(value, shiftKey) => handleSelectionChange(
                  value,
                  selectedProvincialOffices,
                  setSelectedProvincialOffices,
                  provinces,
                  shiftKey,
                  lastSelectedProvincialOffice,
                  setLastSelectedProvincialOffice
                )}
              />
              {provinces.filter(province => province.value !== 'all').map((province) => (
                <CheckboxSelectItem
                  key={province.value}
                  value={province.value}
                  label={province.label}
                  isSelected={selectedProvincialOffices.includes(province.value)}
                  onShiftClick={(value, shiftKey) => handleSelectionChange(
                    value,
                    selectedProvincialOffices,
                    setSelectedProvincialOffices,
                    provinces,
                    shiftKey,
                    lastSelectedProvincialOffice,
                    setLastSelectedProvincialOffice
                  )}
                />
              ))}
            </SelectContent>
          </Select>
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
                <label htmlFor="today" className="ml-2 text-[#4B5563]">วันนี้</label>
              </div>
            </div>

            {/* Second line */}
            <div className="flex items-start space-x-6">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="lastWeek"
                  name="timeRange"
                  checked={selectedTimeRange === 'lastWeek'}
                  onChange={() => setSelectedTimeRange('lastWeek')}
                  className="w-4 h-4 text-blue-500"
                />
                <label htmlFor="lastWeek" className="ml-2 text-[#4B5563]">สัปดาห์ที่แล้ว</label>
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
                <label htmlFor="thisWeek" className="ml-2 text-[#4B5563]">สัปดาห์นี้</label>
              </div>
            </div>

            {/* Third line */}
            <div className="flex items-start space-x-6">
              <div className="flex items-center">
                <input
                  type="radio"
                  id="lastMonth"
                  name="timeRange"
                  checked={selectedTimeRange === 'lastMonth'}
                  onChange={() => setSelectedTimeRange('lastMonth')}
                  className="w-4 h-4 text-blue-500"
                />
                <label htmlFor="lastMonth" className="ml-2 text-[#4B5563]">เดือนที่แล้ว</label>
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
                <label htmlFor="thisMonth" className="ml-2 text-[#4B5563]">เดือนนี้</label>
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
                className="w-full h-10 pl-3 bg-white border border-[#CBD5E1] rounded-md text-[#0F172A]"
              />
            </div>
            <span className="text-[#64748B]">ถึง</span>
            <div className="relative flex-1">
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="w-full h-10 pl-3 bg-white border border-[#CBD5E1] rounded-md text-[#0F172A]"
              />
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
          <span className="text-[16px]">ค้นหา</span>
        </Button>
      </div>
    </div>
  );
} 
