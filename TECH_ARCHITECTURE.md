# Shopify Blog CMS - Technical Architecture

## System Overview

**Application Type**: Full-Stack Content Management System  
**Primary Use Case**: AI-powered blog content creation with Shopify product integration  
**Status**: Production Ready ✅  
**Live URL**: https://shopify-blog-cms.vercel.app  

## Technology Stack

### Frontend Framework
- **Next.js 14**: App Router architecture with React Server Components
- **TypeScript**: Full type safety throughout application
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn UI**: Professional component library
- **Framer Motion**: Animation and interaction library

### Backend & Database
- **Supabase**: PostgreSQL database with real-time capabilities
- **Row Level Security (RLS)**: Enterprise-grade data protection
- **Edge Functions**: Serverless API endpoints
- **Supabase Auth**: User authentication system (configured)

### AI Integration
- **Multi-Provider Support**: Anthropic Claude, OpenAI GPT, Google Gemini
- **Fallback System**: Automatic provider switching on failures
- **Cost Tracking**: Usage monitoring and optimization
- **Service Manager**: Centralized AI provider management

#### **Latest AI Features (December 2024)**

**AI Title Suggestions Service**:
- **Endpoint**: `/api/ai/suggest-titles`
- **Purpose**: Generate 6 SEO-optimized article titles from topic inputs
- **Intelligence**: Context-aware generation using topic, tone, template, keywords
- **Performance**: 2-second debounce, graceful fallbacks, TypeScript-safe
- **Integration**: Real-time suggestions in TopicFormEnhanced component
- **Fallback System**: Manual title templates when AI service unavailable

**Enhanced Writing Tones**:
- **Story Telling**: New tone for cultural/heritage content (Madhubani, Pichwai, etc.)
- **Contextual Adaptation**: AI adjusts style based on selected tone
- **Cultural Sensitivity**: Specialized prompts for traditional art content
- **Template Integration**: Tone influences both title and content generation

**Keyword Inheritance System** (New):
- **Single DataForSEO Call**: Eliminates duplicate API requests
- **Seamless UX**: Keywords flow from Topics to Content Generation
- **Visual Feedback**: Blue-themed UI shows inherited keyword source
- **Override Capability**: Users can research fresh keywords when needed
- **Cost Optimization**: 50% reduction in SEO API usage

### Deployment & Infrastructure
- **Vercel**: Serverless hosting with automatic deployments
- **GitHub Integration**: CI/CD pipeline with branch previews
- **Environment Management**: Separate dev/staging/production configs
- **CDN**: Global content distribution via Vercel Edge Network

## Database Architecture

### Core Schema

```sql
-- Topics Management
CREATE TABLE topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_title TEXT NOT NULL,
  description TEXT,
  target_audience TEXT,
  content_goals TEXT[],
  keywords TEXT[],
  notes TEXT,
  content_template TEXT, -- New: Direct template selection
  style_preferences JSONB,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'generated', 'published', 'archived')),
  used_at TIMESTAMPTZ, -- New: Tracks when topic was used for generation
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Articles Management
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_topic_id UUID REFERENCES topics(id), -- New: Links articles to source topics
  title TEXT NOT NULL,
  slug TEXT,
  content TEXT,
  excerpt TEXT,
  meta_description TEXT,
  featured_image TEXT,
  tags JSONB,
  target_keywords JSONB, -- Updated: Better JSON support
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
  word_count INTEGER,
  reading_time INTEGER,
  seo_score INTEGER,
  ai_provider TEXT,
  generation_cost DECIMAL(10,4),
  published_at TIMESTAMPTZ,
  scheduled_publish_date TIMESTAMPTZ,
  shopify_article_id BIGINT, -- New: Shopify integration
  shopify_blog_id BIGINT, -- New: Shopify integration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopify Product Integration
CREATE TABLE shopify_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopify_id BIGINT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  handle TEXT UNIQUE NOT NULL,
  description TEXT,
  product_type TEXT,
  collections JSONB,
  tags JSONB,
  images JSONB,
  price_min DECIMAL(10,2),
  price_max DECIMAL(10,2),
  inventory_quantity INTEGER,
  status TEXT NOT NULL CHECK (status IN ('active', 'draft', 'archived')),
  shopify_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced TIMESTAMPTZ DEFAULT NOW()
);

-- Product Suggestions
CREATE TABLE article_product_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES shopify_products(id) ON DELETE CASCADE,
  relevance_score DECIMAL(5,2) NOT NULL,
  suggestion_context TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  link_text TEXT,
  utm_parameters JSONB,
  position_in_content INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- SEO Keywords
CREATE TABLE seo_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  keyword TEXT NOT NULL,
  search_volume INTEGER,
  competition DECIMAL(3,2),
  cpc DECIMAL(10,2),
  trend_data JSONB,
  related_keywords JSONB,
  article_id UUID REFERENCES articles(id),
  topic_id UUID REFERENCES topics(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Templates
CREATE TABLE content_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  template_content TEXT NOT NULL,
  template_variables JSONB,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Application Configuration
CREATE TABLE app_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

-- Database Views for Topic-Article Relationships
CREATE OR REPLACE VIEW topics_with_article_status AS
SELECT 
  t.*,
  COUNT(a.id) as article_count,
  COUNT(CASE WHEN a.status = 'published' THEN 1 END) as published_article_count,
  CASE 
    WHEN COUNT(CASE WHEN a.status = 'published' THEN 1 END) > 0 THEN true 
    ELSE false 
  END as has_published_articles,
  MAX(a.published_at) as last_published_at,
  CASE 
    WHEN COUNT(CASE WHEN a.status = 'published' THEN 1 END) > 0 THEN 'published'
    WHEN COUNT(a.id) > 0 THEN 'generated'
    ELSE t.status
  END as topic_status
FROM topics t
LEFT JOIN articles a ON a.source_topic_id = t.id
GROUP BY t.id, t.topic_title, t.keywords, t.content_template, t.style_preferences, 
         t.competition_score, t.created_at, t.industry, t.market_segment, 
         t.priority_score, t.search_volume, t.status, t.used_at;

CREATE OR REPLACE VIEW articles_with_shopify_status AS
SELECT 
  a.*,
  CASE 
    WHEN a.shopify_article_id IS NOT NULL THEN 'published_to_shopify'
    ELSE a.status
  END as publishing_status,
  t.topic_title as source_topic_title,
  t.content_template as source_template
FROM articles a
LEFT JOIN topics t ON t.id = a.source_topic_id;
```

