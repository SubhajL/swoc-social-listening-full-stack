import { atom } from 'jotai';

// Location atom for storing the current location
export const locationAtom = atom<{
  amphure?: string;
  province?: string;
}>({});

// Helper function to format location for display
export const getFormattedLocation = (amphure?: string, province?: string) => {
  if (amphure && province) {
    return `${amphure}, ${province}`;
  } else if (amphure) {
    return amphure;
  } else if (province) {
    return province;
  } else {
    return 'ไม่ระบุตำแหน่ง';
  }
}; 