export interface Complaint {
  id: number;
  issue: string;
  category: string;
  reporter: string;
  date: string;
  link: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  location: string;
}

export const sampleComplaints: Complaint[] = [
  {
    id: 1,
    issue: "น้ำท่วมเชียงใหม่",
    category: "ข้อร้องเรียน",
    reporter: "ชาวบ้านเชียงใหม่",
    date: "2024-09-10",
    link: "https://example.com/complaint/1",
    coordinates: {
      lat: 18.7883,
      lng: 98.9853
    },
    location: "อ. เมือง จ. เชียงใหม่"
  },
  {
    id: 2,
    issue: "คลองชลประทาน LMC ชำรุด",
    category: "ข้อร้องเรียน",
    reporter: "นาย ลพบุรี",
    date: "2024-09-27",
    link: "https://example.com/complaint/2",
    coordinates: {
      lat: 14.7995,
      lng: 100.6543
    },
    location: "อ. เมือง จ. ลพบุรี"
  },
  {
    id: 3,
    issue: "ขอใช้พื้นที่โครงการสระบุรี",
    category: "การสนับสนุน",
    reporter: "นางสาวสระบุรี",
    date: "2024-10-02",
    link: "https://example.com/complaint/3",
    coordinates: {
      lat: 14.5289,
      lng: 100.9108
    },
    location: "อ. เมือง จ. สระบุรี"
  },
  {
    id: 4,
    issue: "ขอยืมเครื่องสูบน้ำติดตั้งที่ คลองไส้ไก่ หมู่ที่ 5 ตำบล จรเข้หิน",
    category: "การสนับสนุน",
    reporter: "นาย ทรงศักดิ์ กลิ่นดี",
    date: "2024-10-12",
    link: "https://example.com/complaint/4",
    coordinates: {
      lat: 14.2069,
      lng: 101.2055
    },
    location: "อ. เมือง จ. นครนายก"
  },
  {
    id: 5,
    issue: "ขอยืมรถแบคโฮ",
    category: "การสนับสนุน",
    reporter: "นางนุชนารถ ส่วนเงิน",
    date: "2024-10-15",
    link: "https://example.com/complaint/5",
    coordinates: {
      lat: 14.5897,
      lng: 100.4552
    },
    location: "อ. เมือง จ. อ่างทอง"
  },
  {
    id: 6,
    issue: "คลองชลประทาน RMC-5R-2L ชำรุด",
    category: "การขอข้อมูล",
    reporter: "น.ส. ลักษมี",
    date: "2024-11-27",
    link: "https://example.com/complaint/6",
    coordinates: {
      lat: 13.3611,
      lng: 100.9817
    },
    location: "อ. เมือง จ. ชลบุรี"
  }
];