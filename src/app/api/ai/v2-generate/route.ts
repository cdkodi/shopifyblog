// V2 AI Generation API Endpoint

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultV2Service } from '@/lib/ai';
import { TopicGenerationRequest } from '@/lib/ai/v2-types';
import { ArticleService } from '@/lib/supabase/articles';
import { aiServiceManager } from '@/lib/ai'; // V1 fallback
import { AIGenerationRequest } from '@/lib/ai/types'; // V1 types

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

// Helper function to convert V2 request to V1 format for fallback
function convertV2ToV1Request(v2Request: TopicGenerationRequest): AIGenerationRequest {
  const keywords = v2Request.topic.keywords ? v2Request.topic.keywords.split(',').map(k => k.trim()) : [];
  
  // Create a simple V1 prompt based on V2 topic
  const prompt = `Write a ${v2Request.topic.tone || 'professional'} article about "${v2Request.topic.title}".
  
Topic: ${v2Request.topic.title}
Keywords: ${keywords.join(', ')}
Tone: ${v2Request.topic.tone || 'professional'}
Length: ${v2Request.topic.length || 'medium'}
Template: ${v2Request.topic.template || 'article'}

Please provide a well-structured article with:
1. An engaging title
2. A compelling introduction 
3. Well-organized main content
4. A strong conclusion
5. Include the keywords naturally throughout

Target word count: approximately ${v2Request.targetWordCount || 1000} words.`;

  return {
    prompt,
    template: v2Request.topic.template || 'article',
    tone: v2Request.topic.tone || 'professional',
    length: v2Request.topic.length || 'medium',
    keywords: keywords,
    options: {
      maxTokens: v2Request.options?.maxTokens || 2000,
      temperature: v2Request.options?.temperature || 0.7,
      ...v2Request.options
    }
  };
}

