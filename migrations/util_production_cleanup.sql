-- ============================================================================
-- PRODUCTION DATABASE CLEANUP SCRIPT
-- Purpose: Remove all test/development data before production deployment
-- ============================================================================

-- WARNING: This script will delete ALL existing data
-- Only run this on a fresh production database or when you want to start clean

BEGIN;

-- ============================================================================
-- 1. REMOVE ALL TEST DATA
-- ============================================================================

-- Remove test articles and related data
DELETE FROM article_product_suggestions;
DELETE FROM articles WHERE title LIKE '%test%' OR title LIKE '%demo%' OR title LIKE '%sample%';
DELETE FROM articles; -- Remove all articles for clean start

-- Remove test topics
DELETE FROM topics WHERE topic_title LIKE '%test%' OR topic_title LIKE '%demo%' OR topic_title LIKE '%sample%';
DELETE FROM topics; -- Remove all topics for clean start

-- Remove test SEO keywords (keep only production-ready ones)
DELETE FROM seo_keywords WHERE keyword LIKE '%test%' OR keyword LIKE '%demo%' OR keyword LIKE '%sample%';

-- Remove ALL test Shopify products (we'll import real ones)
DELETE FROM shopify_products;

-- ============================================================================
-- 2. RESET AUTO-INCREMENT SEQUENCES (if any)
-- ============================================================================

-- Reset any sequences to start fresh
-- Note: UUID columns don't need this, but keeping for completeness

-- ============================================================================
-- 3. KEEP ESSENTIAL CONFIGURATION DATA
-- ============================================================================

-- Keep app_config data as it contains system configuration
-- Keep content_templates as they are reusable

-- Keep essential SEO keywords that are production-ready
-- Only remove test-specific ones, keep real industry keywords
DELETE FROM seo_keywords WHERE category = 'test' OR keyword IN (
  'test keyword', 'demo keyword', 'sample keyword'
);

-- ============================================================================
-- 4. VERIFY CLEANUP
-- ============================================================================

-- Check what's left
SELECT 'articles' as table_name, COUNT(*) as remaining_rows FROM articles
UNION ALL
SELECT 'topics' as table_name, COUNT(*) as remaining_rows FROM topics  
UNION ALL
SELECT 'shopify_products' as table_name, COUNT(*) as remaining_rows FROM shopify_products
UNION ALL
SELECT 'article_product_suggestions' as table_name, COUNT(*) as remaining_rows FROM article_product_suggestions
UNION ALL
SELECT 'seo_keywords' as table_name, COUNT(*) as remaining_rows FROM seo_keywords
UNION ALL
SELECT 'content_templates' as table_name, COUNT(*) as remaining_rows FROM content_templates
UNION ALL
SELECT 'app_config' as table_name, COUNT(*) as remaining_rows FROM app_config;

COMMIT;

-- ============================================================================
-- POST-CLEANUP NOTES
-- ============================================================================

-- After running this script:
-- 1. ✅ All test data removed
-- 2. ✅ Schema and indexes preserved  
-- 3. ✅ App configuration preserved
-- 4. ✅ Content templates preserved
-- 5. ✅ Production-ready SEO keywords preserved
-- 6. 🔄 Ready for real Shopify data import
-- 7. 🔄 Ready for real content creation

-- Next steps:
-- 1. Run Shopify data import script
-- 2. Configure environment variables
-- 3. Test with real data
-- 4. Deploy to production 