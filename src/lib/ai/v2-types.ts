// V2 AI Service Types - Enhanced for Topic Integration

export interface TopicGenerationRequest {
  topic: {
    id: string;
    title: string;
    keywords: string;
    tone: string;
    length: string;
    template: string;
  };
  optimizeForSEO?: boolean;
  targetWordCount?: number;
  options?: {
    maxTokens?: number;
    temperature?: number;
    model?: string;
  };
}

export interface V2GenerationResult {
  success: boolean;
  content?: string;
  error?: {
    message: string;
    code?: string;
  };
  // Include generation attempts for provider fallback information
  attempts?: Array<{
    provider: string;
    success: boolean;
    error?: string;
    tokensUsed?: number;
    cost?: number;
    responseTime: number;
  }>;
  totalCost?: number;
  totalTokens?: number;
  generationMetadata?: {
    topicId: string;
    promptVersion: string;
    wordCount: number;
    readingTime: number;
    seoScore: number;
    keywordDensity: Record<string, number>;
    contentStructure: {
      hasIntroduction: boolean;
      hasConclusion: boolean;
      sectionCount: number;
      headingCount: number;
    };
  };
  parsedContent?: {
    title: string;
    metaDescription: string;
    content: string;
    headings: string[];
    keywords: string[];
  };
  finalProvider?: string;
  processingTime?: number;
  cost?: number;
}

export interface GenerationJob {
  id: string;
  topicId: string;
  articleId: string;
  request: TopicGenerationRequest;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: GenerationProgress;
  result?: V2GenerationResult;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: {
    provider?: string;
    cost?: number;
    attempts?: number;
  };
}

export interface GenerationProgress {
  jobId: string;
  articleId: string;
  phase: 'queued' | 'analyzing' | 'structuring' | 'writing' | 'optimizing' | 'finalizing' | 'completed' | 'error';
  percentage: number;
  currentStep: string;
  estimatedTimeRemaining?: number;
  startTime?: string;
  metadata?: {
    wordCount?: number;
    seoScore?: number;
    provider?: string;
    cost?: number;
  };
}

export interface IV2AIServiceManager {
  generateFromTopic(request: TopicGenerationRequest): Promise<V2GenerationResult>;
  queueGeneration(request: TopicGenerationRequest): Promise<{ jobId: string; estimatedCompletion: Date }>;
  getGenerationProgress(jobId: string): Promise<GenerationProgress>;
  cancelGeneration(jobId: string): Promise<void>;
  generateMultipleTopics(requests: TopicGenerationRequest[]): Promise<{ jobIds: string[]; batchId: string }>;
  getBatchProgress(batchId: string): Promise<GenerationProgress[]>;
  optimizeContent(content: string, request: TopicGenerationRequest): Promise<string>;
  validateContentQuality(content: string, request: TopicGenerationRequest): Promise<any>;
  getOptimalProvider(topic: TopicGenerationRequest['topic']): Promise<string>;
  estimateGenerationCost(request: TopicGenerationRequest): Promise<number>;
  getGenerationStats(timeframe: 'hour' | 'day' | 'week' | 'month'): Promise<{
    totalGenerations: number;
    successRate: number;
    averageTime: number;
    averageCost: number;
    topTemplates: Array<{ template: string; count: number }>;
    errorBreakdown: Record<string, number>;
  }>;
}

export interface ContentQualityAnalysis {
  overallScore: number;
  readabilityScore: number;
  seoScore: number;
  structureScore: number;
  keywordDensity: Record<string, number>;
  recommendations: string[];
  issues: string[];
  metadata: {
    wordCount: number;
    readingTime: number;
    headingCount: number;
    paragraphCount: number;
    averageSentenceLength: number;
  };
}

export interface GenerationQueueStats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  queueProcessingRate: number;
  activeWorkers: number;
  maxConcurrentJobs: number;
}

// Constants
export const V2_ERROR_CODES = {
  TOPIC_INVALID: 'TOPIC_INVALID',
  TEMPLATE_NOT_SUPPORTED: 'TEMPLATE_NOT_SUPPORTED',
  GENERATION_FAILED: 'GENERATION_FAILED',
  QUEUE_FULL: 'QUEUE_FULL',
  JOB_NOT_FOUND: 'JOB_NOT_FOUND',
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  CONTENT_QUALITY_LOW: 'CONTENT_QUALITY_LOW',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  API_KEY_INVALID: 'API_KEY_INVALID',
  INSUFFICIENT_QUOTA: 'INSUFFICIENT_QUOTA',
  NETWORK_ERROR: 'NETWORK_ERROR',
  MODEL_OVERLOADED: 'MODEL_OVERLOADED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export const SEO_CONSTANTS = {
  OPTIMAL_KEYWORD_DENSITY: {
    MIN: 0.005, // 0.5%
    MAX: 0.025, // 2.5%
    TARGET: 0.015 // 1.5%
  },
  CONTENT_STRUCTURE: {
    MIN_HEADINGS: 3,
    MAX_HEADINGS: 12,
    MIN_PARAGRAPHS: 5,
    OPTIMAL_PARAGRAPH_LENGTH: 150,
    OPTIMAL_SENTENCE_LENGTH: 20
  },
  READABILITY: {
    MIN_SCORE: 60,
    TARGET_SCORE: 70,
    OPTIMAL_SCORE: 80
  }
} as const;

export const CONTENT_TEMPLATES = {
  STANDARD: 'standard',
  DETAILED: 'detailed',
  COMPREHENSIVE: 'comprehensive'
} as const;

export const V2_CONTENT_TEMPLATES = CONTENT_TEMPLATES;

export type ContentTemplate = typeof CONTENT_TEMPLATES[keyof typeof CONTENT_TEMPLATES];
export type V2ErrorCode = typeof V2_ERROR_CODES[keyof typeof V2_ERROR_CODES]; 