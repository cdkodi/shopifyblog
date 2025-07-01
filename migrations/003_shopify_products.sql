-- ============================================================================
-- Shopify Products Integration - Database Schema
-- Migration: 003_shopify_products.sql
-- Created: 2025-01-27
-- Description: Add Shopify products integration tables for product-aware 
--              content generation and article-product relationship tracking
-- ============================================================================

-- ============================================================================
-- SHOPIFY PRODUCTS TABLE
-- ============================================================================

-- Shopify products table - Store product data for content integration
CREATE TABLE shopify_products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shopify_id BIGINT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    handle TEXT UNIQUE NOT NULL,
    description TEXT,
    product_type TEXT,
    collections JSONB DEFAULT '[]'::jsonb, -- Array of collection names/IDs
    tags JSONB DEFAULT '[]'::jsonb, -- Product tags for matching
    images JSONB DEFAULT '[]'::jsonb, -- Product image URLs
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),
    inventory_quantity INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    shopify_url TEXT, -- Full product URL
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_synced TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ARTICLE-PRODUCT RELATIONSHIP TRACKING
-- ============================================================================

-- Article-Product relationship tracking
CREATE TABLE article_product_suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES shopify_products(id) ON DELETE CASCADE,
    suggestion_type TEXT DEFAULT 'auto' CHECK (suggestion_type IN ('auto', 'manual', 'editor_added')),
    relevance_score DECIMAL(5,2) DEFAULT 0,
    position_in_content INTEGER,
    link_text TEXT, -- How the product is referenced in the article
    utm_campaign TEXT, -- For tracking
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(article_id, product_id) -- Prevent duplicate suggestions
);

-- ============================================================================
-- SEO KEYWORDS CONFIGURATION
-- ============================================================================

