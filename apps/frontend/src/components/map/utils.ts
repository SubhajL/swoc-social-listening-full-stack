import { CategoryName } from "@/types/processed-post";
import {
  categoryColors,
  categoryShapeMap,
  clusterConfig,
  getMarkerSize,
  shapeStyles
} from "./styles";

export const getCategoryColor = (category: CategoryName) => {
  return categoryColors[category] || '#6b7280'; // Gray fallback
};

// Category icons mapping for different zoom levels
export const getCategoryIcon = (category: CategoryName, zoomLevel: number) => {
  const size = getMarkerSize(zoomLevel);
  const shape = categoryShapeMap[category] || 'circle';
  
  return {
    width: size,
    height: size,
    shape,
    color: getCategoryColor(category)
  };
};

// Zoom level breakpoints for clustering
export const CLUSTER_MAX_ZOOM = 14;
export const CLUSTER_RADIUS = 50;

// Cluster colors based on point count
export const getClusterColor = (pointCount: number) => {
  if (pointCount >= 100) return clusterConfig.colors.large;
  if (pointCount >= 50) return clusterConfig.colors.medium;
  return clusterConfig.colors.small;
};

// Cluster size based on point count
export const getClusterSize = (pointCount: number) => {
  if (pointCount >= 100) return clusterConfig.sizes.large;
  if (pointCount >= 50) return clusterConfig.sizes.medium;
  return clusterConfig.sizes.small;
};

export const getShapeStyle = (shape: keyof typeof shapeStyles) => {
  return shapeStyles[shape];
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