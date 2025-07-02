import { supabase } from '../supabase'
import type { Database } from '../types/database'

export interface ShopifyProduct {
  id: string
  shopify_id: number
  title: string
  handle: string
  description?: string
  product_type?: string
  collections: string[]
  tags: string[]
  images: string[]
  price_min?: number
  price_max?: number
  inventory_quantity?: number
  status: 'active' | 'draft' | 'archived'
  shopify_url: string
  created_at: string
  updated_at: string
  last_synced: string
}

export interface ProductForContentGeneration {
  handle: string
  title: string
  description: string
  product_type: string
  collections: string[]
  tags: string[]
  relevanceKeywords: string[]
}

export class ShopifyProductService {
  // Get products by collection with limit
  static async getProductsByCollection(collectionName: string, limit: number = 20): Promise<ProductForContentGeneration[]> {
    try {
      const { data: products, error } = await supabase
        .from('shopify_products')
        .select('*')
        .contains('collections', JSON.stringify([collectionName]))
        .eq('status', 'active')
        .order('title')
        .limit(limit)

      if (error) {
        console.error('Error fetching products by collection:', error)
        return []
      }

      return products?.map(this.transformForContentGeneration) || []
    } catch (err) {
      console.error('Unexpected error fetching products:', err)
      return []
    }
  }

  // Get products by keywords/tags for content generation
  static async getProductsByKeywords(keywords: string[]): Promise<ProductForContentGeneration[]> {
    try {
      console.log('🔍 getProductsByKeywords called with:', keywords);

      // Filter out very short or common words
      const meaningfulKeywords = keywords.filter(keyword => 
        keyword && keyword.length > 2 && 
        !['the', 'and', 'with', 'for', 'new', '2025', 'celebrate'].includes(keyword.toLowerCase())
      );

      console.log('🔍 Meaningful keywords:', meaningfulKeywords);

      if (meaningfulKeywords.length === 0) {
        console.log('🔍 No meaningful keywords, returning empty array');
        return [];
      }

      // Build a more comprehensive search that handles multiple keywords better
      let query = supabase
        .from('shopify_products')
        .select('*')
        .eq('status', 'active')

      // Create individual OR conditions for each keyword
      const allConditions: string[] = [];

      meaningfulKeywords.forEach(keyword => {
        const lowerKeyword = keyword.toLowerCase();
        
        // Add conditions for each field
        allConditions.push(`title.ilike.%${lowerKeyword}%`);
        allConditions.push(`description.ilike.%${lowerKeyword}%`);
        allConditions.push(`tags::text.ilike.%${lowerKeyword}%`);
        allConditions.push(`collections::text.ilike.%${lowerKeyword}%`);
        
        // Special handling for compound keywords like "madhubani art"
        if (keyword.includes(' ')) {
          const spaceless = keyword.replace(/\s+/g, '');
          allConditions.push(`tags::text.ilike.%${spaceless}%`);
          allConditions.push(`title.ilike.%${spaceless}%`);
        }
      });

      const orCondition = allConditions.join(',');
      query = query.or(orCondition);

      const { data: products, error } = await query.order('title').limit(30)

      if (error) {
        console.error('Error fetching products by keywords:', error)
        return []
      }

      console.log('🔍 getProductsByKeywords found:', products?.length || 0, 'products');
      if (products?.length && products.length > 0) {
        console.log('🔍 Sample matches:', products.slice(0, 3).map(p => ({
          title: p.title,
          tags: p.tags
        })));
      }
      
      return products?.map(this.transformForContentGeneration) || []
    } catch (err) {
      console.error('Unexpected error fetching products by keywords:', err)
      return []
    }
  }

  // Get all active products for manual selection
  static async getAllActiveProducts(): Promise<ProductForContentGeneration[]> {
    try {
      const { data: products, error } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('status', 'active')
        .order('title')

      if (error) {
        console.error('Error fetching all products:', error)
        return []
      }

      return products?.map(this.transformForContentGeneration) || []
    } catch (err) {
      console.error('Unexpected error fetching all products:', err)
      return []
    }
  }

