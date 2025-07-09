import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Database, ArticleStatus } from '@/lib/types/database';

type Article = Database['public']['Tables']['articles']['Row'];

interface ProgressResponse {
  success: boolean;
  articleId: string;
  currentStatus: ArticleStatus;
  progress: {
    phase: string;
    percentage: number;
    estimatedTimeRemaining?: number; // in seconds
    currentStep?: string;
  };
  generationMetadata?: {
    aiModel?: string;
    promptVersion?: string;
    startedAt?: string;
    completedAt?: string;
    duration?: number; // in seconds
    wordCount?: number;
    readingTime?: number; // in minutes
  };
  statusHistory: {
    status: ArticleStatus;
    timestamp: string;
    duration?: number;
  }[];
  error?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const articleId = searchParams.get('articleId');

    if (!articleId) {
      return NextResponse.json({
        success: false,
        error: 'Article ID is required'
      }, { status: 400 });
    }

    console.log('📊 Progress tracking request for article:', articleId);

    // Get article with generation metadata
    const { data: article, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (fetchError || !article) {
      console.error('❌ Article not found:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Article not found'
      }, { status: 404 });
    }

    const currentStatus = article.status as ArticleStatus;
    
    // Calculate progress based on status
    const progress = calculateProgress(currentStatus, article);
    
    // Get generation metadata
    const generationMetadata = extractGenerationMetadata(article);
    
    // Build status history (simplified - could be enhanced with audit table)
    const statusHistory = buildStatusHistory(article);

    console.log('✅ Progress data compiled for article:', {
      articleId,
      status: currentStatus,
      phase: progress.phase,
      percentage: progress.percentage
    });

