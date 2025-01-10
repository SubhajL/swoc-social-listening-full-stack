export const getCategoryColor = (category: string) => {
  switch (category) {
    case "ข้อร้องเรียน":
      return "#ea384c"; // red
    case "การสนับสนุน":
      return "#22c55e"; // green
    case "การขอข้อมูล":
      return "#0EA5E9"; // blue
    default:
      return "#6b7280"; // gray
  }
};

export const socialPosts = [
  // ข้อร้องเรียน (Complaints)
  { id: 1, category: "ข้อร้องเรียน", province: "เชียงใหม่", coordinates: [98.9853, 18.7883] as [number, number] },
  { id: 2, category: "ข้อร้องเรียน", province: "ลพบุรี", coordinates: [100.6543, 14.7995] as [number, number] },
  // การสนับสนุน (Support)
  { id: 3, category: "การสนับสนุน", province: "สระบุรี", coordinates: [100.9108, 14.5289] as [number, number] },
  { id: 4, category: "การสนับสนุน", province: "นครนายก", coordinates: [101.2055, 14.2069] as [number, number] },
  { id: 5, category: "การสนับสนุน", province: "อ่างทอง", coordinates: [100.4552, 14.5897] as [number, number] },
  // การขอข้อมูล (Information Request)
  { id: 6, category: "การขอข้อมูล", province: "ชลบุรี", coordinates: [100.9817, 13.3611] as [number, number] }
];