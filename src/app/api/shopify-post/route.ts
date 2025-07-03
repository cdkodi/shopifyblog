import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { blogIntegration } from '@/lib/publishing/blog-integration';
import type { Database } from '@/lib/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const shopifyApiKey = process.env.SHOPIFY_ADMIN_API_KEY!;
const shopifyDomain = process.env.SHOPIFY_SHOP_DOMAIN!;
const shopifyBlogGid = process.env.SHOPIFY_BLOG_GID!; // e.g., 'gid://shopify/Blog/96953336105'

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export async function POST(req: NextRequest) {
  try {
    const { articleId } = await req.json();
    if (!articleId) {
      return NextResponse.json({ success: false, error: 'Missing articleId' }, { status: 400 });
    }

    // Fetch article from Supabase
    const { data: article, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();
    if (error || !article) {
      return NextResponse.json({ success: false, error: 'Article not found' }, { status: 404 });
    }

    // Map to PublishedContent shape expected by blogIntegration
    const publishedContent = {
      editedContent: {
        title: article.title,
        content: article.content,
        metaDescription: article.meta_description || '',
        slug: article.slug || '',
        tags: Array.isArray(article.target_keywords) ? article.target_keywords : [],
        scheduledDate: article.scheduled_publish_date || undefined,
        featuredImage: undefined // Not used for Shopify
      },
      generatedContent: {
        configuration: {
          template: '',
          topic: '',
          targetKeyword: '',
          relatedKeywords: [],
          tone: '',
          length: '',
          productIntegration: false,
          productCollections: [],
          productIntegrationStyle: '',
          aiProvider: '',
          scheduledDate: '',
          metaDescription: '',
          tags: [],
          slug: ''
        },
        content: article.content,
        metadata: { aiProvider: '', cost: 0 }
      },
      seoOptimizations: { keywordDensity: 0, readabilityScore: 0, headingsStructure: 0 }
    };

    // Publish to Shopify
    const result = await blogIntegration.publishToShopify(
      publishedContent,
      shopifyBlogGid,
      shopifyApiKey,
      shopifyDomain
    );

    if (result.success) {
      return NextResponse.json({ success: true, url: result.url });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Internal error' }, { status: 500 });
  }
} 