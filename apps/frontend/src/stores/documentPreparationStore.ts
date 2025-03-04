import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DocumentPreparationState {
  // Document content
  documentContent: string;
  initialDocumentContent: string;
  
  // Status flags
  isSaved: boolean;
  isApproved: boolean;
  
  // Metadata
  saveTimestamp: string;
  approverInfo: string;
  
  // Actions
  setDocumentContent: (content: string) => void;
  setSaved: (timestamp: string) => void;
  setApproved: () => void;
  reset: () => void;
}

export const useDocumentPreparationStore = create<DocumentPreparationState>()(
  persist(
    (set) => ({
      // Initial state
      documentContent: "",
      initialDocumentContent: "",
      isSaved: false,
      isApproved: false,
      saveTimestamp: "",
      approverInfo: "นาย ณเดช ศุภมิตร", // Default approver
      
      // Actions
      setDocumentContent: (content: string) => set({ documentContent: content }),
      
      setSaved: (timestamp: string) => set({ 
        isSaved: true, 
        saveTimestamp: timestamp 
      }),
      
      setApproved: () => set({ isApproved: true }),
      
      reset: () => set({
        documentContent: "",
        initialDocumentContent: "",
        isSaved: false,
        isApproved: false,
        saveTimestamp: "",
        approverInfo: "นาย ณเดช ศุภมิตร"
      })
    }),
    {
      name: 'document-preparation-storage', // unique name for localStorage
    }
  )
); 