# Shopify Blog Content Management System - Technical Architecture

## Overview

This document outlines the technical architecture for a comprehensive blog content management system designed to integrate with Shopify, optimize for SEO, and streamline content creation workflows.

## System Architecture

### Tech Stack
- **Backend**: Supabase (PostgreSQL + Authentication + API)
- **Frontend**: Next.js 14+ with App Router
- **UI Framework**: React + Shadcn UI + Tailwind CSS
- **Language**: TypeScript
- **Animation**: Framer Motion
- **Integration**: Shopify Admin API

### Core Components
1. **Database Layer** - Supabase PostgreSQL
2. **API Layer** - Supabase REST/GraphQL APIs
3. **Authentication** - Supabase Auth
4. **Frontend Application** - Next.js React App
5. **External Integration** - Shopify Admin API

## Database Schema

### Entity Relationship Overview

```
articles (1) ←→ (M) topics (content planning)
articles (1) ←→ (M) content_templates (template usage)
workflow_logs (tracks all system operations)
app_config (system-wide settings)
```

### Table Definitions

#### 1. Articles Table
**Purpose**: Main content management with SEO optimization and Shopify integration

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `title` | TEXT | Article title (required) |
| `content` | TEXT | Full article content (required) |
| `meta_description` | TEXT | SEO meta description |
| `slug` | TEXT | URL-friendly slug (unique) |
| `status` | TEXT | Workflow status with CHECK constraint |
| `target_keywords` | JSONB | SEO keywords array |
| `shopify_blog_id` | BIGINT | Shopify blog reference |
| `shopify_article_id` | BIGINT | Published article reference |
| `scheduled_publish_date` | TIMESTAMPTZ | Future publishing date |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last modification timestamp |
| `published_at` | TIMESTAMPTZ | Actual publication timestamp |
| `seo_score` | INTEGER | Calculated SEO score (0-100) |
| `word_count` | INTEGER | Article word count |
| `reading_time` | INTEGER | Estimated reading time (minutes) |

**Status Workflow**: `draft` → `review` → `approved` → `published` → `rejected`

#### 2. Topics Table
**Purpose**: Content planning and keyword research management

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `topic_title` | TEXT | Topic/subject title (required) |
| `keywords` | JSONB | Related keywords array |
| `search_volume` | INTEGER | Monthly search volume |
| `competition_score` | DECIMAL(3,2) | SEO competition (0.00-1.00) |
| `priority_score` | INTEGER | Content priority ranking |
| `status` | TEXT | Topic status with CHECK constraint |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `used_at` | TIMESTAMPTZ | When topic was used for content |

**Status Workflow**: `pending` → `in_progress` → `completed` → `rejected`

#### 3. Content Templates Table
**Purpose**: Reusable content structures for different industries

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `name` | TEXT | Template name (required) |
| `template_structure` | JSONB | Template sections and format |
| `content_type` | TEXT | Content category |
| `industry` | TEXT | Target industry |
| `is_active` | BOOLEAN | Template availability |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

#### 4. Workflow Logs Table
**Purpose**: System execution tracking and error monitoring

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `workflow_name` | TEXT | Operation/workflow identifier |
| `execution_id` | TEXT | Unique execution reference |
| `status` | TEXT | Execution status with CHECK constraint |
| `error_message` | TEXT | Error details (if failed) |
| `execution_data` | JSONB | Context and parameters |
| `created_at` | TIMESTAMPTZ | Execution timestamp |

**Status Types**: `started` → `completed` → `failed` → `cancelled`

#### 5. App Config Table
**Purpose**: Application-wide configuration management

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key (auto-generated) |
| `config_key` | TEXT | Unique configuration key |
| `config_value` | JSONB | Configuration value (flexible JSON) |
| `description` | TEXT | Configuration description |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

## Performance Optimizations

### Database Indexes
- `idx_articles_status` - Fast filtering by article status
- `idx_articles_created_at` - Efficient date-based sorting
- `idx_topics_priority` - Quick priority-based ordering
- `idx_workflow_logs_created_at` - Fast log retrieval

### Query Optimization Strategies
1. **Status-based filtering** with indexed enum values
2. **Date range queries** with timestamp indexes
3. **Priority ordering** with DESC index on topics
4. **JSONB operations** for flexible keyword and configuration storage

## Security Architecture

### Row Level Security (RLS)
All tables protected with Supabase RLS policies:

| Table | Access Level | Policy |
|-------|-------------|---------|
| `articles` | Full Access | Authenticated users (CRUD) |
| `topics` | Full Access | Authenticated users (CRUD) |
| `content_templates` | Full Access | Authenticated users (CRUD) |
| `workflow_logs` | Read-Only | Authenticated users (SELECT) |
| `app_config` | Read-Only | Authenticated users (SELECT) |

### Authentication Strategy
- **Supabase Auth** for user management
- **JWT tokens** for API authentication
- **Role-based access** with `auth.role() = 'authenticated'`
- **Session management** with automatic token refresh

