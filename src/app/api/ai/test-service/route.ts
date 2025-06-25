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
          hasAnyProvider: envVars.ANTHROPIC_API_KEY || envVars.OPENAI_API_KEY || envVars.GOOGLE_API_KEY,
          timestamp: new Date().toISOString()
        }
      });
    }

    if (testType === 'providers') {
      try {
        // Dynamic import to handle potential missing dependencies
        const { getAIService } = await import('@/lib/ai');
        const aiService = getAIService();

        // Test each provider availability
        const providerTests = [];
        
        if (envVars.ANTHROPIC_API_KEY) {
          try {
            const health = await aiService.checkProviderHealth('anthropic');
            providerTests.push({ provider: 'anthropic', healthy: health.isHealthy, details: health });
          } catch (error) {
            providerTests.push({ provider: 'anthropic', healthy: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
        
        if (envVars.OPENAI_API_KEY) {
          try {
            const health = await aiService.checkProviderHealth('openai');
            providerTests.push({ provider: 'openai', healthy: health.isHealthy, details: health });
          } catch (error) {
            providerTests.push({ provider: 'openai', healthy: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
        
        if (envVars.GOOGLE_API_KEY) {
          try {
            const health = await aiService.checkProviderHealth('google');
            providerTests.push({ provider: 'google', healthy: health.isHealthy, details: health });
          } catch (error) {
            providerTests.push({ provider: 'google', healthy: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }

        return NextResponse.json({
          success: true,
          message: 'Provider health check completed',
          data: {
            providers: providerTests,
            environmentVariables: envVars
          }
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: 'AI service initialization failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          data: { environmentVariables: envVars }
        });
      }
    }

    if (testType === 'generate') {
      try {
        // Dynamic import to handle potential missing dependencies
        const { getAIService } = await import('@/lib/ai');
        const aiService = getAIService();

        const testPrompt = "Write a single sentence about the benefits of using AI in content creation.";

        const result = await aiService.generateWithFallback({
          prompt: testPrompt,
          options: { maxTokens: 100, temperature: 0.7 }
        });

        return NextResponse.json({
          success: result.success,
          message: result.success ? 'Content generation test completed' : 'Content generation failed',
          data: {
            result: {
              content: result.content ? result.content.substring(0, 200) + '...' : 'No content generated',
              provider: result.finalProvider,
              tokensUsed: result.totalTokens,
              cost: result.totalCost,
              attempts: result.attempts.length
            },
            environmentVariables: envVars
          },
          error: result.error ? {
            code: result.error.code,
            message: result.error.message,
            provider: result.error.provider
          } : undefined
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: 'AI service test failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          data: { environmentVariables: envVars }
        });
      }
    }

    // Default basic test
    return NextResponse.json({
      success: true,
      message: 'AI Service test endpoint is working',
      data: {
        availableTests: ['basic', 'env', 'providers', 'generate'],
        environmentVariables: envVars,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Test endpoint error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
} 