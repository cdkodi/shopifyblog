import { BaseAIProvider } from './base-provider';
import {
  AIGenerationRequest,
  AIResponse,
  AIGenerationOptions,
  ProviderError,
  AI_ERROR_CODES
} from '../types';

interface GoogleGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  candidateCount?: number;
}

interface GoogleContent {
  parts: Array<{
    text: string;
  }>;
}

interface GoogleRequest {
  contents: GoogleContent[];
  generationConfig?: GoogleGenerationConfig;
}

interface GoogleResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings?: Array<{
      category: string;
      probability: string;
    }>;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GoogleProvider extends BaseAIProvider {
  readonly name = 'google';
  readonly model = 'gemini-pro';
  
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  async generateContent(request: AIGenerationRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      const response = await this.retryWithBackoff(async () => {
        return await this.makeAPICall(request);
      });

      const responseTime = Date.now() - startTime;
      const tokensUsed = response.usageMetadata.totalTokenCount;
      const cost = this.calculateCost(tokensUsed);

      this.trackSuccess();

      const content = response.candidates[0]?.content?.parts[0]?.text || '';

      return {
        content,
        provider: this.name,
        model: this.model,
        tokensUsed,
        cost,
        responseTime,
        metadata: {
          finishReason: response.candidates[0]?.finishReason,
          promptTokenCount: response.usageMetadata.promptTokenCount,
          candidatesTokenCount: response.usageMetadata.candidatesTokenCount,
          safetyRatings: response.candidates[0]?.safetyRatings
        }
      };
    } catch (error) {
      this.trackFailure();
      throw this.handleAPIError(error as Error);
    }
  }

  protected async makeAPICall(request: AIGenerationRequest): Promise<GoogleResponse> {
    const options = { ...this.getDefaultOptions(), ...request.options };
    
    const googleRequest: GoogleRequest = {
      contents: [
        {
          parts: [
            {
              text: request.prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: options.temperature,
        topP: options.topP,
        maxOutputTokens: options.maxTokens || 2048,
        candidateCount: 1
      }
    };

    const response = await this.withTimeout(
      fetch(`${this.baseUrl}/models/${this.model}:generateContent?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(googleRequest)
      })
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw this.createAPIError(response.status, errorData);
    }

    return response.json() as Promise<GoogleResponse>;
  }

  estimateTokens(text: string): number {
    // Google Gemini token estimation: roughly 4 characters per token
    // Similar to other models but may vary slightly
    return Math.ceil(text.length / 4);
  }

  getDefaultOptions(): AIGenerationOptions {
    return {
      temperature: 0.7,
      maxTokens: 2048, // Gemini Pro has a lower limit
      topP: 0.95,
      frequencyPenalty: 0,
      presencePenalty: 0
    };
  }

  private handleAPIError(error: Error): ProviderError {
    const message = error.message.toLowerCase();
    
    if (message.includes('quota') || message.includes('429')) {
      return this.createError(AI_ERROR_CODES.RATE_LIMIT_EXCEEDED, 'Google API quota exceeded');
    }
    
    if (message.includes('unauthorized') || message.includes('401') || message.includes('api key')) {
      return this.createError(AI_ERROR_CODES.API_KEY_INVALID, 'Invalid Google API key');
    }
    
    if (message.includes('timeout') || message.includes('network')) {
      return this.createError(AI_ERROR_CODES.NETWORK_ERROR, 'Network error connecting to Google');
    }
    
    if (message.includes('overloaded') || message.includes('503') || message.includes('502')) {
      return this.createError(AI_ERROR_CODES.MODEL_OVERLOADED, 'Google service is overloaded');
    }
    
    if (message.includes('safety') || message.includes('blocked')) {
      return this.createError(AI_ERROR_CODES.VALIDATION_ERROR, 'Content blocked by Google safety filters');
    }
    
    return this.createError(AI_ERROR_CODES.UNKNOWN_ERROR, `Google API error: ${error.message}`, error);
  }

  private createAPIError(status: number, errorData: any): ProviderError {
    const message = errorData.error?.message || errorData.message || `HTTP ${status}`;
    
    switch (status) {
      case 400:
        if (message.includes('API key')) {
          return this.createError(AI_ERROR_CODES.API_KEY_INVALID, 'Invalid Google API key');
        }
        return this.createError(AI_ERROR_CODES.VALIDATION_ERROR, `Google validation error: ${message}`);
      case 401:
        return this.createError(AI_ERROR_CODES.API_KEY_INVALID, 'Invalid Google API key');
      case 429:
        return this.createError(AI_ERROR_CODES.RATE_LIMIT_EXCEEDED, 'Google API quota exceeded');
      case 502:
      case 503:
        return this.createError(AI_ERROR_CODES.MODEL_OVERLOADED, 'Google service unavailable');
      default:
        return this.createError(AI_ERROR_CODES.UNKNOWN_ERROR, `Google API error: ${message}`);
    }
  }

  async validateConfig(): Promise<boolean> {
    await super.validateConfig();
    
    // Test API key with a minimal request
    try {
      const testRequest: GoogleRequest = {
        contents: [
          {
            parts: [
              {
                text: 'Hi'
              }
            ]
          }
        ],
        generationConfig: {
          maxOutputTokens: 1
        }
      };

      const response = await this.withTimeout(
        fetch(`${this.baseUrl}/models/${this.model}:generateContent?key=${this.config.apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(testRequest)
        }),
        5000 // 5 second timeout for validation
      );

      return response.ok || response.status === 429; // 429 means API key is valid but rate limited
    } catch (error) {
      throw this.createError(AI_ERROR_CODES.API_KEY_INVALID, 'Failed to validate Google API key');
    }
  }
} 