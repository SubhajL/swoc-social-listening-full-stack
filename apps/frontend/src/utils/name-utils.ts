/**
 * Generates a two-letter acronym from a user's name
 * Rules:
 * 1. For Thai names: Takes first letter of first name and last name
 * 2. For single word: Takes first two letters
 * 3. For empty/null: Returns 'CN' (Customer Name)
 * 4. Converts to uppercase
 */
export const generateNameAcronym = (name: string | undefined | null): string => {
  if (!name) return 'CN';
  
  // Remove extra spaces and trim
  const cleanName = name.trim().replace(/\s+/g, ' ');
  
  // Split into words
  const words = cleanName.split(' ');
  
  if (words.length >= 2) {
    // If multiple words, take first letter of first and last word
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  } else if (words[0].length >= 2) {
    // If single word with 2+ characters, take first two letters
    return words[0].substring(0, 2).toUpperCase();
  } else if (words[0].length === 1) {
    // If single character, duplicate it
    return (words[0] + words[0]).toUpperCase();
  }
  
  return 'CN';
}; 