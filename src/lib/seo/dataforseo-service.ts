import {
  KeywordData,
  KeywordSuggestion,
  SEOResearchResult,
  SEOServiceConfig,
  SEOServiceHealth,
  SEOError,
  SEO_ERROR_CODES,
  CompetitorAnalysis,
  SERPFeature
} from './types';

export class DataForSEOService {
  private config: SEOServiceConfig;
  private baseUrl = 'https://api.dataforseo.com/v3';
  private healthStatus: SEOServiceHealth;

  constructor(config: SEOServiceConfig) {
    this.config = config;
    this.healthStatus = {
      status: 'healthy',
      lastChecked: new Date(),
      errors: []
    };
  }

  /**
   * Get keyword suggestions and search volume data
   */
  async getKeywordSuggestions(topic: string, limit: number = 100): Promise<KeywordSuggestion[]> {
    try {
      // Use DataForSEO Labs API for better results and live data
      const response = await this.makeRequest('/dataforseo_labs/google/keyword_ideas/live', {
        keywords: [topic],
        location_code: this.config.locationId || 2840, // US by default
        language_code: this.config.languageId || 'en', // English by default
        limit: Math.min(limit, 100), // Labs API supports higher limits
        include_clickstream_data: false
      });

      // Parse response from Labs API
      const results = response.tasks?.[0]?.result?.[0];
      return this.parseKeywordSuggestionsFromLabs(results);
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Get detailed keyword analysis including difficulty and search intent
   */
  async getKeywordAnalysis(keyword: string): Promise<KeywordData> {
    try {
      const [volumeData, difficultyData] = await Promise.all([
        this.getSearchVolume(keyword),
        this.getKeywordDifficulty(keyword)
      ]);

      return {
        keyword,
        search_volume: volumeData.search_volume,
        competition: volumeData.competition,
        cpc: volumeData.cpc,
        difficulty: difficultyData.difficulty,
        search_intent: this.inferSearchIntent(keyword)
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Perform comprehensive SEO research for content planning
   */
  async performSEOResearch(topic: string): Promise<SEOResearchResult> {
    try {
      const [primaryKeyword, relatedKeywords, serpFeatures] = await Promise.all([
        this.getKeywordAnalysis(topic),
        this.getKeywordSuggestions(topic, 50),
        this.getSERPFeatures(topic)
      ]);

      return {
        primary_keyword: primaryKeyword,
        related_keywords: relatedKeywords,
        competitors: [], // Will implement in next iteration
        serp_features: serpFeatures,
        content_recommendations: this.generateContentRecommendations(primaryKeyword, relatedKeywords, serpFeatures)
      };
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Get current service health and API quota status
   */
  async getHealthStatus(): Promise<SEOServiceHealth> {
    try {
      const response = await this.makeRequest('/appendix/user_data');
      
      // Get credits from tasks array
      const tasks = response.tasks || [];
      const userTask = tasks.find((task: any) => task.result);
      const credits = userTask?.result?.money?.balance || 0;
      
      this.healthStatus = {
        status: 'healthy',
        apiCreditsRemaining: credits,
        lastChecked: new Date(),
        errors: []
      };

      return this.healthStatus;
    } catch (error) {
      this.healthStatus = {
        status: 'down',
        lastChecked: new Date(),
        errors: [this.createError(error)]
      };
      return this.healthStatus;
    }
  }

  /**
   * Private helper methods
   */
  private async makeRequest(endpoint: string, data?: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const auth = Buffer.from(`${this.config.apiLogin}:${this.config.apiPassword}`).toString('base64');

    const response = await fetch(url, {
      method: data ? 'POST' : 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify([data]) : undefined
    });

    if (!response.ok) {
      throw new Error(`DataForSEO API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.status_code !== 20000) {
      throw new Error(`DataForSEO API error: ${result.status_message}`);
    }

    return result;
  }



  private async getSearchVolume(keyword: string): Promise<{ search_volume: number; competition: number; cpc: number }> {
    try {
      // Use Live API for immediate results
      const response = await this.makeRequest('/keywords_data/google_ads/search_volume/live', {
        keywords: [keyword],
        location_code: this.config.locationId,
        language_code: this.config.languageId
      });
      
      const data = response.tasks?.[0]?.result?.[0]?.items?.[0] || {};
      return {
        search_volume: data.search_volume || 0,
        competition: data.competition || 0,
        cpc: data.cpc || 0
      };
    } catch (error) {
      // Return default values if API fails
      return {
        search_volume: 0,
        competition: 0,
        cpc: 0
      };
    }
  }

  private async getKeywordDifficulty(keyword: string): Promise<{ difficulty: number }> {
    const response = await this.makeRequest('/keywords_data/google_ads/keyword_difficulty/task_post', {
      keywords: [keyword],
      location_code: this.config.locationId || 2840,
      language_code: this.config.languageId || 'en'
    });

    return {
      difficulty: response[0]?.keyword_difficulty || 0
    };
  }

  private async getSERPFeatures(keyword: string): Promise<SERPFeature[]> {
    // This would be implemented with SERP API endpoints
    // For now, return empty array
    return [];
  }

  private parseKeywordSuggestions(response: any): KeywordSuggestion[] {
    // Handle Live API response format
    const items = response?.items || [];
    
    if (!Array.isArray(items)) {
      console.log('DataForSEO response format:', JSON.stringify(response, null, 2));
      return [];
    }

    return items.map((item: any) => ({
      keyword: item.keyword || '',
      search_volume: item.search_volume || 0,
      competition_level: this.mapCompetitionLevel(item.competition || 0),
      relevance_score: this.calculateRelevanceScore(item)
    }));
  }

  private parseKeywordSuggestionsFromLabs(response: any): KeywordSuggestion[] {
    // Handle Labs API response format
    const items = response?.items || [];
    
    if (!Array.isArray(items)) {
      console.log('DataForSEO Labs response format:', JSON.stringify(response, null, 2));
      return [];
    }

    return items.map((item: any) => ({
      keyword: item.keyword || '',
      search_volume: item.keyword_info?.search_volume || 0,
      competition_level: this.mapCompetitionLevel(item.keyword_info?.competition || 0),
      relevance_score: this.calculateRelevanceScore(item)
    }));
  }

  private mapCompetitionLevel(competition: number): 'low' | 'medium' | 'high' {
    if (competition < 0.3) return 'low';
    if (competition < 0.7) return 'medium';
    return 'high';
  }

  private calculateRelevanceScore(item: any): number {
    // Simple relevance scoring based on search volume and competition
    const volume = item.keyword_info?.search_volume || item.search_volume || 0;
    const competition = item.keyword_info?.competition || item.competition || 1;
    return Math.min(100, (volume / competition) * 0.1);
  }

  private inferSearchIntent(keyword: string): KeywordData['search_intent'] {
    const commercialKeywords = ['buy', 'purchase', 'price', 'cost', 'cheap', 'discount'];
    const informationalKeywords = ['how', 'what', 'why', 'guide', 'tutorial', 'learn'];
    const navigationalKeywords = ['login', 'site:', 'website', 'official'];

    const lowerKeyword = keyword.toLowerCase();

    if (commercialKeywords.some(word => lowerKeyword.includes(word))) {
      return 'commercial';
    }
    if (informationalKeywords.some(word => lowerKeyword.includes(word))) {
      return 'informational';
    }
    if (navigationalKeywords.some(word => lowerKeyword.includes(word))) {
      return 'navigational';
    }

    return 'informational'; // Default
  }

  private generateContentRecommendations(
    primaryKeyword: KeywordData,
    relatedKeywords: KeywordSuggestion[],
    serpFeatures: SERPFeature[]
  ) {
    return {
      target_length: this.calculateTargetLength(primaryKeyword),
      suggested_headings: this.generateHeadings(primaryKeyword, relatedKeywords),
      questions_to_answer: this.extractQuestions(serpFeatures)
    };
  }

  private calculateTargetLength(keyword: KeywordData): number {
    // Base length on search intent and competition
    if (keyword.search_intent === 'commercial') return 1500;
    if (keyword.search_intent === 'informational') return 2000;
    return 1200;
  }

  private generateHeadings(primaryKeyword: KeywordData, relatedKeywords: KeywordSuggestion[]): string[] {
    const headings = [
      `What is ${primaryKeyword.keyword}?`,
      `Benefits of ${primaryKeyword.keyword}`,
      `How to ${primaryKeyword.keyword}`
    ];

    // Add headings based on related keywords
    relatedKeywords.slice(0, 3).forEach(keyword => {
      headings.push(`${keyword.keyword} - Complete Guide`);
    });

    return headings;
  }

  private extractQuestions(serpFeatures: SERPFeature[]): string[] {
    const questions: string[] = [];
    
    serpFeatures.forEach(feature => {
      if (feature.type === 'people_also_ask') {
        questions.push(...feature.content);
      }
    });

    return questions;
  }

  private handleError(error: any): void {
    const seoError = this.createError(error);
    this.healthStatus.errors.push(seoError);
    
    if (this.healthStatus.errors.length > 5) {
      this.healthStatus.status = 'degraded';
    }
  }

  private createError(error: any): SEOError {
    if (error.message?.includes('401')) {
      return {
        code: SEO_ERROR_CODES.INVALID_CREDENTIALS,
        message: 'Invalid DataForSEO credentials'
      };
    }
    
    if (error.message?.includes('quota') || error.message?.includes('limit')) {
      return {
        code: SEO_ERROR_CODES.QUOTA_EXCEEDED,
        message: 'API quota exceeded'
      };
    }

    return {
      code: SEO_ERROR_CODES.NETWORK_ERROR,
      message: error.message || 'Unknown error',
      details: error
    };
  }
} 