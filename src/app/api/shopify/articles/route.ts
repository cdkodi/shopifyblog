import { NextRequest, NextResponse } from 'next/server';
import { shopifyClient } from '@/lib/shopify/graphql-client';
import { mapCMSToShopify, validateCMSArticle, extractShopifyId, createGraphQLId } from '@/lib/shopify/field-mapping';
import { createClient } from '@/lib/supabase';

/**
 * POST /api/shopify/articles
 * Publish an article from our database to Shopify
 */
export async function POST(request: NextRequest) {
  try {
    const { articleId, blogId } = await request.json();

    if (!articleId || !blogId) {
      return NextResponse.json({
        success: false,
        error: 'Article ID and Blog ID are required'
      }, { status: 400 });
    }

    // Get article from database
    const supabase = createClient();
    const { data: article, error: dbError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (dbError || !article) {
      return NextResponse.json({
        success: false,
        error: 'Article not found in database'
      }, { status: 404 });
    }

    // Validate article
    const validation = validateCMSArticle(article);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Article validation failed',
        details: validation.errors
      }, { status: 400 });
    }

    // Convert to Shopify format
    const shopifyArticleInput = mapCMSToShopify(article);

    // Create article in Shopify
    const shopifyArticle = await shopifyClient.createArticle(blogId, shopifyArticleInput);

    // Update database with Shopify IDs
    const shopifyArticleId = extractShopifyId(shopifyArticle.id);
    const shopifyBlogId = extractShopifyId(blogId);

    const { error: updateError } = await supabase
      .from('articles')
      .update({
        shopify_article_id: shopifyArticleId,
        shopify_blog_id: shopifyBlogId,
        status: 'published',
        published_at: new Date().toISOString()
      })
      .eq('id', articleId);

    if (updateError) {
      console.error('Failed to update article with Shopify IDs:', updateError);
      // Article was created in Shopify but database update failed
      // We should still return success but log the issue
    }

    return NextResponse.json({
      success: true,
      message: 'Article published to Shopify successfully',
      shopifyArticle: {
        id: shopifyArticle.id,
        title: shopifyArticle.title,
        handle: shopifyArticle.handle,
        published: shopifyArticle.published,
        createdAt: shopifyArticle.createdAt
      },
      shopifyArticleId,
      shopifyBlogId
    });

  } catch (error) {
    console.error('Failed to publish article to Shopify:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to publish article',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/shopify/articles
 * Update an existing article in Shopify
 */
export async function PUT(request: NextRequest) {
  try {
    const { articleId } = await request.json();

    if (!articleId) {
      return NextResponse.json({
        success: false,
        error: 'Article ID is required'
      }, { status: 400 });
    }

    // Get article from database
    const supabase = createClient();
    const { data: article, error: dbError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (dbError || !article) {
      return NextResponse.json({
        success: false,
        error: 'Article not found in database'
      }, { status: 404 });
    }

    if (!article.shopify_article_id) {
      return NextResponse.json({
        success: false,
        error: 'Article is not published to Shopify yet'
      }, { status: 400 });
    }

    // Validate article
    const validation = validateCMSArticle(article);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Article validation failed',
        details: validation.errors
      }, { status: 400 });
    }

    // Convert to Shopify format
    const shopifyArticleInput = mapCMSToShopify(article);

    // Update article in Shopify
    const shopifyGraphQLId = createGraphQLId(article.shopify_article_id, 'Article');
    const shopifyArticle = await shopifyClient.updateArticle(shopifyGraphQLId, shopifyArticleInput);

    // Update timestamp in database
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId);

    if (updateError) {
      console.error('Failed to update article timestamp:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Article updated in Shopify successfully',
      shopifyArticle: {
        id: shopifyArticle.id,
        title: shopifyArticle.title,
        handle: shopifyArticle.handle,
        published: shopifyArticle.published,
        updatedAt: shopifyArticle.updatedAt
      }
    });

  } catch (error) {
    console.error('Failed to update article in Shopify:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update article',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/shopify/articles
 * Delete an article from Shopify
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json({
        success: false,
        error: 'Article ID is required'
      }, { status: 400 });
    }

    // Get article from database
    const supabase = createClient();
    const { data: article, error: dbError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (dbError || !article) {
      return NextResponse.json({
        success: false,
        error: 'Article not found in database'
      }, { status: 404 });
    }

    if (!article.shopify_article_id) {
      return NextResponse.json({
        success: false,
        error: 'Article is not published to Shopify'
      }, { status: 400 });
    }

    // Delete article from Shopify
    const shopifyGraphQLId = createGraphQLId(article.shopify_article_id, 'Article');
    const deleted = await shopifyClient.deleteArticle(shopifyGraphQLId);

    if (!deleted) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete article from Shopify'
      }, { status: 500 });
    }

    // Clear Shopify IDs in database
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        shopify_article_id: null,
        shopify_blog_id: null,
        status: 'draft'
      })
      .eq('id', articleId);

    if (updateError) {
      console.error('Failed to clear Shopify IDs from article:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Article deleted from Shopify successfully'
    });

  } catch (error) {
    console.error('Failed to delete article from Shopify:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete article',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 