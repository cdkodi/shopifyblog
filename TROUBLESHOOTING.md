# Shopify Blog CMS - Troubleshooting Guide

## Overview
This guide covers troubleshooting steps for the Shopify Blog CMS project, including AI service integration, SEO functionality, and deployment issues.

## Quick Diagnosis Commands

### 1. Test All Services Status
```bash
# Test AI services
curl -X GET "https://shopifyblog.vercel.app/api/ai/test-service?test=basic"

# Test SEO service
curl -X GET "https://shopifyblog.vercel.app/api/seo/test?test=basic"

# Test individual AI providers
curl -X GET "https://shopifyblog.vercel.app/api/ai/test-service?test=anthropic"
curl -X GET "https://shopifyblog.vercel.app/api/ai/test-service?test=openai" 
curl -X GET "https://shopifyblog.vercel.app/api/ai/test-service?test=google"
```

### 2. Check Environment Variables
```bash
# List all Vercel environment variables
vercel env ls

# Check specific variables exist
vercel env ls | grep -E "(ANTHROPIC|OPENAI|GOOGLE|DATAFORSEO)"
```

## Common Issues & Solutions

### Issue 1: "Failed to fetch keyword data" (SEO Error)

**Symptoms**: 
- SEO keyword research not working
- Error message in content generation step 2
- Empty keyword suggestions

**Root Causes & Solutions**:

#### A. DataForSEO API Credits Exhausted
```bash
# Check credit status
curl -X GET "https://shopifyblog.vercel.app/api/seo/test?test=health"
```

**Expected Response with Credits**:
```json
{
  "status": "success",
  "message": "SEO service health: healthy",
  "results": {
    "serviceHealth": "healthy",
    "apiCreditsRemaining": 1000,  // Should be > 0
    "lastChecked": "2024-01-01T00:00:00.000Z",
    "errorsCount": 0
  }
}
```

**Solution**: Purchase DataForSEO credits
1. Log into your DataForSEO account
2. Navigate to billing section
3. Add credits (keyword research costs ~0.0001 credits per keyword)
4. Minimum recommended: 10,000 credits ($10)

#### B. Invalid DataForSEO Credentials
```bash
# Test basic configuration
curl -X GET "https://shopifyblog.vercel.app/api/seo/test?test=basic"
```

**Expected Response**:
```json
{
  "status": "success",
  "environmentVariables": {
    "dataforseloLogin": true,
    "dataforSeoPassword": true,
    "locationId": true,
    "languageId": true
  }
}
```

**Solution**: Update Vercel environment variables
```bash
vercel env add DATAFORSEO_LOGIN
vercel env add DATAFORSEO_PASSWORD  
vercel env add DATAFORSEO_LOCATION_ID  # Default: 2356 (India)
vercel env add DATAFORSEO_LANGUAGE_ID  # Default: en
```

#### C. Wrong Location/Language Codes
DataForSEO uses specific codes:
- **India**: Location ID `2356`, Language `en`
- **USA**: Location ID `2840`, Language `en`
- **UK**: Location ID `2826`, Language `en`

**Fix**: Update environment variables with correct codes.

### Issue 2: AI Service Errors

#### A. "AI service not initialized"
**Cause**: Missing or invalid API keys

**Check**:
```bash
curl -X GET "https://shopifyblog.vercel.app/api/ai/test-service?test=basic"
```

**Solution**: Add missing API keys to Vercel
```bash
vercel env add ANTHROPIC_API_KEY
vercel env add OPENAI_API_KEY
vercel env add GOOGLE_API_KEY
```

#### B. Rate Limit Exceeded
**Symptoms**: 429 errors in AI generation

**Check Current Limits**:
- Per minute: 60 requests
- Per hour: 1000 requests

**Solution**: 
1. Wait for rate limit reset
2. Adjust limits in environment variables:
```bash
vercel env add AI_RATE_LIMIT_PER_MINUTE 30
vercel env add AI_RATE_LIMIT_PER_HOUR 500
```

#### C. Provider-Specific Errors

**Anthropic (Claude)**:
- Error 401: Invalid API key
- Error 429: Rate limit exceeded
- Error 400: Invalid request format

**OpenAI (GPT-4)**:
- Error 401: Invalid API key
- Error 429: Quota exceeded
- Error 400: Invalid model or parameters

**Google (Gemini)**:
- Error 403: API not enabled
- Error 400: Invalid request

**Test Individual Providers**:
```bash
curl -X GET "https://shopifyblog.vercel.app/api/ai/test-service?test=anthropic"
curl -X GET "https://shopifyblog.vercel.app/api/ai/test-service?test=openai"
curl -X GET "https://shopifyblog.vercel.app/api/ai/test-service?test=google"
```

### Issue 3: Build/Deployment Errors

#### A. TypeScript Compilation Errors
**Common Issues**:
- Import/export mismatches
- Type declaration conflicts
- Missing dependencies

