import { shopifyClient } from './graphql-client';
import { ShopifyProductService } from '../supabase/shopify-products';
import { supabase } from '../supabase';

export interface ShopifyFile {
  id: string;
  url: string;
  alt?: string;
  fileStatus: string;
  createdAt: string;
  updatedAt: string;
  fileSize?: number;
  contentType?: string;
  originalSrc?: string;
  transformedSrc?: string;
}

export interface ShopifyImageSuggestion {
  url: string;
  alt: string;
  source: 'product' | 'file' | 'recent';
  relevance?: number;
  context?: string;
  productTitle?: string;
  productType?: string;
}

export interface ImageBrowserData {
  suggested: ShopifyImageSuggestion[];
  products: ShopifyImageSuggestion[];
  files: ShopifyImageSuggestion[];
  recent: ShopifyImageSuggestion[];
}

/**
 * Service for managing Shopify files and images
 */
export class ShopifyFilesService {
  
  /**
   * Get all files from Shopify Files API
   */
  static async getShopifyFiles(limit: number = 50): Promise<ShopifyFile[]> {
    const query = `
      query getFiles($first: Int!) {
        files(first: $first) {
          edges {
            node {
              id
              url
              alt
              fileStatus
              createdAt
              updatedAt
              fileSize
              ... on MediaImage {
                image {
                  originalSrc
                  transformedSrc
                  altText
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    try {
      const response = await shopifyClient.request(query, { 
        variables: { first: limit } 
      });
      
      return response.data.files.edges.map((edge: any) => {
        const node = edge.node;
        return {
          id: node.id,
          url: node.url,
          alt: node.alt || node.image?.altText || 'Shopify image',
          fileStatus: node.fileStatus,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
          fileSize: node.fileSize,
          originalSrc: node.image?.originalSrc,
          transformedSrc: node.image?.transformedSrc,
          contentType: node.image ? 'image' : 'file'
        };
      });
    } catch (error) {
      console.error('Error fetching Shopify files:', error);
      return [];
    }
  }

  /**
   * Get context-aware image suggestions based on article content
   */
  static async getContextAwareImageSuggestions(
    articleTitle: string,
    articleContent: string,
    articleTags: string[] = []
  ): Promise<ShopifyImageSuggestion[]> {
    try {
      // Extract keywords from article
      const keywords = [
        ...articleTags,
        ...articleTitle.toLowerCase().split(' '),
        ...this.extractKeywordsFromContent(articleContent)
      ].filter(Boolean);

      console.log('🔍 Getting context-aware images for keywords:', keywords.slice(0, 5));

      // Get relevant products using existing intelligence
      const relevantProducts = await ShopifyProductService.getStrictArtFormProducts(
        articleTitle,
        keywords
      );

      console.log('🎯 Found relevant products:', relevantProducts.length);

      // Get raw product data with images for the relevant products
      const productHandles = relevantProducts.map(p => p.handle);
      const { data: rawProducts, error } = await supabase
        .from('shopify_products')
        .select('*')
        .in('handle', productHandles)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching raw product data:', error);
        return [];
      }

      // Convert product images to suggestions
      const suggestions: ShopifyImageSuggestion[] = [];
      
      for (const rawProduct of rawProducts || []) {
        const relevantProduct = relevantProducts.find(p => p.handle === rawProduct.handle);
        const relevanceScore = (relevantProduct as any)?.relevanceScore || 80;

        if (Array.isArray(rawProduct.images)) {
          for (const imageUrl of rawProduct.images) {
            suggestions.push({
              url: imageUrl,
              alt: `${rawProduct.title} - ${rawProduct.product_type}`,
              source: 'product',
              relevance: relevanceScore,
              context: rawProduct.product_type,
              productTitle: rawProduct.title,
              productType: rawProduct.product_type
            });
          }
        }
      }

      // Sort by relevance
      suggestions.sort((a, b) => (b.relevance || 0) - (a.relevance || 0));

      console.log('✨ Generated suggestions:', suggestions.length);
      return suggestions.slice(0, 20); // Limit to top 20 suggestions

    } catch (error) {
      console.error('Error getting context-aware suggestions:', error);
      return [];
    }
  }

  /**
   * Get all product images organized by category
   */
  static async getProductImages(): Promise<ShopifyImageSuggestion[]> {
    try {
      // Get raw products from database to access images
      const { data: products, error } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('status', 'active')
        .order('title');

      if (error) {
        console.error('Error fetching products for images:', error);
        return [];
      }

      const images: ShopifyImageSuggestion[] = [];

      for (const product of products || []) {
        if (Array.isArray(product.images)) {
          for (const imageUrl of product.images) {
            images.push({
              url: imageUrl,
              alt: `${product.title} - ${product.product_type}`,
              source: 'product',
              context: product.product_type,
              productTitle: product.title,
              productType: product.product_type
            });
          }
        }
      }

      return images;
    } catch (error) {
      console.error('Error fetching product images:', error);
      return [];
    }
  }

  /**
   * Get complete image browser data
   */
  static async getImageBrowserData(
    articleTitle?: string,
    articleContent?: string,
    articleTags?: string[]
  ): Promise<ImageBrowserData> {
    try {
      console.log('📸 Fetching image browser data...');

      // Get all data in parallel
      const [suggestedImages, productImages, shopifyFiles] = await Promise.all([
        articleTitle ? this.getContextAwareImageSuggestions(articleTitle, articleContent || '', articleTags) : Promise.resolve([]),
        this.getProductImages(),
        this.getShopifyFiles()
      ]);

      // Convert Shopify files to suggestions
      const fileImages: ShopifyImageSuggestion[] = shopifyFiles
        .filter(file => file.contentType === 'image')
        .map(file => ({
          url: file.url,
          alt: file.alt || 'Shopify file',
          source: 'file' as const,
          context: 'uploaded file'
        }));

      // Get recent images (placeholder for now - would need tracking)
      const recentImages: ShopifyImageSuggestion[] = [];

      console.log('📊 Image browser data summary:', {
        suggested: suggestedImages.length,
        products: productImages.length,
        files: fileImages.length,
        recent: recentImages.length
      });

      return {
        suggested: suggestedImages,
        products: productImages,
        files: fileImages,
        recent: recentImages
      };
    } catch (error) {
      console.error('Error fetching image browser data:', error);
      return {
        suggested: [],
        products: [],
        files: [],
        recent: []
      };
    }
  }

  /**
   * Extract keywords from article content
   */
  private static extractKeywordsFromContent(content: string): string[] {
    // Simple keyword extraction - can be enhanced with NLP
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'were', 'will', 'would', 'could', 'should'].includes(word));

    // Get unique words and limit to top 10
    return [...new Set(words)].slice(0, 10);
  }

  /**
   * Search images by query
   */
  static async searchImages(query: string): Promise<ShopifyImageSuggestion[]> {
    try {
      const allImages = await this.getProductImages();
      const searchTerm = query.toLowerCase();

      // Filter images by search term
      const filteredImages = allImages.filter(image => 
        image.alt.toLowerCase().includes(searchTerm) ||
        image.context?.toLowerCase().includes(searchTerm) ||
        image.productTitle?.toLowerCase().includes(searchTerm) ||
        image.productType?.toLowerCase().includes(searchTerm)
      );

      return filteredImages.slice(0, 50);
    } catch (error) {
      console.error('Error searching images:', error);
      return [];
    }
  }
} 