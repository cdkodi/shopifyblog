import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/ai';
import { AIGenerationRequest } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, template, tone, length, keywords, preferredProvider, options } = body;

    // Validate required fields
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get AI service instance (this runs on server with access to env vars)
    const aiService = getAIService();

    // Prepare the generation request
    const generationRequest: AIGenerationRequest = {
      prompt,
      template,
      tone,
      length,
      keywords,
      options
    };

    // Generate content using the AI service
    const result = await aiService.generateContent(generationRequest, preferredProvider);

    // Return the result
    return NextResponse.json({
      success: result.success,
      content: result.content,
      attempts: result.attempts,
      totalCost: result.totalCost,
      totalTokens: result.totalTokens,
      finalProvider: result.finalProvider,
      error: result.error
    });

  } catch (error) {
    console.error('Content generation API error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

// Optional: Add GET endpoint for testing
export async function GET() {
  try {
    // Check if AI service can be initialized (env vars available)
    const aiService = getAIService();
    const availableProviders = aiService.getAvailableProviders();
    
    return NextResponse.json({
      success: true,
      message: 'Content generation API is available',
      availableProviders,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Service unavailable',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 