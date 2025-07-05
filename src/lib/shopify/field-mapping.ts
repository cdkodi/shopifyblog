import { Article } from '@/lib/types/database';

/**
 * Shopify Article interface based on GraphQL API
 */
export interface ShopifyArticle {
  id?: string;
  title: string;
  content: string;
  excerpt?: string;
  handle?: string;
  publishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  tags: string[];
  summary?: string;
  seo?: {
    title?: string;
    description?: string;
  };
  blog?: {
    id: string;
  };
}

/**
 * Shopify Article Input for mutations
 */
export interface ShopifyArticleInput {
  title: string;
  content: string;
  excerpt?: string;
  handle?: string;
  published?: boolean;
  publishedAt?: string;
  tags?: string[];
  summary?: string;
  seo?: {
    title?: string;
    description?: string;
  };
  blogId: string;
}

/**
 * Our database article with additional fields
 */
export interface DatabaseArticle extends Article {
  target_keywords?: any;
  shopify_blog_id?: number | null;
  shopify_article_id?: number | null;
}

/**
 * Convert our database article to Shopify article input format
 */
export function mapDatabaseToShopifyInput(
  article: DatabaseArticle,
  blogId: string,
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

  // Prepare SEO data
  const seo: { title?: string; description?: string } = {};
  if (article.meta_description) {
    seo.description = article.meta_description;
  }
  // Use article title as SEO title if no specific SEO title is provided
  seo.title = article.title;

  const shopifyInput: ShopifyArticleInput = {
    title: article.title,
    content: article.content,
    handle: handle,
    blogId: blogId,
    published: options.published ?? (article.status === 'published'),
    tags: tags,
    seo: seo,
  };

  // Add excerpt/summary if available
  if (article.meta_description) {
    shopifyInput.excerpt = article.meta_description;
    shopifyInput.summary = article.meta_description;
  }

  // Add publish date if specified or if article is published
  if (options.publishedAt) {
    shopifyInput.publishedAt = options.publishedAt;
  } else if (article.published_at) {
    shopifyInput.publishedAt = article.published_at;
  } else if (article.scheduled_publish_date) {
    shopifyInput.publishedAt = article.scheduled_publish_date;
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
    meta_description: shopifyArticle.excerpt || shopifyArticle.summary || shopifyArticle.seo?.description,
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

  if (shopifyArticle.blog?.id) {
    const numericBlogId = extractNumericId(shopifyArticle.blog.id);
    if (numericBlogId) {
      databaseArticle.shopify_blog_id = numericBlogId;
    }
  }

  // Handle publication status
  if (shopifyArticle.publishedAt) {
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

  if (!input.blogId || input.blogId.trim().length === 0) {
    errors.push('Blog ID is required');
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