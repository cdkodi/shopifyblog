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

      // Check for content policy refusals
      const content = response.choices[0].message.content;
      
      // ENHANCED: Log ALL OpenAI responses for debugging
      console.log('🔍 OpenAI response preview:', {
        contentLength: content.length,
        firstLine: content.split('\n')[0]?.substring(0, 100) || 'Empty content',
        isRefusal: this.isContentPolicyRefusal(content),
        responseId: response.id
      });
      
      // CRITICAL: Log ALL short responses that might be refusals
      if (content.length < 500) {
        console.warn('🚨 FULL OPENAI RESPONSE (potential refusal):', {
          '*** FULL CONTENT ***': content,
          contentLength: content.length,
          detectedAsRefusal: this.isContentPolicyRefusal(content),
          containsSorry: content.toLowerCase().includes('sorry'),
          containsCant: content.toLowerCase().includes("can't"),
          containsRefuse: content.toLowerCase().includes('refuse'),
          containsUnable: content.toLowerCase().includes('unable'),
          startsWithSorry: content.toLowerCase().startsWith("i'm sorry"),
          responseId: response.id
        });
      }
      
      if (this.isContentPolicyRefusal(content)) {
        console.warn('🚫 OpenAI content policy refusal detected:', {
          fullRefusalMessage: content,
          refusalPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
          promptLength: request.prompt.length,
          promptPreview: request.prompt.substring(0, 200) + '...'
        });
        this.trackFailure();
        throw this.createError(
          AI_ERROR_CODES.VALIDATION_ERROR, 
          'Content blocked by OpenAI safety filters - triggering fallback to alternate provider'
        );
      }

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

  private isContentPolicyRefusal(content: string): boolean {
    const refusalPhrases = [
      // Standard apology patterns
      "i'm sorry, but i can't fulfill this request",
      "i'm sorry, but i can't",
      "i'm sorry, i can't",
      "sorry, but i can't",
      "sorry, i can't",
      
      // Inability patterns - be more specific to avoid false positives
      "i can't help with that",
      "i can't help with",
      "i cannot provide",
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
      "offensive content",
      
      // OpenAI-specific patterns
      "i can't generate a text based on these instructions",
      "i can't provide content that",
      "i'm not able to create content",
      "i can't write content about"
    ];
    
    const normalizedContent = content.toLowerCase().trim();
    
    // Check for exact phrase matches
    const hasRefusalPhrase = refusalPhrases.some(phrase => normalizedContent.includes(phrase));
    
    // Enhanced logic: Check if there's substantial content despite disclaimers
    if (hasRefusalPhrase) {
      // Special handling for word count concerns
      if (normalizedContent.includes('word article') || normalizedContent.includes('word count')) {
        console.log('🔍 Detected word count concern in OpenAI response, checking for actual content...');
        
        // If OpenAI mentions word count but still provides content, it's likely not a refusal
        const hasSubstantialContent = content.length > 1000 && (
          normalizedContent.includes('title:') ||
          normalizedContent.includes('meta_description:') ||
          normalizedContent.includes('content:') ||
          normalizedContent.includes('introduction') ||
          normalizedContent.includes('conclusion')
        );
        
        if (hasSubstantialContent) {
          console.log('✅ OpenAI provided substantial content despite word count disclaimer - treating as valid response');
          return false; // Not a refusal
        }
      }
      
      // Look for article structure markers that indicate actual content
      const hasArticleStructure = [
        'title:',
        'meta_description:',
        'content:',
        '**title**',
        '**meta_description**',
        '**content**',
        '**introduction**',
        '**conclusion**'
      ].some(marker => normalizedContent.includes(marker));
      
      // Check content length - substantial content suggests it's not a refusal
      const isSubstantialContent = content.length > 1000;
      
      // Check for structured content with multiple sections
      const hasMultipleSections = (content.match(/\*\*[^*]+\*\*/g) || []).length > 3;
      
      // If we have article structure, substantial content, or multiple sections,
      // it's likely a disclaimer followed by actual content, not a refusal
      if (hasArticleStructure || (isSubstantialContent && hasMultipleSections)) {
        console.log('🔍 Detected disclaimer but found substantial content - not treating as refusal:', {
          hasArticleStructure,
          isSubstantialContent,
          hasMultipleSections,
          contentLength: content.length,
          refusalPhraseFound: refusalPhrases.find(phrase => normalizedContent.includes(phrase))
        });
        return false;
      }
    }
    
    // Check for exact phrase matches
    
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