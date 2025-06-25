import {
  AIProvider,
  AIGenerationRequest,
  AIResponse,
  CostEstimate,
  ProviderHealth,
  AIGenerationOptions,
  ProviderError,
  AIProviderConfig,
  AI_ERROR_CODES
} from '../types';

export abstract class BaseAIProvider implements AIProvider {
  abstract readonly name: string;
  abstract readonly model: string;
  
  protected config: AIProviderConfig;
  protected healthStats: {
    successfulRequests: number;
    failedRequests: number;
    lastHealthCheck?: Date;
    lastResponseTime?: number;
  } = {
    successfulRequests: 0,
    failedRequests: 0
  };

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  // Abstract methods that each provider must implement
  abstract generateContent(request: AIGenerationRequest): Promise<AIResponse>;
  abstract estimateTokens(text: string): number;
  protected abstract makeAPICall(request: AIGenerationRequest): Promise<any>;
  
  // Common cost estimation implementation
  async estimateCost(prompt: string, options?: AIGenerationOptions): Promise<CostEstimate> {
    const estimatedTokens = this.estimateTokens(prompt) + (options?.maxTokens || 1000);
    const estimatedCost = (estimatedTokens / 1000) * this.config.costPer1kTokens;
    
    return {
      estimatedTokens,
      estimatedCost,
      provider: this.name,
      model: this.model
    };
  }

  // Common health check implementation
  async checkHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      await this.validateConfig();
      const responseTime = Date.now() - startTime;
      
      this.healthStats.lastHealthCheck = new Date();
      this.healthStats.lastResponseTime = responseTime;
      
      const totalRequests = this.healthStats.successfulRequests + this.healthStats.failedRequests;
      const errorRate = totalRequests > 0 ? this.healthStats.failedRequests / totalRequests : 0;
      
      return {
        isHealthy: true,
        responseTime,
        lastChecked: new Date(),
        errorRate,
        successfulRequests: this.healthStats.successfulRequests,
        failedRequests: this.healthStats.failedRequests
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.healthStats.failedRequests++;
      
      return {
        isHealthy: false,
        responseTime,
        lastChecked: new Date(),
        errorRate: 1,
        successfulRequests: this.healthStats.successfulRequests,
        failedRequests: this.healthStats.failedRequests
      };
    }
  }

  // Common configuration validation
  async validateConfig(): Promise<boolean> {
    if (!this.config.apiKey) {
      throw this.createError(AI_ERROR_CODES.API_KEY_INVALID, 'API key is required');
    }
    
    if (!this.config.model) {
      throw this.createError(AI_ERROR_CODES.VALIDATION_ERROR, 'Model is required');
    }
    
    return true;
  }

  // Default options - can be overridden by each provider
  getDefaultOptions(): AIGenerationOptions {
    return {
      temperature: 0.7,
      maxTokens: 2000,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0
    };
  }

  // Common error handling
  protected createError(code: string, message: string, originalError?: Error): ProviderError {
    return {
      code,
      message,
      provider: this.name,
      retryable: this.isRetryableError(code),
      // Don't include originalError to avoid serialization issues
      ...(originalError && { originalError: originalError.message })
    };
  }

  protected isRetryableError(code: string): boolean {
    const retryableErrors = [
      AI_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      AI_ERROR_CODES.MODEL_OVERLOADED,
      AI_ERROR_CODES.NETWORK_ERROR,
      AI_ERROR_CODES.TIMEOUT
    ];
    return retryableErrors.includes(code as any);
  }

  // Common retry logic
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // If it's not retryable or last attempt, throw immediately
        if (!this.shouldRetry(error as Error) || attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await this.delay(delayMs);
      }
    }
    
    throw lastError!;
  }

  protected shouldRetry(error: Error): boolean {
    // Check if error indicates we should retry
    const errorMessage = error.message.toLowerCase();
    return (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('temporary') ||
      errorMessage.includes('overloaded')
    );
  }

  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Request tracking for health monitoring
  protected trackSuccess(): void {
    this.healthStats.successfulRequests++;
  }

  protected trackFailure(): void {
    this.healthStats.failedRequests++;
  }

  // Common request timeout wrapper
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = this.config.timeout
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(this.createError(AI_ERROR_CODES.TIMEOUT, `Request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  // Utility method to calculate actual tokens used (to be implemented by each provider)
  protected calculateCost(tokensUsed: number): number {
    return (tokensUsed / 1000) * this.config.costPer1kTokens;
  }
} 