import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { ProcessedPost } from '@/types/processed-post';

// Re-export the ProcessedPost type
export type { ProcessedPost };

// Define ComplaintData interface
export interface ComplaintData {
  // Complaint form data
  title: string;
  description: string;
  location: string;
  coordinates: {
    lat: number | null;
    lng: number | null;
  };
  
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
  coordinates: {
    lat: null,
    lng: null
  },
  processedPosts: [],
  selectedPostIds: [],
  isSubmitting: false,
  isSubmitted: false,
  submissionError: null,
  currentStep: 0
};

// Atoms for complaint form data with localStorage persistence
export const titleAtom = atomWithStorage<string>('complaint_title', initialComplaintData.title);
export const descriptionAtom = atomWithStorage<string>('complaint_description', initialComplaintData.description);
export const locationAtom = atomWithStorage<string>('complaint_location', initialComplaintData.location);
export const coordinatesAtom = atomWithStorage<{lat: number | null, lng: number | null}>('complaint_coordinates', initialComplaintData.coordinates);
export const processedPostsAtom = atomWithStorage<ProcessedPost[]>('complaint_processed_posts', initialComplaintData.processedPosts);
export const selectedPostIdsAtom = atomWithStorage<string[]>('complaint_selected_post_ids', initialComplaintData.selectedPostIds);

// Atoms for form state (not persisted)
export const isSubmittingAtom = atom<boolean>(initialComplaintData.isSubmitting);
export const isSubmittedAtom = atom<boolean>(initialComplaintData.isSubmitted);
export const submissionErrorAtom = atom<string | null>(initialComplaintData.submissionError);
export const currentStepAtom = atom<number>(initialComplaintData.currentStep);

// Derived atoms
export const allComplaintDataAtom = atom<ComplaintData>((get) => ({
  title: get(titleAtom),
  description: get(descriptionAtom),
  location: get(locationAtom),
  coordinates: get(coordinatesAtom),
  processedPosts: get(processedPostsAtom),
  selectedPostIds: get(selectedPostIdsAtom),
  isSubmitting: get(isSubmittingAtom),
  isSubmitted: get(isSubmittedAtom),
  submissionError: get(submissionErrorAtom),
  currentStep: get(currentStepAtom)
}));

// Helper atoms for validation
export const hasSelectedPostsAtom = atom((get) => {
  const selectedPostIds = get(selectedPostIdsAtom);
  return selectedPostIds.length > 0;
});

export const isFormValidAtom = atom((get) => {
  const title = get(titleAtom);
  const description = get(descriptionAtom);
  const location = get(locationAtom);
  const coordinates = get(coordinatesAtom);
  const hasSelectedPosts = get(hasSelectedPostsAtom);
  
  return (
    title.trim() !== '' &&
    description.trim() !== '' &&
    (location.trim() !== '' || (coordinates.lat !== null && coordinates.lng !== null)) &&
    hasSelectedPosts
  );
}); 