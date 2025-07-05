import { NextRequest, NextResponse } from 'next/server';
import { getShopifyBlogs, createShopifyBlog } from '@/lib/shopify/blog-mutations';
import { isShopifyConfigured } from '@/lib/shopify/graphql-client';

/**
 * GET /api/shopify/blogs
 * Get all blogs from Shopify
 */
export async function GET(request: NextRequest) {
  try {
    // Check if Shopify is configured
    if (!isShopifyConfigured()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Shopify integration not configured',
          blogs: [] 
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    console.log('📋 Fetching Shopify blogs...');

    const result = await getShopifyBlogs(limit);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch blogs',
          errors: result.errors,
          blogs: []
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      blogs: result.blogs,
      count: result.blogs.length
    });

  } catch (error) {
    console.error('Error in GET /api/shopify/blogs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        blogs: []
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/shopify/blogs
 * Create a new blog in Shopify
 */
export async function POST(request: NextRequest) {
  try {
    // Check if Shopify is configured
    if (!isShopifyConfigured()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Shopify integration not configured' 
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { title, handle } = body;

    // Validate required fields
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: 'Title is required and must be a string'
        },
        { status: 400 }
      );
    }

    console.log('📝 Creating Shopify blog:', { title, handle });

    const result = await createShopifyBlog(title, handle);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create blog',
          errors: result.errors
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      blog: result.blog,
      message: 'Blog created successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/shopify/blogs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
} 