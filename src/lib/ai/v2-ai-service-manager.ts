// V2 AI Service Manager - Enhanced for Topic Integration

import { AIServiceManager } from './ai-service-manager';
import { V2TopicPromptBuilder } from './v2-topic-prompt-builder';
import { generationJobsService } from '@/lib/supabase/generation-jobs';
import { 
  TopicGenerationRequest, 
  V2GenerationResult, 
  GenerationProgress,
  V2_ERROR_CODES,
  SEO_CONSTANTS,
  IV2AIServiceManager
} from './v2-types';
import { AIGenerationRequest, ProviderError } from './types';

export class V2AIServiceManager extends AIServiceManager implements IV2AIServiceManager {
  private promptBuilder: V2TopicPromptBuilder;

  constructor(config: any) {
    super(config);
    this.promptBuilder = new V2TopicPromptBuilder();
  }

  /**
   * Generate content directly from topic object with V2 enhancements
   */
  async generateFromTopic(request: TopicGenerationRequest): Promise<V2GenerationResult> {
    console.log('🚀 V2 Topic Generation started:', request.topic.title);
    
    try {
      // Validate topic data
      if (!this.promptBuilder.validateTopicData(request.topic)) {
        throw this.createV2Error(V2_ERROR_CODES.TOPIC_INVALID, 'Invalid topic data provided');
      }

      // Build optimized prompt based on request type
      let prompt: string;
      if (request.optimizeForSEO) {
        prompt = await this.promptBuilder.buildSEOOptimizedPrompt(request);
      } else if (request.topic.template) {
        prompt = await this.promptBuilder.buildTemplateSpecificPrompt(request);
      } else {
        prompt = await this.promptBuilder.buildPrompt(request);
      }

      console.log('📝 Generated prompt length:', prompt.length);

      // Convert to standard AI generation request
      const aiRequest: AIGenerationRequest = {
        prompt,
        template: request.topic.template || 'article',
        tone: request.topic.tone || 'professional',
        length: request.topic.length || 'medium',
        keywords: this.promptBuilder.extractKeywords(request.topic),
        options: {
          maxTokens: this.calculateMaxTokens(request),
          temperature: this.getOptimalTemperature(request),
          ...request.options
        }
      };

      // Get optimal provider for this topic
      const optimalProvider = await this.getOptimalProvider(request.topic);
      console.log('🎯 Using provider:', optimalProvider);

      // Generate content using base service
      const baseResult = await this.generateContent(aiRequest, optimalProvider as any);

      if (!baseResult.success || !baseResult.content) {
        // Extract proper error message from baseResult.error
        let errorMessage = 'Unknown error';
        if (baseResult.error) {
          if (typeof baseResult.error === 'object') {
            errorMessage = baseResult.error.message || baseResult.error.toString();
          } else if (typeof baseResult.error === 'string') {
            errorMessage = baseResult.error;
          } else {
            errorMessage = String(baseResult.error);
          }
        }
        
        throw this.createV2Error(
          V2_ERROR_CODES.PROVIDER_ERROR, 
          `Content generation failed: ${errorMessage}`
        );
      }

      // Parse and enhance the result
      const parsedContent = this.parseGeneratedContent(baseResult.content);
      const contentMetadata = this.extractContentMetadata(parsedContent.content);
      const seoAnalysis = await this.analyzeSEOQuality(parsedContent, request);

      // Build V2 result with enhanced metadata
      const v2Result: V2GenerationResult = {
        ...baseResult,
        generationMetadata: {
          topicId: request.topic.id,
          promptVersion: 'v2.1',
          wordCount: contentMetadata.wordCount,
          readingTime: contentMetadata.readingTime,
          seoScore: seoAnalysis.overallScore,
          keywordDensity: seoAnalysis.keywordDensity,
          contentStructure: {
            hasIntroduction: this.hasIntroduction(parsedContent.content),
            hasConclusion: this.hasConclusion(parsedContent.content),
            sectionCount: contentMetadata.sections,
            headingCount: contentMetadata.headings.length
          }
        },
        parsedContent
      };

      // Validate word count target if specified
      if (request.targetWordCount) {
        const variance = Math.abs(contentMetadata.wordCount - request.targetWordCount) / request.targetWordCount;
        if (variance > 0.2) { // Allow 20% variance
          console.warn('⚠️ Word count target not met:', {
            target: request.targetWordCount,
            actual: contentMetadata.wordCount,
            variance: `${(variance * 100).toFixed(1)}%`
          });
        }
      }

      console.log('✅ V2 Generation completed:', {
        wordCount: contentMetadata.wordCount,
        seoScore: seoAnalysis.overallScore,
        provider: baseResult.finalProvider
      });

      return v2Result;

    } catch (error) {
      console.error('❌ V2 Generation failed:', error);
      
      // Enhanced error handling with proper serialization
      let errorMessage = 'Generation failed';
      let errorCode: string = V2_ERROR_CODES.TEMPLATE_NOT_SUPPORTED;
      
      if (error instanceof Error) {
        // Handle standard Error objects
        errorMessage = error.message;
        console.error('❌ Error details:', { message: error.message, stack: error.stack });
      } else if (typeof error === 'object' && error !== null) {
        // Handle ProviderError or other error objects
        const errorObj = error as any;
        if (errorObj.message) {
          errorMessage = errorObj.message;
        } else if (errorObj.error) {
          errorMessage = errorObj.error;
        } else {
          // Last resort - serialize the error object
          errorMessage = JSON.stringify(error);
        }
        
        // Extract error code if available
        if (errorObj.code) {
          errorCode = errorObj.code;
        }
        
        console.error('❌ Error object details:', {
          message: errorObj.message,
          code: errorObj.code,
          provider: errorObj.provider,
          retryable: errorObj.retryable,
          originalError: errorObj.originalError
        });
      } else {
        // Handle primitive types
        errorMessage = String(error);
        console.error('❌ Primitive error:', error);
      }
      
      // Provide more specific error messages based on common patterns
      if (errorMessage.includes('safety filters') || errorMessage.includes('content policy')) {
        errorMessage = 'Content generation blocked by AI safety filters. Please try a different topic or adjust your content requirements.';
        errorCode = V2_ERROR_CODES.VALIDATION_ERROR;
      } else if (errorMessage.includes('rate limit')) {
        errorMessage = 'AI service rate limit exceeded. Please try again in a few minutes.';
        errorCode = V2_ERROR_CODES.RATE_LIMIT_EXCEEDED;
      } else if (errorMessage.includes('API key') || errorMessage.includes('unauthorized')) {
        errorMessage = 'AI service authentication failed. Please check your API configuration.';
        errorCode = V2_ERROR_CODES.API_KEY_INVALID;
      } else if (errorMessage.includes('quota') || errorMessage.includes('insufficient')) {
        errorMessage = 'AI service quota exceeded. Please check your subscription limits.';
        errorCode = V2_ERROR_CODES.INSUFFICIENT_QUOTA;
      } else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        errorMessage = 'Network timeout connecting to AI service. Please try again.';
        errorCode = V2_ERROR_CODES.NETWORK_ERROR;
      } else if (errorMessage.includes('overloaded') || errorMessage.includes('503') || errorMessage.includes('502')) {
        errorMessage = 'AI service is temporarily overloaded. Please try again in a few minutes.';
        errorCode = V2_ERROR_CODES.MODEL_OVERLOADED;
      } else if (errorMessage.includes('All providers failed')) {
        errorMessage = 'All AI providers failed to generate content. This may be due to content policy restrictions or temporary service issues. Please try again with a different topic or contact support.';
        errorCode = V2_ERROR_CODES.PROVIDER_ERROR;
      }
      
      throw this.createV2Error(errorCode, errorMessage);
    }
  }

  /**
   * Queue generation for background processing
   */
  async queueGeneration(request: TopicGenerationRequest): Promise<{ jobId: string; estimatedCompletion: Date }> {
    const jobId = this.generateJobId();
    const estimatedDuration = this.estimateGenerationTime(request);
    const estimatedCompletion = new Date(Date.now() + estimatedDuration * 1000);

    // Create job in database
    await generationJobsService.createJob(jobId, request);

    // Start background processing
    this.processGenerationJob(jobId, request).catch(error => {
      console.error('Background generation failed:', error);
      generationJobsService.failJob(jobId, error.message).catch(dbError => {
        console.error('Failed to update job failure in database:', dbError);
      });
    });

    return { jobId, estimatedCompletion };
  }

  /**
   * Get current generation progress
   */
  async getGenerationProgress(jobId: string): Promise<GenerationProgress> {
    return await generationJobsService.getJobProgress(jobId);
  }

  /**
   * Cancel ongoing generation
   */
  async cancelGeneration(jobId: string): Promise<void> {
    await generationJobsService.cancelJob(jobId);
  }

  /**
   * Generate content for multiple topics (batch operation)
   */
  async generateMultipleTopics(requests: TopicGenerationRequest[]): Promise<{ jobIds: string[]; batchId: string }> {
    const batchId = this.generateJobId('batch');
    const jobIds: string[] = [];

    for (const request of requests) {
      const { jobId } = await this.queueGeneration(request);
      jobIds.push(jobId);
    }

    return { jobIds, batchId };
  }

  /**
   * Get batch progress for multiple generations
   */
  async getBatchProgress(batchId: string): Promise<GenerationProgress[]> {
    return await generationJobsService.getBatchProgress(batchId);
  }

  /**
   * Optimize existing content using V2 enhancements
   */
  async optimizeContent(content: string, request: TopicGenerationRequest): Promise<string> {
    const optimizationPrompt = `Optimize the following content for SEO and readability:

Original Content:
${content}

Optimization Requirements:
- Target keywords: ${this.promptBuilder.extractKeywords(request.topic).join(', ')}
- Improve keyword density to optimal range (1-2%)
- Enhance readability and structure
- Ensure proper heading hierarchy
- Maintain the original tone: ${request.topic.tone || 'professional'}
- Target word count: ${request.targetWordCount || 'maintain current length'}

Please provide the optimized version:`;

    const aiRequest: AIGenerationRequest = {
      prompt: optimizationPrompt,
      template: 'optimization',
      options: { temperature: 0.3 } // Lower temperature for optimization
    };

    const result = await this.generateContent(aiRequest);
    return result.content || content; // Return original if optimization fails
  }

  /**
   * Validate content quality against V2 standards
   */
  async validateContentQuality(content: string, request: TopicGenerationRequest): Promise<any> {
    const metadata = this.extractContentMetadata(content);
    const keywords = this.promptBuilder.extractKeywords(request.topic);
    const seoAnalysis = await this.analyzeSEOQuality({ content, title: '', metaDescription: '', headings: [], keywords }, request);

    return {
      overallScore: this.calculateOverallQuality(metadata, seoAnalysis),
      wordCount: metadata.wordCount,
      readingTime: metadata.readingTime,
      seoScore: seoAnalysis.overallScore,
      keywordOptimization: seoAnalysis.keywordDensity,
      issues: this.identifyQualityIssues(metadata, seoAnalysis, request),
      recommendations: this.generateQualityRecommendations(metadata, seoAnalysis)
    };
  }

  /**
   * Get optimal provider for topic-based generation
   */
  async getOptimalProvider(topic: TopicGenerationRequest['topic']): Promise<string> {
    const template = topic.template || 'article';
    return this.getRecommendedProvider(template);
  }

  /**
   * Estimate generation cost for topic request
   */
  async estimateGenerationCost(request: TopicGenerationRequest): Promise<number> {
    const prompt = await this.promptBuilder.buildPrompt(request);
    const estimates = await this.getCostEstimates(prompt, request.topic.template);
    return estimates[0]?.estimatedCost || 0.05; // Default fallback cost
  }

  /**
   * Get generation statistics and analytics
   */
  async getGenerationStats(timeframe: 'hour' | 'day' | 'week' | 'month'): Promise<{
    totalGenerations: number;
    successRate: number;
    averageTime: number;
    averageCost: number;
    topTemplates: Array<{ template: string; count: number }>;
    errorBreakdown: Record<string, number>;
  }> {
    // In a real implementation, this would query a metrics database
    // For now, return mock data
    return {
      totalGenerations: 150,
      successRate: 0.94,
      averageTime: 45,
      averageCost: 0.08,
      topTemplates: [
        { template: 'Product Showcase', count: 45 },
        { template: 'How-to Guide', count: 38 },
        { template: 'Review Article', count: 32 }
      ],
      errorBreakdown: {
        'RATE_LIMIT_EXCEEDED': 3,
        'MODEL_OVERLOADED': 2,
        'VALIDATION_ERROR': 4
      }
    };
  }

  // Private helper methods

  private async processGenerationJob(jobId: string, request: TopicGenerationRequest): Promise<void> {
    console.log('🚀 Starting background generation job:', jobId);
    
    try {
      // Phase 1: Analyzing
      await generationJobsService.updateJobProgress(jobId, {
        phase: 'analyzing',
        percentage: 20,
        currentStep: 'Analyzing topic and requirements'
      });

      // Phase 2: Generating (use the working direct generation)
      await generationJobsService.updateJobProgress(jobId, {
        phase: 'writing',
        percentage: 60,
        currentStep: 'Generating article content'
      });

      console.log('📝 Calling direct generation for job:', jobId);
      const result = await this.generateFromTopic(request);
      console.log('✅ Direct generation completed for job:', jobId);

      // Phase 3: Article Creation
      await generationJobsService.updateJobProgress(jobId, {
        phase: 'finalizing',
        percentage: 90,
        currentStep: 'Creating article in database'
      });

      // Import ArticleService and create article
      const { ArticleService } = await import('@/lib/supabase/articles');

      const articleData = {
        title: result.parsedContent?.title || request.topic.title,
        content: result.parsedContent?.content || result.content || '',
        metaDescription: result.parsedContent?.metaDescription || '',
        slug: this.generateSlugFromTitle(result.parsedContent?.title || request.topic.title),
        status: 'ready_for_editorial' as const,
        targetKeywords: result.parsedContent?.keywords || this.promptBuilder.extractKeywords(request.topic),
        seoScore: result.generationMetadata?.seoScore || 0,
        wordCount: result.generationMetadata?.wordCount || 0,
        readingTime: result.generationMetadata?.readingTime || 0,
        sourceTopicId: request.topic.id
      };

      console.log('📝 Creating article in database for job:', jobId, { 
        title: articleData.title,
        slug: articleData.slug,
        hasContent: !!articleData.content,
        contentLength: articleData.content.length,
        wordCount: articleData.wordCount,
        seoScore: articleData.seoScore
      });
      const articleResult = await ArticleService.createArticle(articleData);
      
      console.log('📊 Article creation result for job:', jobId, { 
        success: !articleResult.error, 
        error: articleResult.error,
        hasData: !!articleResult.data,
        dataKeys: articleResult.data ? Object.keys(articleResult.data) : []
      });
      
      if (articleResult.error || !articleResult.data) {
        console.error('❌ Failed to create article for job:', jobId, 'Error:', articleResult.error);
        throw new Error(`Failed to create article: ${articleResult.error}`);
      }

      console.log('✅ Article created successfully for job:', jobId, 'Article ID:', articleResult.data.id);

      // Phase 4: Completion with article linking
      await generationJobsService.updateJobProgress(jobId, {
        percentage: 100,
        currentStep: 'Article created successfully',
        articleId: articleResult.data.id
      });

      // Mark job as completed with result AND update article_id field
      await generationJobsService.completeJob(jobId, result);
      
      // Ensure article_id is set in the generation job
      await generationJobsService.updateJobProgress(jobId, {
        articleId: articleResult.data.id
      });
      
      console.log('🎉 Job completed successfully:', jobId, 'with article:', articleResult.data.id);

    } catch (error) {
      console.error('❌ Background generation job failed:', jobId, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      await generationJobsService.failJob(jobId, errorMessage);
    }
  }



  private generateJobId(prefix = 'job'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private estimateGenerationTime(request: TopicGenerationRequest): number {
    const baseTime = 30; // seconds
    const wordMultiplier = (request.targetWordCount || 1000) / 1000;
    const complexityMultiplier = request.optimizeForSEO ? 1.5 : 1.0;
    
    return Math.round(baseTime * wordMultiplier * complexityMultiplier);
  }

  private calculateMaxTokens(request: TopicGenerationRequest): number {
    const estimatedWords = this.promptBuilder.estimateWordCount(request);
    return Math.ceil(estimatedWords * 1.5); // 1.5 tokens per word estimate
  }

  private getOptimalTemperature(request: TopicGenerationRequest): number {
    const template = request.topic.template;
    
    // Different templates benefit from different creativity levels
    const temperatureMap: Record<string, number> = {
      'Artist Showcase': 0.8,
      'Product Showcase': 0.7,
      'How-to Guide': 0.5,
      'Buying Guide': 0.6,
      'Review Article': 0.7,
      'Industry Trends': 0.6
    };

    return temperatureMap[template || ''] || 0.7;
  }

  private parseGeneratedContent(content: string): {
    title: string;
    metaDescription: string;
    content: string;
    headings: string[];
    keywords: string[];
  } {
    const titleMatch = content.match(/TITLE:\s*(.+?)(?:\n|$)/i);
    const metaMatch = content.match(/META_DESCRIPTION:\s*(.+?)(?:\n|$)/i);
    const contentMatch = content.match(/CONTENT:\s*([\s\S]+?)(?:\n\n---|\n\n\[|\n\nNote:|$)/i);

    const mainContent = contentMatch?.[1]?.trim() || content;
    const headings = this.extractHeadings(mainContent);
    const keywords = this.extractKeywordsFromContent(mainContent);

    return {
      title: titleMatch?.[1]?.trim() || 'Generated Article',
      metaDescription: metaMatch?.[1]?.trim() || '',
      content: mainContent,
      headings,
      keywords
    };
  }

  private extractContentMetadata(content: string): {
    wordCount: number;
    readingTime: number;
    headings: string[];
    sections: number;
  } {
    const words = content.trim().split(/\s+/).length;
    const readingTime = Math.ceil(words / 200); // 200 WPM
    const headings = this.extractHeadings(content);
    const sections = headings.filter(h => h.startsWith('#')).length || 1;

    return {
      wordCount: words,
      readingTime,
      headings,
      sections
    };
  }

  private extractHeadings(content: string): string[] {
    const headingRegex = /^#+\s+(.+)$/gm;
    const matches = content.match(headingRegex) || [];
    return matches.map(h => h.replace(/^#+\s+/, ''));
  }

  private extractKeywordsFromContent(content: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const words = content.toLowerCase().split(/\W+/);
    const wordFreq: Record<string, number> = {};
    
    words.forEach(word => {
      if (word.length > 3) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private async analyzeSEOQuality(parsedContent: any, request: TopicGenerationRequest): Promise<{
    overallScore: number;
    keywordDensity: Record<string, number>;
  }> {
    const keywords = this.promptBuilder.extractKeywords(request.topic);
    const content = parsedContent.content.toLowerCase();
    const words = content.split(/\s+/).length;
    
    const keywordDensity: Record<string, number> = {};
    keywords.forEach(keyword => {
      const occurrences = (content.match(new RegExp(keyword.toLowerCase(), 'g')) || []).length;
      keywordDensity[keyword] = (occurrences / words) * 100;
    });

    const avgDensity = Object.values(keywordDensity).reduce((a, b) => a + b, 0) / keywords.length;
    const optimalDensity = avgDensity >= SEO_CONSTANTS.OPTIMAL_KEYWORD_DENSITY.MIN && 
                          avgDensity <= SEO_CONSTANTS.OPTIMAL_KEYWORD_DENSITY.MAX;
    
    const overallScore = optimalDensity ? 85 : 70;

    return { overallScore, keywordDensity };
  }

  private hasIntroduction(content: string): boolean {
    return content.length > 200 && !content.startsWith('#');
  }

  private hasConclusion(content: string): boolean {
    const lastParagraph = content.split('\n\n').pop() || '';
    const conclusionWords = ['conclusion', 'summary', 'finally', 'in summary', 'to conclude'];
    return conclusionWords.some(word => lastParagraph.toLowerCase().includes(word));
  }

  private calculateOverallQuality(metadata: any, seoAnalysis: any): number {
    let score = 100;
    
    // Word count check
    if (metadata.wordCount < 800) score -= 10;
    if (metadata.wordCount > 2000) score -= 5;
    
    // SEO score integration
    score = (score + seoAnalysis.overallScore) / 2;
    
    return Math.max(0, Math.min(100, score));
  }

  private identifyQualityIssues(metadata: any, seoAnalysis: any, request: TopicGenerationRequest): string[] {
    const issues: string[] = [];
    
    if (metadata.wordCount < 800) {
      issues.push('Content is too short for optimal SEO');
    }
    
    if (seoAnalysis.overallScore < 70) {
      issues.push('SEO optimization could be improved');
    }
    
    if (metadata.headings.length < 2) {
      issues.push('More headings needed for better structure');
    }
    
    return issues;
  }

  private generateQualityRecommendations(metadata: any, seoAnalysis: any): string[] {
    const recommendations: string[] = [];
    
    if (metadata.wordCount < 800) {
      recommendations.push('Add more detailed examples and explanations');
    }
    
    if (seoAnalysis.overallScore < 80) {
      recommendations.push('Improve keyword placement and density');
    }
    
    recommendations.push('Add more subheadings for better readability');
    
    return recommendations;
  }

  private createV2Error(code: string, message: string): ProviderError {
    return {
      code,
      message,
      provider: 'v2-service',
      retryable: false
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateSlugFromTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }
} 