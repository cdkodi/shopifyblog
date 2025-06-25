# Shopify Blog Content Management System - Technical Architecture

## Overview

This document outlines the technical architecture for a streamlined blog content management system designed for Shopify stores, focused on essential topic planning and content organization.

**Current Status: Phase 1 Complete ✅ - Ready for Phase 2 AI Integration**

**Environment Setup Status: Complete ✅**
- All AI provider API keys configured in Vercel
- Test endpoint verified all providers working
- Ready for AI service layer implementation

## System Architecture

### Tech Stack (Implemented)
- **Frontend**: Next.js 14 with App Router, React 18, TypeScript 5
- **UI Framework**: Shadcn UI + Tailwind CSS + Lucide React Icons
- **Backend**: Supabase (PostgreSQL + Authentication + API)
- **Forms**: React Hook Form + Zod validation with real-time feedback
- **State Management**: React useState/useEffect + Supabase client
- **Deployment**: Vercel + Supabase Cloud
- **Development**: Git + GitHub + Vercel CI/CD

### AI Integration Stack (Environment Ready)
- **AI Providers**: Anthropic Claude, OpenAI GPT-4, Google Gemini Pro ✅
- **API Keys**: Securely stored in Vercel environment variables ✅
- **Configuration**: Rate limiting, fallback, cost tracking settings ✅
- **Security**: Server-side only, zero client exposure ✅
- **Test Endpoint**: `/api/test-ai-setup` - All providers verified ✅

### Vercel Deployment Stack (Production Ready)
- **Platform**: Vercel (Next.js optimized with serverless functions)
- **Database**: Supabase PostgreSQL (managed with connection pooling)  
- **Authentication**: Supabase Auth with Row Level Security
- **Storage**: Supabase Storage (ready for future image uploads)
- **Environment Variables**: Configured in Vercel dashboard
- **Domain**: Custom domain ready via Vercel
- **Analytics**: Vercel Analytics integration ready
- **Monitoring**: Real-time error tracking and performance monitoring

### Core Components (Phase 1 Implemented)
1. **Database Layer** ✅ - Simplified Supabase PostgreSQL schema with RLS
2. **API Layer** ✅ - Supabase client with TypeScript service layer
3. **Authentication** ✅ - Supabase Auth with public access policies (Phase 1)
4. **Frontend Application** ✅ - Next.js React App with responsive design
5. **Form Management** ✅ - React Hook Form with Zod validation
6. **Topic Management** ✅ - Essential CRUD operations with search

### Phase 2 Components (Environment Ready)
1. **AI Service Layer** 🔄 - Multi-provider abstraction with fallback logic
2. **Content Generation** 🔄 - AI-powered article creation from topics
3. **Cost Tracking** 🔄 - Real-time usage monitoring and estimation
4. **Provider Selection** 🔄 - Template-based AI provider optimization
5. **Article Management** 🔄 - Generated content storage and editing
6. **Performance Analytics** 🔄 - AI provider performance comparison

## Phase 1: Simplified Implementation

### Streamlined Database Schema (Deployed)

#### Topics Table (Essential Fields Only)
**Purpose**: Core content planning with minimal required data

| Column | Type | Required | Validation | Description |
|--------|------|----------|------------|-------------|
| `id` | UUID | ✅ | Auto-generated | Primary key |
| `topic_title` | TEXT | ✅ | 3-200 chars | **REQUIRED** - Topic title |
| `keywords` | JSONB | ❌ | Max 500 chars | Optional keywords (JSON array) |
| `style_preferences` | JSONB | ❌ | Structured JSON | Style configuration object |
| `status` | TEXT | ✅ | Enum | Workflow status (default: 'pending') |
| `created_at` | TIMESTAMPTZ | ✅ | Auto | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | ✅ | Auto | Last modification timestamp |

#### Style Preferences JSON Structure (Simplified)
```json
{
  "tone": "Professional | Casual | Friendly | Authoritative | Conversational | Educational",
  "length": "Short (500-800) | Medium (800-1500) | Long (1500-3000) | Extended (3000+)",
  "template": "Product Showcase | How-to Guide | Buying Guide | Industry Trends | Problem-Solution | Comparison Article | Review Article | Seasonal Content"
}
```

