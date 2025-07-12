// V2 AI Generation API Endpoint

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultV2Service } from '@/lib/ai';
import { TopicGenerationRequest } from '@/lib/ai/v2-types';
import { ArticleService } from '@/lib/supabase/articles';

// Helper function to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Helper function to validate UUID format
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request structure
    if (!body.topic || !body.topic.title) {
      return NextResponse.json(
        { error: 'Topic with title is required' },
        { status: 400 }
      );
    }

    console.log('🚀 V2 AI Generation request:', {
      title: body.topic.title,
      template: body.topic.template,
      optimizeForSEO: body.optimizeForSEO,
      topicId: body.topic.id,
      topicIdValid: body.topic.id ? isValidUUID(body.topic.id) : 'N/A'
    });

    // Validate topic ID if provided
    if (body.topic.id && !isValidUUID(body.topic.id)) {
      console.warn('⚠️ Invalid topic ID format provided:', body.topic.id);
      // Set to null instead of using invalid ID
      body.topic.id = null;
    }

    // Build V2 generation request
    const generationRequest: TopicGenerationRequest = {
      topic: {
        id: body.topic.id,
        title: body.topic.title,
        keywords: body.topic.keywords || '',
        tone: body.topic.tone || 'professional',
        length: body.topic.length || 'medium',
        template: body.topic.template || 'article'
      },
      optimizeForSEO: body.optimizeForSEO ?? true,
      targetWordCount: body.targetWordCount || 1000,
      options: {
        temperature: body.temperature || 0.7,
        maxTokens: body.maxTokens || 2000
      }
    };

    // Log the target word count for debugging
    console.log('🎯 Target word count:', {
      bodyTargetWordCount: body.targetWordCount,
      requestTargetWordCount: generationRequest.targetWordCount,
      template: body.topic.template
    });

    // Get V2 service and generate content
    const v2Service = getDefaultV2Service();
    const startTime = Date.now();
    
    const result = await v2Service.generateFromTopic(generationRequest);
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    console.log('✅ V2 Generation completed:', {
      success: result.success,
      wordCount: result.generationMetadata?.wordCount,
      seoScore: result.generationMetadata?.seoScore,
      processingTime: `${processingTime}ms`,
      provider: result.finalProvider
    });

    // Check if generation was successful
    if (!result.success) {
      console.error('❌ V2 Generation failed:', result.error);
      
      // Extract proper error message from error object
      let errorMessage = 'Generation failed';
      let errorCode = 'UNKNOWN_ERROR';
      
      if (result.error) {
        if (typeof result.error === 'object') {
          errorMessage = result.error.message || 'Generation failed';
          errorCode = result.error.code || 'UNKNOWN_ERROR';
        } else if (typeof result.error === 'string') {
          errorMessage = result.error;
        }
      }
      
      console.error('❌ Error details:', { message: errorMessage, code: errorCode });
      
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          errorCode: errorCode,
          version: 'v2.1'
        },
        { status: 500 }
      );
    }

    // Check if fallback was used
    const fallbackUsed = result.attempts && result.attempts.length > 1;
    const primaryProvider = result.attempts?.[0]?.provider || 'unknown';
    if (fallbackUsed && result.attempts) {
      // Extract proper error message for logging
      const primaryError = result.attempts[0]?.error;
      const primaryErrorMessage = typeof primaryError === 'string' ? primaryError : 
                                  typeof primaryError === 'object' && primaryError?.message ? primaryError.message : 
                                  String(primaryError || 'Unknown error');
      
      console.log('🔄 Provider fallback occurred:', {
        primaryProvider,
        primaryError: primaryErrorMessage,
        finalProvider: result.finalProvider,
        totalAttempts: result.attempts.length
      });
    }

    // Optional: Create article in database if requested
    let createdArticle = null;
    let articleCreationError = null;
    if (body.createArticle) {
      try {
        console.log('🚀 Article creation requested, preparing data...');
        
        // Debug the result structure first
        console.log('🔍 Generation result structure:', {
          hasContent: !!result.content,
          contentLength: result.content?.length || 0,
          contentPreview: result.content?.substring(0, 100) || 'No content',
          hasParsedContent: !!result.parsedContent,
          parsedContentKeys: result.parsedContent ? Object.keys(result.parsedContent) : [],
          parsedContentLength: result.parsedContent?.content?.length || 0
        });

        const articleData = {
          title: result.parsedContent?.title || generationRequest.topic.title,
          content: result.parsedContent?.content || result.content || '',
          metaDescription: result.parsedContent?.metaDescription || '',
          slug: generateSlug(result.parsedContent?.title || generationRequest.topic.title),
          status: 'ready_for_editorial' as const,
          targetKeywords: result.parsedContent?.keywords || [],
          seoScore: result.generationMetadata?.seoScore || 0,
          wordCount: result.generationMetadata?.wordCount || 0,
          readingTime: result.generationMetadata?.readingTime || 0,
          // Only include sourceTopicId if it's a valid UUID
          sourceTopicId: (generationRequest.topic.id && isValidUUID(generationRequest.topic.id)) ? generationRequest.topic.id : undefined
        };

        console.log('📝 Creating article in database...', { 
          title: articleData.title,
          slug: articleData.slug,
          wordCount: articleData.wordCount,
          seoScore: articleData.seoScore,
          hasContent: !!articleData.content,
          contentLength: articleData.content.length,
          sourceTopicId: articleData.sourceTopicId,
          sourceTopicIdValid: articleData.sourceTopicId ? isValidUUID(articleData.sourceTopicId) : 'N/A'
        });
        
        const articleResult = await ArticleService.createArticle(articleData);
        console.log('📊 Article creation result:', { 
          success: !articleResult.error, 
          error: articleResult.error,
          hasData: !!articleResult.data,
          dataKeys: articleResult.data ? Object.keys(articleResult.data) : []
        });
        
        if (articleResult.error || !articleResult.data) {
          console.error('❌ Failed to create article:', articleResult.error);
          articleCreationError = articleResult.error;
          // Don't throw - let the generation response succeed even if article creation fails
        } else {
          createdArticle = articleResult.data;
          console.log('✅ Article created successfully:', {
            id: articleResult.data.id,
            title: articleResult.data.title,
            status: articleResult.data.status,
            slug: articleResult.data.slug
          });
          
          // Verify the article was saved with content
          console.log('🔍 Verifying saved article content:', {
            hasContent: !!articleResult.data.content,
            contentLength: articleResult.data.content?.length || 0,
            contentPreview: articleResult.data.content?.substring(0, 100) || 'No content saved'
          });
        }
      } catch (error) {
        console.error('❌ Error creating article:', error);
        console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        articleCreationError = error instanceof Error ? error.message : String(error);
        // Don't throw here - let the generation response still work
      }
    }

    // Return enhanced response with V2 metadata
    return NextResponse.json({
      success: true,
      data: {
        // Generated content
        content: result.parsedContent?.content || result.content,
        title: result.parsedContent?.title || 'Generated Article',
        metaDescription: result.parsedContent?.metaDescription || '',
        
        // V2 metadata
        generationMetadata: result.generationMetadata,
        
        // Quality metrics
        qualityMetrics: {
          wordCount: result.generationMetadata?.wordCount,
          readingTime: result.generationMetadata?.readingTime,
          seoScore: result.generationMetadata?.seoScore,
          keywordDensity: result.generationMetadata?.keywordDensity,
          contentStructure: result.generationMetadata?.contentStructure
        },
        
        // Generation details
        generationDetails: {
          provider: result.finalProvider,
          processingTimeMs: processingTime,
          cost: result.cost,
          ...(fallbackUsed && result.attempts && {
            fallback: {
              occurred: true,
              primaryProvider,
              primaryError: (() => {
                const primaryError = result.attempts[0]?.error;
                if (typeof primaryError === 'string') {
                  return primaryError;
                } else if (typeof primaryError === 'object' && primaryError?.message) {
                  return primaryError.message;
                } else {
                  return String(primaryError || 'Unknown error');
                }
              })(),
              totalAttempts: result.attempts.length,
              reason: (() => {
                const primaryError = result.attempts[0]?.error;
                const errorStr = typeof primaryError === 'string' ? primaryError : 
                                typeof primaryError === 'object' && primaryError?.message ? primaryError.message : 
                                String(primaryError || '');
                return errorStr.includes('safety filters') ? 'content_policy' : 'other';
              })()
            }
          })
        },
        
        // V2 enhancements
        v2Features: {
          topicBased: true,
          seoOptimized: generationRequest.optimizeForSEO,
          templateSpecific: !!generationRequest.topic.template,
          structureEnhanced: true
        },

        // Created article (if requested)
        ...(body.createArticle && {
          articleCreation: {
            requested: true,
            success: !!createdArticle,
            ...(createdArticle && {
              article: {
                id: createdArticle.id,
                title: createdArticle.title,
                slug: createdArticle.slug,
                status: createdArticle.status,
                createdAt: createdArticle.created_at
              }
            }),
            ...(articleCreationError && {
              error: articleCreationError
            })
          }
        })
      },
      version: 'v2.1'
    });

  } catch (error) {
    console.error('❌ V2 Generation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Generation failed';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        version: 'v2.1'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const v2Service = getDefaultV2Service();
    
    // Return V2 service health and capabilities
    const health = await v2Service.aiServiceManager.getProvidersHealth();
    const availableProviders = v2Service.aiServiceManager.getAvailableProviders();
    
    return NextResponse.json({
      service: 'V2 AI Generation Service',
      version: '2.1',
      status: 'healthy',
      capabilities: {
        topicBasedGeneration: true,
        backgroundProcessing: !!v2Service.generationQueue,
        seoOptimization: true,
        contentQualityAnalysis: true,
        templateSupport: true,
        multiProviderFallback: true
      },
      providers: {
        available: availableProviders,
        health
      },
      supportedTemplates: [
        'Product Showcase',
        'How-to Guide', 
        'Artist Showcase',
        'Buying Guide',
        'Industry Trends',
        'Comparison Article',
        'Review Article',
        'Seasonal Content',
        'Problem-Solution'
      ],
      contentStructures: ['standard', 'detailed', 'comprehensive'],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ V2 Generation service check failed:', error);
    
    return NextResponse.json(
      {
        service: 'V2 AI Generation Service',
        version: '2.1',
        status: 'error',
        error: error instanceof Error ? error.message : 'Service unavailable'
      },
      { status: 500 }
    );
  }
} 