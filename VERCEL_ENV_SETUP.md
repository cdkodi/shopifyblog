# Vercel Environment Variables Setup

This document outlines the environment variables needed for the Shopify Blog CMS project.

## Required Environment Variables

### Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### AI Provider API Keys
```bash
# Anthropic (Claude)
ANTHROPIC_API_KEY=your-anthropic-api-key

# OpenAI (GPT)
OPENAI_API_KEY=your-openai-api-key

# Google (Gemini)
GOOGLE_API_KEY=your-google-api-key

# AI Service Configuration
AI_DEFAULT_PROVIDER=anthropic
AI_ENABLE_FALLBACKS=true
AI_ENABLE_COST_TRACKING=true
```

### DataForSEO Configuration
```bash
# DataForSEO API Credentials
DATAFORSEO_LOGIN=your-dataforseo-login
DATAFORSEO_PASSWORD=your-dataforseo-password

# Optional: Geographic and Language Targeting
DATAFORSEO_LOCATION_ID=2840  # USA (default)
DATAFORSEO_LANGUAGE_ID=en    # English (default)
```

## Setup Instructions

### 1. Add to Vercel Dashboard
1. Go to your Vercel project: https://vercel.com/c-d-kodis-projects/shopifyblog
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable with its corresponding value
4. Set scope to **Production**, **Preview**, and **Development**

### 2. Local Development (.env.local)
Create a `.env.local` file in your project root:

```bash
# Copy all the environment variables above
# This file is automatically ignored by git
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=your-anthropic-api-key
OPENAI_API_KEY=your-openai-api-key
GOOGLE_API_KEY=your-google-api-key
DATAFORSEO_LOGIN=your-dataforseo-login
DATAFORSEO_PASSWORD=your-dataforseo-password
AI_DEFAULT_PROVIDER=anthropic
AI_ENABLE_FALLBACKS=true
AI_ENABLE_COST_TRACKING=true
DATAFORSEO_LOCATION_ID=2840
DATAFORSEO_LANGUAGE_ID=en
```

### 3. Verification
Test your setup:
- **AI Services**: `/api/ai/test-service?test=basic`
- **SEO Services**: `/api/seo/test` (to be created)
- **Supabase**: Visit `/topics` page

## Service Integration Status

### ✅ Completed
- [x] Supabase database and authentication
- [x] AI service layer (Anthropic, OpenAI, Google)
- [x] Environment variable configuration
- [x] Production deployment

### 🔄 In Progress  
- [ ] DataForSEO integration
- [ ] SEO-enhanced content generation
- [ ] Content management UI

### 📋 Upcoming
- [ ] Content generation wizard
- [ ] SEO optimization dashboard
- [ ] Analytics and performance tracking 