**Check**:
```bash
npm run build
```

**Common Fixes**:
```bash
# Install missing dependencies
npm install

# Clear cache and rebuild
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

#### B. Environment Variables in Different Environments
Vercel has separate environments:
- **Development**: Local development
- **Preview**: Pull request previews  
- **Production**: Live site

**Check all environments have required variables**:
```bash
vercel env ls
```

**Add to all environments**:
```bash
vercel env add VARIABLE_NAME production
vercel env add VARIABLE_NAME preview
vercel env add VARIABLE_NAME development
```

### Issue 4: Database/Supabase Issues

#### A. Supabase Connection Errors
**Check**:
```bash
# Test database connection (if you have a test endpoint)
curl -X GET "https://shopifyblog.vercel.app/api/topics"
```

**Solution**: Verify Supabase credentials
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### B. Database Schema Issues
**Check migration status**: Ensure all migrations are applied
**Solutions**: 
1. Check `migrations/` folder for unapplied migrations
2. Run migrations manually in Supabase dashboard

### Issue 5: Content Generation Workflow Issues

#### A. Template Loading Failures
**Symptoms**: Empty template selector or loading errors

**Debug Steps**:
1. Check browser console for JavaScript errors
2. Verify Supabase connection
3. Check template data in database

#### B. Step Navigation Issues
**Symptoms**: Cannot proceed between steps

**Common Causes**:
1. Validation errors in form data
2. API endpoint failures
3. Missing required fields

**Debug**: Check browser Network tab for failed requests

## Advanced Debugging

### 1. Enable Detailed Logging
Add to environment variables:
```bash
vercel env add DEBUG true
vercel env add LOG_LEVEL debug
```

### 2. Monitor API Costs
**Check AI usage**:
```bash
curl -X GET "https://shopifyblog.vercel.app/api/ai/test-service?test=cost-analysis"
```

**Check SEO usage**:
```bash
curl -X GET "https://shopifyblog.vercel.app/api/seo/test?test=health"
```

### 3. Database Query Debugging
Add console.log statements in:
- `src/lib/supabase/topics.ts`
- `src/lib/supabase/content-templates.ts`

### 4. Network Analysis
Use browser dev tools:
1. Open Network tab
2. Filter by API calls
3. Check request/response details
4. Look for 4xx/5xx errors

## Performance Optimization

### 1. Reduce API Calls
- Cache keyword research results
- Implement request debouncing
- Use local storage for drafts

### 2. Optimize Bundle Size
```bash
# Analyze bundle
npm run build
npx @next/bundle-analyzer
```

### 3. Database Optimization
- Add indexes for frequently queried fields
- Use database connection pooling
- Implement query result caching

## Monitoring & Alerts

### 1. Set Up Vercel Analytics
Enable in Vercel dashboard for:
- Error tracking
- Performance monitoring
- Usage analytics

### 2. API Monitoring
Implement health checks:
- AI service availability
- SEO service credits
- Database connectivity

### 3. Cost Monitoring
Track API usage:
- Set up budget alerts in AI provider dashboards
- Monitor DataForSEO credit consumption
- Track Vercel function execution time

## Recovery Procedures

### 1. Service Degradation
If AI services fail:
1. Content generation falls back to templates only
2. SEO features become optional
3. Basic functionality remains available

### 2. Database Issues
If Supabase is unavailable:
1. Use local storage for temporary data
2. Queue operations for retry
3. Display offline mode to users

### 3. Complete Outage
Emergency procedures:
1. Check Vercel deployment status
2. Verify all environment variables
3. Roll back to last known good deployment
4. Contact service providers if needed

## Contact & Support

### Service Provider Support
- **Vercel**: https://vercel.com/support
- **DataForSEO**: https://dataforseo.com/help
- **Anthropic**: https://support.anthropic.com
- **OpenAI**: https://help.openai.com
- **Google AI**: https://ai.google.dev/support
- **Supabase**: https://supabase.com/support

### Documentation References
- [DataForSEO API Docs](https://docs.dataforseo.com)
- [Anthropic API Docs](https://docs.anthropic.com)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Google AI Docs](https://ai.google.dev/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Functions](https://vercel.com/docs/functions)

## Success Validation

After resolving issues, verify with:

```bash
# 1. Basic health checks
curl -X GET "https://shopifyblog.vercel.app/api/ai/test-service?test=basic"
curl -X GET "https://shopifyblog.vercel.app/api/seo/test?test=basic"

# 2. Functional tests
curl -X GET "https://shopifyblog.vercel.app/api/ai/test-service?test=anthropic"
curl -X GET "https://shopifyblog.vercel.app/api/seo/test?test=keywords"

# 3. End-to-end workflow test
# Navigate through content generation workflow in browser
# Test: Template selection → Configuration → Generation → Publishing
```

**Expected Result**: All tests return successful responses and full workflow completes without errors. 