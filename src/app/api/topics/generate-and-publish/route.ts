import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/ai';
import { TopicService } from '@/lib/supabase/topics';
import { supabase } from '@/lib/supabase';
import type { Database, ArticleStatus } from '@/lib/types/database';
import { TopicFormData } from '@/lib/validations/topic';
import { AIGenerationRequest } from '@/lib/ai/types';
import rateLimit from '@/lib/utils/rate-limit';

// Rate limiting: 5 requests per minute per user
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500, // Support up to 500 unique users per window
});

type ArticleInsert = Database['public']['Tables']['articles']['Insert'];

// V2 Topic Generation and Publication Request Interface
interface GenerateAndPublishRequest extends TopicFormData {
  // Generation options
  generateImmediately?: boolean;
  aiProvider?: string;
  promptVersion?: string;
  
  // Editorial options
  skipEditorialReview?: boolean;
  autoPublishToShopify?: boolean;
  publishAsHidden?: boolean;
}

// V2 Response Interface
interface GenerateAndPublishResponse {
  success: boolean;
  topicId?: string;
  articleId?: string;
  status: 'topic_created' | 'generating' | 'ready_for_editorial' | 'generation_failed';
  message: string;
  error?: string;
  estimatedCompletionTime?: number; // in seconds
  generationMetadata?: {
    aiModel: string;
    promptVersion: string;
    startedAt: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('🚀 V2 Generate & Publish API called');
  
  try {
    // Rate limiting check
    try {
      await limiter.check(10, 'CACHE_TOKEN'); // 10 requests per minute
    } catch {
      console.log('❌ Rate limit exceeded');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please try again in a minute.',
          status: 'topic_created'
        } as GenerateAndPublishResponse,
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body: GenerateAndPublishRequest = await request.json();
    const { 
      title, 
      keywords, 
      tone, 
      length, 
      template,
      generateImmediately = true,
      aiProvider,
      promptVersion = 'v2.1',
      skipEditorialReview = false,
      autoPublishToShopify = false
    } = body;

    console.log('🚀 Generate & Publish request:', {
      title,
      keywordsCount: keywords?.split(',').length || 0,
      tone,
      length,
      template: template || 'article',
      generateImmediately,
      aiProvider,
      promptVersion
    });

    // Validate required fields
    if (!title?.trim()) {
      console.error('❌ Validation failed: Title is required');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Topic title is required',
          status: 'topic_created' 
        } as GenerateAndPublishResponse,
        { status: 400 }
      );
    }

    // Step 1: Create the topic
    console.log('📋 Creating topic...');
    const topicData: TopicFormData = {
      title: title.trim(),
      keywords: keywords?.trim() || '',
      tone: tone || 'professional',
      length: length || 'medium',
      template: template || 'article'
    };

    const { data: topic, error: topicError } = await TopicService.createTopic(topicData);

