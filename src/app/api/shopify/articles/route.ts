import { NextRequest, NextResponse } from 'next/server';
import { 
  publishArticleToShopify, 
  updateShopifyArticle, 
  deleteShopifyArticle,
  getShopifyArticle 
} from '@/lib/shopify/blog-mutations';
import { isShopifyConfigured } from '@/lib/shopify/graphql-client';
import { supabase } from '@/lib/supabase';
import { mapShopifyToDatabase } from '@/lib/shopify/field-mapping';

/**
 * POST /api/shopify/articles
 * Publish an article from our database to Shopify
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
    const { articleId, blogId, published = true, publishedAt } = body;

    // Validate required fields
    if (!articleId || !blogId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article ID and Blog ID are required'
        },
        { status: 400 }
      );
    }

    console.log('📝 Publishing article to Shopify:', { articleId, blogId, published });

    // Get the article from our database
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article not found in database'
        },
        { status: 404 }
      );
    }

    // Check if article is already published to Shopify
    if (article.shopify_article_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article is already published to Shopify',
          shopifyArticleId: article.shopify_article_id
        },
        { status: 409 }
      );
    }

    // Publish to Shopify
    const result = await publishArticleToShopify(article, blogId, {
      published,
      publishedAt
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to publish article to Shopify',
          errors: result.errors
        },
        { status: 500 }
      );
    }

    // Update our database with Shopify article ID
    const shopifyArticleId = result.article?.id ? 
      parseInt(result.article.id.split('/').pop() || '0', 10) : null;

    if (shopifyArticleId) {
      const { error: updateError } = await supabase
        .from('articles')
        .update({
          shopify_article_id: shopifyArticleId,
          shopify_blog_id: parseInt(blogId.split('/').pop() || '0', 10),
          updated_at: new Date().toISOString()
        })
        .eq('id', articleId);

      if (updateError) {
        console.error('Error updating article with Shopify ID:', updateError);
      }
    }

    return NextResponse.json({
      success: true,
      article: result.article,
      shopifyArticleId,
      message: 'Article published successfully to Shopify'
    });

  } catch (error) {
    console.error('Error in POST /api/shopify/articles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/shopify/articles
 * Update an existing article in Shopify
 */
export async function PUT(request: NextRequest) {
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
    const { articleId, blogId, published, publishedAt } = body;

    // Validate required fields
    if (!articleId || !blogId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article ID and Blog ID are required'
        },
        { status: 400 }
      );
    }

    console.log('📝 Updating article in Shopify:', { articleId, blogId });

    // Get the article from our database
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article not found in database'
        },
        { status: 404 }
      );
    }

    // Check if article has a Shopify ID
    if (!article.shopify_article_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article is not published to Shopify yet'
        },
        { status: 400 }
      );
    }

    // Update in Shopify
    const result = await updateShopifyArticle(
      article.shopify_article_id,
      article,
      blogId,
      { published, publishedAt }
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update article in Shopify',
          errors: result.errors
        },
        { status: 500 }
      );
    }

    // Update our database with latest data
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId);

    if (updateError) {
      console.error('Error updating article timestamp:', updateError);
    }

    return NextResponse.json({
      success: true,
      article: result.article,
      message: 'Article updated successfully in Shopify'
    });

  } catch (error) {
    console.error('Error in PUT /api/shopify/articles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/shopify/articles
 * Delete an article from Shopify
 */
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article ID is required'
        },
        { status: 400 }
      );
    }

    console.log('🗑️ Deleting article from Shopify:', { articleId });

    // Get the article from our database
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article not found in database'
        },
        { status: 404 }
      );
    }

    // Check if article has a Shopify ID
    if (!article.shopify_article_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Article is not published to Shopify'
        },
        { status: 400 }
      );
    }

    // Delete from Shopify
    const result = await deleteShopifyArticle(article.shopify_article_id);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete article from Shopify',
          errors: result.errors
        },
        { status: 500 }
      );
    }

    // Update our database to remove Shopify references
    const { error: updateError } = await supabase
      .from('articles')
      .update({
        shopify_article_id: null,
        shopify_blog_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', articleId);

    if (updateError) {
      console.error('Error updating article after Shopify deletion:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: 'Article deleted successfully from Shopify'
    });

  } catch (error) {
    console.error('Error in DELETE /api/shopify/articles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
} 