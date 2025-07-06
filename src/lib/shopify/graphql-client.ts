import { createAdminApiClient } from '@shopify/admin-api-client';

/**
 * Shopify GraphQL Client with Hybrid Approach
 * 
 * This client uses a hybrid approach for blog and article management:
 * - GraphQL for reading data (blogs, articles) - supported by Admin API
 * - REST API for mutations (create, update, delete articles) - required since GraphQL doesn't support article mutations
 * 
 * See: https://shopify.dev/docs/api/admin-graphql/latest/queries/blogs
 */

// Types for our GraphQL operations
export interface ShopifyBlog {
  id: string;
  title: string;
  handle: string;
  commentable: string;
  feedburner: string;
  feedburnerLocation: string;
  tags: string;
  templateSuffix: string;
}

export interface ShopifyArticle {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  handle: string;
  published: boolean;
  tags: string[];
  blogId: string;
  authorDisplayName: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
  summary: string;
}

export interface ShopifyArticleInput {
  title: string;
  content: string;
  excerpt?: string;
  handle?: string;
  published?: boolean;
  tags?: string[];
  authorDisplayName?: string;
  summary?: string;
}

class ShopifyGraphQLClient {
  private client: any;
  private maxRetries: number = 3;
  private baseDelay: number = 1000; // 1 second

  constructor() {
    // Client will be initialized lazily when first used
  }

