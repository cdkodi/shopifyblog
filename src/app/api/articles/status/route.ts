import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Database, ArticleStatus } from '@/lib/types/database';
import rateLimit from '@/lib/utils/rate-limit';

// Rate limiting: 20 requests per minute
const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 500,
});

type Article = Database['public']['Tables']['articles']['Row'];
type ArticleUpdate = Database['public']['Tables']['articles']['Update'];

interface StatusUpdateRequest {
  articleId: string;
  status: ArticleStatus;
  reason?: string;
  metadata?: {
    editorialNotes?: string;
    publishToShopify?: boolean;
    publishAsHidden?: boolean;
    schedulePublishAt?: string;
  };
}

interface StatusUpdateResponse {
  success: boolean;
  articleId: string;
  previousStatus: ArticleStatus;
  newStatus: ArticleStatus;
  message: string;
  error?: string;
  metadata?: {
    statusChangedAt: string;
    workflow: string;
    nextActions?: string[];
  };
}

// Valid status transitions for V2 workflow
const VALID_TRANSITIONS: Record<ArticleStatus, ArticleStatus[]> = {
  'draft': ['generating', 'ready_for_editorial'],
  'generating': ['ready_for_editorial', 'generation_failed'],
  'generation_failed': ['generating', 'draft'],
  'ready_for_editorial': ['published', 'published_hidden', 'draft'],
  'published': ['published_hidden', 'ready_for_editorial'],
  'published_hidden': ['published_visible', 'ready_for_editorial'],
  'published_visible': ['published_hidden', 'ready_for_editorial']
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🔄 Article Status Update API called');
  
  try {
    // Rate limiting
    try {
      await limiter.check(20, 'CACHE_TOKEN');
    } catch {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded' },
        { status: 429 }
      );
    }

    const body: StatusUpdateRequest = await request.json();
    const { articleId, status, reason, metadata } = body;

    console.log('📝 Status update request:', {
      articleId,
      status,
      reason,
      hasMetadata: !!metadata
    });

    // Validate required fields
    if (!articleId || !status) {
      return NextResponse.json({
        success: false,
        error: 'Article ID and status are required'
      } as Partial<StatusUpdateResponse>, { status: 400 });
    }

    // Validate status value
    const validStatuses: ArticleStatus[] = [
      'draft', 'generating', 'generation_failed', 'ready_for_editorial',
      'published', 'published_hidden', 'published_visible'
    ];
    
    if (!validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      } as Partial<StatusUpdateResponse>, { status: 400 });
    }

    // Get current article
    const { data: currentArticle, error: fetchError } = await supabase
      .from('articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (fetchError || !currentArticle) {
      console.error('❌ Article not found:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Article not found'
      } as Partial<StatusUpdateResponse>, { status: 404 });
    }

    const previousStatus = currentArticle.status as ArticleStatus;
    
    // Validate status transition
    if (!VALID_TRANSITIONS[previousStatus]?.includes(status)) {
      console.error('❌ Invalid status transition:', previousStatus, '->', status);
      return NextResponse.json({
        success: false,
        error: `Invalid status transition from '${previousStatus}' to '${status}'. Valid transitions: ${VALID_TRANSITIONS[previousStatus]?.join(', ') || 'none'}`
      } as Partial<StatusUpdateResponse>, { status: 400 });
    }

    // Prepare update data
    const updateData: ArticleUpdate = {
      status,
      updated_at: new Date().toISOString()
    };

    // Add status-specific metadata
    if (status === 'generating') {
      updateData.generation_started_at = new Date().toISOString();
      updateData.generation_completed_at = null;
    } else if (status === 'ready_for_editorial' && previousStatus === 'generating') {
      updateData.generation_completed_at = new Date().toISOString();
    } else if (status.startsWith('published')) {
      updateData.published_at = updateData.published_at || new Date().toISOString();
      
      // Handle Shopify publishing metadata
      if (metadata?.publishToShopify) {
        updateData.shopify_article_id = null; // Will be set by Shopify integration
        updateData.shopify_blog_id = null;    // Will be set by Shopify integration
      }
    }

    // Update article status
    const { data: updatedArticle, error: updateError } = await supabase
      .from('articles')
      .update(updateData)
      .eq('id', articleId)
      .select()
      .single();

    if (updateError || !updatedArticle) {
      console.error('❌ Failed to update article status:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update article status'
      } as Partial<StatusUpdateResponse>, { status: 500 });
    }

    console.log('✅ Article status updated successfully:', previousStatus, '->', status);

    // Determine next actions based on new status
    const nextActions = getNextActions(status);

    return NextResponse.json({
      success: true,
      articleId,
      previousStatus,
      newStatus: status,
      message: getStatusUpdateMessage(previousStatus, status),
      metadata: {
        statusChangedAt: updateData.updated_at!,
        workflow: 'v2',
        nextActions
      }
    } as StatusUpdateResponse);

  } catch (error) {
    console.error('❌ Unexpected error in status update API:', error);
    return NextResponse.json({
      success: false,
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    } as Partial<StatusUpdateResponse>, { status: 500 });
  }
}

// Get next available actions for a status
function getNextActions(status: ArticleStatus): string[] {
  switch (status) {
    case 'draft':
      return ['Generate content', 'Edit manually', 'Delete'];
    case 'generating':
      return ['Monitor progress', 'Cancel generation'];
    case 'generation_failed':
      return ['Retry generation', 'Edit manually', 'Delete'];
    case 'ready_for_editorial':
      return ['Review content', 'Publish', 'Publish as hidden', 'Send back to draft'];
    case 'published':
      return ['Hide from public', 'Edit content', 'View live article'];
    case 'published_hidden':
      return ['Make visible', 'Edit content', 'Unpublish'];
    case 'published_visible':
      return ['Hide from public', 'Edit content', 'View live article'];
    default:
      return [];
  }
}

// Get status update message
function getStatusUpdateMessage(previousStatus: ArticleStatus, newStatus: ArticleStatus): string {
  const transitions: Record<string, string> = {
    'draft->generating': 'Article content generation started',
    'generating->ready_for_editorial': 'Content generated successfully and ready for editorial review',
    'generating->generation_failed': 'Content generation failed',
    'generation_failed->generating': 'Retrying content generation',
    'ready_for_editorial->published': 'Article published successfully',
    'ready_for_editorial->published_hidden': 'Article published as hidden',
    'published->published_hidden': 'Article hidden from public view',
    'published_hidden->published_visible': 'Article made visible to public',
    'published_visible->published_hidden': 'Article hidden from public view',
  };

  const key = `${previousStatus}->${newStatus}`;
  return transitions[key] || `Status updated from ${previousStatus} to ${newStatus}`;
}

// Health check endpoint
export async function GET(): Promise<NextResponse> {
  try {
    // Check database connectivity
    const { data, error } = await supabase
      .from('articles')
      .select('id')
      .limit(1);

    if (error) {
      return NextResponse.json({
        service: 'Article Status API',
        status: 'unhealthy',
        error: 'Database connection failed',
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    return NextResponse.json({
      service: 'Article Status API',
      status: 'healthy',
      version: '2.0.0',
      endpoints: {
        'POST /api/articles/status': 'Update article status',
        'GET /api/articles/status': 'Health check'
      },
      validStatuses: Object.keys(VALID_TRANSITIONS),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      service: 'Article Status API',
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
} 