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

      const content = response.candidates[0]?.content?.parts[0]?.text || '';

      // Check for content policy refusals
      // ENHANCED: Log ALL Google responses for debugging
      console.log('🔍 Google response preview:', {
        contentLength: content.length,
        firstLine: content.split('\n')[0]?.substring(0, 100) || 'Empty content',
        isRefusal: this.isContentPolicyRefusal(content),
        finishReason: response.candidates[0]?.finishReason
      });
      
      // CRITICAL: Log ALL short responses that might be refusals
      if (content.length < 500) {
        console.warn('🚨 FULL GOOGLE RESPONSE (potential refusal):', {
          '*** FULL CONTENT ***': content,
          contentLength: content.length,
          detectedAsRefusal: this.isContentPolicyRefusal(content),
          containsSorry: content.toLowerCase().includes('sorry'),
          containsCant: content.toLowerCase().includes("can't"),
          containsRefuse: content.toLowerCase().includes('refuse'),
          containsUnable: content.toLowerCase().includes('unable'),
          startsWithSorry: content.toLowerCase().startsWith("i'm sorry"),
          finishReason: response.candidates[0]?.finishReason,
          safetyRatings: response.candidates[0]?.safetyRatings
        });
      }
      
      if (this.isContentPolicyRefusal(content)) {
        console.warn('🚫 Google content policy refusal detected:', {
          fullRefusalMessage: content,
          refusalPreview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
          promptLength: request.prompt.length,
          promptPreview: request.prompt.substring(0, 200) + '...'
        });
        this.trackFailure();
        throw this.createError(
          AI_ERROR_CODES.VALIDATION_ERROR, 
          'Content blocked by Google safety filters - triggering fallback to alternate provider'
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
      
      // Google-specific patterns
      "i can't generate content that",
      "i'm designed to be helpful",
      "i'm not able to create content",
      "i can't assist with requests"
    ];
    
    const normalizedContent = content.toLowerCase().trim();
    
    // Check for exact phrase matches
    const hasRefusalPhrase = refusalPhrases.some(phrase => normalizedContent.includes(phrase));
    
    // Enhanced logic: Check if there's substantial content despite disclaimers
    if (hasRefusalPhrase) {
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
        console.log('🔍 Google: Detected disclaimer but found substantial content - not treating as refusal:', {
          hasArticleStructure,
          isSubstantialContent,
          hasMultipleSections,
          contentLength: content.length,
          refusalPhraseFound: refusalPhrases.find(phrase => normalizedContent.includes(phrase))
        });
        return false;
      }
    }
    
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