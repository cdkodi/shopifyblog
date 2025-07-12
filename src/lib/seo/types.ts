export interface KeywordData {
  keyword: string;
  search_intent: 'informational' | 'commercial' | 'navigational' | 'transactional';
}

export interface KeywordSuggestion {
  keyword: string;
  competition_level: 'low' | 'medium' | 'high';
  relevance_score: number;
}

export interface CompetitorAnalysis {
  domain: string;
  ranking_keywords: string[];
  estimated_traffic: number;
  content_gaps: string[];
}

export interface SERPFeature {
  type: 'featured_snippet' | 'people_also_ask' | 'related_searches';
  content: string[];
}

export interface SEOResearchResult {
  primary_keyword: KeywordData;
  related_keywords: KeywordSuggestion[];
  competitors: CompetitorAnalysis[];
  serp_features: SERPFeature[];
  content_recommendations: {
    target_length: number;
    suggested_headings: string[];
    questions_to_answer: string[];
  };
}

export interface SEOServiceConfig {
  apiLogin: string;
  apiPassword: string;
  locationId?: number; // Geographic targeting
  languageId?: string; // Language targeting
}

export interface SEOError {
  code: string;
  message: string;
  details?: any;
}

export interface SEOServiceHealth {
  status: 'healthy' | 'degraded' | 'down';
  apiCreditsRemaining?: number;
  lastChecked: Date;
  errors: SEOError[];
}

export const SEO_ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_KEYWORD: 'INVALID_KEYWORD',
  NO_DATA: 'NO_DATA',
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const;

export type SEOErrorCode = typeof SEO_ERROR_CODES[keyof typeof SEO_ERROR_CODES];

export interface LocationConfig {
  id: string;
  name: string;
  locationCode: number;
  languageCode: string;
  flag: string;
  currency: string;
}

export const SUPPORTED_LOCATIONS: LocationConfig[] = [
  {
    id: 'india',
    name: 'India',
    locationCode: 2356,
    languageCode: 'en',
    flag: '🇮🇳',
    currency: 'INR'
  },
  {
    id: 'usa',
    name: 'United States',
    locationCode: 2840,
    languageCode: 'en',
    flag: '🇺🇸',
    currency: 'USD'
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    locationCode: 2826,
    languageCode: 'en',
    flag: '🇬🇧',
    currency: 'GBP'
  },
  {
    id: 'canada',
    name: 'Canada',
    locationCode: 2124,
    languageCode: 'en',
    flag: '🇨🇦',
    currency: 'CAD'
  },
  {
    id: 'australia',
    name: 'Australia',
    locationCode: 2036,
    languageCode: 'en',
    flag: '🇦🇺',
    currency: 'AUD'
  }
]; 