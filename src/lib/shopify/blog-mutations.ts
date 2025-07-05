import { shopifyClient, ShopifyArticle, ShopifyArticleInput } from './graphql-client';
import { 
  mapDatabaseToShopifyInput, 
  mapShopifyToDatabase, 
  validateShopifyArticleInput,
  DatabaseArticle,
  extractNumericId,
  createShopifyGraphQLId
} from './field-mapping';

// ============================================================================
// GRAPHQL QUERIES AND MUTATIONS
// ============================================================================

/**
 * Query to get all blogs in the store
 */
const GET_BLOGS_QUERY = `
  query getBlogs($first: Int!) {
    blogs(first: $first) {
      edges {
        node {
          id
          title
          handle
          createdAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * Query to get a specific blog by ID
 */
const GET_BLOG_QUERY = `
  query getBlog($id: ID!) {
    blog(id: $id) {
      id
      title
      handle
      createdAt
      updatedAt
    }
  }
`;

/**
 * Mutation to create a new blog
 */
const CREATE_BLOG_MUTATION = `
  mutation blogCreate($blog: BlogInput!) {
    blogCreate(blog: $blog) {
      blog {
        id
        title
        handle
        createdAt
        updatedAt
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Mutation to create a new article
 */
const CREATE_ARTICLE_MUTATION = `
  mutation articleCreate($article: ArticleInput!) {
    articleCreate(article: $article) {
      article {
        id
        title
        content
        excerpt
        handle
        publishedAt
        createdAt
        updatedAt
        tags
        summary
        seo {
          title
          description
        }
        blog {
          id
          title
          handle
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Mutation to update an existing article
 */
const UPDATE_ARTICLE_MUTATION = `
  mutation articleUpdate($id: ID!, $article: ArticleInput!) {
    articleUpdate(id: $id, article: $article) {
      article {
        id
        title
        content
        excerpt
        handle
        publishedAt
        createdAt
        updatedAt
        tags
        summary
        seo {
          title
          description
        }
        blog {
          id
          title
          handle
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Mutation to delete an article
 */
const DELETE_ARTICLE_MUTATION = `
  mutation articleDelete($id: ID!) {
    articleDelete(id: $id) {
      deletedArticleId
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Query to get an article by ID
 */
const GET_ARTICLE_QUERY = `
  query getArticle($id: ID!) {
    article(id: $id) {
      id
      title
      content
      excerpt
      handle
      publishedAt
      createdAt
      updatedAt
      tags
      summary
      seo {
        title
        description
      }
      blog {
        id
        title
        handle
      }
    }
  }
`;

/**
 * Query to get articles from a blog
 */
const GET_BLOG_ARTICLES_QUERY = `
  query getBlogArticles($blogId: ID!, $first: Int!, $after: String) {
    blog(id: $blogId) {
      id
      title
      articles(first: $first, after: $after) {
        edges {
          node {
            id
            title
            content
            excerpt
            handle
            publishedAt
            createdAt
            updatedAt
            tags
            summary
            seo {
              title
              description
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`;

// ============================================================================
// BLOG OPERATIONS
// ============================================================================

/**
 * Get all blogs from Shopify
 */
export async function getShopifyBlogs(limit: number = 50): Promise<{
  success: boolean;
  blogs: Array<{
    id: string;
    numericId: number;
    title: string;
    handle: string;
    createdAt: string;
    updatedAt: string;
  }>;
  errors: string[];
}> {
  try {
    const blogs = await shopifyClient.getBlogs();

    const formattedBlogs = blogs.map((blog: any) => ({
      id: blog.id,
      numericId: extractNumericId(blog.id) || 0,
      title: blog.title,
      handle: blog.handle,
      createdAt: new Date().toISOString(), // Default since not available in API
      updatedAt: new Date().toISOString(), // Default since not available in API
    }));

    return {
      success: true,
      blogs: formattedBlogs,
      errors: []
    };
  } catch (error) {
    console.error('Error fetching Shopify blogs:', error);
    return {
      success: false,
      blogs: [],
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Create a new blog in Shopify
 */
export async function createShopifyBlog(
  title: string,
  handle?: string
): Promise<{
  success: boolean;
  blog: any | null;
  errors: string[];
}> {
  try {
    const blogHandle = handle || title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const blog = await shopifyClient.createBlog(title, blogHandle);

    return {
      success: true,
      blog: {
        id: blog.id,
        numericId: extractNumericId(blog.id),
        title: blog.title,
        handle: blog.handle,
        createdAt: new Date().toISOString(), // Default since not available in API
        updatedAt: new Date().toISOString(), // Default since not available in API
      },
      errors: []
    };
  } catch (error) {
    console.error('Error creating Shopify blog:', error);
    return {
      success: false,
      blog: null,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// ============================================================================
// ARTICLE OPERATIONS
// ============================================================================

/**
 * Publish an article to Shopify
 */
export async function publishArticleToShopify(
  article: DatabaseArticle,
  blogId: string,
  options: {
    published?: boolean;
    publishedAt?: string;
  } = {}
): Promise<{
  success: boolean;
  article: ShopifyArticle | null;
  errors: string[];
}> {
  try {
    // Map database article to Shopify format
    const shopifyInput = mapDatabaseToShopifyInput(article, options);
    
    // Validate input
    const validation = validateShopifyArticleInput(shopifyInput);
    if (!validation.isValid) {
      return {
        success: false,
        article: null,
        errors: validation.errors
      };
    }

    console.log('📝 Publishing article to Shopify:', {
      title: shopifyInput.title,
      blogId: blogId,
      published: shopifyInput.published
    });

    // Prepare article input for shopifyClient
    const articleInput = {
      title: shopifyInput.title,
      content: shopifyInput.content,
      excerpt: shopifyInput.excerpt,
      handle: shopifyInput.handle,
      published: shopifyInput.published,
      tags: shopifyInput.tags,
      summary: shopifyInput.summary,
      authorDisplayName: 'Admin'
    };

    const createdArticle = await shopifyClient.createArticle(blogId, articleInput);

    console.log('✅ Article published successfully to Shopify');

    return {
      success: true,
      article: createdArticle,
      errors: []
    };
  } catch (error) {
    console.error('Error publishing article to Shopify:', error);
    return {
      success: false,
      article: null,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Update an existing article in Shopify
 */
export async function updateShopifyArticle(
  shopifyArticleId: number,
  article: DatabaseArticle,
  blogId: string,
  options: {
    published?: boolean;
    publishedAt?: string;
  } = {}
): Promise<{
  success: boolean;
  article: ShopifyArticle | null;
  errors: string[];
}> {
  try {
    const graphqlId = createShopifyGraphQLId('Article', shopifyArticleId);
    const shopifyInput = mapDatabaseToShopifyInput(article, options);
    
    const validation = validateShopifyArticleInput(shopifyInput);
    if (!validation.isValid) {
      return {
        success: false,
        article: null,
        errors: validation.errors
      };
    }

    console.log('📝 Updating article in Shopify:', {
      id: graphqlId,
      title: shopifyInput.title
    });

    const articleInput = {
      title: shopifyInput.title,
      content: shopifyInput.content,
      excerpt: shopifyInput.excerpt,
      handle: shopifyInput.handle,
      published: shopifyInput.published,
      tags: shopifyInput.tags,
      summary: shopifyInput.summary,
      authorDisplayName: 'Admin'
    };

    const updatedArticle = await shopifyClient.updateArticle(graphqlId, articleInput);

    console.log('✅ Article updated successfully in Shopify');

    return {
      success: true,
      article: updatedArticle,
      errors: []
    };
  } catch (error) {
    console.error('Error updating article in Shopify:', error);
    return {
      success: false,
      article: null,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Delete an article from Shopify
 */
export async function deleteShopifyArticle(
  shopifyArticleId: number
): Promise<{
  success: boolean;
  errors: string[];
}> {
  try {
    const graphqlId = createShopifyGraphQLId('Article', shopifyArticleId);

    console.log('🗑️ Deleting article from Shopify:', graphqlId);

    const deleted = await shopifyClient.deleteArticle(graphqlId);

    console.log('✅ Article deleted successfully from Shopify');

    return {
      success: deleted,
      errors: deleted ? [] : ['Failed to delete article']
    };
  } catch (error) {
    console.error('Error deleting article from Shopify:', error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Get an article from Shopify by ID
 */
export async function getShopifyArticle(
  shopifyArticleId: number
): Promise<{
  success: boolean;
  article: ShopifyArticle | null;
  errors: string[];
}> {
  try {
    // This function is not currently implemented with the new client
    return {
      success: false,
      article: null,
      errors: ['getShopifyArticle not implemented with current client']
    };
  } catch (error) {
    console.error('Error fetching article from Shopify:', error);
    return {
      success: false,
      article: null,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Get articles from a specific blog
 */
export async function getBlogArticles(
  blogId: string,
  limit: number = 50
): Promise<{
  success: boolean;
  articles: ShopifyArticle[];
  errors: string[];
}> {
  try {
    const articles = await shopifyClient.getArticles(blogId, limit);

    return {
      success: true,
      articles,
      errors: []
    };
  } catch (error) {
    console.error('Error fetching blog articles:', error);
    return {
      success: false,
      articles: [],
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
} 