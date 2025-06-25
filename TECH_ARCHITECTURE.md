# Shopify Blog Content Management System - Technical Architecture

## Overview

This document outlines the technical architecture for a comprehensive blog content management system designed to integrate with Shopify, optimize for SEO, and streamline content creation workflows.

**Current Status: Phase 1 - Topic Input & Style Preferences**

## System Architecture

### Tech Stack
- **Frontend**: Next.js 14+ with App Router, React 18+, TypeScript 5+
- **UI Framework**: Shadcn UI + Tailwind CSS + Framer Motion
- **Backend**: Supabase (PostgreSQL + Authentication + API)
- **Forms**: React Hook Form + Zod validation
- **State Management**: React Query (TanStack Query) + React Context
- **Integration**: Shopify Admin API (Future)
- **Deployment**: Vercel + Supabase

### Vercel Deployment Stack
- **Platform**: Vercel (Next.js optimized)
- **Database**: Supabase PostgreSQL (managed)  
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (for future image uploads)
- **Environment Variables**: Vercel Environment Variables
- **Domain**: Custom domain via Vercel
- **Analytics**: Vercel Analytics (built-in)
- **Monitoring**: Vercel Functions monitoring

### Core Components
1. **Database Layer** - Supabase PostgreSQL with enhanced schema
2. **API Layer** - Supabase REST/GraphQL APIs + Next.js API routes
3. **Authentication** - Supabase Auth with Row Level Security
4. **Frontend Application** - Next.js React App with SSR/SSG
5. **Form Management** - React Hook Form with real-time validation
6. **External Integration** - Shopify Admin API (Future phases)

## Phase 1: Foundation App Architecture

### Enhanced Database Schema

#### Updated Topics Table
**Purpose**: Enhanced content planning with user input and style preferences

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | UUID | ✅ | Primary key (auto-generated) |
| `topic_title` | TEXT | ✅ | **REQUIRED** - Topic/subject title |
| `keywords` | JSONB | ❌ | Optional keywords array |
| `industry` | TEXT | ❌ | Industry classification (Fashion, Electronics, etc.) |
| `market_segment` | TEXT | ❌ | Market segment (B2B, B2C, Luxury, etc.) |
| `style_preferences` | JSONB | ❌ | Style configuration object |
| `search_volume` | INTEGER | ❌ | For future API integration |
| `competition_score` | DECIMAL(3,2) | ❌ | For future SEO analysis |
| `priority_score` | INTEGER | ❌ | User-defined priority (0-10) |
| `status` | TEXT | ❌ | Workflow status (pending/in_progress/completed) |
| `created_at` | TIMESTAMPTZ | ✅ | Creation timestamp |
| `used_at` | TIMESTAMPTZ | ❌ | When used for content generation |

#### Style Preferences JSON Structure
```json
{
  "tone": "Professional | Casual | Friendly | Authoritative | Conversational | Educational",
  "length": "Short (500-800 words) | Medium (800-1500 words) | Long (1500-3000 words) | Extended (3000+ words)",
  "target_audience": "General Consumers | Industry Professionals | Beginners | Experts | Small Business Owners | Tech Enthusiasts",
  "template_type": "Product Showcase | How-to Guide | Buying Guide | Industry Trends | Problem-Solution | Comparison Article | Review Article | Seasonal Content",
  "custom_notes": "Optional custom instructions for content generation"
}
```

#### Configuration Values (app_config table)
| Config Key | Values | Purpose |
|------------|--------|---------|
| `style_tones` | 6 tone options | Dropdown values for article tone |
| `article_lengths` | 4 length options | Content length specifications |
| `target_audiences` | 6 audience types | Target demographic selection |
| `content_templates` | 8 template types | E-commerce focused templates |
| `industries` | 10 industry categories | Industry classification |
| `market_segments` | 8 segment types | Market positioning |

### Frontend Architecture

#### Next.js App Structure (Phase 1)
```
src/
├── app/                           # Next.js 14 App Router
│   ├── globals.css               # Global Tailwind styles
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Home/dashboard page
│   ├── topics/                   # Topic management
│   │   ├── page.tsx             # Topics list/dashboard
│   │   ├── new/
│   │   │   └── page.tsx         # New topic form page
│   │   └── [id]/
│   │       ├── page.tsx         # Topic detail view
│   │       └── edit/
│   │           └── page.tsx      # Edit topic form
│   └── api/                      # API routes (if needed)
├── components/                    # Reusable UI components
│   ├── ui/                       # Shadcn UI base components
│   │   ├── button.tsx           # Button component
│   │   ├── input.tsx            # Input component
│   │   ├── form.tsx             # Form components
│   │   └── ...                  # Other UI primitives
│   ├── forms/                    # Form-specific components
│   │   ├── topic-form.tsx       # Main topic input form
│   │   ├── style-selector.tsx   # Style preferences component
│   │   └── topic-list.tsx       # Topics display component
│   └── layout/                   # Layout components
│       ├── navbar.tsx           # Navigation component
│       └── sidebar.tsx          # Sidebar navigation
├── lib/                          # Utility functions and configs
│   ├── supabase.ts              # Supabase client configuration
│   ├── utils.ts                 # General utility functions
│   ├── validations/             # Form validation schemas
│   │   └── topic-schema.ts      # Zod schemas for topic forms
│   └── types/                   # TypeScript definitions
│       ├── database.ts          # Database type definitions
│       └── forms.ts             # Form type definitions
└── hooks/                        # Custom React hooks
    ├── use-topics.ts            # Topic management hooks
    └── use-config.ts            # Configuration fetching hooks
```

