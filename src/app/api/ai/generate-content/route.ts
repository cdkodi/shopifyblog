import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/ai';
import { AIGenerationRequest } from '@/lib/ai/types';
import { ProductAwarePromptBuilder, ProductAwareGenerationRequest } from '@/lib/ai/product-aware-prompts';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 AI Service Configuration Debug:');
    console.log('- Environment:', process.env.NODE_ENV);
    console.log('- Has Anthropic Key:', !!process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_API_KEY ? `(length: ${process.env.ANTHROPIC_API_KEY.length})` : '');
    console.log('- Has OpenAI Key:', !!process.env.OPENAI_API_KEY, process.env.OPENAI_API_KEY ? `(length: ${process.env.OPENAI_API_KEY.length})` : '');
    console.log('- Has Google Key:', !!process.env.GOOGLE_API_KEY, process.env.GOOGLE_API_KEY ? `(length: ${process.env.GOOGLE_API_KEY.length})` : '');
    
    const hasAnyKeys = !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.GOOGLE_API_KEY);
    console.log('- Has Any API Keys:', hasAnyKeys ? `✅ ${hasAnyKeys}` : `❌ ${hasAnyKeys}`);

    const body = await request.json();
    const { 
      prompt, 
      template, 
      tone, 
      length, 
      keywords, 
      preferredProvider, 
      options,
      // New product-aware parameters
      contentTopic,
      includeProducts,
      productOptions,
      // Enhanced config for specialized prompts
      config
    } = body;

    console.log('📝 Request parameters:', {
      promptLength: prompt?.length || 0,
      template: template?.id || 'unknown',
      tone,
      length,
      keywordsCount: keywords?.length || 0,
      preferredProvider,
      options,
      contentTopic,
      includeProducts,
      productOptions
    });

    // Validate required fields
    if (!prompt) {
      console.error('Validation failed: Prompt is required');
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('Getting AI service instance...');
    const aiService = getAIService();
    
    if (hasAnyKeys) {
      console.log('✅ AI API keys detected. Initializing real AI service manager.');
    } else {
      console.log('⚠️ No AI API keys found. Using MockAI service.');
    }
    
    console.log('AI service instance created successfully');

    // Create the prompt based on template and configuration
    let promptContent = '';
    
    if (template === 'product-showcase' && config) {
      // Enhanced Product Showcase prompt
      promptContent = `Create an engaging ${config.wordCount}-word article about ${config.topic} in a ${config.tone} tone.

Target Keyword: ${config.targetKeyword}
Related Keywords: ${config.relatedKeywords?.join(', ')}
Target Audience: ${config.targetAudience}

Please provide your response in this exact format:

TITLE: [Create a specific, engaging title that focuses on cultural significance, artistic techniques, or historical importance. AVOID generic patterns like "Complete Guide to..." or "Ultimate Guide to...". Instead use patterns like "The Art of...", "Cultural Heritage of...", "Traditional Techniques of...", or "Why [Topic] Continues to Inspire..."]

META_DESCRIPTION: [Write a compelling 150-160 character meta description that focuses on cultural heritage, artistic significance, and traditional craftsmanship. AVOID starting with "Learn about..." or "Discover everything about...". Instead use patterns like "Explore the rich cultural heritage of...", "Discover the artistic significance of...", or "Understand the traditional techniques behind..."]

CONTENT:
[Write the main article content here - ${config.wordCount} words]

Requirements:
- Include the target keyword "${config.targetKeyword}" naturally 2-3 times
- Use related keywords: ${config.relatedKeywords?.join(', ')}
- Write in ${config.tone} tone
- Focus on cultural significance and traditional craftsmanship
- Include practical information and cultural context
- Make it engaging and informative for ${config.targetAudience}
- Structure with clear headings and subheadings
- Include a compelling introduction and conclusion
- AVOID generic titles that start with "Complete Guide to", "Ultimate Guide to", "Everything About"
- AVOID generic meta descriptions that start with "Learn about", "Discover everything about"
- Focus on the unique cultural and artistic aspects of the topic`;
    } else {
      // Standard template prompt
      promptContent = `Create a comprehensive ${keywords?.length > 0 ? 'SEO-optimized' : ''} article with the following specifications:

Topic: ${prompt}
Target Keywords: ${keywords?.join(', ') || 'None specified'}
Tone: ${tone || 'professional'}
Template: ${template}

Please provide your response in this exact format:

TITLE: [Create a specific, engaging title that focuses on cultural significance, artistic techniques, or historical importance. AVOID generic patterns like "Complete Guide to..." or "Ultimate Guide to...". Instead use patterns like "The Art of...", "Cultural Heritage of...", "Traditional Techniques of...", or "Why [Topic] Continues to Inspire..."]

META_DESCRIPTION: [Write a compelling 150-160 character meta description that focuses on cultural heritage, artistic significance, and traditional craftsmanship. AVOID starting with "Learn about..." or "Discover everything about...". Instead use patterns like "Explore the rich cultural heritage of...", "Discover the artistic significance of...", or "Understand the traditional techniques behind..."]

CONTENT:
[Write the main article content here]

Requirements:
- Create an engaging, informative article
- Include the target keywords naturally throughout the content
- Use proper headings and subheadings for better readability
- Write in the specified tone
- Focus on providing value to readers
- Include practical information and actionable insights
- Make it comprehensive and well-structured
- Ensure the meta description is compelling and includes the main keyword
- AVOID generic titles that start with "Complete Guide to", "Ultimate Guide to", "Everything About"
- AVOID generic meta descriptions that start with "Learn about", "Discover everything about"
- Focus on the unique cultural and artistic aspects of the topic`;
    }

    // Prepare the base generation request
    const baseRequest: AIGenerationRequest = {
      prompt: promptContent,
      template,
      tone,
      length,
      keywords,
      options,
      config
    };

    // Enhance with product context if requested
    let finalRequest: ProductAwareGenerationRequest = baseRequest;
    if (includeProducts && contentTopic) {
      console.log('🛍️ Enhancing prompt with product context...');
      finalRequest = await ProductAwarePromptBuilder.enhancePromptWithProducts(
        baseRequest,
        contentTopic,
        {
          includeProducts: true,
          targetCollection: productOptions?.targetCollection,
          maxProducts: productOptions?.maxProducts || 5,
          integrationStyle: productOptions?.integrationStyle || 'contextual',
          wordsPerProduct: productOptions?.wordsPerProduct || 300
        }
      );
      
      console.log('📦 Product enhancement result:', {
        originalPromptLength: baseRequest.prompt.length,
        enhancedPromptLength: finalRequest.prompt.length,
        productsFound: finalRequest.productContext?.availableProducts.length || 0
      });
    }

    console.log('Calling AI service generateContent...');
    const result = await aiService.generateContent(finalRequest, preferredProvider);
    
    // Enhanced result logging with provider attempt details
    console.log('🎯 AI service response:', {
      success: result.success,
      contentLength: result.content?.length || 0,
      attemptsCount: result.attempts?.length || 0,
      finalProvider: result.finalProvider,
      totalCost: result.totalCost,
      hasError: !!result.error
    });

    // Log each attempt with detailed error information
    if (result.attempts && result.attempts.length > 0) {
      console.log('📊 Provider Attempts Details:');
      result.attempts.forEach((attempt, index) => {
        console.log(`  Attempt ${index + 1}:`, {
          provider: attempt.provider,
          success: attempt.success,
          responseTime: attempt.responseTime,
          cost: attempt.cost,
          error: attempt.error || 'none'
        });
      });
    }

    // If there's a general error, log it
    if (result.error) {
      console.log('❌ General Error Details:', {
        code: result.error.code,
        message: result.error.message,
        provider: result.error.provider,
        retryable: result.error.retryable,
        originalError: typeof result.error.originalError === 'string' ? 
          result.error.originalError : 
          result.error.originalError?.toString() || 'none'
      });
    }

    if (!result.success) {
      // Create a detailed error message for the client
      let errorMessage = 'Content generation failed';
      
      if (result.attempts && result.attempts.length > 0) {
        const lastAttempt = result.attempts[result.attempts.length - 1];
        if (lastAttempt.error) {
          errorMessage += `: ${lastAttempt.error}`;
        }
      } else if (result.error) {
        errorMessage += `: ${result.error.message}`;
        if (result.error.code) {
          errorMessage += ` (${result.error.code})`;
        }
      }

      return NextResponse.json(
        { 
          error: errorMessage,
          details: {
            attempts: result.attempts?.length || 0,
            providers: result.attempts?.map(a => a.provider).join(', ') || 'none',
            lastError: result.attempts?.[result.attempts.length - 1]?.error || result.error?.message || 'unknown'
          }
        },
        { status: 500 }
      );
    }

    // Process product mentions if this was a product-aware request
    let productMentions: Array<{
      handle: string;
      position: number;
      context: string;
    }> = [];
    let cleanContent = result.content;
    
    if (includeProducts && result.content) {
      console.log('🔍 Processing product mentions...');
      productMentions = ProductAwarePromptBuilder.extractProductMentions(result.content);
      cleanContent = ProductAwarePromptBuilder.cleanProductMarkers(result.content);
      
      console.log('📝 Product processing result:', {
        mentionsFound: productMentions.length,
        originalContentLength: result.content.length,
        cleanContentLength: cleanContent.length
      });
    }

    return NextResponse.json({
      success: true,
      content: cleanContent,
      finalProvider: result.finalProvider,
      totalCost: result.totalCost,
      totalTokens: result.totalTokens,
      attempts: result.attempts?.length || 0,
      // Product-aware response data
      productMentions,
      productContext: finalRequest.productContext,
      hasProductIntegration: includeProducts && productMentions.length > 0
    });

  } catch (error) {
    console.error('❌ API Route Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      type: typeof error,
      errorObject: error
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        error: `API route error: ${errorMessage}`,
        type: 'api_error'
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET endpoint for testing
export async function GET() {
  try {
    // Check if AI service can be initialized (env vars available)
    const aiService = getAIService();
    const availableProviders = aiService.getAvailableProviders();
    
    return NextResponse.json({
      success: true,
      message: 'Content generation API is available',
      availableProviders,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Service unavailable',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 