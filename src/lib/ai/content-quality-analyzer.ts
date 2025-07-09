// V2 Content Quality Analyzer - SEO and Content Quality Assessment

import { ContentQualityAnalysis, TopicGenerationRequest, SEO_CONSTANTS } from './v2-types';

export class V2ContentQualityAnalyzer {
  
  /**
   * Comprehensive content analysis including SEO, readability, and structure
   */
  async analyzeContent(content: string, request: TopicGenerationRequest): Promise<{
    overallScore: number;
    seoScore: number;
    readabilityScore: number;
    keywordOptimization: number;
    contentStructure: number;
    recommendations: string[];
  }> {
    const seoAnalysis = await this.validateSEORequirements(content, this.extractKeywords(request));
    const readabilityScore = this.calculateReadabilityScore(content);
    const structureScore = this.analyzeContentStructure(content);
    const keywordScore = this.calculateKeywordOptimizationScore(seoAnalysis.keywordDensity);
    
    const overallScore = this.calculateOverallScore({
      seo: this.calculateSEOScore(seoAnalysis),
      readability: readabilityScore,
      structure: structureScore,
      keywords: keywordScore
    });

    const recommendations = this.generateRecommendations({
      content,
      seoAnalysis,
      readabilityScore,
      structureScore,
      request
    });

    return {
      overallScore,
      seoScore: this.calculateSEOScore(seoAnalysis),
      readabilityScore,
      keywordOptimization: keywordScore,
      contentStructure: structureScore,
      recommendations
    };
  }

  /**
   * Validate SEO requirements and keyword optimization
   */
  async validateSEORequirements(content: string, keywords: string[]): Promise<{
    keywordDensity: Record<string, number>;
    missingKeywords: string[];
    overOptimizedKeywords: string[];
    suggestions: string[];
  }> {
    const contentLower = content.toLowerCase();
    const words = contentLower.split(/\s+/).length;
    
    const keywordDensity: Record<string, number> = {};
    const missingKeywords: string[] = [];
    const overOptimizedKeywords: string[] = [];
    const suggestions: string[] = [];

    // Analyze each keyword
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      const occurrences = (contentLower.match(new RegExp(`\\b${keywordLower}\\b`, 'g')) || []).length;
      const density = (occurrences / words) * 100;
      
      keywordDensity[keyword] = density;

      if (density === 0) {
        missingKeywords.push(keyword);
        suggestions.push(`Add keyword "${keyword}" naturally in the content`);
      } else if (density > SEO_CONSTANTS.OPTIMAL_KEYWORD_DENSITY.MAX) {
        overOptimizedKeywords.push(keyword);
        suggestions.push(`Reduce frequency of "${keyword}" (current: ${density.toFixed(1)}%)`);
      } else if (density < SEO_CONSTANTS.OPTIMAL_KEYWORD_DENSITY.MIN) {
        suggestions.push(`Consider using "${keyword}" more frequently (current: ${density.toFixed(1)}%)`);
      }
    }

    // General SEO suggestions
    if (content.length < 800 * 5) {
      suggestions.push('Content may be too short for optimal SEO performance');
    }

    if (!this.hasProperHeadingStructure(content)) {
      suggestions.push('Add more headings to improve content structure');
    }

    if (!this.hasMetaElements(content)) {
      suggestions.push('Include meta description for better search visibility');
    }

