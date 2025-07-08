-- V2 Database Schema Enhancements Migration
-- Date: 2025-01-27
-- Implements: Task 1.1 (Article Status Enhancements) & Task 1.2 (Article Metadata Columns)
-- Description: Adds new article statuses and generation tracking metadata for V2 workflow

-- COMPLETED TASKS:
-- ✅ Task 1.1.1: Add new article status types to enum
-- ✅ Task 1.1.2: Create migration for status additions  
-- ✅ Task 1.1.3: Update TypeScript types for new statuses
-- ✅ Task 1.1.4: Test status transitions in development
-- ✅ Task 1.2.1: Add generation_started_at timestamp column
-- ✅ Task 1.2.2: Add generation_completed_at timestamp column
-- ✅ Task 1.2.3: Add ai_model_used varchar column
-- ✅ Task 1.2.4: Add generation_prompt_version varchar column
-- ✅ Task 1.2.5: Create migration script for new columns
-- ✅ Task 1.2.6: Update database types interface

-- Step 1: Create new article_status enum with all V2 statuses
CREATE TYPE article_status_v2 AS ENUM (
    'draft',
    'generating', 
    'generation_failed',
    'ready_for_editorial',
    'published',
    'published_hidden',
    'published_visible'
);

-- Step 2: Add new metadata columns for generation tracking
ALTER TABLE articles 
ADD COLUMN generation_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN generation_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN ai_model_used VARCHAR(100),
ADD COLUMN generation_prompt_version VARCHAR(50);

-- Step 3: Add new status column with proper enum type
ALTER TABLE articles 
ADD COLUMN status_v2 article_status_v2 DEFAULT 'draft';

-- Step 4: Migrate existing status data
UPDATE articles 
SET status_v2 = CASE 
    WHEN status = 'published' THEN 'published'::article_status_v2
    WHEN status = 'draft' THEN 'draft'::article_status_v2
    ELSE 'draft'::article_status_v2
END;

-- Step 5: Handle view dependencies and recreate without SECURITY DEFINER
DROP VIEW IF EXISTS topics_with_article_status;
DROP VIEW IF EXISTS articles_with_shopify_status;

-- Step 6: Drop old status column and rename new one
ALTER TABLE articles DROP COLUMN status;
ALTER TABLE articles RENAME COLUMN status_v2 TO status;

-- Step 7: Add NOT NULL constraint to status
ALTER TABLE articles ALTER COLUMN status SET NOT NULL;

-- Step 8: Recreate views with updated status column and proper security
CREATE VIEW public.topics_with_article_status AS
SELECT 
    t.id,
    t.topic_title,
    t.keywords,
    t.search_volume,
    t.competition_score,
    t.priority_score,
    t.status,
    t.created_at,
    t.used_at,
    t.industry,
    t.market_segment,
    t.style_preferences,
    t.content_template,
    count(a.id) AS article_count,
    count(
        CASE
            WHEN (a.status::text = 'published') THEN 1
            ELSE NULL::integer
        END) AS published_article_count,
        CASE
            WHEN (count(
            CASE
                WHEN (a.status::text = 'published') THEN 1
                ELSE NULL::integer
            END) > 0) THEN true
            ELSE false
        END AS has_published_articles,
    max(a.published_at) AS last_published_at,
        CASE
            WHEN (count(
            CASE
                WHEN (a.status::text = 'published') THEN 1
                ELSE NULL::integer
            END) > 0) THEN 'published'::text
            WHEN (count(a.id) > 0) THEN 'generated'::text
            ELSE t.status
        END AS topic_status
FROM (topics t
     LEFT JOIN articles a ON ((a.source_topic_id = t.id)))
GROUP BY t.id, t.topic_title, t.keywords, t.content_template, t.style_preferences, t.competition_score, t.created_at, t.industry, t.market_segment, t.priority_score, t.search_volume, t.status, t.used_at;

CREATE VIEW public.articles_with_shopify_status AS
SELECT 
    id,
    title,
    content,
    meta_description,
    slug,
    status,
    target_keywords,
    shopify_blog_id,
    shopify_article_id,
    scheduled_publish_date,
    created_at,
    updated_at,
    published_at,
    seo_score,
    word_count,
    reading_time,
    CASE
        WHEN (shopify_article_id IS NOT NULL) THEN 'published'::text
        ELSE 'not_published'::text
    END AS shopify_status,
    CASE
        WHEN (shopify_article_id IS NOT NULL) THEN true
        ELSE false
    END AS is_synced_to_shopify