    if (topicError || !topic) {
      console.error('❌ Failed to create topic:', topicError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to create topic: ${topicError}`,
          status: 'topic_created'
        } as GenerateAndPublishResponse,
        { status: 500 }
      );
    }

    console.log('✅ Topic created successfully:', topic.id);

    // If not generating immediately, return topic creation success
    if (!generateImmediately) {
      return NextResponse.json({
        success: true,
        topicId: topic.id,
        status: 'topic_created',
        message: 'Topic created successfully. You can generate content later.'
      } as GenerateAndPublishResponse);
    }

    // Step 2: Create article record in 'generating' status
    console.log('📄 Creating article record...');
    const articleData: ArticleInsert = {
      title: `Article: ${title}`,
      content: 'Generating content...', // Placeholder
      source_topic_id: topic.id,
      status: 'generating' as ArticleStatus,
      generation_started_at: new Date().toISOString(),
      ai_model_used: aiProvider || 'auto',
      generation_prompt_version: promptVersion,
      target_keywords: keywords ? keywords.split(',').map(k => k.trim()) : null
    };

    const { data: article, error: articleError } = await supabase
      .from('articles')
      .insert(articleData)
      .select()
      .single();

    if (articleError || !article) {
      console.error('❌ Failed to create article:', articleError);
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to create article: ${articleError?.message}`,
          status: 'topic_created',
          topicId: topic.id
        } as GenerateAndPublishResponse,
        { status: 500 }
      );
    }

    console.log('✅ Article created in generating status:', article.id);

    // Step 3: Start AI generation (background process)
    console.log('🤖 Starting AI content generation...');
    
    try {
      // Build the generation prompt
      const generationPrompt = buildV2GenerationPrompt({
        topic: title,
        keywords: keywords?.split(',').map(k => k.trim()).filter(Boolean) || [],
        tone: tone || 'professional',
        length: length || 'medium',
        template: template || 'article'
      });

      const aiRequest: AIGenerationRequest = {
        prompt: generationPrompt,
        template: template || 'article',
        tone: tone || 'professional',
        length: length || 'medium',
        keywords: keywords?.split(',').map(k => k.trim()).filter(Boolean) || [],
        options: {
          maxTokens: getMaxTokensForLength(length || 'medium'),
          temperature: 0.7
        }
      };

      console.log('📞 Calling AI service...');
      const aiService = getAIService();
      const result = await aiService.generateContent(aiRequest, aiProvider as any);

      if (result.success && result.content) {
        console.log('✅ AI generation successful');
        
        // Parse the AI response
        const parsedContent = parseAIResponse(result.content);
        
        // Update article with generated content
        const { error: updateError } = await supabase
          .from('articles')
          .update({
            title: parsedContent.title || `Article: ${title}`,
            content: parsedContent.content,
            meta_description: parsedContent.metaDescription,
            status: skipEditorialReview ? 
              (autoPublishToShopify ? 'published_hidden' as ArticleStatus : 'published' as ArticleStatus) : 
              'ready_for_editorial' as ArticleStatus,
            generation_completed_at: new Date().toISOString(),
            word_count: parsedContent.content.split(' ').length,
            reading_time: Math.ceil(parsedContent.content.split(' ').length / 200) // ~200 WPM
          })
          .eq('id', article.id);

        if (updateError) {
          console.error('❌ Failed to update article with generated content:', updateError);
          // Mark as failed
          await supabase
            .from('articles')
            .update({ 
              status: 'generation_failed' as ArticleStatus,
              generation_completed_at: new Date().toISOString()
            })
            .eq('id', article.id);
          
          return NextResponse.json({
            success: false,
            topicId: topic.id,
            articleId: article.id,
            status: 'generation_failed',
            error: 'Failed to save generated content',
            generationMetadata: {
              aiModel: result.finalProvider || aiProvider || 'unknown',
              promptVersion,
              startedAt: articleData.generation_started_at!
            }
          } as GenerateAndPublishResponse,
          { status: 500 });
        }

        // Update topic as used
        await TopicService.updateTopic(topic.id, { 
          ...topicData, 
          // Mark topic as used
        });

        console.log('✅ Article content updated successfully');
        
        const finalStatus = skipEditorialReview ? 
          (autoPublishToShopify ? 'published_hidden' : 'published') : 
          'ready_for_editorial';

        return NextResponse.json({
          success: true,
          topicId: topic.id,
          articleId: article.id,
          status: finalStatus,
          message: finalStatus === 'ready_for_editorial' ? 
            'Article generated successfully and ready for editorial review' :
            'Article generated and published successfully',
          generationMetadata: {
            aiModel: result.finalProvider || aiProvider || 'unknown',
            promptVersion,
            startedAt: articleData.generation_started_at!
          }
        } as GenerateAndPublishResponse);

      } else {
        console.error('❌ AI generation failed:', result.error);
        
        // Mark article as generation failed
        await supabase
          .from('articles')
          .update({ 
            status: 'generation_failed' as ArticleStatus,
            generation_completed_at: new Date().toISOString()
          })
          .eq('id', article.id);

        return NextResponse.json({
          success: false,
          topicId: topic.id,
          articleId: article.id,
          status: 'generation_failed',
          error: `AI generation failed: ${result.error?.message || 'Unknown error'}`,
          generationMetadata: {
            aiModel: result.finalProvider || aiProvider || 'unknown',
            promptVersion,
            startedAt: articleData.generation_started_at!
          }
        } as GenerateAndPublishResponse,
        { status: 500 });
      }

    } catch (aiError) {
      console.error('❌ Unexpected error during AI generation:', aiError);
      
      // Mark article as generation failed
      await supabase
        .from('articles')
        .update({ 
          status: 'generation_failed' as ArticleStatus,
          generation_completed_at: new Date().toISOString()
        })
        .eq('id', article.id);

      return NextResponse.json({
        success: false,
        topicId: topic.id,
        articleId: article.id,
        status: 'generation_failed',
        error: `Unexpected error during generation: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`,
        generationMetadata: {
          aiModel: aiProvider || 'unknown',
          promptVersion,
          startedAt: articleData.generation_started_at!
        }
      } as GenerateAndPublishResponse,
      { status: 500 });
    }

  } catch (error) {
    console.error('❌ Unexpected error in generate-and-publish API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'topic_created'
      } as GenerateAndPublishResponse,
      { status: 500 }
    );
  }
}