    return NextResponse.json({
      success: true,
      articleId,
      currentStatus,
      progress,
      generationMetadata,
      statusHistory
    } as ProgressResponse);

  } catch (error) {
    console.error('❌ Error in progress tracking API:', error);
    return NextResponse.json({
      success: false,
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Calculate progress percentage and phase
function calculateProgress(status: ArticleStatus, article: Article): {
  phase: string;
  percentage: number;
  estimatedTimeRemaining?: number;
  currentStep?: string;
} {
  switch (status) {
    case 'draft':
      return {
        phase: 'Planning',
        percentage: 0,
        currentStep: 'Topic and keywords defined'
      };
      
    case 'generating':
      const startedAt = article.generation_started_at ? new Date(article.generation_started_at) : null;
      const now = new Date();
      const elapsedSeconds = startedAt ? (now.getTime() - startedAt.getTime()) / 1000 : 0;
      
      // Estimate progress based on elapsed time (typical generation takes 30-120 seconds)
      const estimatedTotalTime = 90; // seconds
      const progressPercentage = Math.min(Math.floor((elapsedSeconds / estimatedTotalTime) * 100), 95);
      const remainingTime = Math.max(estimatedTotalTime - elapsedSeconds, 5);
      
      return {
        phase: 'Generating Content',
        percentage: progressPercentage,
        estimatedTimeRemaining: Math.ceil(remainingTime),
        currentStep: progressPercentage < 30 ? 'Analyzing topic and keywords' :
                    progressPercentage < 60 ? 'Generating article structure' :
                    progressPercentage < 90 ? 'Writing content sections' :
                    'Finalizing and formatting'
      };
      
    case 'generation_failed':
      return {
        phase: 'Generation Failed',
        percentage: 0,
        currentStep: 'Ready to retry generation'
      };
      
    case 'ready_for_editorial':
      return {
        phase: 'Editorial Review',
        percentage: 75,
        currentStep: 'Content generated, awaiting editorial review'
      };
      
    case 'published':
      return {
        phase: 'Published',
        percentage: 90,
        currentStep: 'Published to blog'
      };
      
    case 'published_hidden':
      return {
        phase: 'Published (Hidden)',
        percentage: 85,
        currentStep: 'Published but hidden from public'
      };
      
    case 'published_visible':
      return {
        phase: 'Live',
        percentage: 100,
        currentStep: 'Live and visible to public'
      };
      
    default:
      return {
        phase: 'Unknown',
        percentage: 0,
        currentStep: 'Status unknown'
      };
  }
}

// Extract generation metadata from article
function extractGenerationMetadata(article: Article): {
  aiModel?: string;
  promptVersion?: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  wordCount?: number;
  readingTime?: number;
} {
  const metadata: any = {};
  
  if (article.ai_model_used) {
    metadata.aiModel = article.ai_model_used;
  }
  
  if (article.generation_prompt_version) {
    metadata.promptVersion = article.generation_prompt_version;
  }
  
  if (article.generation_started_at) {
    metadata.startedAt = article.generation_started_at;
  }
  
  if (article.generation_completed_at) {
    metadata.completedAt = article.generation_completed_at;
    
    // Calculate duration if both timestamps exist
    if (article.generation_started_at) {
      const start = new Date(article.generation_started_at);
      const end = new Date(article.generation_completed_at);
      metadata.duration = Math.round((end.getTime() - start.getTime()) / 1000);
    }
  }
  
  if (article.word_count) {
    metadata.wordCount = article.word_count;
  }
  
  if (article.reading_time) {
    metadata.readingTime = article.reading_time;
  }
  
  return metadata;
}

// Build status history (simplified version)
function buildStatusHistory(article: Article): {
  status: ArticleStatus;
  timestamp: string;
  duration?: number;
}[] {
  const history: { status: ArticleStatus; timestamp: string; duration?: number; }[] = [];
  
  // Created as draft
  history.push({
    status: 'draft',
    timestamp: article.created_at || new Date().toISOString()
  });
  
  // Generation started
  if (article.generation_started_at) {
    const createdAt = new Date(article.created_at || new Date());
    const startedAt = new Date(article.generation_started_at);
    
    history.push({
      status: 'generating',
      timestamp: article.generation_started_at,
      duration: Math.round((startedAt.getTime() - createdAt.getTime()) / 1000)
    });
  }
  
  // Generation completed or failed
  if (article.generation_completed_at) {
    const startedAt = article.generation_started_at ? new Date(article.generation_started_at) : new Date();
    const completedAt = new Date(article.generation_completed_at);
    
    const finalStatus = article.status as ArticleStatus;
    if (finalStatus === 'generation_failed') {
      history.push({
        status: 'generation_failed',
        timestamp: article.generation_completed_at,
        duration: Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
      });
    } else {
      history.push({
        status: 'ready_for_editorial',
        timestamp: article.generation_completed_at,
        duration: Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)
      });
    }
  }
  
  // Published
  if (article.published_at && (article.status as ArticleStatus).startsWith('published')) {
    history.push({
      status: article.status as ArticleStatus,
      timestamp: article.published_at
    });
  }
  
  return history;
}

// Bulk progress endpoint for multiple articles
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { articleIds } = body;

    if (!Array.isArray(articleIds) || articleIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Article IDs array is required'
      }, { status: 400 });
    }

    if (articleIds.length > 50) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 50 articles per request'
      }, { status: 400 });
    }

    console.log('📊 Bulk progress tracking for articles:', articleIds.length);

    // Get all articles
    const { data: articles, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .in('id', articleIds);

    if (fetchError) {
      console.error('❌ Error fetching articles:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch articles'
      }, { status: 500 });
    }

    // Build progress data for each article
    const progressData = articles?.map(article => {
      const currentStatus = article.status as ArticleStatus;
      const progress = calculateProgress(currentStatus, article);
      const generationMetadata = extractGenerationMetadata(article);
      
      return {
        articleId: article.id,
        currentStatus,
        progress,
        generationMetadata: Object.keys(generationMetadata).length > 0 ? generationMetadata : undefined
      };
    }) || [];

    return NextResponse.json({
      success: true,
      articles: progressData,
      totalCount: progressData.length
    });

  } catch (error) {
    console.error('❌ Error in bulk progress tracking API:', error);
    return NextResponse.json({
      success: false,
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
} 