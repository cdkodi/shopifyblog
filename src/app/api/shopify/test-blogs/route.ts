import { NextRequest, NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify/graphql-client';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing blogs endpoint...');
    
    // Test environment variables
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION;
    
    console.log('Environment check:', {
      storeDomain: storeDomain ? 'Set' : 'Missing',
      accessToken: accessToken ? 'Set' : 'Missing',
      apiVersion: apiVersion || 'Default'
    });
    
    if (!storeDomain || !accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Missing Shopify configuration',
        details: {
          storeDomain: storeDomain ? 'Set' : 'Missing',
          accessToken: accessToken ? 'Set' : 'Missing'
        }
      }, { status: 500 });
    }
    
    // Test basic GraphQL connection
    console.log('Testing GraphQL connection...');
    const shop = await shopifyClient.getShop();
    console.log('Shop connection successful:', shop);
    
    // Test blogs query
    console.log('Testing blogs query...');
    const blogs = await shopifyClient.getBlogs();
    console.log('Blogs retrieved:', blogs);
    
    return NextResponse.json({
      success: true,
      message: 'Blogs test completed successfully',
      data: {
        shop: {
          name: shop.name,
          id: shop.id
        },
        blogs: blogs.map(blog => ({
          id: blog.id,
          title: blog.title,
          handle: blog.handle,
          commentable: blog.commentable
        })),
        blogsCount: blogs.length,
        environment: {
          storeDomain,
          apiVersion: apiVersion || '2024-10'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Blogs test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Blogs test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 