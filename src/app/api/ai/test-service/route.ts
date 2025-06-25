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
          environmentVariables: envVars,
          hasAnyApiKey: envVars.ANTHROPIC_API_KEY || envVars.OPENAI_API_KEY || envVars.GOOGLE_API_KEY
        }
      });
    }

    if (testType === 'config') {
      try {
        // Dynamic import to handle potential missing dependencies
        const { getAIService } = await import('@/lib/ai');
        
        const aiService = getAIService();
        const availableProviders = aiService.getAvailableProviders();
        
        return NextResponse.json({
          success: true,
          message: 'AI service configuration test',
          data: {
            availableProviders,
            environmentVariables: envVars
          }
        });
      } catch (configError: any) {
        return NextResponse.json({
          success: false,
          message: 'AI service configuration failed',
          error: configError.message,
          data: {
            environmentVariables: envVars
          }
        }, { status: 500 });
      }
    }

    if (testType === 'generation') {
      try {
        // Dynamic import to handle potential missing dependencies
        const { getAIService } = await import('@/lib/ai');
        
        const aiService = getAIService();
        const testPrompt = "Write a single sentence about the benefits of using AI in content creation.";
        
        const result = await aiService.generateContent({
          prompt: testPrompt,
          template: 'blog-intro'
        });

        return NextResponse.json({
          success: true,
          message: 'AI generation test completed',
          data: {
            result: {
              content: result.content ? result.content.substring(0, 200) + '...' : 'No content generated',
              provider: result.finalProvider,
              tokensUsed: result.totalTokens,
              cost: result.totalCost,
              responseTime: result.responseTimeMs
            },
            environmentVariables: envVars
          }
        });
      } catch (generationError: any) {
        return NextResponse.json({
          success: false,
          message: 'AI generation test failed',
          error: generationError.message,
          data: {
            environmentVariables: envVars
          }
        }, { status: 500 });
      }
    }

    // Default basic test
    return NextResponse.json({
      success: true,
      message: 'AI test service is running',
      data: {
        availableTests: ['basic', 'env', 'config', 'generation'],
        environmentVariables: envVars
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'AI test service error',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
} 