### Performance Optimizations

```sql
-- Critical Indexes for Query Performance
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_source_topic_id ON articles(source_topic_id); -- Updated
CREATE INDEX idx_articles_created_at ON articles(created_at DESC);
CREATE INDEX idx_articles_shopify_article_id ON articles(shopify_article_id); -- New
CREATE INDEX idx_topics_status ON topics(status); -- New
CREATE INDEX idx_topics_content_template ON topics(content_template); -- New
CREATE INDEX idx_shopify_products_status ON shopify_products(status);
CREATE INDEX idx_shopify_products_collections ON shopify_products USING GIN(collections);
CREATE INDEX idx_shopify_products_tags ON shopify_products USING GIN(tags);
CREATE INDEX idx_article_product_suggestions_article_id ON article_product_suggestions(article_id);
CREATE INDEX idx_article_product_suggestions_status ON article_product_suggestions(status);
CREATE INDEX idx_seo_keywords_article_id ON seo_keywords(article_id);
CREATE INDEX idx_seo_keywords_topic_id ON seo_keywords(topic_id);
```

### Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopify_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_product_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_keywords ENABLE ROW LEVEL SECURITY;

-- Public read access for shopify_products
CREATE POLICY "Enable public read access" ON shopify_products FOR SELECT TO public USING (true);
CREATE POLICY "Enable authenticated write access" ON shopify_products FOR ALL TO authenticated;

-- Public access for product suggestions
CREATE POLICY "Enable public read access" ON article_product_suggestions FOR SELECT TO public USING (true);
CREATE POLICY "Enable public write access" ON article_product_suggestions FOR ALL TO public USING (true);

-- Authenticated access for core content
CREATE POLICY "Enable authenticated access" ON topics FOR ALL TO authenticated;
CREATE POLICY "Enable authenticated access" ON articles FOR ALL TO authenticated;
CREATE POLICY "Enable authenticated access" ON seo_keywords FOR ALL TO authenticated;
```

## Topic-Article Linking System (New)

### Architecture Overview

**Purpose**: Complete traceability and workflow management from topic planning to article publishing.

**Key Components**:
- **Database Relations**: Foreign key linking articles to source topics
- **Status Tracking**: Automatic topic status updates (available → generated → published)
- **Dashboard Views**: Sectioned interface separating available vs published topics
- **Relationship UI**: Bidirectional navigation between topics and articles

### Implementation Details

```typescript
// Database relationship
interface Article {
  id: string;
  source_topic_id?: string; // Links to topics.id
  title: string;
  content: string;
  status: 'draft' | 'review' | 'approved' | 'published';
  shopify_article_id?: number;
  // ... other fields
}

interface Topic {
  id: string;
  topic_title: string;
  content_template: string; // Direct template selection
  status: 'active' | 'generated' | 'published';
  used_at?: string; // Timestamp when topic was used
  // ... other fields
}

// Enhanced view with article statistics
interface TopicWithArticleStatus extends Topic {
  article_count: number;
  published_article_count: number;
  has_published_articles: boolean;
  last_published_at?: string;
  topic_status: 'available' | 'generated' | 'published';
}
```

### Workflow Automation

```typescript
// Automatic status tracking
export const updateTopicStatus = async (topicId: string, status: 'generated' | 'published') => {
  await supabase
    .from('topics')
    .update({ 
      status,
      used_at: new Date().toISOString()
    })
    .eq('id', topicId);
};

