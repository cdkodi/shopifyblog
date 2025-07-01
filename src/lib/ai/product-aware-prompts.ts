import { ShopifyProductService, ProductForContentGeneration } from '../supabase/shopify-products'
import { AIGenerationRequest } from './types'

export interface ProductContext {
  availableProducts: ProductForContentGeneration[]
  targetCollection?: string
  suggestedProductCount: number
  integrationStyle: 'contextual' | 'showcase' | 'subtle'
  linkFrequency: number // products per X words
}

export interface ProductAwareGenerationRequest extends AIGenerationRequest {
  productContext?: ProductContext
  includeProducts?: boolean
}

export class ProductAwarePromptBuilder {
  /**
   * Enhance an existing AI prompt with product context
   */
  static async enhancePromptWithProducts(
    request: AIGenerationRequest,
    contentTopic: string,
    options: {
      includeProducts?: boolean
      targetCollection?: string
      maxProducts?: number
      integrationStyle?: 'contextual' | 'showcase' | 'subtle'
      wordsPerProduct?: number
    } = {}
  ): Promise<ProductAwareGenerationRequest> {
    
    if (!options.includeProducts) {
      return request // Return original request if products not requested
    }

    try {
      // Get relevant products for the content topic
      const relevantProducts = await ShopifyProductService.getRelevantProducts(
        contentTopic,
        request.keywords || []
      )

      if (relevantProducts.length === 0) {
        console.log('No relevant products found for topic:', contentTopic)
        return request // Return original if no products found
      }

      // Limit products based on content length and preferences
      const maxProducts = options.maxProducts || this.calculateOptimalProductCount(request, options.wordsPerProduct || 300)
      const selectedProducts = relevantProducts.slice(0, maxProducts)

      // Create product context
      const productContext: ProductContext = {
        availableProducts: selectedProducts,
        targetCollection: options.targetCollection,
        suggestedProductCount: selectedProducts.length,
        integrationStyle: options.integrationStyle || 'contextual',
        linkFrequency: options.wordsPerProduct || 300
      }

      // Enhance the prompt
      const enhancedPrompt = this.buildProductAwarePrompt(request.prompt, productContext, request)

      return {
        ...request,
        prompt: enhancedPrompt,
        productContext,
        includeProducts: true
      }

    } catch (error) {
      console.error('Error enhancing prompt with products:', error)
      return request // Fallback to original request
    }
  }

  /**
   * Build the enhanced prompt with product integration instructions
   */
  private static buildProductAwarePrompt(
    originalPrompt: string,
    productContext: ProductContext,
    request: AIGenerationRequest
  ): string {
    const products = productContext.availableProducts
    const integrationStyle = productContext.integrationStyle

    // Format products for the prompt
    const productList = products.map(product => {
      return `- ${product.title} (${product.product_type}${product.collections.length > 0 ? `, collections: ${product.collections.join(', ')}` : ''})`
    }).join('\n')

    // Create integration instructions based on style
    const integrationInstructions = this.getIntegrationInstructions(integrationStyle, productContext.linkFrequency)

    const enhancedPrompt = `${originalPrompt}

PRODUCT INTEGRATION CONTEXT:
You have access to these relevant products from Culturati's collection that relate to this content:

${productList}

${integrationInstructions}

CONTENT REQUIREMENTS:
1. Write naturally about the topic while organically mentioning relevant products
2. Include approximately ${productContext.suggestedProductCount} product references throughout the content
3. Use product names naturally in context (e.g., "traditional art pieces like our ${products[0]?.title}")
4. DO NOT include prices, just product names and artistic/cultural descriptions
5. Focus on educational value and cultural significance, not sales language
6. Only mention products that genuinely enhance the reader's understanding of the topic

LINKING SYNTAX:
When mentioning a product, use this exact format: [PRODUCT:product-handle]
Examples:
- "The intricate details in [PRODUCT:${products[0]?.handle}] showcase traditional techniques"
- "Artists often create pieces similar to our [PRODUCT:${products[1]?.handle}]"

Remember: The goal is to educate readers about ${request.template || 'this topic'} while naturally introducing them to relevant artworks that exemplify the concepts being discussed.`

    return enhancedPrompt
  }

  /**
   * Get integration instructions based on style preference
   */
  private static getIntegrationInstructions(style: string, frequency: number): string {
    switch (style) {
      case 'showcase':
        return `INTEGRATION STYLE - SHOWCASE:
- Highlight products as prime examples of the art form being discussed
- Use products to illustrate key points and techniques
- Include brief descriptions of how each product exemplifies the topic`

      case 'subtle':
        return `INTEGRATION STYLE - SUBTLE:
- Mention products naturally as part of the narrative flow
- Avoid obvious product placement
- Reference products when they genuinely add context to the discussion`

      case 'contextual':
      default:
        return `INTEGRATION STYLE - CONTEXTUAL:
- Integrate products as relevant examples and illustrations
- Use products to support educational points being made
- Aim for approximately 1 product mention per ${frequency} words
- Balance educational content with natural product integration`
    }
  }

  /**
   * Calculate optimal number of products based on content length
   */
  private static calculateOptimalProductCount(request: AIGenerationRequest, wordsPerProduct: number): number {
    // Estimate target word count from request
    let estimatedWordCount = 800 // default

    if (request.length) {
      switch (request.length.toLowerCase()) {
        case 'short': estimatedWordCount = 500; break
        case 'medium': estimatedWordCount = 800; break
        case 'long': estimatedWordCount = 1200; break
        case 'very long': estimatedWordCount = 1800; break
      }
    }

    // Calculate products needed
    const calculatedProducts = Math.floor(estimatedWordCount / wordsPerProduct)
    
    // Ensure reasonable bounds (1-8 products)
    return Math.max(1, Math.min(8, calculatedProducts))
  }

  /**
   * Extract product mentions from generated content
   */
  static extractProductMentions(content: string): Array<{
    handle: string
    position: number
    context: string
  }> {
    const productPattern = /\[PRODUCT:([^\]]+)\]/g
    const mentions: Array<{ handle: string; position: number; context: string }> = []
    let match

    while ((match = productPattern.exec(content)) !== null) {
      const handle = match[1]
      const position = match.index
      
      // Extract context around the mention (50 characters before and after)
      const start = Math.max(0, position - 50)
      const end = Math.min(content.length, position + match[0].length + 50)
      const context = content.substring(start, end)

      mentions.push({
        handle,
        position,
        context: context.replace(/\[PRODUCT:[^\]]+\]/g, '***PRODUCT***') // Replace marker for readability
      })
    }

    return mentions
  }

  /**
   * Clean content by removing product markers
   */
  static cleanProductMarkers(content: string): string {
    return content.replace(/\[PRODUCT:[^\]]+\]/g, '')
  }

  /**
   * Validate that suggested products exist in our database
   */
  static async validateProductMentions(mentions: Array<{ handle: string }>): Promise<Array<{
    handle: string
    isValid: boolean
    product?: ProductForContentGeneration
  }>> {
    const results = []
    
    for (const mention of mentions) {
      try {
        // In a real implementation, you'd query the database to validate the handle
        // For now, we'll assume they're valid if they follow the expected format
        const isValid = mention.handle.length > 0 && !mention.handle.includes(' ')
        
        results.push({
          handle: mention.handle,
          isValid,
          // product: isValid ? await getProductByHandle(mention.handle) : undefined
        })
      } catch (error) {
        results.push({
          handle: mention.handle,
          isValid: false
        })
      }
    }

    return results
  }
} 