#### Configuration Values (app_config table - Essential Only)
| Config Key | Count | Purpose |
|------------|-------|---------|
| `style_tones` | 6 | Article tone selection |
| `article_lengths` | 4 | Content length specifications |
| `content_templates` | 8 | E-commerce focused templates |

**Configuration Data**:
```json
{
  "style_tones": ["Professional", "Casual", "Friendly", "Authoritative", "Conversational", "Educational"],
  "article_lengths": ["Short (500-800)", "Medium (800-1500)", "Long (1500-3000)", "Extended (3000+)"],
  "content_templates": ["Product Showcase", "How-to Guide", "Buying Guide", "Industry Trends", "Problem-Solution", "Comparison Article", "Review Article", "Seasonal Content"]
}
```

### Database Indexes (Essential Performance)
```sql
-- Basic performance indexes for Phase 1
CREATE INDEX idx_topics_status ON topics(status);
CREATE INDEX idx_topics_created_at ON topics(created_at DESC);
CREATE INDEX idx_topics_title_search ON topics USING gin(to_tsvector('english', topic_title));
CREATE INDEX idx_topics_keywords_search ON topics USING GIN(keywords);
```

### Row Level Security (RLS) - Public Access for Phase 1
```sql
-- All tables secured with RLS but allow public access
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Public access policies for Phase 1 (no authentication required)
CREATE POLICY "Enable public access for Phase 1" ON topics
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Enable read access for public" ON app_config
  FOR SELECT TO public USING (true);
```

### Frontend Architecture (Simplified Implementation)

#### Next.js App Structure (Phase 1 Deployed)
```
src/
├── app/                           # Next.js 14 App Router
│   ├── globals.css               # ✅ Global Tailwind styles
│   ├── layout.tsx                # ✅ Root layout with Inter font
│   ├── page.tsx                  # ✅ Homepage with Phase 1 status
│   └── topics/                   # ✅ Topic management
│       └── page.tsx              # ✅ Complete topic management interface
├── components/                    # ✅ Reusable UI components
│   ├── ui/                       # ✅ Shadcn UI base components
│   │   ├── button.tsx           # ✅ Button variants
│   │   ├── input.tsx            # ✅ Form input with validation
│   │   ├── label.tsx            # ✅ Accessible form labels
│   │   ├── select.tsx           # ✅ Dropdown components
│   │   └── textarea.tsx         # ✅ Multi-line text input
│   ├── topic-form.tsx           # ✅ Simplified topic creation/editing
│   └── topic-dashboard.tsx      # ✅ Topic management with search
├── lib/                          # ✅ Utility functions and configs
│   ├── supabase.ts              # ✅ Supabase client configuration
│   ├── utils.ts                 # ✅ Utility functions
│   ├── validations/             # ✅ Form validation schemas
│   │   └── topic.ts             # ✅ Simplified Zod schemas
│   ├── supabase/                # ✅ Service layer
│   │   └── topics.ts            # ✅ Essential CRUD operations
│   └── types/                   # ✅ TypeScript definitions
│       └── database.ts          # ✅ Supabase generated types + helpers
```

#### Component Architecture (Streamlined)

**Essential UI Components (Shadcn UI)**:
- ✅ `Button`: Multiple variants with loading states
- ✅ `Input`: Form input with error styling
- ✅ `Select`: Accessible dropdown with keyboard navigation
- ✅ `Label`: Screen reader compatible labels
- ✅ `Textarea`: Multi-line input (reserved for future use)

**Feature Components (Simplified)**:
- ✅ `TopicForm`: Clean form with essential fields and real-time validation
- ✅ `TopicDashboard`: Responsive grid with search functionality

#### Business Logic Implementation

**Simplified Form Validation (Zod + React Hook Form)**:
```typescript
export const topicSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .trim(),
  keywords: z.string()
    .max(500, 'Keywords cannot exceed 500 characters')
    .optional()
    .or(z.literal('')),
  tone: z.string().optional(),
  length: z.string().optional(),
  template: z.string().optional(),
})

// Simplified filter schema (search only)
export const topicFilterSchema = z.object({
  search: z.string().optional(),
})
```

