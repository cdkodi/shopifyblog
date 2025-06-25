import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if all required environment variables are present
    const config = {
      anthropic: {
        configured: !!process.env.ANTHROPIC_API_KEY,
        keyPrefix: process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 8) + '...' : 'Not configured'
      },
      openai: {
        configured: !!process.env.OPENAI_API_KEY,
        keyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 8) + '...' : 'Not configured'
      },
      google: {
        configured: !!process.env.GOOGLE_API_KEY,
        keyPrefix: process.env.GOOGLE_API_KEY ? process.env.GOOGLE_API_KEY.substring(0, 8) + '...' : 'Not configured'
      },
      aiConfig: {
        defaultProvider: process.env.AI_PROVIDER_DEFAULT || 'Not configured',
        fallbackEnabled: process.env.AI_FALLBACK_ENABLED === 'true',
        costTrackingEnabled: process.env.AI_COST_TRACKING_ENABLED === 'true',
        rateLimitPerMinute: process.env.AI_RATE_LIMIT_PER_MINUTE || 'Not configured',
        maxRetries: process.env.AI_MAX_RETRIES || 'Not configured'
      }
    };

    const allConfigured = config.anthropic.configured && 
                         config.openai.configured && 
                         config.google.configured;

    return NextResponse.json({
      status: allConfigured ? 'success' : 'partial',
      message: allConfigured 
        ? 'All AI providers are properly configured!' 
        : 'Some AI providers are missing configuration.',
      providers: config,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error checking AI setup:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check AI provider configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({
    message: 'This endpoint only supports GET requests for testing AI configuration'
  }, { status: 405 });
} 