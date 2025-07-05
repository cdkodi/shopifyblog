import { NextRequest, NextResponse } from 'next/server';

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

    // Test connection to Shopify
    const shopifyUrl = `https://${storeDomain}/admin/api/${apiVersion}/shop.json`;
    
    const response = await fetch(shopifyUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: 'Shopify API Error',
        status: response.status,
        details: errorText
      }, { status: response.status });
    }

    const shopData = await response.json();

    // Test blog access if blog ID is provided
    let blogData = null;
    if (blogId) {
      const blogUrl = `https://${storeDomain}/admin/api/${apiVersion}/blogs/${blogId}.json`;
      const blogResponse = await fetch(blogUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      });

      if (blogResponse.ok) {
        blogData = await blogResponse.json();
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Shopify connection successful!',
      shop: {
        name: shopData.shop.name,
        domain: shopData.shop.domain,
        email: shopData.shop.email,
        currency: shopData.shop.currency,
        timezone: shopData.shop.timezone
      },
      blog: blogData ? {
        id: blogData.blog.id,
        title: blogData.blog.title,
        handle: blogData.blog.handle
      } : null,
      config: {
        storeDomain,
        apiVersion,
        blogId: blogId || 'Not configured',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Shopify connection test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 