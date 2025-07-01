const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Try to get service role key for admin operations
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

async function fixRLSPolicies() {
  if (!serviceRoleKey) {
    console.log('⚠️  Service role key not found. Please run this SQL in Supabase Dashboard:');
    console.log('\n-- Update RLS policies for shopify_products');
    console.log('DROP POLICY IF EXISTS "Enable read for authenticated users" ON shopify_products;');
    console.log('DROP POLICY IF EXISTS "Enable public read access" ON shopify_products;');
    console.log('DROP POLICY IF EXISTS "Enable public write access" ON shopify_products;');
    console.log('\nCREATE POLICY "Enable public read access" ON shopify_products');
    console.log('    FOR SELECT TO public USING (true);');
    console.log('\nCREATE POLICY "Enable public write access" ON shopify_products');
    console.log('    FOR ALL TO public USING (true);');
    console.log('\nThen run this script again.\n');
    return false;
  }

  console.log('🔧 Fixing RLS policies with service role key...');
  
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  try {
    // Drop existing policies
    const dropPolicies = `
      DROP POLICY IF EXISTS "Enable read for authenticated users" ON shopify_products;
      DROP POLICY IF EXISTS "Enable public read access" ON shopify_products;
      DROP POLICY IF EXISTS "Enable public write access" ON shopify_products;
    `;
    
    await adminSupabase.rpc('exec_sql', { sql: dropPolicies });
    
    // Create new public policies
    const createPolicies = `
      CREATE POLICY "Enable public read access" ON shopify_products
          FOR SELECT TO public USING (true);
      
      CREATE POLICY "Enable public write access" ON shopify_products
          FOR ALL TO public USING (true);
    `;
    
    await adminSupabase.rpc('exec_sql', { sql: createPolicies });
    
    console.log('✅ RLS policies updated successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to update RLS policies:', error);
    return false;
  }
}

async function importAllProducts() {
  console.log('🚀 Starting complete product import...\n');
  
  const supabase = createClient(supabaseUrl, anonKey);
  
  // Get existing products
  console.log('📋 Checking existing products in database...');
  const { data: existingProducts, error: fetchError } = await supabase
    .from('shopify_products')
    .select('shopify_id, title');
  
  if (fetchError) {
    console.error('❌ Error fetching existing products:', fetchError);
    return;
  }
  
  const existingIds = new Set(existingProducts.map(p => p.shopify_id.toString()));
  console.log(`✅ Found ${existingProducts.length} existing products in database`);
  
  // Fetch all products from Culturati.in
  console.log('🔄 Fetching all products from Culturati.in...');
  const response = await fetch('https://culturati.in/products.json');
  const data = await response.json();
  const shopifyProducts = data.products;
  
  console.log(`✅ Found ${shopifyProducts.length} products from Culturati.in`);
  
  // Filter out existing products
  const newProducts = shopifyProducts.filter(product => 
    !existingIds.has(product.id.toString())
  );
  
  console.log(`📊 Import Summary:`);
  console.log(`   Total products available: ${shopifyProducts.length}`);
  console.log(`   Already in database: ${existingIds.size}`);
  console.log(`   New products to import: ${newProducts.length}\n`);
  
  if (newProducts.length === 0) {
    console.log('✅ All products are already imported. No action needed.');
    return;
  }
  
  // Transform and import products
  console.log('📝 Importing new products...');
  
  let imported = 0;
  let failed = 0;
  
  for (const product of newProducts) {
    try {
      // Transform product data
      const firstVariant = product.variants?.[0] || {};
      const images = product.images?.map(img => img.src) || [];
      const prices = product.variants?.map(v => parseFloat(v.price)) || [0];
      
      const transformedProduct = {
        shopify_id: parseInt(product.id),
        title: product.title,
        handle: product.handle,
        description: product.body_html || product.description || '',
        product_type: product.product_type || '',
        collections: [],
        tags: Array.isArray(product.tags) ? product.tags : 
              typeof product.tags === 'string' ? product.tags.split(',').map(t => t.trim()) : [],
        images: images,
        price_min: Math.min(...prices),
        price_max: Math.max(...prices),
        inventory_quantity: firstVariant.inventory_quantity || 0,
        status: product.published_at ? 'active' : 'draft',
        shopify_url: `https://culturati.in/products/${product.handle}`
      };
      
      const { error } = await supabase
        .from('shopify_products')
        .insert(transformedProduct);
      
      if (error) {
        console.error(`❌ Failed to import "${product.title}":`, error.message);
        failed++;
      } else {
        console.log(`✅ Imported: ${product.title} (₹${transformedProduct.price_min})`);
        imported++;
      }
      
      // Small delay to be gentle on the database
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (err) {
      console.error(`❌ Error importing "${product.title}":`, err.message);
      failed++;
    }
  }
  
  console.log('\n🎉 Import Complete!');
  console.log(`✅ Successfully imported: ${imported} products`);
  console.log(`❌ Failed imports: ${failed} products`);
  console.log(`📊 Total products now in database: ${existingIds.size + imported}`);
}

async function main() {
  // First try to fix RLS policies
  const rlsFixed = await fixRLSPolicies();
  
  if (!rlsFixed && !serviceRoleKey) {
    console.log('❌ Cannot proceed without fixing RLS policies first.');
    return;
  }
  
  // Import products
  await importAllProducts();
}

main().catch(console.error); 