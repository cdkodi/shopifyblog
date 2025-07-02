import { NextRequest, NextResponse } from 'next/server';
import { ShopifyProductService } from '@/lib/supabase/shopify-products';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');
    const keywords = searchParams.get('keywords');
    const collection = searchParams.get('collection');
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log('🛒 Products API called with:', {
      topic,
      keywords,
      collection,
      limit
    });

    let products;

    if (topic) {
      // Get products relevant to a content topic
      const keywordArray = keywords ? keywords.split(',').map(k => k.trim()) : [];
      console.log('🛒 Calling getRelevantProducts with:', { topic, keywordArray });
      products = await ShopifyProductService.getRelevantProducts(topic, keywordArray);
      console.log('🛒 getRelevantProducts returned:', products.length, 'products');
      if (products.length > 0) {
        console.log('🛒 First few results:', products.slice(0, 3).map(p => ({ title: p.title, tags: p.tags })));
      }
    } else if (collection) {
      // Get products from a specific collection
      products = await ShopifyProductService.getProductsByCollection(collection, limit);
    } else {
      // Get all products with optional limit
      products = await ShopifyProductService.getAllProducts(limit);
    }

    return NextResponse.json({
      success: true,
      data: {
        products,
        count: products.length,
        topic,
        collection
      }
    });

  } catch (error) {
    console.error('❌ Products API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch products',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
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