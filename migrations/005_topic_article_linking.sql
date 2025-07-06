-- Migration: Topic-Article Linking and Template Streamlining
-- Description: Add source_topic_id to articles table and update topics for direct template selection

-- Add source topic relationship to articles table
ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS source_topic_id UUID REFERENCES topics(id);

-- Add index for better performance when querying by source topic
CREATE INDEX IF NOT EXISTS idx_articles_source_topic_id ON articles(source_topic_id);

-- Add comment for documentation
COMMENT ON COLUMN articles.source_topic_id IS 'Reference to the topic that was used to generate this article';

-- Update topics table to store actual template names instead of generic ones
-- Add a new column for the selected content template
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS content_template VARCHAR(100);

-- Add index for template-based queries
CREATE INDEX IF NOT EXISTS idx_topics_content_template ON topics(content_template);

-- Add comment for documentation
COMMENT ON COLUMN topics.content_template IS 'The actual content template selected for this topic (e.g., How-To Guide, Product Showcase)';

-- Create a view for topics with article counts and publishing status
CREATE OR REPLACE VIEW topics_with_article_status AS
SELECT 
  t.*,
  COUNT(a.id) as article_count,
  COUNT(CASE WHEN a.shopify_article_id IS NOT NULL THEN 1 END) as published_article_count,
  MAX(a.published_at) as last_published_at,
  CASE 
    WHEN COUNT(CASE WHEN a.shopify_article_id IS NOT NULL THEN 1 END) > 0 THEN 'published'
    WHEN COUNT(a.id) > 0 THEN 'generated'
    ELSE 'available'
  END as topic_status,
  CASE 
    WHEN COUNT(CASE WHEN a.shopify_article_id IS NOT NULL THEN 1 END) > 0 THEN true
    ELSE false
  END as has_published_articles
FROM topics t
LEFT JOIN articles a ON t.id = a.source_topic_id
GROUP BY t.id, t.topic_title, t.keywords, t.style_preferences, t.status, t.priority_score, 
         t.search_volume, t.competition_score, t.industry, t.market_segment, t.used_at, 
         t.created_at, t.content_template;

-- Grant permissions
GRANT SELECT ON topics_with_article_status TO authenticated;
GRANT SELECT ON topics_with_article_status TO anon;

-- Create function to update topic used_at when article is created
CREATE OR REPLACE FUNCTION update_topic_used_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_topic_id IS NOT NULL THEN
    UPDATE topics 
    SET used_at = NOW()
    WHERE id = NEW.source_topic_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update topic used_at
DROP TRIGGER IF EXISTS trigger_update_topic_used_at ON articles;
CREATE TRIGGER trigger_update_topic_used_at
  AFTER INSERT ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_topic_used_at();

-- Create function to update topic status when article is published to Shopify
CREATE OR REPLACE FUNCTION update_topic_status_on_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- If article is being published to Shopify (shopify_article_id is set)
  IF NEW.shopify_article_id IS NOT NULL AND 
     (OLD.shopify_article_id IS NULL OR OLD.shopify_article_id != NEW.shopify_article_id) AND
     NEW.source_topic_id IS NOT NULL THEN
    
    UPDATE topics 
    SET status = 'published'
    WHERE id = NEW.source_topic_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update topic status on Shopify publish
DROP TRIGGER IF EXISTS trigger_update_topic_status_on_publish ON articles;
CREATE TRIGGER trigger_update_topic_status_on_publish
  AFTER UPDATE ON articles
  FOR EACH ROW
  EXECUTE FUNCTION update_topic_status_on_publish(); 