import { NextRequest, NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify/graphql-client';

/**
 * GET /api/shopify/blogs
 * Get all blogs from Shopify
 */
export async function GET(request: NextRequest) {
  try {
    const blogs = await shopifyClient.getBlogs();
    
    return NextResponse.json({
      success: true,
      blogs: blogs.map(blog => ({
        id: blog.id,
        title: blog.title,
        handle: blog.handle,
        commentable: blog.commentable,
        tags: blog.tags,
      })),
      count: blogs.length
    });

  } catch (error) {
    console.error('Failed to fetch Shopify blogs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch blogs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/shopify/blogs
 * Create a new blog in Shopify
 */
export async function POST(request: NextRequest) {
  try {
    const { title, handle } = await request.json();

    if (!title) {
      return NextResponse.json({
        success: false,
        error: 'Blog title is required'
      }, { status: 400 });
    }

    const blog = await shopifyClient.createBlog(title, handle);
    
    return NextResponse.json({
      success: true,
      message: 'Blog created successfully',
      blog: {
        id: blog.id,
        title: blog.title,
        handle: blog.handle,
        commentable: blog.commentable,
        tags: blog.tags,
      }
    });

  } catch (error) {
    console.error('Failed to create Shopify blog:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create blog',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 