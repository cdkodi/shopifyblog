import { supabase } from '../supabase'

export interface ContentTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  recommendedProvider: 'anthropic' | 'openai' | 'google';
  estimatedCost: number;
  targetLength: number;
  seoAdvantages: string[];
  exampleTitles: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  isActive?: boolean;
}

export class ContentTemplateService {
  // Get template names for topic form dropdown
  static async getTemplateNames(): Promise<{ data: string[] | null; error: string | null }> {
    try {
      const { data: templates, error } = await this.getContentTemplates();
      
      if (error || !templates) {
        return { data: null, error: error || 'Failed to fetch templates' };
      }

      const templateNames = templates
        .filter(template => template.isActive !== false)
        .map(template => template.name)
        .sort();

      return { data: templateNames, error: null };
    } catch (err) {
      console.error('Error fetching template names:', err);
      return { data: null, error: 'Failed to fetch template names' };
    }
  }

  // Get all content templates from Supabase
  static async getContentTemplates(): Promise<{ data: ContentTemplate[] | null; error: string | null }> {
    try {
      // First try to get from a dedicated content_templates table
      const { data: templates, error: templatesError } = await supabase
        .from('content_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (!templatesError && templates && templates.length > 0) {
        // Map database fields to our interface
        const mappedTemplates = templates.map(template => ({
          id: template.id,
          name: template.name,
          description: template.content_type || 'Content template',
          icon: '📄',
          recommendedProvider: 'anthropic' as const,
          estimatedCost: 0.01,
          targetLength: 1500,
          seoAdvantages: [],
          exampleTitles: [],
          difficulty: 'medium' as const,
          category: template.content_type || undefined,
          isActive: template.is_active || false
        }));

        return { data: mappedTemplates, error: null };
      }

      // Fallback: try to get from app_config table
      const { data: configData, error: configError } = await supabase
        .from('app_config')
        .select('config_value')
        .eq('config_key', 'content_templates')
        .single();

      if (!configError && configData?.config_value) {
        // If it's stored as an array of template names, convert to full template objects
        if (Array.isArray(configData.config_value)) {
          const templateNames = configData.config_value as string[];
          const mappedTemplates = templateNames.map((name, index) => 
            this.createTemplateFromName(name, index)
          );
          return { data: mappedTemplates, error: null };
        }
      }

      // If no templates found, return the default hardcoded ones
      return { data: this.getDefaultTemplates(), error: null };

    } catch (err) {
      console.error('Unexpected error fetching content templates:', err);
      return { data: this.getDefaultTemplates(), error: null };
    }
  }

  // Create template object from just a name (for app_config fallback)
  private static createTemplateFromName(name: string, index: number): ContentTemplate {
    const defaults = {
      id: `template-${index + 1}`,
      name: name,
      description: `Professional ${name.toLowerCase()} content optimized for SEO and engagement.`,
      icon: this.getIconForTemplate(name),
      recommendedProvider: this.getProviderForTemplate(name),
      estimatedCost: 0.015,
      targetLength: 1800,
      seoAdvantages: ['SEO optimized', 'Engagement focused', 'Professional quality'],
      exampleTitles: [
        `Sample ${name} Title 1`,
        `Example ${name} Article 2`
      ],
      difficulty: 'medium' as const
    };

    return defaults;
  }

  // Get appropriate icon for template name
  private static getIconForTemplate(name: string): string {
    const iconMap: Record<string, string> = {
      'How-To Guide': '📖',
      'Product Showcase': '🛍️',
      'Industry Trends': '📊',
      'Buying Guide': '🛒',
      'Case Study': '📈',
      'News & Updates': '📰',
      'Tutorial': '🎓',
      'Review': '⭐',
      'Comparison': '⚖️',
      'Interview': '🎤',
      'Analysis': '📋',
      'Announcement': '📢'
    };

    return iconMap[name] || '📄';
  }

