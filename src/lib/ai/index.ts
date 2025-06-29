import { AIServiceManager } from './ai-service-manager';
import {
  AIGenerationRequest,
  GenerationResult,
  CostEstimate,
  ProviderHealth,
  AIProviderName,
  AI_PROVIDERS
} from './types';

// Export types for external use
export type {
  AIGenerationRequest,
  GenerationResult,
  CostEstimate,
  ProviderHealth,
  AIProviderName
} from './types';

export { AI_PROVIDERS } from './types';

// Mock AI service for development when no API keys are available
class MockAIService {
  getAvailableProviders(): AIProviderName[] {
    return [AI_PROVIDERS.ANTHROPIC]; // Return at least one provider for UI
  }

  async generateContent(request: AIGenerationRequest, preferredProvider?: AIProviderName): Promise<GenerationResult> {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate mock content based on the request
      const mockContent = this.generateMockContent(request);
      
      return {
        success: true,
        content: mockContent,
        attempts: [{
          provider: preferredProvider || AI_PROVIDERS.ANTHROPIC,
          success: true,
          tokensUsed: 1000,
          cost: 0.001,
          responseTime: 1000
        }],
        totalCost: 0.001,
        totalTokens: 1000,
        finalProvider: preferredProvider || AI_PROVIDERS.ANTHROPIC
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred in mock AI service';
      
      return {
        success: false,
        attempts: [{ 
          provider: preferredProvider || AI_PROVIDERS.ANTHROPIC,
          success: false,
          error: errorMessage,
          responseTime: 0
        }],
        totalCost: 0,
        totalTokens: 0,
        error: {
          code: 'MOCK_SERVICE_ERROR',
          message: errorMessage,
          provider: preferredProvider || AI_PROVIDERS.ANTHROPIC,
          retryable: false,
          originalError: error instanceof Error ? error : new Error(errorMessage)
        }
      };
    }
  }

  private generateMockContent(request: AIGenerationRequest): string {
    const paragraphs = [
      `**🤖 MOCK AI CONTENT - FOR TESTING PURPOSES**`,
      ``,
      `This is mock content generated because no AI API keys are configured. To get real AI-generated content, please configure your API keys in the environment variables (ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_API_KEY).`,
      ``,
      `**Original Request:**`,
      `- Prompt: "${request.prompt?.substring(0, 100)}..."`,
      `- Template: ${request.template || 'default'}`,
      `- Tone: ${request.tone || 'professional'}`,
      `- Keywords: ${request.keywords?.join(', ') || 'none specified'}`,
      ``,
      `**Sample Article Content:**`,
      ``,
      `This mock article demonstrates the structure that would be generated by a real AI service. In production with proper API keys, this content would be replaced with high-quality, AI-generated articles tailored to your specific requirements.`,
      
      `The article template "${request.template || 'default'}" would influence the structure and style of the content. The requested tone "${request.tone || 'professional'}" would affect the writing style and voice throughout the piece.`,
      
      `Target keywords such as: ${request.keywords?.join(', ') || 'sample keywords'} would be naturally integrated throughout the content for optimal SEO performance. The AI would ensure proper keyword density and semantic relevance.`,
      
      `The content would be comprehensive, engaging, and optimized for both search engines and human readers. Real AI-generated content includes proper headings, subheadings, and structured information that meets your specific requirements.`,
      
      `To start generating real content, configure at least one AI provider API key in your environment variables and restart the application.`
    ];

    return paragraphs.join('\n');
  }

  async getCostEstimates(prompt: string, template?: string): Promise<CostEstimate[]> {
    return [
      {
        provider: AI_PROVIDERS.ANTHROPIC,
        estimatedCost: 0.001,
        estimatedTokens: 1000,
        model: 'claude-3-sonnet-20240229'
      }
    ];
  }

  getRecommendedProvider(template?: string): AIProviderName {
    return AI_PROVIDERS.ANTHROPIC;
  }

  async getProvidersHealth(): Promise<Record<AIProviderName, ProviderHealth>> {
    return {
      [AI_PROVIDERS.ANTHROPIC]: {
        isHealthy: true,
        responseTime: 500,
        lastChecked: new Date(),
        errorRate: 0,
        successfulRequests: 100,
        failedRequests: 0
      },
      [AI_PROVIDERS.OPENAI]: {
        isHealthy: true,
        responseTime: 600,
        lastChecked: new Date(),
        errorRate: 0,
        successfulRequests: 50,
        failedRequests: 0
      },
      [AI_PROVIDERS.GOOGLE]: {
        isHealthy: true,
        responseTime: 550,
        lastChecked: new Date(),
        errorRate: 0,
        successfulRequests: 75,
        failedRequests: 0
      }
    };
  }

  async validateAllProviders(): Promise<Record<AIProviderName, boolean>> {
    return {
      [AI_PROVIDERS.ANTHROPIC]: true,
      [AI_PROVIDERS.OPENAI]: true,
      [AI_PROVIDERS.GOOGLE]: true
    };
  }
}

