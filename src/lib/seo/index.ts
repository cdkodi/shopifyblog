import { DataForSEOService } from './dataforseo-service';
import { SEOResearchResult, KeywordSuggestion, KeywordData, SEOServiceHealth } from './types';

class SEOServiceManager {
  private dataForSEO: DataForSEOService | null = null;
  private initialized = false;

  /**
   * Initialize the SEO service with environment variables
   */
  initialize(): void {
    if (this.initialized) return;

    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;

    if (!login || !password) {
      console.warn('DataForSEO credentials not found. SEO features will be disabled.');
      return;
    }

    this.dataForSEO = new DataForSEOService({
      apiLogin: login,
      apiPassword: password,
      locationId: parseInt(process.env.DATAFORSEO_LOCATION_ID || '2840'), // USA default
      languageId: process.env.DATAFORSEO_LANGUAGE_ID || 'en'
    });

    this.initialized = true;
  }

  /**
   * Check if SEO service is available
   */
  isAvailable(): boolean {
    return this.dataForSEO !== null;
  }

  /**
   * Get keyword suggestions for a topic
   */
  async getKeywordSuggestions(topic: string, limit?: number): Promise<KeywordSuggestion[]> {
    if (!this.dataForSEO) {
      throw new Error('SEO service not initialized');
    }

    return this.dataForSEO.getKeywordSuggestions(topic, limit);
  }

  /**
   * Get detailed keyword analysis
   */
  async analyzeKeyword(keyword: string): Promise<KeywordData> {
    if (!this.dataForSEO) {
      throw new Error('SEO service not initialized');
    }

    return this.dataForSEO.getKeywordAnalysis(keyword);
  }

  /**
   * Perform comprehensive SEO research for content planning
   */
  async researchTopic(topic: string): Promise<SEOResearchResult> {
    if (!this.dataForSEO) {
      throw new Error('SEO service not initialized');
    }

    return this.dataForSEO.performSEOResearch(topic);
  }

  /**
   * Get SEO service health status
   */
  async getHealthStatus(): Promise<SEOServiceHealth | null> {
    if (!this.dataForSEO) {
      return null;
    }

    return this.dataForSEO.getHealthStatus();
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
    return `Discover everything about ${keyword.keyword}. Expert insights, tips, and actionable advice. Read our comprehensive guide now.`;
  }
}

// Export singleton instance
export const seoService = new SEOServiceManager();

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