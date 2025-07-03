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

**Enhanced Writing Tones**:
- **Story Telling**: New tone for cultural/heritage content (Madhubani, Pichwai, etc.)
- **Contextual Adaptation**: AI adjusts style based on selected tone
- **Cultural Sensitivity**: Specialized prompts for traditional art content
- **Template Integration**: Tone influences both title and content generation

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
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Articles Management
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID REFERENCES topics(id),
  title TEXT NOT NULL,
  slug TEXT,
  content TEXT,
  excerpt TEXT,
  meta_description TEXT,
  featured_image TEXT,
  tags JSONB,
  keywords TEXT[],
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'published', 'archived')),
  word_count INTEGER,
  reading_time INTEGER,
  seo_score INTEGER,
  ai_provider TEXT,
  generation_cost DECIMAL(10,4),
  published_at TIMESTAMPTZ,
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

### Performance Optimizations

```sql
-- Critical Indexes for Query Performance
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_topic_id ON articles(topic_id);
CREATE INDEX idx_articles_created_at ON articles(created_at DESC);
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
│   │   └── product-integration-manager.tsx
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