  // Get recommended provider for template
  private static getProviderForTemplate(name: string): 'anthropic' | 'openai' | 'google' {
    const providerMap: Record<string, 'anthropic' | 'openai' | 'google'> = {
      'How-To Guide': 'anthropic',
      'Product Showcase': 'openai',
      'Industry Trends': 'google',
      'Buying Guide': 'anthropic',
      'Case Study': 'openai',
      'News & Updates': 'google',
      'Tutorial': 'anthropic',
      'Review': 'openai',
      'Comparison': 'anthropic',
      'Interview': 'openai',
      'Analysis': 'anthropic',
      'Announcement': 'google'
    };

    return providerMap[name] || 'anthropic';
  }

  // Default templates as fallback
  private static getDefaultTemplates(): ContentTemplate[] {
    return [
      {
        id: 'how-to-guide',
        name: 'How-To Guide',
        description: 'Step-by-step instructional content that teaches users how to accomplish specific tasks',
        icon: '📖',
        recommendedProvider: 'anthropic',
        estimatedCost: 0.015,
        targetLength: 2000,
        seoAdvantages: ['High search intent', 'Featured snippet potential', 'Long-tail keyword targeting'],
        exampleTitles: [
          'How to Set Up Shopify Payments in India',
          'How to Create Custom Product Pages in Shopify',
          'How to Optimize Your Shopify Store for Mobile'
        ],
        difficulty: 'easy'
      },
      {
        id: 'product-showcase',
        name: 'Product Showcase',
        description: 'Detailed product reviews, comparisons, and showcases to drive purchase decisions',
        icon: '🛍️',
        recommendedProvider: 'openai',
        estimatedCost: 0.03,
        targetLength: 1500,
        seoAdvantages: ['Commercial intent keywords', 'Product schema markup', 'Review snippets'],
        exampleTitles: [
          'Best Shopify Themes for Indian E-commerce Stores',
          'Top 10 Shopify Apps for Small Businesses',
          'Premium vs Free Shopify Themes: Complete Comparison'
        ],
        difficulty: 'medium'
      },
      {
        id: 'industry-trends',
        name: 'Industry Trends',
        description: 'Analysis of current market trends, industry insights, and future predictions',
        icon: '📊',
        recommendedProvider: 'google',
        estimatedCost: 0.005,
        targetLength: 1800,
        seoAdvantages: ['Trending keywords', 'News optimization', 'Authority building'],
        exampleTitles: [
          '2024 E-commerce Trends in India: What Shopify Merchants Need to Know',
          'The Rise of Social Commerce: Shopify Integration Strategies',
          'Mobile Commerce Trends Shaping Indian Online Retail'
        ],
        difficulty: 'medium'
      },
      {
        id: 'buying-guide',
        name: 'Buying Guide',
        description: 'Comprehensive guides to help customers make informed purchasing decisions',
        icon: '🛒',
        recommendedProvider: 'anthropic',
        estimatedCost: 0.02,
        targetLength: 2500,
        seoAdvantages: ['High commercial intent', 'Comparison keywords', 'Purchase funnel targeting'],
        exampleTitles: [
          'Complete Guide to Choosing the Right Shopify Plan for Your Business',
          'Shopify vs WooCommerce: Which Platform is Right for You?',
          'Essential Shopify Apps: A Buyer\'s Guide for Indian Stores'
        ],
        difficulty: 'hard'
      },
      {
        id: 'case-study',
        name: 'Case Study',
        description: 'Real-world success stories and detailed analysis of business achievements',
        icon: '📈',
        recommendedProvider: 'openai',
        estimatedCost: 0.025,
        targetLength: 2200,
        seoAdvantages: ['Authority building', 'Trust signals', 'Industry expertise'],
        exampleTitles: [
          'How This Indian Fashion Brand Scaled to ₹10 Crores Using Shopify',
          'From Zero to Hero: A Shopify Success Story from Mumbai',
          'Case Study: Doubling Sales with Shopify Plus Migration'
        ],
        difficulty: 'hard'
      },
      {
        id: 'news-update',
        name: 'News & Updates',
        description: 'Timely news articles about platform updates, industry changes, and announcements',
        icon: '📰',
        recommendedProvider: 'google',
        estimatedCost: 0.008,
        targetLength: 1000,
        seoAdvantages: ['News optimization', 'Quick indexing', 'Current events targeting'],
        exampleTitles: [
          'Shopify Announces New Features for Indian Merchants',
          'Latest Updates to Shopify Payments in India',
          'New Shopify Apps Released This Month: A Roundup'
        ],
        difficulty: 'easy'
      },
      {
        id: 'tutorial',
        name: 'Tutorial',
        description: 'In-depth educational content that provides comprehensive learning experiences',
        icon: '🎓',
        recommendedProvider: 'anthropic',
        estimatedCost: 0.018,
        targetLength: 2800,
        seoAdvantages: ['Educational keywords', 'Long-form content', 'Authority building'],
        exampleTitles: [
          'Complete Shopify SEO Tutorial for Indian Businesses',
          'Shopify Theme Development Tutorial: From Beginner to Pro',
          'Email Marketing Tutorial for Shopify Stores'
        ],
        difficulty: 'hard'
      },
      {
        id: 'review',
        name: 'Review',
        description: 'Detailed analysis and evaluation of products, services, or tools',
        icon: '⭐',
        recommendedProvider: 'openai',
        estimatedCost: 0.022,
        targetLength: 1600,
        seoAdvantages: ['Review snippets', 'Star ratings', 'Comparison traffic'],
        exampleTitles: [
          'Shopify Plus Review: Is It Worth the Investment?',
          'Top Shopify Payment Gateway Review for India',
          'Shopify App Store Review: Best Apps for 2024'
        ],
        difficulty: 'medium'
      },
      {
        id: 'comparison',
        name: 'Comparison',
        description: 'Side-by-side analysis comparing multiple options to help decision making',
        icon: '⚖️',
        recommendedProvider: 'anthropic',
        estimatedCost: 0.025,
        targetLength: 2100,
        seoAdvantages: ['Vs keywords', 'Decision-making content', 'Comparison tables'],
        exampleTitles: [
          'Shopify vs Magento: Which Platform is Better for Indian Stores?',
          'Free vs Paid Shopify Themes: Complete Comparison',
          'Shopify Payments vs Razorpay: India Payment Gateway Comparison'
        ],
        difficulty: 'hard'
      },
      {
        id: 'interview',
        name: 'Interview',
        description: 'Q&A format content featuring insights from industry experts and successful entrepreneurs',
        icon: '🎤',
        recommendedProvider: 'openai',
        estimatedCost: 0.02,
        targetLength: 1900,
        seoAdvantages: ['Expert insights', 'Personal stories', 'Authority content'],
        exampleTitles: [
          'Interview: How This Shopify Store Owner Built a ₹5 Crore Business',
          'Expert Interview: Future of E-commerce in India',
          'Shopify Success Story: Interview with Top Indian Merchant'
        ],
        difficulty: 'medium'
      },
      {
        id: 'analysis',
        name: 'Analysis',
        description: 'Deep-dive analytical content examining data, trends, and market insights',
        icon: '📋',
        recommendedProvider: 'anthropic',
        estimatedCost: 0.028,
        targetLength: 2400,
        seoAdvantages: ['Data-driven content', 'Industry analysis', 'Expert positioning'],
        exampleTitles: [
          'Indian E-commerce Market Analysis: Shopify Opportunities',
          'Shopify Store Performance Analysis: What Works in India',
          'Analysis: Why Indian Shopify Stores Succeed or Fail'
        ],
        difficulty: 'hard'
      },
      {
        id: 'announcement',
        name: 'Announcement',
        description: 'Official announcements, updates, and important news for your audience',
        icon: '📢',
        recommendedProvider: 'google',
        estimatedCost: 0.012,
        targetLength: 1200,
        seoAdvantages: ['Fresh content', 'News optimization', 'Timely relevance'],
        exampleTitles: [
          'Announcing Our New Shopify App Integration',
          'Important Update: New Features for Indian Merchants',
          'Announcement: Partnership with Leading Indian Payment Gateway'
        ],
        difficulty: 'easy'
      }
    ];
  }
} 