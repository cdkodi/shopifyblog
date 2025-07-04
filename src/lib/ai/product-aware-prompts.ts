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
    // Check if this is a Product Showcase template - use enhanced prompt
    if (request.template === 'Product Showcase' && request.config) {
      return this.buildProductShowcasePrompt(request.config, productContext)
    }

    // Default product integration for other templates
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

  /**
   * Build enhanced Product Showcase prompt with storytelling structure
   */
  static buildProductShowcasePrompt(
    config: {
      topic: string
      tone: string
      wordCount: number
      targetKeyword: string
      relatedKeywords: string[]
      targetAudience: string
      metaDescription?: string
    },
    productContext: ProductContext
  ): string {
    const products = productContext.availableProducts
    const primaryProduct = products[0]
    
    // Determine tone-specific voice
    const toneMapping = {
      'professional': 'Inspirational and elegant',
      'storytelling': 'Warm and cultural, rich in heritage storytelling',
      'casual': 'Modern and approachable',
      'friendly': 'Bohemian and creative',
      'authoritative': 'Expert and sophisticated'
    }
    
    const voiceStyle = toneMapping[config.tone as keyof typeof toneMapping] || 'Inspirational and elegant'
    
    // Build structured product information
    const productShowcaseDetails = products.map(product => {
      return `
**Product: ${product.title}**
- Category: ${product.product_type}
- Collections: ${product.collections.join(', ')}
- Description: ${product.description}
- Cultural Context: ${this.generateCulturalContext(product)}
- Styling Opportunities: ${this.generateStylingContext(product)}`
    }).join('\n')

    return `**Act as an expert Brand Storyteller and Cultural Heritage Specialist.** Your task is to write a beautiful and inspiring blog article that showcases our traditional art and cultural products. The article must be optimized for search engines (SEO) and designed to create an emotional connection with our audience, inspiring them to explore the collection and make a purchase.

**1. ## Core Task & Desired Outcome:**

Write a blog article of approximately **${config.wordCount} words** that serves as a feature showcase for our product(s). The primary goal is to tell the story behind the product, highlighting its beauty, craftsmanship, cultural significance, and the lifestyle it represents. The secondary goal is to rank for relevant, purchase-intent keywords and drive traffic to the product/category page.

**2. ## Product & Cultural Details:**

* **Primary Product to Feature:** **${primaryProduct?.title || config.topic}**
* **Product Category:** **${primaryProduct?.product_type || 'Traditional Art'}**
* **Cultural Heritage Focus:** **${config.topic}**

${productShowcaseDetails}

* **Target Audience Persona:** **${config.targetAudience}** Focus on their values, lifestyle, and aesthetic preferences. These are individuals who appreciate authentic cultural art, traditional craftsmanship, and meaningful home decor that tells a story.

**3. ## SEO & Keyword Strategy:**

* **Primary Keyword:** **${config.targetKeyword}**
* **Secondary Keywords:** **${config.relatedKeywords.join(', ')}**
* **Instructions:**
    * Integrate the **Primary Keyword** naturally into the title, the first paragraph, at least one H2 heading, and the conclusion.
    * Weave the **Secondary Keywords** into subheadings and body content where you discuss cultural significance, artistic techniques, or styling concepts.
    * Create content that naturally ranks for these terms while maintaining storytelling flow.

**4. ## Content Structure & Tone:**

* **Tone of Voice:** **${voiceStyle}** The writing should be descriptive and sensory, using evocative language to paint a picture for the reader. Focus on cultural heritage, traditional techniques, and the stories behind each piece.
* **Format:** Use Markdown for formatting.

    * **Evocative & Intriguing Title (H1):** The title should spark curiosity and capture the essence of the cultural story or artistic tradition (e.g., "The Sacred Art of ${config.topic}: Where Ancient Traditions Meet Modern Homes" or "Beyond Decoration: The Stories Hidden in ${config.topic}").
    
    * **Introduction:**
        * Start with a hook that connects to the reader's desire for meaningful, authentic home decor
        * Introduce the cultural art form and the story you'll be sharing
        * Set the cultural and historical scene
    
    * **Body Paragraphs (using H2 and H3 for subheadings):**
        * **Section 1: The Cultural Story Begins (The Heritage & Inspiration):** Dive deep into the origin story. What ancient traditions does this art form represent? What cultural significance does it carry? What mood, place, or spiritual meaning does it capture?
        
        * **Section 2: Masters of Ancient Craft (The Artisan/Process):** Focus on the traditional techniques. Describe the materials, the generations-old skills, and the cultural knowledge that goes into creating each piece. This builds immense cultural value and justifies the authenticity.
        
        * **Section 3: Bringing Cultural Heritage to Life (Styling/Modern Integration):** This is crucial. Give the reader concrete ideas on how to incorporate authentic cultural art into their modern lifestyle:
            * **For Traditional Art:** "Creating a Cultural Focal Point with ${primaryProduct?.title}" or "Honoring Heritage: How to Style ${config.topic} in Contemporary Spaces"
            * **For Home Decor:** "Building a Meaningful Gallery Wall" or "Creating Sacred Spaces with Traditional Art"
            * **For Cultural Significance:** "Understanding the Symbols and Stories" or "Connecting with Ancient Wisdom Through Art"
    
    * **Conclusion:**
        * Briefly summarize the cultural significance and artistic beauty
        * Reinforce the feeling of connecting with heritage and authentic craftsmanship
        * Include a strong, inspiring **Call to Action (CTA)**

**5. ## Product Integration Guidelines:**

${this.getEnhancedIntegrationInstructions(productContext.integrationStyle, products)}

**6. ## Engagement & Cultural Authenticity:**

* **Cultural Respect:** Ensure accurate representation of traditional art forms and their cultural significance
* **Sensory Details:** Use rich, evocative language that helps readers visualize and feel the art
* **Heritage Connection:** Emphasize the connection between ancient traditions and modern appreciation
* **Authenticity:** Focus on genuine cultural stories, not generic product descriptions

**7. ## Visual Content Guidance:**

Indicate where high-quality images should go:
* \`[Placeholder for a high-resolution hero shot of the featured artwork in a beautifully styled setting]\`
* \`[Placeholder for a close-up detail shot showing traditional techniques and craftsmanship]\`
* \`[Placeholder for a lifestyle image showing the artwork in a modern home context]\`
* \`[Placeholder for a behind-the-scenes shot of traditional artisans at work, if available]\`
* \`[Placeholder for styling inspiration photos showing different ways to display the art]\`

**8. ## Call to Action (CTA):**

The final CTA should be inviting and focused on cultural discovery and heritage appreciation:
* **Examples:** "Discover our authentic ${config.topic} collection and bring home a piece of cultural heritage." or "Explore the timeless beauty of traditional ${config.topic} and find the perfect piece for your home." or "Honor ancient traditions - browse our curated ${config.topic} collection."

**9. ## Product Integration Syntax:**

When naturally mentioning products in your storytelling, use this format: [PRODUCT:product-handle]
Examples:
- "The intricate details in [PRODUCT:${products[0]?.handle}] showcase the traditional ${config.topic} techniques passed down through generations"
- "Pieces like [PRODUCT:${products[1]?.handle}] represent the pinnacle of authentic ${config.topic} artistry"

**10. ## What to Emphasize:**

* Focus on cultural heritage and authentic traditional techniques
* Emphasize the stories and spiritual significance behind each art form
* Connect ancient wisdom with modern lifestyle and home styling
* Highlight the uniqueness and authenticity of traditional craftsmanship
* Create emotional connections with cultural heritage and meaningful living

Remember: The goal is to educate readers about ${config.topic} while inspiring them to connect with their cultural heritage through authentic traditional art that transforms their living spaces into meaningful, story-rich environments.`
  }

  /**
   * Generate cultural context for products
   */
  private static generateCulturalContext(product: ProductForContentGeneration): string {
    const title = product.title.toLowerCase()
    const collections = product.collections.join(' ').toLowerCase()
    
    if (title.includes('madhubani') || collections.includes('madhubani')) {
      return 'Ancient Mithila art tradition from Bihar, featuring sacred symbols and natural motifs'
    } else if (title.includes('pichwai') || collections.includes('pichwai')) {
      return 'Traditional temple art from Rajasthan depicting Lord Krishna and divine narratives'
    } else if (title.includes('kerala') || collections.includes('kerala')) {
      return 'Classical mural art from Kerala temples with rich mythological stories'
    } else if (title.includes('ganesha') || collections.includes('ganesha')) {
      return 'Sacred representation of the remover of obstacles, bringing blessings to homes'
    } else if (title.includes('traditional') || collections.includes('traditional')) {
      return 'Authentic Indian folk art representing centuries-old cultural traditions'
    }
    return 'Traditional Indian art form representing rich cultural heritage and spiritual significance'
  }

  /**
   * Generate styling context for products
   */
  private static generateStylingContext(product: ProductForContentGeneration): string {
    const productType = product.product_type.toLowerCase()
    
    if (productType.includes('art') || productType.includes('painting')) {
      return 'Perfect as a focal point in living rooms, meditation spaces, or cultural gallery walls'
    } else if (productType.includes('home') || productType.includes('decor')) {
      return 'Ideal for creating sacred spaces, enhancing entryways, or adding cultural richness to any room'
    } else if (productType.includes('fashion') || productType.includes('accessory')) {
      return 'Elegant way to carry cultural heritage and express personal connection to traditions'
    }
    return 'Versatile piece for incorporating cultural authenticity into modern lifestyle'
  }

  /**
   * Enhanced integration instructions for Product Showcase
   */
  private static getEnhancedIntegrationInstructions(style: string, products: ProductForContentGeneration[]): string {
    const baseInstructions = `
**Product Integration Strategy:**
- Weave products naturally into the cultural narrative
- Use products as examples of authentic traditional techniques
- Connect each product mention to cultural heritage and significance
- Focus on storytelling rather than sales language
- Integrate approximately ${products.length} products throughout the ${products.length > 2 ? 'sections' : 'content'}
`

    switch (style) {
      case 'showcase':
        return baseInstructions + `
**SHOWCASE STYLE - Featured Product Sections:**
- Create dedicated subsections highlighting specific pieces as prime examples
- Include detailed descriptions of traditional techniques visible in each product
- Explain the cultural significance and symbolism of featured items
- Use products to illustrate key points about the art form's heritage`

      case 'subtle':
        return baseInstructions + `
**SUBTLE STYLE - Natural Cultural Flow:**
- Mention products organically as part of the cultural storytelling
- Reference products when they genuinely illustrate traditional techniques
- Avoid obvious product placement; let the cultural narrative lead
- Focus on the art form's heritage with products as supporting examples`

      case 'contextual':
      default:
        return baseInstructions + `
**CONTEXTUAL STYLE - Cultural Context Integration:**
- Use products as authentic examples throughout the cultural education
- Integrate product mentions when discussing specific techniques or traditions
- Balance cultural storytelling with relevant product illustrations
- Ensure each product mention enhances understanding of the art form's heritage`
    }
  }
} 