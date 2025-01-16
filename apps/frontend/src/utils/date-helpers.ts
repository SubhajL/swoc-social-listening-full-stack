export const formatDate = (isoString: string): Date => {
  return new Date(isoString);
};

export const formatDateString = (isoString: string): string => {
  return new Date(isoString).toLocaleDateString();
}; 