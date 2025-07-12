import { NextRequest, NextResponse } from 'next/server';
import { seoService } from '@/lib/seo';

// Force dynamic rendering
export const dynamic = 'force-dynamic'

// Fallback keyword suggestions when SEO service is not available
function generateFallbackKeywords(keyword: string): any {
  const baseKeywords = [
    keyword,
    `${keyword} guide`,
    `${keyword} tips`,
    `${keyword} tutorial`,
    `${keyword} benefits`,
    `${keyword} 2024`,
    `${keyword} beginner`,
    `${keyword} expert`,
    `${keyword} how to`,
    `${keyword} best practices`
  ];

  return {
    keyword,
    search_intent: 'informational',
    keywords: baseKeywords.map((kw, index) => ({
      keyword: kw,
      competition_level: index % 3 === 0 ? 'low' : index % 3 === 1 ? 'medium' : 'high',
      relevance_score: Math.floor(Math.random() * 30) + 70
    }))
  };
}

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
      console.log('SEO service not available, using fallback data for:', keyword);
      const fallbackData = generateFallbackKeywords(keyword);
      
      return NextResponse.json({
        success: true,
        keyword,
        data: fallbackData,
        fallback: true,
        message: 'Using fallback data - SEO service not configured'
      });
    }

    const keywordData = await seoService.analyzeKeyword(keyword);

    return NextResponse.json({
      success: true,
      keyword,
      data: keywordData,
      fallback: false
    });

  } catch (error) {
    console.error('Keywords API error:', error);
    
    // If there's an error, still provide fallback data
    const keyword = new URL(request.url).searchParams.get('keyword') || 'topic';
    const fallbackData = generateFallbackKeywords(keyword);
    
    return NextResponse.json({
      success: true,
      keyword,
      data: fallbackData,
      fallback: true,
      message: 'Using fallback data due to API error'
    });
  }
} 