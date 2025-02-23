import React, { useState } from "react";
import { TopNavigation } from "./TopNavigation";
import { FilterSidebar } from "./FilterSidebar";
import { MapSection } from "./MapSection";
import { NotificationBar } from "./NotificationBar";
import { FilterSection, NotificationItem, TabItem } from "@/types/social-media";

const tabs: TabItem[] = [
  { id: "tab1", label: "แดชบอร์ด", content: null },
  { id: "tab2", label: "การวิเคราะห์", content: null },
  { id: "tab3", label: "รายงาน", content: null },
];

const filters: FilterSection[] = [
  {
    id: "messageType",
    title: "ประเภทข้อความ",
    options: [
      { id: "1", label: "ทั้งหมด", value: "all" },
      { id: "2", label: "ข้อร้องเรียน", value: "complaint" },
    ],
  },
  {
    id: "subMessageType",
    title: "ประเภทข้อความย่อย",
    options: [
      { id: "1", label: "ทั้งหมด", value: "all" },
      { id: "2", label: "น้ำท่วม", value: "flood" },
    ],
  },
  {
    id: "channel",
    title: "ช่องทางการสื่อสาร",
    options: [
      { id: "1", label: "ทั้งหมด", value: "all" },
      { id: "2", label: "Facebook", value: "facebook" },
    ],
  },
  // Add other filter sections as needed
];

const notifications: NotificationItem[] = [
  {
    id: "1",
    message: "พบข้อร้องเรียนใหม่จากเฟซบุ๊ก",
    timestamp: "2 นาทีที่แล้ว",
    type: "info",
  },
  {
    id: "2",
    message: "การอัปเดตข้อมูลสำเร็จ",
    timestamp: "5 นาทีที่แล้ว",
    type: "success",
  },
  {
    id: "3",
    message: "มีการแจ้งเตือนน้ำท่วมในพื้นที่",
    timestamp: "10 นาทีที่แล้ว",
    type: "warning",
  },
  {
    id: "4",
    message: "ไม่สามารถเช���่อมต่อกับเซิร์ฟเวอร์ได้",
    timestamp: "15 นาทีที่แล้ว",
    type: "error",
  },
];

export const SocialMediaDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  const handleFilterChange = (filterId: string, value: string) => {
    console.log(`Filter ${filterId} changed to ${value}`);
  };

  return (
    <div className="min-h-screen bg-blue-50">
      <TopNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          <FilterSidebar
            filters={filters}
            onFilterChange={handleFilterChange}
          />
          <div className="flex-1 space-y-6">
            <MapSection />
            <div className="space-y-4">
              {notifications.map((notification) => (
                <NotificationBar
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialMediaDashboard;
