import { NextRequest, NextResponse } from 'next/server';
import { seoService } from '@/lib/seo';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!topic) {
      return NextResponse.json(
        { error: 'Topic parameter is required' },
        { status: 400 }
      );
    }

    // Initialize SEO service
    seoService.initialize();

    if (!seoService.isAvailable()) {
      return NextResponse.json(
        { error: 'SEO service not available. Please check API credentials.' },
        { status: 503 }
      );
    }

    // Get keyword suggestions
    const keywords = await seoService.getKeywordSuggestions(topic, limit);
    
    return NextResponse.json({
      success: true,
      data: {
        topic,
        keywords,
        count: keywords.length
      }
    });

  } catch (error) {
    console.error('Keywords API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch keyword data',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 