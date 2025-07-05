import { Article } from '@/lib/supabase';
import { ShopifyArticleInput, ShopifyArticle } from './graphql-client';

/**
 * Our database article type - just use the Article type directly
 */
export type DatabaseArticle = Article;

/**
 * Convert our database article to Shopify article input format
 */
export function mapDatabaseToShopifyInput(
  article: DatabaseArticle,
  options: {
    published?: boolean;
    publishedAt?: string;
  } = {}
): ShopifyArticleInput {
  // Generate handle from title if not provided
  const handle = article.slug || generateHandleFromTitle(article.title);
  
  // Parse target keywords for tags
  let tags: string[] = [];
  if (article.target_keywords) {
    try {
      const keywords = typeof article.target_keywords === 'string' 
        ? JSON.parse(article.target_keywords)
        : article.target_keywords;
      
      if (Array.isArray(keywords)) {
        tags = keywords.filter(k => typeof k === 'string');
      }
    } catch (error) {
      console.warn('Failed to parse target_keywords as tags:', error);
    }
  }

  const shopifyInput: ShopifyArticleInput = {
    title: article.title,
    content: article.content,
    handle: handle,
    published: options.published ?? (article.status === 'published'),
    tags: tags,
  };

  // Add excerpt/summary if available
  if (article.meta_description) {
    shopifyInput.excerpt = article.meta_description;
    shopifyInput.summary = article.meta_description;
  }

  return shopifyInput;
}

/**
 * Convert Shopify article response to our database format
 */
export function mapShopifyToDatabase(
  shopifyArticle: ShopifyArticle,
  existingArticle?: Partial<DatabaseArticle>
): Partial<DatabaseArticle> {
  const databaseArticle: Partial<DatabaseArticle> = {
    title: shopifyArticle.title,
    content: shopifyArticle.content,
    meta_description: shopifyArticle.excerpt || shopifyArticle.summary,
    slug: shopifyArticle.handle,
    updated_at: new Date().toISOString(),
  };

  // Extract Shopify IDs
  if (shopifyArticle.id) {
    // Extract numeric ID from GraphQL ID (gid://shopify/Article/123456)
    const numericId = extractNumericId(shopifyArticle.id);
    if (numericId) {
      databaseArticle.shopify_article_id = numericId;
    }
  }

  if (shopifyArticle.blogId) {
    const numericBlogId = extractNumericId(shopifyArticle.blogId);
    if (numericBlogId) {
      databaseArticle.shopify_blog_id = numericBlogId;
    }
  }

  // Handle publication status
  if (shopifyArticle.published && shopifyArticle.publishedAt) {
    databaseArticle.status = 'published';
    databaseArticle.published_at = shopifyArticle.publishedAt;
  } else {
    databaseArticle.status = 'draft';
  }

  // Convert tags back to target_keywords
  if (shopifyArticle.tags && shopifyArticle.tags.length > 0) {
    databaseArticle.target_keywords = JSON.stringify(shopifyArticle.tags);
  }

  // Preserve existing fields that aren't in Shopify
  if (existingArticle) {
    databaseArticle.seo_score = existingArticle.seo_score;
    databaseArticle.word_count = existingArticle.word_count || calculateWordCount(shopifyArticle.content);
    databaseArticle.reading_time = existingArticle.reading_time || calculateReadingTime(shopifyArticle.content);
  } else {
    databaseArticle.word_count = calculateWordCount(shopifyArticle.content);
    databaseArticle.reading_time = calculateReadingTime(shopifyArticle.content);
  }

  return databaseArticle;
}

/**
 * Generate a URL-friendly handle from title
 */
export function generateHandleFromTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 255); // Shopify handle limit
}

/**
 * Extract numeric ID from Shopify GraphQL ID
 */