    return {
      keywordDensity,
      missingKeywords,
      overOptimizedKeywords,
      suggestions
    };
  }

  /**
   * Extract detailed content metadata
   */
  extractMetadata(content: string): {
    wordCount: number;
    readingTime: number;
    headings: string[];
    sentences: number;
    paragraphs: number;
  } {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const headings = this.extractHeadings(content);
    
    // Calculate reading time (average 200 words per minute)
    const readingTime = Math.ceil(words.length / 200);

    return {
      wordCount: words.length,
      readingTime,
      headings,
      sentences: sentences.length,
      paragraphs: paragraphs.length
    };
  }

  /**
   * Calculate readability score using multiple factors
   */
  private calculateReadabilityScore(content: string): number {
    const metadata = this.extractMetadata(content);
    let score = 100;

    // Average sentence length (optimal: 15-20 words)
    const avgSentenceLength = metadata.wordCount / metadata.sentences;
    if (avgSentenceLength > 25) {
      score -= 15; // Too long sentences
    } else if (avgSentenceLength < 8) {
      score -= 10; // Too short sentences
    }

    // Paragraph length analysis
    const avgParagraphLength = metadata.wordCount / metadata.paragraphs;
    if (avgParagraphLength > 150) {
      score -= 10; // Paragraphs too long
    }

    // Heading distribution
    const headingRatio = metadata.headings.length / metadata.paragraphs;
    if (headingRatio < 0.2) {
      score -= 15; // Not enough headings
    }

    // Complex word analysis (words longer than 6 characters)
    const complexWords = content.split(/\s+/).filter(word => 
      word.replace(/[^a-zA-Z]/g, '').length > 6
    ).length;
    const complexWordRatio = complexWords / metadata.wordCount;
    
    if (complexWordRatio > 0.2) {
      score -= 10; // Too many complex words
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Analyze content structure and organization
   */
  private analyzeContentStructure(content: string): number {
    let score = 100;
    const headings = this.extractHeadings(content);
    const metadata = this.extractMetadata(content);

    // Check for introduction
    if (!this.hasIntroduction(content)) {
      score -= 15;
    }

    // Check for conclusion
    if (!this.hasConclusion(content)) {
      score -= 15;
    }

    // Heading hierarchy
    if (!this.hasProperHeadingHierarchy(headings)) {
      score -= 10;
    }

    // Content organization
    if (metadata.paragraphs < 3) {
      score -= 20; // Too few paragraphs
    }

    // Logical flow indicators
    if (!this.hasTransitionElements(content)) {
      score -= 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate keyword optimization score
   */
  private calculateKeywordOptimizationScore(keywordDensity: Record<string, number>): number {
    const densities = Object.values(keywordDensity);
    if (densities.length === 0) return 0;

    let score = 100;
    const { MIN: min, MAX: max } = SEO_CONSTANTS.OPTIMAL_KEYWORD_DENSITY;

    for (const density of densities) {
      if (density === 0) {
        score -= 20; // Missing keyword
      } else if (density < min) {
        score -= 10; // Under-optimized
      } else if (density > max) {
        score -= 15; // Over-optimized
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate overall SEO score
   */
  private calculateSEOScore(seoAnalysis: any): number {
    let score = 100;
    
    score -= seoAnalysis.missingKeywords.length * 15;
    score -= seoAnalysis.overOptimizedKeywords.length * 10;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate weighted overall score
   */
  private calculateOverallScore(scores: {
    seo: number;
    readability: number;
    structure: number;
    keywords: number;
  }): number {
    const weights = {
      seo: 0.3,
      readability: 0.25,
      structure: 0.25,
      keywords: 0.2
    };

    return Math.round(
      scores.seo * weights.seo +
      scores.readability * weights.readability +
      scores.structure * weights.structure +
      scores.keywords * weights.keywords
    );
  }

  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(params: {
    content: string;
    seoAnalysis: any;
    readabilityScore: number;
    structureScore: number;
    request: TopicGenerationRequest;
  }): string[] {
    const recommendations: string[] = [];
    const { content, seoAnalysis, readabilityScore, structureScore, request } = params;

    // SEO recommendations
    recommendations.push(...seoAnalysis.suggestions);

    // Readability recommendations
    if (readabilityScore < 70) {
      recommendations.push('Break down long sentences for better readability');
      recommendations.push('Use simpler language where possible');
      recommendations.push('Add more bullet points and lists');
    }

    // Structure recommendations
    if (structureScore < 70) {
      if (!this.hasIntroduction(content)) {
        recommendations.push('Add a clear introduction paragraph');
      }
      if (!this.hasConclusion(content)) {
        recommendations.push('Include a conclusion summarizing key points');
      }
      recommendations.push('Add more subheadings to organize content');
    }

    // Word count recommendations
    const metadata = this.extractMetadata(content);
    const targetWordCount = request.targetWordCount;
    
    if (targetWordCount) {
      const variance = Math.abs(metadata.wordCount - targetWordCount) / targetWordCount;
      if (variance > 0.1) {
        if (metadata.wordCount < targetWordCount) {
          recommendations.push(`Expand content to reach target word count (${targetWordCount} words)`);
        } else {
          recommendations.push(`Consider condensing content (current: ${metadata.wordCount}, target: ${targetWordCount})`);
        }
      }
    }

    // Template-specific recommendations
    const template = request.topic.template;
    if (template) {
      recommendations.push(...this.getTemplateSpecificRecommendations(template, content));
    }

    return recommendations.slice(0, 10); // Limit to top 10 recommendations
  }

  /**
   * Helper methods
   */
  private extractKeywords(request: TopicGenerationRequest): string[] {
    const keywords = [request.topic.title];
    
    if (request.topic.keywords) {
      const parsedKeywords = request.topic.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
      keywords.push(...parsedKeywords);
    }
    
    return [...new Set(keywords)];
  }

  private extractHeadings(content: string): string[] {
    const headingRegex = /^#+\s+(.+)$/gm;
    const matches = content.match(headingRegex) || [];
    return matches.map(h => h.replace(/^#+\s+/, ''));
  }

  private hasProperHeadingStructure(content: string): boolean {
    const headings = content.match(/^#+\s+/gm) || [];
    return headings.length >= 2; // At least 2 headings
  }

  private hasProperHeadingHierarchy(headings: string[]): boolean {
    // Check if headings follow logical hierarchy (H1 -> H2 -> H3, etc.)
    const headingLevels = headings.map(h => h.match(/^#+/)?.[0]?.length || 0);
    
    for (let i = 1; i < headingLevels.length; i++) {
      const diff = headingLevels[i] - headingLevels[i - 1];
      if (diff > 1) return false; // Skipped heading levels
    }
    
    return true;
  }

  private hasMetaElements(content: string): boolean {
    return content.includes('META_DESCRIPTION:') || content.includes('TITLE:');
  }

  private hasIntroduction(content: string): boolean {
    const firstParagraph = content.split('\n\n')[0] || '';
    return firstParagraph.length > 100 && !firstParagraph.startsWith('#');
  }

  private hasConclusion(content: string): boolean {
    const lastParagraph = content.split('\n\n').pop() || '';
    const conclusionIndicators = [
      'conclusion', 'summary', 'finally', 'in summary', 
      'to conclude', 'in conclusion', 'overall', 'takeaway'
    ];
    
    return conclusionIndicators.some(indicator => 
      lastParagraph.toLowerCase().includes(indicator)
    );
  }

  private hasTransitionElements(content: string): boolean {
    const transitions = [
      'however', 'therefore', 'furthermore', 'moreover', 
      'additionally', 'consequently', 'meanwhile', 'nevertheless'
    ];
    
    const contentLower = content.toLowerCase();
    return transitions.some(transition => contentLower.includes(transition));
  }

  private getTemplateSpecificRecommendations(template: string, content: string): string[] {
    const recommendations: string[] = [];
    
    switch (template) {
      case 'Product Showcase':
        if (!content.toLowerCase().includes('benefit')) {
          recommendations.push('Highlight product benefits and value propositions');
        }
        break;
      
      case 'How-to Guide':
        if (!content.includes('1.') && !content.includes('Step')) {
          recommendations.push('Use numbered steps or clear step-by-step format');
        }
        break;
      
      case 'Buying Guide':
        if (!content.toLowerCase().includes('pros') || !content.toLowerCase().includes('cons')) {
          recommendations.push('Include pros and cons comparison');
        }
        break;
      
      case 'Review Article':
        if (!content.toLowerCase().includes('rating') && !content.toLowerCase().includes('score')) {
          recommendations.push('Consider adding ratings or scoring system');
        }
        break;
    }
    
    return recommendations;
  }
} 