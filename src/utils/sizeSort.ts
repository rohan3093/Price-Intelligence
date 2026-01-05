/**
 * Utility functions for sorting shoe sizes
 * Handles UK sizes with proper numeric ordering (including half sizes)
 */

/**
 * Parses a size string to extract the numeric value for sorting
 * Handles formats like "UK 6", "UK 6.5", "US 9", etc.
 */
function parseSizeValue(size: string): number {
  // Extract numeric value from size string
  const match = size.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    return parseFloat(match[1]);
  }
  return 0;
}

/**
 * Sorts an array of size variant objects by their size value
 * Handles UK sizes properly (e.g., UK 3, UK 3.5, UK 4, UK 6, UK 6.5, UK 7)
 */
export function sortSizesByValue<T extends { size: string }>(sizes: T[]): T[] {
  return [...sizes].sort((a, b) => {
    const valueA = parseSizeValue(a.size);
    const valueB = parseSizeValue(b.size);
    
    // If numeric values are equal, sort alphabetically
    if (valueA === valueB) {
      return a.size.localeCompare(b.size);
    }
    
    return valueA - valueB;
  });
}

/**
 * Sorts an array of size strings by their numeric value
 */
export function sortSizeStrings(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const valueA = parseSizeValue(a);
    const valueB = parseSizeValue(b);
    
    if (valueA === valueB) {
      return a.localeCompare(b);
    }
    
    return valueA - valueB;
  });
}