## API Design

### Supabase REST API Endpoints
```
GET    /rest/v1/articles          # List articles with filters
POST   /rest/v1/articles          # Create new article
GET    /rest/v1/articles/{id}     # Get specific article
PATCH  /rest/v1/articles/{id}     # Update article
DELETE /rest/v1/articles/{id}     # Delete article

GET    /rest/v1/topics            # List topics with priority
POST   /rest/v1/topics            # Create new topic
PATCH  /rest/v1/topics/{id}       # Update topic status

GET    /rest/v1/content_templates # List active templates
GET    /rest/v1/workflow_logs     # View execution logs
GET    /rest/v1/app_config        # Get configuration
```

### Shopify Integration API
```
POST   /api/shopify/publish       # Publish article to Shopify
GET    /api/shopify/blogs         # List Shopify blogs
POST   /api/shopify/sync          # Sync article status
DELETE /api/shopify/unpublish     # Remove from Shopify
```

## Frontend Architecture

### Next.js App Structure
```
src/
├── app/                    # App Router pages
│   ├── dashboard/         # Main content management
│   ├── articles/          # Article CRUD operations
│   ├── topics/            # Content planning
│   ├── templates/         # Template management
│   └── settings/          # Configuration
├── components/            # Reusable UI components
│   ├── ui/               # Shadcn UI components
│   ├── forms/            # Form components
│   └── layout/           # Layout components
├── lib/                  # Utilities and configurations
│   ├── supabase.ts       # Supabase client
│   ├── shopify.ts        # Shopify API client
│   └── utils.ts          # Helper functions
└── types/                # TypeScript definitions
```

### Key Features
- **Server-side rendering** with Next.js App Router
- **Real-time updates** with Supabase subscriptions
- **Responsive design** with Tailwind CSS
- **Form validation** with TypeScript interfaces
- **State management** with React hooks and context

## Content Workflow

### Article Lifecycle
1. **Topic Research** - Create topics with SEO analysis
2. **Content Planning** - Assign topics to content calendar
3. **Draft Creation** - Write articles using templates
4. **Review Process** - Status progression through workflow
5. **SEO Optimization** - Keyword analysis and scoring
6. **Scheduling** - Set future publication dates
7. **Shopify Publishing** - Sync to Shopify blog
8. **Performance Tracking** - Monitor engagement metrics

### SEO Optimization Features
- **Keyword targeting** with JSONB storage
- **Meta description** optimization
- **Reading time** calculation
- **Word count** tracking
- **SEO score** algorithmic calculation
- **Competition analysis** integration

## Integration Points

### Shopify Admin API
- **Blog management** - Create/update blog posts
- **Category mapping** - Sync content categories
- **Publication status** - Track publishing state
- **Media handling** - Upload and manage images

### External SEO Tools
- **Keyword research** APIs for search volume data
- **Competition analysis** tools integration
- **Content scoring** algorithms
- **Analytics tracking** for performance metrics

## Monitoring and Logging

### System Monitoring
- **Workflow execution** tracking in `workflow_logs`
- **Error handling** with detailed error messages
- **Performance metrics** collection
- **API usage** monitoring

### Logging Strategy
- **Structured logging** with JSON format
- **Execution context** preservation
- **Error categorization** for debugging
- **Audit trail** for content changes

## Deployment and Scaling

### Infrastructure
- **Supabase** managed PostgreSQL and API
- **Vercel/Netlify** for Next.js frontend deployment
- **CDN** for static asset delivery
- **Environment-based** configuration management

### Scaling Considerations
- **Database connection** pooling
- **API rate limiting** implementation
- **Caching strategy** for frequently accessed data
- **Background job** processing for heavy operations

## Security Considerations

### Data Protection
- **Row Level Security** on all database tables
- **API authentication** for all endpoints
- **Input validation** and sanitization
- **CORS configuration** for API access

### Privacy Compliance
- **User data** handling procedures
- **Content ownership** tracking
- **Data retention** policies
- **GDPR compliance** considerations

## Future Enhancements

### Planned Features
1. **AI Content Generation** - GPT integration for content assistance
2. **Advanced Analytics** - Content performance dashboard
3. **Multi-user Collaboration** - Team workflows and permissions
4. **Content Localization** - Multi-language support
5. **Advanced SEO Tools** - Competitor analysis and suggestions
6. **Social Media Integration** - Cross-platform publishing
7. **Content Versioning** - Track article revisions
8. **Automated Publishing** - Scheduled content workflows

### Technical Improvements
1. **Real-time Collaboration** - Live editing capabilities
2. **Advanced Caching** - Redis integration
3. **Background Processing** - Queue system for heavy operations
4. **Advanced Search** - Full-text search with PostgreSQL
5. **API Optimization** - GraphQL integration
6. **Mobile App** - React Native companion app

---

**Last Updated**: January 27, 2025  
**Version**: 1.0  
**Architecture Status**: Production Ready 