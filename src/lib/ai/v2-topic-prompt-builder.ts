// V2 Topic Prompt Builder - Enhanced for V2 Features

import { 
  TopicGenerationRequest, 
  TopicPromptBuilder, 
  V2_CONTENT_TEMPLATES, 
  SEO_CONSTANTS 
} from './v2-types';

export class V2TopicPromptBuilder implements TopicPromptBuilder {
  
  /**
   * Build standard prompt from topic data
   */
  async buildPrompt(request: TopicGenerationRequest): Promise<string> {
    const { topic, targetWordCount, contentStructure = 'standard' } = request;
    
    // Validate topic data
    if (!this.validateTopicData(topic)) {
      throw new Error('Invalid topic data provided');
    }

    const keywords = this.extractKeywords(topic);
    const estimatedWords = targetWordCount || this.estimateWordCount(request);
    const template = V2_CONTENT_TEMPLATES[contentStructure];

    return `Create a comprehensive ${estimatedWords}-word article about "${topic.title}" following the V2 enhanced content structure.

**Content Requirements:**
- Topic: ${topic.title}
- Target Keywords: ${keywords.join(', ')}
- Tone: ${topic.tone || 'professional'}
- Word Count: ${estimatedWords} words
- Content Structure: ${contentStructure} (${template.targetSections} sections)
- Template Style: ${topic.template || 'article'}

**Content Structure Guidelines:**
${template.structure.map((section, index) => `${index + 1}. ${section.replace('-', ' ').toUpperCase()}`).join('\n')}

**Response Format:**
Please provide your response in this EXACT format:

TITLE: [Create an engaging, SEO-optimized title (30-60 characters) that includes the main keyword naturally]

META_DESCRIPTION: [Write a compelling meta description (150-160 characters) that summarizes the article's value and includes the primary keyword]

CONTENT:
[Write the main article content here - exactly ${estimatedWords} words]

**Writing Guidelines:**
- Include target keywords naturally with optimal density (0.5-2.5%)
- Create clear, engaging headings for each section
- Write in ${topic.tone || 'professional'} tone throughout
- Ensure content is valuable, informative, and actionable
- Structure content logically with smooth transitions
- Include practical examples where relevant
- Focus on providing genuine value to readers
- Maintain consistent voice and style throughout

**SEO Optimization:**
- Naturally incorporate keywords: ${keywords.join(', ')}
- Create compelling, keyword-rich headings
- Write engaging introduction and conclusion
- Ensure content matches search intent
- Use semantic keywords and related terms

**Quality Standards:**
- Original, high-quality content
- Clear, engaging writing style
- Proper grammar and spelling
- Logical flow and structure
- Actionable insights and information`;
  }

  /**
   * Build SEO-optimized prompt with enhanced optimization
   */
  async buildSEOOptimizedPrompt(request: TopicGenerationRequest): Promise<string> {
    const basePrompt = await this.buildPrompt(request);
    const keywords = this.extractKeywords(request.topic);
    const primaryKeyword = keywords[0] || request.topic.title;
    
    const seoEnhancement = `

**ENHANCED SEO REQUIREMENTS:**

**Primary Keyword Focus:** "${primaryKeyword}"
- Include in title (naturally)
- Use in first paragraph within first 100 words
- Include in at least one H2 heading
- Mention 2-3 times throughout content naturally
- Include in meta description

**Secondary Keywords:** ${keywords.slice(1, 5).join(', ')}
- Distribute naturally throughout content
- Use in subheadings where relevant
- Include semantic variations

**Technical SEO Elements:**
- Create descriptive, keyword-rich headings (H1, H2, H3)
- Write compelling title under 60 characters
- Meta description 150-160 characters with call-to-action
- Include relevant internal linking opportunities (mention as [LINK: topic])
- Add natural keyword variations and synonyms

**Content Optimization:**
- Target keyword density: 1-2% (not more)
- Use LSI (Latent Semantic Indexing) keywords
- Include question-based content for featured snippets
- Write scannable content with bullet points and lists
- Create compelling introduction and conclusion

**Additional Instructions:**
- Optimize for user intent and search experience
- Balance SEO optimization with natural readability
- Focus on providing comprehensive, authoritative content
- Include actionable takeaways and practical value`;

    return basePrompt + seoEnhancement;
  }

  /**
   * Build template-specific prompt based on content template
   */
  async buildTemplateSpecificPrompt(request: TopicGenerationRequest): Promise<string> {
    const { topic } = request;
    const template = topic.template || 'article';
    
    const templateSpecificInstructions = this.getTemplateInstructions(template);
    const basePrompt = await this.buildPrompt(request);
    
    return `${basePrompt}

**TEMPLATE-SPECIFIC REQUIREMENTS (${template.toUpperCase()}):**
${templateSpecificInstructions}`;
  }