  // Transform database product to content generation format
  private static transformForContentGeneration(product: any): ProductForContentGeneration {
    return {
      handle: product.handle,
      title: product.title,
      description: product.description || '',
      product_type: product.product_type || '',
      collections: Array.isArray(product.collections) ? product.collections : [],
      tags: Array.isArray(product.tags) ? product.tags : [],
      relevanceKeywords: [
        ...Array.isArray(product.tags) ? product.tags : [],
        ...Array.isArray(product.collections) ? product.collections : [],
        product.product_type || '',
        ...product.title.toLowerCase().split(' ')
      ].filter(Boolean)
    }
  }

  // Smart product selection for content topic with improved relevance scoring
  static async getRelevantProducts(contentTopic: string, targetKeywords: string[] = []): Promise<ProductForContentGeneration[]> {
    try {
      console.log('🔍 getRelevantProducts called with:', { contentTopic, targetKeywords });

      const topicLower = contentTopic.toLowerCase();
      const MINIMUM_RELEVANCE = 75; // Only return products with 75%+ relevance
      
      // Extract meaningful keywords from topic and provided keywords
      const topicWords = this.extractMeaningfulWords(contentTopic);
      const allKeywords = [...new Set([...topicWords, ...targetKeywords])];
      
      console.log('🔍 Extracted meaningful keywords:', allKeywords);
      
      // For specific art forms, use direct database search first
      if (topicLower.includes('madhubani')) {
        console.log('🎨 Detected Madhubani topic - searching specifically for Madhubani products');
        
        const { data: madhubanProducts, error } = await supabase
          .from('shopify_products')
          .select('*')
          .or('title.ilike.%madhubani%,tags.cs.["madhubani art"],tags.cs.["madhubani"],tags.cs.["Madhubani Art"],collections.cs.["Madhubani Art"],tags.cs.["mithila"],title.ilike.%mithila%')
          .eq('status', 'active')
          .limit(20);

        if (!error && madhubanProducts && madhubanProducts.length > 0) {
          console.log('🎨 Found Madhubani products via direct search:', madhubanProducts.length);
          
          const transformedProducts = madhubanProducts.map(this.transformForContentGeneration);
          return transformedProducts.map((product, index) => ({
            ...product,
            relevanceScore: 95 - (index * 2) // High relevance for direct matches: 95%, 93%, 91%...
          })).slice(0, 10);
        }
      }

      // Get candidate products through multiple search strategies
      const candidates = await this.gatherProductCandidates(allKeywords, topicLower);
      console.log('🔍 Total candidate products found:', candidates.length);

      if (candidates.length === 0) {
        console.log('🔍 No candidates found, using intelligent fallback...');
        return this.getIntelligentFallback(topicLower);
      }

      // Score each product for relevance
      const scoredProducts = candidates.map(product => {
        const relevanceScore = this.calculateRelevanceScore(product, contentTopic, allKeywords);
        return { ...product, relevanceScore };
      });

      // Filter out products below minimum relevance threshold
      const relevantProducts = scoredProducts.filter(p => (p.relevanceScore || 0) >= MINIMUM_RELEVANCE);
      
      console.log('🔍 Products above relevance threshold:', relevantProducts.length);
      console.log('🔍 Filtered out low relevance products:', scoredProducts.length - relevantProducts.length);

      if (relevantProducts.length === 0) {
        console.log('🔍 No products meet relevance threshold, using intelligent fallback...');
        return this.getIntelligentFallback(topicLower);
      }

      // Sort by relevance score and return top matches
      relevantProducts.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      const topProducts = relevantProducts.slice(0, 10);
      
      console.log('🔍 Top relevant products:', topProducts.map(p => ({
        title: p.title,
        score: `${p.relevanceScore}%`,
        topTags: p.tags.slice(0, 3)
      })));

      return topProducts;
    } catch (err) {
      console.error('Error getting relevant products:', err);
      console.log('🔍 Error fallback: using intelligent fallback...');
      return this.getIntelligentFallback(contentTopic.toLowerCase());
    }
  }

