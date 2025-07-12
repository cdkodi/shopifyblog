import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Safely parse JSON with fallback handling for malformed data
 */
export function safeJsonParse<T = any>(
  value: any,
  fallback: T = [] as T
): T {
  if (value === null || value === undefined) {
    return fallback;
  }

  // If it's already the expected type, return it
  if (Array.isArray(value) && Array.isArray(fallback)) {
    return value as T;
  }

  // If it's not a string, try to convert it
  if (typeof value !== 'string') {
    try {
      return JSON.parse(JSON.stringify(value)) as T;
    } catch {
      return fallback;
    }
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('JSON parse failed, attempting recovery:', error);

    // Try to extract keywords from malformed strings
    if (typeof fallback === 'object' && Array.isArray(fallback)) {
      const rawString = String(value);
      if (rawString.includes('kerala') || rawString.includes('art') || rawString.includes('"')) {
        // Extract words from the malformed data
        const keywords = rawString.match(/[a-zA-Z][a-zA-Z ]{2,}/g) || [];
        const cleanKeywords = keywords
          .map(k => k.trim().toLowerCase())
          .filter(k => k.length > 2 && k.length < 50)
          .slice(0, 10);

        if (cleanKeywords.length > 0) {
          return cleanKeywords as T;
        }
      }
    }

    return fallback;
  }
}

/**
 * Safely parse article keywords with specific handling for keyword arrays
 */
export function parseArticleKeywords(keywords: any): string[] {
  return safeJsonParse<string[]>(keywords, []);
}

/**
 * Parse word count from article length strings like "Short (500-800 words)"
 * Returns the middle of the range or the single number if only one is provided
 */
export function parseWordCountFromLength(lengthString: string): number {
  if (!lengthString) return 800; // Default
  
  // Extract numbers from strings like "Short (500-800 words)"
  const match = lengthString.match(/\((\d+)(?:-(\d+))?\s*words?\)/i);
  if (match) {
    const minWords = parseInt(match[1]);
    const maxWords = match[2] ? parseInt(match[2]) : minWords;
    // Use the middle of the range
    return Math.floor((minWords + maxWords) / 2);
  }
  
  // Fallback parsing for other formats
  const numbers = lengthString.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    return parseInt(numbers[0]);
  }
  
  return 800; // Default fallback
}

/**
 * Get word count range from article length strings
 * Returns an object with min and max values
 */
export function getWordCountRange(lengthString: string): { min: number; max: number; target: number } {
  if (!lengthString) return { min: 600, max: 1000, target: 800 };
  
  // Extract numbers from strings like "Short (500-800 words)"
  const match = lengthString.match(/\((\d+)(?:-(\d+))?\s*words?\)/i);
  if (match) {
    const minWords = parseInt(match[1]);
    const maxWords = match[2] ? parseInt(match[2]) : minWords;
    return { 
      min: minWords, 
      max: maxWords, 
      target: Math.floor((minWords + maxWords) / 2) 
    };
  }
  
  // Fallback parsing for other formats
  const numbers = lengthString.match(/\d+/g);
  if (numbers && numbers.length > 0) {
    const target = parseInt(numbers[0]);
    return { min: target - 200, max: target + 200, target };
  }
  
  return { min: 600, max: 1000, target: 800 };
} 