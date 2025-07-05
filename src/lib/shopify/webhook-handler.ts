import crypto from 'crypto';
import { mapShopifyToDatabase, extractNumericId } from './field-mapping';
import { supabase } from '@/lib/supabase';

// Webhook event types we handle
export type ShopifyWebhookEvent = 
  | 'articles/create'
  | 'articles/update' 
  | 'articles/delete'
  | 'blogs/create'
  | 'blogs/update'
  | 'blogs/delete';

// Webhook payload interfaces
export interface ShopifyArticleWebhookPayload {
  id: number;
  title: string;
  content: string;
  excerpt?: string;
  handle: string;
  published_at?: string;
  created_at: string;
  updated_at: string;
  tags: string;
  summary?: string;
  seo?: {
    title?: string;
    description?: string;
  };
  blog_id: number;
}

export interface ShopifyBlogWebhookPayload {
  id: number;
  title: string;
  handle: string;
  created_at: string;
  updated_at: string;
}

/**
 * Verify Shopify webhook signature
 */
export function verifyShopifyWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const calculatedSignature = hmac.digest('base64');
    
    // Use timingSafeEqual to prevent timing attacks
    const providedSignature = Buffer.from(signature, 'base64');
    const calculatedBuffer = Buffer.from(calculatedSignature, 'base64');
    
    if (providedSignature.length !== calculatedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(providedSignature, calculatedBuffer);
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Handle Shopify article webhook events
 */
export async function handleArticleWebhook(
  event: ShopifyWebhookEvent,
  payload: ShopifyArticleWebhookPayload
): Promise<{
  success: boolean;
  message: string;
  errors: string[];
}> {
  try {
    console.log(`📦 Processing article webhook: ${event}`, {
      articleId: payload.id,
      title: payload.title,
      blogId: payload.blog_id
    });

    switch (event) {
      case 'articles/create':
        return await handleArticleCreate(payload);
      
      case 'articles/update':
        return await handleArticleUpdate(payload);
      
      case 'articles/delete':
        return await handleArticleDelete(payload);
      
      default:
        return {
          success: false,
          message: `Unsupported article event: ${event}`,
          errors: [`Unknown event type: ${event}`]
        };
    }
  } catch (error) {
    console.error(`Error handling article webhook ${event}:`, error);
    return {
      success: false,
      message: 'Internal server error',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Handle Shopify blog webhook events
 */
export async function handleBlogWebhook(
  event: ShopifyWebhookEvent,
  payload: ShopifyBlogWebhookPayload
): Promise<{
  success: boolean;
  message: string;
  errors: string[];
}> {
  try {
    console.log(`📦 Processing blog webhook: ${event}`, {
      blogId: payload.id,
      title: payload.title
    });

    switch (event) {
      case 'blogs/create':
        return await handleBlogCreate(payload);
      
      case 'blogs/update':
        return await handleBlogUpdate(payload);
      
      case 'blogs/delete':
        return await handleBlogDelete(payload);
      
      default:
        return {
          success: false,
          message: `Unsupported blog event: ${event}`,
          errors: [`Unknown event type: ${event}`]
        };
    }
  } catch (error) {
    console.error(`Error handling blog webhook ${event}:`, error);
    return {
      success: false,
      message: 'Internal server error',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// ============================================================================
// ARTICLE WEBHOOK HANDLERS
// ============================================================================

/**
 * Handle article creation from Shopify
 */
async function handleArticleCreate(
  payload: ShopifyArticleWebhookPayload
): Promise<{
  success: boolean;
  message: string;
  errors: string[];
}> {
  try {
    // Check if article already exists in our database
    const { data: existingArticle } = await supabase
      .from('articles')
      .select('id')
      .eq('shopify_article_id', payload.id)
      .single();

    if (existingArticle) {
      console.log(`Article ${payload.id} already exists, skipping creation`);
      return {
        success: true,
        message: 'Article already exists',
        errors: []
      };
    }

    // Convert Shopify payload to our database format
    const shopifyArticle = convertWebhookPayloadToShopifyArticle(payload);
    const databaseArticle = mapShopifyToDatabase(shopifyArticle);

    // Insert into database
    const { data, error } = await supabase
      .from('articles')
      .insert({
        title: payload.title,
        content: payload.content,
        meta_description: payload.excerpt || payload.summary,
        slug: payload.handle,
        status: payload.published_at ? 'published' : 'draft',
        published_at: payload.published_at || null,
        shopify_article_id: payload.id,
        shopify_blog_id: payload.blog_id,
        target_keywords: payload.tags ? JSON.stringify(payload.tags.split(',').map(t => t.trim())) : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting article from webhook:', error);
      return {
        success: false,
        message: 'Failed to create article in database',
        errors: [error.message]
      };
    }

    console.log(`✅ Article created from webhook: ${data.id}`);
    return {
      success: true,
      message: `Article created successfully: ${data.id}`,
      errors: []
    };
  } catch (error) {
    console.error('Error in handleArticleCreate:', error);
    return {
      success: false,
      message: 'Failed to create article',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Handle article update from Shopify
 */
async function handleArticleUpdate(
  payload: ShopifyArticleWebhookPayload
): Promise<{
  success: boolean;
  message: string;
  errors: string[];
}> {
  try {
    // Find existing article in our database
    const { data: existingArticle, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('shopify_article_id', payload.id)
      .single();

    if (fetchError) {
      console.error('Error fetching article for update:', fetchError);
      return {
        success: false,
        message: 'Article not found in database',
        errors: [fetchError.message]
      };
    }

    // Convert Shopify payload to our database format
    const shopifyArticle = convertWebhookPayloadToShopifyArticle(payload);
    const updatedData = mapShopifyToDatabase(shopifyArticle, existingArticle);

    // Update in database
    const { data, error } = await supabase
      .from('articles')
      .update({
        ...updatedData,
        shopify_article_id: payload.id,
        shopify_blog_id: payload.blog_id,
      })
      .eq('id', existingArticle.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating article from webhook:', error);
      return {
        success: false,
        message: 'Failed to update article in database',
        errors: [error.message]
      };
    }

    console.log(`✅ Article updated from webhook: ${data.id}`);
    return {
      success: true,
      message: `Article updated successfully: ${data.id}`,
      errors: []
    };
  } catch (error) {
    console.error('Error in handleArticleUpdate:', error);
    return {
      success: false,
      message: 'Failed to update article',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Handle article deletion from Shopify
 */
async function handleArticleDelete(
  payload: ShopifyArticleWebhookPayload
): Promise<{
  success: boolean;
  message: string;
  errors: string[];
}> {
  try {
    // Find and delete article from our database
    const { data, error } = await supabase
      .from('articles')
      .delete()
      .eq('shopify_article_id', payload.id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting article from webhook:', error);
      return {
        success: false,
        message: 'Failed to delete article from database',
        errors: [error.message]
      };
    }

    console.log(`✅ Article deleted from webhook: ${payload.id}`);
    return {
      success: true,
      message: `Article deleted successfully: ${payload.id}`,
      errors: []
    };
  } catch (error) {
    console.error('Error in handleArticleDelete:', error);
    return {
      success: false,
      message: 'Failed to delete article',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// ============================================================================
// BLOG WEBHOOK HANDLERS
// ============================================================================

/**
 * Handle blog creation from Shopify
 */
async function handleBlogCreate(
  payload: ShopifyBlogWebhookPayload
): Promise<{
  success: boolean;
  message: string;
  errors: string[];
}> {
  try {
    // For now, we'll just log blog creation
    // In the future, we might want to store blog metadata
    console.log(`📝 Blog created in Shopify: ${payload.title} (ID: ${payload.id})`);
    
    return {
      success: true,
      message: `Blog creation noted: ${payload.title}`,
      errors: []
    };
  } catch (error) {
    console.error('Error in handleBlogCreate:', error);
    return {
      success: false,
      message: 'Failed to process blog creation',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Handle blog update from Shopify
 */
async function handleBlogUpdate(
  payload: ShopifyBlogWebhookPayload
): Promise<{
  success: boolean;
  message: string;
  errors: string[];
}> {
  try {
    // For now, we'll just log blog updates
    console.log(`📝 Blog updated in Shopify: ${payload.title} (ID: ${payload.id})`);
    
    return {
      success: true,
      message: `Blog update noted: ${payload.title}`,
      errors: []
    };
  } catch (error) {
    console.error('Error in handleBlogUpdate:', error);
    return {
      success: false,
      message: 'Failed to process blog update',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Handle blog deletion from Shopify
 */
async function handleBlogDelete(
  payload: ShopifyBlogWebhookPayload
): Promise<{
  success: boolean;
  message: string;
  errors: string[];
}> {
  try {
    // When a blog is deleted, we should handle associated articles
    console.log(`🗑️ Blog deleted in Shopify: ${payload.title} (ID: ${payload.id})`);
    
    // Update articles that were in this blog to remove Shopify references
    const { data, error } = await supabase
      .from('articles')
      .update({
        shopify_blog_id: null,
        shopify_article_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('shopify_blog_id', payload.id)
      .select();

    if (error) {
      console.error('Error updating articles after blog deletion:', error);
      return {
        success: false,
        message: 'Failed to update articles after blog deletion',
        errors: [error.message]
      };
    }

    console.log(`✅ Updated ${data?.length || 0} articles after blog deletion`);
    
    return {
      success: true,
      message: `Blog deletion processed: ${payload.title}`,
      errors: []
    };
  } catch (error) {
    console.error('Error in handleBlogDelete:', error);
    return {
      success: false,
      message: 'Failed to process blog deletion',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert webhook payload to our ShopifyArticle format
 */
function convertWebhookPayloadToShopifyArticle(
  payload: ShopifyArticleWebhookPayload
): any {
  return {
    id: `gid://shopify/Article/${payload.id}`,
    title: payload.title,
    content: payload.content,
    excerpt: payload.excerpt,
    handle: payload.handle,
    publishedAt: payload.published_at,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
    tags: payload.tags ? payload.tags.split(',').map(tag => tag.trim()) : [],
    summary: payload.summary,
    seo: payload.seo,
    blog: {
      id: `gid://shopify/Blog/${payload.blog_id}`
    }
  };
}

/**
 * Get webhook configuration for debugging
 */
export function getWebhookConfig() {
  return {
    supportedEvents: [
      'articles/create',
      'articles/update',
      'articles/delete',
      'blogs/create',
      'blogs/update',
      'blogs/delete'
    ],
    verificationRequired: true,
    secretRequired: true,
    endpoint: '/api/webhooks/shopify'
  };
}

/**
 * Validate webhook event type
 */
export function isValidWebhookEvent(event: string): event is ShopifyWebhookEvent {
  const validEvents: ShopifyWebhookEvent[] = [
    'articles/create',
    'articles/update',
    'articles/delete',
    'blogs/create',
    'blogs/update',
    'blogs/delete'
  ];
  
  return validEvents.includes(event as ShopifyWebhookEvent);
} 