import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getAIService } from '@/lib/ai';
import type { Database, ArticleStatus } from '@/lib/types/database';
import rateLimit from '@/lib/utils/rate-limit';

// Rate limiting: 5 bulk operations per minute
const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 100,
});

type Article = Database['public']['Tables']['articles']['Row'];

interface BulkOperationRequest {
  operation: 'status_update' | 'generate_content' | 'delete' | 'publish';
  articleIds: string[];
  parameters?: {
    // For status updates
    newStatus?: ArticleStatus;
    reason?: string;
    
    // For content generation
    regenerate?: boolean;
    aiProvider?: string;
    
    // For publishing
    publishToShopify?: boolean;
    publishAsHidden?: boolean;
  };
}

interface BulkOperationResponse {
  success: boolean;
  operation: string;
  results: {
    successful: string[];
    failed: Array<{
      articleId: string;
      error: string;
    }>;
  };
  summary: {
    totalRequested: number;
    successful: number;
    failed: number;
    skipped: number;
  };
  estimatedCompletionTime?: number; // for async operations
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🔄 Bulk operations API called');
  
  try {
    // Rate limiting
    try {
      await limiter.check(5, 'CACHE_TOKEN');
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded. Maximum 5 bulk operations per minute.'
      }, { status: 429 });
    }

    const body: BulkOperationRequest = await request.json();
    const { operation, articleIds, parameters = {} } = body;

    console.log('📝 Bulk operation request:', {
      operation,
      articleCount: articleIds?.length || 0,
      parameters
    });

    // Validate request
    if (!operation || !articleIds || !Array.isArray(articleIds)) {
      return NextResponse.json({
        success: false,
        error: 'Operation and articleIds array are required'
      }, { status: 400 });
    }

    if (articleIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'At least one article ID is required'
      }, { status: 400 });
    }

    if (articleIds.length > 50) {
      return NextResponse.json({
        success: false,
        error: 'Maximum 50 articles per bulk operation'
      }, { status: 400 });
    }

    // Validate operation type
    const validOperations = ['status_update', 'generate_content', 'delete', 'publish'];
    if (!validOperations.includes(operation)) {
      return NextResponse.json({
        success: false,
        error: `Invalid operation. Must be one of: ${validOperations.join(', ')}`
      }, { status: 400 });
    }

    // Get all requested articles
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

    if (!articles || articles.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No articles found with the provided IDs'
      }, { status: 404 });
    }

    // Execute bulk operation based on type
    let result: BulkOperationResponse;

    switch (operation) {
      case 'status_update':
        result = await executeBulkStatusUpdate(articles, parameters);
        break;
      case 'generate_content':
        result = await executeBulkContentGeneration(articles, parameters);
        break;
      case 'delete':
        result = await executeBulkDelete(articles);
        break;
      case 'publish':
        result = await executeBulkPublish(articles, parameters);
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Unsupported operation'
        }, { status: 400 });
    }

    console.log('✅ Bulk operation completed:', {
      operation,
      successful: result.summary.successful,
      failed: result.summary.failed
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ Error in bulk operations API:', error);
    return NextResponse.json({
      success: false,
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Execute bulk status update
async function executeBulkStatusUpdate(
  articles: Article[],
  parameters: any
): Promise<BulkOperationResponse> {
  const { newStatus, reason } = parameters;
  
  if (!newStatus) {
    return {
      success: false,
      operation: 'status_update',
      results: { successful: [], failed: [] },
      summary: { totalRequested: 0, successful: 0, failed: 0, skipped: 0 },
      error: 'newStatus parameter is required for status updates'
    };
  }

  const successful: string[] = [];
  const failed: Array<{ articleId: string; error: string }> = [];

  for (const article of articles) {
    try {
      const { error: updateError } = await supabase
        .from('articles')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', article.id);

      if (updateError) {
        failed.push({
          articleId: article.id,
          error: updateError.message
        });
      } else {
        successful.push(article.id);
      }
    } catch (error) {
      failed.push({
        articleId: article.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return {
    success: failed.length === 0,
    operation: 'status_update',
    results: { successful, failed },
    summary: {
      totalRequested: articles.length,
      successful: successful.length,
      failed: failed.length,
      skipped: 0
    }
  };
}

// Execute bulk content generation
async function executeBulkContentGeneration(
  articles: Article[],
  parameters: any
): Promise<BulkOperationResponse> {
  const { regenerate = false, aiProvider } = parameters;
  
  const successful: string[] = [];
  const failed: Array<{ articleId: string; error: string }> = [];
  let skipped = 0;

  for (const article of articles) {
    try {
      const currentStatus = article.status as ArticleStatus;
      
      // Skip articles that are already generating or don't need generation
      if (!regenerate && (currentStatus === 'generating' || currentStatus === 'ready_for_editorial')) {
        skipped++;
        continue;
      }

      // Update status to generating
      const { error: statusError } = await supabase
        .from('articles')
        .update({
          status: 'generating',
          generation_started_at: new Date().toISOString(),
          ai_model_used: aiProvider || 'auto',
          generation_prompt_version: 'v2.1'
        })
        .eq('id', article.id);

      if (statusError) {
        failed.push({
          articleId: article.id,
          error: `Failed to update status: ${statusError.message}`
        });
        continue;
      }

      successful.push(article.id);
      
      // Note: Actual AI generation would happen asynchronously in production
      // For now, we just mark as generating and the frontend can poll for progress
      
    } catch (error) {
      failed.push({
        articleId: article.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Estimate completion time (90 seconds per article on average)
  const estimatedCompletionTime = successful.length * 90;

  return {
    success: failed.length === 0,
    operation: 'generate_content',
    results: { successful, failed },
    summary: {
      totalRequested: articles.length,
      successful: successful.length,
      failed: failed.length,
      skipped
    },
    estimatedCompletionTime
  };
}

// Execute bulk delete
async function executeBulkDelete(articles: Article[]): Promise<BulkOperationResponse> {
  const successful: string[] = [];
  const failed: Array<{ articleId: string; error: string }> = [];

  for (const article of articles) {
    try {
      const { error: deleteError } = await supabase
        .from('articles')
        .delete()
        .eq('id', article.id);

      if (deleteError) {
        failed.push({
          articleId: article.id,
          error: deleteError.message
        });
      } else {
        successful.push(article.id);
      }
    } catch (error) {
      failed.push({
        articleId: article.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return {
    success: failed.length === 0,
    operation: 'delete',
    results: { successful, failed },
    summary: {
      totalRequested: articles.length,
      successful: successful.length,
      failed: failed.length,
      skipped: 0
    }
  };
}

// Execute bulk publish
async function executeBulkPublish(
  articles: Article[],
  parameters: any
): Promise<BulkOperationResponse> {
  const { publishToShopify = false, publishAsHidden = true } = parameters;
  
  const successful: string[] = [];
  const failed: Array<{ articleId: string; error: string }> = [];
  let skipped = 0;

  for (const article of articles) {
    try {
      const currentStatus = article.status as ArticleStatus;
      
      // Skip articles that aren't ready for publishing
      if (currentStatus !== 'ready_for_editorial' && !currentStatus.startsWith('published')) {
        skipped++;
        continue;
      }

      const newStatus: ArticleStatus = publishAsHidden ? 'published_hidden' : 'published_visible';

      const { error: updateError } = await supabase
        .from('articles')
        .update({
          status: newStatus,
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', article.id);

      if (updateError) {
        failed.push({
          articleId: article.id,
          error: updateError.message
        });
      } else {
        successful.push(article.id);
      }
    } catch (error) {
      failed.push({
        articleId: article.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return {
    success: failed.length === 0,
    operation: 'publish',
    results: { successful, failed },
    summary: {
      totalRequested: articles.length,
      successful: successful.length,
      failed: failed.length,
      skipped
    }
  };
}

// Health check
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    service: 'Bulk Operations API',
    status: 'healthy',
    version: '2.0.0',
    supportedOperations: [
      'status_update',
      'generate_content', 
      'delete',
      'publish'
    ],
    limits: {
      maxArticlesPerOperation: 50,
      rateLimitPerMinute: 5
    },
    timestamp: new Date().toISOString()
  });
} 