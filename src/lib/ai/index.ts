// AI Service Module - V2 Enhanced

// V1 Exports (existing)
export { AIServiceManager } from './ai-service-manager';
export * from './types';

// V2 Exports (new)
export { V2AIServiceManager } from './v2-ai-service-manager';
export { V2TopicPromptBuilder } from './v2-topic-prompt-builder';
export { V2GenerationQueue } from './generation-queue';
export { V2ContentQualityAnalyzer } from './content-quality-analyzer';
export * from './v2-types';

// V2 Factory for easy instantiation
import { AIServiceManager } from './ai-service-manager';
import { V2AIServiceManager } from './v2-ai-service-manager';
import { V2GenerationQueue } from './generation-queue';
import { V2ContentQualityAnalyzer } from './content-quality-analyzer';

interface V2ServiceConfig {
  anthropicKey: string;
  openaiKey: string;
  googleKey: string;
  enableBackgroundProcessing?: boolean;
  maxConcurrentJobs?: number;
}

/**
 * Factory function to create fully configured V2 AI service
 */
export function createV2AIService(config: V2ServiceConfig) {
  const aiServiceManager = new V2AIServiceManager({
    anthropicKey: config.anthropicKey,
    openaiKey: config.openaiKey,
    googleKey: config.googleKey,
    defaultProvider: 'anthropic',
    fallbackEnabled: true,
    costTrackingEnabled: true,
    rateLimitPerMinute: 60,
    rateLimitPerHour: 1000,
    maxRetries: 3,
    timeout: 120000 // Increased to 120 seconds (2 minutes) for content generation
  });

  const generationQueue = config.enableBackgroundProcessing 
    ? new V2GenerationQueue() 
    : null;

  const qualityAnalyzer = new V2ContentQualityAnalyzer();

  return {
    aiServiceManager,
    generationQueue,
    qualityAnalyzer,
    
    // Convenience methods
    async generateFromTopic(request: any) {
      return aiServiceManager.generateFromTopic(request);
    },
    
    async queueGeneration(request: any) {
      if (!generationQueue) {
        throw new Error('Background processing not enabled');
      }
      return aiServiceManager.queueGeneration(request);
    },
    
    async analyzeContent(content: string, request: any) {
      return qualityAnalyzer.analyzeContent(content, request);
    }
  };
}

/**
 * Default V2 service instance for immediate use
 */
let defaultV2Service: ReturnType<typeof createV2AIService> | null = null;

export function getDefaultV2Service(): ReturnType<typeof createV2AIService> {
  if (!defaultV2Service) {
    const config = {
      anthropicKey: process.env.ANTHROPIC_API_KEY || '',
      openaiKey: process.env.OPENAI_API_KEY || '',
      googleKey: process.env.GOOGLE_AI_KEY || '',
      enableBackgroundProcessing: true,
      maxConcurrentJobs: 3
    };
    
    defaultV2Service = createV2AIService(config);
  }
  
  return defaultV2Service;
}

// Legacy V1 compatibility
export const aiServiceManager = new AIServiceManager({
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  openaiKey: process.env.OPENAI_API_KEY || '',
  googleKey: process.env.GOOGLE_AI_KEY || ''
});

// Legacy V1 getAIService function for backward compatibility
export function getAIService() {
  return aiServiceManager;
}

// Export types for convenience
export type {
  TopicGenerationRequest,
  V2GenerationResult,
  GenerationProgress,
  GenerationJob,
  ContentQualityAnalysis
} from './v2-types'; 