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

      // Build a query that searches across title, description, tags, and collections
      let query = supabase
        .from('shopify_products')
        .select('*')
        .eq('status', 'active')

      // Create OR conditions for keyword matching - make it more flexible
      const keywordConditions = meaningfulKeywords.map(keyword => {
        const lowerKeyword = keyword.toLowerCase()
        return [
          `title.ilike.%${lowerKeyword}%`,
          `description.ilike.%${lowerKeyword}%`,
          // Use ilike for tags to be more flexible than exact array matching
          `tags::text.ilike.%${lowerKeyword}%`,
          `collections::text.ilike.%${lowerKeyword}%`
        ].join(',')
      }).join(',')

      query = query.or(keywordConditions)

      const { data: products, error } = await query.order('title').limit(20)

      if (error) {
        console.error('Error fetching products by keywords:', error)
        return []
      }

      console.log('🔍 getProductsByKeywords found:', products?.length || 0, 'products');
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

      // Try specific searches first
      const searchTerms = [
        contentTopic,
        ...targetKeywords,
        // Extract key terms from topic (filter out short words and punctuation)
        ...contentTopic.toLowerCase().split(/[\s\-:.,!?]+/).filter(word => word.length > 2)
      ]

      console.log('🔍 Search terms:', searchTerms);

      // Get products by keywords
      const productsByKeywords = await this.getProductsByKeywords(searchTerms)
      console.log('🔍 Products by keywords:', productsByKeywords.length);

      // If we have specific collection matches, prioritize those
      const collectionMatches = await this.getProductsByCollection(
        contentTopic.toLowerCase().replace(/\s+/g, '-')
      )
      console.log('🔍 Collection matches:', collectionMatches.length);

      // Combine and deduplicate
      let allProducts = [...collectionMatches, ...productsByKeywords]
      let uniqueProducts = allProducts.filter((product, index, self) => 
        index === self.findIndex(p => p.handle === product.handle)
      )

      console.log('🔍 Unique products after search:', uniqueProducts.length);

      // If no specific matches found, return a selection of all products
      if (uniqueProducts.length === 0) {
        console.log('🔍 No specific matches, getting all products as fallback');
        const fallbackProducts = await this.getAllProducts(10);
        console.log('🔍 Fallback products:', fallbackProducts.length);
        return fallbackProducts;
      }

      // Limit to top 10 most relevant products
      return uniqueProducts.slice(0, 10)
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