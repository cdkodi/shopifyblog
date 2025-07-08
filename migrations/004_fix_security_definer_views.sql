-- Migration: Fix Security Definer Views - Critical Security Issue
-- Date: 2025-01-27
-- Description: Resolves Supabase security warning about SECURITY DEFINER views
--              These views were bypassing Row Level Security (RLS) policies

-- SECURITY ISSUE RESOLVED:
-- Views with SECURITY DEFINER run with postgres user permissions instead of 
-- the querying user's permissions, potentially bypassing RLS policies and 
-- allowing unauthorized data access.

-- Drop existing problematic views
DROP VIEW IF EXISTS public.topics_with_article_status;
DROP VIEW IF EXISTS public.articles_with_shopify_status;

-- Recreate topics_with_article_status view without SECURITY DEFINER
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
            WHEN (a.status = 'published'::text) THEN 1
            ELSE NULL::integer
        END) AS published_article_count,
        CASE
            WHEN (count(
            CASE
                WHEN (a.status = 'published'::text) THEN 1
                ELSE NULL::integer
            END) > 0) THEN true
            ELSE false
        END AS has_published_articles,
    max(a.published_at) AS last_published_at,
        CASE
            WHEN (count(
            CASE
                WHEN (a.status = 'published'::text) THEN 1
                ELSE NULL::integer
            END) > 0) THEN 'published'::text
            WHEN (count(a.id) > 0) THEN 'generated'::text
            ELSE t.status
        END AS topic_status
FROM (topics t
     LEFT JOIN articles a ON ((a.source_topic_id = t.id)))
GROUP BY t.id, t.topic_title, t.keywords, t.content_template, t.style_preferences, t.competition_score, t.created_at, t.industry, t.market_segment, t.priority_score, t.search_volume, t.status, t.used_at;

-- Recreate articles_with_shopify_status view without SECURITY DEFINER
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

-- Grant appropriate permissions to authenticated users
GRANT SELECT ON public.topics_with_article_status TO authenticated;
GRANT SELECT ON public.articles_with_shopify_status TO authenticated;

-- Explicitly set security_invoker to ensure RLS is properly enforced
ALTER VIEW public.topics_with_article_status SET (security_invoker = true);
ALTER VIEW public.articles_with_shopify_status SET (security_invoker = true);

-- SECURITY VERIFICATION:
-- After this migration, both views will:
-- 1. Run with the querying user's permissions (not postgres)
-- 2. Properly enforce Row Level Security policies
-- 3. Respect user authentication and authorization
-- 4. No longer trigger Supabase security warnings 