FROM articles a;

-- Step 9: Add performance indexes
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_generation_started ON articles(generation_started_at) WHERE generation_started_at IS NOT NULL;
CREATE INDEX idx_articles_ai_model ON articles(ai_model_used) WHERE ai_model_used IS NOT NULL;

-- Step 10: Add data integrity constraints
ALTER TABLE articles 
ADD CONSTRAINT chk_generation_times 
CHECK (generation_completed_at IS NULL OR generation_started_at IS NULL OR generation_completed_at >= generation_started_at);

-- Step 11: Add documentation comments
COMMENT ON COLUMN articles.generation_started_at IS 'Timestamp when AI content generation began';
COMMENT ON COLUMN articles.generation_completed_at IS 'Timestamp when AI content generation completed';
COMMENT ON COLUMN articles.ai_model_used IS 'Name/version of AI model used for generation (e.g., gpt-4, claude-3)';
COMMENT ON COLUMN articles.generation_prompt_version IS 'Version of the prompt template used for generation';
COMMENT ON TYPE article_status_v2 IS 'Enhanced article status enum for V2 workflow including generation states';

-- Step 12: Grant permissions and set security
GRANT SELECT ON public.topics_with_article_status TO authenticated;
GRANT SELECT ON public.articles_with_shopify_status TO authenticated;
ALTER VIEW public.topics_with_article_status SET (security_invoker = true);
ALTER VIEW public.articles_with_shopify_status SET (security_invoker = true);

-- Step 13: Create helper function for generation duration
CREATE OR REPLACE FUNCTION get_generation_duration(article_id UUID)
RETURNS INTERVAL AS $$
BEGIN
    RETURN (
        SELECT generation_completed_at - generation_started_at
        FROM articles 
        WHERE id = article_id 
        AND generation_started_at IS NOT NULL 
        AND generation_completed_at IS NOT NULL
    );
END;
$$ LANGUAGE plpgsql;

-- Fix function security
ALTER FUNCTION get_generation_duration(UUID) SET search_path = public;

-- Step 14: Create analytics view for generation metrics
CREATE VIEW generation_analytics AS
SELECT 
    ai_model_used,
    generation_prompt_version,
    COUNT(*) as total_generations,
    COUNT(CASE WHEN status = 'generation_failed' THEN 1 END) as failed_generations,
    COUNT(CASE WHEN status IN ('ready_for_editorial', 'published', 'published_hidden', 'published_visible') THEN 1 END) as successful_generations,
    AVG(EXTRACT(EPOCH FROM (generation_completed_at - generation_started_at))) as avg_generation_time_seconds,
    MIN(generation_started_at) as first_generation,
    MAX(generation_completed_at) as last_generation
FROM articles 
WHERE generation_started_at IS NOT NULL
GROUP BY ai_model_used, generation_prompt_version;

-- Grant permissions and fix security
GRANT SELECT ON generation_analytics TO authenticated;
ALTER VIEW generation_analytics SET (security_invoker = true);

-- VERIFICATION QUERIES:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'article_status_v2');
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'articles' AND column_name LIKE '%generation%';
-- SELECT * FROM generation_analytics;

-- V2 STATUS VALUES AVAILABLE:
-- 'draft' - Initial state for new articles
-- 'generating' - AI is currently generating content 
-- 'generation_failed' - AI generation encountered an error
-- 'ready_for_editorial' - Generated content awaiting editorial review
-- 'published' - Article is published on Shopify and visible
-- 'published_hidden' - Article is published on Shopify but hidden from customers
-- 'published_visible' - Article is published on Shopify and visible to customers

-- GENERATION METADATA COLUMNS:
-- generation_started_at - When AI generation began
-- generation_completed_at - When AI generation finished
-- ai_model_used - Which AI model was used (e.g., 'gpt-4', 'claude-3')
-- generation_prompt_version - Version of prompt template used

-- NEW VIEWS:
-- generation_analytics - Analytics for tracking AI generation performance
-- Updated topics_with_article_status - Now uses new status enum
-- Updated articles_with_shopify_status - Now uses new status enum 