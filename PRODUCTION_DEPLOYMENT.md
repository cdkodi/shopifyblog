# Production Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the Shopify Blog CMS to production environments. The application is optimized for Vercel deployment with Supabase backend infrastructure.

**Live Production URL**: https://shopify-blog-cms.vercel.app

## Pre-Deployment Checklist

### 1. Environment Preparation

#### Required Services
- **Vercel Account**: For hosting and deployment
- **Supabase Project**: Production database instance
- **GitHub Repository**: Source code management
- **AI API Keys**: At least one provider (Anthropic, OpenAI, or Google)
- **Domain Name** (Optional): Custom domain configuration

#### Service Accounts Setup
```bash
# Install required CLI tools
npm install -g vercel
npm install -g supabase

# Login to services
vercel login
supabase login
```

### 2. Database Setup

#### Supabase Production Project
1. **Create Production Project**:
   - Go to https://supabase.com/dashboard
   - Create new project for production
   - Choose appropriate region (closest to your users)
   - Note project URL and anon key

2. **Apply Database Migrations**:
   ```sql
   -- In Supabase SQL Editor, run migrations in order:
   -- 1. Copy/paste content from migrations/001_initial_schema.sql
   -- 2. Copy/paste content from migrations/002_phase1_topic_enhancements.sql  
   -- 3. Copy/paste content from migrations/003_shopify_products.sql
   -- 4. Copy/paste content from migrations/util_production_cleanup.sql
   ```
   
   See `migrations/README.md` for detailed instructions.

3. **Import Production Data**:
   ```bash
   # Use the complete product catalog (30 authentic products)
   cd shopify-scripts
   node shopify-data-import-complete.js
   
   # Verify import success
   node verify-import-success.js
   ```

4. **Enable Row Level Security**:
   ```bash
   # Apply production security policies
   node enforce-rls-security.js
   ```

### 3. Environment Variables

#### Required Production Variables

```env
# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# AI Provider Configuration (at least one required)
ANTHROPIC_API_KEY=your_anthropic_production_key
OPENAI_API_KEY=your_openai_production_key
GOOGLE_API_KEY=your_google_production_key

# SEO Service (Optional)
DATAFORSEO_EMAIL=your_dataforseo_email
DATAFORSEO_PASSWORD=your_dataforseo_password

# Application Configuration
AI_DEFAULT_PROVIDER=anthropic
AI_ENABLE_FALLBACKS=true
AI_ENABLE_COST_TRACKING=true
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
```

#### Environment Variable Security
- **Never commit secrets to git**
- **Use strong, unique API keys for production**
- **Rotate keys regularly (quarterly recommended)**
- **Monitor API usage and costs**
- **Set up billing alerts for AI services**

## Deployment Process

### 1. Vercel Deployment

#### Initial Setup
1. **Connect GitHub Repository**:
   ```bash
   # Link project to Vercel
   vercel --prod
   
   # Follow prompts to connect GitHub repo
   # Configure build settings
   # Set environment variables
   ```

2. **Configure Build Settings**:
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

3. **Environment Variables in Vercel**:
   - Go to Vercel Dashboard > Project Settings > Environment Variables
   - Add all required variables for Production environment
   - Verify variables are correctly set

#### Deployment Commands
```bash
# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View deployment logs
vercel logs [deployment-url]
```

### 2. Domain Configuration

#### Custom Domain Setup
1. **Add Domain in Vercel**:
   - Project Settings > Domains
   - Add your custom domain
   - Configure DNS records as instructed

2. **SSL Certificate**:
   - Automatic SSL via Vercel
   - Verify HTTPS is working
   - Check security headers

3. **DNS Configuration**:
   ```dns
   # A Record or CNAME
   your-domain.com -> vercel-deployment-url
   
   # WWW Redirect (optional)
   www.your-domain.com -> your-domain.com
   ```

### 3. Performance Optimization

#### Vercel Configuration
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['placekitten.com', 'cdn.shopify.com'],
    optimize: true,
  },
  compress: true,
  swcMinify: true,
  poweredByHeader: false,
  reactStrictMode: true,
}

module.exports = nextConfig
```

#### Build Optimization
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "build:analyze": "ANALYZE=true next build",
    "postbuild": "next-sitemap"
  }
}
```

## Security Configuration

### 1. Supabase Security

#### Row Level Security Policies
```sql
-- Apply production RLS policies
-- Restrict admin access to authenticated users only
-- Allow public read access to products only
-- Secure all other tables

-- Example policies
CREATE POLICY "Authenticated access only" ON articles 
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Public read products" ON shopify_products 
  FOR SELECT TO public USING (true);
```

#### Database Backup
- **Automated Backups**: Enabled in Supabase (daily)
- **Manual Backups**: Before major updates
- **Recovery Testing**: Quarterly backup restoration tests

### 2. Application Security

