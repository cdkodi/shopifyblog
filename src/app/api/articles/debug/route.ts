import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔧 Articles debug endpoint called');

    // Test basic connection
    const { count: totalCount, error: healthError } = await supabase
      .from('articles')
      .select('*', { count: 'exact', head: true });

    if (healthError) {
      console.error('❌ Health check failed:', healthError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: {
          message: healthError.message,
          code: healthError.code,
          details: healthError.details,
          hint: healthError.hint
        }
      }, { status: 500 });
    }

    // Get recent articles with minimal data
    const { data: recentArticles, error: recentError } = await supabase
      .from('articles')
      .select('id, title, status, created_at, ai_model_used')
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('❌ Recent articles query failed:', recentError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch recent articles',
        details: {
          message: recentError.message,
          code: recentError.code,
          details: recentError.details,
          hint: recentError.hint
        }
      }, { status: 500 });
    }

    // Test full articles query (same as ArticleService.getArticles)
    const { data: allArticles, error: allError } = await supabase
      .from('articles')
      .select('*')
      .order('updated_at', { ascending: false });

    if (allError) {
      console.error('❌ Full articles query failed:', allError);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch all articles',
        details: {
          message: allError.message,
          code: allError.code,
          details: allError.details,
          hint: allError.hint
        }
      }, { status: 500 });
    }

    // Check for articles with potential data issues
    const problematicArticles = allArticles?.filter(article => {
      // Check for common data issues
      const hasInvalidKeywords = article.target_keywords && 
        typeof article.target_keywords === 'string' && 
        !article.target_keywords.startsWith('[') && 
        !article.target_keywords.startsWith('"');
      
      const hasNullContent = article.content === null;
      const hasEmptyTitle = !article.title || article.title.trim() === '';
      
      return hasInvalidKeywords || hasNullContent || hasEmptyTitle;
    }) || [];

    console.log('✅ Articles debug completed successfully');

    // Test article creation (to debug why V2 generation articles aren't being created)
    let articleCreationTest = null;
    try {
      console.log('🧪 Testing article creation...');
      const testArticleData = {
        title: 'Debug Test Article',
        content: 'This is a test article to debug creation issues.',
        metaDescription: 'Test meta description',
        slug: 'debug-test-article-' + Date.now(),
        status: 'draft' as const,
        targetKeywords: ['test', 'debug'],
        seoScore: 50,
        wordCount: 10,
        readingTime: 1
      };

      // Import ArticleService dynamically to test
      const { ArticleService } = await import('@/lib/supabase/articles');
      const createResult = await ArticleService.createArticle(testArticleData);
      
      if (createResult.error) {
        console.error('❌ Test article creation failed:', createResult.error);
        articleCreationTest = {
          success: false,
          error: createResult.error,
          testData: testArticleData
        };
      } else {
        console.log('✅ Test article created successfully:', createResult.data?.id);
        articleCreationTest = {
          success: true,
          articleId: createResult.data?.id,
          articleTitle: createResult.data?.title
        };
        
        // Clean up test article
        if (createResult.data?.id) {
          await ArticleService.deleteArticle(createResult.data.id);
          console.log('🧹 Test article cleaned up');
        }
      }
    } catch (error) {
      console.error('❌ Article creation test failed:', error);
      articleCreationTest = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        type: 'exception'
      };
    }

    return NextResponse.json({
      success: true,
      debug: {
        totalArticles: allArticles?.length || 0,
        recentArticles: recentArticles?.map(a => ({
          id: a.id,
          title: a.title,
          status: a.status,
          created_at: a.created_at,
          ai_model_used: a.ai_model_used
        })) || [],
        problematicArticles: problematicArticles.map(a => ({
          id: a.id,
          title: a.title,
          status: a.status,
          target_keywords: a.target_keywords,
          content_length: a.content?.length || 0,
          issues: {
            invalidKeywords: a.target_keywords && typeof a.target_keywords === 'string' && 
              !a.target_keywords.startsWith('[') && !a.target_keywords.startsWith('"'),
            nullContent: a.content === null,
            emptyTitle: !a.title || a.title.trim() === ''
          }
        })),
        queryTests: {
          healthCheck: 'passed',
          recentArticles: 'passed',
          fullQuery: 'passed'
        },
        articleCreationTest
      }
    });

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return NextResponse.json({
      success: false,
      error: 'Debug endpoint failed',
      details: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
} 