// Article creation with topic linking
export const createArticleFromTopic = async (articleData: ArticleFormData) => {
  const { data: article } = await supabase
    .from('articles')
    .insert({
      ...articleData,
      source_topic_id: articleData.sourceTopicId
    });

  // Update topic status to 'generated'
  if (articleData.sourceTopicId) {
    await updateTopicStatus(articleData.sourceTopicId, 'generated');
  }

  return article;
};

// Shopify publishing with topic status update
export const publishToShopify = async (articleId: string) => {
  // ... Shopify publishing logic
  
  // Update topic status to 'published' if article came from topic
  const { data: article } = await supabase
    .from('articles')
    .select('source_topic_id')
    .eq('id', articleId)
    .single();

  if (article?.source_topic_id) {
    await updateTopicStatus(article.source_topic_id, 'published');
  }
};
```

### UI Components

- **TopicDashboard**: Sectioned view with Available/Published topics
- **TopicArticleLinks**: Relationship display and navigation component
- **Enhanced Topic Cards**: Status indicators, article counts, template badges
- **Article Editor**: Topic tab showing source topic and related articles

## Streamlined Template Selection (New)

### Architecture Changes

**Before**: Complex template mapping logic in content generation
**After**: Direct template selection in topic creation

```typescript
// Old approach - complex mapping
const mapTopicToTemplate = (topic: Topic): ContentTemplate => {
  // Complex logic to determine template from topic data
  if (topic.style_preferences?.template_type === 'Blog Post') {
    return getTemplate('how-to-guide');
  }
  // ... more mapping logic
};

// New approach - direct selection
interface Topic {
  content_template: string; // Direct template name
}

interface ContentConfiguration {
  topicId?: string;
  template?: string; // Auto-selected from topic
}

// Streamlined flow
const generateFromTopic = (topicId: string) => {
  const topic = await getTopicById(topicId);
  return {
    template: topic.content_template, // Direct usage
    topicId: topicId,
    // ... other config
  };
};
```

### Benefits

- **Eliminated Complexity**: No template mapping logic required
- **User Control**: Direct template selection in topic creation
- **Faster Generation**: Skip template selection step when coming from topics
- **Better UX**: Visual template cards with descriptions and icons
- **Consistency**: Same template used throughout topic → article workflow

## Application Architecture

### Directory Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Homepage dashboard
│   ├── topics/page.tsx           # Topic management
│   ├── content-generation/page.tsx # AI content generation
│   ├── articles/                 # Article management
│   │   ├── page.tsx              # Article library
│   │   └── [id]/edit/page.tsx    # Article editor
│   ├── editorial/page.tsx        # Editorial dashboard
│   ├── api/                      # API routes
│   │   ├── ai/generate-content/route.ts
│   │   ├── ai/test-service/route.ts
│   │   └── seo/keywords/route.ts
│   ├── layout.tsx                # Root layout
│   └── globals.css               # Global styles
├── components/                   # React components
│   ├── articles/                 # Article management
│   │   ├── article-list.tsx
│   │   ├── article-review-dashboard.tsx
│   │   ├── article-stats.tsx
│   │   ├── product-integration-manager.tsx
│   │   ├── shopify-integration.tsx
│   │   └── topic-article-links.tsx # New: Topic-article relationships
│   ├── content-generation/       # Content generation
│   │   ├── content-configuration.tsx
│   │   ├── content-editor.tsx
│   │   ├── content-generator.tsx
│   │   ├── content-preview.tsx
│   │   ├── generation-config.tsx
│   │   ├── product-selector.tsx
│   │   └── template-selector.tsx
│   ├── ui/                       # Shadcn UI components
│   │   ├── alert-dialog.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── navigation.tsx
│   │   ├── select.tsx
│   │   └── textarea.tsx
│   ├── topic-dashboard.tsx
│   ├── topic-form-enhanced.tsx
│   └── topic-form.tsx
├── lib/                          # Utility libraries
│   ├── ai/                       # AI service management
│   │   ├── ai-service-manager.ts
│   │   ├── index.ts
│   │   ├── product-aware-prompts.ts
│   │   ├── providers/
│   │   │   ├── anthropic-provider.ts
│   │   │   ├── base-provider.ts
│   │   │   ├── google-provider.ts
│   │   │   └── openai-provider.ts
│   │   └── types.ts
│   ├── publishing/
│   │   └── blog-integration.ts
│   ├── seo/
│   │   ├── dataforseo-service.ts
│   │   ├── index.ts
│   │   └── types.ts
│   ├── supabase/                 # Database operations
│   │   ├── articles.ts
│   │   ├── content-templates.ts
│   │   ├── shopify-products.ts
│   │   └── topics.ts
│   ├── types/
│   │   └── database.ts
│   ├── validations/
│   │   └── topic.ts
│   ├── supabase.ts               # Supabase client
│   └── utils.ts                  # Utility functions
```

