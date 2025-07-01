# Database Migrations & Utilities

This folder contains all database schema definitions and utility scripts for the Shopify Blog CMS.

## Migration Files (Apply in Order)

### Core Schema Migrations
These files must be applied in numerical order to build the complete database schema:

#### `001_initial_schema.sql`
**Purpose**: Foundational database schema
**Creates**:
- `articles` - Main content management table
- `topics` - Content planning and keyword research
- `content_templates` - Reusable content structures
- `workflow_logs` - System execution tracking
- `app_config` - Application configuration
- Basic indexes and RLS policies

**Apply When**: Setting up a new database instance

#### `002_phase1_topic_enhancements.sql`
**Purpose**: Phase 1 enhancements for topic management
**Adds**:
- Enhanced topic fields (industry, market_segment, style_preferences)
- Configuration data for style options
- Additional indexes for performance
- Sample test data

**Apply When**: Upgrading from initial schema to Phase 1

#### `003_shopify_products.sql`
**Purpose**: Shopify integration and product management
**Creates**:
- `shopify_products` - Product catalog storage
- `article_product_suggestions` - Article-product relationships
- `seo_keywords` - SEO keyword management
- Product-specific indexes and RLS policies
- Sample product data

**Apply When**: Adding Shopify integration features

## Utility Scripts

### `util_production_cleanup.sql`
**Purpose**: Clean test data before production deployment
**Actions**:
- Removes all test/demo articles and topics
- Cleans test SEO keywords
- Preserves configuration and templates
- Provides verification queries

**Use When**: Preparing for production deployment

## Application Instructions

### For New Database Setup
```sql
-- Apply migrations in order
\i migrations/001_initial_schema.sql
\i migrations/002_phase1_topic_enhancements.sql
\i migrations/003_shopify_products.sql
```

### For Production Deployment
```sql
-- First apply all migrations (if not already applied)
\i migrations/001_initial_schema.sql
\i migrations/002_phase1_topic_enhancements.sql
\i migrations/003_shopify_products.sql

-- Then clean test data
\i migrations/util_production_cleanup.sql
```

### Via Supabase Dashboard
1. Go to SQL Editor in your Supabase dashboard
2. Copy and paste each migration file content
3. Execute in the correct order (001 → 002 → 003)
4. For production: Execute util_production_cleanup.sql last

## Current Database State

After applying all migrations, your database will have:

**Tables**: 7 total
- `articles` (0 records after cleanup)
- `topics` (0 records after cleanup)  
- `shopify_products` (30 authentic products)
- `article_product_suggestions` (0 records after cleanup)
- `seo_keywords` (10 production-ready keywords)
- `content_templates` (preserved)
- `app_config` (6 configuration entries)

**Indexes**: 15+ optimized indexes for performance
**RLS Policies**: Production-ready Row Level Security
**Sample Data**: Real Shopify products from Culturati.in

## Schema Verification

After applying migrations, verify your schema:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check row counts
SELECT 
  'articles' as table_name, COUNT(*) as rows FROM articles
UNION ALL
SELECT 'topics', COUNT(*) FROM topics
UNION ALL  
SELECT 'shopify_products', COUNT(*) FROM shopify_products
UNION ALL
SELECT 'article_product_suggestions', COUNT(*) FROM article_product_suggestions
UNION ALL
SELECT 'seo_keywords', COUNT(*) FROM seo_keywords
UNION ALL
SELECT 'content_templates', COUNT(*) FROM content_templates
UNION ALL
SELECT 'app_config', COUNT(*) FROM app_config;
```

## Troubleshooting

### Migration Errors
- **"relation already exists"**: Migration was already applied, safe to continue
- **"permission denied"**: Check if you're using the service role key
- **"function uuid_generate_v4() does not exist"**: Enable uuid-ossp extension

### Common Issues
```sql
-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verify indexes
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## Security Notes

- All tables have Row Level Security (RLS) enabled
- Production policies restrict access appropriately
- Service role key required for administrative operations
- Anon key provides limited read access to products only

## Backup Recommendations

Before applying migrations to production:
1. **Create manual backup** in Supabase dashboard
2. **Test migrations** on a staging environment first
3. **Verify data integrity** after each migration
4. **Document any customizations** you've made

For questions or issues, refer to the main documentation or create an issue in the project repository. 