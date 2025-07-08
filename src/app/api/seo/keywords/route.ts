import { NextRequest, NextResponse } from 'next/server';
import { seoService } from '@/lib/seo';

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const location = searchParams.get('location');
    const language = searchParams.get('language');

    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword parameter is required' },
        { status: 400 }
      );
    }

    // Check if SEO service is available
    if (!seoService.isAvailable()) {
      return NextResponse.json(
        { 
          error: 'SEO service is not configured. Please check your DataForSEO credentials.',
          keyword,
          available: false
        },
        { status: 503 }
      );
    }

    const keywordData = await seoService.analyzeKeyword(keyword);

    return NextResponse.json({
      success: true,
      keyword,
      data: keywordData
    });

  } catch (error) {
    console.error('Keywords API error:', error);
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch keyword data',
        success: false
      },
      { status: 500 }
    );
  }
} 