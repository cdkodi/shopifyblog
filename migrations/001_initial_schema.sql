-- ============================================================================
-- Shopify Blog Content Management System - Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Created: 2025-01-27
-- Description: Complete database schema for blog content management with 
--              Shopify integration, SEO optimization, and workflow management
-- ============================================================================

-- ============================================================================
-- TABLE DEFINITIONS
-- ============================================================================

-- Articles table - Main content management
CREATE TABLE articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    meta_description TEXT,
    slug TEXT UNIQUE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'rejected')),
    target_keywords JSONB,
    shopify_blog_id BIGINT,
    shopify_article_id BIGINT,
    scheduled_publish_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    seo_score INTEGER,
    word_count INTEGER,
    reading_time INTEGER
);

-- Topics table - Content planning and keyword research
CREATE TABLE topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic_title TEXT NOT NULL,
    keywords JSONB,
    search_volume INTEGER,
    competition_score DECIMAL(3,2),
    priority_score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ
);

-- Content templates - Reusable content structures
CREATE TABLE content_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    template_structure JSONB,
    content_type TEXT,
    industry TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow logs - System execution tracking
CREATE TABLE workflow_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workflow_name TEXT NOT NULL,
    execution_id TEXT,
    status TEXT CHECK (status IN ('started', 'completed', 'failed', 'cancelled')),
    error_message TEXT,
    execution_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App configuration - System settings
CREATE TABLE app_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    config_key TEXT UNIQUE NOT NULL,
    config_value JSONB,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Articles indexes
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_created_at ON articles(created_at);

-- Topics indexes
CREATE INDEX idx_topics_priority ON topics(priority_score DESC);

-- Workflow logs indexes
CREATE INDEX idx_workflow_logs_created_at ON workflow_logs(created_at);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECURITY POLICIES
-- ============================================================================

-- Articles: Full access for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON articles
    FOR ALL USING (auth.role() = 'authenticated');

-- Topics: Full access for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON topics
    FOR ALL USING (auth.role() = 'authenticated');

-- Content templates: Full access for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON content_templates
    FOR ALL USING (auth.role() = 'authenticated');

-- Workflow logs: Read-only for authenticated users
CREATE POLICY "Enable read for authenticated users" ON workflow_logs
    FOR SELECT USING (auth.role() = 'authenticated');

-- App config: Read-only for authenticated users
CREATE POLICY "Enable read for authenticated users" ON app_config
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE articles IS 'Main content management table with SEO optimization and Shopify integration';
COMMENT ON TABLE topics IS 'Content planning and keyword research management';
COMMENT ON TABLE content_templates IS 'Reusable content templates for different industries and content types';
COMMENT ON TABLE workflow_logs IS 'System execution tracking and error monitoring';
COMMENT ON TABLE app_config IS 'Application configuration and settings management';

-- Column comments for articles table
COMMENT ON COLUMN articles.status IS 'Workflow status: draft -> review -> approved -> published -> rejected';
COMMENT ON COLUMN articles.target_keywords IS 'SEO keywords stored as JSON array';
COMMENT ON COLUMN articles.shopify_blog_id IS 'Reference to Shopify blog for integration';
COMMENT ON COLUMN articles.shopify_article_id IS 'Reference to published Shopify article';
COMMENT ON COLUMN articles.seo_score IS 'Calculated SEO optimization score (0-100)';
COMMENT ON COLUMN articles.reading_time IS 'Estimated reading time in minutes';

-- Column comments for topics table
COMMENT ON COLUMN topics.keywords IS 'Related keywords stored as JSON array';
COMMENT ON COLUMN topics.competition_score IS 'SEO competition difficulty (0.00-1.00)';
COMMENT ON COLUMN topics.priority_score IS 'Content priority ranking for planning';

-- Column comments for content_templates table
COMMENT ON COLUMN content_templates.template_structure IS 'Template sections and structure as JSON';
COMMENT ON COLUMN content_templates.content_type IS 'Type of content (blog, product, landing, etc.)';

-- Column comments for workflow_logs table
COMMENT ON COLUMN workflow_logs.execution_data IS 'Workflow execution context and parameters as JSON';

-- Column comments for app_config table
COMMENT ON COLUMN app_config.config_value IS 'Configuration value stored as JSON for flexibility'; 