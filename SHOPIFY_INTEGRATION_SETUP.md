# Shopify Integration Setup (Hybrid GraphQL/REST)

This document explains how to set up the Shopify integration to publish articles from your CMS directly to your Shopify store blog.

## Architecture Overview

**Implementation**: Hybrid GraphQL/REST approach  
**Rationale**: Shopify's GraphQL Admin API supports reading blogs/articles but not creating/updating articles  
**Solution**: Use GraphQL for queries, REST API for mutations

## Prerequisites

1. A Shopify store with admin access
2. Shopify Partner account (for creating private apps)
3. Your CMS application deployed and running

## Step 1: Create a Shopify Private App

1. **Go to your Shopify Admin**
   - Navigate to `Settings > Apps and sales channels`
   - Click `Develop apps` tab
   - Click `Create an app`

2. **Configure App Details**
   - App name: `BlogPostAuto`
   - App developer: Your name/company

3. **Set Admin API Scopes**
   - `read_content` - Read blog articles and pages
   - `write_content` - Create, update, and delete blog articles
   - `read_themes` - Access theme information (optional)

4. **Generate Access Token**
   - Click `Install app`
   - Copy the `Admin API access token`

## Step 2: Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Shopify Configuration
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SHOPIFY_API_VERSION=2024-10
SHOPIFY_DEFAULT_BLOG_ID=123456789

# Optional: Webhook Configuration
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret_here
```

### Getting Your Store Domain
- Your store domain is in the format: `your-store.myshopify.com`
- Find it in your Shopify admin URL

### Generating Webhook Secret
```bash
# Generate a secure webhook secret
openssl rand -hex 32
```

## Step 3: Create Webhooks (Optional)

To keep your CMS in sync with Shopify changes, set up webhooks:

1. **In Shopify Admin**
   - Go to `Settings > Notifications`
   - Scroll to `Webhooks` section
   - Click `Create webhook`

2. **Configure Webhooks**
   ```
   Event: Article creation
   Format: JSON
   URL: https://your-cms-domain.com/api/webhooks/shopify
   ```

   Repeat for:
   - Article creation
   - Article update
   - Article deletion
   - Blog creation
   - Blog update
   - Blog deletion

3. **Webhook Verification**
   - Use the webhook secret you generated
   - All webhooks are automatically verified using HMAC-SHA256

## Step 4: Database Migration

Run the database migration to add Shopify integration fields:

```sql
-- Run this in your Supabase SQL editor
-- File: migrations/004_shopify_integration.sql