  // Extract meaningful words from text, filtering out common words
  private static extractMeaningfulWords(text: string): string[] {
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'under', 'over', 'from', 'up', 'down', 'out', 'off', 'away', 'back', 'how', 'what', 'when', 'where', 'why', 'who', 'which', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'new', '2024', '2025', 'guide', 'complete', 'ultimate', 'best']);
    
    return text.toLowerCase()
      .split(/[\s\-:.,!?()]+/)
      .filter(word => 
        word.length > 2 && 
        !stopWords.has(word) && 
        !word.match(/^\d+$/) // Remove pure numbers
      );
  }

  // Gather product candidates through multiple search strategies
  private static async gatherProductCandidates(keywords: string[], topicLower: string): Promise<ProductForContentGeneration[]> {
    const candidates: ProductForContentGeneration[] = [];
    
    // Strategy 1: Direct keyword search
    for (const keyword of keywords) {
      const keywordProducts = await this.getProductsByKeywords([keyword]);
      candidates.push(...keywordProducts);
    }
    
    // Strategy 2: Multi-keyword search for better results
    if (keywords.length > 1) {
      const multiKeywordProducts = await this.getProductsByKeywords(keywords.slice(0, 3));
      candidates.push(...multiKeywordProducts);
    }
    
    // Strategy 3: Semantic expansion for art-related topics
    const semanticKeywords = this.getSemanticExpansion(topicLower);
    if (semanticKeywords.length > 0) {
      const semanticProducts = await this.getProductsByKeywords(semanticKeywords);
      candidates.push(...semanticProducts);
    }
    
    // Remove duplicates
    const uniqueCandidates = candidates.filter((product, index, self) => 
      index === self.findIndex(p => p.handle === product.handle)
    );
    
    return uniqueCandidates;
  }

  // Get semantic expansion keywords based on topic
  private static getSemanticExpansion(topicLower: string): string[] {
    const expansions: string[] = [];
    
    if (topicLower.includes('madhubani')) {
      expansions.push('madhubani art', 'indian art', 'traditional art', 'folk art', 'bihar art', 'painting', 'mithila');
    }
    if (topicLower.includes('pichwai')) {
      expansions.push('pichwai art', 'krishna', 'rajasthani art', 'traditional painting');
    }
    if (topicLower.includes('art') || topicLower.includes('painting')) {
      expansions.push('indian art', 'traditional', 'cultural', 'heritage', 'handicrafts', 'handmade');
    }
    if (topicLower.includes('traditional')) {
      expansions.push('indian art', 'cultural', 'heritage', 'handicrafts', 'folk art');
    }
    if (topicLower.includes('home') || topicLower.includes('decor')) {
      expansions.push('home decor', 'wall hanging', 'decorative', 'interior');
    }
    if (topicLower.includes('spiritual') || topicLower.includes('religious')) {
      expansions.push('ganesha', 'krishna', 'spiritual', 'religious', 'temple');
    }
    
    return expansions;
  }

  // Calculate relevance score (0-100) based on multiple factors
  private static calculateRelevanceScore(product: ProductForContentGeneration, contentTopic: string, keywords: string[]): number {
    let score = 0;
    const topicLower = contentTopic.toLowerCase();
    const titleLower = product.title.toLowerCase();
    const descLower = product.description.toLowerCase();
    const tagsLower = product.tags.map(tag => tag.toLowerCase());
    const collectionsLower = product.collections.map(col => col.toLowerCase());
    
    // Exact topic match in title (highest weight)
    if (titleLower.includes(topicLower)) {
      score += 40;
    }
    
    // Individual keyword matches in title
    let titleKeywordMatches = 0;
    keywords.forEach(keyword => {
      if (titleLower.includes(keyword.toLowerCase())) {
        titleKeywordMatches++;
        score += 15;
      }
    });
    
    // Tag matches (very important for our products)
    let tagMatches = 0;
    keywords.forEach(keyword => {
      tagsLower.forEach(tag => {
        if (tag.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(tag)) {
          tagMatches++;
          score += 12;
        }
      });
    });
    
    // Collection matches
    keywords.forEach(keyword => {
      collectionsLower.forEach(collection => {
        if (collection.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(collection)) {
          score += 10;
        }
      });
    });
    
    // Description matches (lower weight)
    keywords.forEach(keyword => {
      if (descLower.includes(keyword.toLowerCase())) {
        score += 5;
      }
    });
    
    // Bonus for multiple matches (indicates strong relevance)
    if (titleKeywordMatches >= 2) score += 10;
    if (tagMatches >= 2) score += 8;
    
    // Product type bonus for art-related searches
    const productTypeLower = product.product_type.toLowerCase();
    if (topicLower.includes('art') && productTypeLower.includes('art')) {
      score += 15;
    }
    
    // Cap at 100 and ensure reasonable minimum
    return Math.min(Math.max(score, 0), 100);
  }

  // Intelligent fallback when no relevant products found
  private static async getIntelligentFallback(topicLower: string): Promise<ProductForContentGeneration[]> {
    console.log('🤔 Using intelligent fallback for topic:', topicLower);
    
    // Try broader categories based on topic
    let fallbackKeywords: string[] = [];
    
    if (topicLower.includes('art') || topicLower.includes('painting') || topicLower.includes('traditional')) {
      fallbackKeywords = ['art', 'traditional', 'painting'];
    } else if (topicLower.includes('home') || topicLower.includes('decor')) {
      fallbackKeywords = ['home decor', 'decorative'];
    } else if (topicLower.includes('spiritual') || topicLower.includes('religious')) {
      fallbackKeywords = ['ganesha', 'spiritual'];
    } else {
      // Last resort: get a curated selection of popular products
      fallbackKeywords = ['traditional', 'art', 'indian'];
    }
    
    const fallbackProducts = await this.getProductsByKeywords(fallbackKeywords);
    
    if (fallbackProducts.length > 0) {
      // Give them moderate relevance scores
      return fallbackProducts.slice(0, 8).map((product, index) => ({
        ...product,
        relevanceScore: 70 - (index * 2) // 70%, 68%, 66%...
      }));
    }
    
    // Ultimate fallback: return empty array rather than random products
    console.log('🚫 No suitable fallback products found');
    return [];
  }

  // Get all products with limit
  static async getAllProducts(limit: number = 20): Promise<ProductForContentGeneration[]> {
    try {
      const { data: products, error } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('status', 'active')
        .order('title')
        .limit(limit)

      if (error) {
        console.error('Error fetching all products:', error)
        return []
      }

      return products?.map(this.transformForContentGeneration) || []
    } catch (err) {
      console.error('Unexpected error fetching all products:', err)
      return []
    }
  }

  // Search products by query and collections
  static async searchProducts(
    searchQuery: string, 
    collections: string[] = [], 
    limit: number = 20
  ): Promise<ProductForContentGeneration[]> {
    try {
      let query = supabase
        .from('shopify_products')
        .select('*')
        .eq('status', 'active')

      // Add search query filter
      if (searchQuery && searchQuery.trim()) {
        const searchTerm = searchQuery.toLowerCase()
        query = query.or(
          `title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tags.cs.${JSON.stringify([searchTerm])}`
        )
      }

      // Add collection filter
      if (collections.length > 0) {
        const collectionFilter = collections.map(col => 
          `collections.cs.${JSON.stringify([col])}`
        ).join(',')
        query = query.or(collectionFilter)
      }

      const { data: products, error } = await query
        .order('title')
        .limit(limit)

      if (error) {
        console.error('Error searching products:', error)
        return []
      }

      return products?.map(this.transformForContentGeneration) || []
    } catch (err) {
      console.error('Unexpected error searching products:', err)
      return []
    }
  }
} 