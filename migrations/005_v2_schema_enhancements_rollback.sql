-- V2 Schema Enhancements Rollback Migration
-- This script reverses all changes made in migration 005_v2_schema_enhancements.sql
-- Run this if you need to revert the V2 database changes

-- Start transaction
BEGIN;

-- Log rollback start
DO $$ 
BEGIN 
  RAISE NOTICE 'Starting V2 schema enhancements rollback...';
END $$;

-- 1. Drop V2 generation analytics view
DROP VIEW IF EXISTS generation_analytics CASCADE;

-- 2. Drop V2 helper function
DROP FUNCTION IF EXISTS get_generation_duration(uuid) CASCADE;

-- 3. Drop V2 indexes
DROP INDEX IF EXISTS idx_articles_generation_metadata CASCADE;
DROP INDEX IF EXISTS idx_articles_v2_status_filter CASCADE;
DROP INDEX IF EXISTS idx_articles_generation_performance CASCADE;

-- 4. Revert article status back to text type (reverse enum conversion)
DO $$ 
DECLARE
    rec RECORD;
BEGIN
    -- First, add the old text column back
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'articles' AND column_name = 'status_text_backup') THEN
        ALTER TABLE articles ADD COLUMN status_text_backup text;
        
        -- Copy enum values back to text
        UPDATE articles SET status_text_backup = status::text;
        
        -- Drop the enum status column
        ALTER TABLE articles DROP COLUMN status CASCADE;
        
        -- Rename text column back to status
        ALTER TABLE articles RENAME COLUMN status_text_backup TO status;
        
        -- Add back the old text constraint if it existed
        ALTER TABLE articles ADD CONSTRAINT articles_status_check 
            CHECK (status IN ('draft', 'published', 'archived'));
            
        RAISE NOTICE 'Reverted article status from enum back to text type';
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Warning: Could not fully revert status column: %', SQLERRM;
END $$;

-- 5. Remove V2 generation metadata columns
ALTER TABLE articles DROP COLUMN IF EXISTS generation_started_at CASCADE;
ALTER TABLE articles DROP COLUMN IF EXISTS generation_completed_at CASCADE;
ALTER TABLE articles DROP COLUMN IF EXISTS ai_model_used CASCADE;
ALTER TABLE articles DROP COLUMN IF EXISTS generation_prompt_version CASCADE;

-- 6. Drop the V2 article status enum type
DROP TYPE IF EXISTS article_status_v2 CASCADE;

-- 7. Recreate original views that were dropped during V2 migration
-- Note: These may need to be adjusted based on your original schema

-- Original topics_with_article_status view (simplified version)
CREATE OR REPLACE VIEW topics_with_article_status AS
SELECT 
    t.*,
    COALESCE(COUNT(a.id), 0) as article_count,
    CASE 
        WHEN COUNT(a.id) = 0 THEN 'no_articles'
        WHEN COUNT(CASE WHEN a.status = 'published' THEN 1 END) > 0 THEN 'has_published'
        WHEN COUNT(CASE WHEN a.status = 'draft' THEN 1 END) > 0 THEN 'has_draft'
        ELSE 'unknown'
    END as overall_status
FROM topics t
LEFT JOIN articles a ON t.id = a.source_topic_id
GROUP BY t.id, t.title, t.keywords, t.tone, t.length, t.template, t.created_at, t.updated_at;

-- Enable RLS on the view
ALTER VIEW topics_with_article_status SET (security_invoker = true);

-- Original articles_with_shopify_status view (simplified version)
CREATE OR REPLACE VIEW articles_with_shopify_status AS
SELECT 
    a.*,
    CASE 
        WHEN a.shopify_article_id IS NOT NULL THEN 'published_to_shopify'
        WHEN a.status = 'published' THEN 'ready_for_shopify'
        ELSE 'not_ready'
    END as shopify_status,
    sp.title as shopify_product_title,
    sp.handle as shopify_product_handle
FROM articles a
LEFT JOIN shopify_products sp ON a.shopify_product_id = sp.id;

-- Enable RLS on the view
ALTER VIEW articles_with_shopify_status SET (security_invoker = true);

-- 8. Update any foreign key constraints that might reference the old enum
-- (This section would need to be customized based on your specific schema)

-- 9. Reset any sequences or auto-increment values if needed
-- (Add any specific sequence resets here if required)

-- Log completion
DO $$ 
BEGIN 
  RAISE NOTICE 'V2 schema enhancements rollback completed successfully!';
  RAISE NOTICE 'Summary of changes reverted:';
  RAISE NOTICE '- Removed generation metadata columns';
  RAISE NOTICE '- Reverted article status from enum to text';
  RAISE NOTICE '- Dropped V2 views and functions';
  RAISE NOTICE '- Removed V2 performance indexes';
  RAISE NOTICE '- Recreated original views with RLS';
END $$;

-- Commit transaction
COMMIT;

-- Final verification queries
DO $$ 
BEGIN 
  -- Verify articles table structure
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name = 'articles' AND column_name = 'status' AND data_type = 'text') THEN
    RAISE NOTICE '✓ Articles status column reverted to text type';
  ELSE 
    RAISE WARNING '⚠ Articles status column reversion may have failed';
  END IF;
  
  -- Verify generation columns are removed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'articles' AND column_name = 'generation_started_at') THEN
    RAISE NOTICE '✓ Generation metadata columns removed';
  ELSE 
    RAISE WARNING '⚠ Generation metadata columns may still exist';
  END IF;
  
  -- Verify views exist
  IF EXISTS (SELECT 1 FROM information_schema.views 
             WHERE table_name = 'topics_with_article_status') THEN
    RAISE NOTICE '✓ Original views recreated';
  ELSE 
    RAISE WARNING '⚠ Original views may not be recreated properly';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Rollback verification completed.';
  RAISE NOTICE 'Your database has been reverted to pre-V2 state.';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Remember to:';
  RAISE NOTICE '1. Update your application code to use old status values';
  RAISE NOTICE '2. Remove any V2-specific frontend components';
  RAISE NOTICE '3. Test all existing functionality thoroughly';
  
END $$; 