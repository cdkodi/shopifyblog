#!/usr/bin/env node

/**
 * SHOPIFY DATA IMPORT SCRIPT
 * Purpose: Import real Shopify product data into production database
 * Usage: node shopify-data-import.js
 * 
 * Prerequisites:
 * 1. Set up Shopify Custom App with read permissions
 * 2. Configure environment variables
 * 3. Run database cleanup script first
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// CONFIGURATION
// ============================================================================

const SHOPIFY_CONFIG = {
  storeName: process.env.SHOPIFY_STORE_NAME,      // e.g., 'your-store-name'
  accessToken: process.env.SHOPIFY_ACCESS_TOKEN,  // Admin API access token
  apiVersion: process.env.SHOPIFY_API_VERSION || '2025-04'
};

const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

// Validate configuration
function validateConfig() {
  const missing = [];
  
  if (!SHOPIFY_CONFIG.storeName) missing.push('SHOPIFY_STORE_NAME');
  if (!SHOPIFY_CONFIG.accessToken) missing.push('SHOPIFY_ACCESS_TOKEN');
  if (!SUPABASE_CONFIG.url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_CONFIG.serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(var_name => console.error(`   - ${var_name}`));
    console.error('\n📝 Add these to your .env.local file');
    process.exit(1);
  }
  
  console.log('✅ Configuration validated');
}

// ============================================================================
// SHOPIFY API FUNCTIONS
// ============================================================================

const GRAPHQL_ENDPOINT = `https://${SHOPIFY_CONFIG.storeName}.myshopify.com/admin/api/${SHOPIFY_CONFIG.apiVersion}/graphql.json`;

async function shopifyRequest(query, variables = {}) {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_CONFIG.accessToken
      },
      body: JSON.stringify({ query, variables })
    });

    const data = await response.json();
    
    if (data.errors) {
      console.error('Shopify API errors:', data.errors);
      throw new Error(`Shopify API error: ${data.errors[0].message}`);
    }
    
    return data.data;
  } catch (error) {
    console.error('Shopify request failed:', error.message);
    throw error;
  }
}

async function fetchAllProducts() {
  console.log('📦 Fetching products from Shopify...');
  
  const query = `
    query GetProducts($first: Int!, $after: String) {
      products(first: $first, after: $after) {
        edges {
          node {
            id
            legacyResourceId
            title
            handle
            description
            productType
            status
            tags
            onlineStoreUrl
            createdAt
            updatedAt
            collections(first: 10) {
              edges {
                node {
                  title
                  handle
                }
              }
            }
            images(first: 5) {
              edges {
                node {
                  originalSrc
                  altText
                }
              }
            }
            variants(first: 1) {
              edges {
                node {
                  price
                  inventoryQuantity
                }
              }
            }
            priceRange {
              minVariantPrice {
                amount
              }
              maxVariantPrice {
                amount
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  let allProducts = [];
  let hasNextPage = true;
  let cursor = null;
  let pageCount = 0;

  while (hasNextPage) {
    pageCount++;
    console.log(`   Fetching page ${pageCount}...`);
    
    const data = await shopifyRequest(query, {
      first: 50, // Shopify allows max 250, but 50 is safer
      after: cursor
    });

    const products = data.products.edges.map(edge => edge.node);
    allProducts = [...allProducts, ...products];
    
    hasNextPage = data.products.pageInfo.hasNextPage;
    cursor = data.products.pageInfo.endCursor;
    
    console.log(`   Page ${pageCount}: ${products.length} products`);
    
    // Add small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`✅ Fetched ${allProducts.length} total products from Shopify`);
  return allProducts;
}

// ============================================================================
// DATABASE FUNCTIONS
// ============================================================================

function transformShopifyProduct(shopifyProduct) {
  return {
    shopify_id: parseInt(shopifyProduct.legacyResourceId),
    title: shopifyProduct.title,
    handle: shopifyProduct.handle,
    description: shopifyProduct.description || null,
    product_type: shopifyProduct.productType || null,
    collections: shopifyProduct.collections.edges.map(edge => edge.node.title),
    tags: shopifyProduct.tags,
    images: shopifyProduct.images.edges.map(edge => edge.node.originalSrc),
    price_min: parseFloat(shopifyProduct.priceRange.minVariantPrice.amount),
    price_max: parseFloat(shopifyProduct.priceRange.maxVariantPrice.amount),
    inventory_quantity: shopifyProduct.variants.edges[0]?.node.inventoryQuantity || 0,
    status: shopifyProduct.status.toLowerCase(),
    shopify_url: shopifyProduct.onlineStoreUrl || `https://${SHOPIFY_CONFIG.storeName}.myshopify.com/products/${shopifyProduct.handle}`,
    last_synced: new Date().toISOString()
  };
}

async function importProductsToDatabase(products) {
  console.log('💾 Importing products to database...');
  
  const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceKey);
  
  // Transform products for database
  const transformedProducts = products.map(transformShopifyProduct);
  
  // Batch insert (Supabase handles max 1000 rows per insert)
  const batchSize = 100;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < transformedProducts.length; i += batchSize) {
    const batch = transformedProducts.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from('shopify_products')
        .insert(batch)
        .select('id, title');
      
      if (error) {
        console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} failed:`, error.message);
        errorCount += batch.length;
      } else {
        console.log(`✅ Batch ${Math.floor(i/batchSize) + 1}: ${data.length} products imported`);
        successCount += data.length;
      }
    } catch (err) {
      console.error(`❌ Batch ${Math.floor(i/batchSize) + 1} error:`, err.message);
      errorCount += batch.length;
    }
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Import Summary:`);
  console.log(`   ✅ Successfully imported: ${successCount} products`);
  console.log(`   ❌ Failed to import: ${errorCount} products`);
  console.log(`   📦 Total processed: ${transformedProducts.length} products`);
  
  return { successCount, errorCount, totalCount: transformedProducts.length };
}

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

async function verifyImport() {
  console.log('🔍 Verifying import...');
  
  const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceKey);
  
  try {
    // Count total products
    const { count: totalCount, error: countError } = await supabase
      .from('shopify_products')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw countError;
    
    // Get sample products
    const { data: sampleProducts, error: sampleError } = await supabase
      .from('shopify_products')
      .select('title, product_type, status, collections, tags')
      .limit(5);
    
    if (sampleError) throw sampleError;
    
    console.log(`✅ Database contains ${totalCount} products`);
    console.log(`\n📦 Sample products:`);
    sampleProducts.forEach((product, index) => {
      console.log(`   ${index + 1}. ${product.title}`);
      console.log(`      Type: ${product.product_type || 'N/A'}`);
      console.log(`      Status: ${product.status}`);
      console.log(`      Collections: ${product.collections?.length || 0}`);
      console.log(`      Tags: ${product.tags?.length || 0}`);
      console.log('');
    });
    
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🚀 Starting Shopify Data Import...\n');
  
  try {
    // Step 1: Validate configuration
    validateConfig();
    
    // Step 2: Fetch products from Shopify
    const products = await fetchAllProducts();
    
    if (products.length === 0) {
      console.log('⚠️  No products found in Shopify store');
      return;
    }
    
    // Step 3: Import to database
    const importResult = await importProductsToDatabase(products);
    
    // Step 4: Verify import
    const verificationPassed = await verifyImport();
    
    // Step 5: Summary
    console.log('\n🎉 Import completed!');
    console.log('\n📋 Summary:');
    console.log(`   📦 Shopify products fetched: ${products.length}`);
    console.log(`   ✅ Successfully imported: ${importResult.successCount}`);
    console.log(`   ❌ Import failures: ${importResult.errorCount}`);
    console.log(`   🔍 Verification: ${verificationPassed ? 'PASSED' : 'FAILED'}`);
    
    if (importResult.successCount > 0) {
      console.log('\n✅ Ready for production deployment!');
      console.log('\n📋 Next steps:');
      console.log('1. Test the application with real data');
      console.log('2. Configure production environment variables');
      console.log('3. Deploy to production');
    }
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
if (require.main === module) {
  main();
}

module.exports = { main, fetchAllProducts, importProductsToDatabase }; 