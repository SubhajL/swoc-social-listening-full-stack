import { ProcessedPost, CategoryName } from '@/types/processed-post';

/**
 * IMPORTANT: This file is kept for reference purposes only.
 * The application no longer uses mock data and relies solely on API data.
 * The USE_MOCK_DATA flag is set to false to ensure no mock data is used.
 * 
 * This file should be removed in a future cleanup.
 */

// Mock data for Amphure แม่แตง in Province เชียงใหม่
export const MOCK_PROCESSED_POSTS: ProcessedPost[] = [
  {
    processed_post_id: 1001,
    text: "น้ำท่วมถนนในพื้นที่ตำบลขี้เหล็ก อำเภอแม่แตง จังหวัดเชียงใหม่ ต้องการความช่วยเหลือด่วน",
    category_name: CategoryName.REPORT_INCIDENT,
    sub1_category_name: "ทั้งหมด",
    profile_name: "ประชาชนในพื้นที่",
    post_date: new Date("2023-08-15T09:30:00"),
    post_url: "https://example.com/post/1001",
    latitude: 19.0964,
    longitude: 98.9236,
    tumbon: ["ขี้เหล็ก"],
    amphure: ["แม่แตง"],
    province: ["เชียงใหม่"],
    created_at: new Date().toISOString(),
    status: "pending",
    coordinate_source: "direct"
  },
  {
    processed_post_id: 1002,
    text: "ขอความช่วยเหลือเรื่องการจัดการน้ำในพื้นที่การเกษตร ตำบลสันป่ายาง อำเภอแม่แตง",
    category_name: CategoryName.REQUEST_SUPPORT,
    sub1_category_name: "ทั้งหมด",
    profile_name: "เกษตรกรในพื้นที่",
    post_date: new Date("2023-08-16T14:45:00"),
    post_url: "https://example.com/post/1002",
    latitude: 19.1245,
    longitude: 98.9456,
    tumbon: ["สันป่ายาง"],
    amphure: ["แม่แตง"],
    province: ["เชียงใหม่"],
    created_at: new Date().toISOString(),
    status: "pending",
    coordinate_source: "direct"
  },
  {
    processed_post_id: 1003,
    text: "ต้องการข้อมูลเกี่ยวกับแผนการจัดการน้ำในช่วงฤดูฝนที่กำลังจะมาถึง อำเภอแม่แตง",
    category_name: CategoryName.REQUEST_INFO,
    sub1_category_name: "ทั้งหมด",
    profile_name: "ผู้นำชุมชน",
    post_date: new Date("2023-08-17T11:20:00"),
    post_url: "https://example.com/post/1003",
    latitude: 19.0789,
    longitude: 98.9123,
    tumbon: ["แม่แตง"],
    amphure: ["แม่แตง"],
    province: ["เชียงใหม่"],
    created_at: new Date().toISOString(),
    status: "pending",
    coordinate_source: "direct"
  },
  {
    processed_post_id: 1004,
    text: "เสนอให้มีการขุดลอกคลองในพื้นที่ตำบลบ้านเป้า อำเภอแม่แตง เพื่อป้องกันน้ำท่วม",
    category_name: CategoryName.SUGGESTION,
    sub1_category_name: "ทั้งหมด",
    profile_name: "ประชาชนในพื้นที่",
    post_date: new Date("2023-08-18T16:10:00"),
    post_url: "https://example.com/post/1004",
    latitude: 19.1056,
    longitude: 98.9345,
    tumbon: ["บ้านเป้า"],
    amphure: ["แม่แตง"],
    province: ["เชียงใหม่"],
    created_at: new Date().toISOString(),
    status: "pending",
    coordinate_source: "direct"
  },
  {
    processed_post_id: 1005,
    text: "ฝนตกหนักในพื้นที่ตำบลอินทขิล อำเภอแม่แตง น้ำเริ่มท่วมบ้านเรือนประชาชน",
    category_name: CategoryName.REPORT_INCIDENT,
    sub1_category_name: "ทั้งหมด",
    profile_name: "อาสาสมัคร",
    post_date: new Date("2023-08-19T08:30:00"),
    post_url: "https://example.com/post/1005",
    latitude: 19.0876,
    longitude: 98.9234,
    tumbon: ["อินทขิล"],
    amphure: ["แม่แตง"],
    province: ["เชียงใหม่"],
    created_at: new Date().toISOString(),
    status: "pending",
    coordinate_source: "direct"
  }
];

// Set mock data flag to false to ensure we don't use mock data
export const USE_MOCK_DATA = false; 