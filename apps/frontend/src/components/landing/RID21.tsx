"use client";

import { Map } from "@/components/Map";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { CategoryName } from "@/types/processed-post";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Settings, User, Menu, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Mock provinces data - should be fetched from API in production
const MOCK_PROVINCES = [
  "กรุงเทพมหานคร",
  "เชียงใหม่",
  "นครราชสีมา",
  "ขอนแก่น",
  "อุบลราชธานี"
];

export interface RID21Props {
  className?: string;
}

export function RID21({ className = "" }: RID21Props) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedAmphure, setSelectedAmphure] = useState<string | null>(null);
  const [selectedTumbon, setSelectedTumbon] = useState<string | null>(null);
  const [selectedOffice, setSelectedOffice] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  // Convert string[] to CategoryName[] for Map component
  const selectedCategoryNames = selectedCategories.map(cat => {
    const categoryName = CategoryName[cat as keyof typeof CategoryName];
    return categoryName || CategoryName.UNKNOWN;
  });

  const handleDateRangeChange = (range: { start: string; end: string }) => {
    console.log('Date range changed:', range);
  };

  return (
    <div className={`h-screen flex flex-col ${className}`}>
      {/* Header */}
      <header className="border-b bg-white">
        {/* Upper Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="relative w-96">
              <Input 
                type="search" 
                placeholder="ค้นหา..." 
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Lower Header - Tabs */}
        <div className="px-4">
          <Tabs defaultValue="map" className="w-full">
            <TabsList>
              <TabsTrigger value="map">แผนที่</TabsTrigger>
              <TabsTrigger value="list">รายการ</TabsTrigger>
              <TabsTrigger value="stats">สถิติ</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className={`w-80 border-r bg-white transition-all duration-300 ${showFilters ? 'translate-x-0' : '-translate-x-full'}`}>
          <FilterPanel
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            selectedProvince={selectedProvince}
            setSelectedProvince={setSelectedProvince}
            selectedOffice={selectedOffice}
            setSelectedOffice={setSelectedOffice}
            provinces={MOCK_PROVINCES}
            onDateRangeChange={handleDateRangeChange}
          />
        </aside>

        {/* Map Container */}
        <main className="flex-1 relative">
          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 left-4 z-10 shadow-md"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Menu className="h-4 w-4" />
          </Button>
          
          <Map 
            token={process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''}
            selectedCategories={selectedCategoryNames}
            selectedProvince={selectedProvince}
            selectedAmphure={selectedAmphure}
            selectedTumbon={selectedTumbon}
            selectedOffice={selectedOffice}
          />

          {/* Notification Bars */}
          <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 bg-white/80 backdrop-blur-sm">
            <div className="notification-bar p-3 bg-white border rounded-lg shadow-sm">
              แจ้งเตือนน้ำท่วมในพื้นที่ อ.เมือง จ.เชียงใหม่
            </div>
            <div className="notification-bar p-3 bg-white border rounded-lg shadow-sm">
              รายงานระดับน้ำในเขื่อนภูมิพล
            </div>
            <div className="notification-bar p-3 bg-white border rounded-lg shadow-sm">
              ขอความช่วยเหลือจากน้ำท่วมในพื้นที่ อ.สันทราย
            </div>
            <div className="notification-bar p-3 bg-white border rounded-lg shadow-sm">
              ขอข้อมูลการระบายน้ำในพื้นที่ อ.เมือง
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default RID21;
