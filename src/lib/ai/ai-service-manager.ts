import { AnthropicProvider } from './providers/anthropic-provider';
import { OpenAIProvider } from './providers/openai-provider';
import { GoogleProvider } from './providers/google-provider';
import {
  AIProvider,
  AIGenerationRequest,
  AIResponse,
  CostEstimate,
  ProviderHealth,
  GenerationResult,
  GenerationAttempt,
  ProviderError,
  AIProviderName,
  AI_PROVIDERS,
  TEMPLATE_PROVIDER_MAP,
  AIProviderConfig,
  AI_ERROR_CODES
} from './types';

interface AIServiceConfig {
  anthropicKey: string;
  openaiKey: string;
  googleKey: string;
  defaultProvider?: AIProviderName;
  fallbackEnabled?: boolean;
  costTrackingEnabled?: boolean;
  rateLimitPerMinute?: number;
  rateLimitPerHour?: number;
  maxRetries?: number;
  timeout?: number;
}

export class AIServiceManager {
  private providers: Map<AIProviderName, AIProvider> = new Map();
  private config: Required<AIServiceConfig>;
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: AIServiceConfig) {
    this.config = {
      defaultProvider: AI_PROVIDERS.ANTHROPIC,
      fallbackEnabled: true,
      costTrackingEnabled: true,
      rateLimitPerMinute: 60,
      rateLimitPerHour: 1000,
      maxRetries: 3,
      timeout: 30000,
      ...config
    };

    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize Anthropic provider
    if (this.config.anthropicKey) {
      const anthropicConfig: AIProviderConfig = {
        apiKey: this.config.anthropicKey,
        model: 'claude-3-sonnet-20240229',
        maxRetries: this.config.maxRetries,
        timeout: this.config.timeout,
        costPer1kTokens: 0.015
      };
      this.providers.set(AI_PROVIDERS.ANTHROPIC, new AnthropicProvider(anthropicConfig));
    }

    // Initialize OpenAI provider
    if (this.config.openaiKey) {
      const openaiConfig: AIProviderConfig = {
        apiKey: this.config.openaiKey,
        model: 'gpt-4-turbo-preview',
        maxRetries: this.config.maxRetries,
        timeout: this.config.timeout,
        costPer1kTokens: 0.03
      };
      this.providers.set(AI_PROVIDERS.OPENAI, new OpenAIProvider(openaiConfig));
    }

    // Initialize Google provider
    if (this.config.googleKey) {
      const googleConfig: AIProviderConfig = {
        apiKey: this.config.googleKey,
        model: 'gemini-pro',
        maxRetries: this.config.maxRetries,
        timeout: this.config.timeout,
        costPer1kTokens: 0.0005
      };
      this.providers.set(AI_PROVIDERS.GOOGLE, new GoogleProvider(googleConfig));
    }
  }

  /**
   * Generate content with intelligent provider selection and fallback
   */
  async generateContent(request: AIGenerationRequest, preferredProvider?: AIProviderName): Promise<GenerationResult> {
    if (!this.checkRateLimit()) {
      throw this.createError(AI_ERROR_CODES.RATE_LIMIT_EXCEEDED, 'Service rate limit exceeded');
    }

    const provider = preferredProvider || this.selectOptimalProvider(request.template);
    const fallbackProviders = this.getFallbackProviders(provider, request.template);
    const attempts: GenerationAttempt[] = [];
    
    let totalCost = 0;
    let totalTokens = 0;

    // Try primary provider first
    const primaryAttempt = await this.attemptGeneration(provider, request);
    attempts.push(primaryAttempt);
    
    if (primaryAttempt.success) {
      return {
        success: true,
        content: (primaryAttempt as any).content,
        attempts,
        totalCost: primaryAttempt.cost || 0,
        totalTokens: primaryAttempt.tokensUsed || 0,
        finalProvider: provider
      };
    }

    totalCost += primaryAttempt.cost || 0;
    totalTokens += primaryAttempt.tokensUsed || 0;

    // If fallback is enabled and primary failed, try fallback providers
    if (this.config.fallbackEnabled && fallbackProviders.length > 0) {
      for (const fallbackProvider of fallbackProviders) {
        const fallbackAttempt = await this.attemptGeneration(fallbackProvider, request);
        attempts.push(fallbackAttempt);
        
        totalCost += fallbackAttempt.cost || 0;
        totalTokens += fallbackAttempt.tokensUsed || 0;

        if (fallbackAttempt.success) {
          return {
            success: true,
            content: (fallbackAttempt as any).content,
            attempts,
            totalCost,
            totalTokens,
            finalProvider: fallbackProvider
          };
        }
      }
    }

    // All providers failed
    const lastError = attempts[attempts.length - 1]?.error;
    return {
      success: false,
      attempts,
      totalCost,
      totalTokens,
      error: lastError ? this.createError(AI_ERROR_CODES.UNKNOWN_ERROR, `All providers failed: ${lastError}`) : undefined
    };
  }

  /**
   * Get cost estimates from all available providers
   */
  async getCostEstimates(prompt: string, template?: string): Promise<CostEstimate[]> {
    const estimates: CostEstimate[] = [];
    
    for (const providerName of this.providers.keys()) {
      const provider = this.providers.get(providerName);
      if (provider) {
        try {
          const estimate = await provider.estimateCost(prompt);
          estimates.push(estimate);
        } catch (error) {
          console.warn(`Failed to get cost estimate from ${providerName}:`, error);
        }
      }
    }

    // Sort by cost (ascending)
    return estimates.sort((a, b) => a.estimatedCost - b.estimatedCost);
  }

  /**
   * Get the recommended provider for a specific template
   */
  getRecommendedProvider(template?: string): AIProviderName {
    if (!template || !TEMPLATE_PROVIDER_MAP[template]) {
      return this.config.defaultProvider;
    }

    const mapping = TEMPLATE_PROVIDER_MAP[template];
    const primaryProvider = mapping.primary as AIProviderName;
    
    // Check if primary provider is available
    if (this.providers.has(primaryProvider)) {
      return primaryProvider;
    }

    // Fallback to first available provider from fallback list
    for (const fallbackProvider of mapping.fallback) {
      if (this.providers.has(fallbackProvider as AIProviderName)) {
        return fallbackProvider as AIProviderName;
      }
    }

    return this.config.defaultProvider;
  }

  /**
   * Get health status of all providers
   */
  async getProvidersHealth(): Promise<Record<AIProviderName, ProviderHealth>> {
    const health: Record<string, ProviderHealth> = {};
    
    for (const providerName of this.providers.keys()) {
      const provider = this.providers.get(providerName);
      if (provider) {
        try {
          health[providerName] = await provider.checkHealth();
        } catch (error) {
          health[providerName] = {
            isHealthy: false,
            responseTime: 0,
            lastChecked: new Date(),
            errorRate: 1,
            successfulRequests: 0,
            failedRequests: 1
          };
        }
      }
    }

    return health as Record<AIProviderName, ProviderHealth>;
  }

  /**
   * Validate all provider configurations
   */
  async validateAllProviders(): Promise<Record<AIProviderName, boolean>> {
    const validations: Record<string, boolean> = {};
    
    for (const providerName of this.providers.keys()) {
      const provider = this.providers.get(providerName);
      if (provider) {
        try {
          validations[providerName] = await provider.validateConfig();
        } catch (error) {
          validations[providerName] = false;
        }
      }
    }

    return validations as Record<AIProviderName, boolean>;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): AIProviderName[] {
    return Array.from(this.providers.keys());
  }

  private selectOptimalProvider(template?: string): AIProviderName {
    return this.getRecommendedProvider(template);
  }

  private getFallbackProviders(primaryProvider: AIProviderName, template?: string): AIProviderName[] {
    const fallbacks: AIProviderName[] = [];
    
    if (template && TEMPLATE_PROVIDER_MAP[template]) {
      // Use template-specific fallback order
      const templateFallbacks = TEMPLATE_PROVIDER_MAP[template].fallback as AIProviderName[];
      for (const provider of templateFallbacks) {
        if (provider !== primaryProvider && this.providers.has(provider)) {
          fallbacks.push(provider);
        }
      }
    }
    
    // Add any remaining providers not in the template fallback list
    for (const provider of this.providers.keys()) {
      if (provider !== primaryProvider && !fallbacks.includes(provider)) {
        fallbacks.push(provider);
      }
    }

    return fallbacks;
  }

  private async attemptGeneration(providerName: AIProviderName, request: AIGenerationRequest): Promise<GenerationAttempt> {
    const startTime = Date.now();
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      return {
        provider: providerName,
        success: false,
        error: 'Provider not available',
        responseTime: Date.now() - startTime
      };
    }

    try {
      const response = await provider.generateContent(request);
      return {
        provider: providerName,
        success: true,
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        responseTime: response.responseTime,
        ...(response as any) // Include full response for successful attempts
      };
    } catch (error) {
      return {
        provider: providerName,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        responseTime: Date.now() - startTime
      };
    }
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const minuteKey = `minute_${Math.floor(now / 60000)}`;
    const hourKey = `hour_${Math.floor(now / 3600000)}`;

    // Check minute limit
    const minuteData = this.requestCounts.get(minuteKey) || { count: 0, resetTime: now + 60000 };
    if (minuteData.count >= this.config.rateLimitPerMinute) {
      return false;
    }

    // Check hour limit
    const hourData = this.requestCounts.get(hourKey) || { count: 0, resetTime: now + 3600000 };
    if (hourData.count >= this.config.rateLimitPerHour) {
      return false;
    }

    // Increment counters
    this.requestCounts.set(minuteKey, { count: minuteData.count + 1, resetTime: minuteData.resetTime });
    this.requestCounts.set(hourKey, { count: hourData.count + 1, resetTime: hourData.resetTime });

    // Clean old entries
    this.cleanOldRateLimitEntries();

    return true;
  }

  private cleanOldRateLimitEntries(): void {
    const now = Date.now();
    for (const [key, data] of this.requestCounts) {
      if (data.resetTime < now) {
        this.requestCounts.delete(key);
      }
    }
  }

  private createError(code: string, message: string): ProviderError {
    return {
      code,
      message,
      provider: 'service-manager',
      retryable: false
    };
  }
} 