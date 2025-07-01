# Shopify Integration Scripts

This folder contains all scripts related to Shopify product integration and database management for the Shopify Blog CMS project.

## 📋 Script Overview

### 🔄 Data Import Scripts

#### `shopify-data-import-complete.js`
**Purpose**: Import all products from Culturati.in while avoiding duplicates

**Features**:
- Fetches all 30 products from Culturati.in's public API
- Checks existing products to avoid duplicates
- Transforms product data to match database schema
- Batch processing for efficient imports
- Comprehensive error handling

**Usage**:
```bash
cd shopify-scripts
node shopify-data-import-complete.js
```

**Requirements**:
- RLS policies must allow public writes (see `fix-rls-and-import.js`)
- Internet connection to access Culturati.in API
- Valid Supabase credentials in `.env.local`

---

#### `shopify-data-import-simple.js`
**Purpose**: Simplified version for importing selected products

**Features**:
- Curated selection of 8 diverse products
- Hardcoded product data for reliability
- Simpler error handling
- Good for initial testing

**Usage**:
```bash
cd shopify-scripts
node shopify-data-import-simple.js
```

---

### 🔧 Utility Scripts

#### `fix-product-prices.js`
**Purpose**: Fix undefined or incorrect pricing data

**Features**:
- Fetches current pricing from Culturati.in
- Updates database with correct price_min and price_max
- Handles price range calculations
- Reports update statistics

**Usage**:
```bash
cd shopify-scripts
node fix-product-prices.js
```

---

#### `verify-import-success.js`
**Purpose**: Comprehensive verification of product import

**Features**:
- Counts total products imported
- Analyzes price ranges and product types
- Quality checks for missing data
- Detailed breakdown and statistics
- Recommendations for next steps

**Usage**:
```bash
cd shopify-scripts
node verify-import-success.js
```

**Sample Output**:
```
📊 Import Verification Results:
   Total products in database: 30
   Expected from Culturati.in: 30
   Status: ✅ COMPLETE

💰 Price Range Analysis:
   Lowest price: ₹750
   Highest price: ₹150000
   Average price: ₹17450
```

---

### 🔒 Security Scripts

#### `enforce-rls-security.js`
**Purpose**: Enforce production-ready Row Level Security policies

**Features**:
- Removes overly permissive public write policies
- Implements secure read/write separation
- Protects draft articles from public access
- Comprehensive security verification

**Usage**:
```bash
cd shopify-scripts
node enforce-rls-security.js
```

**Security Model**:
- **Public Access**: Read-only for published content
- **Authenticated Access**: Full read/write permissions
- **Draft Protection**: Only authenticated users can access drafts

---

#### `fix-rls-and-import.js`
**Purpose**: Development helper for RLS issues during import

**Features**:
- Attempts to fix RLS policies with service role
- Falls back to manual SQL instructions
- Includes product import functionality
- Development/testing focused

**Usage**:
```bash
cd shopify-scripts
node fix-rls-and-import.js
```

---

## 🏗️ Database Schema

The scripts work with these key tables:

### `shopify_products`
```sql
- id (UUID, Primary Key)
- shopify_id (BIGINT, Unique)
- title (TEXT)
- handle (TEXT, Unique)
- description (TEXT)
- product_type (TEXT)
- collections (JSONB)
- tags (JSONB)
- images (JSONB)
- price_min (DECIMAL)
- price_max (DECIMAL)
- inventory_quantity (INTEGER)
- status (TEXT: 'active'|'draft'|'archived')
- shopify_url (TEXT)
- created_at, updated_at, last_synced (TIMESTAMPTZ)
```

### `article_product_suggestions`
```sql
- id (UUID, Primary Key)
- article_id (UUID, FK to articles)
- product_id (UUID, FK to shopify_products)
- suggestion_type (TEXT: 'auto'|'manual'|'editor_added')
- relevance_score (DECIMAL)
- position_in_content (INTEGER)
- link_text (TEXT)
- utm_campaign (TEXT)
- is_approved (BOOLEAN)
- created_at (TIMESTAMPTZ)
```

---

## 🔐 Environment Requirements

Ensure your `.env.local` contains:

```env
# Required for all scripts
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Required for security scripts only
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 🚀 Deployment Workflow

### 1. Development Setup
```bash
# Import initial products
node shopify-data-import-simple.js

# Verify import
node verify-import-success.js
```

### 2. Production Data Import
```bash
# Import complete catalog
node shopify-data-import-complete.js

# Fix any pricing issues
node fix-product-prices.js

# Verify everything is correct
node verify-import-success.js
```

### 3. Production Security
```bash
# Enforce secure RLS policies
node enforce-rls-security.js
```

---

## 📊 Culturati.in Integration

All scripts integrate with the authentic Indian art store [Culturati.in](https://culturati.in):

**Product Categories**:
- **Pichwai Art**: Traditional paintings (₹17k-₹150k)
- **Religious Idols**: Decorative items (₹750-₹1,500)
- **Wall Hangings**: Home decor (₹1,500-₹1,850)
- **Elephant Stools**: Furniture sets (₹1,899)
- **Heritage Crafts**: Traditional items (₹2k-₹12k)
- **Pooja Accessories**: Ritual items (₹750-₹850)

**API Endpoints Used**:
- `https://culturati.in/products.json` - Public product catalog

---

## 🛠️ Troubleshooting

### Common Issues

**RLS Policy Errors**:
```
Error: new row violates row-level security policy
```
**Solution**: Run `enforce-rls-security.js` or manually update policies

**Network Timeouts**:
```
Error: Failed to fetch from Culturati.in
```
**Solution**: Check internet connection, retry with delays

**Duplicate Products**:
```
Error: duplicate key value violates unique constraint
```
**Solution**: Scripts automatically handle duplicates by checking `shopify_id`

**Price Issues**:
```
Prices showing as undefined
```
**Solution**: Run `fix-product-prices.js` to update from API

---

## 📚 Related Documentation

- [TECH_ARCHITECTURE.md](../TECH_ARCHITECTURE.md) - Overall system architecture
- [USER_GUIDE.md](../USER_GUIDE.md) - End-user documentation
- [PRODUCTION_DEPLOYMENT_CHECKLIST.md](../PRODUCTION_DEPLOYMENT_CHECKLIST.md) - Deployment guide
- [migrations/003_shopify_products.sql](../migrations/003_shopify_products.sql) - Database schema

---

## 🎯 Script Selection Guide

| Use Case | Recommended Script |
|----------|-------------------|
| Initial development setup | `shopify-data-import-simple.js` |
| Production import | `shopify-data-import-complete.js` |
| Fix pricing issues | `fix-product-prices.js` |
| Verify import success | `verify-import-success.js` |
| Secure for production | `enforce-rls-security.js` |
| Development RLS issues | `fix-rls-and-import.js` |

---

## 🔄 Maintenance

### Regular Tasks
1. **Weekly**: Verify product data with `verify-import-success.js`
2. **Monthly**: Re-import catalog with `shopify-data-import-complete.js`
3. **Before deployment**: Run `enforce-rls-security.js`

### Data Sync
Scripts can be extended to:
- Sync inventory levels
- Update product descriptions
- Add new products automatically
- Handle product deletions

---

*Last Updated: January 2025*
*Part of Shopify Blog CMS - Phase 2A Task 2 Implementation* 