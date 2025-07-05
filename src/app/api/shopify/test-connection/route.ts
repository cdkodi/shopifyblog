import { NextRequest, NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify/graphql-client';

export async function GET(request: NextRequest) {
  try {
    // Check if environment variables are configured
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-07';
    const blogId = process.env.SHOPIFY_DEFAULT_BLOG_ID;

    if (!storeDomain || !accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Missing Shopify configuration',
        details: {
          storeDomain: !!storeDomain,
          accessToken: !!accessToken,
          apiVersion: !!apiVersion,
          blogId: !!blogId
        }
      }, { status: 500 });
    }

    // Test connection using GraphQL client
    const [shopData, blogsData] = await Promise.all([
      shopifyClient.getShop(),
      shopifyClient.getBlogs()
    ]);

    // Test specific blog if blogId is provided
    let specificBlog = null;
    if (blogId) {
      try {
        specificBlog = await shopifyClient.getBlog(blogId);
      } catch (error) {
        console.warn('Failed to fetch specific blog:', error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Shopify GraphQL connection successful!',
      shop: {
        name: shopData.name,
        domain: shopData.domain,
        email: shopData.email,
        currency: shopData.currency,
        timezone: shopData.timezone,
        plan: shopData.plan.displayName
      },
      blogs: blogsData.map(blog => ({
        id: blog.id,
        title: blog.title,
        handle: blog.handle
      })),
      defaultBlog: specificBlog ? {
        id: specificBlog.id,
        title: specificBlog.title,
        handle: specificBlog.handle
      } : null,
      config: {
        storeDomain,
        apiVersion,
        blogId: blogId || 'Not configured',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Shopify GraphQL connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'GraphQL connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 