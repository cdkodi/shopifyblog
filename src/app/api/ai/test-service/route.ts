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
        data: envVars
      });
    }

    // Check if any AI provider is configured
    const hasAnyProvider = envVars.ANTHROPIC_API_KEY || envVars.OPENAI_API_KEY || envVars.GOOGLE_API_KEY;

    if (!hasAnyProvider) {
      return NextResponse.json({
        success: false,
        error: 'No AI provider API keys are configured',
        envCheck: envVars,
        message: 'Please configure at least one AI provider in your environment variables'
      }, { status: 400 });
    }

    // Try to initialize AI service
    try {
      const { getAIService } = await import('@/lib/ai');
      const aiService = getAIService();
      const providers = aiService.getAvailableProviders();

      if (testType === 'basic') {
        return NextResponse.json({
          success: true,
          message: 'AI service initialized successfully',
          data: {
            availableProviders: providers,
            envCheck: envVars
          }
        });
      }

      if (testType === 'health') {
        const health = await aiService.getProvidersHealth();
        return NextResponse.json({
          success: true,
          message: 'Provider health check completed',
          data: {
            health,
            availableProviders: providers,
            envCheck: envVars
          }
        });
      }

      if (testType === 'generate') {
        const result = await aiService.generateContent({
          prompt: 'Write a brief test message about AI content generation.',
          template: 'blog_post',
          tone: 'professional',
          length: 'Short (500-800)',
          keywords: ['AI', 'test']
        });

        return NextResponse.json({
          success: true,
          message: 'Content generation test completed',
          data: {
            result: {
              content: result.content.substring(0, 200) + '...',
              provider: result.provider,
              tokensUsed: result.tokensUsed,
              cost: result.cost,
              responseTime: result.responseTime
            },
            envCheck: envVars
          }
        });
      }

      return NextResponse.json({
        success: false,
        error: 'Invalid test type',
        availableTests: ['basic', 'env', 'health', 'generate']
      }, { status: 400 });

    } catch (aiError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize AI service',
        details: aiError instanceof Error ? aiError.message : String(aiError),
        envCheck: envVars
      }, { status: 500 });
    }

  } catch (error) {
    console.error('AI test service error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
} 