  private initializeClient() {
    if (this.client) return;

    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-10';

    if (!storeDomain || !accessToken) {
      throw new Error('Missing required Shopify environment variables');
    }

    this.client = createAdminApiClient({
      storeDomain,
      accessToken,
      apiVersion,
    });
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    this.initializeClient();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a rate limit error
        if (this.isRateLimitError(error)) {
          const delay = this.calculateBackoffDelay(attempt);
          console.warn(`Rate limited on ${operationName}, attempt ${attempt}/${this.maxRetries}. Retrying in ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        // For non-rate-limit errors, don't retry
        throw error;
      }
    }

    throw new Error(`${operationName} failed after ${this.maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  private isRateLimitError(error: any): boolean {
    return error?.response?.status === 429 || 
           error?.message?.includes('rate limit') ||
           error?.message?.includes('throttled');
  }

  private calculateBackoffDelay(attempt: number): number {
    // Exponential backoff with jitter
    const delay = this.baseDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * delay;
    return Math.floor(delay + jitter);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get all blogs using proper GraphQL query
  async getBlogs(): Promise<ShopifyBlog[]> {
    // Try GraphQL first, fall back to known blog if it fails
    try {
      const query = `
        query BlogList {
          blogs(first: 50) {
            nodes {
              id
              handle
              title
              commentPolicy
            }
          }
        }
      `;

      const response = await this.client.request(query);
      return response.data.blogs.nodes.map((blog: any) => ({
        id: blog.id,
        title: blog.title,
        handle: blog.handle,
        commentable: blog.commentPolicy === 'OPEN' ? 'yes' : 'no',
        feedburner: '',
        feedburnerLocation: '',
        tags: '',
        templateSuffix: ''
      }));
    } catch (error) {
      console.warn('GraphQL blogs query failed, falling back to known blog:', error);
      
      // Fall back to known blog information
      const knownBlogId = '96953336105';
      return [{
        id: `gid://shopify/Blog/${knownBlogId}`,
        title: 'Blog',
        handle: 'news',
        commentable: 'no',
        feedburner: '',
        feedburnerLocation: '',
        tags: '',
        templateSuffix: ''
      }];
    }
  }

  // Get a specific blog
  async getBlog(blogId: string): Promise<ShopifyBlog> {
    const query = `
      query getBlog($id: ID!) {
        blog(id: $id) {
          id
          title
          handle
          commentable
          feedburner
          feedburnerLocation
          tags
          templateSuffix
        }
      }
    `;

    return this.executeWithRetry(async () => {
      const response = await this.client.request(query, { variables: { id: blogId } });
      return response.data.blog;
    }, 'getBlog');
  }

  // Create a new blog
  async createBlog(title: string, handle?: string): Promise<ShopifyBlog> {
    const mutation = `
      mutation blogCreate($blog: BlogInput!) {
        blogCreate(blog: $blog) {
          blog {
            id
            title
            handle
            commentable
            feedburner
            feedburnerLocation
            tags
            templateSuffix
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const blogInput = {
      title,
      handle: handle || title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
    };

    return this.executeWithRetry(async () => {
      const response = await this.client.request(mutation, { variables: { blog: blogInput } });
      
      if (response.data.blogCreate.userErrors.length > 0) {
        throw new Error(`Blog creation failed: ${response.data.blogCreate.userErrors.map((e: any) => e.message).join(', ')}`);
      }

      return response.data.blogCreate.blog;
    }, 'createBlog');
  }

  // Get articles from a blog
  async getArticles(blogId: string, limit: number = 50): Promise<ShopifyArticle[]> {
    const query = `
      query getArticles($blogId: ID!, $first: Int!) {
        blog(id: $blogId) {
          articles(first: $first) {
            nodes {
              id
              title
              content
              excerpt
              handle
              publishedAt
              tags
              author {
                displayName
              }
              createdAt
              updatedAt
              summary
            }
          }
        }
      }
    `;

    return this.executeWithRetry(async () => {
      const response = await this.client.request(query, { 
        variables: { blogId, first: limit } 
      });
      return response.data.blog.articles.nodes.map((article: any) => ({
        id: article.id,
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        handle: article.handle,
        published: !!article.publishedAt,
        tags: article.tags || [],
        blogId: blogId,
        authorDisplayName: article.author?.displayName || 'Admin',
        createdAt: article.createdAt,
        updatedAt: article.updatedAt,
        publishedAt: article.publishedAt,
        summary: article.summary,
      }));
    }, 'getArticles');
  }

  // Create a new article using REST API (GraphQL doesn't support article creation)
  async createArticle(blogId: string, article: ShopifyArticleInput): Promise<ShopifyArticle> {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-10';
    
    if (!storeDomain || !accessToken) {
      throw new Error('Missing Shopify configuration');
    }

    // Extract numeric blog ID from GraphQL ID
    const numericBlogId = blogId.replace('gid://shopify/Blog/', '');
    
    const articleData = {
      article: {
        title: article.title,
        body_html: article.content,
        author: article.authorDisplayName || 'Admin',
        handle: article.handle || article.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        excerpt: article.excerpt || article.summary,
        summary: article.summary,
        tags: Array.isArray(article.tags) ? article.tags.join(', ') : article.tags,
        published: article.published || false
      }
    };

    return this.executeWithRetry(async () => {
      const response = await fetch(
        `https://${storeDomain}/admin/api/${apiVersion}/blogs/${numericBlogId}/articles.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify(articleData),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Article creation failed: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const result = await response.json();
      const createdArticle = result.article;
      
      // If we have an excerpt, set it as SEO metafield for better meta description support
      if (article.excerpt) {
        try {
          await this.setArticleSEOMetafield(createdArticle.id, article.excerpt);
        } catch (error) {
          console.warn('Failed to set SEO metafield, but article was created successfully:', error);
        }
      }
      
      // Convert REST response to our interface format
      return {
        id: `gid://shopify/Article/${createdArticle.id}`,
        title: createdArticle.title,
        content: createdArticle.body_html,
        excerpt: createdArticle.excerpt,
        handle: createdArticle.handle,
        published: createdArticle.published,
        tags: createdArticle.tags ? createdArticle.tags.split(', ') : [],
        blogId: blogId,
        authorDisplayName: createdArticle.author,
        createdAt: createdArticle.created_at,
        updatedAt: createdArticle.updated_at,
        publishedAt: createdArticle.published_at,
        summary: createdArticle.summary,
      };
    }, 'createArticle');
  }

  // Set SEO metafield for article
  private async setArticleSEOMetafield(articleId: number, description: string): Promise<void> {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-10';
    
    if (!storeDomain || !accessToken) {
      throw new Error('Missing Shopify configuration for SEO metafield');
    }
    
    const metafieldData = {
      metafield: {
        namespace: 'seo',
        key: 'description',
        value: description,
        type: 'single_line_text_field',
        owner_resource: 'article',
        owner_id: articleId
      }
    };

    const response = await fetch(
      `https://${storeDomain}/admin/api/${apiVersion}/articles/${articleId}/metafields.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify(metafieldData),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`SEO metafield creation failed: ${response.status} ${response.statusText} - ${errorData}`);
    }
  }

  // Update an existing article using REST API
  async updateArticle(articleId: string, article: Partial<ShopifyArticleInput>): Promise<ShopifyArticle> {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-10';
    
    if (!storeDomain || !accessToken) {
      throw new Error('Missing Shopify configuration');
    }

    // Extract numeric article ID from GraphQL ID
    const numericArticleId = articleId.replace('gid://shopify/Article/', '');
    
    const articleData: any = { article: {} };
    
    if (article.title) articleData.article.title = article.title;
    if (article.content) articleData.article.body_html = article.content;
    if (article.authorDisplayName) articleData.article.author = article.authorDisplayName;
    if (article.handle) articleData.article.handle = article.handle;
    if (article.excerpt) articleData.article.excerpt = article.excerpt;
    if (article.summary) {
      articleData.article.summary = article.summary;
      // If no excerpt provided but summary exists, use summary for excerpt (meta description)
      if (!article.excerpt) {
        articleData.article.excerpt = article.summary;
      }
    }
    if (article.tags) articleData.article.tags = Array.isArray(article.tags) ? article.tags.join(', ') : article.tags;
    if (article.published !== undefined) articleData.article.published = article.published;

    return this.executeWithRetry(async () => {
      const response = await fetch(
        `https://${storeDomain}/admin/api/${apiVersion}/articles/${numericArticleId}.json`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify(articleData),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Article update failed: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const result = await response.json();
      const updatedArticle = result.article;
      
      // If we have an excerpt, set it as SEO metafield for better meta description support
      if (article.excerpt) {
        try {
          await this.setArticleSEOMetafield(updatedArticle.id, article.excerpt);
        } catch (error) {
          console.warn('Failed to set SEO metafield, but article was updated successfully:', error);
        }
      }
      
      // Convert REST response to our interface format
      return {
        id: `gid://shopify/Article/${updatedArticle.id}`,
        title: updatedArticle.title,
        content: updatedArticle.body_html,
        excerpt: updatedArticle.excerpt,
        handle: updatedArticle.handle,
        published: updatedArticle.published,
        tags: updatedArticle.tags ? updatedArticle.tags.split(', ') : [],
        blogId: `gid://shopify/Blog/${updatedArticle.blog_id}`,
        authorDisplayName: updatedArticle.author,
        createdAt: updatedArticle.created_at,
        updatedAt: updatedArticle.updated_at,
        publishedAt: updatedArticle.published_at,
        summary: updatedArticle.summary,
      };
    }, 'updateArticle');
  }

  // Delete an article using REST API
  async deleteArticle(articleId: string): Promise<boolean> {
    const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-10';
    
    if (!storeDomain || !accessToken) {
      throw new Error('Missing Shopify configuration');
    }

    // Extract numeric article ID from GraphQL ID
    const numericArticleId = articleId.replace('gid://shopify/Article/', '');

    return this.executeWithRetry(async () => {
      const response = await fetch(
        `https://${storeDomain}/admin/api/${apiVersion}/articles/${numericArticleId}.json`,
        {
          method: 'DELETE',
          headers: {
            'X-Shopify-Access-Token': accessToken,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Article deletion failed: ${response.status} ${response.statusText} - ${errorData}`);
      }

      return true;
    }, 'deleteArticle');
  }

  // Get shop information
  async getShop() {
    const query = `
      query getShop {
        shop {
          id
          name
          email
          domain
          currency
          timezone
          plan {
            displayName
            partnerDevelopment
            shopifyPlus
          }
        }
      }
    `;

    return this.executeWithRetry(async () => {
      const response = await this.client.request(query);
      return response.data.shop;
    }, 'getShop');
  }

  // Generic request method for external use
  async request(query: string, variables?: any) {
    this.initializeClient();
    return this.executeWithRetry(async () => {
      return await this.client.request(query, variables);
    }, 'genericRequest');
  }
}

// Export singleton instance
export const shopifyClient = new ShopifyGraphQLClient(); 