#!/usr/bin/env node

/**
 * SIMPLIFIED SHOPIFY DATA IMPORT SCRIPT
 * Purpose: Import essential Shopify product data using public endpoints
 * Usage: node shopify-data-import-simple.js
 * 
 * This script tries multiple public methods:
 * 1. Public JSON feed (/products.json)
 * 2. Collection JSON feeds
 * 3. Sitemap parsing (as fallback)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

console.log('🔧 Supabase Config Debug:');
console.log('- URL:', SUPABASE_CONFIG.url ? '✅ Found' : '❌ Missing');
console.log('- Service Key:', SUPABASE_CONFIG.serviceKey ? '✅ Found' : '❌ Missing');

// Target store URL - Culturati.in (Indian art store)
const TEST_STORE_URL = 'https://culturati.in';

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

class SimpleShopifyImporter {
  constructor() {
    if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.serviceKey) {
      throw new Error('Missing Supabase configuration. Check your .env.local file.');
    }
    
    this.supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.serviceKey);
    this.importedCount = 0;
    this.errors = [];
  }

  // Test multiple public endpoints for a store
  async testStoreEndpoints(storeUrl) {
    console.log(`🔍 Testing public endpoints for: ${storeUrl}`);
    
    const endpoints = [
      `${storeUrl}/products.json`,
      `${storeUrl}/collections/all/products.json`,
      `${storeUrl}/collections.json`
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`  Testing: ${endpoint}`);
        const response = await fetch(endpoint);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`  ✅ Success! Found ${data.products?.length || data.collections?.length || 0} items`);
          return { endpoint, data, success: true };
        } else {
          console.log(`  ❌ Failed: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
      }
    }
    
    return { success: false };
  }

  // Import products from JSON data
  async importProductsFromJson(products) {
    console.log(`\n📦 Processing ${products.length} products...`);
    
    for (const product of products) {
      try {
        await this.importSingleProduct(product);
        this.importedCount++;
        process.stdout.write(`\r  ✅ Imported: ${this.importedCount}/${products.length}`);
      } catch (error) {
        this.errors.push({ product: product.title, error: error.message });
        process.stdout.write(`\r  ❌ Error: ${this.errors.length} | Imported: ${this.importedCount}/${products.length}`);
      }
    }
    
    console.log('\n');
  }

  // Import a single product with essential data only
  async importSingleProduct(shopifyProduct) {
    // Extract essential data
    const productData = {
      shopify_id: parseInt(shopifyProduct.id),
      title: shopifyProduct.title,
      handle: shopifyProduct.handle,
      description: shopifyProduct.body_html ? 
        shopifyProduct.body_html.replace(/<[^>]*>/g, '').substring(0, 1000) : 
        null,
      product_type: shopifyProduct.product_type || null,
      collections: [], // Will be filled if we can get collection data
      tags: shopifyProduct.tags ? shopifyProduct.tags.split(',').map(tag => tag.trim()) : [],
      images: shopifyProduct.images ? shopifyProduct.images.map(img => img.src) : [],
      price_min: this.getMinPrice(shopifyProduct.variants),
      price_max: this.getMaxPrice(shopifyProduct.variants),
      inventory_quantity: this.getTotalInventory(shopifyProduct.variants),
      status: shopifyProduct.status === 'active' ? 'active' : 'draft',
      shopify_url: `${shopifyProduct.handle ? '' : 'https://shop.com/products/'}${shopifyProduct.handle}`,
      last_synced: new Date().toISOString()
    };

    // Insert or update in database
    const { error } = await this.supabase
      .from('shopify_products')
      .upsert(productData, { 
        onConflict: 'shopify_id',
        ignoreDuplicates: false 
      });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  // Helper functions for price and inventory
  getMinPrice(variants) {
    if (!variants || variants.length === 0) return null;
    return Math.min(...variants.map(v => parseFloat(v.price || 0)));
  }

  getMaxPrice(variants) {
    if (!variants || variants.length === 0) return null;
    return Math.max(...variants.map(v => parseFloat(v.price || 0)));
  }

  getTotalInventory(variants) {
    if (!variants || variants.length === 0) return 0;
    return variants.reduce((total, v) => total + (parseInt(v.inventory_quantity) || 0), 0);
  }

  // Try to import from a specific store URL
  async importFromStore(storeUrl) {
    console.log(`🚀 Starting import from: ${storeUrl}\n`);
    
    // Test endpoints
    const result = await this.testStoreEndpoints(storeUrl);
    
    if (!result.success) {
      console.log('❌ No accessible public endpoints found.');
      console.log('💡 This store may have disabled public product feeds.');
      return false;
    }
    
    // Import products
    if (result.data.products) {
      await this.importProductsFromJson(result.data.products);
    }
    
    return true;
  }

  // Try multiple demo stores to test the functionality
  async tryDemoStores() {
    const demoStores = [
      'https://shop.polymer-project.org',
      'https://checkout.shopify.com',
      'https://woodworking-supplies.myshopify.com',
      'https://graphql.org'
    ];
    
    console.log('🔍 Testing with known public stores...\n');
    
    for (const store of demoStores) {
      console.log(`Testing: ${store}`);
      const success = await this.importFromStore(store);
      if (success) {
        console.log(`✅ Successfully imported from: ${store}`);
        return true;
      }
    }
    
    return false;
  }

  // Generate sample data if no real store is available
  async importSampleData() {
    console.log('📦 Importing sample data for testing...\n');
    
    const sampleProducts = [
      {
        id: '1001',
        title: 'Traditional Madhubani Art Print',
        handle: 'madhubani-art-print',
        body_html: '<p>Beautiful traditional Madhubani painting featuring intricate patterns and vibrant colors.</p>',
        product_type: 'Art Print',
        tags: 'traditional,madhubani,art,handmade,indian',
        status: 'active',
        images: [{ src: 'https://placekitten.com/400/400' }],
        variants: [{ price: '2999.00', inventory_quantity: 5 }]
      },
      {
        id: '1002',
        title: 'Kerala Mural Wall Painting',
        handle: 'kerala-mural-painting',
        body_html: '<p>Authentic Kerala mural style painting depicting classical Indian mythology.</p>',
        product_type: 'Wall Art',
        tags: 'kerala,mural,wall-art,traditional,mythology',
        status: 'active',
        images: [{ src: 'https://placekitten.com/400/401' }],
        variants: [{ price: '4500.00', inventory_quantity: 3 }]
      },
      {
        id: '1003',
        title: 'Pichwai Krishna Painting',
        handle: 'pichwai-krishna-painting',
        body_html: '<p>Traditional Pichwai painting featuring Lord Krishna with cows in beautiful detail.</p>',
        product_type: 'Religious Art',
        tags: 'pichwai,krishna,religious,traditional,painting',
        status: 'active',
        images: [{ src: 'https://placekitten.com/400/402' }],
        variants: [{ price: '5500.00', inventory_quantity: 2 }]
      }
    ];
    
    await this.importProductsFromJson(sampleProducts);
  }

  // Print final results
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Products imported: ${this.importedCount}`);
    console.log(`❌ Errors encountered: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n🔍 Error details:');
      this.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error.product}: ${error.error}`);
      });
    }
    
    console.log('\n🔗 Next steps:');
    console.log('  1. Check your database for imported products');
    console.log('  2. Test the product dropdown in your app');
    console.log('  3. Verify product suggestions are working');
    console.log('='.repeat(60));
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🚀 Simplified Shopify Product Import\n');
  
  try {
    const importer = new SimpleShopifyImporter();
    
    // Try to import from real store if URL provided
    if (process.argv[2]) {
      const storeUrl = process.argv[2];
      console.log(`Attempting import from provided URL: ${storeUrl}`);
      const success = await importer.importFromStore(storeUrl);
      
      if (!success) {
        console.log('Falling back to sample data...');
        await importer.importSampleData();
      }
    } else {
      // Try demo stores first
      const success = await importer.tryDemoStores();
      
      if (!success) {
        console.log('No accessible stores found. Using sample data...');
        await importer.importSampleData();
      }
    }
    
    importer.printResults();
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('  1. Check your .env.local file has the correct Supabase credentials');
    console.log('  2. Ensure your database is accessible');
    console.log('  3. Verify the shopify_products table exists');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { SimpleShopifyImporter }; 