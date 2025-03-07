import { atom } from 'jotai';

// Define the Attachment interface directly here to avoid circular dependencies
export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  file?: File;
}

// Define the document attachments atom
export const documentAttachmentsAtom = atom<Attachment[]>([]); 