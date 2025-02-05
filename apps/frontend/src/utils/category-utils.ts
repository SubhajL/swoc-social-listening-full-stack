import { CategoryName } from '@/types/processed-post';

export const categoryColors: Record<CategoryName, string> = {
  [CategoryName.REPORT_INCIDENT]: '#EF4444', // red
  [CategoryName.REQUEST_SUPPORT]: '#3B82F6', // blue
  [CategoryName.REQUEST_INFO]: '#10B981', // green
  [CategoryName.SUGGESTION]: '#F59E0B', // yellow
  [CategoryName.UNKNOWN]: '#6B7280' // gray
};

export const categoryShapeMap: Record<CategoryName, string> = {
  [CategoryName.REPORT_INCIDENT]: 'triangle',
  [CategoryName.REQUEST_SUPPORT]: 'square',
  [CategoryName.REQUEST_INFO]: 'circle',
  [CategoryName.SUGGESTION]: 'hexa',
  [CategoryName.UNKNOWN]: 'diamond'
};

export const categoryLabels: Record<CategoryName, string> = {
  [CategoryName.REPORT_INCIDENT]: 'Report Incident',
  [CategoryName.REQUEST_SUPPORT]: 'Request Support',
  [CategoryName.REQUEST_INFO]: 'Request Information',
  [CategoryName.SUGGESTION]: 'Suggestion',
  [CategoryName.UNKNOWN]: 'Unknown'
};

export const getCategoryColor = (category: CategoryName): string => {
  return categoryColors[category] || categoryColors[CategoryName.UNKNOWN];
};

export const getCategoryShape = (category: CategoryName): string => {
  return categoryShapeMap[category] || categoryShapeMap[CategoryName.UNKNOWN];
};

export const getCategoryLabel = (category: CategoryName): string => {
  return categoryLabels[category] || categoryLabels[CategoryName.UNKNOWN];
}; 