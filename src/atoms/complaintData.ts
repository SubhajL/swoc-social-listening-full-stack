import { atom, Getter } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Define types locally since imports are not available
export interface ProcessedPost {
  id: string;
  content: string;
  // Add other properties as needed
}

export interface ComplaintData {
  // Complaint form data
  title: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  
  // Processed posts
  processedPosts: ProcessedPost[];
  selectedPostIds: string[];
  
  // Form state
  isSubmitting: boolean;
  isSubmitted: boolean;
  submissionError: string | null;
  
  // Navigation state
  currentStep: number;
}

// Initial state for complaint data
const initialComplaintData: ComplaintData = {
  title: '',
  description: '',
  location: '',
  latitude: null,
  longitude: null,
  processedPosts: [],
  selectedPostIds: [],
  isSubmitting: false,
  isSubmitted: false,
  submissionError: null,
  currentStep: 0
};

// Atoms for complaint form data with localStorage persistence
export const titleAtom = atomWithStorage<string>('complaint_title', '');
export const descriptionAtom = atomWithStorage<string>('complaint_description', '');
export const locationAtom = atomWithStorage<string>('complaint_location', '');
export const coordinatesAtom = atomWithStorage<{lat: number | null, lng: number | null}>(
  'complaint_coordinates', 
  {lat: null, lng: null}
);

// Atoms for processed posts
export const processedPostsAtom = atomWithStorage<ProcessedPost[]>('processed_posts', []);
export const selectedPostIdsAtom = atomWithStorage<string[]>('selected_post_ids', []);

// Atoms for form state (not persisted)
export const isSubmittingAtom = atom<boolean>(false);
export const isSubmittedAtom = atom<boolean>(false);
export const submissionErrorAtom = atom<string | null>(null);

// Atom for navigation state
export const currentStepAtom = atomWithStorage<number>('complaint_current_step', 0);

// Derived atom for all complaint data
export const allComplaintDataAtom = atom((get: Getter) => {
  return {
    title: get(titleAtom),
    description: get(descriptionAtom),
    location: get(locationAtom),
    latitude: get(coordinatesAtom).lat,
    longitude: get(coordinatesAtom).lng,
    processedPosts: get(processedPostsAtom),
    selectedPostIds: get(selectedPostIdsAtom),
    isSubmitting: get(isSubmittingAtom),
    isSubmitted: get(isSubmittedAtom),
    submissionError: get(submissionErrorAtom),
    currentStep: get(currentStepAtom)
  } as ComplaintData;
});

// Helper atoms
export const hasSelectedPostsAtom = atom((get: Getter) => {
  return get(selectedPostIdsAtom).length > 0;
});

export const isFormValidAtom = atom((get: Getter) => {
  const title = get(titleAtom);
  const description = get(descriptionAtom);
  const location = get(locationAtom);
  
  return title.trim() !== '' && 
         description.trim() !== '' && 
         location.trim() !== '';
}); 