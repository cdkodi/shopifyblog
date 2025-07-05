-- Migration: Add Shopify Integration Fields
-- Description: Add fields to track Shopify article and blog IDs for synchronization

-- Add Shopify integration columns to articles table
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS shopify_article_id BIGINT,
ADD COLUMN IF NOT EXISTS shopify_blog_id BIGINT;

-- Add indexes for better performance when querying by Shopify IDs
CREATE INDEX IF NOT EXISTS idx_articles_shopify_article_id ON articles(shopify_article_id);
CREATE INDEX IF NOT EXISTS idx_articles_shopify_blog_id ON articles(shopify_blog_id);

-- Add comments for documentation
COMMENT ON COLUMN articles.shopify_article_id IS 'Shopify article ID for published articles';
COMMENT ON COLUMN articles.shopify_blog_id IS 'Shopify blog ID where the article is published';

-- Create a view for articles with Shopify sync status
CREATE OR REPLACE VIEW articles_with_shopify_status AS
SELECT 
  a.*,
  CASE 
    WHEN a.shopify_article_id IS NOT NULL THEN 'published'
    ELSE 'not_published'
  END as shopify_status,
  CASE 
    WHEN a.shopify_article_id IS NOT NULL THEN true
    ELSE false
  END as is_synced_to_shopify
FROM articles a;

-- Grant permissions
GRANT SELECT ON articles_with_shopify_status TO authenticated;
GRANT SELECT ON articles_with_shopify_status TO anon; 