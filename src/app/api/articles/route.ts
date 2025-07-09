import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Database, ArticleStatus } from '@/lib/types/database';

type Article = Database['public']['Tables']['articles']['Row'];

interface ArticlesListRequest {
  page?: number;
  limit?: number;
  status?: ArticleStatus | 'all';
  search?: string;
  sortBy?: 'created_at' | 'updated_at' | 'title' | 'word_count' | 'reading_time';
  sortOrder?: 'asc' | 'desc';
  includeTopics?: boolean;
  includeGeneration?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

interface ArticlesListResponse {
  success: boolean;
  articles: (Article & {
    topic?: any;
    generationSummary?: {
      duration?: number;
      aiModel?: string;
      promptVersion?: string;
      phase: string;
      percentage: number;
    };
  })[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  filters: {
    appliedFilters: any;
    availableStatuses: ArticleStatus[];
  };
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const params: ArticlesListRequest = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
      status: (searchParams.get('status') as ArticleStatus) || 'all',
      search: searchParams.get('search') || undefined,
      sortBy: (searchParams.get('sortBy') as any) || 'updated_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      includeTopics: searchParams.get('includeTopics') === 'true',
      includeGeneration: searchParams.get('includeGeneration') === 'true',
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined
    };

    console.log('📄 Articles list API called with params:', params);

    // Build base query
    let query = supabase
      .from('articles')
      .select(`
        *
        ${params.includeTopics ? ', topics(*)' : ''}
      `);

    // Apply status filter
    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    // Apply search filter
    if (params.search) {
      query = query.or(`title.ilike.%${params.search}%,content.ilike.%${params.search}%`);
    }

    // Apply date filters
    if (params.dateFrom) {
      query = query.gte('created_at', params.dateFrom);
    }
    if (params.dateTo) {
      query = query.lte('created_at', params.dateTo);
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error getting article count:', countError);
      return NextResponse.json({
        success: false,
        error: 'Failed to get article count'
      }, { status: 500 });
    }

    // Apply sorting
    query = query.order(params.sortBy!, { ascending: params.sortOrder === 'asc' });

    // Apply pagination
    const offset = (params.page! - 1) * params.limit!;
    query = query.range(offset, offset + params.limit! - 1);

    // Execute query
    const { data: articles, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching articles:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch articles'
      }, { status: 500 });
    }

    // Enhance articles with generation data if requested
    const enhancedArticles = articles?.map(article => {
      const enhanced: any = { ...article };

      if (params.includeGeneration) {
        enhanced.generationSummary = buildGenerationSummary(article);
      }

      return enhanced;
    }) || [];

    // Calculate pagination
    const totalPages = Math.ceil((totalCount || 0) / params.limit!);
    const pagination = {
      currentPage: params.page!,
      totalPages,
      totalCount: totalCount || 0,
      hasNext: params.page! < totalPages,
      hasPrev: params.page! > 1
    };

    // Get available statuses for filters
    const { data: statusData } = await supabase
      .from('articles')
      .select('status')
      .neq('status', null);

    const availableStatuses = Array.from(
      new Set(statusData?.map(item => item.status as ArticleStatus) || [])
    );

    console.log('✅ Articles fetched successfully:', {
      count: enhancedArticles.length,
      totalCount,
      currentPage: params.page,
      totalPages
    });

    return NextResponse.json({
      success: true,
      articles: enhancedArticles,
      pagination,
      filters: {
        appliedFilters: {
          status: params.status,
          search: params.search,
          dateFrom: params.dateFrom,
          dateTo: params.dateTo,
          sortBy: params.sortBy,
          sortOrder: params.sortOrder
        },
        availableStatuses
      }
    } as ArticlesListResponse);

  } catch (error) {
    console.error('❌ Error in articles list API:', error);
    return NextResponse.json({
      success: false,
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Build generation summary for an article
function buildGenerationSummary(article: Article): {
  duration?: number;
  aiModel?: string;
  promptVersion?: string;
  phase: string;
  percentage: number;
} {
  const status = article.status as ArticleStatus;
  
  // Calculate duration if both timestamps exist
  let duration: number | undefined;
  if (article.generation_started_at && article.generation_completed_at) {
    const start = new Date(article.generation_started_at);
    const end = new Date(article.generation_completed_at);
    duration = Math.round((end.getTime() - start.getTime()) / 1000);
  }

  // Calculate phase and percentage based on status
  let phase: string;
  let percentage: number;

  switch (status) {
    case 'draft':
      phase = 'Planning';
      percentage = 0;
      break;
    case 'generating':
      phase = 'Generating';
      // Estimate progress for ongoing generation
      if (article.generation_started_at) {
        const elapsed = (new Date().getTime() - new Date(article.generation_started_at).getTime()) / 1000;
        percentage = Math.min(Math.floor((elapsed / 90) * 100), 95); // Assume 90s average
      } else {
        percentage = 10;
      }
      break;
    case 'generation_failed':
      phase = 'Failed';
      percentage = 0;
      break;
    case 'ready_for_editorial':
      phase = 'Editorial Review';
      percentage = 75;
      break;
    case 'published':
      phase = 'Published';
      percentage = 90;
      break;
    case 'published_hidden':
      phase = 'Published (Hidden)';
      percentage = 85;
      break;
    case 'published_visible':
      phase = 'Live';
      percentage = 100;
      break;
    default:
      phase = 'Unknown';
      percentage = 0;
  }

  return {
    duration,
    aiModel: article.ai_model_used || undefined,
    promptVersion: article.generation_prompt_version || undefined,
    phase,
    percentage
  };
}

// Create new article
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      title,
      content,
      source_topic_id,
      status = 'draft',
      target_keywords,
      meta_description
    } = body;

    console.log('📝 Creating new article:', { title, status, source_topic_id });

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Title is required'
      }, { status: 400 });
    }

    // Prepare article data
    const articleData = {
      title: title.trim(),
      content: content || '',
      source_topic_id,
      status: status as ArticleStatus,
      target_keywords,
      meta_description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Calculate word count and reading time if content exists
    if (content) {
      const wordCount = content.trim().split(/\s+/).length;
      articleData.word_count = wordCount;
      articleData.reading_time = Math.ceil(wordCount / 200); // ~200 WPM
    }

    // Create article
    const { data: article, error: createError } = await supabase
      .from('articles')
      .insert(articleData)
      .select()
      .single();

    if (createError || !article) {
      console.error('❌ Failed to create article:', createError);
      return NextResponse.json({
        success: false,
        error: 'Failed to create article'
      }, { status: 500 });
    }

    console.log('✅ Article created successfully:', article.id);

    return NextResponse.json({
      success: true,
      article,
      message: 'Article created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating article:', error);
    return NextResponse.json({
      success: false,
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
} 