export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1Ijoic3ViaGFqIiwiYSI6ImNtNHdtdHYzMzBmY3AyanBwdW5nMmNpenAifQ.M6zea2D_TLnke3L7iwBUFg";

export const CATEGORIES = [
  { id: "complaints", name: "ข้อร้องเรียน" },
  { id: "support", name: "การสนับสนุน" },
  { id: "info", name: "การขอข้อมูล" }
] as const;