import { NextRequest, NextResponse } from 'next/server';
import { ShopifyProductService } from '@/lib/supabase/shopify-products';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic') || '';
    const keywords = searchParams.get('keywords')?.split(',') || [];
    const collection = searchParams.get('collection');
    const limit = parseInt(searchParams.get('limit') || '10');

    console.log('🔍 Products API - GET request:', {
      topic,
      keywords: keywords.slice(0, 3),
      limit
    });

    if (!topic) {
      return NextResponse.json({
        success: false,
        error: 'Topic parameter is required'
      }, { status: 400 });
    }

    // Use strict art form filtering for better relevance
    console.log('🎯 Using strict art form filtering for topic:', topic);
    const products = await ShopifyProductService.getStrictArtFormProducts(topic, keywords);
    
    console.log('🎯 Strict filtering results:', {
      productsFound: products.length,
      topProducts: products.slice(0, 3).map(p => ({
        title: p.title,
        relevanceScore: (p as any).relevanceScore
      }))
    });

    // Apply limit
    const limitedProducts = products.slice(0, limit);

    return NextResponse.json({
      success: true,
      data: {
        products: limitedProducts,
        total: products.length,
        query: { topic, keywords, limit },
        filterType: 'strict_art_form'
      }
    });

  } catch (error) {
    console.error('Error in Products API GET:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch products'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchQuery, collections, limit = 20 } = body;

    console.log('🔍 Products search API called with:', {
      searchQuery,
      collections,
      limit
    });

    const products = await ShopifyProductService.searchProducts(
      searchQuery,
      collections,
      limit
    );

    return NextResponse.json({
      success: true,
      data: {
        products,
        count: products.length,
        searchQuery,
        collections
      }
    });

  } catch (error) {
    console.error('❌ Products search API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search products',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 