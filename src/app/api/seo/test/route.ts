import { NextRequest, NextResponse } from 'next/server';
import { seoService } from '@/lib/seo';

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('test') || 'basic';

    // Initialize SEO service
    seoService.initialize();

    switch (testType) {
      case 'basic':
        return handleBasicTest();
      
      case 'keywords':
        return handleKeywordTest();
      
      case 'research':
        return handleResearchTest();
      
      case 'health':
        return handleHealthTest();
      
      case 'debug':
        return handleDebugTest();
      
      default:
        return NextResponse.json(
          { error: 'Invalid test type. Available: basic, keywords, research, health, debug' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('SEO test error:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'SEO test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function handleBasicTest() {
  const results = {
    serviceAvailable: seoService.isAvailable(),
    environmentVariables: {
      dataforseloLogin: !!process.env.DATAFORSEO_LOGIN,
      dataforSeoPassword: !!process.env.DATAFORSEO_PASSWORD,
      locationId: !!process.env.DATAFORSEO_LOCATION_ID,
      languageId: !!process.env.DATAFORSEO_LANGUAGE_ID
    },
    configuration: {
      defaultLocation: process.env.DATAFORSEO_LOCATION_ID || '2840',
      defaultLanguage: process.env.DATAFORSEO_LANGUAGE_ID || 'en'
    }
  };

  const status = results.serviceAvailable ? 'success' : 'warning';
  const message = results.serviceAvailable 
    ? 'SEO service basic test passed'
    : 'SEO service not available - missing credentials';

  return NextResponse.json({
    status,
    message,
    results
  });
}

async function handleKeywordTest() {
  if (!seoService.isAvailable()) {
    return NextResponse.json({
      status: 'error',
      message: 'SEO service not available'
    }, { status: 503 });
  }

  try {
    const testKeyword = 'shopify themes';
    const suggestions = await seoService.getKeywordSuggestions(testKeyword, 10);
    
    return NextResponse.json({
      status: 'success',
      message: 'Keyword research test passed',
      results: {
        testKeyword,
        suggestionsCount: suggestions.length,
        sampleSuggestions: suggestions.slice(0, 3).map(s => ({
          keyword: s.keyword,
          competition: s.competition_level,
          relevance: s.relevance_score
        }))
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Keyword test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleResearchTest() {
  if (!seoService.isAvailable()) {
    return NextResponse.json({
      status: 'error',
      message: 'SEO service not available'
    }, { status: 503 });
  }

  try {
    const testTopic = 'ecommerce trends';
    const research = await seoService.researchTopic(testTopic);
    
    return NextResponse.json({
      status: 'success',
      message: 'SEO research test passed',
      results: {
        testTopic,
        primaryKeyword: {
          keyword: research.primary_keyword.keyword,
          intent: research.primary_keyword.search_intent
        },
        relatedKeywordsCount: research.related_keywords.length,
        contentRecommendations: research.content_recommendations
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Research test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleHealthTest() {
  if (!seoService.isAvailable()) {
    return NextResponse.json({
      status: 'warning',
      message: 'SEO service not available',
      results: { serviceAvailable: false }
    });
  }

  try {
    const health = await seoService.getHealthStatus();
    
    return NextResponse.json({
      status: health?.status === 'healthy' ? 'success' : 'warning',
      message: `SEO service health: ${health?.status || 'unknown'}`,
      results: {
        serviceHealth: health?.status,
        apiCreditsRemaining: health?.apiCreditsRemaining,
        lastChecked: health?.lastChecked,
        errorsCount: health?.errors?.length || 0
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function handleDebugTest() {
  try {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV
      },
      seoService: {
        available: seoService.isAvailable(),
        initialized: true
      },
      credentials: {
        login: !!process.env.DATAFORSEO_LOGIN,
        password: !!process.env.DATAFORSEO_PASSWORD,
        locationId: process.env.DATAFORSEO_LOCATION_ID || 'default',
        languageId: process.env.DATAFORSEO_LANGUAGE_ID || 'default'
      }
    };

    return NextResponse.json({
      status: 'success',
      message: 'Debug information retrieved',
      results: debugInfo
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Debug test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}