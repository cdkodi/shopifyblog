// V2 AI Generation API Endpoint

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultV2Service } from '@/lib/ai';
import { TopicGenerationRequest } from '@/lib/ai/v2-types';

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
      optimizeForSEO: body.optimizeForSEO
    });

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
      generateMetaDescription: body.generateMetaDescription ?? true,
      optimizeForSEO: body.optimizeForSEO ?? true,
      targetWordCount: body.targetWordCount || 1000,
      contentStructure: body.contentStructure || 'standard',
      includeIntroduction: body.includeIntroduction ?? true,
      includeConclusion: body.includeConclusion ?? true,
      generationContext: {
        urgency: body.urgency || 'medium',
        quality: body.quality || 'editorial',
        audience: body.audience || 'general'
      },
      options: {
        temperature: body.temperature || 0.7,
        maxTokens: body.maxTokens || 2000
      }
    };

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
          attempts: result.attempts?.length || 1,
          totalCost: result.totalCost,
          totalTokens: result.totalTokens,
          processingTimeMs: processingTime
        },
        
        // V2 enhancements
        v2Features: {
          topicBased: true,
          seoOptimized: generationRequest.optimizeForSEO,
          templateSpecific: !!generationRequest.topic.template,
          structureEnhanced: generationRequest.contentStructure !== 'standard'
        }
      },
      version: 'v2.1'
    });

  } catch (error) {
    console.error('❌ V2 Generation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Generation failed',
          type: 'generation_error',
          code: 'V2_GENERATION_FAILED'
        },
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