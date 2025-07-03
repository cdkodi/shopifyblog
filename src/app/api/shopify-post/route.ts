import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { blogIntegration } from '@/lib/publishing/blog-integration';
import type { Database } from '@/lib/types/database';
import type { ContentConfiguration } from '@/components/content-generation/content-configuration';

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

    // Minimal valid ContentTemplate (required for type safety, not used by Shopify)
    const minimalTemplate: import('@/lib/supabase/content-templates').ContentTemplate = {
      id: 'minimal',
      name: 'Minimal Template',
      description: 'Stub template for Shopify publishing',
      icon: '📄',
      recommendedProvider: 'anthropic',
      estimatedCost: 0,
      targetLength: 1000,
      seoAdvantages: [],
      exampleTitles: [],
      difficulty: 'easy'
    };

    // ---
    // Construct a fully type-safe PublishedContent object.
    // Many fields below are only required to satisfy the PublishedContent/ContentConfiguration interface for type safety.
    // Shopify publishing logic ignores these fields, but they are required for the function signature and build to pass.
    // ---
    const configuration: ContentConfiguration = {
      template: minimalTemplate,
      topic: article.title || '',
      targetKeyword: '',
      relatedKeywords: [],
      title: article.title || '',
      metaDescription: article.meta_description || '',
      targetAudience: article.target_audience || '',
      tone: 'professional',
      wordCount: article.content ? article.content.split(' ').length : 0,
      includeImages: false,
      includeCallToAction: false,
      aiProvider: 'anthropic',
    };

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
        configuration, // Now explicitly typed
        content: article.content,
        // All fields below are required by GeneratedContent.metadata, but not used by Shopify
        metadata: {
          wordCount: article.content ? article.content.split(' ').length : 0, // Calculated from content
          readingTime: 0, // Not used for Shopify
          seoScore: 0, // Not used for Shopify
          generationTime: 0, // Not used for Shopify
          aiProvider: '', // Not used for Shopify
          cost: 0 // Not used for Shopify
        }
      },
      // All fields below are required by PublishedContent.seoOptimizations, but not used by Shopify
      seoOptimizations: {
        keywordDensity: 0,
        readabilityScore: 0,
        headingsStructure: 0,
        internalLinks: 0,
        externalLinks: 0
      }
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