## AI Service Architecture

### Service Manager Pattern

```typescript
interface AIProvider {
  name: string;
  generateContent(prompt: string, options?: GenerationOptions): Promise<AIResponse>;
  isHealthy(): Promise<boolean>;
  calculateCost(tokens: number): number;
}

class AIServiceManager {
  private providers: Map<string, AIProvider>;
  private fallbackOrder: string[];
  
  async generateContent(
    prompt: string, 
    preferredProvider?: string
  ): Promise<AIResponse> {
    const providers = this.getProvidersInOrder(preferredProvider);
    
    for (const providerName of providers) {
      try {
        const provider = this.providers.get(providerName);
        if (await provider.isHealthy()) {
          return await provider.generateContent(prompt);
        }
      } catch (error) {
        console.warn(`Provider ${providerName} failed:`, error);
        continue;
      }
    }
    
    throw new Error('All AI providers failed');
  }
}
```

### Provider Implementations

- **Anthropic Provider**: Claude 3.5 Sonnet integration
- **OpenAI Provider**: GPT-4 and GPT-3.5 Turbo support
- **Google Provider**: Gemini Pro integration
- **Base Provider**: Common interface and error handling

### Product-Aware Prompting

```typescript
export const buildProductAwarePrompt = (
  basePrompt: string,
  products: Product[],
  integrationStyle: 'contextual' | 'showcase' | 'subtle'
): string => {
  const productContext = products.map(product => ({
    title: product.title,
    description: product.description,
    tags: product.tags,
    price: formatPrice(product.price_min, product.price_max),
    collections: product.collections
  }));

  return `${basePrompt}

PRODUCT INTEGRATION CONTEXT:
${JSON.stringify(productContext, null, 2)}

Integration Style: ${integrationStyle}
Instructions: Naturally incorporate these products where relevant...`;
};
```

## Shopify Integration

### Hybrid GraphQL/REST Architecture

**Status**: ✅ Production Ready  
**Approach**: Hybrid GraphQL/REST implementation  
**Rationale**: GraphQL Admin API doesn't support blog article mutations  

#### Implementation Strategy

```typescript
/**
 * Shopify GraphQL Client with Hybrid Approach
 * 
 * Uses GraphQL for reading data (blogs, articles) - supported by Admin API
 * Uses REST API for mutations (create, update, delete articles) - required
 * 
 * See: https://shopify.dev/docs/api/admin-graphql/latest/queries/blogs
 */
class ShopifyGraphQLClient {
  // ✅ GraphQL for reading operations
  async getBlogs(): Promise<ShopifyBlog[]>
  async getArticles(blogId: string): Promise<ShopifyArticle[]>
  
  // ✅ REST API for mutation operations  
  async createArticle(blogId: string, article: ShopifyArticleInput): Promise<ShopifyArticle>
  async updateArticle(articleId: string, article: Partial<ShopifyArticleInput>): Promise<ShopifyArticle>
  async deleteArticle(articleId: string): Promise<boolean>
}
```

#### API Integration Points

**GraphQL Endpoints** (Reading):
- `/admin/api/2024-10/graphql.json` - Blog and article queries
- Supported operations: `blogs`, `blog`, `articles`, `article`
- Error handling with exponential backoff retry logic

**REST Endpoints** (Mutations):
- `/admin/api/2024-10/blogs/{blog_id}/articles.json` - Article creation
- `/admin/api/2024-10/articles/{article_id}.json` - Article updates/deletion
- Field mapping between CMS and Shopify formats

#### Database Schema Updates

```sql
-- Shopify integration fields added to articles table
ALTER TABLE articles ADD COLUMN shopify_article_id BIGINT;
ALTER TABLE articles ADD COLUMN shopify_blog_id BIGINT;

-- Performance indexes
CREATE INDEX idx_articles_shopify_article_id ON articles(shopify_article_id);
CREATE INDEX idx_articles_shopify_blog_id ON articles(shopify_blog_id);

-- Computed view for sync status
CREATE VIEW articles_with_shopify_status AS
SELECT 
  *,
  CASE 
    WHEN shopify_article_id IS NOT NULL THEN 'published'
    ELSE 'not_published'
  END as shopify_status,
  CASE 
    WHEN shopify_article_id IS NOT NULL THEN true
    ELSE false
  END as is_published_to_shopify
FROM articles;
```

#### Frontend Integration

**Shopify Integration Component**:
- Blog selection dropdown with auto-loading
- Publish/Update/Delete functionality with loading states  
- Real-time status indicators (Published/Not Published badges)
- Error/success messaging with dismissible alerts
- Direct links to Shopify admin
- Integrated into article edit page

