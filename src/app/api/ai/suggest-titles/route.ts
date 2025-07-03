import { NextRequest, NextResponse } from 'next/server';
import { getAIService } from '@/lib/ai';

export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
    const { topic, tone, targetAudience, templateType, keywords } = body;

    // Validate required fields
    if (!topic) {
      return NextResponse.json(
        { success: false, error: 'Topic is required' },
        { status: 400 }
      );
    }

    console.log('🎯 Generating title suggestions for:', {
      topic,
      tone: tone || 'professional',
      targetAudience: targetAudience || 'general readers',
      templateType: templateType || 'blog post'
    });

    const aiService = getAIService();
    
    // Build title generation prompt
    const prompt = `Generate 6 compelling, SEO-optimized article titles for the following topic:

TOPIC: "${topic}"
WRITING TONE: ${tone || 'Professional'}
TARGET AUDIENCE: ${targetAudience || 'General readers'}
CONTENT TYPE: ${templateType || 'Blog post'}
${keywords ? `KEYWORDS TO INCLUDE: ${keywords}` : ''}

REQUIREMENTS:
1. Each title should be 8-15 words long
2. Include power words that grab attention
3. Be specific and actionable
4. Incorporate SEO keywords naturally
5. Match the requested tone (${tone || 'professional'})
6. Appeal to ${targetAudience || 'general readers'}

TITLE STYLES TO INCLUDE:
- How-to/Guide style: "How to...", "Complete Guide to..."
- Listicle style: "5 Ways to...", "Top 10..."
- Question style: "Why Do...", "What Is..."
- Benefit-focused: "The Secret to...", "Unlock..."
- Year-specific: "... in 2024", "... for 2024"
- Problem-solving: "Fix...", "Solve..."

FORMAT: Return exactly 6 titles, one per line, numbered 1-6.

Example output:
1. How to Master Digital Marketing: A Complete Guide for Small Businesses
2. 10 Proven SEO Strategies That Actually Work in 2024
3. Why Your Content Marketing Strategy Isn't Working (And How to Fix It)
4. The Ultimate Social Media Guide for E-commerce Success
5. Unlock Higher Conversion Rates: 7 Landing Page Secrets
6. Digital Marketing Trends 2024: What Every Marketer Needs to Know

Now generate titles for: "${topic}"`;

    const result = await aiService.generateContent({
      prompt,
      template: 'title-generation',
      tone: 'professional',
      length: 'short',
      keywords: keywords ? keywords.split(',').map((k: string) => k.trim()) : [],
      options: {
        maxTokens: 400,
        temperature: 0.8 // Higher creativity for title generation
      }
    });

    if (!result.success) {
      console.error('❌ AI title generation failed:', result.error);
      return NextResponse.json(
        { 
          success: false, 
          error: result.error?.message || 'Failed to generate titles',
          fallback: generateFallbackTitles(topic, tone, templateType)
        },
        { status: 500 }
      );
    }

    // Parse the AI response to extract titles
    const content = result.content || '';
    const titles = extractTitlesFromResponse(content);

    if (titles.length === 0) {
      console.warn('⚠️ No titles extracted from AI response, using fallback');
      return NextResponse.json({
        success: true,
        titles: generateFallbackTitles(topic, tone, templateType),
        provider: result.finalProvider,
        fallback: true
      });
    }

    console.log('✅ Generated titles:', titles);

    return NextResponse.json({
      success: true,
      titles,
      provider: result.finalProvider,
      cost: result.totalCost,
      fallback: false
    });

  } catch (error) {
    console.error('❌ Title suggestion API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { 
        success: false,
        error: `Title suggestion failed: ${errorMessage}`,
        fallback: generateFallbackTitles(
          'Your Topic',
          'professional',
          'blog post'
        )
      },
      { status: 500 }
    );
  }
}

/**
 * Extract numbered titles from AI response
 */
function extractTitlesFromResponse(content: string): string[] {
  const lines = content.split('\n');
  const titles: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Match numbered lines like "1. Title" or "1) Title" or "- Title"
    const match = trimmed.match(/^(?:\d+[\.\)]\s*|[-•]\s*)(.+)$/);
    if (match && match[1]) {
      const title = match[1].trim();
      if (title.length > 10 && title.length < 100) { // Reasonable title length
        titles.push(title);
      }
    }
  }
  
  return titles.slice(0, 6); // Limit to 6 titles
}

/**
 * Generate fallback titles when AI fails
 */
function generateFallbackTitles(topic: string, tone: string = 'professional', templateType: string = 'blog post'): string[] {
  const baseTitles = [
    `Complete Guide to ${topic}`,
    `How to Master ${topic}: Step-by-Step Guide`,
    `${topic}: Everything You Need to Know`,
    `The Ultimate ${topic} Handbook`,
    `${topic} Tips and Best Practices`,
    `Understanding ${topic}: A Beginner's Guide`
  ];

  // Customize based on tone
  if (tone === 'storytelling' || tone === 'Story Telling') {
    return [
      `The Story Behind ${topic}`,
      `Journey Through ${topic}: A Cultural Exploration`,
      `Tales and Traditions: Understanding ${topic}`,
      `${topic}: Stories That Inspire`,
      `The Art of ${topic}: A Narrative Guide`,
      `From Past to Present: The ${topic} Story`
    ];
  }

  if (tone === 'casual' || tone === 'Conversational') {
    return [
      `Let's Talk About ${topic}`,
      `${topic} Made Simple`,
      `Your Friend's Guide to ${topic}`,
      `${topic}: No Fluff, Just Facts`,
      `Real Talk: ${topic} Explained`,
      `${topic} for Everyone`
    ];
  }

  return baseTitles;
}

// Optional: Add GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Title suggestion API is available',
    endpoints: {
      POST: 'Generate title suggestions',
      requiredFields: ['topic'],
      optionalFields: ['tone', 'targetAudience', 'templateType', 'keywords']
    },
    timestamp: new Date().toISOString()
  });
} 