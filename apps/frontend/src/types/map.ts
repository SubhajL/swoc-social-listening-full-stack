import { CategoryName } from './processed-post';

export interface MapProps {
  token: string;
  selectedCategories: CategoryName[];
  selectedProvince: string | null;
  selectedAmphure?: string | null;
  selectedTumbon?: string | null;
  selectedOffice?: string | null;
  dateRange?: { start: string; end: string };
  allFilters?: {
    messageType: string;
    messageSubTypes: string[];
    communicationChannels: string[];
    provinces: string[];
    irrigationOffices: string[];
    provincialOffices: string[];
    dateRange: { start: string; end: string };
  };
  hasServerError?: boolean;
}

export interface CustomImage {
  width: number;
  height: number;
  data: Uint8Array;
  context: CanvasRenderingContext2D | null;
  onAdd: () => void;
  render: () => ImageData | undefined;
}