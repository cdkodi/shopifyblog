const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env.local' });

// This script requires the service role key for security operations
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

async function enforceSecureRLS() {
  console.log('🔒 Enforcing Secure RLS Policies for Production...\n');
  
  if (!serviceRoleKey) {
    console.log('⚠️  Service role key required. Please add SUPABASE_SERVICE_ROLE_KEY to .env.local');
    console.log('\nAlternatively, run this SQL in Supabase Dashboard:\n');
    
    const sqlCommands = `
-- ============================================================================
-- SECURE RLS POLICIES FOR PRODUCTION
-- ============================================================================

-- Drop any overly permissive policies
DROP POLICY IF EXISTS "Enable public write access" ON shopify_products;
DROP POLICY IF EXISTS "Enable public write access" ON article_product_suggestions;

-- Shopify Products: Read-only for public, write for authenticated
CREATE POLICY "Enable public read access" ON shopify_products
    FOR SELECT TO public USING (true);

CREATE POLICY "Enable authenticated write access" ON shopify_products
    FOR ALL TO authenticated USING (true);

-- Article Product Suggestions: Read for public, write for authenticated
CREATE POLICY "Enable public read access" ON article_product_suggestions
    FOR SELECT TO public USING (true);

CREATE POLICY "Enable authenticated write access" ON article_product_suggestions
    FOR ALL TO authenticated USING (true);

-- SEO Keywords: Read for public, write for authenticated
CREATE POLICY "Enable public read access" ON seo_keywords
    FOR SELECT TO public USING (true);

CREATE POLICY "Enable authenticated write access" ON seo_keywords
    FOR ALL TO authenticated USING (true);

-- Articles: Secure access based on authentication
CREATE POLICY "Enable public read for published articles" ON articles
    FOR SELECT TO public USING (status = 'published');

CREATE POLICY "Enable authenticated full access" ON articles
    FOR ALL TO authenticated USING (true);

-- Topics: Read for public, write for authenticated
CREATE POLICY "Enable public read access" ON topics
    FOR SELECT TO public USING (true);

CREATE POLICY "Enable authenticated write access" ON topics
    FOR ALL TO authenticated USING (true);

-- Content Templates: Read for public, write for authenticated
CREATE POLICY "Enable public read access" ON content_templates
    FOR SELECT TO public USING (true);

CREATE POLICY "Enable authenticated write access" ON content_templates
    FOR ALL TO authenticated USING (true);
`;
    
    console.log(sqlCommands);
    console.log('\n🔐 These policies provide secure access for production:');
    console.log('   ✅ Public users can read data');
    console.log('   ✅ Only authenticated users can write/modify');
    console.log('   ✅ Articles are publicly readable only when published');
    return false;
  }

  console.log('🔧 Applying secure RLS policies with service role key...');
  
  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  try {
    // Drop overly permissive policies
    console.log('🗑️  Removing overly permissive policies...');
    
    const dropPolicies = `
      -- Drop public write policies that are too permissive
      DROP POLICY IF EXISTS "Enable public write access" ON shopify_products;
      DROP POLICY IF EXISTS "Enable public write access" ON article_product_suggestions;
      DROP POLICY IF EXISTS "Enable public write access" ON seo_keywords;
      DROP POLICY IF EXISTS "Enable public write access" ON articles;
      DROP POLICY IF EXISTS "Enable public write access" ON topics;
      DROP POLICY IF EXISTS "Enable public write access" ON content_templates;
    `;
    
    await adminSupabase.rpc('exec_sql', { sql: dropPolicies });
    
    // Create secure policies
    console.log('🔐 Creating secure RLS policies...');
    
    const securePolicies = `
      -- Shopify Products: Read-only for public, write for authenticated
      CREATE POLICY "Enable public read access" ON shopify_products
          FOR SELECT TO public USING (true);
      
      CREATE POLICY "Enable authenticated write access" ON shopify_products
          FOR ALL TO authenticated USING (true);
      
      -- Article Product Suggestions: Read for public, write for authenticated
      CREATE POLICY "Enable public read access" ON article_product_suggestions
          FOR SELECT TO public USING (true);
      
      CREATE POLICY "Enable authenticated write access" ON article_product_suggestions
          FOR ALL TO authenticated USING (true);
      
      -- SEO Keywords: Read for public, write for authenticated
      CREATE POLICY "Enable public read access" ON seo_keywords
          FOR SELECT TO public USING (true);
      
      CREATE POLICY "Enable authenticated write access" ON seo_keywords
          FOR ALL TO authenticated USING (true);
      
      -- Articles: Secure access based on authentication and status
      CREATE POLICY "Enable public read for published articles" ON articles
          FOR SELECT TO public USING (status = 'published');
      
      CREATE POLICY "Enable authenticated full access" ON articles
          FOR ALL TO authenticated USING (true);
      
      -- Topics: Read for public, write for authenticated
      CREATE POLICY "Enable public read access" ON topics
          FOR SELECT TO public USING (true);
      
      CREATE POLICY "Enable authenticated write access" ON topics
          FOR ALL TO authenticated USING (true);
      
      -- Content Templates: Read for public, write for authenticated
      CREATE POLICY "Enable public read access" ON content_templates
          FOR SELECT TO public USING (true);
      
      CREATE POLICY "Enable authenticated write access" ON content_templates
          FOR ALL TO authenticated USING (true);
    `;
    
    await adminSupabase.rpc('exec_sql', { sql: securePolicies });
    
    console.log('✅ Secure RLS policies applied successfully\n');
    
    // Verify the policies
    console.log('🔍 Verifying security policies...');
    
    const tables = [
      'shopify_products', 
      'article_product_suggestions', 
      'seo_keywords', 
      'articles', 
      'topics', 
      'content_templates'
    ];
    
    for (const table of tables) {
      const { data: policies } = await adminSupabase
        .from('pg_policies')
        .select('policyname, roles, cmd, qual')
        .eq('tablename', table);
      
      console.log(`   📋 ${table}: ${policies?.length || 0} policies configured`);
    }
    
    console.log('\n🎉 Security Enforcement Complete!');
    console.log('🔐 Your database now has production-ready RLS policies:');
    console.log('   ✅ Public read access for necessary data');
    console.log('   ✅ Authenticated write access only');
    console.log('   ✅ Published articles visible to public');
    console.log('   ✅ Draft articles protected');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to enforce secure RLS policies:', error);
    return false;
  }
}

// Only run if called directly
if (require.main === module) {
  enforceSecureRLS().catch(console.error);
}

module.exports = { enforceSecureRLS }; 