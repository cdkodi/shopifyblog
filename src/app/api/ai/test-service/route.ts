import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/ai';

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

        // Test all providers health
        const providerTests = [];
        
        try {
          const providersHealth = await aiService.getProvidersHealth();
          
          // Check each provider that has an API key
          if (envVars.ANTHROPIC_API_KEY && providersHealth.anthropic) {
            providerTests.push({ 
              provider: 'anthropic', 
              healthy: providersHealth.anthropic.isHealthy, 
              details: providersHealth.anthropic 
            });
          }

          if (envVars.OPENAI_API_KEY && providersHealth.openai) {
            providerTests.push({ 
              provider: 'openai', 
              healthy: providersHealth.openai.isHealthy, 
              details: providersHealth.openai 
            });
          }

          if (envVars.GOOGLE_API_KEY && providersHealth.google) {
            providerTests.push({ 
              provider: 'google', 
              healthy: providersHealth.google.isHealthy, 
              details: providersHealth.google 
            });
          }
        } catch (error) {
          providerTests.push({ 
            provider: 'all', 
            healthy: false, 
            error: error instanceof Error ? error.message : 'Failed to check provider health' 
          });
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

        const result = await aiService.generateContent({
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

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    const aiService = getAIService();
    
    const result = await aiService.generateContent({
      prompt,
      template: 'test',
      options: { maxTokens: 100 }
    });

    return NextResponse.json({
      success: result.success,
      content: result.content || '',
      provider: result.finalProvider,
      attempts: result.attempts,
      error: result.error?.message
    });
  } catch (error) {
    console.error('AI test service error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        attempts: []
      },
      { status: 500 }
    );
  }
} 