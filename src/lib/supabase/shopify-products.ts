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

  // Smart product selection for content topic
  static async getRelevantProducts(contentTopic: string, targetKeywords: string[] = []): Promise<ProductForContentGeneration[]> {
    try {
      console.log('🔍 getRelevantProducts called with:', { contentTopic, targetKeywords });

      const topicLower = contentTopic.toLowerCase();
      
      // For Madhubani specifically, use direct database search first
      if (topicLower.includes('madhubani')) {
        console.log('🎨 Detected Madhubani topic - searching specifically for Madhubani products');
        
        // Direct database search for Madhubani products - more comprehensive search
        const { data: madhubanProducts, error } = await supabase
          .from('shopify_products')
          .select('*')
          .or('title.ilike.%madhubani%,tags.cs.["madhubani art"],tags.cs.["madhubani"],tags.cs.["Madhubani Art"],collections.cs.["Madhubani Art"],tags.cs.["mithila"],title.ilike.%mithila%')
          .eq('status', 'active')
          .limit(20);

        if (!error && madhubanProducts && madhubanProducts.length > 0) {
          console.log('🎨 Found Madhubani products via direct search:', madhubanProducts.length);
          console.log('🎨 Sample:', madhubanProducts.slice(0, 3).map(p => ({ title: p.title, tags: p.tags })));
          
          // Filter to only highly relevant Madhubani products
          const relevantMadhuban = madhubanProducts.filter(product => {
            const titleLower = product.title.toLowerCase();
            const tagsLower = (product.tags || []).map((tag: string) => tag.toLowerCase());
            
            // Must have direct Madhubani references
            return titleLower.includes('madhubani') || 
                   titleLower.includes('mithila') ||
                   tagsLower.includes('madhubani') ||
                   tagsLower.includes('madhubani art') ||
                   tagsLower.includes('mithila') ||
                   (product.collections && product.collections.includes('Madhubani Art'));
          });
          
          console.log('🎨 Filtered to highly relevant Madhubani products:', relevantMadhuban.length);
          
          if (relevantMadhuban.length > 0) {
            const transformedProducts = relevantMadhuban.map(this.transformForContentGeneration);
            return transformedProducts.map((product, index) => ({
              ...product,
              relevanceScore: 95 - (index * 3) // High relevance for direct matches
            })).slice(0, 10); // Return top 10
          }
        } else {
          console.log('🎨 No Madhubani products found via direct search, error:', error);
        }
      }

      // Create semantic search terms that are more likely to match
      const baseTerms = [contentTopic, ...targetKeywords];
      const extractedTerms = contentTopic.toLowerCase().split(/[\s\-:.,!?]+/).filter(word => word.length > 2);
      
      // Add semantic expansions for art-related topics
      const semanticTerms: string[] = [];
      
      if (topicLower.includes('madhubani')) {
        semanticTerms.push('madhubani art', 'indian art', 'traditional art', 'folk art', 'bihar art', 'painting', 'madhubani', 'mithila');
      }
      if (topicLower.includes('art')) {
        semanticTerms.push('indian art', 'traditional', 'home decor', 'cultural', 'heritage', 'handicrafts', 'handmade art');
      }
      if (topicLower.includes('traditional')) {
        semanticTerms.push('indian art', 'cultural', 'heritage', 'handicrafts', 'traditional art');
      }
      if (topicLower.includes('painting')) {
        semanticTerms.push('art', 'indian art', 'traditional', 'handmade art');
      }

      const allSearchTerms = [...baseTerms, ...extractedTerms, ...semanticTerms];
      console.log('🔍 All search terms (including semantic):', allSearchTerms);

      // Get products by keywords with expanded search
      const productsByKeywords = await this.getProductsByKeywords(allSearchTerms)
      console.log('🔍 Products by keywords:', productsByKeywords.length);

      // Try collection matches (less likely to work but worth trying)
      const collectionMatches = await this.getProductsByCollection(
        contentTopic.toLowerCase().replace(/\s+/g, '-')
      )
      console.log('🔍 Collection matches:', collectionMatches.length);

      // Try broader art/decor searches as fallback
      let broadMatchProducts: ProductForContentGeneration[] = [];
      if (topicLower.includes('art') || topicLower.includes('traditional') || topicLower.includes('painting')) {
        broadMatchProducts = await this.getProductsByKeywords(['art', 'traditional', 'decor', 'indian', 'cultural']);
        console.log('🔍 Broad art/decor matches:', broadMatchProducts.length);
      }

      // Combine and deduplicate
      let allProducts = [...collectionMatches, ...productsByKeywords, ...broadMatchProducts]
      let uniqueProducts = allProducts.filter((product, index, self) => 
        index === self.findIndex(p => p.handle === product.handle)
      )

      console.log('🔍 Unique products after all searches:', uniqueProducts.length);

      // If still no matches, return a selection of all products
      if (uniqueProducts.length === 0) {
        console.log('🔍 No specific matches, getting all products as fallback');
        const fallbackProducts = await this.getAllProducts(10);
        console.log('🔍 Fallback products:', fallbackProducts.length);
        return fallbackProducts;
      }

      // Score products based on relevance
      const scoredProducts = uniqueProducts.map(product => {
        let score = 0;
        
        // Higher score for title matches
        if (product.title.toLowerCase().includes(topicLower)) score += 10;
        
        // Score for tag matches
        const productTags = (product.tags || []).map((tag: string) => tag.toLowerCase());
        semanticTerms.forEach(term => {
          if (productTags.some(tag => tag.includes(term))) score += 5;
        });
        
        // Score for any search term matches
        allSearchTerms.forEach(term => {
          const termLower = term.toLowerCase();
          if (product.title.toLowerCase().includes(termLower)) score += 3;
          if (productTags.some(tag => tag.includes(termLower))) score += 2;
        });

        return { ...product, relevanceScore: score };
      });

      // Sort by relevance score and return top matches
      scoredProducts.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
      const topProducts = scoredProducts.slice(0, 10);
      
      console.log('🔍 Top scored products:', topProducts.map(p => ({
        title: p.title,
        score: p.relevanceScore,
        tags: p.tags
      })));

      return topProducts;
    } catch (err) {
      console.error('Error getting relevant products:', err)
      // Fallback to all products if there's an error
      console.log('🔍 Error fallback: getting all products');
      return this.getAllProducts(10);
    }
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