**API Routes**:
- `/api/shopify/blogs` - List and create blogs
- `/api/shopify/articles` - Publish, update, delete articles
- `/api/shopify/test-connection` - Connection testing
- `/api/shopify/debug` - Environment and connection debugging
- `/api/shopify/test-blogs` - Blog-specific testing endpoint

#### Error Handling & Resilience

**Retry Logic**:
```typescript
private async executeWithRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (this.isRateLimitError(error) && attempt < this.maxRetries) {
        const delay = this.calculateBackoffDelay(attempt);
        await this.sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

**Fallback Mechanisms**:
- GraphQL query failures fall back to known blog information
- Rate limit detection with automatic retry
- Comprehensive error logging and user feedback
- Graceful degradation when Shopify is unavailable

### Database Import Scripts

Located in `shopify-scripts/` directory:

1. **shopify-data-import-complete.js**: Full catalog import (30 products)
2. **shopify-data-import-simple.js**: Curated selection (8 products)
3. **fix-product-prices.js**: Price data correction utility
4. **verify-import-success.js**: Import verification and analytics
5. **enforce-rls-security.js**: Production security enforcement
6. **fix-rls-and-import.js**: Development RLS helper

### Product Data Structure

```typescript
interface ShopifyProduct {
  id: string;
  shopify_id: number;
  title: string;
  handle: string;
  description: string;
  product_type: string;
  collections: string[];
  tags: string[];
  images: {
    src: string;
    alt: string;
  }[];
  price_min: number;
  price_max: number;
  inventory_quantity: number;
  status: 'active' | 'draft' | 'archived';
  shopify_url: string;
}
```

### Current Product Catalog

**Total Products**: 30 authentic Indian art and decor items from Culturati.in
**Price Range**: ₹750 - ₹150,000
**Categories**:
- Pichwai Art: 12 products (premium traditional paintings)
- Religious Idols: 4 products (decorative items)
- Wall Hangings: 5 products (home decor)
- Elephant Stools: 4 products (furniture sets)
- Heritage Crafts: 2 products (traditional measuring sets)
- Pooja Accessories: 2 products (ritual items)

### Relevance Scoring Algorithm

```typescript
const calculateRelevanceScore = (product: ShopifyProduct, keywords: string[]): number => {
  let score = 0;
  
  // Title matching: +10 points per keyword
  keywords.forEach(keyword => {
    if (product.title.toLowerCase().includes(keyword.toLowerCase())) {
      score += 10;
    }
  });
  
  // Tag matching: +5 points per keyword
  if (product.tags) {
    product.tags.forEach(tag => {
      keywords.forEach(keyword => {
        if (tag.toLowerCase().includes(keyword.toLowerCase())) {
          score += 5;
        }
      });
    });
  }
  
  // Collection matching: +7 points per keyword
  if (product.collections) {
    product.collections.forEach(collection => {
      keywords.forEach(keyword => {
        if (collection.toLowerCase().includes(keyword.toLowerCase())) {
          score += 7;
        }
      });
    });
  }
  
  // Description matching: +3 points per keyword
  if (product.description) {
    keywords.forEach(keyword => {
      if (product.description.toLowerCase().includes(keyword.toLowerCase())) {
        score += 3;
      }
    });
  }
  
  return score;
};
```

## Security Implementation

### Authentication & Authorization
- **Supabase Auth**: Email/password, OAuth providers supported
- **Row Level Security**: Table-level access control
- **API Route Protection**: Middleware-based authentication
- **Environment Variables**: Secure secret management

### Data Protection
- **Input Validation**: Zod schema validation throughout
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Protection**: Input sanitization and output encoding
- **Rate Limiting**: API endpoint throttling (planned)

### Production Security Measures
- **HTTPS Only**: SSL/TLS encryption enforced
- **Secure Headers**: HSTS, CSP, X-Frame-Options
- **Environment Separation**: Dev/staging/prod isolation
- **Secret Rotation**: Regular API key updates (planned)

## Performance Optimization

### Frontend Performance
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: webpack-bundle-analyzer integration
- **Lazy Loading**: React.lazy for heavy components

### Database Performance
- **Query Optimization**: Indexed queries for common operations
- **Connection Pooling**: Supabase connection management
- **Caching Strategy**: React Query for API caching (planned)
- **Database Monitoring**: Supabase performance insights

### API Performance
- **Response Compression**: Automatic gzip compression
- **Edge Functions**: Serverless compute optimization
- **CDN Caching**: Static asset delivery via Vercel Edge

## Deployment Architecture

### Vercel Configuration

```json
{
  "builds": [
    {
      "src": "next.config.js",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    }
  ]
}
```

### Environment Variables

**Required for Production**:
```env
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Providers
ANTHROPIC_API_KEY=your_anthropic_key
OPENAI_API_KEY=your_openai_key
GOOGLE_API_KEY=your_google_key

# Shopify Integration
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_shopify_access_token
SHOPIFY_API_VERSION=2024-10
SHOPIFY_DEFAULT_BLOG_ID=your_blog_id

