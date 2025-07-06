import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { ShopifyGraphQLClient } from '@/lib/shopify/graphql-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const shopifyClient = new ShopifyGraphQLClient();
    
    // Get all articles that have been published to Shopify
    const { data: articles, error } = await supabase
      .from('articles')
      .select('id, title, meta_description, shopify_article_id')
      .not('shopify_article_id', 'is', null)
      .not('meta_description', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No articles found that need meta description updates',
        processed: 0
      });
    }

    const results = [];
    let successful = 0;
    let failed = 0;

    for (const article of articles) {
      try {
        console.log(`Processing article: ${article.title}`);
        
        // Update meta description using GraphQL
        const success = await shopifyClient.updateArticleMetaDescription(
          article.shopify_article_id,
          article.meta_description
        );

        if (success) {
          successful++;
          results.push({
            id: article.id,
            title: article.title,
            status: 'success',
            meta_description: article.meta_description
          });
        } else {
          failed++;
          results.push({
            id: article.id,
            title: article.title,
            status: 'failed',
            error: 'GraphQL update failed'
          });
        }
      } catch (error) {
        failed++;
        results.push({
          id: article.id,
          title: article.title,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${articles.length} articles`,
      statistics: {
        total: articles.length,
        successful,
        failed
      },
      results
    });

  } catch (error) {
    console.error('Error fixing meta descriptions:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 