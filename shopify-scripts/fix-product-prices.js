const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixProductPrices() {
  console.log('🔧 Fixing product prices...\n');
  
  // Get all products from database
  const { data: dbProducts, error: dbError } = await supabase
    .from('shopify_products')
    .select('id, shopify_id, title, price_min, price_max');
  
  if (dbError) {
    console.error('❌ Error fetching database products:', dbError);
    return;
  }
  
  // Get all products from Culturati.in
  const response = await fetch('https://culturati.in/products.json');
  const shopifyData = await response.json();
  const shopifyProducts = shopifyData.products;
  
  console.log(`📊 Found ${dbProducts.length} products in database`);
  console.log(`📊 Found ${shopifyProducts.length} products from Culturati.in\n`);
  
  let updated = 0;
  let failed = 0;
  
  for (const dbProduct of dbProducts) {
    // Find matching Shopify product
    const shopifyProduct = shopifyProducts.find(p => 
      parseInt(p.id) === dbProduct.shopify_id
    );
    
    if (!shopifyProduct) {
      console.log(`⚠️  No Shopify data found for: ${dbProduct.title}`);
      continue;
    }
    
    // Calculate correct prices
    const prices = shopifyProduct.variants?.map(v => parseFloat(v.price)) || [0];
    const priceMin = Math.min(...prices);
    const priceMax = Math.max(...prices);
    
    // Check if update is needed
    if (isNaN(dbProduct.price_min) || isNaN(dbProduct.price_max) || 
        dbProduct.price_min !== priceMin || dbProduct.price_max !== priceMax) {
      
      // Update the product
      const { error: updateError } = await supabase
        .from('shopify_products')
        .update({
          price_min: priceMin,
          price_max: priceMax
        })
        .eq('id', dbProduct.id);
      
      if (updateError) {
        console.error(`❌ Failed to update "${dbProduct.title}":`, updateError.message);
        failed++;
      } else {
        console.log(`✅ Updated: ${dbProduct.title} (₹${priceMin}${priceMax !== priceMin ? ` - ₹${priceMax}` : ''})`);
        updated++;
      }
    } else {
      console.log(`✓ Already correct: ${dbProduct.title} (₹${priceMin})`);
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n🎉 Price Fix Complete!');
  console.log(`✅ Updated: ${updated} products`);
  console.log(`❌ Failed: ${failed} products`);
  console.log(`✓ Already correct: ${dbProducts.length - updated - failed} products`);
}

fixProductPrices().catch(console.error); 