export function extractNumericId(graphqlId: string): number | null {
  const match = graphqlId.match(/\/(\d+)$/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Convert numeric ID to Shopify GraphQL ID
 */
export function createShopifyGraphQLId(type: 'Article' | 'Blog', numericId: number): string {
  return `gid://shopify/${type}/${numericId}`;
}

/**
 * Calculate word count from content
 */
function calculateWordCount(content: string): number {
  return content.trim().split(/\s+/).length;
}

/**
 * Calculate reading time in minutes
 */
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = calculateWordCount(content);
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Validate Shopify article input
 */
export function validateShopifyArticleInput(input: ShopifyArticleInput): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!input.title || input.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!input.content || input.content.trim().length === 0) {
    errors.push('Content is required');
  }



  if (input.title && input.title.length > 255) {
    errors.push('Title must be 255 characters or less');
  }

  if (input.handle && input.handle.length > 255) {
    errors.push('Handle must be 255 characters or less');
  }

  if (input.excerpt && input.excerpt.length > 500) {
    errors.push('Excerpt must be 500 characters or less');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Field mapping configuration for debugging
 */
export const FIELD_MAPPING_CONFIG = {
  database_to_shopify: {
    title: 'title',
    content: 'content',
    meta_description: 'excerpt, summary, seo.description',
    slug: 'handle',
    target_keywords: 'tags (JSON array)',
    status: 'published (boolean)',
    published_at: 'publishedAt',
    scheduled_publish_date: 'publishedAt',
  },
  shopify_to_database: {
    title: 'title',
    content: 'content',
    excerpt: 'meta_description',
    handle: 'slug',
    tags: 'target_keywords (JSON string)',
    publishedAt: 'published_at, status',
    'seo.description': 'meta_description',
  },
  calculated_fields: {
    word_count: 'Calculated from content',
    reading_time: 'Calculated from word count (200 WPM)',
    updated_at: 'Set to current timestamp',
  }
};

// CMS Article type (from our database)
export interface CMSArticle {
  id: string;
  title: string;
  content: string;
  meta_description?: string | null;
  slug?: string | null;
  status?: string | null;
  target_keywords?: any; // JSON field can be string[] or any JSON
  shopify_article_id?: number | null;
  shopify_blog_id?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  published_at?: string | null;
  scheduled_publish_date?: string | null;
  reading_time?: number | null;
  word_count?: number | null;
  seo_score?: number | null;
}

/**
 * Convert CMS article to Shopify article input format
 */
export function mapCMSToShopify(cmsArticle: CMSArticle): ShopifyArticleInput {
  // Parse target_keywords if it's a JSON string
  let tags: string[] = [];
  if (cmsArticle.target_keywords) {
    try {
      if (typeof cmsArticle.target_keywords === 'string') {
        tags = JSON.parse(cmsArticle.target_keywords);
      } else if (Array.isArray(cmsArticle.target_keywords)) {
        tags = cmsArticle.target_keywords;
      }
    } catch (error) {
      console.warn('Failed to parse target_keywords:', error);
      tags = [];
    }
  }

  // Generate handle from title if slug is not provided
  const handle = cmsArticle.slug || 
    cmsArticle.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  return {
    title: cmsArticle.title,
    content: cmsArticle.content,
    excerpt: cmsArticle.meta_description || generateExcerpt(cmsArticle.content),
    handle,
    published: cmsArticle.status === 'published',
    tags,
    authorDisplayName: 'Culturati Team', // Default author
    summary: cmsArticle.meta_description || generateSummary(cmsArticle.content),
  };
}

/**
 * Convert Shopify article to CMS article format
 */
export function mapShopifyToCMS(shopifyArticle: ShopifyArticle): Partial<CMSArticle> {
  return {
    title: shopifyArticle.title,
    content: shopifyArticle.content,
    meta_description: shopifyArticle.excerpt || shopifyArticle.summary,
    slug: shopifyArticle.handle,
    status: shopifyArticle.published ? 'published' : 'draft',
    target_keywords: shopifyArticle.tags,
    shopify_article_id: parseInt(shopifyArticle.id.replace('gid://shopify/Article/', '')),
    shopify_blog_id: parseInt(shopifyArticle.blogId.replace('gid://shopify/Blog/', '')),
    published_at: shopifyArticle.publishedAt,
  };
}

/**
 * Generate excerpt from content (first 160 characters)
 */
function generateExcerpt(content: string): string {
  // Remove markdown formatting and HTML tags
  const cleanContent = content
    .replace(/#{1,6}\s/g, '') // Remove markdown headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
    .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();

  if (cleanContent.length <= 160) {
    return cleanContent;
  }

  // Find the last complete sentence within 160 characters
  const truncated = cleanContent.substring(0, 160);
  const lastSentence = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSentence > 100) {
    return truncated.substring(0, lastSentence + 1);
  } else if (lastSpace > 100) {
    return truncated.substring(0, lastSpace) + '...';
  } else {
    return truncated + '...';
  }
}

/**
 * Generate summary from content (first 300 characters)
 */
function generateSummary(content: string): string {
  const cleanContent = content
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/\n+/g, ' ')
    .trim();

  if (cleanContent.length <= 300) {
    return cleanContent;
  }

  const truncated = cleanContent.substring(0, 300);
  const lastSentence = truncated.lastIndexOf('.');
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSentence > 200) {
    return truncated.substring(0, lastSentence + 1);
  } else if (lastSpace > 200) {
    return truncated.substring(0, lastSpace) + '...';
  } else {
    return truncated + '...';
  }
}

/**
 * Validate CMS article before publishing to Shopify
 */
export function validateCMSArticle(article: CMSArticle): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!article.title || article.title.trim().length === 0) {
    errors.push('Title is required');
  }

  if (!article.content || article.content.trim().length === 0) {
    errors.push('Content is required');
  }

  if (article.title && article.title.length > 255) {
    errors.push('Title must be 255 characters or less');
  }

  if (article.content && article.content.length > 100000) {
    errors.push('Content must be 100,000 characters or less');
  }

  // Validate slug format if provided
  if (article.slug) {
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(article.slug)) {
      errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create a Shopify-compatible handle from any string
 */
export function createShopifyHandle(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 255); // Shopify handle limit
}

/**
 * Extract Shopify ID from GraphQL ID
 */
export function extractShopifyId(graphqlId: string): number {
  const match = graphqlId.match(/\/(\d+)$/);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Create GraphQL ID from Shopify ID
 */
export function createGraphQLId(shopifyId: number, type: 'Article' | 'Blog'): string {
  return `gid://shopify/${type}/${shopifyId}`;
} 