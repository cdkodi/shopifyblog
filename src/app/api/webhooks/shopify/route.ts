import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { mapShopifyToCMS } from '@/lib/shopify/field-mapping';
import crypto from 'crypto';

// Webhook events we handle
const SUPPORTED_TOPICS = [
  'articles/create',
  'articles/update',
  'articles/delete',
  'blogs/create',
  'blogs/update',
  'blogs/delete'
];

/**
 * POST /api/webhooks/shopify
 * Handle Shopify webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature
    const signature = request.headers.get('x-shopify-hmac-sha256');
    const topic = request.headers.get('x-shopify-topic');
    const shopDomain = request.headers.get('x-shopify-shop-domain');

    if (!signature || !topic) {
      return NextResponse.json({
        success: false,
        error: 'Missing required headers'
      }, { status: 400 });
    }

    // Get raw body for signature verification
    const body = await request.text();
    
    // Verify webhook authenticity
    if (!verifyWebhookSignature(body, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({
        success: false,
        error: 'Invalid signature'
      }, { status: 401 });
    }

    // Check if we support this topic
    if (!SUPPORTED_TOPICS.includes(topic)) {
      console.log(`Unsupported webhook topic: ${topic}`);
      return NextResponse.json({
        success: true,
        message: 'Topic not supported, ignored'
      });
    }

    // Parse webhook data
    const webhookData = JSON.parse(body);
    
    console.log(`Processing Shopify webhook: ${topic} from ${shopDomain}`);

    // Handle different webhook topics
    switch (topic) {
      case 'articles/create':
        await handleArticleCreate(webhookData);
        break;
      case 'articles/update':
        await handleArticleUpdate(webhookData);
        break;
      case 'articles/delete':
        await handleArticleDelete(webhookData);
        break;
      case 'blogs/create':
        await handleBlogCreate(webhookData);
        break;
      case 'blogs/update':
        await handleBlogUpdate(webhookData);
        break;
      case 'blogs/delete':
        await handleBlogDelete(webhookData);
        break;
      default:
        console.log(`Unhandled topic: ${topic}`);
    }

    return NextResponse.json({
      success: true,
      message: `Webhook ${topic} processed successfully`
    });

  } catch (error) {
    console.error('Webhook processing failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Verify webhook signature using HMAC-SHA256
function verifyWebhookSignature(body: string, signature: string): boolean {
  const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.warn('SHOPIFY_WEBHOOK_SECRET not configured, skipping signature verification');
    return true; // Allow webhooks if secret is not configured (development mode)
  }

  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(body, 'utf8');
  const calculatedSignature = hmac.digest('base64');

  return crypto.timingSafeEqual(
    Buffer.from(signature, 'base64'),
    Buffer.from(calculatedSignature, 'base64')
  );
}

// Handle article creation in Shopify
async function handleArticleCreate(articleData: any) {
  const supabase = createClient();
  
  try {
    // Check if we already have this article (to avoid duplicates)
    const { data: existingArticle } = await supabase
      .from('articles')
      .select('id')
      .eq('shopify_article_id', articleData.id)
      .single();

    if (existingArticle) {
      console.log(`Article ${articleData.id} already exists in database`);
      return;
    }

    // Convert Shopify article to CMS format
    const cmsArticle = mapShopifyToCMS({
      ...articleData,
      blogId: `gid://shopify/Blog/${articleData.blog_id}`
    });

    // Ensure required fields are present
    const articleInsert = {
      title: cmsArticle.title || articleData.title || 'Untitled',
      content: cmsArticle.content || articleData.content || '',
      meta_description: cmsArticle.meta_description,
      slug: cmsArticle.slug,
      status: cmsArticle.status,
      target_keywords: cmsArticle.target_keywords,
      shopify_article_id: cmsArticle.shopify_article_id,
      shopify_blog_id: cmsArticle.shopify_blog_id,
      published_at: cmsArticle.published_at,
      scheduled_publish_date: cmsArticle.scheduled_publish_date,
      reading_time: cmsArticle.reading_time,
      word_count: cmsArticle.word_count,
      seo_score: cmsArticle.seo_score,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert new article into our database
    const { error } = await supabase
      .from('articles')
      .insert(articleInsert);

    if (error) {
      console.error('Failed to create article from webhook:', error);
    } else {
      console.log(`Article ${articleData.id} created from Shopify webhook`);
    }

  } catch (error) {
    console.error('Error handling article create webhook:', error);
  }
}

// Handle article updates in Shopify
async function handleArticleUpdate(articleData: any) {
  const supabase = createClient();
  
  try {
    // Find the article in our database
    const { data: existingArticle } = await supabase
      .from('articles')
      .select('id')
      .eq('shopify_article_id', articleData.id)
      .single();

    if (!existingArticle) {
      console.log(`Article ${articleData.id} not found in database, creating new one`);
      await handleArticleCreate(articleData);
      return;
    }

    // Convert Shopify article to CMS format
    const cmsArticle = mapShopifyToCMS({
      ...articleData,
      blogId: `gid://shopify/Blog/${articleData.blog_id}`
    });

    // Update the article in our database
    const { error } = await supabase
      .from('articles')
      .update({
        ...cmsArticle,
        updated_at: new Date().toISOString()
      })
      .eq('shopify_article_id', articleData.id);

    if (error) {
      console.error('Failed to update article from webhook:', error);
    } else {
      console.log(`Article ${articleData.id} updated from Shopify webhook`);
    }

  } catch (error) {
    console.error('Error handling article update webhook:', error);
  }
}

// Handle article deletion in Shopify
async function handleArticleDelete(articleData: any) {
  const supabase = createClient();
  
  try {
    // Find and update the article in our database
    const { error } = await supabase
      .from('articles')
      .update({
        shopify_article_id: null,
        shopify_blog_id: null,
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('shopify_article_id', articleData.id);

    if (error) {
      console.error('Failed to handle article deletion webhook:', error);
    } else {
      console.log(`Article ${articleData.id} marked as unpublished from Shopify webhook`);
    }

  } catch (error) {
    console.error('Error handling article delete webhook:', error);
  }
}

// Handle blog creation in Shopify
async function handleBlogCreate(blogData: any) {
  console.log(`Blog created in Shopify: ${blogData.id} - ${blogData.title}`);
  // We don't store blogs in our database currently, just log it
}

// Handle blog updates in Shopify
async function handleBlogUpdate(blogData: any) {
  console.log(`Blog updated in Shopify: ${blogData.id} - ${blogData.title}`);
  // We don't store blogs in our database currently, just log it
}

// Handle blog deletion in Shopify
async function handleBlogDelete(blogData: any) {
  const supabase = createClient();
  
  try {
    // Mark all articles from this blog as unpublished
    const { error } = await supabase
      .from('articles')
      .update({
        shopify_article_id: null,
        shopify_blog_id: null,
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('shopify_blog_id', blogData.id);

    if (error) {
      console.error('Failed to handle blog deletion webhook:', error);
    } else {
      console.log(`All articles from blog ${blogData.id} marked as unpublished`);
    }

  } catch (error) {
    console.error('Error handling blog delete webhook:', error);
  }
}

/**
 * GET /api/webhooks/shopify
 * Return webhook configuration info (for debugging)
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/webhooks/shopify',
    method: 'POST',
    headers: {
      'x-shopify-hmac-sha256': 'Required - Webhook signature',
      'x-shopify-topic': 'Required - Event type (e.g., articles/create)',
      'x-shopify-shop-domain': 'Required - Shop domain'
    },
    supportedEvents: [
      'articles/create',
      'articles/update',
      'articles/delete',
      'blogs/create',
      'blogs/update',
      'blogs/delete'
    ],
    environment: {
      webhookSecretConfigured: !!process.env.SHOPIFY_WEBHOOK_SECRET,
      shopifyConfigured: !!(process.env.SHOPIFY_STORE_DOMAIN && process.env.SHOPIFY_ACCESS_TOKEN)
    }
  });
} 