**Streamlined Service Layer**:
```typescript
export class TopicService {
  // ✅ Create topic with essential data
  static async createTopic(data: TopicFormData): Promise<{ data: Topic | null; error: string | null }>
  
  // ✅ Get topics with search (no complex filtering)
  static async getTopics(filters?: TopicFilterData): Promise<{ data: Topic[] | null; error: string | null }>
  
  // ✅ Get single topic by ID
  static async getTopic(id: string): Promise<{ data: Topic | null; error: string | null }>
  
  // ✅ Update topic with partial data
  static async updateTopic(id: string, data: Partial<TopicFormData>): Promise<{ data: Topic | null; error: string | null }>
  
  // ✅ Delete topic with confirmation
  static async deleteTopic(id: string): Promise<{ error: string | null }>
  
  // ✅ Get essential configuration values
  static async getConfigValues(): Promise<{ data: ConfigValues | null; error: string | null }>
}
```

**Data Transformation Helpers**:
```typescript
// Convert form data to database format
export function formDataToDbInsert(formData: TopicFormData): TopicInsert {
  return {
    topic_title: formData.title,
    keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()) : null,
    style_preferences: {
      tone: formData.tone || null,
      length: formData.length || null,
      template: formData.template || null,
    },
    status: 'pending'
  }
}

// Convert database data to form format
export function dbTopicToFormData(dbTopic: Topic): TopicFormData {
  return {
    title: dbTopic.topic_title,
    keywords: Array.isArray(dbTopic.keywords) ? dbTopic.keywords.join(', ') : '',
    tone: dbTopic.style_preferences?.tone || '',
    length: dbTopic.style_preferences?.length || '',
    template: dbTopic.style_preferences?.template || '',
  }
}
```

### Key Implementation Features

#### 1. Simplified User Experience
- **Essential Fields Only**: Focus on topic title, keywords, and basic style preferences
- **Clean Interface**: Removed complex filtering and metrics for Phase 1
- **Intuitive Navigation**: Simple dashboard with search functionality
- **Mobile-First Design**: Responsive layout that works on all devices

#### 2. Performance Optimizations
- **Debounced Search**: Prevents excessive API calls during typing (300ms delay)
- **Efficient Queries**: Simple database queries with basic indexing
- **Client-Side Caching**: Configuration values cached for better performance
- **Optimistic Updates**: UI updates immediately, syncs with server

#### 3. Data Management
- **JSON Storage**: Keywords stored as JSON array for efficient searching
- **Status Workflow**: Simple status system (pending, in_progress, completed, rejected)
- **Configuration Management**: Centralized dropdown values in app_config table
- **Clean Data Structure**: Normalized database design for future scalability

#### 4. Security Features
- **Row Level Security**: RLS enabled with public access policies for Phase 1
- **Input Validation**: Client and server-side validation for data integrity
- **SQL Injection Protection**: Parameterized queries via Supabase client
- **XSS Prevention**: React's built-in XSS protection + input sanitization

### Migration Files Applied

#### 001_initial_schema.sql
- Complete database schema with all tables
- RLS policies and security setup
- Basic indexes for performance

#### 002_phase1_topic_enhancements.sql  
- Enhanced topics table with style preferences
- Populated configuration values
- Additional performance indexes

#### 003_fix_rls_public_access.sql
- Updated RLS policies for public access (Phase 1)
- Maintains security framework while allowing open access
- Configurable for future authentication requirements

### Environment Configuration

```bash
# Required Environment Variables (Vercel)
NEXT_PUBLIC_SUPABASE_URL=https://znxfobkorgcjabaylpgk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Project Configuration
PROJECT_ID=znxfobkorgcjabaylpgk
DEPLOYMENT_URL=https://shopify-blog-cms.vercel.app
GITHUB_REPO=https://github.com/cdkodi/shopifyblog
```

### API Endpoints (Supabase Auto-Generated)

