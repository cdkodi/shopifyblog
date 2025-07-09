import { DataForSEOService } from './dataforseo-service';
import { SEOResearchResult, KeywordSuggestion, KeywordData, SEOServiceHealth } from './types';

export class SEOServiceManager {
  private static instance: SEOServiceManager;
  private dataForSEOService: DataForSEOService | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): SEOServiceManager {
    if (!SEOServiceManager.instance) {
      SEOServiceManager.instance = new SEOServiceManager();
    }
    return SEOServiceManager.instance;
  }

  public initialize(): void {
    try {
      const login = process.env.DATAFORSEO_LOGIN || process.env.DATAFORSEO_USERNAME;
      const password = process.env.DATAFORSEO_PASSWORD;

      if (!login || !password) {
        console.warn('DataForSEO credentials not found. SEO features will be disabled.');
        this.initialized = false;
        return;
      }

      this.dataForSEOService = new DataForSEOService({
        apiLogin: login,
        apiPassword: password,
        locationId: parseInt(process.env.DATAFORSEO_LOCATION_ID || '2356'), // India default
        languageId: process.env.DATAFORSEO_LANGUAGE_ID || 'en'
      });
      this.initialized = true;
      console.log('SEO service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SEO service:', error);
      this.initialized = false;
    }
  }

  public isInitialized(): boolean {
    return this.initialized && this.dataForSEOService !== null;
  }

  public isAvailable(): boolean {
    return this.isInitialized();
  }

  public async getKeywordSuggestions(
    keyword: string,
    limit: number = 50
  ): Promise<KeywordSuggestion[]> {
    if (!this.isInitialized()) {
      throw new Error('SEO service not initialized');
    }
    
    return this.dataForSEOService!.getKeywordSuggestions(keyword, limit);
  }

  /**
   * Get keyword suggestions for a topic
   */
  async getKeywordSuggestionsForTopic(topic: string, limit?: number): Promise<KeywordSuggestion[]> {
    if (!this.dataForSEOService) {
      throw new Error('SEO service not initialized');
    }

    return this.dataForSEOService.getKeywordSuggestions(topic, limit);
  }

  /**
   * Get detailed keyword analysis
   */
  async analyzeKeyword(keyword: string): Promise<KeywordData> {
    if (!this.dataForSEOService) {
      throw new Error('SEO service not initialized');
    }

    return this.dataForSEOService.getKeywordAnalysis(keyword);
  }

  /**
   * Perform comprehensive SEO research for content planning
   */
  async researchTopic(topic: string): Promise<SEOResearchResult> {
    if (!this.dataForSEOService) {
      throw new Error('SEO service not initialized');
    }

    return this.dataForSEOService.performSEOResearch(topic);
  }

  /**
   * Get SEO service health status
   */
  async getHealthStatus(): Promise<SEOServiceHealth | null> {
    if (!this.dataForSEOService) {
      return null;
    }

    return this.dataForSEOService.getHealthStatus();
  }

  /**
   * Generate SEO-optimized content structure recommendations
   */
  async generateContentOutline(topic: string): Promise<{
    title: string;
    metaDescription: string;
    headings: string[];
    targetKeywords: string[];
    recommendedLength: number;
  }> {
    const research = await this.researchTopic(topic);
    
    return {
      title: this.generateSEOTitle(research.primary_keyword),
      metaDescription: this.generateMetaDescription(research.primary_keyword),
      headings: research.content_recommendations.suggested_headings,
      targetKeywords: [
        research.primary_keyword.keyword,
        ...research.related_keywords.slice(0, 5).map(k => k.keyword)
      ],
      recommendedLength: research.content_recommendations.target_length
    };
  }

  /**
   * Enhance AI generation prompts with SEO data
   */
  async enhancePromptWithSEO(basePrompt: string, topic: string): Promise<string> {
    try {
      const research = await this.researchTopic(topic);
      
      const seoEnhancement = `
SEO Context:
- Primary keyword: "${research.primary_keyword.keyword}" (${research.primary_keyword.search_volume} monthly searches)
- Target keywords to include: ${research.related_keywords.slice(0, 5).map(k => k.keyword).join(', ')}
- Content intent: ${research.primary_keyword.search_intent}
- Recommended length: ${research.content_recommendations.target_length} words
- Questions to answer: ${research.content_recommendations.questions_to_answer.slice(0, 3).join(', ')}

${basePrompt}

Please ensure the content naturally incorporates the target keywords and answers the questions listed above.`;

      return seoEnhancement;
    } catch (error) {
      console.warn('Failed to enhance prompt with SEO data:', error);
      return basePrompt; // Fallback to original prompt
    }
  }

  /**
   * Private helper methods
   */
  private generateSEOTitle(keyword: KeywordData): string {
    const intent = keyword.search_intent;
    
    if (intent === 'commercial') {
      return `Best ${keyword.keyword} - Complete Buying Guide 2024`;
    }
    if (intent === 'informational') {
      return `${keyword.keyword}: Complete Guide & Tips`;
    }
    
    return `Everything You Need to Know About ${keyword.keyword}`;
  }

  private generateMetaDescription(keyword: KeywordData): string {
    return `Learn about ${keyword.keyword} with expert insights, tips, and actionable advice. Comprehensive guide with cultural significance and practical information.`;
  }
}

// Export singleton instance
export const seoService = SEOServiceManager.getInstance();

// Initialize the service when the module is loaded
seoService.initialize();

// Utility functions
export function formatSearchVolume(volume: number): string {
  if (volume >= 1000000) {
    return `${(volume / 1000000).toFixed(1)}M`;
  }
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1)}K`;
  }
  return volume.toString();
}

export function getCompetitionColor(level: 'low' | 'medium' | 'high'): string {
  switch (level) {
    case 'low': return 'text-green-600';
    case 'medium': return 'text-yellow-600';
    case 'high': return 'text-red-600';
    default: return 'text-gray-600';
  }
}

export function getDifficultyLabel(difficulty: number): string {
  if (difficulty < 30) return 'Easy';
  if (difficulty < 60) return 'Medium';
  if (difficulty < 80) return 'Hard';
  return 'Very Hard';
}

// Re-export types for convenience
export * from './types'; 