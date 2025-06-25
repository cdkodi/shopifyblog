-- ============================================================================
-- Phase 1: Topic Input & Style Preferences Enhancement
-- Migration: 002_phase1_topic_enhancements.sql
-- Created: 2025-01-27
-- Description: Extends topics table for manual user input and adds style 
--              configuration for e-commerce blog content generation
-- ============================================================================

-- ============================================================================
-- EXTEND TOPICS TABLE FOR PHASE 1
-- ============================================================================

-- Add new columns to support Phase 1 requirements
ALTER TABLE topics ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS market_segment TEXT;
ALTER TABLE topics ADD COLUMN IF NOT EXISTS style_preferences JSONB;

-- Add column comments for new fields
COMMENT ON COLUMN topics.industry IS 'Optional industry classification (e.g., Fashion, Electronics)';
COMMENT ON COLUMN topics.market_segment IS 'Optional market segment (e.g., B2B, B2C, Luxury)';
COMMENT ON COLUMN topics.style_preferences IS 'Style configuration: tone, length, audience, template, notes';

-- ============================================================================
-- POPULATE CONFIGURATION VALUES FOR STYLE OPTIONS
-- ============================================================================

-- Style tone options
INSERT INTO app_config (config_key, config_value, description) VALUES
('style_tones', '["Professional", "Casual", "Friendly", "Authoritative", "Conversational", "Educational"]', 'Available tone options for article generation')
ON CONFLICT (config_key) DO UPDATE SET
config_value = EXCLUDED.config_value,
updated_at = NOW();

-- Article length options
INSERT INTO app_config (config_key, config_value, description) VALUES
('article_lengths', '["Short (500-800 words)", "Medium (800-1500 words)", "Long (1500-3000 words)", "Extended (3000+ words)"]', 'Available article length options')
ON CONFLICT (config_key) DO UPDATE SET
config_value = EXCLUDED.config_value,
updated_at = NOW();

-- Target audience options
INSERT INTO app_config (config_key, config_value, description) VALUES
('target_audiences', '["General Consumers", "Industry Professionals", "Beginners", "Experts", "Small Business Owners", "Tech Enthusiasts"]', 'Target audience options for content')
ON CONFLICT (config_key) DO UPDATE SET
config_value = EXCLUDED.config_value,
updated_at = NOW();

-- E-commerce content template types
INSERT INTO app_config (config_key, config_value, description) VALUES
('content_templates', '["Product Showcase", "How-to Guide", "Buying Guide", "Industry Trends", "Problem-Solution", "Comparison Article", "Review Article", "Seasonal Content"]', 'E-commerce focused content template types')
ON CONFLICT (config_key) DO UPDATE SET
config_value = EXCLUDED.config_value,
updated_at = NOW();

-- Industry options (can be extended)
INSERT INTO app_config (config_key, config_value, description) VALUES
('industries', '["Fashion", "Electronics", "Home & Garden", "Health & Beauty", "Sports & Outdoors", "Books & Media", "Toys & Games", "Automotive", "Food & Beverage", "Office Supplies"]', 'Common e-commerce industry categories')
ON CONFLICT (config_key) DO UPDATE SET
config_value = EXCLUDED.config_value,
updated_at = NOW();

-- Market segment options
INSERT INTO app_config (config_key, config_value, description) VALUES
('market_segments', '["B2B", "B2C", "Luxury", "Budget-Friendly", "Mid-Range", "Enterprise", "Small Business", "Consumer"]', 'Market segment classifications')
ON CONFLICT (config_key) DO UPDATE SET
config_value = EXCLUDED.config_value,
updated_at = NOW();

-- ============================================================================
-- CREATE INDEXES FOR PHASE 1 PERFORMANCE
-- ============================================================================

-- Index for industry filtering
CREATE INDEX IF NOT EXISTS idx_topics_industry ON topics(industry);

-- Index for market segment filtering
CREATE INDEX IF NOT EXISTS idx_topics_market_segment ON topics(market_segment);

-- GIN index for style preferences JSON queries
CREATE INDEX IF NOT EXISTS idx_topics_style_preferences ON topics USING GIN(style_preferences);

-- ============================================================================
-- UPDATE TABLE COMMENTS
-- ============================================================================

COMMENT ON TABLE topics IS 'Content planning and keyword research with style preferences for Phase 1 user input';

-- ============================================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- ============================================================================

-- Sample topic entries for testing Phase 1 functionality
INSERT INTO topics (topic_title, keywords, industry, market_segment, style_preferences, priority_score) VALUES
(
  'Best Winter Fashion Trends 2025',
  '["winter fashion", "2025 trends", "seasonal clothing", "style guide"]',
  'Fashion',
  'B2C',
  '{
    "tone": "Friendly",
    "length": "Medium (800-1500 words)",
    "target_audience": "General Consumers",
    "template_type": "Industry Trends",
    "custom_notes": "Focus on affordable options and styling tips"
  }',
  8
),
(
  'How to Choose the Right Smartphone in 2025',
  '["smartphone buying guide", "mobile phones", "tech reviews", "consumer electronics"]',
  'Electronics',
  'Consumer',
  '{
    "tone": "Educational",
    "length": "Long (1500-3000 words)",
    "target_audience": "Beginners",
    "template_type": "Buying Guide",
    "custom_notes": "Include comparison tables and technical specifications"
  }',
  9
)
ON CONFLICT (topic_title) DO NOTHING; 