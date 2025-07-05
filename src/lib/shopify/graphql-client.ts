import { createAdminApiClient, AdminApiClient } from '@shopify/admin-api-client';

// Environment configuration
const SHOPIFY_CONFIG = {
  storeDomain: process.env.SHOPIFY_STORE_DOMAIN || '',
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN || '',
  apiVersion: '2025-07' as const, // Latest stable version
};

// Validate configuration
if (!SHOPIFY_CONFIG.storeDomain || !SHOPIFY_CONFIG.accessToken) {
  console.warn('⚠️ Shopify configuration missing. Blog publishing will be disabled.');
}

// GraphQL client instance
let graphqlClient: AdminApiClient | null = null;

/**
 * Get or create the Shopify GraphQL client
 */
export function getShopifyGraphQLClient(): AdminApiClient | null {
  if (!SHOPIFY_CONFIG.storeDomain || !SHOPIFY_CONFIG.accessToken) {
    console.warn('Shopify client not configured');
    return null;
  }

  if (!graphqlClient) {
    try {
      graphqlClient = createAdminApiClient({
        storeDomain: SHOPIFY_CONFIG.storeDomain,
        accessToken: SHOPIFY_CONFIG.accessToken,
        apiVersion: SHOPIFY_CONFIG.apiVersion,
      });
      
      console.log('✅ Shopify GraphQL client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Shopify GraphQL client:', error);
      return null;
    }
  }

  return graphqlClient;
}

/**
 * Execute a GraphQL query with error handling and retry logic
 */
export async function executeShopifyQuery<T = any>(
  query: string,
  variables: Record<string, any> = {},
  options: {
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<{
  data: T | null;
  errors: any[] | null;
  extensions: any | null;
  success: boolean;
}> {
  const client = getShopifyGraphQLClient();
  
  if (!client) {
    return {
      data: null,
      errors: [{ message: 'Shopify client not configured' }],
      extensions: null,
      success: false,
    };
  }

  const { retries = 3, retryDelay = 1000 } = options;
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Executing Shopify GraphQL query (attempt ${attempt + 1}/${retries + 1})`);
      
      const response = await client.request(query, { variables });
      
      // Check for GraphQL errors (Shopify returns 200 OK even with errors)
      if (response.errors && response.errors.length > 0) {
        console.error('❌ GraphQL errors:', response.errors);
        
        // Check if it's a rate limit error
        const isRateLimit = response.errors.some((error: any) => 
          error.extensions?.code === 'THROTTLED' || 
          error.message?.includes('rate limit')
        );
        
        if (isRateLimit && attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt); // Exponential backoff
          console.log(`⏳ Rate limited, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return {
          data: response.data,
          errors: response.errors,
          extensions: response.extensions,
          success: false,
        };
      }

      console.log('✅ GraphQL query executed successfully');
      return {
        data: response.data,
        errors: null,
        extensions: response.extensions,
        success: true,
      };

    } catch (error) {
      lastError = error;
      console.error(`❌ GraphQL query failed (attempt ${attempt + 1}):`, error);
      
      if (attempt < retries) {
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return {
    data: null,
    errors: [{ message: lastError?.message || 'Unknown error occurred' }],
    extensions: null,
    success: false,
  };
}

/**
 * Check if Shopify client is properly configured
 */
export function isShopifyConfigured(): boolean {
  return !!(SHOPIFY_CONFIG.storeDomain && SHOPIFY_CONFIG.accessToken);
}

/**
 * Get Shopify configuration (without exposing sensitive data)
 */
export function getShopifyConfig() {
  return {
    storeDomain: SHOPIFY_CONFIG.storeDomain,
    hasAccessToken: !!SHOPIFY_CONFIG.accessToken,
    apiVersion: SHOPIFY_CONFIG.apiVersion,
    isConfigured: isShopifyConfigured(),
  };
} 