# SEO Service (Optional)
DATAFORSEO_EMAIL=your_email
DATAFORSEO_PASSWORD=your_password

# Configuration
AI_DEFAULT_PROVIDER=anthropic
AI_ENABLE_FALLBACKS=true
AI_ENABLE_COST_TRACKING=true
```

### CI/CD Pipeline

1. **GitHub Integration**: Automatic deployments on push to main
2. **Branch Previews**: Staging environments for pull requests
3. **Build Optimization**: Next.js optimization and minification
4. **Error Monitoring**: Vercel analytics and error tracking

## Keyword Inheritance System

### Overview

The keyword inheritance system solves the critical UX issue where users' keyword selections were being lost due to duplicate DataForSEO API calls when transitioning from Topics to Content Generation.

### Architecture

**Problem Solved**:
- **Before**: DataForSEO called twice (Topics + Content Generation)
- **After**: Single DataForSEO call per user journey
- **UX Improvement**: User selections preserved throughout workflow
- **Cost Optimization**: Reduced API calls by 50%

### Implementation Components

#### Detection Logic
```typescript
// In GenerationConfig component
const comingFromTopics = !!(initialData?.targetKeyword || 
  (initialData?.relatedKeywords && initialData.relatedKeywords.length > 0));

const [allowNewResearch, setAllowNewResearch] = useState(!comingFromTopics);
```

#### State Management
```typescript
useEffect(() => {
  const performKeywordResearch = async () => {
    // Skip if user came from Topics with pre-selected keywords
    if (!allowNewResearch) return;
    if (!config.topic || config.topic.length < 3) return;
    
    // Only perform research for direct Content Generation access
    // ... research logic
  };
}, [config.topic, allowNewResearch]);
```

#### Override Functionality
```typescript
const performNewKeywordResearch = async () => {
  // Allow users to override inherited keywords
  setAllowNewResearch(true);
  // ... fresh research logic
};
```

### User Experience Flow

1. **Topics Page**: User researches keywords via DataForSEO
2. **Generate Button**: Keywords passed via URL parameters
3. **Content Generation**: 
   - Detects inherited keywords
   - Shows blue-themed "Keywords from Topics" UI
   - Skips automatic DataForSEO research
   - Provides "Research new keywords" override button

### Visual Design System

**Inherited Keywords UI**:
```tsx
{comingFromTopics && !allowNewResearch && (
  <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
    <div className="flex items-center justify-between">
      <div className="text-sm font-medium text-blue-800">
        🎯 Keywords from Topics:
      </div>
      <Button onClick={performNewKeywordResearch}>
        Research new keywords
      </Button>
    </div>
    {/* Keyword display with blue theming */}
  </div>
)}
```

**Page Notifications**:
- **Step 1**: Shows inherited keywords in topic notification
- **Step 2**: Enhanced notification with keyword badges
- **Visual Distinction**: Blue theme for inherited vs standard for fresh

### API Optimization

**Single Call Pattern**:
- **Condition**: `if (comingFromTopics && hasKeywords) skipResearch()`
- **URL Parameter Detection**: `keywords` parameter indicates inheritance
- **State Preservation**: Keywords maintained through component lifecycle
- **Override Option**: Users can trigger fresh research if needed

### Error Handling

```typescript
try {
  // Research logic with fallbacks
} catch (error) {
  setKeywordError('Failed to fetch new keyword data. Using current keywords.');
  // Graceful degradation to inherited keywords
}
```

### Performance Benefits

1. **Reduced API Calls**: 50% reduction in DataForSEO usage
2. **Faster UX**: No waiting for duplicate research
3. **Cost Savings**: Lower third-party API costs
4. **Better Caching**: Single research result used across workflow

## API Documentation

### Core Endpoints

```typescript
// Content Generation
POST /api/ai/generate-content
{
  prompt: string;
  template?: string;
  tone?: string;
  length?: number;
  keywords?: string[];
  includeProducts?: boolean;
  preferredProvider?: 'anthropic' | 'openai' | 'google';
}

// SEO Keywords
GET /api/seo/keywords?topic=string
{
  keywords: Array<{
    keyword: string;
    searchVolume: number;
    competition: number;
    relatedKeywords: string[];
  }>;
}

// AI Service Health
GET /api/ai/test-service
{
  availableProviders: string[];
  healthStatus: Record<string, boolean>;
  environmentVariables: Record<string, boolean>;
}
```

## Monitoring & Analytics

### Application Monitoring
- **Vercel Analytics**: Performance and usage metrics
- **Error Tracking**: Automatic error reporting
- **Performance Monitoring**: Core Web Vitals tracking
- **Custom Events**: User interaction analytics

### Database Monitoring
- **Supabase Dashboard**: Query performance and usage
- **Connection Monitoring**: Pool utilization tracking
- **Storage Analytics**: Database size and growth trends

### AI Service Monitoring
- **Provider Health Checks**: Automatic availability testing
- **Cost Tracking**: Token usage and expense monitoring
- **Performance Metrics**: Response time and success rates
- **Usage Analytics**: Provider selection and fallback statistics

## Development Workflow

### Local Development Setup

```bash
# 1. Clone repository
git clone <repository-url>
cd shopify-blog-cms

