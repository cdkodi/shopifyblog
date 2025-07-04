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
    // Check if this template uses specialized enhanced prompting
    if (request.config) {
      if (request.template === 'Product Showcase') {
        return this.buildProductShowcasePrompt(request.config, productContext)
      } else if (request.template === 'Painting Style') {
        return this.buildPaintingStylePrompt(request.config, productContext)
      } else if (request.template === 'Sculpture Style') {
        return this.buildSculptureStylePrompt(request.config, productContext)
      }
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

  /**
   * Build enhanced Painting Style prompt focusing on artistic techniques and visual storytelling
   */
  static buildPaintingStylePrompt(
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
    
    // Tone mapping specific to artistic/painting content
    const paintingToneMapping = {
      'professional': 'Authoritative and scholarly, rich in art historical knowledge',
      'storytelling': 'Rich in artistic terminology, visually poetic, and deeply appreciative of traditional techniques',
      'casual': 'Accessible and engaging, making art appreciation approachable',
      'friendly': 'Warm and encouraging, inspiring artistic curiosity',
      'authoritative': 'Expert and definitive, demonstrating deep artistic knowledge'
    }
    
    const voiceStyle = paintingToneMapping[config.tone as keyof typeof paintingToneMapping] || 'Authoritative and scholarly, rich in art historical knowledge'
    
    // Build structured painting information
    const paintingShowcaseDetails = products.map(product => {
      return `
**Artwork: ${product.title}**
- Art Form: ${product.product_type}
- Collections: ${product.collections.join(', ')}
- Description: ${product.description}
- Artistic Context: ${this.generateArtisticContext(product)}
- Visual Elements: ${this.generateVisualElements(product)}`
    }).join('\n')

    return `**Act as an expert Art Historian and Visual Arts Specialist.** Your task is to write an in-depth, visually rich article that explores painting techniques, artistic movements, and visual storytelling. The article should educate readers about painting methods while inspiring them to appreciate and collect authentic traditional art.

**1. ## Core Task & Desired Outcome:**

Write a comprehensive article of approximately **${config.wordCount} words** that serves as an artistic deep-dive into painting techniques and styles. The primary goal is to educate readers about the artistic process, visual elements, and cultural significance of painting traditions. The secondary goal is to inspire appreciation for authentic artworks and drive engagement with traditional painting collections.

**2. ## Artistic Focus & Cultural Details:**

* **Primary Painting Style:** **${config.topic}**
* **Art Historical Context:** **${primaryProduct?.product_type || 'Traditional Painting'}**
* **Visual Elements Focus:** **Color theory, composition, brushwork, symbolism**

${paintingShowcaseDetails}

* **Target Audience:** **${config.targetAudience}** - Art enthusiasts, collectors, and individuals seeking to understand traditional painting techniques and their cultural significance.

**3. ## SEO & Keyword Strategy:**

* **Primary Keyword:** **${config.targetKeyword}**
* **Secondary Keywords:** **${config.relatedKeywords.join(', ')}**
* **Instructions:**
    * Integrate the **Primary Keyword** naturally into the title, introduction, at least one H2 heading, and conclusion.
    * Weave **Secondary Keywords** into discussions of artistic techniques, visual elements, and cultural significance.
    * Create content that naturally ranks for art appreciation and technique-focused search terms.

**4. ## Content Structure & Artistic Tone:**

* **Tone of Voice:** **${voiceStyle}** The writing should be rich in artistic terminology, visually descriptive, and deeply appreciative of traditional techniques.
* **Format:** Use Markdown for formatting.

    * **Evocative & Scholarly Title (H1):** The title should capture the artistic essence and visual beauty (e.g., "The Visual Poetry of ${config.topic}: Brushstrokes That Tell Ancient Stories" or "Mastering ${config.topic}: Where Color Meets Cultural Heritage").
    
    * **Introduction:**
        * Begin with a vivid description of the visual impact of the art form
        * Introduce the artistic tradition and its visual language
        * Set the context for artistic exploration and appreciation
    
    * **Body Paragraphs (using H2 and H3 for subheadings):**
        * **Section 1: The Canvas Speaks (Visual Language & Composition):** Explore the visual elements - color palettes, composition rules, spatial relationships, and how artists create emotional impact through visual storytelling.
        
        * **Section 2: Masters of the Brush (Technique & Tradition):** Deep dive into the painting techniques - brushwork styles, pigment preparation, traditional methods passed down through generations, and the skill required to master the art form.
        
        * **Section 3: Stories in Paint (Symbolism & Cultural Narratives):** Analyze the symbolic elements, cultural stories depicted, spiritual significance, and how traditional paintings serve as cultural documents.
        
        * **Section 4: Bringing Art Home (Collecting & Appreciation):** Guide readers on how to appreciate, display, and care for traditional paintings:
            * **For Traditional Art:** "Creating an Art Gallery Wall with ${primaryProduct?.title}" or "Displaying ${config.topic} in Contemporary Spaces"
            * **For Color Harmony:** "Understanding Color Significance in ${config.topic}" or "Creating Visual Flow with Traditional Art"
            * **For Cultural Appreciation:** "Reading the Stories in Traditional Paintings" or "Connecting with Artistic Heritage Through Visual Art"
    
    * **Conclusion:**
        * Summarize the artistic significance and visual beauty
        * Reinforce the importance of preserving traditional painting techniques
        * Include a strong, art-appreciation focused **Call to Action (CTA)**

**5. ## Artwork Integration Guidelines:**

${this.getArtisticIntegrationInstructions(productContext.integrationStyle, products)}

**6. ## Visual & Artistic Elements:**

* **Artistic Accuracy:** Ensure correct terminology and accurate representation of painting techniques
* **Visual Descriptions:** Use rich, descriptive language that helps readers visualize brushwork, color relationships, and composition
* **Technical Appreciation:** Explain artistic concepts in accessible terms while maintaining scholarly depth
* **Cultural Context:** Connect painting techniques to their cultural and historical significance

**7. ## Visual Content Guidance:**

Indicate where high-quality images should go:
* \`[Placeholder for a high-resolution image showcasing the overall composition and color harmony of the featured painting]\`
* \`[Placeholder for detailed close-up shots showing brushwork techniques and paint application methods]\`
* \`[Placeholder for comparison images showing different stylistic approaches within the tradition]\`
* \`[Placeholder for process images showing traditional pigment preparation or painting techniques, if available]\`
* \`[Placeholder for gallery-style images showing how the artwork appears in display settings]\`

**8. ## Call to Action (CTA):**

The final CTA should be inspiring and focused on artistic appreciation and cultural preservation:
* **Examples:** "Explore our authentic ${config.topic} collection and bring timeless artistic beauty to your space." or "Discover the visual poetry of traditional ${config.topic} and find the perfect piece for your art collection." or "Celebrate artistic mastery - browse our curated ${config.topic} gallery."

**9. ## Artwork Integration Syntax:**

When naturally mentioning artworks in your analysis, use this format: [PRODUCT:product-handle]
Examples:
- "The masterful brushwork in [PRODUCT:${products[0]?.handle}] demonstrates the traditional ${config.topic} techniques perfected over centuries"
- "Works like [PRODUCT:${products[1]?.handle}] showcase the sophisticated color theory inherent in authentic ${config.topic} art"

**10. ## What to Emphasize:**

* Focus on artistic techniques and visual elements that make the art form unique
* Emphasize the skill, training, and cultural knowledge required to create authentic works
* Connect visual elements to cultural meaning and artistic tradition
* Highlight the irreplaceable value of traditional artistic knowledge
* Create appreciation for the artistic process and cultural preservation

Remember: The goal is to educate readers about ${config.topic} while inspiring them to appreciate and support traditional artistic practices that preserve cultural heritage through visual storytelling.`
  }

  /**
   * Generate artistic context for painting-related products
   */
  private static generateArtisticContext(product: ProductForContentGeneration): string {
    const title = product.title.toLowerCase()
    const collections = product.collections.join(' ').toLowerCase()
    
    if (title.includes('madhubani') || collections.includes('madhubani')) {
      return 'Ancient Mithila painting tradition featuring geometric patterns, natural motifs, and religious themes'
    } else if (title.includes('pichwai') || collections.includes('pichwai')) {
      return 'Traditional temple painting art depicting Lord Krishna with intricate details and symbolic narratives'
    } else if (title.includes('kerala') || collections.includes('kerala')) {
      return 'Classical mural painting from Kerala temples with vibrant colors and mythological stories'
    } else if (title.includes('warli') || collections.includes('warli')) {
      return 'Tribal art form from Maharashtra using simple geometric shapes to depict daily life'
    } else if (title.includes('tanjore') || collections.includes('tanjore')) {
      return 'Classical South Indian painting with gold foil work and rich cultural symbolism'
    }
    return 'Traditional Indian painting art representing rich cultural heritage and artistic traditions'
  }

  /**
   * Generate visual elements description for painting products
   */
  private static generateVisualElements(product: ProductForContentGeneration): string {
    const title = product.title.toLowerCase()
    const collections = product.collections.join(' ').toLowerCase()
    
    if (title.includes('madhubani') || collections.includes('madhubani')) {
      return 'Bold geometric patterns, natural earth pigments, intricate line work, and symbolic motifs'
    } else if (title.includes('pichwai') || collections.includes('pichwai')) {
      return 'Rich color palette, detailed figurative work, textile-like patterns, and divine symbolism'
    } else if (title.includes('kerala') || collections.includes('kerala')) {
      return 'Vibrant mineral colors, classical proportions, elaborate costume details, and narrative compositions'
    } else if (title.includes('warli') || collections.includes('warli')) {
      return 'Monochromatic white on brown, simple geometric forms, rhythmic patterns, and tribal symbolism'
    }
    return 'Traditional color palettes, cultural symbolism, authentic brushwork techniques, and compositional harmony'
  }

  /**
   * Build enhanced Sculpture Style prompt focusing on three-dimensional artistry and craftsmanship
   */
  static buildSculptureStylePrompt(
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
    
    // Tone mapping specific to sculpture/craftsmanship content
    const sculptureToneMapping = {
      'professional': 'Authoritative and reverent of traditional craftsmanship',
      'storytelling': 'Rich in tactile descriptions, deeply respectful of artisan skills and cultural traditions',
      'casual': 'Approachable and inspiring, making sculpture appreciation accessible',
      'friendly': 'Encouraging and warm, celebrating artisan mastery',
      'authoritative': 'Expert and definitive, demonstrating deep knowledge of sculptural arts'
    }
    
    const voiceStyle = sculptureToneMapping[config.tone as keyof typeof sculptureToneMapping] || 'Authoritative and reverent of traditional craftsmanship'
    
    // Build structured sculpture information
    const sculptureShowcaseDetails = products.map(product => {
      return `
**Sculpture: ${product.title}**
- Craft Type: ${product.product_type}
- Collections: ${product.collections.join(', ')}
- Description: ${product.description}
- Artistic Context: ${this.generateSculpturalContext(product)}
- Material & Technique: ${this.generateMaterialContext(product)}`
    }).join('\n')

    return `**Act as an expert Sculpture Specialist and Traditional Crafts Authority.** Your task is to write a comprehensive, tactilely rich article that explores sculptural techniques, three-dimensional artistry, and the mastery of traditional craftsmanship. The article should educate readers about sculptural processes while inspiring appreciation for authentic handcrafted works.

**1. ## Core Task & Desired Outcome:**

Write an in-depth article of approximately **${config.wordCount} words** that serves as a masterclass in sculptural arts and traditional craftsmanship. The primary goal is to educate readers about three-dimensional artistic processes, material mastery, and the physical skill required for traditional sculpture. The secondary goal is to inspire appreciation for handcrafted sculptures and traditional artisan work.

**2. ## Sculptural Focus & Craft Details:**

* **Primary Sculpture Type:** **${config.topic}**
* **Traditional Craft:** **${primaryProduct?.product_type || 'Traditional Sculpture'}**
* **Material Mastery:** **Stone, metal, wood, clay, or mixed media focus**

${sculptureShowcaseDetails}

* **Target Audience:** **${config.targetAudience}** - Craft enthusiasts, collectors of traditional art, and individuals who appreciate the mastery of three-dimensional artistic creation.

**3. ## SEO & Keyword Strategy:**

* **Primary Keyword:** **${config.targetKeyword}**
* **Secondary Keywords:** **${config.relatedKeywords.join(', ')}**
* **Instructions:**
    * Integrate the **Primary Keyword** naturally into the title, introduction, at least one H2 heading, and conclusion.
    * Weave **Secondary Keywords** into discussions of sculptural techniques, material properties, and craftsmanship mastery.
    * Create content that naturally ranks for craft appreciation and technique-focused search terms.

**4. ## Content Structure & Artisan Tone:**

* **Tone of Voice:** **${voiceStyle}** The writing should be reverent of traditional craftsmanship, rich in tactile descriptions, and deeply respectful of artisan skills.
* **Format:** Use Markdown for formatting.

    * **Compelling & Reverent Title (H1):** The title should honor the craftsmanship and dimensional artistry (e.g., "The Sacred Geometry of ${config.topic}: Where Stone Becomes Spirit" or "Masters of ${config.topic}: Three-Dimensional Stories Carved in Time").
    
    * **Introduction:**
        * Begin with the tactile and dimensional impact of the sculpture form
        * Introduce the traditional craft and its physical demands
        * Set the context for exploring artisan mastery and cultural significance
    
    * **Body Paragraphs (using H2 and H3 for subheadings):**
        * **Section 1: Form Takes Shape (Dimensional Design & Spatial Harmony):** Explore the principles of three-dimensional design - proportion, balance, negative space, and how sculptors create harmony in physical form.
        
        * **Section 2: Masters of Material (Traditional Techniques & Tool Mastery):** Deep dive into the sculptural process - tool usage, material preparation, carving/molding techniques, finishing methods, and the years of training required to master the craft.
        
        * **Section 3: Sacred Geometry & Cultural Forms (Symbolism & Spiritual Significance):** Analyze the symbolic meanings embedded in sculptural forms, religious and cultural significance, and how traditional sculptures serve as three-dimensional cultural narratives.
        
        * **Section 4: Living with Sculpture (Placement, Care & Appreciation):** Guide readers on selecting, displaying, and maintaining traditional sculptures:
            * **For Traditional Sculpture:** "Creating Sacred Spaces with ${primaryProduct?.title}" or "Displaying ${config.topic} in Contemporary Settings"
            * **For Dimensional Impact:** "Understanding Scale and Proportion in ${config.topic}" or "Creating Visual Weight with Traditional Sculpture"
            * **For Cultural Significance:** "Reading the Stories in Stone and Metal" or "Connecting with Artisan Heritage Through Sculptural Art"
    
    * **Conclusion:**
        * Summarize the craftsmanship mastery and cultural significance
        * Reinforce the importance of supporting traditional artisan skills
        * Include a strong, craftsmanship-appreciation focused **Call to Action (CTA)**

**5. ## Sculpture Integration Guidelines:**

${this.getSculpturalIntegrationInstructions(productContext.integrationStyle, products)}

**6. ## Tactile & Dimensional Elements:**

* **Craftsmanship Accuracy:** Ensure correct terminology and accurate representation of sculptural techniques
* **Material Descriptions:** Use language that conveys the weight, texture, and presence of sculpture
* **Technical Mastery:** Explain traditional techniques with respect for artisan knowledge and years of training
* **Cultural Respect:** Connect physical craftsmanship to spiritual and cultural meaning

**7. ## Visual Content Guidance:**

Indicate where high-quality images should go:
* \`[Placeholder for a high-resolution image showing the sculpture's full dimensional presence and overall form]\`
* \`[Placeholder for detailed shots highlighting tool marks, surface textures, and craftsmanship details]\`
* \`[Placeholder for process images showing traditional carving/molding techniques and artisan tools, if available]\`
* \`[Placeholder for scale reference images showing the sculpture in relation to human size or architectural elements]\`
* \`[Placeholder for installation images showing how the sculpture integrates with living or display spaces]\`

**8. ## Call to Action (CTA):**

The final CTA should honor traditional craftsmanship and artisan heritage:
* **Examples:** "Honor traditional artisan mastery - explore our authentic ${config.topic} collection." or "Celebrate sculptural excellence and support traditional crafts with our curated ${config.topic} selection." or "Bring the power of traditional sculpture into your space - discover our ${config.topic} masterpieces."

**9. ## Sculpture Integration Syntax:**

When naturally mentioning sculptures in your discussion, use this format: [PRODUCT:product-handle]
Examples:
- "The masterful carving in [PRODUCT:${products[0]?.handle}] demonstrates the traditional ${config.topic} techniques requiring years of dedicated training"
- "Works like [PRODUCT:${products[1]?.handle}] showcase the sophisticated understanding of form and material inherent in authentic ${config.topic} craftsmanship"

**10. ## What to Emphasize:**

* Focus on the physical skill and years of training required for sculptural mastery
* Emphasize material properties and how they influence the artistic process
* Connect traditional techniques to cultural preservation and artisan livelihoods
* Highlight the irreplaceable value of handcrafted traditional work
* Create appreciation for the tactile experience and three-dimensional cultural narratives

Remember: The goal is to educate readers about ${config.topic} while inspiring them to appreciate and support traditional artisan practices that preserve cultural heritage through three-dimensional storytelling.`
  }

  /**
   * Generate sculptural context for sculpture-related products
   */
  private static generateSculpturalContext(product: ProductForContentGeneration): string {
    const title = product.title.toLowerCase()
    const collections = product.collections.join(' ').toLowerCase()
    const productType = product.product_type.toLowerCase()
    
    if (title.includes('ganesha') || collections.includes('ganesha')) {
      return 'Sacred sculpture representing the remover of obstacles, carved with traditional iconographic precision'
    } else if (title.includes('buddha') || collections.includes('buddha')) {
      return 'Meditative sculpture embodying spiritual enlightenment and peaceful contemplation'
    } else if (title.includes('krishna') || collections.includes('krishna')) {
      return 'Divine sculpture capturing the playful and spiritual essence of the beloved deity'
    } else if (productType.includes('brass') || title.includes('brass')) {
      return 'Traditional metal sculpture showcasing ancient Indian metallurgy and casting techniques'
    } else if (productType.includes('stone') || title.includes('stone')) {
      return 'Hand-carved stone sculpture representing centuries-old stone carving traditions'
    } else if (productType.includes('wood') || title.includes('wood')) {
      return 'Traditional wood sculpture displaying master woodcarving skills and cultural artistry'
    }
    return 'Traditional Indian sculpture representing spiritual significance and artisan mastery'
  }

  /**
   * Generate material and technique context for sculpture products
   */
  private static generateMaterialContext(product: ProductForContentGeneration): string {
    const title = product.title.toLowerCase()
    const productType = product.product_type.toLowerCase()
    
    if (productType.includes('brass') || title.includes('brass')) {
      return 'Lost-wax casting technique, traditional brass alloy, hand-finishing and patina work'
    } else if (productType.includes('bronze') || title.includes('bronze')) {
      return 'Ancient bronze casting methods, traditional alloy composition, detailed surface finishing'
    } else if (productType.includes('stone') || title.includes('stone')) {
      return 'Hand-carving techniques, traditional chiseling methods, natural stone selection and preparation'
    } else if (productType.includes('wood') || title.includes('wood')) {
      return 'Traditional woodcarving tools, seasoned wood selection, hand-finishing and preservation'
    } else if (productType.includes('clay') || title.includes('terracotta')) {
      return 'Traditional clay preparation, hand-molding techniques, firing and glazing methods'
    }
    return 'Traditional artisan techniques, authentic materials, and time-honored craftsmanship methods'
  }

  /**
   * Artistic integration instructions for Painting Style
   */
  private static getArtisticIntegrationInstructions(style: string, products: ProductForContentGeneration[]): string {
    const baseInstructions = `
**Artwork Integration Strategy:**
- Reference artworks as examples of authentic traditional techniques
- Use paintings to illustrate specific artistic principles and methods
- Connect each artwork mention to art historical significance and technical mastery
- Focus on artistic education rather than commercial promotion
- Integrate approximately ${products.length} artworks throughout the artistic analysis
`

    switch (style) {
      case 'showcase':
        return baseInstructions + `
**SHOWCASE STYLE - Featured Artwork Analysis:**
- Create dedicated subsections analyzing specific pieces as prime examples of technique
- Include detailed descriptions of brushwork, composition, and color theory visible in each artwork
- Explain the art historical significance and technical innovations of featured pieces
- Use artworks to demonstrate key principles of the painting tradition`

      case 'subtle':
        return baseInstructions + `
**SUBTLE STYLE - Natural Artistic Flow:**
- Mention artworks organically as part of the art historical narrative
- Reference paintings when they genuinely illustrate specific techniques or principles
- Avoid obvious artwork promotion; let the artistic education lead
- Focus on the painting tradition with artworks as supporting visual examples`

      case 'contextual':
      default:
        return baseInstructions + `
**CONTEXTUAL STYLE - Art Historical Integration:**
- Use artworks as authentic examples throughout the artistic education
- Integrate painting mentions when discussing specific techniques, color theory, or composition
- Balance art historical education with relevant artwork illustrations
- Ensure each artwork mention enhances understanding of the painting tradition's technical mastery`
    }
  }

  /**
   * Sculptural integration instructions for Sculpture Style
   */
  private static getSculpturalIntegrationInstructions(style: string, products: ProductForContentGeneration[]): string {
    const baseInstructions = `
**Sculpture Integration Strategy:**
- Reference sculptures as examples of authentic traditional craftsmanship
- Use sculptural works to illustrate specific techniques and material mastery
- Connect each sculpture mention to cultural significance and artisan skill
- Focus on craftsmanship appreciation rather than commercial promotion
- Integrate approximately ${products.length} sculptures throughout the craft analysis
`

    switch (style) {
      case 'showcase':
        return baseInstructions + `
**SHOWCASE STYLE - Featured Sculpture Analysis:**
- Create dedicated subsections examining specific pieces as prime examples of technique
- Include detailed descriptions of carving methods, material handling, and dimensional design
- Explain the cultural significance and technical mastery of featured sculptures
- Use sculptures to demonstrate key principles of the three-dimensional craft tradition`

      case 'subtle':
        return baseInstructions + `
**SUBTLE STYLE - Natural Craft Flow:**
- Mention sculptures organically as part of the craftsmanship narrative
- Reference sculptural works when they genuinely illustrate specific techniques or cultural meanings
- Avoid obvious sculpture promotion; let the artisan education lead
- Focus on the sculptural tradition with works as supporting craft examples`

      case 'contextual':
      default:
        return baseInstructions + `
**CONTEXTUAL STYLE - Craft Heritage Integration:**
- Use sculptures as authentic examples throughout the craftsmanship education
- Integrate sculpture mentions when discussing specific techniques, materials, or cultural symbolism
- Balance craft education with relevant sculptural illustrations
- Ensure each sculpture mention enhances understanding of the tradition's artisan mastery`
    }
  }
} 