```bash
# Topics CRUD Operations
GET    /rest/v1/topics              # List topics with search
POST   /rest/v1/topics              # Create new topic
GET    /rest/v1/topics?id=eq.{id}   # Get single topic
PATCH  /rest/v1/topics?id=eq.{id}   # Update topic
DELETE /rest/v1/topics?id=eq.{id}   # Delete topic

# Configuration
GET    /rest/v1/app_config          # Get configuration values
```

### Future Architecture (Planned Phases)

#### Phase 2: AI-Powered Content Generation (Ready for Implementation)

**Multi-Provider AI Integration**:
- **Anthropic Claude**: Primary for analytical, structured content (How-to Guides, Buying Guides)
- **OpenAI GPT-4**: Primary for creative content (Product Showcase, Artist Showcase)
- **Google Gemini Pro**: Primary for research-based, high-volume content (Industry Trends)

**AI Architecture Components**:
```typescript
// AI Service Management
interface AIProvider {
  generateContent(prompt: string, options: GenerationOptions): Promise<AIResponse>;
  estimateCost(prompt: string): Promise<number>;
  validateApiKey(): Promise<boolean>;
}

// Multi-level provider selection
- Site-level default configuration
- Template-specific provider recommendations  
- Article-level user override capability
- Automatic fallback system for reliability
```

**Enhanced Database Schema**:
```sql
-- Articles table for AI-generated content
CREATE TABLE articles (
  id UUID PRIMARY KEY,
  topic_id UUID REFERENCES topics(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  ai_provider TEXT NOT NULL,
  ai_model TEXT NOT NULL,
  generation_cost DECIMAL(10,4),
  quality_score INTEGER CHECK (quality_score >= 1 AND quality_score <= 10),
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI provider configuration
INSERT INTO app_config (config_key, config_value) VALUES
('ai_providers', '{
  "anthropic": {"model": "claude-3-sonnet", "cost_per_1k": 0.015},
  "openai": {"model": "gpt-4-turbo", "cost_per_1k": 0.03},
  "google": {"model": "gemini-pro", "cost_per_1k": 0.0005}
}');
```

**Security Architecture**:
- Server-side API key storage (Vercel environment variables)
- Zero client exposure of sensitive credentials
- Rate limiting and usage monitoring
- Automatic failover and error handling

**Prompt Engineering Framework**:
- Dynamic prompt building based on Phase 1 topic data
- Template-specific prompt structures
- Tone adaptation matrix for consistent brand voice
- SEO-optimized content generation

#### Phase 3: Shopify Integration  
- Shopify API integration for product data
- Automated product-specific content generation
- Direct publishing to Shopify blogs
- Product catalog synchronization

#### Phase 4: Advanced Features
- User authentication and multi-user support
- Content scheduling and workflow management
- Advanced SEO optimization and performance tracking
- A/B testing for AI-generated content

#### Phase 5: Enterprise Features
- Team collaboration and approval workflows
- Advanced analytics and reporting
- Custom model fine-tuning
- Multi-modal content (text + images)

### Development Workflow

#### Local Development
```bash
# Setup
git clone https://github.com/cdkodi/shopifyblog.git
cd shopifyblog
npm install

# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run start           # Start production server
npm run lint            # ESLint checking
npm run type-check      # TypeScript validation
```

#### Deployment Pipeline
1. **Code Push**: Developer pushes to main branch
2. **GitHub Actions**: Automated testing and validation
3. **Vercel Build**: Automatic build and deployment
4. **Supabase Sync**: Database schema and data synchronization
5. **Production**: Live deployment with rollback capability

### Monitoring and Maintenance

#### Performance Monitoring
- **Vercel Analytics**: Page load times and user interactions
- **Supabase Metrics**: Database query performance and usage
- **Error Tracking**: Real-time error monitoring and alerting

#### Database Maintenance
- **Backup Strategy**: Automated daily backups via Supabase
- **Index Monitoring**: Query performance optimization
- **Schema Migrations**: Version-controlled database changes

---

**Version**: Phase 1 - Simplified Topic Management  
**Last Updated**: Current deployment  
**Status**: Production Ready ✅  
**Next Phase**: AI Content Generation (Phase 2)  
**AI Integration Details**: See [AIModel.md](./AIModel.md) for complete AI architecture documentation 