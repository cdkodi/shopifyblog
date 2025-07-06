-- Migration: Update Existing Topics with Content Templates
-- Description: Map existing style_preferences.template_type to new content_template field

-- Update topics that have style_preferences with template_type
UPDATE topics 
SET content_template = CASE 
  WHEN style_preferences->>'template_type' = 'Blog Post' THEN 'How-To Guide'
  WHEN style_preferences->>'template_type' = 'Case Study' THEN 'Case Study' 
  WHEN style_preferences->>'template_type' = 'How-To Guide' THEN 'How-To Guide'
  WHEN style_preferences->>'template_type' = 'Product Showcase' THEN 'Product Showcase'
  WHEN style_preferences->>'template_type' = 'Industry News' THEN 'Industry News'
  WHEN style_preferences->>'template_type' = 'Tutorial' THEN 'Tutorial'
  WHEN style_preferences->>'template_type' = 'Review' THEN 'Review'
  WHEN style_preferences->>'template_type' = 'Comparison' THEN 'Comparison'
  WHEN style_preferences->>'template_type' = 'List Article' THEN 'List Article'
  WHEN style_preferences->>'template_type' = 'Interview' THEN 'Interview'
  WHEN style_preferences->>'template_type' = 'Opinion Piece' THEN 'Opinion Piece'
  ELSE 'How-To Guide' -- Default fallback for unknown types
END
WHERE content_template IS NULL 
  AND style_preferences IS NOT NULL 
  AND style_preferences->>'template_type' IS NOT NULL;

-- For topics without style_preferences or template_type, set a default
UPDATE topics 
SET content_template = 'How-To Guide'
WHERE content_template IS NULL;

-- Add a comment to track the migration
COMMENT ON COLUMN topics.content_template IS 'Content template name (migrated from style_preferences.template_type on 2024-01-XX)';

-- Display summary of migration results
SELECT 
  content_template,
  COUNT(*) as topic_count
FROM topics 
GROUP BY content_template 
ORDER BY topic_count DESC; 