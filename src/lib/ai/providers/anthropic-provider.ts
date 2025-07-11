import { BaseAIProvider } from './base-provider';
import {
  AIGenerationRequest,
  AIResponse,
  AIGenerationOptions,
  ProviderError,
  AI_ERROR_CODES
} from '../types';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProvider extends BaseAIProvider {
  readonly name = 'anthropic';
  readonly model = 'claude-3-sonnet-20240229';
  
  private readonly baseUrl = 'https://api.anthropic.com/v1';

  async generateContent(request: AIGenerationRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    try {
      const response = await this.retryWithBackoff(async () => {
        return await this.makeAPICall(request);
      });

      const responseTime = Date.now() - startTime;
      const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
      const cost = this.calculateCost(tokensUsed);

      // Check for content policy refusals
      const content = response.content[0]?.text || '';
      
      // Log all Anthropic responses for debugging
      console.log('🔍 Anthropic response preview:', {
        contentLength: content.length,
        firstLine: content.split('\n')[0]?.substring(0, 100) || 'Empty content',
        isRefusal: this.isContentPolicyRefusal(content),
        responseId: response.id
      });
      
      // Log potential refusal patterns for debugging
      if (content.length < 200 && (content.toLowerCase().includes('sorry') || content.toLowerCase().includes("can't"))) {
        console.warn('⚠️ Potential refusal detected (short response with apology):', {
          fullContent: content,
          length: content.length,
          detectedAsRefusal: this.isContentPolicyRefusal(content)
        });
      }
      
      if (this.isContentPolicyRefusal(content)) {
        console.warn('🚫 Anthropic content policy refusal detected:', {
          fullRefusalMessage: content, // Log the full message for debugging
          refusalPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
          promptLength: request.prompt.length,
          promptPreview: request.prompt.substring(0, 200) + '...'
        });
        this.trackFailure();
        throw this.createError(
          AI_ERROR_CODES.VALIDATION_ERROR, 
          'Content blocked by Anthropic safety filters - triggering fallback to alternate provider'
        );
      }

      this.trackSuccess();

      return {
        content,
        provider: this.name,
        model: this.model,
        tokensUsed,
        cost,
        responseTime,
        metadata: {
          stopReason: response.stop_reason,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          id: response.id
        }
      };
    } catch (error) {
      this.trackFailure();
      throw this.handleAPIError(error as Error);
    }
  }

  protected async makeAPICall(request: AIGenerationRequest): Promise<AnthropicResponse> {
    const options = { ...this.getDefaultOptions(), ...request.options };
    
    const anthropicRequest: AnthropicRequest = {
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
      stream: false
    };

    const response = await this.withTimeout(
      fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(anthropicRequest)
      })
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw this.createAPIError(response.status, errorData);
    }

    return response.json() as Promise<AnthropicResponse>;
  }

  estimateTokens(text: string): number {
    // Anthropic token estimation: roughly 4 characters per token
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
      return this.createError(AI_ERROR_CODES.RATE_LIMIT_EXCEEDED, 'Anthropic rate limit exceeded');
    }
    
    if (message.includes('quota') || message.includes('insufficient')) {
      return this.createError(AI_ERROR_CODES.INSUFFICIENT_QUOTA, 'Anthropic quota exceeded');
    }
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return this.createError(AI_ERROR_CODES.API_KEY_INVALID, 'Invalid Anthropic API key');
    }
    
    if (message.includes('timeout') || message.includes('network')) {
      return this.createError(AI_ERROR_CODES.NETWORK_ERROR, 'Network error connecting to Anthropic');
    }
    
    if (message.includes('overloaded') || message.includes('503')) {
      return this.createError(AI_ERROR_CODES.MODEL_OVERLOADED, 'Anthropic model is overloaded');
    }
    
    if (message.includes('safety filters') || message.includes('content blocked') || message.includes('content policy')) {
      return this.createError(AI_ERROR_CODES.VALIDATION_ERROR, 'Content blocked by Anthropic safety filters');
    }
    
    return this.createError(AI_ERROR_CODES.UNKNOWN_ERROR, `Anthropic API error: ${error.message}`, error);
  }

  private createAPIError(status: number, errorData: any): ProviderError {
    const message = errorData.error?.message || errorData.message || `HTTP ${status}`;
    
    switch (status) {
      case 401:
        return this.createError(AI_ERROR_CODES.API_KEY_INVALID, 'Invalid Anthropic API key');
      case 429:
        return this.createError(AI_ERROR_CODES.RATE_LIMIT_EXCEEDED, 'Anthropic rate limit exceeded');
      case 503:
        return this.createError(AI_ERROR_CODES.MODEL_OVERLOADED, 'Anthropic service unavailable');
      default:
        return this.createError(AI_ERROR_CODES.UNKNOWN_ERROR, `Anthropic API error: ${message}`);
    }
  }

  private isContentPolicyRefusal(content: string): boolean {
    const refusalPhrases = [
      // Standard apology patterns
      "i'm sorry, but i can't fulfill this request",
      "i'm sorry, but i can't",
      "i'm sorry, i can't",
      "sorry, but i can't",
      "sorry, i can't",
      
      // Inability patterns
      "i can't help with that",
      "i can't help with",
      "i'm not able to",
      "i cannot provide",
      "i'm unable to",
      "i can't assist with",
      "i can't create",
      "i can't generate",
      "i can't write",
      
      // Policy/guideline patterns
      "this request goes against",
      "against my guidelines",
      "violates my guidelines",
      "my guidelines don't allow",
      "not something i can help with",
      "not something i can do",
      
      // Comfort/preference patterns
      "i'm not comfortable",
      "i'd prefer not to",
      "i don't feel comfortable",
      
      // Direct refusal patterns
      "i won't be able to",
      "i cannot fulfill",
      "i'm not going to",
      "this isn't something",
      
      // Content-specific refusals
      "inappropriate content",
      "harmful content",
      "offensive content"
    ];
    
    const normalizedContent = content.toLowerCase().trim();
    
    // Check for exact phrase matches
    const hasRefusalPhrase = refusalPhrases.some(phrase => normalizedContent.includes(phrase));
    
    // Additional checks for short responses that are likely refusals
    const isVeryShort = content.length < 100;
    const startsWithApology = normalizedContent.startsWith("i'm sorry") || normalizedContent.startsWith("sorry");
    const containsCant = normalizedContent.includes("can't") || normalizedContent.includes("cannot");
    
    const isLikelyRefusal = isVeryShort && startsWithApology && containsCant;
    
    return hasRefusalPhrase || isLikelyRefusal;
  }

  async validateConfig(): Promise<boolean> {
    await super.validateConfig();
    
    // Test API key with a minimal request
    try {
      const testRequest: AnthropicRequest = {
        model: this.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1
      };

      const response = await this.withTimeout(
        fetch(`${this.baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.config.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(testRequest)
        }),
        5000 // 5 second timeout for validation
      );

      return response.ok || response.status === 429; // 429 means API key is valid but rate limited
    } catch (error) {
      throw this.createError(AI_ERROR_CODES.API_KEY_INVALID, 'Failed to validate Anthropic API key');
    }
  }
} 