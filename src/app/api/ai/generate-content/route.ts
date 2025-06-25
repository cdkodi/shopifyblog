import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/ai';
import { AIGenerationRequest } from '@/lib/ai/types';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Content Generation API Request Started ===');
    
    const body = await request.json();
    const { prompt, template, tone, length, keywords, preferredProvider, options } = body;

    console.log('Request parameters:', {
      promptLength: prompt?.length || 0,
      template: template?.id || 'unknown',
      tone,
      length,
      keywordsCount: keywords?.length || 0,
      preferredProvider,
      options
    });

    // Validate required fields
    if (!prompt) {
      console.error('Validation failed: Prompt is required');
      return NextResponse.json(
        { success: false, error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('Getting AI service instance...');
    // Get AI service instance (this runs on server with access to env vars)
    const aiService = getAIService();
    console.log('AI service instance created successfully');

    // Prepare the generation request
    const generationRequest: AIGenerationRequest = {
      prompt,
      template,
      tone,
      length,
      keywords,
      options
    };

    console.log('Calling AI service generateContent...');
    // Generate content using the AI service
    const result = await aiService.generateContent(generationRequest, preferredProvider);
    
    console.log('AI service response:', {
      success: result.success,
      contentLength: result.content?.length || 0,
      attemptsCount: result.attempts?.length || 0,
      finalProvider: result.finalProvider,
      totalCost: result.totalCost,
      hasError: !!result.error
    });

    // Serialize the result to ensure all properties are JSON-safe
    const serializedAttempts = result.attempts?.map(attempt => ({
      ...attempt,
      error: attempt.error ? (typeof attempt.error === 'string' ? attempt.error : String(attempt.error)) : undefined
    }));

    const response = {
      success: result.success,
      content: result.content,
      attempts: serializedAttempts,
      totalCost: result.totalCost,
      totalTokens: result.totalTokens,
      finalProvider: result.finalProvider,
      error: result.error ? (typeof result.error === 'string' ? result.error : String(result.error)) : undefined
    };

    console.log('=== Content Generation API Request Completed Successfully ===');
    // Return the result
    return NextResponse.json(response);

  } catch (error) {
    console.error('=== Content Generation API Error ===');
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);
    console.error('Full error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Sending error response:', errorMessage);
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
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