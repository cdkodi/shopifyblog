import { NextRequest, NextResponse } from 'next/server';
import {
  getAIService,
  getAvailableProviders,
  getRecommendedProvider,
  validateProviders,
  getProvidersHealth,
  getCostEstimates,
  generateContent
} from '@/lib/ai';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testType = searchParams.get('test') || 'basic';

    switch (testType) {
      case 'basic':
        return await testBasicFunctionality();
      case 'providers':
        return await testProviders();
      case 'cost':
        return await testCostEstimation();
      case 'generation':
        return await testContentGeneration();
      default:
        return NextResponse.json({ error: 'Invalid test type' }, { status: 400 });
    }
  } catch (error) {
    console.error('AI service test error:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'AI service test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function testBasicFunctionality() {
  const results = {
    serviceInitialization: 'pending',
    availableProviders: [] as string[],
    environmentVariables: {} as Record<string, boolean>,
    errors: [] as string[]
  };

  try {
    // Test service initialization
    const aiService = getAIService();
    results.serviceInitialization = 'success';

    // Test available providers
    results.availableProviders = getAvailableProviders();

    // Check environment variables
    results.environmentVariables = {
      anthropicKey: !!process.env.ANTHROPIC_API_KEY,
      openaiKey: !!process.env.OPENAI_API_KEY,
      googleKey: !!process.env.GOOGLE_API_KEY,
      defaultProvider: !!process.env.AI_PROVIDER_DEFAULT,
      fallbackEnabled: process.env.AI_FALLBACK_ENABLED === 'true',
      costTrackingEnabled: process.env.AI_COST_TRACKING_ENABLED === 'true'
    };

    return NextResponse.json({
      status: 'success',
      message: 'AI service basic functionality test passed',
      results
    });
  } catch (error) {
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({
      status: 'error',
      message: 'AI service basic functionality test failed',
      results
    }, { status: 500 });
  }
}

async function testProviders() {
  const results = {
    validation: {} as Record<string, boolean>,
    health: {} as Record<string, any>,
    recommendations: {} as Record<string, string>,
    errors: [] as string[]
  };

  try {
    // Test provider validation
    results.validation = await validateProviders();

    // Test provider health (with timeout to avoid hanging)
    try {
      const healthPromise = getProvidersHealth();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 10000)
      );
      
      results.health = await Promise.race([healthPromise, timeoutPromise]) as Record<string, any>;
    } catch (error) {
      results.errors.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.health = { error: 'Health check timed out or failed' };
    }

    // Test provider recommendations
    const templates = [
      'Product Showcase',
      'How-to Guide',
      'Artist Showcase',
      'Industry Trends',
      'Buying Guide'
    ];

    for (const template of templates) {
      results.recommendations[template] = getRecommendedProvider(template);
    }

    return NextResponse.json({
      status: 'success',
      message: 'AI provider test completed',
      results
    });
  } catch (error) {
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({
      status: 'error',
      message: 'AI provider test failed',
      results
    }, { status: 500 });
  }
}

async function testCostEstimation() {
  const results = {
    estimates: [] as any[],
    templates: {} as Record<string, any[]>,
    errors: [] as string[]
  };

  try {
    const testPrompt = "Write a comprehensive guide about sustainable living practices for modern households.";

    // Test basic cost estimation
    results.estimates = await getCostEstimates(testPrompt);

    // Test template-specific estimates
    const templates = ['Product Showcase', 'How-to Guide', 'Industry Trends'];
    for (const template of templates) {
      try {
        results.templates[template] = await getCostEstimates(testPrompt, template);
      } catch (error) {
        results.errors.push(`Template ${template} cost estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Cost estimation test completed',
      results
    });
  } catch (error) {
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({
      status: 'error',
      message: 'Cost estimation test failed',
      results
    }, { status: 500 });
  }
}

async function testContentGeneration() {
  const results = {
    generation: null as any,
    attempts: [] as any[],
    errors: [] as string[]
  };

  try {
    const testPrompt = "Write a brief 100-word introduction about renewable energy benefits.";

    // Test content generation with a simple prompt
    const generationResult = await generateContent(testPrompt, {
      template: 'How-to Guide',
      tone: 'Professional',
      length: 'Short (500-800)',
      keywords: ['renewable energy', 'sustainability']
    });

    results.generation = {
      success: generationResult.success,
      contentLength: generationResult.content?.length || 0,
      totalCost: generationResult.totalCost,
      totalTokens: generationResult.totalTokens,
      finalProvider: generationResult.finalProvider,
      attemptCount: generationResult.attempts.length
    };

    results.attempts = generationResult.attempts.map(attempt => ({
      provider: attempt.provider,
      success: attempt.success,
      error: attempt.error,
      responseTime: attempt.responseTime,
      tokensUsed: attempt.tokensUsed,
      cost: attempt.cost
    }));

    // Don't include the actual content in the response for security
    if (!generationResult.success) {
      results.errors.push('Content generation failed for all providers');
    }

    return NextResponse.json({
      status: generationResult.success ? 'success' : 'partial',
      message: generationResult.success 
        ? 'Content generation test completed successfully' 
        : 'Content generation test completed with errors',
      results
    });
  } catch (error) {
    results.errors.push(error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({
      status: 'error',
      message: 'Content generation test failed',
      results
    }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({
    message: 'This endpoint only supports GET requests for testing AI service functionality'
  }, { status: 405 });
} 