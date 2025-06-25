# Shopify Blog Content Management System

A comprehensive content management system designed for Shopify blog integration with SEO optimization, workflow management, and automated publishing capabilities.

## ✨ Features

- **📝 Content Management** - Full CRUD operations for blog articles with rich text editing
- **🎯 SEO Optimization** - Keyword targeting, meta descriptions, and automated SEO scoring
- **🔄 Workflow Management** - Draft → Review → Approved → Published workflow
- **🛍️ Shopify Integration** - Direct publishing to Shopify blogs with sync capabilities
- **📊 Content Planning** - Topic research and keyword analysis tools
- **📋 Template System** - Reusable content templates for different industries
- **🔒 Security** - Row Level Security with Supabase authentication
- **📈 Analytics** - Performance tracking and content metrics

## 🛠️ Tech Stack

- **Frontend**: Next.js 14+ with App Router, React, TypeScript
- **UI Framework**: Shadcn UI + Tailwind CSS + Framer Motion
- **Backend**: Supabase (PostgreSQL + Authentication + API)
- **Integration**: Shopify Admin API
- **Deployment**: Vercel/Netlify + Supabase

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- A Supabase account and project
- A Shopify store with Admin API access
- Git installed on your machine

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/cdkodi/shopifyblog.git
cd shopifyblog
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
```

### 3. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the database migration:

```bash
# Copy the SQL from migrations/001_initial_schema.sql
# Paste and execute in your Supabase SQL editor
```

### 4. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Shopify Configuration
SHOPIFY_STORE_URL=your-store.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=your_shopify_admin_api_token
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret

# Application Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

### 5. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── dashboard/         # Main dashboard pages
│   ├── articles/          # Article management
│   ├── topics/            # Content planning
│   ├── templates/         # Template management
│   └── settings/          # Configuration
├── components/            # Reusable UI components
│   ├── ui/               # Shadcn UI components
│   ├── forms/            # Form components
│   └── layout/           # Layout components
├── lib/                  # Utility functions
│   ├── supabase.ts       # Supabase client
│   ├── shopify.ts        # Shopify API client
│   └── utils.ts          # Helper functions
├── types/                # TypeScript definitions
└── styles/               # Global styles
```

## 🗄️ Database Schema

The system uses 5 main tables:

- **`articles`** - Main content with SEO and Shopify integration
- **`topics`** - Content planning and keyword research
- **`content_templates`** - Reusable content structures
- **`workflow_logs`** - System execution tracking
- **`app_config`** - Application settings

See [TECH_ARCHITECTURE.md](./TECH_ARCHITECTURE.md) for detailed schema documentation.

## 🔧 Configuration

### Supabase Setup

1. **Database**: Import the schema from `migrations/001_initial_schema.sql`
2. **Authentication**: Configure authentication providers in Supabase dashboard
3. **RLS Policies**: All tables have Row Level Security enabled
4. **API Keys**: Add your project URL and anon key to environment variables

### Shopify Integration

1. **Admin API Access**: Create a private app in your Shopify admin
2. **Permissions**: Grant read/write access to blogs and articles
3. **Webhooks**: Configure webhooks for real-time sync (optional)

## 🚀 Deployment

### Frontend (Vercel)

```bash
# Connect your GitHub repository to Vercel
# Set environment variables in Vercel dashboard
# Deploy automatically on push to main branch
```

### Database (Supabase)

- Your Supabase project is automatically managed
- Database backups are handled by Supabase
- Monitor usage in the Supabase dashboard

## 📊 Features Overview

### Content Management
- Rich text editor with markdown support
- Image upload and management
- SEO optimization tools
- Content scheduling and publishing

### Workflow System
- **Draft** - Initial content creation
- **Review** - Content review phase
- **Approved** - Ready for publication
- **Published** - Live on Shopify
- **Rejected** - Requires revision

### SEO Tools
- Keyword targeting and analysis
- Meta description optimization
- Reading time calculation
- SEO score calculation
- Competition analysis

### Shopify Integration
- Direct blog publishing
- Article synchronization
- Category and tag management
- Media handling

## 🔒 Security

- **Authentication**: Supabase Auth with multiple providers
- **Authorization**: Row Level Security on all tables
- **API Security**: Protected endpoints with JWT tokens
- **Data Validation**: Input sanitization and validation
- **CORS**: Properly configured for secure API access

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e
```

## 📈 Monitoring

- **Database**: Monitor queries and performance in Supabase
- **Application**: Error tracking with Sentry (optional)
- **Analytics**: Content performance tracking
- **Logs**: Structured logging in workflow_logs table

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Technical Architecture](./TECH_ARCHITECTURE.md)
- **Issues**: [GitHub Issues](https://github.com/cdkodi/shopifyblog/issues)
- **Discussions**: [GitHub Discussions](https://github.com/cdkodi/shopifyblog/discussions)

## 🚧 Roadmap

- [ ] AI-powered content generation
- [ ] Advanced analytics dashboard
- [ ] Multi-user collaboration
- [ ] Content localization
- [ ] Social media integration
- [ ] Advanced SEO tools
- [ ] Content versioning
- [ ] Mobile app

---

**Built with ❤️ for content creators and Shopify merchants**