# 2. Install dependencies
npm install

# 3. Environment setup
cp .env.example .env.local
# Configure your environment variables

# 4. Database setup
# Apply migrations in Supabase dashboard
# Import sample data using shopify-scripts

# 5. Start development server
npm run dev
```

### Code Quality Standards

- **TypeScript**: Strict mode enabled, full type coverage
- **ESLint**: Custom configuration with Next.js rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality gates
- **Testing**: Jest and React Testing Library (planned)

### Git Workflow

1. **Feature Branches**: All development in feature branches
2. **Pull Requests**: Required for main branch merges
3. **Code Review**: Peer review process
4. **Automated Checks**: ESLint, TypeScript, build verification
5. **Deployment**: Automatic deployment on main branch merge

## Scalability Considerations

### Horizontal Scaling
- **Serverless Architecture**: Automatic scaling via Vercel
- **Database Scaling**: Supabase handles connection scaling
- **CDN Distribution**: Global edge network for assets
- **API Rate Limiting**: Prevents abuse and ensures stability

### Vertical Scaling
- **Database Optimization**: Query tuning and indexing
- **Caching Layers**: Redis integration (planned)
- **Background Jobs**: Queue system for heavy operations (planned)
- **Microservices**: Service decomposition as needed (future)

### Cost Optimization
- **AI Provider Management**: Cost-aware provider selection
- **Database Query Optimization**: Reduced connection overhead
- **Asset Optimization**: Compressed images and code bundles
- **Caching Strategy**: Reduced API calls through smart caching

## Future Architecture Plans

### Phase 3: Advanced SEO & Analytics
- **DataForSEO Integration**: Professional keyword research
- **Analytics Dashboard**: Content performance tracking
- **SEO Scoring**: Advanced optimization algorithms
- **Competitive Analysis**: Market positioning insights

### Phase 4: Enhanced Content Features
- **Rich Media Support**: Image/video management via Supabase Storage
- **Content Versioning**: Track changes and revisions
- **Collaboration Tools**: Multi-user editing workflows
- **Publishing Automation**: Scheduled content releases

### Phase 5: Advanced Integrations
- **Direct Shopify Publishing**: Blog integration with Shopify Admin API
- **WordPress Export**: Content migration and synchronization
- **Social Media Integration**: Auto-posting to platforms
- **Email Newsletter**: Content distribution automation
- **REST API**: External integrations and headless CMS usage

### SEO Score Calculation Logic (2024 Update)

- **Keyword Density**: Now uses a tiered scoring system:
  - 1-2% = 100 points (optimal)
  - 0.5-1% = 60-100 points (good)
  - 2-3% = 50-100 points (slightly over-optimized)
  - >3% = <50 points (penalized)
- **Previous Flaw**: Treated density as raw points (e.g., 2.2% = 2.2/100).
- **Current**: 2.2% = ~50/100, matching SEO best practices.

### Markdown Rendering in Content Preview

- **Function**: `formatInlineMarkdown()`
- **Features**: Converts markdown to HTML for bold, italics, code, and links.
- **Impact**: No more double asterisks; content preview matches published look.

## 🔍 **Latest Technical Updates - January 2025**

### **Shopify Meta Description Integration**

#### **Problem & Solution**
**Issue**: Meta descriptions were not appearing in Shopify blog articles because the `excerpt` field doesn't automatically become the HTML meta description tag that search engines and social media platforms read.

**Solution**: Implemented proper SEO metafields using Shopify's `global.description_tag` metafield, which is the standard way Shopify themes handle meta descriptions.

#### **Technical Implementation**

**API Methods Added**:
```typescript
// ShopifyGraphQLClient enhancements
private async setArticleSEOMetaDescription(articleId: number, description: string): Promise<void> {
  const metafieldData = {
    metafield: {
      namespace: 'global',
      key: 'description_tag',
      value: description,
      type: 'single_line_text_field'
    }
  };
  
  const response = await fetch(`${this.shopifyUrl}/admin/api/2024-10/articles/${articleId}/metafields.json`, {
    method: 'POST',
    headers: this.getHeaders(),
    body: JSON.stringify(metafieldData)
  });
}