// Helper function to build V2 generation prompt
function buildV2GenerationPrompt(params: {
  topic: string;
  keywords: string[];
  tone: string;
  length: string;
  template: string;
}): string {
  const { topic, keywords, tone, length, template } = params;
  
  const targetWords = getTargetWordCount(length);
  
  return `Create a comprehensive ${targetWords}-word ${template} about "${topic}" in a ${tone} tone.

${keywords.length > 0 ? `Target Keywords: ${keywords.join(', ')}` : ''}

Please provide your response in this exact format:

TITLE: [Create a specific, engaging title that avoids generic patterns like "Complete Guide to..." or "Ultimate Guide to...". Use patterns like "The Art of...", "Why [Topic]...", "[Number] Ways to...", or focus on specific benefits/outcomes]

META_DESCRIPTION: [Write a compelling 150-160 character meta description that focuses on value and benefits. Avoid starting with "Learn about..." or "Discover everything about...". Instead use action-oriented language and specific benefits]

CONTENT:
[Write the main article content here - exactly ${targetWords} words]

Requirements:
- Write exactly ${targetWords} words for the content section
- ${keywords.length > 0 ? `Include these keywords naturally: ${keywords.join(', ')}` : 'Focus on relevant keywords naturally'}
- Use ${tone} tone throughout
- Create compelling headings and subheadings
- Include practical, actionable information
- Make it valuable and engaging for readers
- Structure with clear introduction, body sections, and conclusion
- Ensure the content is original and informative
- Focus on providing genuine value rather than filler content`;
}

// Helper function to get target word count based on length
function getTargetWordCount(length: string): number {
  switch (length.toLowerCase()) {
    case 'short': return 500;
    case 'medium': return 1000;
    case 'long': return 1500;
    case 'comprehensive': return 2000;
    default: return 1000;
  }
}

// Helper function to get max tokens for AI generation
function getMaxTokensForLength(length: string): number {
  const wordCount = getTargetWordCount(length);
  return Math.ceil(wordCount * 1.5); // Roughly 1.5 tokens per word + overhead
}

// Helper function to parse AI response
function parseAIResponse(content: string): {
  title: string;
  metaDescription: string;
  content: string;
} {
  const titleMatch = content.match(/TITLE:\s*(.+?)(?:\n|$)/i);
  const metaMatch = content.match(/META_DESCRIPTION:\s*(.+?)(?:\n|$)/i);
  const contentMatch = content.match(/CONTENT:\s*([\s\S]+?)(?:\n\n---|\n\n\[|\n\nNote:|$)/i);

  return {
    title: titleMatch?.[1]?.trim() || 'Generated Article',
    metaDescription: metaMatch?.[1]?.trim() || '',
    content: contentMatch?.[1]?.trim() || content
  };
}

// Health check endpoint
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    service: 'V2 Generate & Publish API',
    status: 'healthy',
    version: '2.0.0',
    endpoints: {
      'POST /api/topics/generate-and-publish': 'Create topic and generate article content'
    },
    timestamp: new Date().toISOString()
  });
} 