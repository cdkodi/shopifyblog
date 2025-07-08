import { NextRequest, NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify/graphql-client';

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing hybrid Shopify article operations...');
    
    // Test 1: Get blogs using GraphQL
    console.log('📚 Testing GraphQL blogs query...');
    const blogs = await shopifyClient.getBlogs();
    console.log('✅ Blogs retrieved:', blogs.length);
    
    if (blogs.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No blogs found',
        details: 'The store needs at least one blog to test article operations'
      }, { status: 404 });
    }
    
    const firstBlog = blogs[0];
    console.log('📖 Using blog:', firstBlog.title, firstBlog.id);
    
    // Test 2: Get articles using GraphQL
    console.log('📄 Testing GraphQL articles query...');
    const articles = await shopifyClient.getArticles(firstBlog.id, 5);
    console.log('✅ Articles retrieved:', articles.length);
    
    return NextResponse.json({
      success: true,
      message: 'Hybrid approach test completed successfully',
      results: {
        blogs: {
          count: blogs.length,
          sample: blogs[0]
        },
        articles: {
          count: articles.length,
          samples: articles.slice(0, 2)
        }
      },
      approach: {
        reading: 'GraphQL Admin API',
        mutations: 'REST Admin API',
        reason: 'GraphQL does not support article create/update/delete mutations'
      }
    });
    
  } catch (error: any) {
    console.error('❌ Test failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
} 