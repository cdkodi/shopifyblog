export interface KeywordData {
  keyword: string;
  search_volume: number;
  competition: number;
  cpc: number;
  difficulty: number;
  search_intent: 'informational' | 'commercial' | 'navigational' | 'transactional';
}

export interface KeywordSuggestion {
  keyword: string;
  search_volume: number;
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