// Singleton AI service instance
let aiServiceInstance: AIServiceManager | MockAIService | null = null;

/**
 * Get or create the AI service manager instance
 */
export function getAIService(): AIServiceManager | MockAIService {
  if (!aiServiceInstance) {
    // Load configuration from environment variables
    const config = {
      anthropicKey: process.env.ANTHROPIC_API_KEY || '',
      openaiKey: process.env.OPENAI_API_KEY || '',
      googleKey: process.env.GOOGLE_API_KEY || '',
      defaultProvider: (process.env.AI_PROVIDER_DEFAULT as AIProviderName) || AI_PROVIDERS.ANTHROPIC,
      fallbackEnabled: process.env.AI_FALLBACK_ENABLED !== 'false', // Default to true
      costTrackingEnabled: process.env.AI_COST_TRACKING_ENABLED !== 'false', // Default to true
      rateLimitPerMinute: parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '60'),
      rateLimitPerHour: parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || '1000'),
      maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3'),
      timeout: parseInt(process.env.AI_TIMEOUT_SECONDS || '30') * 1000
    };

    // Check if we have API keys available
    const hasApiKeys = config.anthropicKey || config.openaiKey || config.googleKey;
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Debug logging to understand environment state
    console.log('🔍 AI Service Configuration Debug:');
    console.log('- Environment:', process.env.NODE_ENV);
    console.log('- Has Anthropic Key:', !!config.anthropicKey, config.anthropicKey ? `(length: ${config.anthropicKey.length})` : '(empty)');
    console.log('- Has OpenAI Key:', !!config.openaiKey, config.openaiKey ? `(length: ${config.openaiKey.length})` : '(empty)');
    console.log('- Has Google Key:', !!config.googleKey, config.googleKey ? `(length: ${config.googleKey.length})` : '(empty)');
    console.log('- Has Any API Keys:', hasApiKeys);

    if (!hasApiKeys) {
      console.warn(`⚠️  NO AI API KEYS DETECTED! Using mock AI service.`);
      console.warn('   This means you will get mock content instead of real AI-generated content.');
      console.warn('   Please check your environment variables: ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY');
      aiServiceInstance = new MockAIService();
    } else {
      console.log('✅ AI API keys detected. Initializing real AI service manager.');
      aiServiceInstance = new AIServiceManager(config);
    }
  }

  return aiServiceInstance;
}

/**
 * Generate content using the AI service with intelligent provider selection
 */
export async function generateContent(
  prompt: string,
  options: {
    template?: string;
    tone?: string;
    length?: string;
    keywords?: string[];
    preferredProvider?: AIProviderName;
  } = {}
): Promise<GenerationResult> {
  const aiService = getAIService();
  
  const request: AIGenerationRequest = {
    prompt,
    template: options.template,
    tone: options.tone,
    length: options.length,
    keywords: options.keywords
  };

  return aiService.generateContent(request, options.preferredProvider);
}

/**
 * Get cost estimates for content generation
 */
export async function getCostEstimates(
  prompt: string,
  template?: string
): Promise<CostEstimate[]> {
  const aiService = getAIService();
  return aiService.getCostEstimates(prompt, template);
}

/**
 * Get the recommended provider for a specific template
 */
export function getRecommendedProvider(template?: string): AIProviderName {
  const aiService = getAIService();
  return aiService.getRecommendedProvider(template);
}

/**
 * Get health status of all AI providers
 */
export async function getProvidersHealth(): Promise<Record<AIProviderName, ProviderHealth>> {
  const aiService = getAIService();
  return aiService.getProvidersHealth();
}

/**
 * Validate all provider configurations
 */
export async function validateProviders(): Promise<Record<AIProviderName, boolean>> {
  const aiService = getAIService();
  return aiService.validateAllProviders();
}

/**
 * Get list of available AI providers
 */
export function getAvailableProviders(): AIProviderName[] {
  const aiService = getAIService();
  return aiService.getAvailableProviders();
}

/**
 * Reset the AI service instance (useful for testing)
 */
export function resetAIService(): void {
  aiServiceInstance = null;
}

// Utility functions

/**
 * Format cost as currency string
 */
export function formatCost(cost: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  }).format(cost);
}

/**
 * Calculate estimated reading time based on word count
 */
export function calculateReadingTime(wordCount: number): number {
  // Average reading speed: 200 words per minute
  return Math.ceil(wordCount / 200);
}

/**
 * Estimate word count from character count
 */
export function estimateWordCount(text: string): number {
  // Average word length: 5 characters
  return Math.ceil(text.length / 5);
}

/**
 * Get word count range for length setting
 */
export function getWordCountRange(length?: string): { min: number; max: number } {
  switch (length) {
    case 'Short (500-800)':
      return { min: 500, max: 800 };
    case 'Medium (800-1500)':
      return { min: 800, max: 1500 };
    case 'Long (1500-3000)':
      return { min: 1500, max: 3000 };
    case 'Extended (3000+)':
      return { min: 3000, max: 5000 };
    default:
      return { min: 800, max: 1500 }; // Default to medium
  }
} 