import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const testType = searchParams.get('test') || 'basic';

    // Check environment variables
    const envVars = {
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
      AI_DEFAULT_PROVIDER: process.env.AI_DEFAULT_PROVIDER || 'not_set',
      AI_ENABLE_FALLBACKS: process.env.AI_ENABLE_FALLBACKS || 'not_set',
      AI_ENABLE_COST_TRACKING: process.env.AI_ENABLE_COST_TRACKING || 'not_set'
    };

    if (testType === 'env') {
      return NextResponse.json({
        success: true,
        message: 'Environment variables check',
        data: {
          envVars,
          hasAnyProvider: Object.values(envVars).slice(0, 3).some(Boolean),
          activeProviders: Object.entries(envVars).slice(0, 3).filter(([_, value]) => value).map(([key, _]) => key)
        }
      });
    }

    if (testType === 'basic') {
      return NextResponse.json({
        success: true,
        message: 'AI test service is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    }

    if (testType === 'ai') {
      try {
        // Dynamic import to handle potential missing dependencies
        const { aiService } = await import('@/lib/ai');
        
        const testPrompt = "Write a single sentence about the benefits of using AI in content creation.";
        
        const result = await aiService.generateContent({
          prompt: testPrompt,
          options: {
            maxTokens: 100,
            temperature: 0.7
          }
        });

        if (result.success) {
          return NextResponse.json({
            success: true,
            message: 'AI generation test successful',
            data: {
              result: {
                content: result.content ? result.content.substring(0, 200) + '...' : 'No content generated',
                provider: result.finalProvider || 'unknown',
                tokensUsed: result.totalTokens || 0,
                cost: result.totalCost || 0,
                responseTime: result.attempts[0]?.responseTime || 0
              }
            }
          });
        } else {
          return NextResponse.json({
            success: false,
            message: 'AI generation failed',
            error: result.error?.message || 'Unknown error',
            data: {
              attempts: result.attempts?.map(attempt => ({
                provider: attempt.provider,
                success: attempt.success,
                error: attempt.error
              })) || []
            }
          }, { status: 500 });
        }
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: 'AI service initialization failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      message: 'Invalid test type. Use ?test=basic, ?test=env, or ?test=ai'
    }, { status: 400 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Test service error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
} 