// Helper function to convert V1 result to V2 format
function convertV1ToV2Result(v1Result: any, originalRequest: TopicGenerationRequest): any {
  // Basic content parsing to extract title and content
  const content = v1Result.content || '';
  const lines = content.split('\n');
  
  // Try to find title and content
  let title = originalRequest.topic.title;
  let mainContent = content;
  
  // Simple parsing to extract title if present
  const titleMatch = content.match(/^(.*?)(?:\n|$)/);
  if (titleMatch && titleMatch[1].length < 100) {
    title = titleMatch[1].replace(/^#+\s*/, '').trim();
    mainContent = content.replace(titleMatch[0], '').trim();
  }
  
  // Basic word count
  const wordCount = mainContent.split(/\s+/).filter((word: string) => word.length > 0).length;
  
  // Mock V2 format result
  return {
    success: true,
    content: content,
    attempts: v1Result.attempts || [],
    totalCost: v1Result.totalCost || 0,
    totalTokens: v1Result.totalTokens || 0,
    finalProvider: v1Result.finalProvider || 'unknown',
    processingTime: v1Result.processingTime || 0,
    cost: v1Result.cost || 0,
    generationMetadata: {
      topicId: originalRequest.topic.id,
      promptVersion: 'v1-fallback',
      wordCount: wordCount,
      readingTime: Math.ceil(wordCount / 200),
      seoScore: 50, // Default fallback score
      keywordDensity: {},
      contentStructure: {
        hasIntroduction: true,
        hasConclusion: true,
        sectionCount: 3,
        headingCount: 1
      }
    },
    parsedContent: {
      title: title,
      metaDescription: mainContent.substring(0, 160) + '...',
      content: mainContent,
      headings: [title],
      keywords: originalRequest.topic.keywords ? originalRequest.topic.keywords.split(',').map(k => k.trim()) : []
    }
  };
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
    
    let result = await v2Service.generateFromTopic(generationRequest);
    
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
        if (typeof result.error === 'object' && result.error !== null) {
          // Type guard for objects with message property
          if ('message' in result.error && typeof result.error.message === 'string') {
            errorMessage = result.error.message;
          }
          if ('code' in result.error && typeof result.error.code === 'string') {
            errorCode = result.error.code;
          }
        } else if (typeof result.error === 'string') {
          errorMessage = result.error;
        }
      }
      
      console.error('❌ V2 Error details:', { message: errorMessage, code: errorCode });
      
      // 🔄 GRACEFUL FALLBACK TO V1 SYSTEM
      console.log('🔄 Attempting V1 fallback for failed V2 generation...');
      
      try {
        // Convert V2 request to V1 format
        const v1Request = convertV2ToV1Request(generationRequest);
        
        console.log('🔄 V1 fallback request:', {
          prompt: v1Request.prompt.substring(0, 200) + '...',
          template: v1Request.template,
          tone: v1Request.tone,
          length: v1Request.length,
          keywords: v1Request.keywords
        });
        
        // Call V1 system
        const v1StartTime = Date.now();
        const v1Result = await aiServiceManager.generateContent(v1Request);
        const v1ProcessingTime = Date.now() - v1StartTime;
        
        console.log('🔄 V1 fallback result:', {
          success: v1Result.success,
          provider: v1Result.finalProvider,
          processingTime: `${v1ProcessingTime}ms`,
          contentLength: v1Result.content?.length || 0
        });
        
        if (v1Result.success) {
          console.log('✅ V1 fallback successful! Converting to V2 format...');
          
          // Convert V1 result to V2 format
          const convertedResult = convertV1ToV2Result(v1Result, generationRequest);
          
          // Mark as fallback
          (convertedResult as any).fallbackUsed = true;
          (convertedResult as any).fallbackReason = 'V2 generation failed';
          (convertedResult as any).originalV2Error = errorMessage;
          
          // Update the result variable and continue with normal flow
          result = convertedResult;
          
          // Update processing time to include fallback
          const totalProcessingTime = processingTime + v1ProcessingTime;
          
          console.log('🔄 V1 Fallback completed successfully:', {
            success: true,
            wordCount: convertedResult.generationMetadata?.wordCount,
            seoScore: convertedResult.generationMetadata?.seoScore,
            totalProcessingTime: `${totalProcessingTime}ms`,
            provider: convertedResult.finalProvider,
            fallbackUsed: true
          });
          
          // Continue with normal flow (don't return here)
        } else {
          console.error('❌ V1 fallback also failed:', v1Result.error);
          
          return NextResponse.json(
            {
              success: false,
              error: `Both V2 and V1 generation failed. V2: ${errorMessage}, V1: ${v1Result.error}`,
              errorCode: errorCode,
              version: 'v2.1-with-v1-fallback',
              fallbackAttempted: true
            },
            { status: 500 }
          );
        }
      } catch (fallbackError) {
        console.error('❌ V1 fallback error:', fallbackError);
        
        return NextResponse.json(
          {
            success: false,
            error: `V2 generation failed: ${errorMessage}. V1 fallback error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
            errorCode: errorCode,
            version: 'v2.1-with-v1-fallback',
            fallbackAttempted: true
          },
          { status: 500 }
        );
      }
    }

    // Check if fallback was used
    const fallbackUsed = result.attempts && result.attempts.length > 1;
    const primaryProvider = result.attempts?.[0]?.provider || 'unknown';
    if (fallbackUsed && result.attempts) {
      // Extract proper error message for logging
      const primaryError = result.attempts[0]?.error;
      let primaryErrorMessage = 'Unknown error';
      
      if (typeof primaryError === 'string') {
        primaryErrorMessage = primaryError;
      } else if (primaryError && typeof primaryError === 'object') {
        // Type guard for objects with message property
        const errorObj = primaryError as any;
        if (errorObj.message && typeof errorObj.message === 'string') {
          primaryErrorMessage = errorObj.message;
        } else {
          primaryErrorMessage = String(primaryError);
        }
      } else if (primaryError) {
        primaryErrorMessage = String(primaryError);
      }
      
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
          // V1 fallback information
          ...((result as any).fallbackUsed && {
            fallback: {
              occurred: true,
              type: 'v1-fallback',
              reason: (result as any).fallbackReason || 'V2 generation failed',
              originalV2Error: (result as any).originalV2Error || 'Unknown V2 error',
              v1Provider: result.finalProvider,
              v1Success: true
            }
          }),
          // V2 provider fallback information
          ...(fallbackUsed && result.attempts && !(result as any).fallbackUsed && {
            fallback: {
              occurred: true,
              type: 'v2-provider-fallback',
              primaryProvider,
              primaryError: (() => {
                const primaryError = result.attempts[0]?.error;
                if (typeof primaryError === 'string') {
                  return primaryError;
                } else if (typeof primaryError === 'object' && primaryError) {
                  return (primaryError as any).message || String(primaryError);
                } else {
                  return String(primaryError || 'Unknown error');
                }
              })(),
              totalAttempts: result.attempts.length,
              reason: (() => {
                const primaryError = result.attempts[0]?.error;
                const errorStr = typeof primaryError === 'string' ? primaryError : 
                                typeof primaryError === 'object' && primaryError ? (primaryError as any).message || String(primaryError) : 
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
      version: (result as any).fallbackUsed ? 'v2.1-with-v1-fallback' : 'v2.1',
      fallbackUsed: (result as any).fallbackUsed || false
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