-- SEO keyword configuration
CREATE TABLE seo_keywords (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    keyword TEXT NOT NULL,
    priority INTEGER DEFAULT 1 CHECK (priority IN (1, 2, 3)), -- 1=high, 2=medium, 3=low
    category TEXT, -- 'art', 'decor', 'fashion', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(keyword, category) -- Prevent duplicate keywords per category
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Shopify products indexes
CREATE INDEX idx_shopify_products_handle ON shopify_products(handle);
CREATE INDEX idx_shopify_products_status ON shopify_products(status);
CREATE INDEX idx_shopify_products_type ON shopify_products(product_type);
CREATE INDEX idx_shopify_products_collections ON shopify_products USING GIN(collections);
CREATE INDEX idx_shopify_products_tags ON shopify_products USING GIN(tags);
CREATE INDEX idx_shopify_products_last_synced ON shopify_products(last_synced);

-- Article-product suggestions indexes
CREATE INDEX idx_article_product_article ON article_product_suggestions(article_id);
CREATE INDEX idx_article_product_product ON article_product_suggestions(product_id);
CREATE INDEX idx_article_product_type ON article_product_suggestions(suggestion_type);
CREATE INDEX idx_article_product_approved ON article_product_suggestions(is_approved);

-- SEO keywords indexes
CREATE INDEX idx_seo_keywords_category ON seo_keywords(category);
CREATE INDEX idx_seo_keywords_priority ON seo_keywords(priority);
CREATE INDEX idx_seo_keywords_active ON seo_keywords(is_active);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE shopify_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_product_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SECURITY POLICIES
-- ============================================================================

-- Shopify products: Read access for authenticated users
CREATE POLICY "Enable read for authenticated users" ON shopify_products
    FOR SELECT USING (auth.role() = 'authenticated');

-- Article-product suggestions: Full access for authenticated users
CREATE POLICY "Enable all operations for authenticated users" ON article_product_suggestions
    FOR ALL USING (auth.role() = 'authenticated');

-- SEO keywords: Read access for authenticated users
CREATE POLICY "Enable read for authenticated users" ON seo_keywords
    FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample SEO keywords
INSERT INTO seo_keywords (keyword, priority, category, is_active) VALUES
('Indian Art', 1, 'art', true),
('Traditional Art', 1, 'art', true),
('Madhubani Art', 1, 'art', true),
('Pichwai Paintings', 1, 'art', true),
('Kerala Mural', 1, 'art', true),
('Handcrafted Decor', 1, 'decor', true),
('Indian Home Decor', 1, 'decor', true),
('Sustainable Products', 2, 'general', true),
('Artisan Crafts', 2, 'art', true),
('Cultural Heritage', 2, 'general', true);

-- Insert sample Shopify products for testing
INSERT INTO shopify_products (
    shopify_id, title, handle, description, product_type, 
    collections, tags, images, price_min, price_max, 
    inventory_quantity, status, shopify_url
) VALUES 
(
    7234567890123,
    'Madhubani Radhakrishna',
    'madhubani-radhakrishna',
    'Traditional Madhubani painting featuring Radha and Krishna with intricate fish motifs and natural pigments',
    'Traditional Art',
    '["madhubani-art", "krishna-collection", "traditional-paintings"]'::jsonb,
    '["madhubani", "krishna", "radha", "traditional", "handpainted", "bihar", "folk-art"]'::jsonb,
    '["https://cdn.shopify.com/madhubani-radhakrishna-1.jpg", "https://cdn.shopify.com/madhubani-radhakrishna-2.jpg"]'::jsonb,
    89.00,
    89.00,
    15,
    'active',
    'https://culturati.in/products/madhubani-radhakrishna'
),
(
    7234567890124,
    'Madhubani Ganesha',
    'madhubani-ganesha',
    'Vibrant Madhubani painting of Lord Ganesha with traditional geometric patterns and natural dyes',
    'Traditional Art',
    '["madhubani-art", "ganesha-collection", "traditional-paintings"]'::jsonb,
    '["madhubani", "ganesha", "traditional", "handpainted", "bihar", "folk-art", "elephant"]'::jsonb,
    '["https://cdn.shopify.com/madhubani-ganesha-1.jpg", "https://cdn.shopify.com/madhubani-ganesha-2.jpg"]'::jsonb,
    75.00,
    75.00,
    12,
    'active',
    'https://culturati.in/products/madhubani-ganesha'
),
(
    7234567890125,
    'Madhubani Tree of Life',
    'madhubani-tree-of-life',
    'Symbolic Tree of Life painting in traditional Madhubani style representing connection between earth and heaven',
    'Traditional Art',
    '["madhubani-art", "nature-themes", "traditional-paintings"]'::jsonb,
    '["madhubani", "tree-of-life", "nature", "traditional", "handpainted", "bihar", "symbolic"]'::jsonb,
    '["https://cdn.shopify.com/madhubani-tree-1.jpg", "https://cdn.shopify.com/madhubani-tree-2.jpg"]'::jsonb,
    95.00,
    95.00,
    8,
    'active',
    'https://culturati.in/products/madhubani-tree-of-life'
),
(
    7234567890126,
    'Madhubani Wedding Painting',
    'madhubani-wedding-painting',
    'Traditional ceremonial Madhubani painting depicting wedding rituals with intricate border designs',
    'Traditional Art',
    '["madhubani-art", "ceremonial-art", "traditional-paintings"]'::jsonb,
    '["madhubani", "wedding", "ceremonial", "traditional", "handpainted", "bihar", "ritual"]'::jsonb,
    '["https://cdn.shopify.com/madhubani-wedding-1.jpg", "https://cdn.shopify.com/madhubani-wedding-2.jpg"]'::jsonb,
    120.00,
    120.00,
    5,
    'active',
    'https://culturati.in/products/madhubani-wedding-painting'
),
(
    7234567890127,
    'Pichwai Krishna Leela',
    'pichwai-krishna-leela',
    'Detailed Pichwai painting showcasing Krishna Leela with traditional Nathdwara artistry',
    'Traditional Art',
    '["pichwai-art", "krishna-collection", "traditional-paintings"]'::jsonb,
    '["pichwai", "krishna", "leela", "nathdwara", "traditional", "handpainted", "rajasthan"]'::jsonb,
    '["https://cdn.shopify.com/pichwai-krishna-1.jpg", "https://cdn.shopify.com/pichwai-krishna-2.jpg"]'::jsonb,
    150.00,
    150.00,
    10,
    'active',
    'https://culturati.in/products/pichwai-krishna-leela'
),
(
    7234567890128,
    'Kerala Mural Ganesha',
    'kerala-mural-ganesha',
    'Traditional Kerala mural painting of Lord Ganesha with authentic temple art styling',
    'Traditional Art',
    '["kerala-mural", "ganesha-collection", "traditional-paintings"]'::jsonb,
    '["kerala-mural", "ganesha", "temple-art", "traditional", "handpainted", "kerala", "south-indian"]'::jsonb,
    '["https://cdn.shopify.com/kerala-ganesha-1.jpg", "https://cdn.shopify.com/kerala-ganesha-2.jpg"]'::jsonb,
    110.00,
    110.00,
    7,
    'active',
    'https://culturati.in/products/kerala-mural-ganesha'
);

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE shopify_products IS 'Shopify product data for content integration and product-aware generation';
COMMENT ON TABLE article_product_suggestions IS 'Tracks product suggestions and their approval status for articles';
COMMENT ON TABLE seo_keywords IS 'Configurable SEO keywords for content optimization';

-- Column comments for shopify_products table
COMMENT ON COLUMN shopify_products.collections IS 'Product collections stored as JSON array for flexible querying';
COMMENT ON COLUMN shopify_products.tags IS 'Product tags stored as JSON array for content matching';
COMMENT ON COLUMN shopify_products.images IS 'Product image URLs stored as JSON array';
COMMENT ON COLUMN shopify_products.last_synced IS 'Last synchronization timestamp with Shopify API';

-- Column comments for article_product_suggestions table
COMMENT ON COLUMN article_product_suggestions.suggestion_type IS 'How the suggestion was created: auto (AI), manual (user), editor_added (during review)';
COMMENT ON COLUMN article_product_suggestions.relevance_score IS 'AI-calculated relevance score (0-100)';
COMMENT ON COLUMN article_product_suggestions.utm_campaign IS 'UTM tracking parameter for performance analytics';

-- Column comments for seo_keywords table
COMMENT ON COLUMN seo_keywords.priority IS 'Keyword priority: 1=high, 2=medium, 3=low';
COMMENT ON COLUMN seo_keywords.category IS 'Keyword category for content targeting'; 