export interface MapProps {
  token: string;
  selectedCategories: string[];
  selectedProvince: string | null;
}

export interface CustomImage {
  width: number;
  height: number;
  data: Uint8Array;
  context: CanvasRenderingContext2D | null;
  onAdd: () => void;
  render: () => ImageData | undefined;
}