  /**
   * Get template-specific writing instructions
   */
  private getTemplateInstructions(template: string): string {
    const instructions: Record<string, string> = {
      'Product Showcase': `
- Focus on product benefits and unique value propositions
- Include compelling product descriptions
- Add persuasive elements and social proof opportunities
- Structure content to guide towards purchase consideration
- Highlight key features, benefits, and use cases
- Include comparison opportunities with alternatives`,

      'How-to Guide': `
- Create clear, step-by-step instructions
- Use numbered lists and bullet points
- Include practical examples and tips
- Add troubleshooting sections where relevant
- Structure content for easy scanning and following
- Include prerequisite information and expected outcomes`,

      'Artist Showcase': `
- Focus on cultural significance and artistic value
- Include historical context and background
- Highlight unique techniques and artistic elements
- Create engaging storytelling around the artist/artwork
- Balance educational content with emotional appeal
- Include cultural and artistic analysis`,

      'Buying Guide': `
- Create structured comparison framework
- Include pros and cons analysis
- Add decision-making criteria and factors
- Structure content for easy comparison
- Include price ranges and value considerations
- Provide clear recommendations and guidance`,

      'Industry Trends': `
- Focus on current market developments
- Include data-driven insights and statistics
- Analyze implications and future predictions
- Structure content around key trend categories
- Include expert perspectives and analysis
- Connect trends to practical business impact`,

      'Comparison Article': `
- Create structured side-by-side analysis
- Include detailed feature comparisons
- Add pros and cons for each option
- Structure content in comparison tables/sections
- Include recommendation based on different use cases
- Provide clear winner or best-fit guidance`,

      'Review Article': `
- Include detailed evaluation criteria
- Provide balanced assessment with pros and cons
- Add personal testing experience and insights
- Structure content around key evaluation areas
- Include rating system or scoring
- Provide clear recommendation and conclusion`,

      'Seasonal Content': `
- Focus on timely, season-specific information
- Include current trends and seasonal considerations
- Add time-sensitive tips and recommendations
- Structure content around seasonal themes
- Include preparation and planning elements
- Connect content to seasonal customer needs`,

      'Problem-Solution': `
- Clearly define the problem and its impact
- Structure content around solution exploration
- Include step-by-step solution implementation
- Add case studies or examples of successful solutions
- Structure content logically from problem to resolution
- Include prevention and best practices`
    };

    return instructions[template] || `
- Follow standard article structure with clear introduction, body, and conclusion
- Focus on providing valuable, informative content
- Use appropriate headings and subheadings for organization
- Include practical insights and actionable information`;
  }

  /**
   * Validate topic data structure and required fields
   */
  validateTopicData(topic: TopicGenerationRequest['topic']): boolean {
    if (!topic || typeof topic !== 'object') {
      return false;
    }

    // Check required fields
    if (!topic.title || typeof topic.title !== 'string' || topic.title.trim().length < 3) {
      return false;
    }

    // Validate optional fields if present
    if (topic.keywords && typeof topic.keywords !== 'string') {
      return false;
    }

    if (topic.tone && typeof topic.tone !== 'string') {
      return false;
    }

    if (topic.length && typeof topic.length !== 'string') {
      return false;
    }

    if (topic.template && typeof topic.template !== 'string') {
      return false;
    }

    return true;
  }

  /**
   * Extract and clean keywords from topic
   */
  extractKeywords(topic: TopicGenerationRequest['topic']): string[] {
    const keywords: string[] = [];
    
    // Add title as primary keyword
    keywords.push(topic.title);
    
    // Parse keywords field if available
    if (topic.keywords) {
      const parsedKeywords = topic.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);
      
      keywords.push(...parsedKeywords);
    }
    
    // Remove duplicates and return unique keywords
    return [...new Set(keywords)];
  }

  /**
   * Estimate word count based on length setting and content structure
   */
  estimateWordCount(request: TopicGenerationRequest): number {
    const { topic, contentStructure = 'standard' } = request;
    const lengthMap: Record<string, number> = {
      'short': 500,
      'medium': 1000,
      'long': 1500,
      'comprehensive': 2000
    };

    // Get base word count from length setting
    let baseWords = lengthMap[topic.length || 'medium'];
    
    // Adjust based on content structure
    const template = V2_CONTENT_TEMPLATES[contentStructure];
    const structureMultiplier = template.targetSections * template.averageWordsPerSection;
    
    // Use the larger of the two estimates
    return Math.max(baseWords, structureMultiplier);
  }

  /**
   * Build prompts for different content phases (for background processing)
   */
  buildPhasePrompt(
    request: TopicGenerationRequest, 
    phase: 'outline' | 'introduction' | 'body' | 'conclusion'
  ): string {
    const keywords = this.extractKeywords(request.topic);
    
    switch (phase) {
      case 'outline':
        return `Create a detailed outline for an article about "${request.topic.title}".
        
Include:
- Main sections and subsections
- Key points for each section
- Suggested word count per section
- Keywords to include: ${keywords.join(', ')}
        
Format as a structured outline with clear hierarchy.`;

      case 'introduction':
        return `Write an engaging introduction (150-200 words) for an article about "${request.topic.title}".

Requirements:
- Hook the reader in the first sentence
- Include primary keyword: "${keywords[0]}" naturally
- Clearly state what the article will cover
- Set the tone: ${request.topic.tone || 'professional'}
- Create a smooth transition to the main content`;

      case 'body':
        return `Write the main body content for an article about "${request.topic.title}".

Requirements:
- ${this.estimateWordCount(request) - 350} words (excluding intro/conclusion)
- Include keywords naturally: ${keywords.join(', ')}
- Use clear headings and subheadings
- Provide valuable, actionable information
- Maintain ${request.topic.tone || 'professional'} tone`;

      case 'conclusion':
        return `Write a compelling conclusion (100-150 words) for an article about "${request.topic.title}".

Requirements:
- Summarize key takeaways
- Include a call-to-action
- Reinforce the article's value
- End with a strong closing statement
- Include primary keyword naturally if possible`;

      default:
        throw new Error(`Unknown phase: ${phase}`);
    }
  }
} 