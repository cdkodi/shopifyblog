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

// Singleton AI service instance
let aiServiceInstance: AIServiceManager | null = null;

/**
 * Get or create the AI service manager instance
 */
export function getAIService(): AIServiceManager {
  if (!aiServiceInstance) {
    // Load configuration from environment variables
    const config = {
      anthropicKey: process.env.ANTHROPIC_API_KEY!,
      openaiKey: process.env.OPENAI_API_KEY!,
      googleKey: process.env.GOOGLE_API_KEY!,
      defaultProvider: (process.env.AI_PROVIDER_DEFAULT as AIProviderName) || AI_PROVIDERS.ANTHROPIC,
      fallbackEnabled: process.env.AI_FALLBACK_ENABLED === 'true',
      costTrackingEnabled: process.env.AI_COST_TRACKING_ENABLED === 'true',
      rateLimitPerMinute: parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '60'),
      rateLimitPerHour: parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || '1000'),
      maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3'),
      timeout: parseInt(process.env.AI_TIMEOUT_SECONDS || '30') * 1000
    };

    // Validate required environment variables
    if (!config.anthropicKey && !config.openaiKey && !config.googleKey) {
      throw new Error('At least one AI provider API key must be configured');
    }

    aiServiceInstance = new AIServiceManager(config);
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