async updateArticleMetaDescription(articleId: string, description: string): Promise<boolean> {
  const mutation = `
    mutation articleUpdate($id: ID!, $article: ArticleInput!) {
      articleUpdate(id: $id, article: $article) {
        article {
          id
          seo {
            description
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  // GraphQL mutation implementation
}
```

**Integration Points**:
- **Article Creation**: Automatically sets meta description when publishing to Shopify
- **Article Updates**: Updates meta description when article content changes
- **Dual API Support**: Both REST API (for metafields) and GraphQL (for article updates)
- **Error Handling**: Graceful fallback if metafield creation fails

**Database Schema**: No changes required - uses existing `meta_description` field from articles table.

#### **Fix Utility Implementation**

**New Endpoint**: `/api/shopify/fix-meta-descriptions`
```typescript
// Fixes existing articles that were published before this enhancement
export async function POST(request: Request) {
  try {
    // Get all articles with Shopify article IDs but missing meta description metafields
    const { data: articles } = await supabase
      .from('articles')
      .select('id, shopify_article_id, meta_description')
      .not('shopify_article_id', 'is', null)
      .not('meta_description', 'is', null);

    const results = [];
    for (const article of articles) {
      const success = await shopifyClient.setArticleSEOMetaDescription(
        article.shopify_article_id,
        article.meta_description
      );
      results.push({ articleId: article.id, success });
    }

    return NextResponse.json({ 
      message: 'Meta descriptions updated',
      results 
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### **Content Quality & AI Enhancement**

#### **Problem & Solution**
**Issue**: AI was generating generic, repetitive titles and meta descriptions using patterns like "Complete Guide to..." and "Learn about..." despite previous attempts to fix this.

**Root Cause**: Generic patterns were embedded in multiple locations:
- AI prompt templates
- Fallback text in components
- Content preview examples
- Title suggestion systems

**Solution**: Comprehensive pattern elimination with cultural focus enhancement.

#### **AI Prompt Enhancement**

**Before (Generic)**:
```typescript
const prompt = `
Create an engaging article about ${topic}.
TITLE: [Create an engaging, SEO-optimized title]
META_DESCRIPTION: [Write a compelling 150-160 character meta description]
`;
```

**After (Cultural Focus)**:
```typescript
const prompt = `
Create an engaging article about ${topic} that focuses on cultural significance, artistic techniques, and historical importance.

TITLE: [Create a specific, engaging title that focuses on cultural significance, artistic techniques, or historical importance. AVOID generic patterns like "Complete Guide to..." or "Ultimate Guide to...". Instead use patterns like "The Art of...", "Cultural Heritage of...", "Traditional Techniques of...", "Why [Topic] Continues to Inspire..."]

META_DESCRIPTION: [Write a compelling 150-160 character meta description that focuses on cultural heritage, artistic significance, and traditional craftsmanship. AVOID starting with "Learn about..." or "Discover everything about...". Instead use patterns like "Explore the rich cultural heritage of...", "Discover the artistic significance of...", "Understand the traditional techniques of..."]
`;
```

#### **Component Updates**

**Content Preview Component**:
```typescript
// Before
const fallbackTitle = `Complete Guide to ${topic}`;
const fallbackDescription = `Learn about ${topic} and discover everything you need to know.`;

// After
const fallbackTitle = `Cultural Heritage and Modern Appeal of ${topic}`;
const fallbackDescription = `Explore the rich cultural heritage and artistic significance of ${topic} in traditional craftsmanship.`;
```

**Content Configuration Component**:
```typescript
// Before
const titleSuggestions = [
  `Complete Guide to ${topic}`,
  `Ultimate ${topic} Guide`,
  `Everything About ${topic}`
];

// After
const titleSuggestions = [
  `The Art of ${topic}: Traditional Techniques and Cultural Heritage`,
  `Cultural Heritage of ${topic}: Artistic Significance and Modern Relevance`,
  `Traditional Techniques of ${topic}: From History to Today`
];
```

#### **Files Modified**

**AI Generation**:
- `src/app/api/ai/generate-content/route.ts` - Enhanced prompts with cultural guidance
- `src/app/api/ai/suggest-titles/route.ts` - Updated fallback title patterns

**Components**:
- `src/components/content-generation/content-preview.tsx` - Cultural preview patterns
- `src/components/content-generation/content-configuration.tsx` - Removed generic suggestions
- `src/components/content-generation/content-generator.tsx` - Updated meta description fallbacks

**Shopify Integration**:
- `src/lib/shopify/graphql-client.ts` - Added SEO metafield methods
- `src/app/api/shopify/fix-meta-descriptions/route.ts` - New utility endpoint

#### **Expected Impact**

**SEO Improvements**:
- Meta descriptions now appear in search results
- Better click-through rates from search engines
- Improved social media sharing previews
- Enhanced Shopify admin interface visibility

**Content Quality**:
- More engaging, culturally-relevant titles
- Elimination of generic, repetitive patterns
- Better user engagement with specific content
- Improved brand perception through quality content

**Technical Benefits**:
- Proper Shopify metafield integration
- Dual API support for maximum compatibility
- Automatic setup for new articles
- Fix utility for existing content

---

## 🏗️ **System Architecture Overview**