#### Security Headers
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]
```

#### API Security
- **Rate Limiting**: Implement API rate limits
- **Input Validation**: Strict validation on all inputs
- **Error Handling**: Don't expose sensitive information
- **CORS Configuration**: Properly configured CORS headers

### 3. Monitoring & Logging

#### Error Tracking
```javascript
// Vercel Analytics Integration
// Real-time error monitoring
// Performance tracking
// User analytics (privacy-compliant)
```

#### Health Checks
```javascript
// API health check endpoint
// /api/health
{
  "status": "healthy",
  "database": "connected",
  "ai_services": "available",
  "timestamp": "2024-01-XX"
}
```

## Post-Deployment Verification

### 1. Functionality Testing

#### Core Features Test
```bash
# Test checklist
✅ Homepage loads correctly
✅ Topic management works
✅ Content generation functional
✅ Article editor saves properly
✅ Product integration working
✅ Editorial dashboard accessible
✅ AI services responding
✅ Database queries working
✅ SEO features functional
✅ Export features working
```

#### Performance Testing
- **Page Load Speed**: < 3 seconds initial load
- **API Response Time**: < 2 seconds for content generation
- **Database Queries**: < 500ms for standard queries
- **Image Loading**: Optimized and lazy-loaded

### 2. Security Testing

#### Security Checklist
```bash
✅ HTTPS enabled and working
✅ Security headers configured
✅ RLS policies enforced
✅ API keys not exposed
✅ Error messages don't leak info
✅ Input validation working
✅ File upload restrictions (if applicable)
✅ CORS properly configured
```

### 3. Monitoring Setup

#### Performance Monitoring
- **Vercel Analytics**: Real-time performance data
- **Core Web Vitals**: LCP, FID, CLS tracking
- **API Monitoring**: Response times and error rates
- **Database Performance**: Query performance metrics

#### Error Monitoring
- **Application Errors**: Runtime error tracking
- **API Errors**: Failed request monitoring
- **Database Errors**: Connection and query failures
- **AI Service Errors**: Provider failures and fallbacks

## Maintenance & Updates

### 1. Regular Maintenance

#### Weekly Tasks
- **Monitor Performance**: Check Vercel analytics
- **Review Errors**: Address any recurring issues
- **Check AI Usage**: Monitor costs and quotas
- **Database Health**: Review query performance

#### Monthly Tasks
- **Security Updates**: Update dependencies
- **Backup Verification**: Test backup restoration
- **Performance Review**: Analyze and optimize
- **Cost Review**: Monitor service costs

### 2. Update Process

#### Code Updates
```bash
# Development workflow
1. Create feature branch
2. Test changes locally
3. Deploy to staging (preview)
4. Review and test
5. Merge to main (auto-deploy to production)
```

#### Database Updates
```bash
# Migration process
1. Create migration file
2. Test on staging database
3. Apply to production during low-traffic period
4. Verify migration success
5. Monitor for issues
```

### 3. Scaling Considerations

#### Traffic Scaling
- **Vercel Auto-scaling**: Automatic serverless scaling
- **Database Scaling**: Supabase handles connection pooling
- **CDN Optimization**: Global content delivery
- **Caching Strategy**: Implement Redis if needed

#### Cost Optimization
- **AI Usage Monitoring**: Track and optimize AI costs
- **Database Optimization**: Query optimization and indexing
- **Image Optimization**: Compressed and optimized assets
- **Bundle Optimization**: Minimize JavaScript bundle size

## Troubleshooting

### Common Deployment Issues

#### Build Failures
```bash
# Check build logs
vercel logs [deployment-url]

# Common issues:
- Missing environment variables
- TypeScript compilation errors
- Package dependency conflicts
- Memory limits exceeded
```

#### Runtime Errors
```bash
# Monitor runtime errors
- Database connection failures
- API key authentication errors
- Third-party service timeouts
- Memory or execution time limits
```

#### Performance Issues
```bash
# Diagnose performance problems
- Slow database queries
- Large bundle sizes
- Unoptimized images
- API response times
```

### Emergency Procedures

#### Rollback Process
```bash
# Quick rollback to previous version
vercel alias [previous-deployment-url] production

# Verify rollback successful
# Investigate and fix issues
# Re-deploy when ready
```

#### Incident Response
1. **Immediate**: Assess impact and rollback if necessary
2. **Investigation**: Identify root cause
3. **Communication**: Update stakeholders
4. **Resolution**: Implement fix and re-deploy
5. **Post-mortem**: Document lessons learned

## Backup & Recovery

### Database Backup Strategy
- **Automated Daily Backups**: Supabase automatic backups
- **Weekly Manual Backups**: Download and store externally
- **Pre-deployment Backups**: Before major updates
- **Recovery Testing**: Monthly restoration tests

### Code Backup Strategy
- **Git Repository**: Primary source of truth
- **Multiple Remotes**: GitHub + backup remote
- **Release Tags**: Tagged releases for easy rollback
- **Documentation**: Keep deployment docs updated

## Compliance & Best Practices

### Data Privacy
- **GDPR Compliance**: If serving EU users
- **Data Retention**: Clear data retention policies
- **User Consent**: Proper consent mechanisms
- **Data Export**: User data export capabilities

### Security Best Practices
- **Regular Security Audits**: Quarterly reviews
- **Dependency Updates**: Monthly security updates
- **Access Control**: Principle of least privilege
- **Incident Response Plan**: Documented procedures

### Performance Best Practices
- **Core Web Vitals**: Maintain good scores
- **Mobile Optimization**: Mobile-first design
- **Accessibility**: WCAG compliance
- **SEO Optimization**: Technical SEO best practices

This production deployment guide ensures a secure, performant, and maintainable deployment of the Shopify Blog CMS. Regular reviews and updates of this guide are recommended as the application evolves. 