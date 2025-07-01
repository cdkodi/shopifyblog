const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function getExistingProducts() {
  console.log('📋 Checking existing products in database...');
  const { data, error } = await supabase
    .from('shopify_products')
    .select('shopify_id, title');
  
  if (error) {
    console.error('❌ Error fetching existing products:', error);
    return new Set();
  }
  
  const existingIds = new Set(data.map(p => p.shopify_id.toString()));
  console.log(`✅ Found ${data.length} existing products in database`);
  return existingIds;
}

async function fetchShopifyProducts() {
  console.log('🔄 Fetching all products from Culturati.in...');
  
  try {
    const response = await fetch('https://culturati.in/products.json');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ Found ${data.products.length} products from Culturati.in`);
    return data.products;
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    throw error;
  }
}

function transformProduct(product) {
  // Get the first variant for pricing and inventory
  const firstVariant = product.variants?.[0] || {};
  
  // Process images - convert to array of URLs
  const images = product.images?.map(img => img.src) || [];

  // Get price range
  const prices = product.variants?.map(v => parseFloat(v.price)) || [0];
  const priceMin = Math.min(...prices);
  const priceMax = Math.max(...prices);

  return {
    shopify_id: parseInt(product.id),
    title: product.title,
    handle: product.handle,
    description: product.body_html || product.description || '',
    product_type: product.product_type || '',
    collections: [], // Will be populated if we have collection data
    tags: Array.isArray(product.tags) ? product.tags : 
          typeof product.tags === 'string' ? product.tags.split(',').map(t => t.trim()) : [],
    images: images,
    price_min: priceMin,
    price_max: priceMax,
    inventory_quantity: firstVariant.inventory_quantity || 0,
    status: product.published_at ? 'active' : 'draft',
    shopify_url: `https://culturati.in/products/${product.handle}`
  };
}

async function importProducts() {
  try {
    console.log('🚀 Starting complete product import...\n');
    
    // Get existing products to avoid duplicates
    const existingProductIds = await getExistingProducts();
    
    // Fetch all products from Shopify
    const shopifyProducts = await fetchShopifyProducts();
    
    // Filter out existing products
    const newProducts = shopifyProducts.filter(product => 
      !existingProductIds.has(product.id.toString())
    );
    
    console.log(`📊 Import Summary:`);
    console.log(`   Total products available: ${shopifyProducts.length}`);
    console.log(`   Already in database: ${existingProductIds.size}`);
    console.log(`   New products to import: ${newProducts.length}\n`);
    
    if (newProducts.length === 0) {
      console.log('✅ All products are already imported. No action needed.');
      return;
    }
    
    // Transform and import new products
    const transformedProducts = newProducts.map(transformProduct);
    
    console.log('📝 Importing new products...');
    
    // Import in batches to avoid overwhelming the database
    const batchSize = 5;
    let imported = 0;
    let failed = 0;
    
    for (let i = 0; i < transformedProducts.length; i += batchSize) {
      const batch = transformedProducts.slice(i, i + batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(transformedProducts.length/batchSize)}...`);
      
      for (const product of batch) {
        try {
          const { data, error } = await supabase
            .from('shopify_products')
            .insert(product)
            .select();
          
          if (error) {
            console.error(`❌ Failed to import "${product.title}":`, error.message);
            failed++;
          } else {
            console.log(`✅ Imported: ${product.title} (₹${product.price})`);
            imported++;
          }
        } catch (err) {
          console.error(`❌ Error importing "${product.title}":`, err.message);
          failed++;
        }
        
        // Small delay to be gentle on the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('\n🎉 Import Complete!');
    console.log(`✅ Successfully imported: ${imported} products`);
    console.log(`❌ Failed imports: ${failed} products`);
    console.log(`📊 Total products in database: ${existingProductIds.size + imported}`);
    
    // Verify final count
    const { data: finalCount } = await supabase
      .from('shopify_products')
      .select('id', { count: 'exact', head: true });
    
    if (finalCount) {
      console.log(`🔍 Database verification: ${finalCount.length || 'Unknown'} total products`);
    }
    
  } catch (error) {
    console.error('💥 Import failed:', error);
    process.exit(1);
  }
}

// Run the import
importProducts(); 