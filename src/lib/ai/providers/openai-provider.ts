import { BaseAIProvider } from './base-provider';
import {
  AIGenerationRequest,
  AIResponse,
  AIGenerationOptions,
  ProviderError,
  AI_ERROR_CODES
} from '../types';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
}

interface OpenAIResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: string | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider extends BaseAIProvider {
  readonly name = 'openai';
  readonly model = 'gpt-4-turbo-preview';
  
  private readonly baseUrl = 'https://api.openai.com/v1';

  async generateContent(request: AIGenerationRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      const response = await this.retryWithBackoff(async () => {
        return await this.makeAPICall(request);
      });

      const responseTime = Date.now() - startTime;
      const tokensUsed = response.usage.total_tokens;
      const cost = this.calculateCost(tokensUsed);

      this.trackSuccess();

      return {
        content: response.choices[0].message.content,
        provider: this.name,
        model: this.model,
        tokensUsed,
        cost,
        responseTime,
        metadata: {
          finishReason: response.choices[0].finish_reason,
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          id: response.id,
          created: response.created
        }
      };
    } catch (error) {
      this.trackFailure();
      throw this.handleAPIError(error as Error);
    }
  }

  protected async makeAPICall(request: AIGenerationRequest): Promise<OpenAIResponse> {
    const options = { ...this.getDefaultOptions(), ...request.options };
    
    const openaiRequest: OpenAIRequest = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: request.prompt
        }
      ],
      max_tokens: options.maxTokens || 4000,
      temperature: options.temperature,
      top_p: options.topP,
      frequency_penalty: options.frequencyPenalty,
      presence_penalty: options.presencePenalty,
      stream: false
    };

    const response = await this.withTimeout(
      fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(openaiRequest)
      })
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw this.createAPIError(response.status, errorData);
    }

    return response.json() as Promise<OpenAIResponse>;
  }

  estimateTokens(text: string): number {
    // OpenAI token estimation: roughly 4 characters per token
    // More accurate for GPT models
    return Math.ceil(text.length / 4);
  }

  getDefaultOptions(): AIGenerationOptions {
    return {
      temperature: 0.7,
      maxTokens: 4000,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0
    };
  }

  private handleAPIError(error: Error): ProviderError {
    const message = error.message.toLowerCase();
    
    if (message.includes('rate limit') || message.includes('429')) {
      return this.createError(AI_ERROR_CODES.RATE_LIMIT_EXCEEDED, 'OpenAI rate limit exceeded');
    }
    
    if (message.includes('quota') || message.includes('insufficient') || message.includes('billing')) {
      return this.createError(AI_ERROR_CODES.INSUFFICIENT_QUOTA, 'OpenAI quota exceeded or billing issue');
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return this.createError(AI_ERROR_CODES.API_KEY_INVALID, 'Invalid OpenAI API key');
    }
    
    if (message.includes('timeout') || message.includes('network')) {
      return this.createError(AI_ERROR_CODES.NETWORK_ERROR, 'Network error connecting to OpenAI');
    }
    
    if (message.includes('overloaded') || message.includes('503') || message.includes('502')) {
      return this.createError(AI_ERROR_CODES.MODEL_OVERLOADED, 'OpenAI service is overloaded');
    }
    
    return this.createError(AI_ERROR_CODES.UNKNOWN_ERROR, `OpenAI API error: ${error.message}`, error);
  }

  private createAPIError(status: number, errorData: any): ProviderError {
    const message = errorData.error?.message || errorData.message || `HTTP ${status}`;
    
    switch (status) {
      case 401:
        return this.createError(AI_ERROR_CODES.API_KEY_INVALID, 'Invalid OpenAI API key');
      case 429:
        return this.createError(AI_ERROR_CODES.RATE_LIMIT_EXCEEDED, 'OpenAI rate limit exceeded');
      case 502:
      case 503:
        return this.createError(AI_ERROR_CODES.MODEL_OVERLOADED, 'OpenAI service unavailable');
      case 400:
        return this.createError(AI_ERROR_CODES.VALIDATION_ERROR, `OpenAI validation error: ${message}`);
      default:
        return this.createError(AI_ERROR_CODES.UNKNOWN_ERROR, `OpenAI API error: ${message}`);
    }
  }

  async validateConfig(): Promise<boolean> {
    await super.validateConfig();
    
    // Test API key with a minimal request
    try {
      const testRequest: OpenAIRequest = {
        model: this.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1
      };

      const response = await this.withTimeout(
        fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify(testRequest)
        }),
        5000 // 5 second timeout for validation
      );

      return response.ok || response.status === 429; // 429 means API key is valid but rate limited
    } catch (error) {
      throw this.createError(AI_ERROR_CODES.API_KEY_INVALID, 'Failed to validate OpenAI API key');
    }
  }
} 