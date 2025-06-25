// AI Provider Types and Interfaces

export interface AIGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface AIResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed: number;
  cost: number;
  responseTime: number;
  qualityScore?: number;
  metadata?: Record<string, any>;
}

export interface AIGenerationRequest {
  prompt: string;
  options?: AIGenerationOptions;
  template?: string;
  tone?: string;
  length?: string;
  keywords?: string[];
}

export interface ProviderError {
  code: string;
  message: string;
  provider: string;
  retryable: boolean;
  originalError?: Error | string;
}

export interface ProviderHealth {
  isHealthy: boolean;
  responseTime: number;
  lastChecked: Date;
  errorRate: number;
  successfulRequests: number;
  failedRequests: number;
}

export interface CostEstimate {
  estimatedTokens: number;
  estimatedCost: number;
  provider: string;
  model: string;
}

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxRetries: number;
  timeout: number;
  costPer1kTokens: number;
}

export interface GenerationAttempt {
  provider: string;
  success: boolean;
  error?: string;
  tokensUsed?: number;
  cost?: number;
  responseTime: number;
}

export interface GenerationResult {
  success: boolean;
  content?: string;
  attempts: GenerationAttempt[];
  totalCost: number;
  totalTokens: number;
  finalProvider?: string;
  error?: ProviderError;
}

// Provider Interface
export interface AIProvider {
  readonly name: string;
  readonly model: string;
  
  // Core generation method
  generateContent(request: AIGenerationRequest): Promise<AIResponse>;
  
  // Cost estimation
  estimateCost(prompt: string, options?: AIGenerationOptions): Promise<CostEstimate>;
  
  // Health checking
  checkHealth(): Promise<ProviderHealth>;
  
  // Validation
  validateConfig(): Promise<boolean>;
  
  // Provider-specific configuration
  getDefaultOptions(): AIGenerationOptions;
}

// Template to Provider Mapping
export interface TemplateProviderMapping {
  primary: string;
  fallback: string[];
  reason: string;
}

export const TEMPLATE_PROVIDER_MAP: Record<string, TemplateProviderMapping> = {
  "Product Showcase": {
    primary: "openai",
    fallback: ["anthropic", "google"],
    reason: "Superior persuasive and sales-focused content"
  },
  "How-to Guide": {
    primary: "anthropic",
    fallback: ["openai", "google"],
    reason: "Excellent structured, step-by-step instructions"
  },
  "Artist Showcase": {
    primary: "openai",
    fallback: ["anthropic", "google"],
    reason: "Superior creative and cultural content"
  },
  "Buying Guide": {
    primary: "anthropic",
    fallback: ["openai", "google"],
    reason: "Analytical comparison and evaluation"
  },
  "Industry Trends": {
    primary: "google",
    fallback: ["anthropic", "openai"],
    reason: "Access to recent information and data"
  },
  "Comparison Article": {
    primary: "anthropic",
    fallback: ["openai", "google"],
    reason: "Structured analysis and evaluation"
  },
  "Review Article": {
    primary: "openai",
    fallback: ["anthropic", "google"],
    reason: "Detailed evaluation with nuanced opinions"
  },
  "Seasonal Content": {
    primary: "google",
    fallback: ["openai", "anthropic"],
    reason: "Timely content with current information"
  },
  "Problem-Solution": {
    primary: "anthropic",
    fallback: ["openai", "google"],
    reason: "Logical problem analysis and solution presentation"
  }
};

// Provider Names
export const AI_PROVIDERS = {
  ANTHROPIC: 'anthropic',
  OPENAI: 'openai',
  GOOGLE: 'google'
} as const;

export type AIProviderName = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

// Error Codes
export const AI_ERROR_CODES = {
  API_KEY_INVALID: 'API_KEY_INVALID',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INSUFFICIENT_QUOTA: 'INSUFFICIENT_QUOTA',
  MODEL_OVERLOADED: 'MODEL_OVERLOADED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type AIErrorCode = typeof AI_ERROR_CODES[keyof typeof AI_ERROR_CODES]; 