#### Key Technologies Integration

**React Hook Form + Zod:**
```typescript
// Form validation with Zod
const TopicFormSchema = z.object({
  topic_title: z.string().min(5, "Title must be at least 5 characters"),
  keywords: z.array(z.string()).optional(),
  industry: z.string().optional(),
  market_segment: z.string().optional(),
  style_preferences: StylePreferencesSchema,
})

// React Hook Form integration
const form = useForm<TopicFormData>({
  resolver: zodResolver(TopicFormSchema),
  defaultValues: {...}
})
```

**Supabase Integration:**
```typescript
// Real-time topic updates
const { data: topics, error } = useQuery({
  queryKey: ['topics'],
  queryFn: () => supabase.from('topics').select('*')
})

// Real-time subscriptions
useEffect(() => {
  const subscription = supabase
    .channel('topics_changes')
    .on('postgres_changes', { 
      event: '*', 
      schema: 'public', 
      table: 'topics' 
    }, (payload) => {
      queryClient.invalidateQueries(['topics'])
    })
    .subscribe()
}, [])
```

## Performance Optimizations

### Database Indexes (Updated)
- `idx_articles_status` - Fast filtering by article status
- `idx_articles_created_at` - Efficient date-based sorting  
- `idx_topics_priority` - Quick priority-based ordering
- `idx_topics_industry` - **NEW** - Industry filtering
- `idx_topics_market_segment` - **NEW** - Market segment filtering
- `idx_topics_style_preferences` - **NEW** - GIN index for JSON queries
- `idx_workflow_logs_created_at` - Fast log retrieval

### Frontend Performance
- **Server Components** - Default to RSC for better performance
- **Client Components** - Only for interactive forms and real-time updates
- **React Query** - Aggressive caching with background updates
- **Code Splitting** - Dynamic imports for heavy components
- **Image Optimization** - Next.js Image component (future phases)

## Deployment Architecture (Vercel)

### Environment Configuration
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Configuration
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret

# Future: Shopify Integration
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=your_token
```

### Vercel Deployment Features
- **Automatic Deployments** - Git push triggers deployment
- **Preview Deployments** - Every PR gets a preview URL
- **Edge Functions** - For API routes and middleware
- **Analytics** - Built-in performance monitoring
- **Custom Domains** - Professional domain configuration

### Build Configuration (vercel.json)
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "nodejs18.x"
    }
  }
}
```

## Security Architecture (Enhanced)

### Row Level Security Policies
All existing tables plus enhanced topic security:

| Table | Access Level | Policy Updates |
|-------|-------------|----------------|
| `articles` | Full Access | Authenticated users (CRUD) |
| `topics` | **Enhanced** | Authenticated users (CRUD) + user filtering |
| `content_templates` | Full Access | Authenticated users (CRUD) |
| `workflow_logs` | Read-Only | Authenticated users (SELECT) |
| `app_config` | **Enhanced** | Authenticated users (SELECT) + public config access |

### Frontend Security
- **Input Validation** - Zod schemas with sanitization
- **XSS Protection** - React's built-in protections + CSP headers
- **CSRF Protection** - Supabase handles token validation
- **Environment Variables** - Secure configuration management

## Phase 1 User Experience Flow

### Topic Creation Workflow
1. **Navigate** to `/topics/new`
2. **Fill Form**:
   - Topic Title (required)
   - Keywords (optional, tag input)
   - Industry (optional, dropdown from config)
   - Market Segment (optional, dropdown from config)
3. **Style Preferences**:
   - Tone selection (dropdown)
   - Length selection (dropdown)
   - Target Audience (dropdown)
   - Template Type (dropdown)
   - Custom Notes (textarea)
4. **Validation** - Real-time feedback
5. **Submit** - Store in Supabase
6. **Success** - Redirect to topics list

### Topic Management Workflow
1. **Dashboard** at `/topics` shows:
   - All topics with status indicators
   - Filter by industry, segment, status
   - Sort by priority, date created
   - Quick actions (edit, delete, duplicate)
2. **Edit Flow** at `/topics/[id]/edit`:
   - Pre-populated form
   - Track changes
   - Update workflow

## Future Phases Integration

### Phase 2: Content Generation (Planned)
- AI integration using stored topics and style preferences
- Content generation workflow using the enhanced topics table
- Quality scoring and optimization features

### Phase 3: Review & Publishing (Planned)
- Shopify API integration
- Publishing workflow implementation
- Performance analytics and optimization

## Monitoring and Logging

### Vercel Analytics
- **Web Vitals** - Core performance metrics
- **Page Views** - User engagement tracking
- **Error Tracking** - Runtime error monitoring
- **Function Logs** - API route performance

### Database Monitoring
- **Supabase Dashboard** - Query performance and usage
- **Real-time Metrics** - Active connections and throughput
- **Row Level Security** - Access pattern monitoring

---

**Last Updated**: January 27, 2025  
**Version**: 2.0 - Phase 1 Implementation  
**Architecture Status**: Phase 1 Ready for Development 