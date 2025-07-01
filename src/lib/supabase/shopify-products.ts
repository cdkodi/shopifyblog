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
  // Get products by collection for content generation
  static async getProductsByCollection(collectionName: string): Promise<ProductForContentGeneration[]> {
    try {
      const { data: products, error } = await supabase
        .from('shopify_products')
        .select('*')
        .contains('collections', JSON.stringify([collectionName]))
        .eq('status', 'active')
        .order('title')

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
      // Build a query that searches across title, description, tags, and collections
      let query = supabase
        .from('shopify_products')
        .select('*')
        .eq('status', 'active')

      // Create OR conditions for keyword matching
      const keywordConditions = keywords.map(keyword => {
        const lowerKeyword = keyword.toLowerCase()
        return [
          `title.ilike.%${lowerKeyword}%`,
          `description.ilike.%${lowerKeyword}%`,
          `tags.cs.${JSON.stringify([lowerKeyword])}`,
          `collections.cs.${JSON.stringify([lowerKeyword])}`
        ].join(',')
      }).join(',')

      query = query.or(keywordConditions)

      const { data: products, error } = await query.order('title').limit(20)

      if (error) {
        console.error('Error fetching products by keywords:', error)
        return []
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
      // Combine content topic and keywords for comprehensive search
      const searchTerms = [
        contentTopic,
        ...targetKeywords,
        // Extract key terms from topic
        ...contentTopic.toLowerCase().split(' ').filter(word => word.length > 3)
      ]

      // Get products by keywords
      const productsByKeywords = await this.getProductsByKeywords(searchTerms)

      // If we have specific collection matches, prioritize those
      const collectionMatches = await this.getProductsByCollection(
        contentTopic.toLowerCase().replace(/\s+/g, '-')
      )

      // Combine and deduplicate
      const allProducts = [...collectionMatches, ...productsByKeywords]
      const uniqueProducts = allProducts.filter((product, index, self) => 
        index === self.findIndex(p => p.handle === product.handle)
      )

      // Limit to top 10 most relevant products
      return uniqueProducts.slice(0, 10)
    } catch (err) {
      console.error('Error getting relevant products:', err)
      return []
    }
  }
} 