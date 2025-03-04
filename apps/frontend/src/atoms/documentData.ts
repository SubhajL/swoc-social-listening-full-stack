import { atom, Getter } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// Define types locally since imports are not available
export interface Document {
  id: string;
  title: string;
  content: string;
  // Add other properties as needed
}

export interface DocumentData {
  // Document list
  documents: Document[];
  selectedDocumentIds: string[];
  
  // Document preparation state
  isGenerating: boolean;
  generationError: string | null;
  
  // Document content
  documentTitle: string;
  documentContent: string;
  
  // Navigation state
  currentStep: number;
}

// Initial state for document data
const initialDocumentData: DocumentData = {
  documents: [],
  selectedDocumentIds: [],
  isGenerating: false,
  generationError: null,
  documentTitle: '',
  documentContent: '',
  currentStep: 0
};

// Atoms for document list with localStorage persistence
export const documentsAtom = atomWithStorage<Document[]>('documents', []);
export const selectedDocumentIdsAtom = atomWithStorage<string[]>('selected_document_ids', []);

// Atoms for document generation state (not persisted)
export const isGeneratingAtom = atom<boolean>(false);
export const generationErrorAtom = atom<string | null>(null);

// Atoms for document content with localStorage persistence
export const documentTitleAtom = atomWithStorage<string>('document_title', '');
export const documentContentAtom = atomWithStorage<string>('document_content', '');

// Atom for navigation state
export const documentCurrentStepAtom = atomWithStorage<number>('document_current_step', 0);

// Derived atom for all document data
export const allDocumentDataAtom = atom((get: Getter) => {
  return {
    documents: get(documentsAtom),
    selectedDocumentIds: get(selectedDocumentIdsAtom),
    isGenerating: get(isGeneratingAtom),
    generationError: get(generationErrorAtom),
    documentTitle: get(documentTitleAtom),
    documentContent: get(documentContentAtom),
    currentStep: get(documentCurrentStepAtom)
  } as DocumentData;
});

// Helper atoms
export const hasSelectedDocumentsAtom = atom((get: Getter) => {
  return get(selectedDocumentIdsAtom).length > 0;
});

export const isDocumentValidAtom = atom((get: Getter) => {
  const title = get(documentTitleAtom);
  const content = get(documentContentAtom);
  
  return title.trim() !== '' && content.trim() !== '';
}); 