ALTER TABLE articles 
ADD COLUMN IF NOT EXISTS shopify_article_id BIGINT,
ADD COLUMN IF NOT EXISTS shopify_blog_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_articles_shopify_article_id ON articles(shopify_article_id);
CREATE INDEX IF NOT EXISTS idx_articles_shopify_blog_id ON articles(shopify_blog_id);
```

## Step 5: Test the Integration

1. **Check Configuration**
   - Visit `/api/shopify/debug` (GET request)
   - Verify environment variables and connection status

2. **Test Blog Fetching**
   - Visit `/api/shopify/test-blogs` (GET request)
   - Should return detailed blog information and test results
   - Fallback to known blog if GraphQL query fails

3. **Test Article Publishing**
   - Create a test article in your CMS
   - Use the Shopify Integration panel to publish
   - Verify it appears in your Shopify admin

4. **Debug Endpoints Available**
   - `/api/shopify/debug` - Environment and connection testing
   - `/api/shopify/test-blogs` - Blog-specific functionality testing
   - `/api/shopify/test-articles` - Article operations testing
   - `/api/shopify/test-connection` - Basic connectivity verification

## Features

### ✅ What's Included

- **Hybrid API Approach**: GraphQL for reading, REST for mutations (2024-10)
- **Field Mapping**: Automatic conversion between CMS and Shopify fields
- **Error Handling**: Comprehensive error handling with retry logic
- **Rate Limiting**: Built-in rate limit detection and exponential backoff
- **Fallback Mechanisms**: Graceful degradation when GraphQL queries fail
- **Webhook Support**: Real-time sync with Shopify changes (optional)
- **Status Tracking**: Visual indicators for sync status
- **Blog Selection**: Choose which Shopify blog to publish to
- **Debug Endpoints**: Built-in testing and debugging tools

### 📊 Field Mapping

| CMS Field | Shopify Field | Notes |
|-----------|---------------|-------|
| `title` | `title` | Direct mapping |
| `content` | `content` | Markdown supported |
| `meta_description` | `excerpt`, `summary` | SEO description |
| `slug` | `handle` | URL-friendly identifier |
| `target_keywords` | `tags` | JSON array → comma-separated |
| `status` | `published` | Boolean conversion |
| `published_at` | `publishedAt` | ISO 8601 format |

### 🔄 Sync Status

Articles can have these sync statuses:
- **Not Published**: Article exists only in CMS
- **Published**: Article is live on Shopify
- **Synced**: Changes are synchronized between systems
- **Error**: Sync failed (check error messages)

## Troubleshooting

### Common Issues

1. **"Shopify integration not configured"**
   - Check environment variables are set correctly
   - Verify `SHOPIFY_STORE_DOMAIN` format (include `.myshopify.com`)
   - Ensure `SHOPIFY_ACCESS_TOKEN` is valid

2. **"Failed to fetch blogs"**
   - Check API scopes include `read_content`
   - Verify access token has not expired
   - Check network connectivity

3. **"Invalid webhook signature"**
   - Verify `SHOPIFY_WEBHOOK_SECRET` matches Shopify configuration
   - Check webhook URL is accessible
   - Ensure HTTPS is used for webhooks

4. **"Rate limit exceeded"**
   - Built-in retry logic will handle this automatically
   - Consider reducing concurrent requests if persistent

### Debug Information

Check these endpoints for debugging:
- `GET /api/shopify/debug` - Complete environment and connection testing
- `GET /api/shopify/test-blogs` - Blog functionality with fallback testing
- `GET /api/shopify/test-articles` - Article operations testing
- `GET /api/shopify/blogs` - Production blog listing
- `GET /api/webhooks/shopify` - Webhook configuration (if enabled)
- Check browser console for detailed error messages

### Hybrid Approach Specifics

**GraphQL Limitations**:
- Blog article mutations (`articleCreate`, `articleUpdate`, `articleDelete`) don't exist in GraphQL Admin API
- Only reading operations (`blogs`, `articles`) are supported via GraphQL
- This is a Shopify platform limitation, not an implementation issue

**Fallback Behavior**:
- If GraphQL blog queries fail, system falls back to known blog information
- REST API is always used for article creation/updates/deletion
- Error messages clearly indicate which API layer failed

**API Version Management**:
- Uses 2024-10 API version for both GraphQL and REST endpoints
- Consistent authentication headers across both API types
- Automatic retry logic handles rate limits and temporary failures

### Logs

Monitor your application logs for:
- `📦 Received Shopify webhook`
- `📝 Publishing article to Shopify`
- `✅ Article published successfully`
- `❌ GraphQL errors`

## Security Considerations

1. **Access Token Security**
   - Store access tokens securely
   - Use environment variables, never commit to code
   - Regularly rotate access tokens

2. **Webhook Verification**
   - All webhooks are verified using HMAC-SHA256
   - Invalid signatures are rejected
   - Use strong webhook secrets

3. **API Rate Limits**
   - Shopify has API rate limits (40 requests/app/second)
   - Built-in exponential backoff handles rate limiting
   - Monitor usage in Shopify Partner dashboard

## Support

For issues related to:
- **Shopify API**: Check [Shopify GraphQL Admin API docs](https://shopify.dev/docs/api/admin-graphql)
- **CMS Integration**: Check application logs and error messages
- **Webhooks**: Verify webhook configuration and test with tools like ngrok

## API Reference

### Endpoints

- `GET /api/shopify/blogs` - List all blogs
- `POST /api/shopify/blogs` - Create a new blog
- `POST /api/shopify/articles` - Publish article to Shopify
- `PUT /api/shopify/articles` - Update article in Shopify
- `DELETE /api/shopify/articles` - Delete article from Shopify
- `POST /api/webhooks/shopify` - Handle Shopify webhooks

### Example Usage

```javascript
// Publish article to Shopify
const response = await fetch('/api/shopify/articles', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    articleId: 'article-uuid',
    blogId: 'gid://shopify/Blog/123456789',
    published: true
  })
});
``` 